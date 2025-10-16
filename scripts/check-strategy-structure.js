const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';

async function checkStrategyStructure() {
  try {
    console.log('🔍 Checking strategy structure...\n');
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'backtest@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Step 2: Get existing strategy
    const strategiesResponse = await axios.get(`${BASE_URL}/strategies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (strategiesResponse.data.data.strategies.length > 0) {
      const strategy = strategiesResponse.data.data.strategies[0];
      console.log('📋 Strategy structure:');
      console.log('   ID:', strategy._id);
      console.log('   Name:', strategy.name);
      console.log('   Type:', strategy.type);
      console.log('   Instrument:', strategy.instrument);
      console.log('   Order Type:', strategy.order_type);
      console.log('   Start Time:', strategy.start_time);
      console.log('   Square Off Time:', strategy.square_off_time);
      console.log('   Trading Days:', strategy.trading_days);
      console.log('   Order Legs Count:', strategy.order_legs?.length || 0);
      
      if (strategy.order_legs && strategy.order_legs.length > 0) {
        console.log('   First Order Leg:');
        const leg = strategy.order_legs[0];
        console.log('     Action:', leg.action);
        console.log('     Quantity:', leg.quantity);
        console.log('     Instrument Type:', leg.instrument_type);
        console.log('     Expiry:', leg.expiry);
        console.log('     Strike Price Reference:', leg.strike_price_reference);
        console.log('     Strike Price Selection:', leg.strike_price_selection);
        console.log('     Stop Loss Value:', leg.stop_loss_value);
        console.log('     Take Profit Value:', leg.take_profit_value);
      }
      
      console.log('   Risk Management:', strategy.risk_management);
      console.log('   Broker:', strategy.broker);
      console.log('   Status:', strategy.status);
    } else {
      console.log('❌ No strategies found');
    }
    
  } catch (error) {
    console.error('❌ Error checking strategy structure:', error.response?.data || error.message);
  }
}

checkStrategyStructure();
