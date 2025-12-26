#!/bin/bash

# Run the optimized database migration
# This applies all the improvements to your Supabase database

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 CineAI Database Optimization Migration"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "This will apply the following improvements:"
echo "  ✅ 30+ performance indexes"
echo "  ✅ Full-text search support"
echo "  ✅ Data quality constraints"
echo "  ✅ Updated-at triggers"
echo "  ✅ JSONB indexes for AI queries"
echo "  ✅ Fix ratings duplication"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20250111000002_optimized_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo "📊 File size: $(wc -l < "$MIGRATION_FILE") lines"
echo ""

# Copy to clipboard
if command -v pbcopy &> /dev/null; then
  cat "$MIGRATION_FILE" | pbcopy
  echo "✅ Migration copied to clipboard!"
  echo ""
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  📋 How to Run"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Option 1: Supabase Dashboard (EASIEST - 2 minutes)"
echo "  1. Go to: https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/sql/new"
echo "  2. Paste the migration (already in clipboard)"
echo "  3. Click 'Run'"
echo ""
echo "Option 2: Supabase CLI"
echo "  1. npx supabase login"
echo "  2. npx supabase link --project-ref lemmmkjxsidfjexzwxtb"
echo "  3. npx supabase db push"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Ask if user wants to open the dashboard
read -p "Open Supabase SQL Editor in browser? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🌐 Opening Supabase SQL Editor..."
  open "https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/sql/new"
  echo ""
  echo "✅ SQL Editor opened!"
  echo "   Just press Cmd+V to paste the migration and click 'Run'"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📚 Documentation"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "For detailed information about the improvements:"
echo "  📄 Read: supabase/MIGRATION_IMPROVEMENTS.md"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Good luck! 🎬"
echo ""
