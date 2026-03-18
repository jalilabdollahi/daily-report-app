#!/bin/sh
set -eu

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-./backups}"
FILE_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required."
  exit 1
fi

echo "Creating backup at ${FILE_PATH}"
pg_dump "$DATABASE_URL" | gzip > "$FILE_PATH"
echo "Backup completed: ${FILE_PATH}"
