const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

console.log('🔧 Complete Trading System Test Suite');
console.log('   DHAN_SANDBOX_URL:', process.env.DHAN_SANDBOX_URL || '❌ Not set');
console.log('   DHAN_SANDBOX_TOKEN:', process.env.DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
console.log('   DHAN_SANDBOX_CLIENT_ID:', process.env.DHAN_SANDBOX_CLIENT_ID || '❌ Not set');

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    return null;
  }
}

async function registerUser() {
  console.log('\n🔐 Registering new user for trading system test...');
  
  const userData = {
    username: `trading_test_${Date.now()}`,
    email: `trading_test_${Date.now()}@test.com`,
    password: 'test123456'
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, userData);
    
    if (response.data.success) {
      console.log('✅ User registered successfully');
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
  }
  
  return null;
}

async function connectToDhan(token) {
  console.log('\n🏦 Connecting to Dhan sandbox...');
  
  const result = await makeRequest('GET', '/brokers/dhan/connect', null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Connected to Dhan sandbox successfully');
    return true;
  } else {
    console.log('❌ Dhan connection failed');
    return false;
  }
}

async function testTradingEngineStatus(token) {
  console.log('\n📊 Testing Trading Engine Status...');
  
  const result = await makeRequest('GET', '/trading/status', null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Trading engine status retrieved successfully');
    console.log('📊 Engine Status:', result.data);
    return true;
  } else {
    console.log('❌ Failed to get trading engine status');
    return false;
  }
}

async function createTestStrategy(token) {
  console.log('\n📋 Creating Test Strategy...');
  
  const strategyData = {
    name: 'Test Time-Based Strategy',
    type: 'time_based',
    instrument: '11536', // TCS
    order_type: 'INTRADAY',
    start_time: '09:15',
    square_off_time: '15:15',
    trading_days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    order_legs: [
      {
        action: 'BUY',
        quantity: 1,
        instrument_type: 'EQ',
        expiry: 'Weekly',
        strike_price_reference: 'ATM pt',
        strike_price_selection: 'ATM',
        stop_loss_percentage: 0,
        stop_loss_value: 0,
        stop_loss_type: 'On Price',
        take_profit_percentage: 0,
        take_profit_value: 0,
        take_profit_type: 'On Price'
      }
    ],
    risk_management: {
      target_on_each_script: 0,
      stop_loss_on_each_script: 0,
      target_sl_type: 'Percentage(%)',
      exit_when_overall_profit_amount: null,
      exit_when_overall_loss_amount: null,
      max_trade_cycle: 1,
      no_trade_after_time: '15:15',
      profit_trailing: {
        type: 'No Trailing',
        profit_reaches: null,
        lock_profit_at: null,
        on_every_increase_of: null,
        trail_profit_by: null
      }
    },
    broker: 'dhan',
    status: 'draft'
  };
  
  const result = await makeRequest('POST', '/strategies', strategyData, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Test strategy created successfully');
    console.log('📊 Strategy ID:', result.data._id);
    return result.data._id;
  } else {
    console.log('❌ Failed to create test strategy');
    return null;
  }
}

async function addStrategyToEngine(token, strategyId) {
  console.log('\n🚀 Adding Strategy to Trading Engine...');
  
  const result = await makeRequest('POST', `/trading/strategies/${strategyId}/add`, null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Strategy added to trading engine successfully');
    return true;
  } else {
    console.log('❌ Failed to add strategy to trading engine');
    return false;
  }
}

async function executeStrategy(token, strategyId) {
  console.log('\n⚡ Executing Strategy Manually...');
  
  const result = await makeRequest('POST', `/trading/strategies/${strategyId}/execute`, null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Strategy executed successfully');
    console.log('📊 Execution Result:', result.data);
    return true;
  } else {
    console.log('❌ Failed to execute strategy');
    return false;
  }
}

async function getUserPortfolio(token) {
  console.log('\n💼 Getting User Portfolio...');
  
  const result = await makeRequest('GET', '/trading/portfolio', null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Portfolio retrieved successfully');
    console.log('📊 Portfolio Data:', result.data);
    return true;
  } else {
    console.log('❌ Failed to get portfolio');
    return false;
  }
}

