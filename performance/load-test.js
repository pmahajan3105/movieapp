import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - Basic functionality check
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // Load test - Normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Ramp up
        { duration: '5m', target: 10 },  // Steady state
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
    },
    
    // Stress test - Above normal load
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up to stress level
        { duration: '5m', target: 20 },  // Maintain stress
        { duration: '3m', target: 50 },  // Peak stress
        { duration: '2m', target: 20 },  // Scale back
        { duration: '3m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike test - Sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },  // Normal load
        { duration: '30s', target: 100 }, // Sudden spike
        { duration: '1m', target: 10 },  // Back to normal
        { duration: '30s', target: 0 },  // Ramp down
      ],
      tags: { test_type: 'spike' },
    },
    
    // Soak test - Extended duration at normal load
    soak_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30m',
      tags: { test_type: 'soak' },
    },
  },
  
  thresholds: {
    // API response time thresholds
    'response_time': ['p(95)<2000'], // 95% of requests under 2s
    'response_time{test_type:load}': ['p(95)<1500'], // Load test: 95% under 1.5s
    'response_time{test_type:stress}': ['p(95)<3000'], // Stress test: 95% under 3s
    
    // Error rate thresholds
    'errors': ['rate<0.1'], // Error rate under 10%
    'errors{test_type:load}': ['rate<0.05'], // Load test: under 5%
    'errors{test_type:smoke}': ['rate<0.01'], // Smoke test: under 1%
    
    // HTTP request duration
    'http_req_duration': ['p(99)<5000'], // 99% of requests under 5s
    'http_req_duration{status:200}': ['p(95)<2000'], // Success requests under 2s
    
    // HTTP request failure rate
    'http_req_failed': ['rate<0.1'], // Less than 10% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const TEST_USERS = [
  { email: 'load-test-1@cineai.com', token: 'mock-token-1' },
  { email: 'load-test-2@cineai.com', token: 'mock-token-2' },
  { email: 'load-test-3@cineai.com', token: 'mock-token-3' },
];

const SEARCH_QUERIES = [
  'action movies',
  'comedy films',
  'sci-fi',
  'horror',
  'drama',
  'thriller',
  'animation',
  'documentary'
];

const MOVIE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export function setup() {
  console.log('🚀 Starting CineAI Performance Tests');
  console.log(`📍 Target URL: ${BASE_URL}`);
  console.log('⚡ Test scenarios: smoke, load, stress, spike, soak');
  
  // Health check
  const healthCheck = http.get(`${BASE_URL}/api/healthz`);
  if (healthCheck.status !== 200) {
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }
  
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  const headers = {
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  };
  
  // Test scenario distribution
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Movie browsing and recommendations
    testMovieBrowsing(data.baseUrl, headers);
  } else if (scenario < 0.5) {
    // 20% - Search functionality
    testSearchFunctionality(data.baseUrl, headers);
  } else if (scenario < 0.7) {
    // 20% - Watchlist operations
    testWatchlistOperations(data.baseUrl, headers);
  } else if (scenario < 0.85) {
    // 15% - AI chat interactions
    testAIInteractions(data.baseUrl, headers);
  } else {
    // 15% - User profile and preferences
    testUserProfile(data.baseUrl, headers);
  }
  
  sleep(1); // Think time between requests
}

