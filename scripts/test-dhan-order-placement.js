const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

console.log('🔧 Environment Check:');
console.log('   DHAN_SANDBOX_URL:', process.env.DHAN_SANDBOX_URL || '❌ Not set');
console.log('   DHAN_SANDBOX_TOKEN:', process.env.DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
console.log('   DHAN_SANDBOX_CLIENT_ID:', process.env.DHAN_SANDBOX_CLIENT_ID || '❌ Not set');

async function registerUser() {
  console.log('\n🔐 Registering new user for order testing...');
  
  const userData = {
    username: `order_test_${Date.now()}`,
    email: `order_test_${Date.now()}@test.com`,
    password: 'test123456'
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, userData);
    
    if (response.data.success) {
      console.log('✅ User registered successfully');
      console.log('👤 User ID:', response.data.user.id);
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
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Connected to Dhan sandbox successfully');
      console.log('📊 Connection Data:', response.data.data);
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

async function testDhanOrderPlacement() {
  console.log('\n📋 Testing Dhan Order Placement API...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID,
      accessToken: process.env.DHAN_SANDBOX_TOKEN,
      isSandbox: true
    });
    
    console.log('✅ DhanClient created successfully');
    
    // Test 1: Basic Market Order
    console.log('\n🧪 Test 1: Basic Market Order (RELIANCE)');
    const marketOrderPayload = {
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      validity: 'DAY',
      securityId: '11536', // RELIANCE security ID
      quantity: 1,
      disclosedQuantity: 0,
      price: 0,
      triggerPrice: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN'
    };
    
    const marketOrderResult = await client.placeOrder(marketOrderPayload);
    console.log('📊 Market Order Result:', marketOrderResult);
    
    // Test 2: Limit Order
    console.log('\n🧪 Test 2: Limit Order (RELIANCE)');
    const limitOrderPayload = {
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'LIMIT',
      validity: 'DAY',
      securityId: '11536', // RELIANCE security ID
      quantity: 1,
      disclosedQuantity: 0,
      price: 1000, // Low price to avoid execution in sandbox
      triggerPrice: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN'
    };
    
    const limitOrderResult = await client.placeOrder(limitOrderPayload);
    console.log('📊 Limit Order Result:', limitOrderResult);
    
    // Test 3: Stop Loss Order
    console.log('\n🧪 Test 3: Stop Loss Order (RELIANCE)');
    const stopLossOrderPayload = {
      transactionType: 'SELL',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'STOP_LOSS_MARKET',
      validity: 'DAY',
      securityId: '11536', // RELIANCE security ID
      quantity: 1,
      disclosedQuantity: 0,
      price: 0,
      triggerPrice: 2000, // High trigger price
      afterMarketOrder: false,
      amoTime: 'OPEN'
    };
    
    const stopLossOrderResult = await client.placeOrder(stopLossOrderPayload);
    console.log('📊 Stop Loss Order Result:', stopLossOrderResult);
    
    // Test 4: Bracket Order
    console.log('\n🧪 Test 4: Bracket Order (RELIANCE)');
    const bracketOrderPayload = {
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'BO', // Bracket Order
      orderType: 'LIMIT',
      validity: 'DAY',
      securityId: '11536', // RELIANCE security ID
      quantity: 1,
      disclosedQuantity: 0,
      price: 1000, // Low price
      triggerPrice: 0,
      afterMarketOrder: false,
      amoTime: 'OPEN',
      boProfitValue: 1100, // Target price
      boStopLossValue: 900  // Stop loss price
    };
    
    const bracketOrderResult = await client.placeOrder(bracketOrderPayload);
    console.log('📊 Bracket Order Result:', bracketOrderResult);
    
    // Test 5: After Market Order
    console.log('\n🧪 Test 5: After Market Order (RELIANCE)');
    const amoOrderPayload = {
      transactionType: 'BUY',
      exchangeSegment: 'NSE_EQ',
      productType: 'INTRADAY',
      orderType: 'LIMIT',
      validity: 'DAY',
      securityId: '11536', // RELIANCE security ID
      quantity: 1,
      disclosedQuantity: 0,
      price: 1000,
      triggerPrice: 0,
      afterMarketOrder: true,
      amoTime: 'OPEN'
    };
    
    const amoOrderResult = await client.placeOrder(amoOrderPayload);
    console.log('📊 AMO Order Result:', amoOrderResult);
    
    return {
      marketOrder: marketOrderResult,
      limitOrder: limitOrderResult,
      stopLossOrder: stopLossOrderResult,
      bracketOrder: bracketOrderResult,
      amoOrder: amoOrderResult
    };
    
  } catch (error) {
    console.log('❌ Order placement test failed:', error.message);
    return null;
  }
}

async function testOrderBook() {
  console.log('\n📖 Testing Order Book...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID,
      accessToken: process.env.DHAN_SANDBOX_TOKEN,
      isSandbox: true
    });
    
    const orderBookResult = await client.getOrderBook();
    console.log('📊 Order Book Result:', orderBookResult);
    
    return orderBookResult;
  } catch (error) {
    console.log('❌ Order book test failed:', error.message);
    return null;
  }
}

