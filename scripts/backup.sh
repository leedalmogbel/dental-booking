#!/bin/bash
set -e
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
echo "Backing up database..."
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U dental dentalbook > "$BACKUP_DIR/db_$TIMESTAMP.sql"
echo "Backup saved to $BACKUP_DIR/db_$TIMESTAMP.sql"
# Keep only last 7 backups
ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs -r rm
echo "Old backups cleaned up."
