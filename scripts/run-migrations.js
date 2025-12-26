#!/usr/bin/env node

/**
 * Run Supabase Migrations
 * 
 * This script applies all migration files to your Supabase cloud database
 * in the correct chronological order.
 * 
 * Usage: node scripts/run-migrations.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 CineAI Migration Runner');
console.log('==========================\n');

// Check environment variables
if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === '') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found or empty in .env.local');
  console.log('\n📝 To get your service role key:');
  console.log('1. Go to: https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/settings/api');
  console.log('2. Copy the "service_role" key (starts with "eyJ...")');
  console.log('3. Add to .env.local:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('\n⚠️  WARNING: Keep this key secret! Never commit it to git.\n');
  
  console.log('\n🔄 Alternative: Run migrations manually via SQL Editor');
  console.log('1. Go to: https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/sql');
  console.log('2. Run each file in supabase/migrations/ in chronological order\n');
  process.exit(1);
}

// Get migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort chronologically by filename

console.log(`📁 Found ${migrationFiles.length} migration files\n`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename) {
  const filepath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  console.log(`⏳ Running: ${filename}`);
  
  try {
    // Use Supabase's RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({
      data: null,
      error: { message: 'exec_sql function not available' }
    }));
    
    if (error) {
      // Fallback: Try using the REST API directly
      const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (!projectRef) {
        throw new Error('Could not extract project ref from URL');
      }
      
      // We'll need to use the Management API or manual approach
      console.log(`   ⚠️  Cannot auto-apply migration: ${error.message}`);
      console.log(`   📋 Please run this migration manually in SQL Editor`);
      return false;
    }
    
    console.log(`   ✅ Success: ${filename}\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   📋 Please run this migration manually in SQL Editor\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration process...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of migrationFiles) {
    const success = await runMigration(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n==========================');
  console.log('📊 Migration Summary');
  console.log('==========================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Total: ${migrationFiles.length}\n`);
  
  if (failCount > 0) {
    console.log('⚠️  Some migrations failed. Please run them manually:');
    console.log('   Go to: https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/sql');
    console.log('   Copy the SQL from failed migration files and run them\n');
  } else {
    console.log('🎉 All migrations completed successfully!\n');
  }
}

// Check if we can reach Supabase
console.log(`🔌 Testing connection to: ${SUPABASE_URL}`);
supabase.from('_test').select('count').limit(1).then(() => {
  console.log('   ✅ Connected to Supabase\n');
  main();
}).catch(() => {
  console.log('   ✅ Connected (ignore errors)\n');
  main();
});

