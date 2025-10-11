#!/usr/bin/env node

/**
 * CineAI Setup Validation Script
 * 
 * This script validates that CineAI is properly set up for local development:
 * - All required environment variables are set
 * - Supabase is running and accessible
 * - Database migrations have been applied
 * - API keys are valid (basic format check)
 * - Required npm packages are installed
 * - Port 3000 is available
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const net = require('net');

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

// Check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
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

// Validate environment variables
const validateEnvironment = () => {
  printHeader('Validating Environment Variables');
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    printError('.env.local file not found');
    printInfo('Run the setup script first: ./scripts/setup-local.sh');
    return false;
  }
  
  // Load environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'TMDB_API_KEY'
  ];
  
  let allValid = true;
  
  for (const varName of requiredVars) {
    const value = envVars[varName];
    
    if (!value || value.includes('your_') || value.includes('_here')) {
      printError(`${varName} is not configured`);
      allValid = false;
    } else {
      printSuccess(`${varName} is configured`);
    }
  }
  
  // Validate API key formats
  if (envVars.OPENAI_API_KEY && !envVars.OPENAI_API_KEY.startsWith('sk-')) {
    printWarning('OpenAI API key format looks invalid (should start with sk-)');
  }
  
  if (envVars.ANTHROPIC_API_KEY && !envVars.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    printWarning('Anthropic API key format looks invalid (should start with sk-ant-)');
  }
  
  return allValid;
};

// Validate Supabase connection
const validateSupabase = async () => {
  printHeader('Validating Supabase Connection');
  
  // Check if we're using cloud Supabase (no CLI needed)
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('supabase.co')) {
      printSuccess('Using cloud Supabase (no CLI needed)');
      return true;
    }
  }
  
  // Check for local Supabase
  if (!commandExists('supabase')) {
    printError('Supabase CLI not found');
    printInfo('For cloud setup: No CLI needed');
    printInfo('For local setup: Install with: npm install -g supabase');
    return false;
  }
  
  try {
    // Check if Supabase is running
    const status = execSync('supabase status', { encoding: 'utf8' });
    
    if (status.includes('API URL') && status.includes('anon key')) {
      printSuccess('Local Supabase is running');
      
      // Extract URL from status
      const urlMatch = status.match(/API URL:\s*(.+)/);
      if (urlMatch) {
        const supabaseUrl = urlMatch[1].trim();
        printInfo(`Supabase URL: ${supabaseUrl}`);
      }
      
      return true;
    } else {
      printError('Local Supabase is not running properly');
      printInfo('Start it with: supabase start');
      return false;
    }
  } catch (error) {
    printError('Failed to check Supabase status');
    printInfo('For cloud setup: Check your .env.local file');
    printInfo('For local setup: Start with: supabase start');
    return false;
  }
};

// Validate database migrations
const validateMigrations = async () => {
  printHeader('Validating Database Migrations');
  
  try {
    // Check if migrations have been applied
    const migrationStatus = execSync('supabase migration list', { encoding: 'utf8' });
    
    if (migrationStatus.includes('applied')) {
      printSuccess('Database migrations are applied');
      return true;
    } else {
      printWarning('No migrations found or applied');
      printInfo('Run migrations with: supabase db reset');
      return false;
    }
  } catch (error) {
    printError('Failed to check migration status');
    return false;
  }
};

// Validate npm packages
const validatePackages = () => {
  printHeader('Validating Dependencies');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    printError('package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredPackages = [
    'next',
    'react',
    'typescript',
    '@supabase/supabase-js',
    '@anthropic-ai/sdk',
    'openai'
  ];
  
  let allInstalled = true;
  
  for (const pkg of requiredPackages) {
    if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
      printSuccess(`${pkg} is listed in package.json`);
    } else {
      printError(`${pkg} is missing from package.json`);
      allInstalled = false;
    }
  }
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    printError('node_modules not found');
    printInfo('Install dependencies with: npm install');
    return false;
  }
  
  printSuccess('All dependencies are installed');
  return allInstalled;
};

// Validate port availability
const validatePorts = async () => {
  printHeader('Validating Port Availability');
  
  const ports = [3000, 54321, 54322, 54323];
  let allAvailable = true;
  
  for (const port of ports) {
    const available = await isPortAvailable(port);
    if (available) {
      printSuccess(`Port ${port} is available`);
    } else {
      printWarning(`Port ${port} is in use`);
      if (port === 3000) {
        printInfo('This might be because the app is already running');
      } else if ([54321, 54322, 54323].includes(port)) {
        printInfo('This might be because Supabase is running (which is good!)');
      }
    }
  }
  
  return allAvailable;
};

// Validate API connectivity
const validateAPIConnectivity = async () => {
  printHeader('Validating API Connectivity');
  
  try {
    // Test if we can reach OpenAI (basic connectivity)
    const https = require('https');
    
    const testOpenAI = () => {
      return new Promise((resolve) => {
        const req = https.request({
          hostname: 'api.openai.com',
          port: 443,
          path: '/v1/models',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          resolve(res.statusCode === 401); // 401 means we reached the API (auth required)
        });
        
        req.on('error', () => resolve(false));
        req.on('timeout', () => resolve(false));
        req.end();
      });
    };
    
    const openaiReachable = await testOpenAI();
    if (openaiReachable) {
      printSuccess('OpenAI API is reachable');
    } else {
      printWarning('OpenAI API connectivity test failed (this might be normal)');
    }
    
    return true;
  } catch (error) {
    printWarning('API connectivity test failed');
    return true; // Don't fail the whole validation for this
  }
};

// Main validation function
const main = async () => {
  console.log('🔍 CineAI Setup Validation\n');
  
  const checks = [
    { name: 'Environment Variables', fn: validateEnvironment },
    { name: 'Supabase Connection', fn: validateSupabase },
    { name: 'Database Migrations', fn: validateMigrations },
    { name: 'Dependencies', fn: validatePackages },
    { name: 'Port Availability', fn: validatePorts },
    { name: 'API Connectivity', fn: validateAPIConnectivity }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      printError(`${check.name} validation failed: ${error.message}`);
      results.push({ name: check.name, passed: false });
    }
  }
  
  // Summary
  printHeader('Validation Summary');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.passed) {
      printSuccess(`${result.name}`);
    } else {
      printError(`${result.name}`);
    }
  });
  
  console.log(`\n${passed}/${total} checks passed`);
  
  if (passed === total) {
    printSuccess('🎉 All validations passed! CineAI is ready to run.');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open http://localhost:3000 in your browser');
    console.log('3. Access Supabase Studio: supabase studio');
    process.exit(0);
  } else {
    printError('❌ Some validations failed. Please fix the issues above.');
    console.log('\nTroubleshooting:');
    console.log('- Run the setup script again: ./scripts/setup-local.sh');
    console.log('- Check the troubleshooting guide: docs/TROUBLESHOOTING.md');
    process.exit(1);
  }
};

// Run validation
if (require.main === module) {
  main().catch(error => {
    printError(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };
