import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, 'reports');
    this.testResultsDir = path.join(__dirname, 'test-results');
    this.outputDir = path.join(__dirname, 'consolidated-reports');
  }

  async generateConsolidatedReport() {
    console.log('📊 Generating consolidated performance report...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {},
      lighthouse: {},
      loadTesting: {},
      browserPerformance: {},
      stressTesting: {},
      recommendations: []
    };

    // Collect Lighthouse data
    try {
      const lighthouseFile = path.join(this.reportsDir, 'lighthouse-results.json');
      if (fs.existsSync(lighthouseFile)) {
        reportData.lighthouse = JSON.parse(fs.readFileSync(lighthouseFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load Lighthouse results:', error.message);
    }

    // Collect K6 load testing data
    try {
      const loadTestFiles = fs.readdirSync(this.reportsDir).filter(f => f.startsWith('performance-results-'));
      for (const file of loadTestFiles) {
        const testType = file.replace('performance-results-', '').replace('.json', '');
        const filePath = path.join(this.reportsDir, file);
        reportData.loadTesting[testType] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load K6 results:', error.message);
    }

    // Collect Playwright test results
    try {
      const playwrightResults = path.join(this.testResultsDir, 'results.json');
      if (fs.existsSync(playwrightResults)) {
        const browserData = JSON.parse(fs.readFileSync(playwrightResults, 'utf8'));
        reportData.browserPerformance = this.processBrowserPerformanceData(browserData);
      }
    } catch (error) {
      console.warn('Could not load browser performance results:', error.message);
    }

    // Generate summary and recommendations
    reportData.summary = this.generateSummary(reportData);
    reportData.recommendations = this.generateRecommendations(reportData);

    // Save consolidated report
    const reportPath = path.join(this.outputDir, 'consolidated-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlPath = path.join(this.outputDir, 'performance-dashboard.html');
    fs.writeFileSync(htmlPath, htmlReport);

    // Generate markdown summary
    const markdownSummary = this.generateMarkdownSummary(reportData);
    const mdPath = path.join(this.outputDir, 'performance-summary.md');
    fs.writeFileSync(mdPath, markdownSummary);

    // Generate console summary
    this.printConsoleSummary(reportData);

    console.log(`📁 Consolidated reports saved to: ${this.outputDir}`);
  }

  processBrowserPerformanceData(browserData) {
    const tests = browserData.suites?.flatMap(suite => suite.specs) || [];
    const performanceTests = tests.filter(test => 
      test.title.toLowerCase().includes('performance') ||
      test.title.toLowerCase().includes('web vitals') ||
      test.title.toLowerCase().includes('load')
    );

    return {
      totalTests: performanceTests.length,
      passedTests: performanceTests.filter(test => test.ok).length,
      failedTests: performanceTests.filter(test => !test.ok).length,
      avgDuration: performanceTests.reduce((sum, test) => sum + (test.results?.[0]?.duration || 0), 0) / performanceTests.length,
      tests: performanceTests.map(test => ({
        title: test.title,
        passed: test.ok,
        duration: test.results?.[0]?.duration || 0,
        error: test.results?.[0]?.error?.message
      }))
    };
  }

  generateSummary(data) {
    const summary = {
      overallScore: 0,
      categories: {},
      keyMetrics: {},
      status: 'unknown'
    };

    // Lighthouse summary
    if (data.lighthouse?.summary) {
      summary.categories.lighthouse = {
        performance: data.lighthouse.summary.averageScores?.performance || 0,
        accessibility: data.lighthouse.summary.averageScores?.accessibility || 0,
        bestPractices: data.lighthouse.summary.averageScores?.bestPractices || 0,
        seo: data.lighthouse.summary.averageScores?.seo || 0
      };
    }

    // Load testing summary
    if (data.loadTesting?.load?.metrics) {
      const loadMetrics = data.loadTesting.load.metrics;
      summary.categories.loadTesting = {
        avgResponseTime: Math.round(loadMetrics.response_time?.values?.avg || 0),
        p95ResponseTime: Math.round(loadMetrics.response_time?.values?.p95 || 0),
        errorRate: ((loadMetrics.errors?.values?.rate || 0) * 100).toFixed(2),
        throughput: (loadMetrics.api_calls?.values?.rate || 0).toFixed(2)
      };
    }

    // Browser performance summary
    if (data.browserPerformance) {
      summary.categories.browserPerformance = {
        testsPassed: data.browserPerformance.passedTests || 0,
        totalTests: data.browserPerformance.totalTests || 0,
        successRate: data.browserPerformance.totalTests > 0 
          ? ((data.browserPerformance.passedTests / data.browserPerformance.totalTests) * 100).toFixed(2)
          : 0,
        avgDuration: Math.round(data.browserPerformance.avgDuration || 0)
      };
    }

    // Calculate overall score
    const scores = [];
    if (summary.categories.lighthouse?.performance) scores.push(summary.categories.lighthouse.performance);
    if (summary.categories.browserPerformance?.successRate) scores.push(Number(summary.categories.browserPerformance.successRate));
    
    summary.overallScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Determine status
    if (summary.overallScore >= 90) summary.status = 'excellent';
    else if (summary.overallScore >= 75) summary.status = 'good';
    else if (summary.overallScore >= 60) summary.status = 'needs-improvement';
    else summary.status = 'poor';

    return summary;
  }

  generateRecommendations(data) {
    const recommendations = [];

    // Lighthouse recommendations
    if (data.lighthouse?.summary?.topOpportunities) {
      data.lighthouse.summary.topOpportunities.slice(0, 5).forEach(opp => {
        recommendations.push({
          category: 'Lighthouse',
          priority: opp.impact?.toLowerCase() || 'medium',
          title: opp.title,
          description: opp.description,
          impact: `${Math.round(opp.savings || 0)}ms potential savings`
        });
      });
    }

    // Load testing recommendations
    if (data.loadTesting?.load?.metrics) {
      const metrics = data.loadTesting.load.metrics;
      const errorRate = metrics.errors?.values?.rate || 0;
      const responseTime = metrics.response_time?.values?.p95 || 0;

      if (errorRate > 0.05) {
        recommendations.push({
          category: 'Load Testing',
          priority: 'high',
          title: 'High Error Rate Detected',
          description: `Error rate of ${(errorRate * 100).toFixed(2)}% exceeds acceptable threshold`,
          impact: 'Implement better error handling and retry mechanisms'
        });
      }

      if (responseTime > 2000) {
        recommendations.push({
          category: 'Load Testing', 
          priority: 'medium',
          title: 'Slow API Response Times',
          description: `95th percentile response time is ${Math.round(responseTime)}ms`,
          impact: 'Consider API caching and database optimization'
        });
      }
    }

    // Browser performance recommendations
    if (data.browserPerformance?.tests) {
      const failedTests = data.browserPerformance.tests.filter(test => !test.passed);
      if (failedTests.length > 0) {
        recommendations.push({
          category: 'Browser Performance',
          priority: 'medium',
          title: 'Browser Performance Test Failures',
          description: `${failedTests.length} performance tests failed`,
          impact: 'Review and optimize client-side performance'
        });
      }
    }

    // General recommendations based on overall score
    const overallScore = data.summary?.overallScore || 0;
    if (overallScore < 75) {
      recommendations.push({
        category: 'General',
        priority: 'high',
        title: 'Overall Performance Needs Improvement',
        description: `Overall performance score is ${overallScore}/100`,
        impact: 'Implement comprehensive performance optimization strategy'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  generateHTMLReport(data) {
    const summary = data.summary;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineAI Performance Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .overall-score { 
            font-size: 4em; 
            font-weight: bold; 
            margin: 20px 0; 
            color: ${this.getScoreColor(summary.overallScore)};
        }
        .status-badge { 
            display: inline-block; 
            padding: 10px 20px; 
            border-radius: 25px; 
            background: ${this.getStatusColor(summary.status)}; 
            color: white; 
            font-weight: bold; 
            text-transform: uppercase; 
        }
        .content { padding: 40px; }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 30px; 
            margin-bottom: 40px; 
        }
        .card { 
            background: #f8f9fa; 
            border-radius: 15px; 
            padding: 30px; 
            border-left: 5px solid #667eea; 
        }
        .card h3 { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 1.4em; 
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 0; 
            border-bottom: 1px solid #e9ecef; 
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #666; font-weight: 500; }
        .metric-value { 
            font-weight: bold; 
            font-size: 1.1em; 
            color: #333; 
        }
        .score-circle { 
            width: 60px; 
            height: 60px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
        }
        .recommendations { 
            background: #fff3cd; 
            border-radius: 15px; 
            padding: 30px; 
            border-left: 5px solid #ffc107; 
        }
        .recommendation { 
            background: white; 
            border-radius: 10px; 
            padding: 20px; 
            margin: 15px 0; 
            border-left: 4px solid #dc3545; 
        }
        .recommendation.medium { border-left-color: #fd7e14; }
        .recommendation.low { border-left-color: #28a745; }
        .recommendation h4 { color: #333; margin-bottom: 10px; }
        .recommendation p { color: #666; margin-bottom: 8px; }
        .recommendation .impact { 
            background: #f8f9fa; 
            padding: 8px 12px; 
            border-radius: 6px; 
            font-size: 0.9em; 
            color: #495057; 
        }
        .timestamp { 
            text-align: center; 
            color: #666; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e9ecef; 
        }
        @media (max-width: 768px) {
            .header { padding: 20px; }
            .header h1 { font-size: 2em; }
            .overall-score { font-size: 3em; }
            .content { padding: 20px; }
            .grid { grid-template-columns: 1fr; gap: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 CineAI Performance Dashboard</h1>
            <p>Comprehensive Performance Analysis Report</p>
            <div class="overall-score">${summary.overallScore}/100</div>
            <div class="status-badge">${summary.status.replace('-', ' ')}</div>
        </div>
        
        <div class="content">
            <div class="grid">
                ${this.generateLighthouseCard(data.lighthouse)}
                ${this.generateLoadTestingCard(data.loadTesting)}
                ${this.generateBrowserPerformanceCard(data.browserPerformance)}
            </div>
            
            <div class="recommendations">
                <h3>🚀 Performance Recommendations</h3>
                ${data.recommendations.map(rec => `
                    <div class="recommendation ${rec.priority}">
                        <h4>[${rec.category}] ${rec.title}</h4>
                        <p>${rec.description}</p>
                        <div class="impact">${rec.impact}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="timestamp">
                Report generated on ${new Date(data.timestamp).toLocaleString()}
            </div>
        </div>
    </div>
</body>
</html>
`;
  }

  generateLighthouseCard(lighthouse) {
    if (!lighthouse?.summary) return '';
    
    const scores = lighthouse.summary.averageScores || {};
    
    return `
        <div class="card">
            <h3>🔍 Lighthouse Audit</h3>
            <div class="metric">
                <span class="metric-label">Performance</span>
                <div class="score-circle" style="background: ${this.getScoreColor(scores.performance)}">${scores.performance || 0}</div>
            </div>
            <div class="metric">
                <span class="metric-label">Accessibility</span>
                <div class="score-circle" style="background: ${this.getScoreColor(scores.accessibility)}">${scores.accessibility || 0}</div>
            </div>
            <div class="metric">
                <span class="metric-label">Best Practices</span>
                <div class="score-circle" style="background: ${this.getScoreColor(scores.bestPractices)}">${scores.bestPractices || 0}</div>
            </div>
            <div class="metric">
                <span class="metric-label">SEO</span>
                <div class="score-circle" style="background: ${this.getScoreColor(scores.seo)}">${scores.seo || 0}</div>
            </div>
        </div>
    `;
  }

  generateLoadTestingCard(loadTesting) {
    if (!loadTesting?.load?.metrics) return '';
    
    const metrics = loadTesting.load.metrics;
    
    return `
        <div class="card">
            <h3>⚡ Load Testing</h3>
            <div class="metric">
                <span class="metric-label">Avg Response Time</span>
                <span class="metric-value">${Math.round(metrics.response_time?.values?.avg || 0)}ms</span>
            </div>
            <div class="metric">
                <span class="metric-label">95th Percentile</span>
                <span class="metric-value">${Math.round(metrics.response_time?.values?.p95 || 0)}ms</span>
            </div>
            <div class="metric">
                <span class="metric-label">Error Rate</span>
                <span class="metric-value">${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">Throughput</span>
                <span class="metric-value">${(metrics.api_calls?.values?.rate || 0).toFixed(2)}/s</span>
            </div>
        </div>
    `;
  }

  generateBrowserPerformanceCard(browserPerf) {
    if (!browserPerf) return '';
    
    return `
        <div class="card">
            <h3>🌐 Browser Performance</h3>
            <div class="metric">
                <span class="metric-label">Tests Passed</span>
                <span class="metric-value">${browserPerf.passedTests || 0}/${browserPerf.totalTests || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Success Rate</span>
                <span class="metric-value">${browserPerf.successRate || 0}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">Avg Duration</span>
                <span class="metric-value">${Math.round(browserPerf.avgDuration || 0)}ms</span>
            </div>
        </div>
    `;
  }

  getScoreColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 50) return '#fd7e14';
    return '#dc3545';
  }

  getStatusColor(status) {
    switch (status) {
      case 'excellent': return '#28a745';
      case 'good': return '#20c997';
      case 'needs-improvement': return '#fd7e14';
      case 'poor': return '#dc3545';
      default: return '#6c757d';
    }
  }

  generateMarkdownSummary(data) {
    const summary = data.summary;
    
    return `# 🎬 CineAI Performance Report

## Overall Score: ${summary.overallScore}/100 (${summary.status.replace('-', ' ').toUpperCase()})

*Generated: ${new Date(data.timestamp).toLocaleString()}*

## 📊 Performance Categories

### 🔍 Lighthouse Audit
${summary.categories.lighthouse ? `
- **Performance**: ${summary.categories.lighthouse.performance}/100
- **Accessibility**: ${summary.categories.lighthouse.accessibility}/100  
- **Best Practices**: ${summary.categories.lighthouse.bestPractices}/100
- **SEO**: ${summary.categories.lighthouse.seo}/100
` : 'No Lighthouse data available'}

### ⚡ Load Testing
${summary.categories.loadTesting ? `
- **Average Response Time**: ${summary.categories.loadTesting.avgResponseTime}ms
- **95th Percentile**: ${summary.categories.loadTesting.p95ResponseTime}ms
- **Error Rate**: ${summary.categories.loadTesting.errorRate}%
- **Throughput**: ${summary.categories.loadTesting.throughput} req/s
` : 'No load testing data available'}

### 🌐 Browser Performance
${summary.categories.browserPerformance ? `
- **Tests Passed**: ${summary.categories.browserPerformance.testsPassed}/${summary.categories.browserPerformance.totalTests}
- **Success Rate**: ${summary.categories.browserPerformance.successRate}%
- **Average Duration**: ${summary.categories.browserPerformance.avgDuration}ms
` : 'No browser performance data available'}

## 🚀 Top Recommendations

${data.recommendations.slice(0, 10).map((rec, index) => `
${index + 1}. **[${rec.category}]** ${rec.title} (${rec.priority.toUpperCase()} priority)
   - ${rec.description}
   - *${rec.impact}*
`).join('')}

## 📈 Performance Status

${this.getStatusEmoji(summary.status)} **${summary.status.replace('-', ' ').toUpperCase()}**

${this.getStatusDescription(summary.status)}

---

*This report was automatically generated by the CineAI Performance Testing Suite*
`;
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'needs-improvement': return '🟠';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  }

  getStatusDescription(status) {
    switch (status) {
      case 'excellent': return 'Performance is outstanding! The application meets all performance targets.';
      case 'good': return 'Performance is good with minor areas for improvement.';
      case 'needs-improvement': return 'Performance needs attention. Several optimization opportunities identified.';
      case 'poor': return 'Performance requires immediate attention. Multiple critical issues detected.';
      default: return 'Performance status could not be determined.';
    }
  }

  printConsoleSummary(data) {
    const summary = data.summary;
    
    console.log('\n🎬 CineAI Performance Report Summary');
    console.log('='.repeat(60));
    console.log(`📊 Overall Score: ${summary.overallScore}/100 (${summary.status.toUpperCase()})`);
    console.log(`📅 Generated: ${new Date(data.timestamp).toLocaleString()}`);
    
    if (summary.categories.lighthouse) {
      console.log('\n🔍 Lighthouse Scores:');
      console.log(`  • Performance: ${summary.categories.lighthouse.performance}/100`);
      console.log(`  • Accessibility: ${summary.categories.lighthouse.accessibility}/100`);
      console.log(`  • Best Practices: ${summary.categories.lighthouse.bestPractices}/100`);
      console.log(`  • SEO: ${summary.categories.lighthouse.seo}/100`);
    }
    
    if (summary.categories.loadTesting) {
      console.log('\n⚡ Load Testing:');
      console.log(`  • Avg Response: ${summary.categories.loadTesting.avgResponseTime}ms`);
      console.log(`  • P95 Response: ${summary.categories.loadTesting.p95ResponseTime}ms`);
      console.log(`  • Error Rate: ${summary.categories.loadTesting.errorRate}%`);
      console.log(`  • Throughput: ${summary.categories.loadTesting.throughput} req/s`);
    }
    
    if (summary.categories.browserPerformance) {
      console.log('\n🌐 Browser Performance:');
      console.log(`  • Success Rate: ${summary.categories.browserPerformance.successRate}%`);
      console.log(`  • Tests Passed: ${summary.categories.browserPerformance.testsPassed}/${summary.categories.browserPerformance.totalTests}`);
    }
    
    console.log(`\n🚀 Top ${Math.min(5, data.recommendations.length)} Recommendations:`);
    data.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.category}] ${rec.title} (${rec.priority.toUpperCase()})`);
    });
    
    console.log('\n📁 Detailed reports available in: ./consolidated-reports/');
  }
}

// Run report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new PerformanceReportGenerator();
  generator.generateConsolidatedReport().catch(console.error);
}

export { PerformanceReportGenerator };