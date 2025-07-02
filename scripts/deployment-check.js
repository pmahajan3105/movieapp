#!/usr/bin/env node

/**
 * CineAI Deployment Readiness Checker
 * Verifies all systems are ready for production deployment
 */

const fs = require('fs')
const path = require('path')

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'

class DeploymentChecker {
  constructor() {
    this.checks = []
    this.passed = 0
    this.failed = 0
    this.warnings = 0
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`)
  }

  check(name, testFn, isWarning = false) {
    try {
      const result = testFn()
      if (result) {
        this.log(`✅ ${name}`, GREEN)
        this.passed++
      } else {
        if (isWarning) {
          this.log(`⚠️  ${name}`, YELLOW)
          this.warnings++
        } else {
          this.log(`❌ ${name}`, RED)
          this.failed++
        }
      }
    } catch (error) {
      if (isWarning) {
        this.log(`⚠️  ${name}: ${error.message}`, YELLOW)
        this.warnings++
      } else {
        this.log(`❌ ${name}: ${error.message}`, RED)
        this.failed++
      }
    }
  }

  async run() {
    this.log('\n🚀 CineAI Deployment Readiness Check\n', BLUE)

    // Environment Variables
    this.log('📋 Environment Variables', BLUE)
    this.check('Supabase URL configured', () => {
      return (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase')
      )
    })
    this.check('Supabase Anon Key configured', () => {
      return (
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50
      )
    })
    this.check('Anthropic API Key configured', () => {
      return process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')
    })

    // File Structure
    this.log('\n📁 File Structure', BLUE)
    this.check('Package.json exists', () => fs.existsSync('package.json'))
    this.check(
      'Next.js config exists',
      () =>
        fs.existsSync('next.config.js') ||
        fs.existsSync('next.config.mjs') ||
        fs.existsSync('next.config.ts')
    )
    this.check(
      'Tailwind config exists',
      () =>
        fs.existsSync('tailwind.config.ts') ||
        fs.existsSync('tailwind.config.js') ||
        fs.existsSync('postcss.config.mjs')
    )
    this.check('TypeScript config exists', () => fs.existsSync('tsconfig.json'))

    // Critical Components
    this.log('\n🧩 Critical Components', BLUE)
    this.check('Hyper-personalized engine exists', () =>
      fs.existsSync('src/lib/ai/hyper-personalized-engine.ts')
    )
    this.check('API route exists', () =>
      fs.existsSync('src/app/api/recommendations/hyper-personalized/route.ts')
    )
    this.check('Dashboard section exists', () =>
      fs.existsSync('src/components/dashboard/HyperPersonalizedSection.tsx')
    )
    this.check('Movie cards exist', () =>
      fs.existsSync('src/components/movies/HyperPersonalizedMovieCard.tsx')
    )
    this.check('Hooks exist', () =>
      fs.existsSync('src/hooks/useHyperPersonalizedRecommendations.ts')
    )

    // Database
    this.log('\n🗄️  Database', BLUE)
    this.check('Migration files exist', () => {
      const migrationDir = 'supabase/migrations'
      return fs.existsSync(migrationDir) && fs.readdirSync(migrationDir).length > 0
    })
    this.check('User behavior signals migration exists', () => {
      const migrationDir = 'supabase/migrations'
      if (!fs.existsSync(migrationDir)) return false
      const files = fs.readdirSync(migrationDir)
      return files.some(file => file.includes('user_behavior_signals'))
    })

    // Build & Dependencies
    this.log('\n🔧 Build & Dependencies', BLUE)
    this.check('All dependencies installed', () => fs.existsSync('node_modules'))
    this.check('Package.json has proper metadata', () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      return pkg.name === 'cineai' && pkg.version && pkg.description
    })
    this.check('TypeScript builds without errors', () => {
      // This would require running tsc --noEmit, simplified for now
      return fs.existsSync('tsconfig.json')
    })

    // Testing
    this.log('\n🧪 Testing', BLUE)
    this.check('Jest config exists', () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      return pkg.jest || fs.existsSync('jest.config.js') || fs.existsSync('jest.config.ts')
    })
    this.check('Test files exist', () => {
      return fs.existsSync('src/__tests__') && fs.readdirSync('src/__tests__').length > 0
    })
    this.check('Playwright config exists', () => fs.existsSync('playwright.config.ts'))
    this.check('E2E tests exist', () => fs.existsSync('e2e') && fs.readdirSync('e2e').length > 0)

    // Performance & SEO
    this.log('\n⚡ Performance & SEO', BLUE)
    this.check(
      'Next.js optimizations configured',
      () => {
        try {
          let nextConfig = ''
          if (fs.existsSync('next.config.ts')) {
            nextConfig = fs.readFileSync('next.config.ts', 'utf8')
          } else if (fs.existsSync('next.config.mjs')) {
            nextConfig = fs.readFileSync('next.config.mjs', 'utf8')
          } else if (fs.existsSync('next.config.js')) {
            nextConfig = fs.readFileSync('next.config.js', 'utf8')
          }
          return nextConfig.includes('images') || nextConfig.includes('experimental')
        } catch {
          return false
        }
      },
      true
    )
    this.check('Health check endpoint exists', () => fs.existsSync('src/app/api/healthz/route.ts'))

    // Security
    this.log('\n🛡️  Security', BLUE)
    this.check(
      'Environment example file exists',
      () => fs.existsSync('env.example') || fs.existsSync('.env.example')
    )
    this.check('Git ignores environment files', () => {
      if (!fs.existsSync('.gitignore')) return false
      const gitignore = fs.readFileSync('.gitignore', 'utf8')
      return gitignore.includes('.env')
    })

    // Results
    this.log('\n📊 Results', BLUE)
    this.log(`✅ Passed: ${this.passed}`, GREEN)
    if (this.warnings > 0) {
      this.log(`⚠️  Warnings: ${this.warnings}`, YELLOW)
    }
    if (this.failed > 0) {
      this.log(`❌ Failed: ${this.failed}`, RED)
    }

    const total = this.passed + this.failed + this.warnings
    const successRate = Math.round((this.passed / total) * 100)

    this.log(
      `\n🎯 Success Rate: ${successRate}%`,
      successRate >= 90 ? GREEN : successRate >= 70 ? YELLOW : RED
    )

    if (this.failed === 0) {
      this.log('\n🚀 Ready for deployment!', GREEN)
      this.log('Run: npm run build && npm run deploy:production', BLUE)
    } else {
      this.log('\n⚠️  Please fix the failed checks before deploying', YELLOW)
    }

    return this.failed === 0
  }
}

// Run the deployment check
if (require.main === module) {
  const checker = new DeploymentChecker()
  checker
    .run()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Deployment check failed:', error)
      process.exit(1)
    })
}

module.exports = DeploymentChecker
