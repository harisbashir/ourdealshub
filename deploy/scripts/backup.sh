#!/usr/bin/env bash
# Compressed mariadb-dump of the production DB; keeps the newest $BACKUP_KEEP files.
# Restore: gunzip -c FILE | docker compose -f docker-compose.prod.yml exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u ourdealshub ourdealshub'
set -euo pipefail
umask 077   # dumps contain admin emails + password hashes
cd "$(dirname "$0")/../.."

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ourdealshub}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

file="$BACKUP_DIR/ourdealshub-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose -f docker-compose.prod.yml exec -T db \
  sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb-dump -u ourdealshub --single-transaction --quick --skip-lock-tables --hex-blob ourdealshub' | gzip > "$file.tmp"
mv "$file.tmp" "$file"
echo "Backup written: $file"

ls -1t "$BACKUP_DIR"/ourdealshub-*.sql.gz | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm --
