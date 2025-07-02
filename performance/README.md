# 🎬 CineAI Performance Testing Suite

Comprehensive performance testing suite for CineAI using multiple testing tools and methodologies.

## 🛠️ Testing Tools

### 1. **K6 Load Testing** (`load-test.js`)
High-performance load testing for API endpoints and user scenarios.

**Test Scenarios:**
- 🚀 **Smoke Test**: Basic functionality validation (1 user, 1 minute)
- 📈 **Load Test**: Normal expected traffic (10 users ramping)
- 💪 **Stress Test**: Above-normal load (20-50 users)
- ⚡ **Spike Test**: Sudden traffic spikes (10→100→10 users)
- 🕐 **Soak Test**: Extended duration testing (10 users, 30 minutes)

### 2. **Playwright Browser Performance** (`browser-performance.spec.ts`)
Real browser performance testing including Core Web Vitals.

**Metrics Tested:**
- 🏆 Core Web Vitals (LCP, FID, CLS)
- 📱 Mobile performance
- 🐌 Slow network conditions  
- 💾 Memory efficiency
- 🖼️ Image loading optimization
- 🔍 Search performance
- 🤖 AI interaction performance

### 3. **Lighthouse Audits** (`lighthouse-audit.js`)
Automated performance, accessibility, and SEO auditing.

**Audit Categories:**
- ⚡ Performance (speed, optimization)
- ♿ Accessibility (WCAG compliance)
- 🏆 Best Practices (security, modern standards)
- 🔍 SEO (search engine optimization)

### 4. **Stress Testing** (`stress-test.spec.ts`)
High-load stress testing to identify breaking points.

**Stress Scenarios:**
- 👥 Concurrent user load (20+ simultaneous users)
- 💾 Memory pressure testing
- 🔄 Rapid navigation stress
- 🌊 API request flooding
- 💻 CPU stress with UI responsiveness

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
cd performance
npm install

# Install Playwright browsers
npx playwright install

# Install K6 (macOS)
brew install k6

# Install K6 (Linux)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Run All Performance Tests
```bash
npm run test:performance
```

### Individual Test Suites

#### Load Testing with K6
```bash
# All load test scenarios
npm run test:load

# Individual scenarios
npm run test:load:smoke     # Quick functionality check
npm run test:load:stress    # High load testing
npm run test:load:spike     # Traffic spike testing
npm run test:load:soak      # Extended duration testing
```

#### Browser Performance Testing
```bash
# All browser performance tests
npm run test:browser-performance

# Run with specific browser
npx playwright test browser-performance.spec.ts --project=performance-chromium
npx playwright test browser-performance.spec.ts --project=mobile-performance
```

#### Lighthouse Audits
```bash
# Run lighthouse audits
npm run test:lighthouse

# Run with custom URL
BASE_URL=https://your-app.com npm run test:lighthouse:ci
```

#### Stress Testing
```bash
# Run stress tests
npm run test:stress

# Run specific stress test
npx playwright test stress-test.spec.ts --grep "concurrent user load"
```

## 📊 Reports and Analysis

### Generate Consolidated Report
```bash
npm run generate:report
```

This creates:
- 📄 **HTML Dashboard**: `consolidated-reports/performance-dashboard.html`
- 📋 **JSON Data**: `consolidated-reports/consolidated-performance-report.json`  
- 📝 **Markdown Summary**: `consolidated-reports/performance-summary.md`

### Report Locations
```
performance/
├── reports/                          # Individual test reports
│   ├── lighthouse-results.json       # Lighthouse audit data
│   ├── lighthouse-report.html        # Lighthouse HTML report
│   ├── performance-results-load.json # K6 load test results
│   └── performance-results-*.json    # Other K6 scenario results
├── test-results/                     # Playwright test results
│   ├── html-report/                  # Browser performance HTML reports
│   ├── results.json                  # Test execution data
│   └── results.xml                   # JUnit format results
└── consolidated-reports/             # Unified reports
    ├── performance-dashboard.html    # Main dashboard
    ├── consolidated-performance-report.json
    └── performance-summary.md
```

## 🎯 Performance Thresholds

### Load Testing Thresholds
- ⚡ **Response Time**: 95% under 2 seconds
- 🚨 **Error Rate**: Less than 10% (5% for load tests)
- 🔥 **Throughput**: Maintain consistent request rate

### Browser Performance Thresholds
- 🏆 **LCP (Largest Contentful Paint)**: < 2.5 seconds
- ⚡ **FCP (First Contentful Paint)**: < 1.8 seconds  
- 📐 **CLS (Cumulative Layout Shift)**: < 0.1
- 🖱️ **FID (First Input Delay)**: < 100ms