async function testPositions() {
  console.log('\n💼 Testing Positions...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID,
      accessToken: process.env.DHAN_SANDBOX_TOKEN,
      isSandbox: true
    });
    
    const positionsResult = await client.getPositions();
    console.log('📊 Positions Result:', positionsResult);
    
    return positionsResult;
  } catch (error) {
    console.log('❌ Positions test failed:', error.message);
    return null;
  }
}

async function testLTP() {
  console.log('\n💰 Testing LTP (Last Traded Price)...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID,
      accessToken: process.env.DHAN_SANDBOX_TOKEN,
      isSandbox: true
    });
    
    const ltpResult = await client.getLTP('11536', 'NSE_EQ'); // RELIANCE
    console.log('📊 LTP Result:', ltpResult);
    
    return ltpResult;
  } catch (error) {
    console.log('❌ LTP test failed:', error.message);
    return null;
  }
}

async function runOrderPlacementTest() {
  console.log('🚀 Starting Dhan Order Placement Test Suite...\n');
  
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
  
  // Test order placement
  const orderResults = await testDhanOrderPlacement();
  
  // Test other trading functions
  await testOrderBook();
  await testPositions();
  await testLTP();
  
  console.log('\n📊 Order Placement Test Summary:');
  if (orderResults) {
    console.log('✅ Market Order:', orderResults.marketOrder.success ? 'Success' : 'Failed');
    console.log('✅ Limit Order:', orderResults.limitOrder.success ? 'Success' : 'Failed');
    console.log('✅ Stop Loss Order:', orderResults.stopLossOrder.success ? 'Success' : 'Failed');
    console.log('✅ Bracket Order:', orderResults.bracketOrder.success ? 'Success' : 'Failed');
    console.log('✅ AMO Order:', orderResults.amoOrder.success ? 'Success' : 'Failed');
    
    const successCount = Object.values(orderResults).filter(result => result.success).length;
    console.log(`\n📈 Success Rate: ${successCount}/5 (${(successCount/5*100).toFixed(1)}%)`);
    
    if (successCount > 0) {
      console.log('\n🎉 Dhan Order Placement API is working!');
      console.log('📝 Your sandbox is ready for trading operations.');
    } else {
      console.log('\n⚠️  All order placements failed. Check the error messages above.');
    }
  } else {
    console.log('❌ Order placement test failed completely.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Review the order results above');
  console.log('2. Check Dhan sandbox dashboard for placed orders');
  console.log('3. Integrate with your strategy execution engine');
  console.log('4. Test with real trading scenarios');
}

runOrderPlacementTest().catch(console.error);
