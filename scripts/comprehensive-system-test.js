const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let userId = '';
let strategyId = '';

// Test data
const testUser = {
  username: 'systemtestuser',
  email: 'systemtest@example.com',
  password: 'password123'
};

const sampleStrategy = {
  name: 'System Test Strategy',
  type: 'time_based',
  instrument: 'TCS-EQUITY-NSE',
  order_type: 'MIS',
  start_time: '09:15',
  square_off_time: '15:30',
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
      action: 'SELL',
      quantity: 35,
      instrument_type: 'PE',
      expiry: 'Weekly',
      strike_price_reference: 'ATM pt',
      strike_price_selection: 'ATM',
      stop_loss_percentage: 30,
      stop_loss_value: 30,
      stop_loss_type: 'On Price',
      take_profit_percentage: 0,
      take_profit_value: 0,
      take_profit_type: 'On Price'
    }
  ],
  risk_management: {
    exit_profit_amount: 5000,
    exit_loss_amount: 3000,
    no_trade_after_time: '14:30',
    profit_trailing: {
      type: 'trail_profit',
      on_every_increase_of: 1000,
      trail_profit_by: 500
    }
  },
  broker: 'angel'
};

async function comprehensiveSystemTest() {
  console.log('🚀 COMPREHENSIVE SYSTEM TEST - START TO END\n');
  
  try {
    // Phase 1: Database Connection Test
    console.log('📊 PHASE 1: Database Connection Test');
    await testDatabaseConnection();
    
    // Phase 2: Server Health Test
    console.log('\n🏥 PHASE 2: Server Health Test');
    await testServerHealth();
    
    // Phase 3: Authentication System Test
    console.log('\n🔐 PHASE 3: Authentication System Test');
    await testAuthenticationSystem();
    
    // Phase 4: Instrument System Test
    console.log('\n📈 PHASE 4: Instrument System Test');
    await testInstrumentSystem();
    
    // Phase 5: Strategy System Test
    console.log('\n📋 PHASE 5: Strategy System Test');
    await testStrategySystem();
    
    // Phase 6: Backtesting System Test
    console.log('\n🧪 PHASE 6: Backtesting System Test');
    await testBacktestingSystem();
    
    // Phase 7: Cleanup
    console.log('\n🧹 PHASE 7: Cleanup');
    await cleanup();
    
    console.log('\n✅ COMPREHENSIVE SYSTEM TEST COMPLETED SUCCESSFULLY!');
    console.log('🎉 All systems are working correctly!');
    
  } catch (error) {
    console.error('\n❌ SYSTEM TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function testDatabaseConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Database connection successful');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('✅ Database collections accessible:', collections.length);
    
    await mongoose.disconnect();
    console.log('✅ Database disconnection successful');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

async function testServerHealth() {
  try {
    const response = await axios.get('http://localhost:4000/health', { timeout: 5000 });
    console.log('✅ Server health check passed');
    console.log('📋 Server response:', response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server is not running. Please start the server with: npm start');
    }
    throw new Error(`Server health check failed: ${error.message}`);
  }
}

async function testAuthenticationSystem() {
  try {
    // Test user registration
    console.log('🔄 Testing user registration...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
      console.log('✅ User registration successful');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        // User exists, try login
        console.log('⚠️ User already exists, testing login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
        authToken = loginResponse.data.token;
        userId = loginResponse.data.user.id;
        console.log('✅ User login successful');
      } else {
        throw error;
      }
    }
    
    // Test protected endpoint
    console.log('🔄 Testing protected endpoint...');
    const meResponse = await axios.get(`${BASE_URL}/auth/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Protected endpoint access successful');
    console.log('📋 User info:', meResponse.data.user);
    
  } catch (error) {
    throw new Error(`Authentication system failed: ${error.response?.data?.message || error.message}`);
  }
}

async function testInstrumentSystem() {
  try {
    // Test multi-broker instruments
    console.log('🔄 Testing multi-broker instruments...');
    const instrumentsResponse = await axios.get(`${BASE_URL}/instruments/multi-broker?limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Multi-broker instruments fetched:', instrumentsResponse.data.data.length);
    
    if (instrumentsResponse.data.data.length > 0) {
      const instrument = instrumentsResponse.data.data[0];
      console.log('📋 Sample instrument:', instrument.symbol, '- Angel:', instrument.brokers.angel?.token, 'Dhan:', instrument.brokers.dhan?.token);
      
      // Test broker token resolution
      console.log('🔄 Testing broker token resolution...');
      const tokenResponse = await axios.get(`${BASE_URL}/instruments/${instrument.id}/token?broker=angel`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Broker token resolution successful');
      console.log('📋 Token data:', tokenResponse.data.data);
    }
    
    // Test popular instruments
    console.log('🔄 Testing popular instruments...');
    const popularResponse = await axios.get(`${BASE_URL}/instruments/popular`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Popular instruments fetched');
    console.log('📋 Popular data structure:', Object.keys(popularResponse.data.data));
    
  } catch (error) {
    throw new Error(`Instrument system failed: ${error.response?.data?.message || error.message}`);
  }
}

async function testStrategySystem() {
  try {
    // Test strategy validation
    console.log('🔄 Testing strategy validation...');
    const validationResponse = await axios.post(`${BASE_URL}/strategies/validate`, sampleStrategy, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Strategy validation successful');
    console.log('📋 Validation result:', validationResponse.data.data.valid);
    
    // Test strategy creation
    console.log('🔄 Testing strategy creation...');
    const createResponse = await axios.post(`${BASE_URL}/strategies`, sampleStrategy, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    strategyId = createResponse.data.data._id;
    console.log('✅ Strategy creation successful');
    console.log('📋 Strategy ID:', strategyId);
    
    // Test strategy retrieval
    console.log('🔄 Testing strategy retrieval...');
    const getResponse = await axios.get(`${BASE_URL}/strategies/${strategyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Strategy retrieval successful');
    console.log('📋 Strategy name:', getResponse.data.data.name);
    
    // Test strategy update
    console.log('🔄 Testing strategy update...');
    const updateResponse = await axios.put(`${BASE_URL}/strategies/${strategyId}`, {
      name: 'Updated System Test Strategy'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Strategy update successful');
    console.log('📋 Updated name:', updateResponse.data.data.name);
    
    // Test strategy list
    console.log('🔄 Testing strategy list...');
    const listResponse = await axios.get(`${BASE_URL}/strategies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Strategy list successful');
    console.log('📋 Total strategies:', listResponse.data.data.pagination.total);
    
  } catch (error) {
    throw new Error(`Strategy system failed: ${error.response?.data?.message || error.message}`);
  }
}

async function testBacktestingSystem() {
  try {
    // Test data availability check
    console.log('🔄 Testing data availability check...');
    const dataCheckResponse = await axios.get(`${BASE_URL}/backtest/data/TCS`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Data availability check successful');
    console.log('📋 Data available:', dataCheckResponse.data.data.available);
    
    // Test data fetching if needed
    if (!dataCheckResponse.data.data.available) {
      console.log('🔄 Fetching historical data...');
      const fetchResponse = await axios.post(`${BASE_URL}/backtest/data/TCS`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Historical data fetch successful');
      console.log('📋 Fetch result:', fetchResponse.data.data.success);
    }
    
    // Test backtest execution
    console.log('🔄 Testing backtest execution...');
    const backtestResponse = await axios.post(`${BASE_URL}/backtest/${strategyId}`, {
      period: '1m',
      initialCapital: 100000
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Backtest execution successful');
    console.log('📋 Backtest results:');
    console.log(`   Total Return: ${backtestResponse.data.data.totalReturnPct}%`);
    console.log(`   Win Rate: ${backtestResponse.data.data.winRate}%`);
    console.log(`   Total Trades: ${backtestResponse.data.data.totalTrades}`);
    console.log(`   Max Drawdown: ${backtestResponse.data.data.maxDrawdown}%`);
    console.log(`   Sharpe Ratio: ${backtestResponse.data.data.sharpeRatio}`);
    
    // Test backtest results retrieval
    console.log('🔄 Testing backtest results retrieval...');
    const resultsResponse = await axios.get(`${BASE_URL}/backtest/results/${strategyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Backtest results retrieval successful');
    console.log('📋 Total backtest runs:', resultsResponse.data.data.length);
    
  } catch (error) {
    throw new Error(`Backtesting system failed: ${error.response?.data?.message || error.message}`);
  }
}

async function cleanup() {
  try {
    if (strategyId) {
      console.log('🔄 Cleaning up test strategy...');
      await axios.delete(`${BASE_URL}/strategies/${strategyId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Test strategy deleted');
    }
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.response?.data?.message || error.message);
  }
}

// Run the comprehensive test
comprehensiveSystemTest();