function testMovieBrowsing(baseUrl, headers) {
  const group = 'Movie Browsing';
  
  // Get movie recommendations
  let response = http.get(`${baseUrl}/api/movies?limit=12&smart=true`, { headers });
  
  const success = check(response, {
    [`${group}: Movies API responds`]: (r) => r.status === 200,
    [`${group}: Response has data`]: (r) => r.json('data') !== null,
    [`${group}: Response time OK`]: (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  apiCalls.add(1);
  
  if (success && response.json('data')) {
    const movies = response.json('data');
    if (movies.length > 0) {
      // Get details for a random movie
      const randomMovie = movies[Math.floor(Math.random() * movies.length)];
      
      response = http.get(`${baseUrl}/api/movies/${randomMovie.id}`, { headers });
      
      check(response, {
        [`${group}: Movie details API responds`]: (r) => r.status === 200,
        [`${group}: Movie details response time OK`]: (r) => r.timings.duration < 2000,
      });
      
      apiCalls.add(1);
    }
  }
  
  sleep(0.5);
}

function testSearchFunctionality(baseUrl, headers) {
  const group = 'Search';
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  
  // Search for movies
  let response = http.get(`${baseUrl}/api/movies/search?query=${encodeURIComponent(query)}&limit=10`, { headers });
  
  const success = check(response, {
    [`${group}: Search API responds`]: (r) => r.status === 200,
    [`${group}: Search returns results`]: (r) => r.json('data') !== null,
    [`${group}: Search response time OK`]: (r) => r.timings.duration < 2500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  apiCalls.add(1);
  
  // Test autocomplete
  response = http.get(`${baseUrl}/api/movies/autocomplete?q=${query.substring(0, 3)}`, { headers });
  
  check(response, {
    [`${group}: Autocomplete responds`]: (r) => r.status === 200,
    [`${group}: Autocomplete fast`]: (r) => r.timings.duration < 1000,
  });
  
  apiCalls.add(1);
  sleep(0.3);
}

function testWatchlistOperations(baseUrl, headers) {
  const group = 'Watchlist';
  const movieId = MOVIE_IDS[Math.floor(Math.random() * MOVIE_IDS.length)];
  
  // Get current watchlist
  let response = http.get(`${baseUrl}/api/watchlist`, { headers });
  
  let success = check(response, {
    [`${group}: Get watchlist responds`]: (r) => r.status === 200,
    [`${group}: Watchlist response time OK`]: (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  apiCalls.add(1);
  
  // Add movie to watchlist
  const addPayload = JSON.stringify({ movieId });
  response = http.post(`${baseUrl}/api/watchlist`, addPayload, { headers });
  
  success = check(response, {
    [`${group}: Add to watchlist responds`]: (r) => r.status === 200 || r.status === 201,
    [`${group}: Add operation fast`]: (r) => r.timings.duration < 1500,
  });
  
  errorRate.add(!success);
  apiCalls.add(1);
  
  sleep(0.2);
  
  // Remove from watchlist (50% chance)
  if (Math.random() < 0.5) {
    response = http.del(`${baseUrl}/api/watchlist/${movieId}`, null, { headers });
    
    check(response, {
      [`${group}: Remove from watchlist responds`]: (r) => r.status === 200 || r.status === 204,
      [`${group}: Remove operation fast`]: (r) => r.timings.duration < 1500,
    });
    
    apiCalls.add(1);
  }
  
  sleep(0.3);
}

function testAIInteractions(baseUrl, headers) {
  const group = 'AI Chat';
  const messages = [
    'Recommend me some action movies',
    'What about comedy films from the 90s?',
    'I want to watch something scary tonight',
    'Show me movies similar to Inception',
    'What are some good documentaries?'
  ];
  
  const message = messages[Math.floor(Math.random() * messages.length)];
  const payload = JSON.stringify({ message, userId: 'load-test-user' });
  
  const response = http.post(`${baseUrl}/api/ai/chat`, payload, { headers });
  
  const success = check(response, {
    [`${group}: AI chat responds`]: (r) => r.status === 200,
    [`${group}: AI response has content`]: (r) => r.json('response') !== null,
    [`${group}: AI response time acceptable`]: (r) => r.timings.duration < 8000, // AI can be slower
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  apiCalls.add(1);
  
  sleep(1); // AI interactions have longer think time
}

function testUserProfile(baseUrl, headers) {
  const group = 'User Profile';
  
  // Get user profile
  let response = http.get(`${baseUrl}/api/user/profile`, { headers });
  
  let success = check(response, {
    [`${group}: Get profile responds`]: (r) => r.status === 200,
    [`${group}: Profile response time OK`]: (r) => r.timings.duration < 1500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  apiCalls.add(1);
  
  // Update preferences (30% chance)
  if (Math.random() < 0.3) {
    const preferences = {
      genres: ['Action', 'Sci-Fi', 'Comedy'],
      dislikedGenres: ['Horror'],
      preferredDecade: '2010s'
    };
    
    response = http.put(`${baseUrl}/api/user/preferences`, JSON.stringify(preferences), { headers });
    
    success = check(response, {
      [`${group}: Update preferences responds`]: (r) => r.status === 200,
      [`${group}: Update preferences fast`]: (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!success);
    apiCalls.add(1);
  }
  
  sleep(0.5);
}

export function teardown(data) {
  console.log('🏁 Performance tests completed');
  console.log('📊 Check the detailed results for performance metrics');
}

// Handle different test types
export function handleSummary(data) {
  const testType = __ENV.TEST_TYPE || 'load';
  
  return {
    [`performance-results-${testType}.json`]: JSON.stringify(data, null, 2),
    [`performance-results-${testType}.html`]: generateHTMLReport(data, testType),
    stdout: generateConsoleReport(data, testType),
  };
}

function generateConsoleReport(data, testType) {
  const results = data.metrics;
  
  return `
🎬 CineAI Performance Test Results (${testType.toUpperCase()})
${'='.repeat(60)}

📊 Key Metrics:
  • API Calls Total: ${results.api_calls?.values?.count || 0}
  • Average Response Time: ${Math.round(results.response_time?.values?.avg || 0)}ms
  • 95th Percentile Response Time: ${Math.round(results.response_time?.values?.p95 || 0)}ms
  • Error Rate: ${((results.errors?.values?.rate || 0) * 100).toFixed(2)}%
  
🌐 HTTP Metrics:
  • Request Duration (avg): ${Math.round(results.http_req_duration?.values?.avg || 0)}ms
  • Request Duration (p95): ${Math.round(results.http_req_duration?.values?.p95 || 0)}ms
  • Request Failure Rate: ${((results.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
  
⚡ Performance Status:
  ${getPerformanceStatus(results)}
  
📈 Recommendations:
  ${getRecommendations(results, testType)}
`;
}

function generateHTMLReport(data, testType) {
  const results = data.metrics;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>CineAI Performance Test Results - ${testType.toUpperCase()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { background: white; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .good { border-left: 4px solid #28a745; }
        .warning { border-left: 4px solid #ffc107; }
        .danger { border-left: 4px solid #dc3545; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 CineAI Performance Test Results</h1>
        <h2>Test Type: ${testType.toUpperCase()}</h2>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    <div class="grid">
        <div class="metric ${getMetricClass(results.response_time?.values?.p95, 2000)}">
            <h3>📊 Response Time</h3>
            <p>Average: ${Math.round(results.response_time?.values?.avg || 0)}ms</p>
            <p>95th Percentile: ${Math.round(results.response_time?.values?.p95 || 0)}ms</p>
        </div>
        
        <div class="metric ${getMetricClass(results.errors?.values?.rate, 0.1, true)}">
            <h3>🚨 Error Rate</h3>
            <p>Rate: ${((results.errors?.values?.rate || 0) * 100).toFixed(2)}%</p>
            <p>Count: ${results.errors?.values?.count || 0}</p>
        </div>
        
        <div class="metric good">
            <h3>📈 Throughput</h3>
            <p>Total API Calls: ${results.api_calls?.values?.count || 0}</p>
            <p>Rate: ${(results.api_calls?.values?.rate || 0).toFixed(2)}/s</p>
        </div>
        
        <div class="metric ${getMetricClass(results.http_req_duration?.values?.p95, 3000)}">
            <h3>🌐 HTTP Performance</h3>
            <p>Avg Duration: ${Math.round(results.http_req_duration?.values?.avg || 0)}ms</p>
            <p>P95 Duration: ${Math.round(results.http_req_duration?.values?.p95 || 0)}ms</p>
        </div>
    </div>
</body>
</html>
`;
}

function getMetricClass(value, threshold, isRate = false) {
  if (!value) return 'good';
  
  const checkValue = isRate ? value : value;
  const limit = isRate ? threshold : threshold;
  
  if (isRate) {
    if (checkValue < limit * 0.5) return 'good';
    if (checkValue < limit) return 'warning';
    return 'danger';
  } else {
    if (checkValue < limit * 0.7) return 'good';
    if (checkValue < limit) return 'warning';
    return 'danger';
  }
}

function getPerformanceStatus(results) {
  const responseTime = results.response_time?.values?.p95 || 0;
  const errorRate = results.errors?.values?.rate || 0;
  
  if (responseTime < 1500 && errorRate < 0.02) {
    return '✅ EXCELLENT - System performing optimally';
  } else if (responseTime < 2500 && errorRate < 0.05) {
    return '✅ GOOD - System performing within acceptable limits';
  } else if (responseTime < 4000 && errorRate < 0.1) {
    return '⚠️ ACCEPTABLE - Some performance concerns';
  } else {
    return '❌ POOR - Performance optimization needed';
  }
}

function getRecommendations(results, testType) {
  const recommendations = [];
  const responseTime = results.response_time?.values?.p95 || 0;
  const errorRate = results.errors?.values?.rate || 0;
  
  if (responseTime > 2000) {
    recommendations.push('• Consider API response caching');
    recommendations.push('• Optimize database queries');
    recommendations.push('• Implement CDN for static assets');
  }
  
  if (errorRate > 0.05) {
    recommendations.push('• Review error handling logic');
    recommendations.push('• Implement better retry mechanisms');
    recommendations.push('• Monitor database connection pooling');
  }
  
  if (testType === 'stress' && responseTime > 3000) {
    recommendations.push('• Consider horizontal scaling');
    recommendations.push('• Implement rate limiting');
    recommendations.push('• Add more robust error recovery');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('• System performing well - maintain current optimization');
  }
  
  return recommendations.join('\n  ');
}