#!/usr/bin/env bash
# EcoSetu Database Demo Data Seed Script
set -e

echo "=== Seeding EcoSetu PostgreSQL Demo Data ==="
cd "$(dirname "$0")/../backend"

npx prisma db seed

echo "Demo data seeding complete."
