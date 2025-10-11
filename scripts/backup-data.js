#!/usr/bin/env node

/**
 * CineAI Backup Script
 * 
 * Creates comprehensive backups of:
 * - Database (PostgreSQL dump)
 * - Configuration files (.env.local, supabase/config.toml)
 * - User data (JSON export)
 * 
 * Usage:
 *   npm run backup
 *   node scripts/backup-data.js
 *   node scripts/backup-data.js --restore backup-2024-01-15.sql
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
const printSuccess = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const printError = (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const printWarning = (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
const printInfo = (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
const printHeader = (msg) => {
  console.log(`\n${colors.cyan}================================${colors.reset}`);
  console.log(`${colors.cyan}${msg}${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);
};

// Check if command exists
const commandExists = (command) => {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
};

// Get current timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Check if Supabase is running
const checkSupabaseStatus = () => {
  try {
    const status = execSync('supabase status', { encoding: 'utf8' });
    if (status.includes('API URL') && status.includes('anon key')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Create database backup
const createDatabaseBackup = (timestamp) => {
  printHeader('Creating Database Backup');
  
  if (!checkSupabaseStatus()) {
    printError('Supabase is not running');
    printInfo('Start Supabase with: supabase start');
    return null;
  }
  
  const backupFile = `backup-${timestamp}.sql`;
  
  try {
    printInfo('Creating PostgreSQL dump...');
    execSync(`supabase db dump --data-only > ${backupFile}`, { stdio: 'inherit' });
    
    // Check if backup file was created and has content
    if (fs.existsSync(backupFile) && fs.statSync(backupFile).size > 0) {
      printSuccess(`Database backup created: ${backupFile}`);
      return backupFile;
    } else {
      printError('Database backup failed - empty file');
      return null;
    }
  } catch (error) {
    printError(`Database backup failed: ${error.message}`);
    return null;
  }
};

// Create configuration backup
const createConfigBackup = (timestamp) => {
  printHeader('Creating Configuration Backup');
  
  const configFiles = [
    '.env.local',
    'supabase/config.toml',
    'package.json'
  ];
  
  const backupFile = `backup-${timestamp}-config.tar.gz`;
  const existingFiles = configFiles.filter(file => fs.existsSync(file));
  
  if (existingFiles.length === 0) {
    printWarning('No configuration files found to backup');
    return null;
  }
  
  try {
    printInfo('Creating configuration backup...');
    const filesList = existingFiles.join(' ');
    execSync(`tar -czf ${backupFile} ${filesList}`, { stdio: 'inherit' });
    
    if (fs.existsSync(backupFile) && fs.statSync(backupFile).size > 0) {
      printSuccess(`Configuration backup created: ${backupFile}`);
      return backupFile;
    } else {
      printError('Configuration backup failed - empty file');
      return null;
    }
  } catch (error) {
    printError(`Configuration backup failed: ${error.message}`);
    return null;
  }
};

// Create user data backup
const createUserDataBackup = async (timestamp) => {
  printHeader('Creating User Data Backup');
  
  // Load environment variables
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    printError('.env.local file not found');
    return null;
  }
  
  // Parse environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    printError('Supabase credentials not found in .env.local');
    return null;
  }
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Export user data
    const userData = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      data: {}
    };
    
    // Export profiles
    printInfo('Exporting user profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      printWarning(`Profiles export failed: ${profilesError.message}`);
    } else {
      userData.data.profiles = profiles || [];
      printSuccess(`Exported ${profiles?.length || 0} profiles`);
    }
    
    // Export ratings
    printInfo('Exporting movie ratings...');
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('*');
    
    if (ratingsError) {
      printWarning(`Ratings export failed: ${ratingsError.message}`);
    } else {
      userData.data.ratings = ratings || [];
      printSuccess(`Exported ${ratings?.length || 0} ratings`);
    }
    
    // Export watchlist
    printInfo('Exporting watchlist...');
    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlist')
      .select('*');
    
    if (watchlistError) {
      printWarning(`Watchlist export failed: ${watchlistError.message}`);
    } else {
      userData.data.watchlist = watchlist || [];
      printSuccess(`Exported ${watchlist?.length || 0} watchlist items`);
    }
    
    // Export behavior signals
    printInfo('Exporting behavior signals...');
    const { data: signals, error: signalsError } = await supabase
      .from('user_behavior_signals')
      .select('*');
    
    if (signalsError) {
      printWarning(`Behavior signals export failed: ${signalsError.message}`);
    } else {
      userData.data.behavior_signals = signals || [];
      printSuccess(`Exported ${signals?.length || 0} behavior signals`);
    }
    
    // Export chat sessions
    printInfo('Exporting chat sessions...');
    const { data: chats, error: chatsError } = await supabase
      .from('chat_sessions')
      .select('*');
    
    if (chatsError) {
      printWarning(`Chat sessions export failed: ${chatsError.message}`);
    } else {
      userData.data.chat_sessions = chats || [];
      printSuccess(`Exported ${chats?.length || 0} chat sessions`);
    }
    
    // Save user data backup
    const backupFile = `backup-${timestamp}-data.json`;
    fs.writeFileSync(backupFile, JSON.stringify(userData, null, 2));
    
    printSuccess(`User data backup created: ${backupFile}`);
    return backupFile;
    
  } catch (error) {
    printError(`User data backup failed: ${error.message}`);
    return null;
  }
};

// Restore from backup
const restoreFromBackup = async (backupFile) => {
  printHeader(`Restoring from Backup: ${backupFile}`);
  
  if (!fs.existsSync(backupFile)) {
    printError(`Backup file not found: ${backupFile}`);
    return false;
  }
  
  if (!checkSupabaseStatus()) {
    printError('Supabase is not running');
    printInfo('Start Supabase with: supabase start');
    return false;
  }
  
  try {
    if (backupFile.endsWith('.sql')) {
      // Database restore
      printInfo('Restoring database...');
      execSync(`psql -h localhost -p 54322 -U postgres -d postgres < ${backupFile}`, { stdio: 'inherit' });
      printSuccess('Database restored successfully');
    } else if (backupFile.endsWith('.json')) {
      // User data restore
      printInfo('Restoring user data...');
      const userData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      // Load environment variables
      const envPath = path.join(process.cwd(), '.env.local');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      });
      
      const supabase = createClient(
        envVars.NEXT_PUBLIC_SUPABASE_URL,
        envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      // Restore data tables
      for (const [tableName, data] of Object.entries(userData.data)) {
        if (data && data.length > 0) {
          printInfo(`Restoring ${tableName}...`);
          const { error } = await supabase
            .from(tableName)
            .insert(data);
          
          if (error) {
            printWarning(`${tableName} restore failed: ${error.message}`);
          } else {
            printSuccess(`Restored ${data.length} ${tableName} records`);
          }
        }
      }
    } else {
      printError('Unsupported backup file format');
      return false;
    }
    
    return true;
  } catch (error) {
    printError(`Restore failed: ${error.message}`);
    return false;
  }
};

// List available backups
const listBackups = () => {
  printHeader('Available Backups');
  
  const backupFiles = fs.readdirSync(process.cwd())
    .filter(file => file.startsWith('backup-'))
    .sort()
    .reverse();
  
  if (backupFiles.length === 0) {
    printInfo('No backup files found');
    return;
  }
  
  backupFiles.forEach(file => {
    const stats = fs.statSync(file);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    const date = stats.mtime.toISOString().split('T')[0];
    printInfo(`${file} (${size} MB, ${date})`);
  });
};

// Main backup function
const createBackup = async () => {
  printHeader('CineAI Backup Process');
  
  const timestamp = getTimestamp();
  const backups = [];
  
  // Create database backup
  const dbBackup = createDatabaseBackup(timestamp);
  if (dbBackup) backups.push(dbBackup);
  
  // Create configuration backup
  const configBackup = createConfigBackup(timestamp);
  if (configBackup) backups.push(configBackup);
  
  // Create user data backup
  const dataBackup = await createUserDataBackup(timestamp);
  if (dataBackup) backups.push(dataBackup);
  
  // Summary
  printHeader('Backup Summary');
  
  if (backups.length > 0) {
    printSuccess(`Created ${backups.length} backup files:`);
    backups.forEach(backup => {
      const stats = fs.statSync(backup);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      printInfo(`  ${backup} (${size} MB)`);
    });
    
    printInfo('\nBackup files are stored in the current directory');
    printInfo('Keep these files safe - they contain your data!');
  } else {
    printError('No backups were created');
    printInfo('Check the error messages above and try again');
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
CineAI Backup Script

Usage:
  npm run backup                    # Create backup
  node scripts/backup-data.js       # Create backup
  node scripts/backup-data.js --restore <file>  # Restore from backup
  node scripts/backup-data.js --list            # List available backups

Options:
  --restore <file>    Restore from backup file
  --list              List available backup files
  --help, -h          Show this help message
`);
    return;
  }
  
  if (args.includes('--list')) {
    listBackups();
    return;
  }
  
  if (args.includes('--restore')) {
    const restoreIndex = args.indexOf('--restore');
    const backupFile = args[restoreIndex + 1];
    
    if (!backupFile) {
      printError('Please specify a backup file to restore');
      printInfo('Usage: node scripts/backup-data.js --restore backup-2024-01-15.sql');
      return;
    }
    
    const success = await restoreFromBackup(backupFile);
    if (success) {
      printSuccess('Restore completed successfully');
    } else {
      printError('Restore failed');
    }
    return;
  }
  
  // Default: create backup
  await createBackup();
};

// Run main function
if (require.main === module) {
  main().catch(error => {
    printError(`Backup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { createBackup, restoreFromBackup, listBackups };
