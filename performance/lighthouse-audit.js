import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs';
import path from 'path';

// Configuration for different test scenarios
const TEST_CONFIGS = {
  desktop: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false
      },
      emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  },
  
  mobile: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1638.4,
        uploadThroughputKbps: 750
      },
      screenEmulation: {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2.625,
        disabled: false
      }
    }
  },
  
  slow3g: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 300,
        throughputKbps: 400,
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 300,
        downloadThroughputKbps: 400,
        uploadThroughputKbps: 200
      }
    }
  }
};

// Pages to audit
const PAGES_TO_AUDIT = [
  { name: 'Homepage', url: '/', auth: false },
  { name: 'Login', url: '/auth/login', auth: false },
  { name: 'Dashboard', url: '/dashboard', auth: true },
  { name: 'Movies', url: '/dashboard/movies', auth: true },
  { name: 'Search', url: '/search', auth: true },
  { name: 'Watchlist', url: '/dashboard/watchlist', auth: true }
];

// Performance thresholds
const THRESHOLDS = {
  performance: 85,
  accessibility: 95,
  bestPractices: 90,
  seo: 85,
  // Core Web Vitals
  lcp: 2500,      // Largest Contentful Paint
  fid: 100,       // First Input Delay
  cls: 0.1,       // Cumulative Layout Shift
  fcp: 1800,      // First Contentful Paint
  si: 3000,       // Speed Index
  tti: 5000       // Time to Interactive
};

