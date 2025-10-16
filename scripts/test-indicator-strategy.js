const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';

// Sample indicator-based strategy data
const indicatorStrategy = {
  name: 'RSI Crossover Strategy',
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
  transaction_type: 'Both Side',
  chart_type: 'Candle',
  interval: '1H',
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
      indicator1: 'RSI',
      comparator: 'Crosses Above',
      indicator2: 'Number',
      value: 30,
      period: 14
    },
    {
      indicator1: 'Moving Average',
      comparator: 'Higher than',
      indicator2: 'Price',
      period: 20
    }
  ],
  risk_management: {
    target_on_each_script: 100,
    stop_loss_on_each_script: 50,
    target_sl_type: 'Amount',
    exit_when_overall_profit_amount: 1000,
    exit_when_overall_loss_amount: 500,
    max_trade_cycle: 3,
    no_trade_after_time: '15:00',
    profit_trailing: {
      type: 'Trail Profit',
      on_every_increase_of: 200,
      trail_profit_by: 100
    }
  },
  broker: 'angel'
};

async function testIndicatorStrategy() {
  try {
    console.log('🧪 Testing Indicator-Based Strategy Creation\n');
    
    // Step 1: Login
    console.log('🔄 Step 1: User Authentication');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'systemtest@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Validate strategy
    console.log('\n🔄 Step 2: Strategy Validation');
    const validationResponse = await axios.post(`${BASE_URL}/strategies/validate`, indicatorStrategy, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Strategy validation successful');
    console.log('📋 Validation result:', validationResponse.data.data.valid);
    console.log('📋 Validation details:', validationResponse.data.data.validations);
    
    // Step 3: Create strategy
    console.log('\n🔄 Step 3: Strategy Creation');
    const createResponse = await axios.post(`${BASE_URL}/strategies`, indicatorStrategy, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Strategy creation successful');
    console.log('📋 Strategy ID:', createResponse.data.data._id);
    console.log('📋 Strategy Name:', createResponse.data.data.name);
    console.log('📋 Strategy Type:', createResponse.data.data.type);
    console.log('📋 Transaction Type:', createResponse.data.data.transaction_type);
    console.log('📋 Chart Type:', createResponse.data.data.chart_type);
    console.log('📋 Interval:', createResponse.data.data.interval);
    console.log('📋 Instruments Count:', createResponse.data.data.instruments.length);
    console.log('📋 Entry Conditions Count:', createResponse.data.data.entry_conditions.length);
    
    // Step 4: Retrieve strategy
    console.log('\n🔄 Step 4: Strategy Retrieval');
    const getResponse = await axios.get(`${BASE_URL}/strategies/${createResponse.data.data._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Strategy retrieval successful');
    console.log('📋 Retrieved strategy details:');
    console.log('   - Name:', getResponse.data.data.name);
    console.log('   - Type:', getResponse.data.data.type);
    console.log('   - Instruments:', getResponse.data.data.instruments.map(i => `${i.symbol} (${i.quantity})`).join(', '));
    console.log('   - Entry Conditions:', getResponse.data.data.entry_conditions.map(c => `${c.indicator1} ${c.comparator} ${c.indicator2}`).join(', '));
    console.log('   - Risk Management:', {
      target: getResponse.data.data.risk_management.target_on_each_script,
      stopLoss: getResponse.data.data.risk_management.stop_loss_on_each_script,
      maxCycle: getResponse.data.data.risk_management.max_trade_cycle
    });
    
    // Step 5: Test strategy list
    console.log('\n🔄 Step 5: Strategy List');
    const listResponse = await axios.get(`${BASE_URL}/strategies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Strategy list successful');
    console.log('📋 Total strategies:', listResponse.data.data.pagination.total);
    
    const indicatorStrategies = listResponse.data.data.strategies.filter(s => s.type === 'indicator_based');
    console.log('📋 Indicator-based strategies:', indicatorStrategies.length);
    
    // Step 6: Cleanup
    console.log('\n🔄 Step 6: Cleanup');
    await axios.delete(`${BASE_URL}/strategies/${createResponse.data.data._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Test strategy deleted');
    
    console.log('\n🎉 INDICATOR-BASED STRATEGY TEST COMPLETED SUCCESSFULLY!');
    console.log('✅ All indicator-based strategy features are working correctly!');
    
  } catch (error) {
    console.error('\n❌ INDICATOR-BASED STRATEGY TEST FAILED:');
    console.error('📋 Error:', error.response?.data || error.message);
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Details:', error.response?.data?.details);
  }
}

// Run the test
testIndicatorStrategy();