async function getStrategyPerformance(token, strategyId) {
  console.log('\n📈 Getting Strategy Performance...');
  
  const result = await makeRequest('GET', `/trading/strategies/${strategyId}/performance`, null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Strategy performance retrieved successfully');
    console.log('📊 Performance Data:', result.data);
    return true;
  } else {
    console.log('❌ Failed to get strategy performance');
    return false;
  }
}

async function getUserOrders(token) {
  console.log('\n📋 Getting User Orders...');
  
  const result = await makeRequest('GET', '/trading/orders', null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Orders retrieved successfully');
    console.log('📊 Total Orders:', result.data.total);
    console.log('📊 Orders:', result.data.orders.length);
    return true;
  } else {
    console.log('❌ Failed to get orders');
    return false;
  }
}

async function getOrderStatistics(token) {
  console.log('\n📊 Getting Order Statistics...');
  
  const result = await makeRequest('GET', '/trading/orders/statistics', null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result && result.success) {
    console.log('✅ Order statistics retrieved successfully');
    console.log('📊 Statistics:', result.data);
    return true;
  } else {
    console.log('❌ Failed to get order statistics');
    return false;
  }
}

async function runCompleteTradingSystemTest() {
  console.log('🚀 Starting Complete Trading System Test...\n');
  
  // Register user and connect to Dhan
  const token = await registerUser();
  if (!token) {
    console.log('❌ Cannot proceed without authentication token');
    return;
  }
  
  const connected = await connectToDhan(token);
  if (!connected) {
    console.log('❌ Cannot proceed without Dhan connection');
    return;
  }
  
  const tests = [
    { name: 'Trading Engine Status', fn: () => testTradingEngineStatus(token) },
    { name: 'Create Test Strategy', fn: async () => {
      const strategyId = await createTestStrategy(token);
      return strategyId ? { success: true, strategyId } : { success: false };
    }},
    { name: 'Add Strategy to Engine', fn: async () => {
      const strategyId = await createTestStrategy(token);
      if (strategyId) {
        return await addStrategyToEngine(token, strategyId);
      }
      return false;
    }},
    { name: 'Execute Strategy', fn: async () => {
      const strategyId = await createTestStrategy(token);
      if (strategyId) {
        await addStrategyToEngine(token, strategyId);
        return await executeStrategy(token, strategyId);
      }
      return false;
    }},
    { name: 'Get User Portfolio', fn: () => getUserPortfolio(token) },
    { name: 'Get Strategy Performance', fn: async () => {
      const strategyId = await createTestStrategy(token);
      if (strategyId) {
        return await getStrategyPerformance(token, strategyId);
      }
      return false;
    }},
    { name: 'Get User Orders', fn: () => getUserOrders(token) },
    { name: 'Get Order Statistics', fn: () => getOrderStatistics(token) }
  ];
  
  let passed = 0;
  let failed = 0;
  let strategyId = null;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result && (result.success !== false)) {
        passed++;
        if (result.strategyId) {
          strategyId = result.strategyId;
        }
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Complete Trading System Test Results:');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Complete trading system is working!');
    console.log('\n📝 Your multi-user trading system is ready for:');
    console.log('   ✅ User registration and authentication');
    console.log('   ✅ Broker connection (Dhan sandbox)');
    console.log('   ✅ Strategy creation and management');
    console.log('   ✅ Trading engine integration');
    console.log('   ✅ Order placement and tracking');
    console.log('   ✅ Portfolio management');
    console.log('   ✅ Performance monitoring');
  } else if (passed > failed) {
    console.log('\n⚠️  Most tests passed. Your trading system is mostly functional.');
    console.log('📝 Check failed tests above for any issues.');
  } else {
    console.log('\n❌ Multiple tests failed. Check your system configuration.');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Review any failed tests above');
  console.log('2. Test with multiple users simultaneously');
  console.log('3. Add real-time WebSocket data feeds');
  console.log('4. Implement advanced strategy types');
  console.log('5. Deploy to production with live broker credentials');
  console.log('6. Set up monitoring and alerting systems');
}

runCompleteTradingSystemTest().catch(console.error);
