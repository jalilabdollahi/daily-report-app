#!/usr/bin/env bash
set -euo pipefail

# This script bootstraps a typical Hetzner Ubuntu/Debian server for running
# daily-report-app with Docker Compose behind Nginx.
#
# Usage:
#   sudo bash scripts/setup-hetzner-server.sh
#
# Optional env vars:
#   SERVER_USER=myuser
#   SSH_PORT=22

SERVER_USER="${SERVER_USER:-${SUDO_USER:-}}"
SSH_PORT="${SSH_PORT:-22}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root or with sudo."
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script currently supports Debian/Ubuntu-based servers only."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

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

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker repository..."
  install -m 0755 -d /etc/apt/keyrings
  OS_ID="$(. /etc/os-release && echo "${ID}")"
  case "${OS_ID}" in
    ubuntu|debian) ;;
    *)
      echo "Unsupported distro for Docker repo setup: ${OS_ID}"
      exit 1
      ;;
  esac

  curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  ARCH="$(dpkg --print-architecture)"
  RELEASE_CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"

  cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} ${RELEASE_CODENAME} stable
EOF

  apt-get update

  echo "Installing Docker engine and Compose plugin..."
  apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
else
  echo "Docker is already installed. Skipping Docker installation."
fi

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

echo "Creating application directories..."
install -d -m 755 /var/www/daily-report-app
install -d -m 755 /var/www/daily-report-app/shared

echo
echo "Server bootstrap complete."
echo
echo "Installed:"
echo "- Docker Engine"
echo "- Docker Compose plugin"
echo "- Nginx"
echo "- UFW"
echo "- fail2ban"
echo "- PostgreSQL client tools"
echo "- Git and curl"
echo
echo "Next steps:"
echo "1. Reconnect your SSH session so docker group membership refreshes."
echo "2. Clone the repo into /var/www/daily-report-app"
echo "3. Copy .env.production to .env and fill in real values, including APP_IMAGE"
echo "4. Run: docker compose pull && docker compose up -d"
