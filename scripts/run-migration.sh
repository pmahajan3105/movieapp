#!/bin/bash

# Run migration on cloud Supabase database
# This script connects directly using the connection string

set -e

echo "🚀 Running migration on cloud Supabase..."
echo ""
echo "⚠️  You'll need your database password from:"
echo "   https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/settings/database"
echo ""

# Get database password
read -sp "Enter your database password: " DB_PASSWORD
echo ""

# Connection string
DB_URL="postgresql://postgres.lemmmkjxsidfjexzwxtb:${DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Run migration
echo ""
echo "📝 Executing migration..."
psql "$DB_URL" -f supabase/COMBINED_MIGRATION.sql

echo ""
echo "✅ Migration completed successfully!"
