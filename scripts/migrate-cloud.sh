#!/bin/bash

# Simple script to run migration on cloud Supabase using CLI
# This uses the Supabase CLI's db push command

set -e

echo "🚀 Running migration on cloud Supabase..."
echo ""
echo "This will push your migration to the cloud database."
echo "Make sure you're logged in to Supabase CLI first."
echo ""

# Check if logged in
echo "📋 Checking Supabase CLI login status..."
if ! npx supabase projects list &>/dev/null; then
  echo ""
  echo "❌ Not logged in to Supabase CLI"
  echo ""
  echo "Please login first:"
  echo "  npx supabase login"
  echo ""
  echo "Then link your project:"
  echo "  npx supabase link --project-ref lemmmkjxsidfjexzwxtb"
  echo ""
  exit 1
fi

echo "✅ Logged in"
echo ""

# Check if linked
if [ ! -f "supabase/.branches/_current_branch" ]; then
  echo "❌ Not linked to a project"
  echo ""
  echo "Please link your project:"
  echo "  npx supabase link --project-ref lemmmkjxsidfjexzwxtb"
  echo ""
  exit 1
fi

echo "✅ Project linked"
echo ""

# Move migration to migrations folder
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_combined_migration.sql"

echo "📝 Preparing migration..."
cp supabase/COMBINED_MIGRATION.sql "$MIGRATION_FILE"

echo "✅ Migration file created: $MIGRATION_FILE"
echo ""

# Push to cloud
echo "🚀 Pushing migration to cloud..."
npx supabase db push

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📊 Verify in Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/editor"
