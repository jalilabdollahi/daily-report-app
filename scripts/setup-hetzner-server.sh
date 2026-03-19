#!/usr/bin/env bash
set -euo pipefail

# One-shot Hetzner bootstrap and deploy script for daily-report-app.
#
# Run from the repository on the server:
#   sudo bash scripts/setup-hetzner-server.sh
#
# Optional environment variables:
#   SERVER_USER=myuser
#   SSH_PORT=22
#   SERVER_IP=178.104.79.94
#   APP_IMAGE=ghcr.io/jalilabdollahi/daily-report-app:latest
#   GHCR_USERNAME=jalilabdollahi
#   GHCR_TOKEN=github_pat_xxx
#   SMTP_HOST=smtp.example.com
#   SMTP_PORT=587
#   SMTP_USER=user
#   SMTP_PASS=pass
#   SMTP_FROM=noreply@example.com
#   PRODUCTION_ADMIN_EMAIL=admin@example.com
#   PRODUCTION_ADMIN_PASSWORD=strong-password

SERVER_USER="${SERVER_USER:-${SUDO_USER:-}}"
SSH_PORT="${SSH_PORT:-22}"
APP_IMAGE_DEFAULT="ghcr.io/jalilabdollahi/daily-report-app:latest"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root or with sudo."
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script currently supports Debian/Ubuntu-based servers only."
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"
ENV_TEMPLATE="${REPO_ROOT}/.env.production"
NGINX_SOURCE="${REPO_ROOT}/deploy/nginx/daily-report-app.conf"
NGINX_TARGET="/etc/nginx/sites-available/daily-report-app"

if [[ ! -f "${REPO_ROOT}/docker-compose.yml" ]]; then
  echo "Could not find docker-compose.yml in ${REPO_ROOT}."
  exit 1
fi

if [[ ! -f "${NGINX_SOURCE}" ]]; then
  echo "Could not find Nginx config at ${NGINX_SOURCE}."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

detect_server_ip() {
  if [[ -n "${SERVER_IP:-}" ]]; then
    printf '%s\n' "${SERVER_IP}"
    return
  fi

  local detected
  detected="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '/src/ {for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')"

  if [[ -z "${detected}" ]]; then
    detected="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi

  printf '%s\n' "${detected}"
}

random_hex() {
  openssl rand -hex "$1"
}

random_base64() {
  openssl rand -base64 "$1" | tr -d '\n'
}

replace_or_append_env() {
  local key="$1"
  local value="$2"
  local file="$3"

  if grep -qE "^${key}=" "${file}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${file}"
  else
    printf '%s=%s\n' "${key}" "${value}" >>"${file}"
  fi
}

current_env_value() {
  local key="$1"
  local file="$2"
  awk -F= -v key="${key}" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "${file}"
}

