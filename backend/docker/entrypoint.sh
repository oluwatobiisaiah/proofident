#!/bin/sh
set -e

echo "Running database migrations..."
node dist/migrate.js

echo "Seeding canonical data..."
node dist/seed.js

echo "Starting application..."
exec "$@"
