const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

console.log('🔧 Complete Dhan API Testing Suite');
console.log('   DHAN_SANDBOX_URL:', process.env.DHAN_SANDBOX_URL || '❌ Not set');
console.log('   DHAN_SANDBOX_TOKEN:', process.env.DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
console.log('   DHAN_SANDBOX_CLIENT_ID:', process.env.DHAN_SANDBOX_CLIENT_ID || '❌ Not set');

async function registerUser() {
  console.log('\n🔐 Registering new user for complete API testing...');
  
  const userData = {
    username: `api_test_${Date.now()}`,
    email: `api_test_${Date.now()}@test.com`,
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
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/dhan/connect`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ Connected to Dhan sandbox successfully');
      return true;
    } else {
      console.log('❌ Dhan connection failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Dhan connection error:', error.response?.data || error.message);
    return false;
  }
}

async function testAllDhanAPIs() {
  console.log('\n🧪 Testing All Dhan APIs...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID,
      accessToken: process.env.DHAN_SANDBOX_TOKEN,
      isSandbox: true
    });
    
    console.log('✅ DhanClient created successfully');
    
    const testResults = {};
    
    // Test 1: Profile/Connection Test
    console.log('\n📋 Test 1: Profile/Connection Test');
    testResults.profile = await client.testConnection();
    console.log('📊 Profile Result:', testResults.profile.success ? '✅ Success' : '❌ Failed');
    
    // Test 2: Order Book
    console.log('\n📋 Test 2: Order Book');
    testResults.orderBook = await client.getOrderBook();
    console.log('📊 Order Book Result:', testResults.orderBook.success ? '✅ Success' : '❌ Failed');
    if (testResults.orderBook.success) {
      console.log('📊 Total Orders:', testResults.orderBook.data?.length || 0);
    }
    
    // Test 3: Positions
    console.log('\n📋 Test 3: Positions');
    testResults.positions = await client.getPositions();
    console.log('📊 Positions Result:', testResults.positions.success ? '✅ Success' : '❌ Failed');
    if (testResults.positions.success) {
      console.log('📊 Total Positions:', testResults.positions.data?.length || 0);
    }
    
    // Test 4: Holdings
    console.log('\n📋 Test 4: Holdings');
    testResults.holdings = await client.getHoldings();
    console.log('📊 Holdings Result:', testResults.holdings.success ? '✅ Success' : '❌ Failed');
    if (testResults.holdings.success) {
      console.log('📊 Total Holdings:', testResults.holdings.data?.length || 0);
    }
    
    // Test 5: Funds
    console.log('\n📋 Test 5: Funds');
    testResults.funds = await client.getFunds();
    console.log('📊 Funds Result:', testResults.funds.success ? '✅ Success' : '❌ Failed');
    if (testResults.funds.success) {
      console.log('📊 Funds Data:', testResults.funds.data);
    }
    
    // Test 6: Limits
    console.log('\n📋 Test 6: Limits');
    testResults.limits = await client.getLimits();
    console.log('📊 Limits Result:', testResults.limits.success ? '✅ Success' : '❌ Failed');
    if (testResults.limits.success) {
      console.log('📊 Limits Data:', testResults.limits.data);
    }
    
    // Test 7: Trade Book
    console.log('\n📋 Test 7: Trade Book');
    testResults.tradeBook = await client.getTradeBook();
    console.log('📊 Trade Book Result:', testResults.tradeBook.success ? '✅ Success' : '❌ Failed');
    if (testResults.tradeBook.success) {
      console.log('📊 Total Trades:', testResults.tradeBook.data?.length || 0);
    }
    
    // Test 8: LTP
    console.log('\n📋 Test 8: LTP (Last Traded Price)');
    testResults.ltp = await client.getLTP('11536', 'NSE_EQ'); // TCS
    console.log('📊 LTP Result:', testResults.ltp.success ? '✅ Success' : '❌ Failed');
    if (testResults.ltp.success) {
      console.log('📊 TCS LTP:', testResults.ltp.ltp);
    }
    
    // Test 9: Market Data
    console.log('\n📋 Test 9: Market Data');
    testResults.marketData = await client.getMarketData('11536', 'NSE_EQ'); // TCS
    console.log('📊 Market Data Result:', testResults.marketData.success ? '✅ Success' : '❌ Failed');
    if (testResults.marketData.success) {
      console.log('📊 Market Data:', testResults.marketData.data);
    }
    
    // Test 10: Instruments
    console.log('\n📋 Test 10: Instruments');
    testResults.instruments = await client.getInstruments('NSE_EQ');
    console.log('📊 Instruments Result:', testResults.instruments.success ? '✅ Success' : '❌ Failed');
    if (testResults.instruments.success) {
      console.log('📊 Total Instruments:', testResults.instruments.data?.length || 0);
    }
    
    // Test 11: Search Instruments
    console.log('\n📋 Test 11: Search Instruments');
    testResults.searchInstruments = await client.searchInstruments('NSE_EQ', 'TCS');
    console.log('📊 Search Instruments Result:', testResults.searchInstruments.success ? '✅ Success' : '❌ Failed');
    if (testResults.searchInstruments.success) {
      console.log('📊 Found Instruments:', testResults.searchInstruments.data?.length || 0);
    }
    
    // Test 12: Order History
    console.log('\n📋 Test 12: Order History');
    const today = new Date().toISOString().split('T')[0];
    testResults.orderHistory = await client.getOrderHistory(today, today);
    console.log('📊 Order History Result:', testResults.orderHistory.success ? '✅ Success' : '❌ Failed');
    if (testResults.orderHistory.success) {
      console.log('📊 Total History Orders:', testResults.orderHistory.data?.length || 0);
    }
    
    // Test 13: Account Summary
    console.log('\n📋 Test 13: Account Summary');
    testResults.accountSummary = await client.getAccountSummary();
    console.log('📊 Account Summary Result:', testResults.accountSummary.success ? '✅ Success' : '❌ Failed');
    if (testResults.accountSummary.success) {
      console.log('📊 Account Summary:', testResults.accountSummary.data);
    }
    
    // Test 14: Order Validation
    console.log('\n📋 Test 14: Order Validation');
    const validOrder = {
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      securityId: '11536',
      quantity: 1
    };
    
    const invalidOrder = {
      transactionType: 'INVALID',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      securityId: '11536',
      quantity: 1
    };
    
    const validResult = client.validateOrderParams(validOrder);
    const invalidResult = client.validateOrderParams(invalidOrder);
    
    console.log('📊 Valid Order Validation:', validResult.valid ? '✅ Success' : '❌ Failed');
    console.log('📊 Invalid Order Validation:', !invalidResult.valid ? '✅ Success' : '❌ Failed');
    
    testResults.orderValidation = {
      valid: validResult.valid,
      invalid: !invalidResult.valid
    };
    
    // Test 15: Place Test Order
    console.log('\n📋 Test 15: Place Test Order');
    testResults.testOrder = await client.placeOrder({
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      securityId: '11536', // TCS
      quantity: 1
    });
    console.log('📊 Test Order Result:', testResults.testOrder.success ? '✅ Success' : '❌ Failed');
    if (testResults.testOrder.success) {
      console.log('📊 Order ID:', testResults.testOrder.orderId);
      console.log('📊 Order Status:', testResults.testOrder.orderStatus);
    }
    
    return testResults;
    
  } catch (error) {
    console.log('❌ API testing failed:', error.message);
    return null;
  }
}

async function generateTestReport(testResults) {
  console.log('\n📊 Complete API Test Report');
  console.log('=' .repeat(50));
  
  if (!testResults) {
    console.log('❌ No test results available');
    return;
  }
  
  const tests = [
    { name: 'Profile/Connection', result: testResults.profile },
    { name: 'Order Book', result: testResults.orderBook },
    { name: 'Positions', result: testResults.positions },
    { name: 'Holdings', result: testResults.holdings },
    { name: 'Funds', result: testResults.funds },
    { name: 'Limits', result: testResults.limits },
    { name: 'Trade Book', result: testResults.tradeBook },
    { name: 'LTP', result: testResults.ltp },
    { name: 'Market Data', result: testResults.marketData },
    { name: 'Instruments', result: testResults.instruments },
    { name: 'Search Instruments', result: testResults.searchInstruments },
    { name: 'Order History', result: testResults.orderHistory },
    { name: 'Account Summary', result: testResults.accountSummary },
    { name: 'Order Validation', result: testResults.orderValidation },
    { name: 'Test Order', result: testResults.testOrder }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const status = test.result?.success || test.result?.valid || test.result?.invalid;
    const icon = status ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${status ? 'PASS' : 'FAIL'}`);
    
    if (status) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`📈 Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Dhan API integration is fully functional!');
  } else if (passed > failed) {
    console.log('\n⚠️  Most tests passed. Check failed tests above.');
  } else {
    console.log('\n❌ Multiple tests failed. Check configuration and API access.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Review any failed tests above');
  console.log('2. Implement trading engine for multi-user support');
  console.log('3. Add real-time data feeds');
  console.log('4. Set up order management system');
  console.log('5. Deploy to production environment');
}

async function runCompleteAPITest() {
  console.log('🚀 Starting Complete Dhan API Test Suite...\n');
  
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
  
  // Test all APIs
  const testResults = await testAllDhanAPIs();
  
  // Generate report
  await generateTestReport(testResults);
}

runCompleteAPITest().catch(console.error);
