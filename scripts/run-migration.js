#!/usr/bin/env node

/**
 * Run Supabase migration on cloud database
 *
 * Usage:
 *   node scripts/run-migration.js
 *
 * Or add to package.json:
 *   "migrate": "node scripts/run-migration.js"
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  console.log('🚀 Running migration on cloud Supabase...\n')

  // Check for required env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nMake sure .env.local is properly configured.')
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'COMBINED_MIGRATION.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8')

  console.log('📝 Executing migration...')
  console.log(`   File: ${migrationPath}`)
  console.log(`   Size: ${(migrationSql.length / 1024).toFixed(2)} KB\n`)

  try {
    // Split into individual statements and execute
    // Note: Supabase client doesn't support multi-statement queries,
    // so we need to use the REST API directly

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: migrationSql })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Migration failed: ${response.status} ${response.statusText}\n${error}`)
    }

    console.log('✅ Migration completed successfully!')
    console.log('\n📊 Next steps:')
    console.log('   1. Verify tables in Supabase Dashboard: Table Editor')
    console.log('   2. Check indexes: SQL Editor > Run: SELECT * FROM pg_indexes WHERE schemaname = \'public\'')
    console.log('   3. Test your app: npm run dev')

  } catch (error) {
    console.error('\n❌ Migration failed:')
    console.error(error.message)
    console.error('\n💡 Try using the Supabase Dashboard SQL Editor instead:')
    console.error(`   1. Go to: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`)
    console.error('   2. Paste the contents of supabase/COMBINED_MIGRATION.sql')
    console.error('   3. Click "Run"')
    process.exit(1)
  }
}

runMigration()
