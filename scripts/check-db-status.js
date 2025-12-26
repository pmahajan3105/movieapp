#!/usr/bin/env node
/**
 * Check Database Status
 * Shows what tables exist and what's missing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking Database Status\n');
  
  const requiredTables = [
    'user_profiles',
    'movies',
    'watchlist',
    'ratings',
    'user_interactions',
    'conversational_memory',
    'user_preference_insights',
    'recommendation_queue',
    'chat_sessions',
    'chat_messages',
    'user_behavior_signals',
    'api_usage_log',
    'hyper_personalized_recommendations'
  ];

  console.log('📊 Checking tables...\n');

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table} - MISSING`);
        } else {
          console.log(`⚠️  ${table} - Error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table} - EXISTS`);
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR: ${err.message}`);
    }
  }
}

checkTables().catch(console.error);

