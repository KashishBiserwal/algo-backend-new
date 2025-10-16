const axios = require('axios');
require('dotenv').config();

const DHAN_SANDBOX_URL = process.env.DHAN_SANDBOX_URL || 'https://sandbox.dhan.co/v2';
const DHAN_SANDBOX_TOKEN = process.env.DHAN_SANDBOX_TOKEN;
const DHAN_SANDBOX_CLIENT_ID = process.env.DHAN_SANDBOX_CLIENT_ID;

console.log('🔧 Direct API Test Configuration:');
console.log('   URL:', DHAN_SANDBOX_URL);
console.log('   Token:', DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
console.log('   Client ID:', DHAN_SANDBOX_CLIENT_ID || '❌ Not set');

async function testDirectOrderPlacement() {
  console.log('\n📋 Testing Direct Dhan Order Placement API...');
  
  if (!DHAN_SANDBOX_TOKEN || !DHAN_SANDBOX_CLIENT_ID) {
    console.log('❌ Missing required credentials');
    return;
  }
  
  try {
    // Test 1: Simple Market Order
    console.log('\n🧪 Test 1: Simple Market Order');
    const marketOrderPayload = {
      dhanClientId: DHAN_SANDBOX_CLIENT_ID,
      correlationId: `TEST_${Date.now()}`,
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      validity: 'DAY',
      securityId: '11536', // RELIANCE
      quantity: 1,
      disclosedQuantity: 0,
      price: 0,
      triggerPrice: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN',
      boProfitValue: 0,
      boStopLossValue: 0
    };
    
    console.log('📤 Sending Market Order:', marketOrderPayload);
    
    const response = await axios.post(`${DHAN_SANDBOX_URL}/orders`, marketOrderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    });
    
    console.log('📥 Market Order Response:', response.data);
    
    if (response.data.orderId) {
      console.log('✅ Market Order placed successfully!');
      console.log('🆔 Order ID:', response.data.orderId);
      console.log('📊 Order Status:', response.data.orderStatus);
    } else {
      console.log('❌ Market Order failed');
    }
    
  } catch (error) {
    console.log('❌ Market Order Error:', error.response?.data || error.message);
  }
  
  try {
    // Test 2: Limit Order
    console.log('\n🧪 Test 2: Limit Order');
    const limitOrderPayload = {
      dhanClientId: DHAN_SANDBOX_CLIENT_ID,
      correlationId: `LIMIT_${Date.now()}`,
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'LIMIT',
      validity: 'DAY',
      securityId: '11536', // RELIANCE
      quantity: 1,
      disclosedQuantity: 0,
      price: 1000, // Low price to avoid execution
      triggerPrice: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN',
      boProfitValue: 0,
      boStopLossValue: 0
    };
    
    console.log('📤 Sending Limit Order:', limitOrderPayload);
    
    const response = await axios.post(`${DHAN_SANDBOX_URL}/orders`, limitOrderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    });
    
    console.log('📥 Limit Order Response:', response.data);
    
    if (response.data.orderId) {
      console.log('✅ Limit Order placed successfully!');
      console.log('🆔 Order ID:', response.data.orderId);
      console.log('📊 Order Status:', response.data.orderStatus);
    } else {
      console.log('❌ Limit Order failed');
    }
    
  } catch (error) {
    console.log('❌ Limit Order Error:', error.response?.data || error.message);
  }
  
  try {
    // Test 3: Bracket Order
    console.log('\n🧪 Test 3: Bracket Order');
    const bracketOrderPayload = {
      dhanClientId: DHAN_SANDBOX_CLIENT_ID,
      correlationId: `BRACKET_${Date.now()}`,
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'BO', // Bracket Order
      orderType: 'LIMIT',
      validity: 'DAY',
      securityId: '11536', // RELIANCE
      quantity: 1,
      disclosedQuantity: 0,
      price: 1000, // Low price
      triggerPrice: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN',
      boProfitValue: 1100, // Target
      boStopLossValue: 900  // Stop loss
    };
    
    console.log('📤 Sending Bracket Order:', bracketOrderPayload);
    
    const response = await axios.post(`${DHAN_SANDBOX_URL}/orders`, bracketOrderPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    });
    
    console.log('📥 Bracket Order Response:', response.data);
    
    if (response.data.orderId) {
      console.log('✅ Bracket Order placed successfully!');
      console.log('🆔 Order ID:', response.data.orderId);
      console.log('📊 Order Status:', response.data.orderStatus);
    } else {
      console.log('❌ Bracket Order failed');
    }
    
  } catch (error) {
    console.log('❌ Bracket Order Error:', error.response?.data || error.message);
  }
}

async function testOrderBook() {
  console.log('\n📖 Testing Order Book API...');
  
  try {
    const response = await axios.get(`${DHAN_SANDBOX_URL}/orders`, {
      headers: {
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    });
    
    console.log('📥 Order Book Response:', response.data);
    
    if (response.data && Array.isArray(response.data)) {
      console.log('✅ Order Book retrieved successfully!');
      console.log('📊 Total Orders:', response.data.length);
    } else {
      console.log('❌ Order Book failed');
    }
    
  } catch (error) {
    console.log('❌ Order Book Error:', error.response?.data || error.message);
  }
}

async function testPositions() {
  console.log('\n💼 Testing Positions API...');
  
  try {
    const response = await axios.get(`${DHAN_SANDBOX_URL}/positions`, {
      headers: {
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    });
    
    console.log('📥 Positions Response:', response.data);
    
    if (response.data && Array.isArray(response.data)) {
      console.log('✅ Positions retrieved successfully!');
      console.log('📊 Total Positions:', response.data.length);
    } else {
      console.log('❌ Positions failed');
    }
    
  } catch (error) {
    console.log('❌ Positions Error:', error.response?.data || error.message);
  }
}

async function testLTP() {
  console.log('\n💰 Testing LTP API...');
  
  try {
    const response = await axios.get(`${DHAN_SANDBOX_URL}/quotes?securityId=11536&exchangeSegment=NSE_EQ`, {
      headers: {
        'Accept': 'application/json',
        'access-token': DHAN_SANDBOX_TOKEN
      }
    });
    
    console.log('📥 LTP Response:', response.data);
    
    if (response.data && response.data.ltp) {
      console.log('✅ LTP retrieved successfully!');
      console.log('💰 RELIANCE LTP:', response.data.ltp);
    } else {
      console.log('❌ LTP failed');
    }
    
  } catch (error) {
    console.log('❌ LTP Error:', error.response?.data || error.message);
  }
}

async function runDirectAPITest() {
  console.log('🚀 Starting Direct Dhan API Test...\n');
  
  await testDirectOrderPlacement();
  await testOrderBook();
  await testPositions();
  await testLTP();
  
  console.log('\n📊 Direct API Test Complete!');
  console.log('📝 Check the results above to verify Dhan sandbox is working.');
  console.log('\n🎯 If orders are placed successfully, your Dhan integration is ready!');
}

runDirectAPITest().catch(console.error);
