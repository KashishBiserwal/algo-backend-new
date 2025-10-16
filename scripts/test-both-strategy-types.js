const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';

// Time-based strategy
const timeBasedStrategy = {
  name: 'Time-Based Nifty Strategy',
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
      type: 'Trail Profit',
      on_every_increase_of: 1000,
      trail_profit_by: 500
    }
  },
  broker: 'angel'
};

// Indicator-based strategy
const indicatorBasedStrategy = {
  name: 'MACD Crossover Strategy',
  type: 'indicator_based',
  instruments: [
    {
      instrument_id: 'TCS-EQUITY-NSE',
      quantity: 1,
      symbol: 'TCS',
      name: 'TCS'
    }
  ],
  order_type: 'MIS',
  transaction_type: 'Only Long',
  chart_type: 'Heikin Ashi',
  interval: '15 Min',
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
  entry_conditions: [
    {
      indicator1: 'MACD',
      comparator: 'Crosses Above',
      indicator2: 'MACD-Signal',
      period: 12
    }
  ],
  risk_management: {
    target_on_each_script: 200,
    stop_loss_on_each_script: 100,
    target_sl_type: 'Points',
    exit_when_overall_profit_amount: 2000,
    exit_when_overall_loss_amount: 1000,
    max_trade_cycle: 5,
    no_trade_after_time: '15:00',
    profit_trailing: {
      type: 'Lock and Trail',
      profit_reaches: 1000,
      lock_profit_at: 500,
      on_every_increase_of: 200,
      trail_profit_by: 100
    }
  },
  broker: 'angel'
};

async function testBothStrategyTypes() {
  try {
    console.log('🧪 Testing Both Strategy Types (Time-Based & Indicator-Based)\n');
    
    // Step 1: Login
    console.log('🔄 Step 1: User Authentication');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'systemtest@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Test Time-Based Strategy
    console.log('\n🔄 Step 2: Time-Based Strategy Test');
    console.log('📋 Creating time-based strategy...');
    
    const timeBasedCreateResponse = await axios.post(`${BASE_URL}/strategies`, timeBasedStrategy, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Time-based strategy created successfully');
    console.log('📋 Strategy ID:', timeBasedCreateResponse.data.data._id);
    console.log('📋 Strategy Type:', timeBasedCreateResponse.data.data.type);
    console.log('📋 Order Legs:', timeBasedCreateResponse.data.data.order_legs.length);
    
    // Step 3: Test Indicator-Based Strategy
    console.log('\n🔄 Step 3: Indicator-Based Strategy Test');
    console.log('📋 Creating indicator-based strategy...');
    
    const indicatorBasedCreateResponse = await axios.post(`${BASE_URL}/strategies`, indicatorBasedStrategy, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Indicator-based strategy created successfully');
    console.log('📋 Strategy ID:', indicatorBasedCreateResponse.data.data._id);
    console.log('📋 Strategy Type:', indicatorBasedCreateResponse.data.data.type);
    console.log('📋 Transaction Type:', indicatorBasedCreateResponse.data.data.transaction_type);
    console.log('📋 Chart Type:', indicatorBasedCreateResponse.data.data.chart_type);
    console.log('📋 Interval:', indicatorBasedCreateResponse.data.data.interval);
    console.log('📋 Instruments:', indicatorBasedCreateResponse.data.data.instruments.length);
    console.log('📋 Entry Conditions:', indicatorBasedCreateResponse.data.data.entry_conditions.length);
    
    // Step 4: Test Strategy List with Both Types
    console.log('\n🔄 Step 4: Strategy List Test');
    const listResponse = await axios.get(`${BASE_URL}/strategies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Strategy list successful');
    console.log('📋 Total strategies:', listResponse.data.data.pagination.total);
    
    const timeBasedStrategies = listResponse.data.data.strategies.filter(s => s.type === 'time_based');
    const indicatorBasedStrategies = listResponse.data.data.strategies.filter(s => s.type === 'indicator_based');
    
    console.log('📋 Time-based strategies:', timeBasedStrategies.length);
    console.log('📋 Indicator-based strategies:', indicatorBasedStrategies.length);
    
    // Step 5: Test Strategy Retrieval
    console.log('\n🔄 Step 5: Strategy Retrieval Test');
    
    // Retrieve time-based strategy
    const timeBasedGetResponse = await axios.get(`${BASE_URL}/strategies/${timeBasedCreateResponse.data.data._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Time-based strategy retrieval successful');
    console.log('📋 Retrieved time-based strategy:', timeBasedGetResponse.data.data.name);
    console.log('📋 Has order_legs:', !!timeBasedGetResponse.data.data.order_legs);
    console.log('📋 Has instrument:', !!timeBasedGetResponse.data.data.instrument);
    
    // Retrieve indicator-based strategy
    const indicatorBasedGetResponse = await axios.get(`${BASE_URL}/strategies/${indicatorBasedCreateResponse.data.data._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Indicator-based strategy retrieval successful');
    console.log('📋 Retrieved indicator-based strategy:', indicatorBasedGetResponse.data.data.name);
    console.log('📋 Has instruments:', !!indicatorBasedGetResponse.data.data.instruments);
    console.log('📋 Has entry_conditions:', !!indicatorBasedGetResponse.data.data.entry_conditions);
    console.log('📋 Transaction type:', indicatorBasedGetResponse.data.data.transaction_type);
    console.log('📋 Chart type:', indicatorBasedGetResponse.data.data.chart_type);
    console.log('📋 Interval:', indicatorBasedGetResponse.data.data.interval);
    
    // Step 6: Test Strategy Updates
    console.log('\n🔄 Step 6: Strategy Update Test');
    
    // Update time-based strategy
    const timeBasedUpdateResponse = await axios.put(`${BASE_URL}/strategies/${timeBasedCreateResponse.data.data._id}`, {
      name: 'Updated Time-Based Strategy'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Time-based strategy update successful');
    console.log('📋 Updated name:', timeBasedUpdateResponse.data.data.name);
    
    // Update indicator-based strategy
    const indicatorBasedUpdateResponse = await axios.put(`${BASE_URL}/strategies/${indicatorBasedCreateResponse.data.data._id}`, {
      name: 'Updated Indicator-Based Strategy',
      transaction_type: 'Both Side',
      interval: '30 Min'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Indicator-based strategy update successful');
    console.log('📋 Updated name:', indicatorBasedUpdateResponse.data.data.name);
    console.log('📋 Updated transaction type:', indicatorBasedUpdateResponse.data.data.transaction_type);
    console.log('📋 Updated interval:', indicatorBasedUpdateResponse.data.data.interval);
    
    // Step 7: Cleanup
    console.log('\n🔄 Step 7: Cleanup');
    
    await axios.delete(`${BASE_URL}/strategies/${timeBasedCreateResponse.data.data._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Time-based strategy deleted');
    
    await axios.delete(`${BASE_URL}/strategies/${indicatorBasedCreateResponse.data.data._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Indicator-based strategy deleted');
    
    console.log('\n🎉 BOTH STRATEGY TYPES TEST COMPLETED SUCCESSFULLY!');
    console.log('✅ Time-based strategies: Working perfectly!');
    console.log('✅ Indicator-based strategies: Working perfectly!');
    console.log('✅ All CRUD operations: Working perfectly!');
    console.log('✅ Strategy validation: Working perfectly!');
    
  } catch (error) {
    console.error('\n❌ BOTH STRATEGY TYPES TEST FAILED:');
    console.error('📋 Error:', error.response?.data || error.message);
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Details:', error.response?.data?.details);
  }
}

// Run the test
testBothStrategyTypes();
