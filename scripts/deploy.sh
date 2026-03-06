#!/bin/bash
set -e
echo "=== Dental Booking Platform Deploy ==="
echo "Pulling latest code..."
git pull origin main
echo "Building and deploying..."
docker compose -f docker-compose.prod.yml up -d --build
echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push
echo "=== Deploy complete! ==="
