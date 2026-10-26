#!/usr/bin/env bash
# Restore a backup made by backup.sh. Replaces the current database contents.
#   deploy/scripts/restore.sh /var/backups/ourdealshub/ourdealshub-YYYYMMDD-HHMMSS.sql.gz
set -euo pipefail
source "$(dirname "$0")/lib.sh"

FILE="${1:-}"
[[ -n "$FILE" ]] || die "Usage: restore.sh <backup.sql.gz>   (ourdeals backups lists them)"
sudo test -r "$FILE" || die "Can't read $FILE"

read -rp "This replaces ALL current data with $FILE. Type 'restore' to continue: " ok
[[ "$ok" == "restore" ]] || die "Cancelled."

say "Restoring"
sudo cat "$FILE" | gunzip | compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u ourdealshub ourdealshub' >/dev/null
compose restart app
say "Restored $FILE"
