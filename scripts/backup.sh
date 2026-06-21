#!/usr/bin/env bash
# Nightly backup: Postgres dump + a tar of the file storage (PDFs/uploads/avatars).
# Writes to ./backups and keeps 14 days. Run from cron, e.g.:
#   0 3 * * *  cd /opt/lumina && ./scripts/backup.sh >> /var/log/lumina-backup.log 2>&1
#
# OPTIONAL off-box copy (strongly recommended for legal documents): uncomment the
# rclone line and configure a remote (Cloudflare R2 / Backblaze B2 / any S3):
#   rclone config   # create a remote named "offsite"
set -euo pipefail
cd "$(dirname "$0")/.."

TS="$(date -u +%Y%m%d-%H%M%S)"
mkdir -p backups

echo "[backup] $TS — dumping database…"
docker compose exec -T db pg_dump -U lumina lumina | gzip > "backups/db-$TS.sql.gz"

echo "[backup] $TS — archiving file storage…"
docker compose exec -T web tar czf - -C /app/.storage . > "backups/storage-$TS.tar.gz"

# Off-box copy (uncomment after configuring an rclone remote called "offsite"):
# rclone copy backups "offsite:lumina-backups" --include "*-$TS.*"

echo "[backup] $TS — pruning backups older than 14 days…"
find backups -type f -mtime +14 -delete

echo "[backup] $TS — done."
