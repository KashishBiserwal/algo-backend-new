const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let userId = '';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
};

const sampleStrategy = {
  name: 'Nifty Options Strategy',
  type: 'time_based',
  instrument: 'TCS-EQUITY-NSE', // Using our multi-broker instrument
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

async function testStrategyCreationFlow() {
  try {
    console.log('🚀 Testing Complete Strategy Creation Flow\n');
    
    // Step 1: Register/Login user
    console.log('1️⃣ Setting up user authentication...');
    await setupUser();
    
    // Step 2: Get available instruments
    console.log('\n2️⃣ Getting available multi-broker instruments...');
    await getAvailableInstruments();
    
    // Step 3: Validate strategy
    console.log('\n3️⃣ Validating strategy...');
    await validateStrategy();
    
    // Step 4: Create strategy
    console.log('\n4️⃣ Creating strategy...');
    const strategyId = await createStrategy();
    
    // Step 5: Get created strategy
    console.log('\n5️⃣ Retrieving created strategy...');
    await getStrategy(strategyId);
    
    // Step 6: Update strategy
    console.log('\n6️⃣ Updating strategy...');
    await updateStrategy(strategyId);
    
    // Step 7: Get all strategies
    console.log('\n7️⃣ Getting all user strategies...');
    await getAllStrategies();
    
    // Step 8: Start strategy
    console.log('\n8️⃣ Starting strategy...');
    await toggleStrategy(strategyId, 'start');
    
    // Step 9: Get strategy performance
    console.log('\n9️⃣ Getting strategy performance...');
    await getStrategyPerformance(strategyId);
    
    // Step 10: Stop strategy
    console.log('\n🔟 Stopping strategy...');
    await toggleStrategy(strategyId, 'stop');
    
    // Step 11: Delete strategy
    console.log('\n1️⃣1️⃣ Deleting strategy...');
    await deleteStrategy(strategyId);
    
    console.log('\n✅ Complete strategy creation flow tested successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function setupUser() {
  try {
    // Try to login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;
    console.log('✅ User logged in successfully');
    
  } catch (error) {
    // If login fails, register new user
    console.log('⚠️ Login failed, registering new user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
    console.log('✅ User registered and logged in successfully');
  }
}

async function getAvailableInstruments() {
  const response = await axios.get(`${BASE_URL}/instruments/multi-broker?limit=5`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log(`✅ Found ${response.data.data.length} multi-broker instruments`);
  if (response.data.data.length > 0) {
    console.log('📋 Sample instruments:');
    response.data.data.forEach((inst, index) => {
      console.log(`   ${index + 1}. ${inst.symbol} (${inst.exchange}) - Angel: ${inst.brokers.angel?.token}, Dhan: ${inst.brokers.dhan?.token}`);
    });
    
    // Update strategy with first available instrument
    sampleStrategy.instrument = response.data.data[0].id;
    console.log(`📝 Updated strategy to use instrument: ${sampleStrategy.instrument}`);
  }
}

async function validateStrategy() {
  const response = await axios.post(`${BASE_URL}/strategies/validate`, sampleStrategy, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.data.data.valid) {
    console.log('✅ Strategy validation passed');
    console.log('📋 Validation details:', response.data.data.validations);
  } else {
    console.log('❌ Strategy validation failed:', response.data.data.validations);
    throw new Error('Strategy validation failed');
  }
}

async function createStrategy() {
  const response = await axios.post(`${BASE_URL}/strategies`, sampleStrategy, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategy created successfully');
  console.log('📋 Strategy ID:', response.data.data._id);
  console.log('📋 Strategy name:', response.data.data.name);
  console.log('📋 Strategy status:', response.data.data.status);
  
  return response.data.data._id;
}

async function getStrategy(strategyId) {
  const response = await axios.get(`${BASE_URL}/strategies/${strategyId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategy retrieved successfully');
  console.log('📋 Strategy details:', {
    name: response.data.data.name,
    type: response.data.data.type,
    instrument: response.data.data.instrument,
    order_legs: response.data.data.order_legs.length,
    status: response.data.data.status
  });
}

async function updateStrategy(strategyId) {
  const updateData = {
    name: 'Updated Nifty Options Strategy',
    risk_management: {
      ...sampleStrategy.risk_management,
      exit_profit_amount: 6000,
      exit_loss_amount: 2500
    }
  };
  
  const response = await axios.put(`${BASE_URL}/strategies/${strategyId}`, updateData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategy updated successfully');
  console.log('📋 Updated name:', response.data.data.name);
  console.log('📋 Updated profit target:', response.data.data.risk_management.exit_profit_amount);
}

async function getAllStrategies() {
  const response = await axios.get(`${BASE_URL}/strategies`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategies retrieved successfully');
  console.log('📋 Total strategies:', response.data.data.pagination.total);
  console.log('📋 Current page:', response.data.data.pagination.current);
  
  if (response.data.data.strategies.length > 0) {
    console.log('📋 Strategy list:');
    response.data.data.strategies.forEach((strategy, index) => {
      console.log(`   ${index + 1}. ${strategy.name} (${strategy.status})`);
    });
  }
}

async function toggleStrategy(strategyId, action) {
  const response = await axios.post(`${BASE_URL}/strategies/${strategyId}/toggle`, 
    { action }, 
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  console.log(`✅ Strategy ${action}ed successfully`);
  console.log('📋 New status:', response.data.data.status);
}

async function getStrategyPerformance(strategyId) {
  const response = await axios.get(`${BASE_URL}/strategies/${strategyId}/performance`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategy performance retrieved');
  console.log('📋 Performance metrics:', {
    total_trades: response.data.data.total_trades,
    successful_trades: response.data.data.successful_trades,
    success_rate: response.data.data.success_rate + '%',
    net_pnl: response.data.data.net_pnl
  });
}

async function deleteStrategy(strategyId) {
  const response = await axios.delete(`${BASE_URL}/strategies/${strategyId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategy deleted successfully');
}

// Frontend integration example
function showFrontendIntegration() {
  console.log('\n🌐 Frontend Integration Example:');
  console.log(`
// 1. User fills strategy creation form
const strategyData = {
  name: 'My Nifty Strategy',
  type: 'time_based',
  instrument: 'TCS-EQUITY-NSE', // From instrument selection modal
  order_type: 'MIS',
  start_time: '09:15',
  square_off_time: '15:30',
  trading_days: { monday: true, tuesday: true, ... },
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

// 2. Validate strategy before creation
const validation = await fetch('/api/strategies/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify(strategyData)
});

// 3. Create strategy if validation passes
if (validation.valid) {
  const response = await fetch('/api/strategies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + userToken
    },
    body: JSON.stringify(strategyData)
  });
  
  const strategy = await response.json();
  console.log('Strategy created:', strategy.data._id);
}

// 4. Start strategy
await fetch('/api/strategies/' + strategyId + '/toggle', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({ action: 'start' })
});
  `);
}

// Run the test
testStrategyCreationFlow().then(() => {
  showFrontendIntegration();
});
