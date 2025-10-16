const axios = require('axios');
require('dotenv').config();

const DHAN_SANDBOX_URL = process.env.DHAN_SANDBOX_URL || 'https://sandbox.dhan.co/v2';
const DHAN_SANDBOX_TOKEN = process.env.DHAN_SANDBOX_TOKEN;
const DHAN_SANDBOX_CLIENT_ID = process.env.DHAN_SANDBOX_CLIENT_ID;

console.log('🔧 Direct Complete Dhan API Testing Suite');
console.log('   URL:', DHAN_SANDBOX_URL);
console.log('   Token:', DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
console.log('   Client ID:', DHAN_SANDBOX_CLIENT_ID || '❌ Not set');

async function testAPIEndpoint(endpoint, method = 'GET', data = null, description = '') {
  try {
    console.log(`\n📋 Testing: ${description || endpoint}`);
    
    const config = {
      method,
      url: `${DHAN_SANDBOX_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log(`✅ ${description || endpoint}: SUCCESS`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Response Type: ${Array.isArray(response.data) ? 'Array' : typeof response.data}`);
    
    if (Array.isArray(response.data)) {
      console.log(`📊 Data Length: ${response.data.length}`);
    } else if (response.data && typeof response.data === 'object') {
      console.log(`📊 Data Keys: ${Object.keys(response.data).join(', ')}`);
    }
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    console.log(`❌ ${description || endpoint}: FAILED`);
    console.log(`📊 Status: ${error.response?.status || 'No response'}`);
    console.log(`📊 Error: ${error.response?.data?.errorMessage || error.response?.data?.message || error.message}`);
    
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message
    };
  }
}

async function testAllEndpoints() {
  console.log('\n🧪 Testing All Dhan API Endpoints...\n');
  
  const testResults = {};
  
  // Test 1: Profile
  testResults.profile = await testAPIEndpoint('/profile', 'GET', null, 'Profile/Connection Test');
  
  // Test 2: Order Book
  testResults.orderBook = await testAPIEndpoint('/orders', 'GET', null, 'Order Book');
  
  // Test 3: Positions
  testResults.positions = await testAPIEndpoint('/positions', 'GET', null, 'Positions');
  
  // Test 4: Holdings
  testResults.holdings = await testAPIEndpoint('/holdings', 'GET', null, 'Holdings');
  
  // Test 5: Funds
  testResults.funds = await testAPIEndpoint('/funds', 'GET', null, 'Funds');
  
  // Test 6: Limits
  testResults.limits = await testAPIEndpoint('/limits', 'GET', null, 'Limits');
  
  // Test 7: Trade Book
  testResults.tradeBook = await testAPIEndpoint('/trades', 'GET', null, 'Trade Book');
  
  // Test 8: Instruments
  testResults.instruments = await testAPIEndpoint('/instruments?exchangeSegment=NSE_EQ', 'GET', null, 'Instruments (NSE_EQ)');
  
  // Test 9: Search Instruments
  testResults.searchInstruments = await testAPIEndpoint('/instruments/search?exchangeSegment=NSE_EQ&search=TCS', 'GET', null, 'Search Instruments (TCS)');
  
  // Test 10: Market Data
  testResults.marketData = await testAPIEndpoint('/market-data?securityId=11536&exchangeSegment=NSE_EQ', 'GET', null, 'Market Data (TCS)');
  
  // Test 11: LTP
  testResults.ltp = await testAPIEndpoint('/ltp?securityId=11536&exchangeSegment=NSE_EQ', 'GET', null, 'LTP (TCS)');
  
  // Test 12: Quotes
  testResults.quotes = await testAPIEndpoint('/quotes?securityId=11536&exchangeSegment=NSE_EQ', 'GET', null, 'Quotes (TCS)');
  
  // Test 13: Order History
  const today = new Date().toISOString().split('T')[0];
  testResults.orderHistory = await testAPIEndpoint(`/orders/history?fromDate=${today}&toDate=${today}`, 'GET', null, 'Order History');
  
  // Test 14: Place Test Order
  const testOrderData = {
    dhanClientId: DHAN_SANDBOX_CLIENT_ID,
    correlationId: `TEST_${Date.now()}`,
    transactionType: 'BUY',
    exchangeSegment: 'NSE_EQ',
    productType: 'INTRADAY',
    orderType: 'MARKET',
    validity: 'DAY',
    securityId: '11536', // TCS
    quantity: 1,
    disclosedQuantity: 0,
    price: 0,
    triggerPrice: 0,
    afterMarketOrder: false,
    amoTime: 'OPEN',
    boProfitValue: 0,
    boStopLossValue: 0
  };
  
  testResults.testOrder = await testAPIEndpoint('/orders', 'POST', testOrderData, 'Place Test Order');
  
  // Test 15: Place Limit Order
  const limitOrderData = {
    ...testOrderData,
    correlationId: `LIMIT_${Date.now()}`,
    orderType: 'LIMIT',
    price: 3500 // Within circuit limits
  };
  
  testResults.limitOrder = await testAPIEndpoint('/orders', 'POST', limitOrderData, 'Place Limit Order');
  
  return testResults;
}

