#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Checking if database needs seeding..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.user.count().then(n => { console.log(n); db.\$disconnect(); }).catch(() => { console.log(0); db.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "Database is empty, seeding initial data..."
  npx prisma db seed
else
  echo "Database already has $USER_COUNT user(s), skipping seed."
fi

echo "Starting application..."
exec node server.js