normalize_env_file() {
  local server_ip="$1"
  local app_image="${APP_IMAGE:-${APP_IMAGE_DEFAULT}}"
  local auth_secret
  local cron_secret
  local admin_password

  if [[ ! -f "${ENV_FILE}" ]]; then
    if [[ -f "${ENV_TEMPLATE}" ]]; then
      cp "${ENV_TEMPLATE}" "${ENV_FILE}"
    else
      touch "${ENV_FILE}"
    fi
  fi

  auth_secret="$(current_env_value "AUTH_SECRET" "${ENV_FILE}")"
  if [[ -z "${auth_secret}" || "${auth_secret}" == "generate-a-strong-secret" || "${auth_secret}" == "replace-with-a-long-random-secret" ]]; then
    auth_secret="$(random_hex 32)"
  fi

  cron_secret="$(current_env_value "CRON_SECRET" "${ENV_FILE}")"
  if [[ -z "${cron_secret}" || "${cron_secret}" == "replace-with-a-cron-secret" || "${cron_secret}" == "replace-with-a-long-random-cron-secret" ]]; then
    cron_secret="$(random_hex 24)"
  fi

  admin_password="${PRODUCTION_ADMIN_PASSWORD:-$(current_env_value "PRODUCTION_ADMIN_PASSWORD" "${ENV_FILE}")}"
  if [[ -z "${admin_password}" || "${admin_password}" == "ChangeMe1234" || "${admin_password}" == "replace-with-a-strong-password" ]]; then
    admin_password="$(random_base64 18)"
  fi

  replace_or_append_env "APP_IMAGE" "${app_image}" "${ENV_FILE}"
  replace_or_append_env "DATABASE_URL" "postgresql://postgres:postgres@db:5432/daily_reports" "${ENV_FILE}"
  replace_or_append_env "AUTH_SECRET" "${auth_secret}" "${ENV_FILE}"
  replace_or_append_env "NEXTAUTH_SECRET" "${auth_secret}" "${ENV_FILE}"
  replace_or_append_env "AUTH_URL" "http://${server_ip}" "${ENV_FILE}"
  replace_or_append_env "NEXTAUTH_URL" "http://${server_ip}" "${ENV_FILE}"
  replace_or_append_env "AUTH_SESSION_MAX_AGE" "604800" "${ENV_FILE}"
  replace_or_append_env "PASSWORD_RESET_TOKEN_TTL_MINUTES" "60" "${ENV_FILE}"
  replace_or_append_env "UPLOAD_PROVIDER" "local" "${ENV_FILE}"
  replace_or_append_env "UPLOAD_DIR" "./public/uploads" "${ENV_FILE}"
  replace_or_append_env "SMTP_HOST" "${SMTP_HOST:-}" "${ENV_FILE}"
  replace_or_append_env "SMTP_PORT" "${SMTP_PORT:-587}" "${ENV_FILE}"
  replace_or_append_env "SMTP_USER" "${SMTP_USER:-}" "${ENV_FILE}"
  replace_or_append_env "SMTP_PASS" "${SMTP_PASS:-}" "${ENV_FILE}"
  replace_or_append_env "SMTP_FROM" "${SMTP_FROM:-noreply@example.com}" "${ENV_FILE}"
  replace_or_append_env "CRON_SECRET" "${cron_secret}" "${ENV_FILE}"
  replace_or_append_env "PRODUCTION_ADMIN_EMAIL" "${PRODUCTION_ADMIN_EMAIL:-admin@example.com}" "${ENV_FILE}"
  replace_or_append_env "PRODUCTION_ADMIN_PASSWORD" "${admin_password}" "${ENV_FILE}"
}

install_base_packages() {
  echo "Updating apt package index..."
  apt-get update

  echo "Installing base packages..."
  apt-get install -y \
    ca-certificates \
    curl \
    fail2ban \
    git \
    gnupg \
    lsb-release \
    nginx \
    postgresql-client \
    software-properties-common \
    ufw
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker is already installed. Skipping Docker installation."
    return
  fi

  echo "Installing Docker repository..."
  install -m 0755 -d /etc/apt/keyrings

  local os_id
  os_id="$(. /etc/os-release && echo "${ID}")"
  case "${os_id}" in
    ubuntu|debian) ;;
    *)
      echo "Unsupported distro for Docker repo setup: ${os_id}"
      exit 1
      ;;
  esac

  curl -fsSL "https://download.docker.com/linux/${os_id}/gpg" \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  local arch
  local release_codename
  arch="$(dpkg --print-architecture)"
  release_codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"

  cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${os_id} ${release_codename} stable
EOF

  apt-get update

  echo "Installing Docker engine and Compose plugin..."
  apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
}