async function generateReport(testResults) {
  console.log('\n📊 Complete API Test Report');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Profile/Connection', result: testResults.profile },
    { name: 'Order Book', result: testResults.orderBook },
    { name: 'Positions', result: testResults.positions },
    { name: 'Holdings', result: testResults.holdings },
    { name: 'Funds', result: testResults.funds },
    { name: 'Limits', result: testResults.limits },
    { name: 'Trade Book', result: testResults.tradeBook },
    { name: 'Instruments', result: testResults.instruments },
    { name: 'Search Instruments', result: testResults.searchInstruments },
    { name: 'Market Data', result: testResults.marketData },
    { name: 'LTP', result: testResults.ltp },
    { name: 'Quotes', result: testResults.quotes },
    { name: 'Order History', result: testResults.orderHistory },
    { name: 'Test Order (Market)', result: testResults.testOrder },
    { name: 'Limit Order', result: testResults.limitOrder }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const status = test.result?.success;
    const icon = status ? '✅' : '❌';
    const statusText = status ? 'PASS' : 'FAIL';
    console.log(`${icon} ${test.name.padEnd(25)}: ${statusText}`);
    
    if (status) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log('=' .repeat(60));
  console.log(`📈 Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  // Detailed analysis
  console.log('\n📋 Detailed Analysis:');
  
  if (testResults.profile?.success) {
    console.log('✅ Authentication: Working');
  } else {
    console.log('❌ Authentication: Failed - Check token validity');
  }
  
  if (testResults.orderBook?.success) {
    console.log('✅ Order Management: Working');
  } else {
    console.log('❌ Order Management: Failed');
  }
  
  if (testResults.positions?.success || testResults.holdings?.success) {
    console.log('✅ Portfolio Management: Working');
  } else {
    console.log('❌ Portfolio Management: Failed');
  }
  
  if (testResults.funds?.success) {
    console.log('✅ Funds Management: Working');
  } else {
    console.log('❌ Funds Management: Failed');
  }
  
  if (testResults.instruments?.success) {
    console.log('✅ Instrument Data: Working');
  } else {
    console.log('❌ Instrument Data: Failed');
  }
  
  if (testResults.testOrder?.success || testResults.limitOrder?.success) {
    console.log('✅ Order Placement: Working');
  } else {
    console.log('❌ Order Placement: Failed');
  }
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Dhan API integration is fully functional!');
    console.log('\n📝 Your Dhan sandbox is ready for:');
    console.log('   ✅ Multi-user trading');
    console.log('   ✅ Order placement and management');
    console.log('   ✅ Portfolio tracking');
    console.log('   ✅ Real-time market data');
    console.log('   ✅ Strategy execution');
  } else if (passed > failed) {
    console.log('\n⚠️  Most tests passed. Your Dhan integration is mostly functional.');
    console.log('📝 Check failed tests above for any issues.');
  } else {
    console.log('\n❌ Multiple tests failed. Check your Dhan sandbox configuration.');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Review any failed tests above');
  console.log('2. Implement trading engine for multi-user support');
  console.log('3. Add real-time WebSocket data feeds');
  console.log('4. Set up order management and monitoring');
  console.log('5. Deploy to production with live credentials');
}

async function runDirectCompleteTest() {
  console.log('🚀 Starting Direct Complete Dhan API Test...\n');
  
  if (!DHAN_SANDBOX_TOKEN || !DHAN_SANDBOX_CLIENT_ID) {
    console.log('❌ Missing required credentials');
    console.log('📝 Please set DHAN_SANDBOX_TOKEN and DHAN_SANDBOX_CLIENT_ID in your .env file');
    return;
  }
  
  const testResults = await testAllEndpoints();
  await generateReport(testResults);
}

runDirectCompleteTest().catch(console.error);