class CineAILighthouseAuditor {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {};
    this.chrome = null;
  }

  async runAudits() {
    console.log('🎬 Starting CineAI Lighthouse Performance Audits');
    console.log(`📍 Base URL: ${this.baseUrl}`);
    
    try {
      // Launch Chrome
      this.chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
      });

      // Run audits for each configuration
      for (const [configName, config] of Object.entries(TEST_CONFIGS)) {
        console.log(`\n🔍 Running ${configName.toUpperCase()} audits...`);
        this.results[configName] = {};

        for (const page of PAGES_TO_AUDIT) {
          console.log(`  📄 Auditing ${page.name}...`);
          
          try {
            const url = `${this.baseUrl}${page.url}`;
            const options = {
              logLevel: 'error',
              output: 'json',
              onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
              port: this.chrome.port,
              ...config
            };

            // Add authentication if needed
            if (page.auth) {
              options.extraHeaders = {
                'Authorization': 'Bearer mock-token-for-lighthouse'
              };
            }

            const runnerResult = await lighthouse(url, options);
            this.results[configName][page.name] = this.processResults(runnerResult.lhr);
            
          } catch (error) {
            console.error(`    ❌ Error auditing ${page.name}: ${error.message}`);
            this.results[configName][page.name] = { error: error.message };
          }
        }
      }

      await this.generateReports();
      await this.validateThresholds();

    } finally {
      if (this.chrome) {
        await this.chrome.kill();
      }
    }
  }

  processResults(lhr) {
    const categories = lhr.categories;
    const audits = lhr.audits;
    
    return {
      // Lighthouse scores (0-100)
      scores: {
        performance: Math.round(categories.performance.score * 100),
        accessibility: Math.round(categories.accessibility.score * 100),
        bestPractices: Math.round(categories['best-practices'].score * 100),
        seo: Math.round(categories.seo.score * 100)
      },
      
      // Core Web Vitals
      webVitals: {
        lcp: audits['largest-contentful-paint']?.numericValue || 0,
        fid: audits['max-potential-fid']?.numericValue || 0,
        cls: audits['cumulative-layout-shift']?.numericValue || 0,
        fcp: audits['first-contentful-paint']?.numericValue || 0,
        si: audits['speed-index']?.numericValue || 0,
        tti: audits['interactive']?.numericValue || 0
      },
      
      // Resource metrics
      resources: {
        totalByteWeight: audits['total-byte-weight']?.numericValue || 0,
        unusedCssRules: audits['unused-css-rules']?.details?.items?.length || 0,
        unusedJavaScript: audits['unused-javascript']?.numericValue || 0,
        imageOptimization: audits['uses-optimized-images']?.score || 1,
        textCompression: audits['uses-text-compression']?.score || 1
      },
      
      // Accessibility metrics
      accessibility: {
        colorContrast: audits['color-contrast']?.score || 1,
        altText: audits['image-alt']?.score || 1,
        ariaLabels: audits['aria-labels']?.score || 1,
        headingOrder: audits['heading-order']?.score || 1,
        focusableControls: audits['focusable-controls']?.score || 1
      },
      
      // SEO metrics
      seo: {
        metaDescription: audits['meta-description']?.score || 1,
        titleElement: audits['document-title']?.score || 1,
        viewport: audits['viewport']?.score || 1,
        robotsTxt: audits['robots-txt']?.score || 1
      },
      
      // Performance opportunities
      opportunities: this.extractOpportunities(audits),
      
      // Overall assessment
      timestamp: new Date().toISOString(),
      url: lhr.finalUrl
    };
  }

  extractOpportunities(audits) {
    const opportunities = [];
    
    const opportunityAudits = [
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'uses-webp-images',
      'efficient-animated-content',
      'offscreen-images',
      'render-blocking-resources',
      'unminified-css',
      'unminified-javascript',
      'uses-text-compression',
      'uses-responsive-images',
      'dom-size'
    ];
    
    opportunityAudits.forEach(auditId => {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        opportunities.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          savings: audit.numericValue || 0,
          impact: this.getImpactLevel(audit.score)
        });
      }
    });
    
    return opportunities.sort((a, b) => b.savings - a.savings);
  }

  getImpactLevel(score) {
    if (score < 0.5) return 'High';
    if (score < 0.8) return 'Medium';
    return 'Low';
  }

  async generateReports() {
    console.log('\n📊 Generating performance reports...');
    
    // Create reports directory
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      thresholds: THRESHOLDS,
      results: this.results,
      summary: this.generateSummary()
    };
    
    fs.writeFileSync(
      path.join(reportsDir, 'lighthouse-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(jsonReport);
    fs.writeFileSync(
      path.join(reportsDir, 'lighthouse-report.html'),
      htmlReport
    );
    
    // Generate console summary
    this.generateConsoleSummary();
    
    console.log(`📁 Reports saved to: ${reportsDir}`);
  }

  generateSummary() {
    const summary = {
      totalPages: 0,
      totalConfigs: Object.keys(this.results).length,
      averageScores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
      failedThresholds: [],
      topOpportunities: []
    };
    
    let totalScores = { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
    let pageCount = 0;
    
    // Calculate averages and collect opportunities
    Object.values(this.results).forEach(configResults => {
      Object.values(configResults).forEach(pageResult => {
        if (!pageResult.error) {
          pageCount++;
          totalScores.performance += pageResult.scores.performance;
          totalScores.accessibility += pageResult.scores.accessibility;
          totalScores.bestPractices += pageResult.scores.bestPractices;
          totalScores.seo += pageResult.scores.seo;
          
          // Collect opportunities
          pageResult.opportunities.forEach(opp => {
            if (opp.impact === 'High') {
              summary.topOpportunities.push(opp);
            }
          });
        }
      });
    });
    
    if (pageCount > 0) {
      summary.averageScores = {
        performance: Math.round(totalScores.performance / pageCount),
        accessibility: Math.round(totalScores.accessibility / pageCount),
        bestPractices: Math.round(totalScores.bestPractices / pageCount),
        seo: Math.round(totalScores.seo / pageCount)
      };
    }
    
    summary.totalPages = pageCount;
    
    // Deduplicate opportunities
    summary.topOpportunities = summary.topOpportunities
      .filter((opp, index, self) => index === self.findIndex(o => o.id === opp.id))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10);
    
    return summary;
  }

  generateHTMLReport(data) {
    const summary = data.summary;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CineAI Lighthouse Performance Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .score { font-size: 2em; font-weight: bold; text-align: center; padding: 10px; border-radius: 50px; margin: 10px 0; }
        .score.good { background: #4CAF50; color: white; }
        .score.needs-improvement { background: #FF9800; color: white; }
        .score.poor { background: #F44336; color: white; }
        .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .opportunity { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .opportunity.high { border-left-color: #dc3545; background: #f8d7da; }
        .opportunity.medium { border-left-color: #fd7e14; background: #fff3cd; }
        .opportunity.low { border-left-color: #28a745; background: #d1ecf1; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .config-section { margin: 30px 0; }
        .page-results { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 CineAI Lighthouse Performance Report</h1>
            <p>Comprehensive performance analysis across multiple devices and conditions</p>
            <p><strong>Generated:</strong> ${data.timestamp}</p>
            <p><strong>Base URL:</strong> ${data.baseUrl}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 Overall Scores</h3>
                <div class="score ${this.getScoreClass(summary.averageScores.performance)}">${summary.averageScores.performance}</div>
                <div class="metric"><span>Performance</span><span>${summary.averageScores.performance}/100</span></div>
                <div class="metric"><span>Accessibility</span><span>${summary.averageScores.accessibility}/100</span></div>
                <div class="metric"><span>Best Practices</span><span>${summary.averageScores.bestPractices}/100</span></div>
                <div class="metric"><span>SEO</span><span>${summary.averageScores.seo}/100</span></div>
            </div>

            <div class="card">
                <h3>📈 Test Coverage</h3>
                <div class="metric"><span>Total Pages Tested</span><span>${summary.totalPages}</span></div>
                <div class="metric"><span>Device Configurations</span><span>${summary.totalConfigs}</span></div>
                <div class="metric"><span>Test Scenarios</span><span>Desktop, Mobile, Slow 3G</span></div>
            </div>

            <div class="card">
                <h3>🎯 Core Web Vitals</h3>
                ${this.generateWebVitalsHTML(data.results)}
            </div>
        </div>

        <div class="card">
            <h3>🚀 Top Performance Opportunities</h3>
            ${summary.topOpportunities.map(opp => `
                <div class="opportunity ${opp.impact.toLowerCase()}">
                    <h4>${opp.title}</h4>
                    <p>${opp.description}</p>
                    <div class="metric">
                        <span>Impact: ${opp.impact}</span>
                        <span>Potential Savings: ${Math.round(opp.savings)}ms</span>
                    </div>
                </div>
            `).join('')}
        </div>

        ${Object.entries(data.results).map(([config, configResults]) => `
            <div class="config-section">
                <div class="card">
                    <h2>📱 ${config.toUpperCase()} Results</h2>
                    ${Object.entries(configResults).map(([page, result]) => 
                        result.error ? 
                            `<div class="page-results">
                                <h4>❌ ${page}: ${result.error}</h4>
                            </div>` :
                            `<div class="page-results">
                                <h4>📄 ${page}</h4>
                                <table>
                                    <tr>
                                        <th>Category</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                    </tr>
                                    <tr>
                                        <td>Performance</td>
                                        <td>${result.scores.performance}</td>
                                        <td class="score ${this.getScoreClass(result.scores.performance)}">${this.getScoreStatus(result.scores.performance)}</td>
                                    </tr>
                                    <tr>
                                        <td>Accessibility</td>
                                        <td>${result.scores.accessibility}</td>
                                        <td class="score ${this.getScoreClass(result.scores.accessibility)}">${this.getScoreStatus(result.scores.accessibility)}</td>
                                    </tr>
                                    <tr>
                                        <td>Best Practices</td>
                                        <td>${result.scores.bestPractices}</td>
                                        <td class="score ${this.getScoreClass(result.scores.bestPractices)}">${this.getScoreStatus(result.scores.bestPractices)}</td>
                                    </tr>
                                    <tr>
                                        <td>SEO</td>
                                        <td>${result.scores.seo}</td>
                                        <td class="score ${this.getScoreClass(result.scores.seo)}">${this.getScoreStatus(result.scores.seo)}</td>
                                    </tr>
                                </table>
                            </div>`
                    ).join('')}
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>
`;
  }

  generateWebVitalsHTML(results) {
    // Calculate average web vitals across all results
    let totalVitals = { lcp: 0, fid: 0, cls: 0, fcp: 0, si: 0, tti: 0 };
    let count = 0;
    
    Object.values(results).forEach(configResults => {
      Object.values(configResults).forEach(pageResult => {
        if (!pageResult.error) {
          count++;
          Object.keys(totalVitals).forEach(vital => {
            totalVitals[vital] += pageResult.webVitals[vital] || 0;
          });
        }
      });
    });
    
    if (count > 0) {
      Object.keys(totalVitals).forEach(vital => {
        totalVitals[vital] = Math.round(totalVitals[vital] / count);
      });
    }
    
    return `
      <div class="metric"><span>LCP (Largest Contentful Paint)</span><span>${totalVitals.lcp}ms</span></div>
      <div class="metric"><span>FID (First Input Delay)</span><span>${totalVitals.fid}ms</span></div>
      <div class="metric"><span>CLS (Cumulative Layout Shift)</span><span>${(totalVitals.cls / 1000).toFixed(3)}</span></div>
      <div class="metric"><span>FCP (First Contentful Paint)</span><span>${totalVitals.fcp}ms</span></div>
      <div class="metric"><span>SI (Speed Index)</span><span>${totalVitals.si}ms</span></div>
      <div class="metric"><span>TTI (Time to Interactive)</span><span>${totalVitals.tti}ms</span></div>
    `;
  }

  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  getScoreStatus(score) {
    if (score >= 90) return '✅ Good';
    if (score >= 50) return '⚠️ Needs Improvement';
    return '❌ Poor';
  }

  generateConsoleSummary() {
    const summary = this.generateSummary();
    
    console.log('\n🎬 CineAI Lighthouse Performance Summary');
    console.log('='.repeat(60));
    console.log(`📊 Average Scores:`);
    console.log(`  • Performance: ${summary.averageScores.performance}/100`);
    console.log(`  • Accessibility: ${summary.averageScores.accessibility}/100`);
    console.log(`  • Best Practices: ${summary.averageScores.bestPractices}/100`);
    console.log(`  • SEO: ${summary.averageScores.seo}/100`);
    console.log(`\n📈 Test Coverage:`);
    console.log(`  • Pages Tested: ${summary.totalPages}`);
    console.log(`  • Configurations: ${summary.totalConfigs}`);
    console.log(`\n🚀 Top Opportunities:`);
    summary.topOpportunities.slice(0, 5).forEach(opp => {
      console.log(`  • ${opp.title} (${opp.impact} impact)`);
    });
  }

  async validateThresholds() {
    console.log('\n🎯 Validating Performance Thresholds...');
    
    const failures = [];
    const summary = this.generateSummary();
    
    // Check score thresholds
    if (summary.averageScores.performance < THRESHOLDS.performance) {
      failures.push(`Performance score ${summary.averageScores.performance} below threshold ${THRESHOLDS.performance}`);
    }
    
    if (summary.averageScores.accessibility < THRESHOLDS.accessibility) {
      failures.push(`Accessibility score ${summary.averageScores.accessibility} below threshold ${THRESHOLDS.accessibility}`);
    }
    
    if (summary.averageScores.bestPractices < THRESHOLDS.bestPractices) {
      failures.push(`Best Practices score ${summary.averageScores.bestPractices} below threshold ${THRESHOLDS.bestPractices}`);
    }
    
    if (summary.averageScores.seo < THRESHOLDS.seo) {
      failures.push(`SEO score ${summary.averageScores.seo} below threshold ${THRESHOLDS.seo}`);
    }
    
    if (failures.length > 0) {
      console.log('❌ Threshold Failures:');
      failures.forEach(failure => console.log(`  • ${failure}`));
      process.exit(1);
    } else {
      console.log('✅ All performance thresholds passed!');
    }
  }
}

// Run the audits
async function runLighthouseAudits() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const auditor = new CineAILighthouseAuditor(baseUrl);
  
  try {
    await auditor.runAudits();
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { CineAILighthouseAuditor, runLighthouseAudits };

// Run if called directly
if (require.main === module) {
  runLighthouseAudits();
}