#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function runCommand(command, description) {
  log(`\n${colors.bright}━━━ ${description} ━━━${colors.reset}`, 'bright')
  
  try {
    execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      cwd: process.cwd()
    })
    log(`✅ ${description} completed successfully`, 'green')
    return true
  } catch (error) {
    log(`❌ ${description} failed`, 'red')
    log(`Error: ${error.message}`, 'red')
    return false
  }
}

function checkTestFiles() {
  const testFiles = [
    'src/__tests__/api/movies.test.ts',
    'src/__tests__/components/movies-page.test.tsx',
    'src/__tests__/components/dashboard.test.tsx',
    'src/__tests__/integration/preference-workflow.test.ts',
  ]

  log('\n🔍 Checking test files...', 'cyan')
  
  let allFilesExist = true
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green')
    } else {
      log(`❌ ${file} - File not found`, 'red')
      allFilesExist = false
    }
  })

  return allFilesExist
}

function main() {
  log('🎬 Movie Recommendation App - Test Suite', 'cyan')
  log('━'.repeat(60), 'cyan')
  
  const results = []
  
  // Run linting
  results.push({
    name: 'ESLint Code Quality Check',
    success: runCommand('npm run lint', 'Running ESLint code quality check')
  })
  
  // Run type checking
  results.push({
    name: 'TypeScript Type Check',
    success: runCommand('npm run type-check', 'Running TypeScript type checking')
  })
  
  // Run API tests
  results.push({
    name: 'API Tests',
    success: runCommand('npm run test:api', 'Running API endpoint tests')
  })
  
  // Run component tests
  results.push({
    name: 'Component Tests',
    success: runCommand('npm run test:components', 'Running React component tests')
  })
  
  // Run integration tests
  results.push({
    name: 'Integration Tests',
    success: runCommand('npm run test:integration', 'Running integration workflow tests')
  })
  
  // Run full test suite with coverage
  results.push({
    name: 'Full Test Suite with Coverage',
    success: runCommand('npm run test:coverage', 'Running complete test suite with coverage report')
  })
  
  // Summary
  log('\\n' + '━'.repeat(60), 'cyan')
  log('📊 TEST RESULTS SUMMARY', 'bright')
  log('━'.repeat(60), 'cyan')
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const color = result.success ? 'green' : 'red'
    log(`${status} ${result.name}`, color)
  })
  
  log('\\n' + '━'.repeat(60), 'cyan')
  log(`📈 OVERALL: ${passed}/${results.length} test suites passed`, passed === results.length ? 'green' : 'yellow')
  
  if (failed === 0) {
    log('🎉 All tests passed! Ready for commit.', 'green')
    process.exit(0)
  } else {
    log(`⚠️  ${failed} test suite(s) failed. Please fix before committing.`, 'red')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { main, runCommand, log } 