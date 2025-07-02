import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },
  
  /* Global test timeout - performance tests may take longer */
  timeout: 60000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'performance-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance testing specific settings
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-info',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
          ]
        }
      },
      testMatch: ['browser-performance.spec.ts']
    },

    {
      name: 'stress-testing',
      use: { 
        ...devices['Desktop Chrome'],
        // Stress testing settings
        launchOptions: {
          args: [
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--disable-dev-shm-usage'
          ]
        }
      },
      testMatch: ['stress-test.spec.ts']
    },

    {
      name: 'mobile-performance',
      use: { 
        ...devices['Pixel 5'],
        // Mobile performance settings
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--disable-background-timer-throttling'
          ]
        }
      },
      testMatch: ['browser-performance.spec.ts']
    },

    // Slow network simulation
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow network
        contextOptions: {
          // This will be set per test as needed
        }
      },
      testMatch: ['browser-performance.spec.ts']
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: undefined,
});