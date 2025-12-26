#!/usr/bin/env node

/**
 * Apply Supabase Migrations
 * 
 * This script directly applies SQL migrations to your Supabase database
 * using the service role key.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🚀 CineAI Migration Runner');
console.log('==========================\n');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   Please ensure .env.local has:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Invalid Supabase URL format');
  process.exit(1);
}

console.log(`📌 Project: ${projectRef}`);
console.log(`🔗 URL: ${SUPABASE_URL}\n`);

// Get migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`📁 Found ${migrationFiles.length} migrations\n`);

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: body });
        } else {
          resolve({ success: false, error: body, status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runMigration(filename) {
  const filepath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  console.log(`⏳ ${filename}`);
  
  try {
    // Try using PostgREST
    const result = await executeSql(sql);
    
    if (result.success) {
      console.log(`   ✅ Applied successfully\n`);
      return true;
    } else {
      console.log(`   ⚠️  Status ${result.status}: ${result.error}`);
      console.log(`   📋 This migration may need to be run manually\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   📋 Run this migration manually in SQL Editor\n`);
    return false;
  }
}

async function main() {
  console.log('🎬 Starting migrations...\n');
  
  let success = 0;
  let failed = 0;
  const failedFiles = [];
  
  for (const file of migrationFiles) {
    const result = await runMigration(file);
    if (result) {
      success++;
    } else {
      failed++;
      failedFiles.push(file);
    }
    
    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n==========================');
  console.log('📊 Results');
  console.log('==========================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total: ${migrationFiles.length}\n`);
  
  if (failedFiles.length > 0) {
    console.log('⚠️  Failed migrations:');
    failedFiles.forEach(file => console.log(`   - ${file}`));
    console.log('\n📝 Run these manually in SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`);
  } else {
    console.log('🎉 All migrations completed!\n');
    console.log('✨ Restart your dev server for changes to take effect\n');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.log('\n📝 Alternative: Run migrations manually');
  console.log(`   Go to: https://supabase.com/dashboard/project/${projectRef}/sql`);
  console.log(`   Copy SQL from: supabase/migrations/\n`);
  process.exit(1);
});