configure_services_and_firewall() {
  echo "Enabling services..."
  systemctl enable --now docker
  systemctl enable --now nginx
  systemctl enable --now fail2ban

  if [[ -n "${SERVER_USER}" ]] && id "${SERVER_USER}" >/dev/null 2>&1; then
    echo "Adding ${SERVER_USER} to the docker group..."
    usermod -aG docker "${SERVER_USER}"
  else
    echo "Skipping docker group update because SERVER_USER was not detected."
  fi

  echo "Configuring firewall..."
  ufw --force allow "${SSH_PORT}"/tcp
  ufw --force allow 80/tcp
  ufw --force allow 443/tcp
  ufw --force enable
}

configure_nginx() {
  echo "Installing Nginx reverse-proxy config..."
  cp "${NGINX_SOURCE}" "${NGINX_TARGET}"
  ln -sf "${NGINX_TARGET}" /etc/nginx/sites-enabled/daily-report-app
  rm -f /etc/nginx/sites-enabled/default
  rm -f /etc/nginx/conf.d/default.conf
  nginx -t
  systemctl reload nginx
}

login_ghcr_if_configured() {
  if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
    echo "Logging in to GHCR as ${GHCR_USERNAME}..."
    printf '%s' "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin
  else
    echo "Skipping GHCR login because GHCR_USERNAME/GHCR_TOKEN were not provided."
  fi
}

deploy_app() {
  cd "${REPO_ROOT}"

  echo "Pulling application images..."
  if ! docker compose pull 2>&1; then
    echo
    echo "WARNING: docker compose pull failed."
    echo "The image may not exist on GHCR or requires authentication."
    echo

    if [[ -f "${REPO_ROOT}/Dockerfile" ]]; then
      echo "Building the image locally from Dockerfile..."
      docker compose build
    else
      echo "ERROR: No Dockerfile found and pull failed. Cannot continue."
      echo "Either push an image to GHCR first, or provide GHCR_TOKEN."
      exit 1
    fi
  fi

  echo "Starting application stack..."
  docker compose up -d

  echo "Waiting for the app container to become healthy..."
  local retries=0
  local max_retries=30
  while [[ ${retries} -lt ${max_retries} ]]; do
    if curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
      echo "Application is healthy!"
      return
    fi
    retries=$((retries + 1))
    sleep 5
  done

  echo
  echo "WARNING: App did not pass health check after $((max_retries * 5))s."
  echo "Check container logs:"
  echo "  docker compose logs app"
  echo "  docker compose logs db"
}

show_summary() {
  local server_ip="$1"
  local app_image
  app_image="$(current_env_value "APP_IMAGE" "${ENV_FILE}")"

  echo
  echo "Server bootstrap and deploy complete."
  echo
  echo "Deployment summary:"
  echo "- Repo root: ${REPO_ROOT}"
  echo "- Env file: ${ENV_FILE}"
  echo "- App image: ${app_image}"
  echo "- Public URL: http://${server_ip}"
  echo
  echo "Useful checks:"
  echo "  docker ps"
  echo "  curl -i http://127.0.0.1:3000/api/health"
  echo "  curl -i http://${server_ip}"
  echo
  echo "Generated credentials:"
  echo "  PRODUCTION_ADMIN_EMAIL=$(current_env_value "PRODUCTION_ADMIN_EMAIL" "${ENV_FILE}")"
  echo "  PRODUCTION_ADMIN_PASSWORD=$(current_env_value "PRODUCTION_ADMIN_PASSWORD" "${ENV_FILE}")"
  echo
  echo "If GHCR pull failed, rerun with:"
  echo "  GHCR_USERNAME=jalilabdollahi GHCR_TOKEN=<token> sudo bash scripts/setup-hetzner-server.sh"
}

main() {
  local server_ip
  server_ip="$(detect_server_ip)"

  if [[ -z "${server_ip}" ]]; then
    echo "Could not detect the server IP. Re-run with SERVER_IP=<your-public-ip>."
    exit 1
  fi

  install_base_packages
  install_docker
  configure_services_and_firewall
  normalize_env_file "${server_ip}"
  login_ghcr_if_configured
  configure_nginx
  deploy_app
  show_summary "${server_ip}"
}

main "$@"