### Lighthouse Thresholds
- 🚀 **Performance**: > 85/100
- ♿ **Accessibility**: > 95/100
- 🏆 **Best Practices**: > 90/100
- 🔍 **SEO**: > 85/100

## 🔧 Configuration

### Environment Variables
```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Test duration multiplier
SLOW_MO=1000

# K6 specific
VUS=10                    # Virtual users
DURATION=5m              # Test duration
TEST_TYPE=load           # Test scenario type
```

### Custom Test Configuration

#### K6 Load Test Customization
Edit `load-test.js` to modify:
- User scenarios and load patterns
- API endpoints to test
- Test data and user simulation
- Performance thresholds

#### Playwright Performance Tests
Edit `browser-performance.spec.ts` to add:
- New performance metrics
- Additional test scenarios  
- Custom assertions and thresholds

#### Lighthouse Audit Configuration
Edit `lighthouse-audit.js` to customize:
- Pages to audit
- Audit categories and settings
- Performance thresholds
- Device configurations

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Testing

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd performance
          npm install
          npx playwright install
          
      - name: Install K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
          
      - name: Build application
        run: npm run build
        
      - name: Run performance tests
        run: |
          cd performance
          npm run test:performance
          
      - name: Generate reports
        run: |
          cd performance
          npm run generate:report
          
      - name: Upload performance reports
        uses: actions/upload-artifact@v4
        with:
          name: performance-reports
          path: performance/consolidated-reports/
```

### Performance Monitoring Integration

#### Datadog/New Relic Integration
```javascript
// Add to load-test.js
import { Datadog } from 'k6/x/datadog';

export function handleSummary(data) {
  // Send metrics to monitoring service
  Datadog.sendMetrics(data.metrics);
  return generateReport(data);
}
```

#### Slack/Teams Notifications
```javascript
// Add to generate-performance-report.js
function sendSlackNotification(summary) {
  if (summary.overallScore < 75) {
    // Send alert for poor performance
    fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 CineAI Performance Alert: Score ${summary.overallScore}/100`
      })
    });
  }
}
```

## 📈 Performance Optimization Workflow

### 1. **Baseline Measurement**
```bash
# Establish performance baseline
npm run test:performance
npm run generate:report
```

### 2. **Identify Bottlenecks**
- Review Lighthouse opportunities
- Analyze K6 response times and error rates
- Check browser performance test failures

### 3. **Implement Optimizations**
- API response caching
- Database query optimization
- Image optimization and CDN
- Code splitting and lazy loading
- Service worker implementation

### 4. **Validate Improvements**
```bash
# Test after optimizations
npm run test:performance
npm run generate:report

# Compare results with baseline
```

### 5. **Monitor Continuously**
- Set up automated daily testing
- Configure performance alerts
- Track performance trends over time

## 🔍 Troubleshooting

### Common Issues

#### K6 Tests Failing
```bash
# Check if application is running
curl http://localhost:3000/api/healthz

# Run with debug output
k6 run --http-debug load-test.js
```

#### Playwright Tests Timing Out
```bash
# Increase timeout
npx playwright test --timeout=120000

# Run in headed mode for debugging
npx playwright test --headed browser-performance.spec.ts
```

#### Lighthouse Audit Errors
```bash
# Check if Chrome is available
google-chrome --version

# Run with debug output
DEBUG=lighthouse:* node lighthouse-audit.js
```

#### Memory Issues During Stress Tests
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Run stress tests with memory monitoring
npx playwright test stress-test.spec.ts --grep "memory"
```

## 🎯 Performance Goals

### Target Metrics
- 🏆 **Overall Performance Score**: > 85/100
- ⚡ **Page Load Time**: < 3 seconds
- 🔄 **API Response Time**: < 1 second (95th percentile)
- 📱 **Mobile Performance**: > 80/100
- ♿ **Accessibility Score**: > 95/100
- 🚨 **Error Rate**: < 1% under normal load

### Optimization Priorities
1. **Critical Path Optimization**: First meaningful paint
2. **API Performance**: Response time and caching
3. **Mobile Experience**: Touch responsiveness and load times
4. **Accessibility**: Screen reader and keyboard navigation
5. **SEO**: Meta tags and structured data

---

## 📚 Additional Resources

- [K6 Load Testing Guide](https://k6.io/docs/)
- [Playwright Performance Testing](https://playwright.dev/docs/test-performance)
- [Lighthouse Performance Audits](https://web.dev/lighthouse-performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Performance Budget Calculator](https://www.performancebudget.io/)

*This performance testing suite ensures CineAI delivers optimal user experience across all devices and conditions.*