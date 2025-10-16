const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:4000'; // algo-backend-new runs on port 4000
const API_TIMEOUT = 10000; // 10 seconds

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.message,
      data: error.response?.data || null
    };
  }
}

// Helper function to log test results
function logTest(testName, result, expectedStatus = 200) {
  testResults.total++;
  
  const isSuccess = result.success && result.status === expectedStatus;
  
  if (isSuccess) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    console.log(`   Status: ${result.status} (expected: ${expectedStatus})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data && result.data.message) {
      console.log(`   Message: ${result.data.message}`);
    }
  }

  testResults.details.push({
    name: testName,
    success: isSuccess,
    status: result.status,
    error: result.error,
    data: result.data
  });
}

// Test data
let authToken = null;
let adminToken = null;
let userId = null;
let strategyId = null;

async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Testing for algo-backend-new...\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  // 1. HEALTH CHECK
  console.log('📋 HEALTH CHECK');
  console.log('─'.repeat(50));
  
  const healthResult = await makeRequest('GET', '/health');
  logTest('Health Check', healthResult);

  const rootResult = await makeRequest('GET', '/');
  logTest('Root Endpoint', rootResult);

  // 2. AUTHENTICATION ENDPOINTS
  console.log('\n🔐 AUTHENTICATION ENDPOINTS');
  console.log('─'.repeat(50));

  // Test user registration
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
  };

  const registerResult = await makeRequest('POST', '/api/auth/register', userData);
  logTest('User Registration', registerResult, 201);

  // Test user login
  const loginData = {
    email: userData.email,
    password: userData.password
  };

  const loginResult = await makeRequest('POST', '/api/auth/login', loginData);
  logTest('User Login', loginResult);
  
  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    userId = loginResult.data.user._id;
  }

  // Test admin registration
  const adminData = {
    username: `admin_${Date.now()}`,
    email: `admin_${Date.now()}@example.com`,
    password: 'AdminPassword123!',
    confirmPassword: 'AdminPassword123!'
  };

  const adminRegisterResult = await makeRequest('POST', '/api/auth/admin-register', adminData);
  logTest('Admin Registration', adminRegisterResult, 201);

  // Test admin login
  const adminLoginData = {
    email: adminData.email,
    password: adminData.password
  };

  const adminLoginResult = await makeRequest('POST', '/api/auth/admin-login', adminLoginData);
  logTest('Admin Login', adminLoginResult);
  
  if (adminLoginResult.success && adminLoginResult.data.token) {
    adminToken = adminLoginResult.data.token;
  }

  // Test get current user (requires auth)
  if (authToken) {
    const meResult = await makeRequest('GET', '/api/auth/auth/me', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Current User', meResult);
  }

  // 3. INSTRUMENTS ENDPOINTS
  console.log('\n📊 INSTRUMENTS ENDPOINTS');
  console.log('─'.repeat(50));

  const popularInstrumentsResult = await makeRequest('GET', '/api/instruments/popular');
  logTest('Get Popular Instruments', popularInstrumentsResult);

  const searchInstrumentsResult = await makeRequest('GET', '/api/instruments/search?q=NIFTY');
  logTest('Search Instruments', searchInstrumentsResult);

  const categoryInstrumentsResult = await makeRequest('GET', '/api/instruments/category/equity');
  logTest('Get Instruments by Category', categoryInstrumentsResult);

  const symbolsCategoryResult = await makeRequest('GET', '/api/instruments/symbols/equity');
  logTest('Get Symbols for Category', symbolsCategoryResult);

  const instrumentStatsResult = await makeRequest('GET', '/api/instruments/stats');
  logTest('Get Instrument Statistics', instrumentStatsResult);

  const multiBrokerResult = await makeRequest('GET', '/api/instruments/multi-broker');
  logTest('Get Multi-Broker Instruments', multiBrokerResult);

  // Test instrument by ID (using a sample ID)
  const instrumentByIdResult = await makeRequest('GET', '/api/instruments/507f1f77bcf86cd799439011');
  logTest('Get Instrument by ID', instrumentByIdResult);

  // Test admin-only endpoints
  if (adminToken) {
    const updateInstrumentsResult = await makeRequest('POST', '/api/instruments/update', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest('Update Instruments (Admin)', updateInstrumentsResult);

    const updateHistoryResult = await makeRequest('GET', '/api/instruments/admin/history', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest('Get Update History (Admin)', updateHistoryResult);
  }

  // 4. STRATEGY ENDPOINTS
  console.log('\n🎯 STRATEGY ENDPOINTS');
  console.log('─'.repeat(50));

  if (authToken) {
    // Test strategy creation
    const strategyData = {
      name: `Test Strategy ${Date.now()}`,
      description: 'Test strategy for API testing',
      type: 'indicator',
      config: {
        instrument: 'NIFTY',
        timeframe: '1m',
        indicators: [
          {
            name: 'SMA',
            period: 20
          }
        ]
      }
    };

    const createStrategyResult = await makeRequest('POST', '/api/strategies', strategyData, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Create Strategy', createStrategyResult, 201);
    
    if (createStrategyResult.success && createStrategyResult.data._id) {
      strategyId = createStrategyResult.data._id;
    }

    // Test get user strategies
    const getStrategiesResult = await makeRequest('GET', '/api/strategies', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get User Strategies', getStrategiesResult);

    // Test get specific strategy
    if (strategyId) {
      const getStrategyResult = await makeRequest('GET', `/api/strategies/${strategyId}`, null, {
        'Authorization': `Bearer ${authToken}`
      });
      logTest('Get Specific Strategy', getStrategyResult);

      // Test strategy performance
      const strategyPerformanceResult = await makeRequest('GET', `/api/strategies/${strategyId}/performance`, null, {
        'Authorization': `Bearer ${authToken}`
      });
      logTest('Get Strategy Performance', getStrategyResult);
    }

    // Test strategy validation
    const validateStrategyResult = await makeRequest('POST', '/api/strategies/validate', strategyData, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Validate Strategy', validateStrategyResult);
  }

  // 5. BACKTESTING ENDPOINTS
  console.log('\n📈 BACKTESTING ENDPOINTS');
  console.log('─'.repeat(50));

  if (authToken) {
    // Test check backtest data
    const checkBacktestDataResult = await makeRequest('GET', '/api/backtest/data/NIFTY', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Check Backtest Data', checkBacktestDataResult);

    // Test fetch backtest data
    const fetchBacktestDataResult = await makeRequest('POST', '/api/backtest/data/NIFTY', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Fetch Backtest Data', fetchBacktestDataResult);

    // Test run backtest (if we have a strategy)
    if (strategyId) {
      const runBacktestResult = await makeRequest('POST', `/api/backtest/${strategyId}`, null, {
        'Authorization': `Bearer ${authToken}`
      });
      logTest('Run Enhanced Backtest', runBacktestResult);

      // Test get backtest results
      const getBacktestResultsResult = await makeRequest('GET', `/api/backtest/results/${strategyId}`, null, {
        'Authorization': `Bearer ${authToken}`
      });
      logTest('Get Backtest Results', getBacktestResultsResult);
    }
  }

  // 6. BROKER ENDPOINTS
  console.log('\n🏦 BROKER ENDPOINTS');
  console.log('─'.repeat(50));

  if (authToken) {
    // Test get available brokers
    const availableBrokersResult = await makeRequest('GET', '/api/brokers/available', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Available Brokers', availableBrokersResult);

    // Test get connected brokers
    const connectedBrokersResult = await makeRequest('GET', '/api/brokers/connected', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Connected Brokers', connectedBrokersResult);

    // Test Angel One endpoints
    const angelConnectResult = await makeRequest('GET', '/api/brokers/angel/connect', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Connect Angel One', angelConnectResult);

    const angelStatusResult = await makeRequest('GET', '/api/brokers/angel/status', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Check Angel One Status', angelStatusResult);

    const angelProfileResult = await makeRequest('GET', '/api/brokers/angel/profile', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Angel One Profile', angelProfileResult);

    // Test Dhan endpoints
    const dhanConnectResult = await makeRequest('GET', '/api/brokers/dhan/connect', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Connect Dhan', dhanConnectResult);

    const dhanStatusResult = await makeRequest('GET', '/api/brokers/dhan/status', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Check Dhan Status', dhanStatusResult);

    const dhanProfileResult = await makeRequest('GET', '/api/brokers/dhan/profile', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Dhan Profile', dhanProfileResult);
  }

  // 7. TRADING ENGINE ENDPOINTS
  console.log('\n⚙️ TRADING ENGINE ENDPOINTS');
  console.log('─'.repeat(50));

  if (authToken) {
    // Test get trading engine status
    const tradingStatusResult = await makeRequest('GET', '/api/trading/status', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Trading Engine Status', tradingStatusResult);

    // Test get user portfolio
    const userPortfolioResult = await makeRequest('GET', '/api/trading/portfolio', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get User Portfolio', userPortfolioResult);

    // Test get user orders
    const userOrdersResult = await makeRequest('GET', '/api/trading/orders', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get User Orders', userOrdersResult);

    // Test get order statistics
    const orderStatsResult = await makeRequest('GET', '/api/trading/orders/statistics', null, {
      'Authorization': `Bearer ${authToken}`
    });
    logTest('Get Order Statistics', orderStatsResult);

    // Test strategy management
    if (strategyId) {
      const addStrategyResult = await makeRequest('POST', `/api/trading/strategies/${strategyId}/add`, null, {
        'Authorization': `Bearer ${authToken}`
      });
      logTest('Add Strategy to Engine', addStrategyResult);

      const strategyPerformanceResult = await makeRequest('GET', `/api/trading/strategies/${strategyId}/performance`, null, {
        'Authorization': `Bearer ${authToken}`
      });
      logTest('Get Strategy Performance (Trading)', strategyPerformanceResult);
    }
  }

  // Test admin-only trading engine endpoints
  if (adminToken) {
    const startTradingResult = await makeRequest('POST', '/api/trading/start', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest('Start Trading Engine (Admin)', startTradingResult);

    const stopTradingResult = await makeRequest('POST', '/api/trading/stop', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest('Stop Trading Engine (Admin)', stopTradingResult);
  }

  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  console.log(`📈 Success Rate: ${successRate}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`   • ${test.name} (Status: ${test.status})`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
        if (test.data && test.data.message) {
          console.log(`     Message: ${test.data.message}`);
        }
      });
  }

  console.log('\n🎉 API Testing Complete!');
  
  // Save detailed results to file
  const fs = require('fs');
  const reportData = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: successRate
    },
    details: testResults.details
  };

  fs.writeFileSync('api-test-results.json', JSON.stringify(reportData, null, 2));
  console.log('📄 Detailed results saved to api-test-results.json');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
