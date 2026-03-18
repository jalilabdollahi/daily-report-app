#!/bin/sh
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/restore.sh <backup-file.sql.gz>"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required."
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ "${FORCE_RESTORE:-false}" != "true" ]; then
  printf "Restore %s into %s? Type 'restore' to continue: " "$BACKUP_FILE" "$DATABASE_URL"
  read -r CONFIRMATION

  if [ "$CONFIRMATION" != "restore" ]; then
    echo "Restore cancelled."
    exit 1
  fi
fi

echo "Restoring ${BACKUP_FILE}"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "Restore completed."
