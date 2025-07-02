#!/usr/bin/env node

/**
 * Pre-Launch Verification Script
 * Runs comprehensive checks before production deployment
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'TMDB_API_KEY',
  'NEXT_PUBLIC_SITE_URL',
]

const optionalEnvVars = ['ADMIN_EMAILS', 'AI_DEFAULT_MODEL', 'AI_CHAT_MODEL', 'AI_FAST_MODEL']

let hasErrors = false
let hasWarnings = false

function log(message, type = 'info') {
  const symbols = {
    success: '✅',
    error: '❌',
    warning: '⚠️ ',
    info: 'ℹ️ ',
  }
  console.log(`${symbols[type]} ${message}`)

  if (type === 'error') hasErrors = true
  if (type === 'warning') hasWarnings = true
}

function checkEnvironmentVariables() {
  log('\n🔧 Checking Environment Variables...')

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      log(`Missing required environment variable: ${envVar}`, 'error')
    } else {
      log(`${envVar} is configured`, 'success')
    }
  }

  // Check optional variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      log(`Optional environment variable not set: ${envVar}`, 'warning')
    } else {
      log(`${envVar} is configured`, 'success')
    }
  }

  // Validate URL formats
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (siteUrl && !siteUrl.startsWith('https://') && process.env.NODE_ENV === 'production') {
    log('NEXT_PUBLIC_SITE_URL should use HTTPS in production', 'warning')
  }
}

function checkBuildConfiguration() {
  log('\n🏗️  Checking Build Configuration...')

  const configPath = path.join(process.cwd(), 'next.config.ts')
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, 'utf8')

    if (config.includes('ignoreBuildErrors: true') && process.env.NODE_ENV === 'production') {
      log('Build errors are being ignored in production - this is risky!', 'error')
    } else {
      log('Build configuration looks good', 'success')
    }

    if (config.includes('ignoreDuringBuilds: true') && process.env.NODE_ENV === 'production') {
      log('ESLint errors are being ignored in production - this is risky!', 'error')
    } else {
      log('ESLint configuration looks good', 'success')
    }
  }
}

function checkSecurityHeaders() {
  log('\n🛡️  Checking Security Configuration...')

  const configPath = path.join(process.cwd(), 'next.config.ts')
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, 'utf8')

    const securityFeatures = [
      { name: 'Content-Security-Policy', check: 'Content-Security-Policy' },
      { name: 'Strict-Transport-Security', check: 'Strict-Transport-Security' },
      { name: 'X-Frame-Options', check: 'X-Frame-Options' },
      { name: 'X-Content-Type-Options', check: 'X-Content-Type-Options' },
    ]

    for (const feature of securityFeatures) {
      if (config.includes(feature.check)) {
        log(`${feature.name} header configured`, 'success')
      } else {
        log(`${feature.name} header missing`, 'error')
      }
    }
  }
}

function runTests() {
  log('\n🧪 Running Tests...')

  try {
    execSync('npm run type-check', { stdio: 'inherit' })
    log('TypeScript compilation successful', 'success')
  } catch (error) {
    log('TypeScript compilation failed', 'error')
  }

  try {
    execSync('npm run lint', { stdio: 'inherit' })
    log('Linting passed', 'success')
  } catch (error) {
    log('Linting failed', 'error')
  }

  try {
    execSync('npm run test:ci', { stdio: 'inherit' })
    log('Unit tests passed', 'success')
  } catch (error) {
    log('Unit tests failed', 'error')
  }
}

function checkDependencies() {
  log('\n📦 Checking Dependencies...')

  try {
    execSync('npm audit --audit-level=high', { stdio: 'inherit' })
    log('No high/critical security vulnerabilities found', 'success')
  } catch (error) {
    log('Security vulnerabilities detected - run npm audit for details', 'warning')
  }
}

function checkBuildProcess() {
  log('\n🔨 Testing Build Process...')

  try {
    execSync('npm run build', { stdio: 'inherit' })
    log('Production build successful', 'success')
  } catch (error) {
    log('Production build failed', 'error')
  }
}

function checkDatabaseSchema() {
  log('\n🗄️  Checking Database Schema...')

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  if (existsSync(migrationsDir)) {
    log('Database migrations found', 'success')
  } else {
    log('No database migrations found', 'warning')
  }

  // Check for RLS policies
  if (existsSync(migrationsDir)) {
    const files = execSync('ls supabase/migrations/', { encoding: 'utf8' })
    if (files.includes('rls') || files.includes('policy')) {
      log('Row Level Security policies detected', 'success')
    } else {
      log('Consider implementing Row Level Security policies', 'warning')
    }
  }
}

function generateReport() {
  log('\n📊 Pre-Launch Report Summary:')

  if (hasErrors) {
    log('❌ CRITICAL ISSUES FOUND - DO NOT DEPLOY TO PRODUCTION', 'error')
    log('Please fix all errors before deploying', 'error')
    process.exit(1)
  } else if (hasWarnings) {
    log('⚠️  Warnings detected - review before deploying', 'warning')
    log('Deployment can proceed but issues should be addressed', 'warning')
  } else {
    log('🎉 All checks passed - ready for production deployment!', 'success')
  }
}

// Main execution
async function main() {
  log('🚀 CineAI Pre-Launch Verification')
  log('='.repeat(50))

  checkEnvironmentVariables()
  checkBuildConfiguration()
  checkSecurityHeaders()
  checkDependencies()
  checkDatabaseSchema()
  runTests()
  checkBuildProcess()

  generateReport()
}

main().catch(error => {
  log(`Script failed: ${error.message}`, 'error')
  process.exit(1)
})
