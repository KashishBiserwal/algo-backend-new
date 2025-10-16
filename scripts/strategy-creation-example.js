const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/instruments';

// Example: How to create and execute a strategy using the multi-broker system
async function strategyCreationExample() {
  try {
    console.log('🚀 Strategy Creation & Execution Example\n');
    
    // Step 1: Get available multi-broker instruments for strategy creation
    console.log('1️⃣ Getting available instruments for strategy creation...');
    const instrumentsResponse = await axios.get(`${BASE_URL}/multi-broker?limit=10`);
    const availableInstruments = instrumentsResponse.data.data;
    
    console.log(`✅ Found ${availableInstruments.length} instruments available on both brokers`);
    
    if (availableInstruments.length === 0) {
      console.log('❌ No multi-broker instruments available for strategy creation');
      return;
    }
    
    // Step 2: User selects an instrument (e.g., TCS)
    const selectedInstrument = availableInstruments[0];
    console.log(`\n2️⃣ User selected instrument: ${selectedInstrument.symbol} (${selectedInstrument.exchange})`);
    console.log(`   Universal ID: ${selectedInstrument.id}`);
    console.log(`   Available on: Angel One & Dhan`);
    
    // Step 3: User creates a strategy
    const strategy = {
      id: 'strategy_001',
      name: 'TCS Buy Strategy',
      symbol: selectedInstrument.id, // Use universal ID
      action: 'BUY',
      quantity: 1,
      price: 3500,
      userBroker: 'angel' // User's preferred broker
    };
    
    console.log(`\n3️⃣ Created strategy:`, strategy);
    
    // Step 4: Validate strategy for user's broker
    console.log(`\n4️⃣ Validating strategy for ${strategy.userBroker}...`);
    const validationResponse = await axios.post(`${BASE_URL}/validate-strategy`, {
      symbol: strategy.symbol,
      broker: strategy.userBroker
    });
    
    if (validationResponse.data.data.valid) {
      console.log('✅ Strategy is valid for execution');
      const instrumentData = validationResponse.data.data.instrument;
      console.log(`   Broker token: ${instrumentData.token}`);
      console.log(`   Lot size: ${instrumentData.lot_size}`);
      console.log(`   Tick size: ${instrumentData.tick_size}`);
      
      // Step 5: Execute the strategy
      console.log(`\n5️⃣ Executing strategy on ${strategy.userBroker}...`);
      const executionResult = await executeStrategy(strategy, instrumentData);
      console.log('✅ Strategy executed successfully:', executionResult);
      
    } else {
      console.log('❌ Strategy validation failed:', validationResponse.data.data.error);
    }
    
    // Step 6: Show how to switch brokers
    console.log(`\n6️⃣ Switching to Dhan broker...`);
    const dhanValidationResponse = await axios.post(`${BASE_URL}/validate-strategy`, {
      symbol: strategy.symbol,
      broker: 'dhan'
    });
    
    if (dhanValidationResponse.data.data.valid) {
      console.log('✅ Strategy is also valid on Dhan');
      const dhanInstrumentData = dhanValidationResponse.data.data.instrument;
      console.log(`   Dhan token: ${dhanInstrumentData.token}`);
      
      // Execute on Dhan
      const dhanExecutionResult = await executeStrategy({
        ...strategy,
        userBroker: 'dhan'
      }, dhanInstrumentData);
      console.log('✅ Strategy executed on Dhan:', dhanExecutionResult);
    }
    
    console.log('\n🎉 Strategy creation and execution example completed!');
    console.log('\n📋 Key Benefits:');
    console.log('   ✅ Universal symbol system works across brokers');
    console.log('   ✅ Automatic broker token resolution');
    console.log('   ✅ Strategy validation before execution');
    console.log('   ✅ Easy broker switching');
    console.log('   ✅ No hardcoded broker tokens in strategies');
    
  } catch (error) {
    console.error('❌ Strategy example failed:', error.response?.data || error.message);
  }
}

// Simulate strategy execution
async function executeStrategy(strategy, instrumentData) {
  // This would integrate with your actual trading engine
  const order = {
    symbol: instrumentData.symbol,
    token: instrumentData.token,
    exchange: instrumentData.exchange,
    action: strategy.action,
    quantity: strategy.quantity * instrumentData.lot_size,
    price: strategy.price,
    broker: strategy.userBroker,
    timestamp: new Date().toISOString()
  };
  
  console.log(`   📋 Order details:`, order);
  
  // Simulate successful order placement
  return {
    orderId: `ORD_${Date.now()}`,
    status: 'SUCCESS',
    message: `Order placed successfully on ${strategy.userBroker}`,
    order: order
  };
}

// Example: Frontend integration
function frontendIntegrationExample() {
  console.log('\n🌐 Frontend Integration Example:');
  console.log(`
// 1. Load popular instruments for modal tabs
const popularInstruments = await fetch('/api/instruments/popular');
// Returns: { options: [], indices: [], equity: [TCS], futures: [] }

// 2. User selects instrument from modal
const selectedInstrument = {
  id: 'TCS-EQUITY-NSE',
  symbol: 'TCS',
  name: 'TATA CONSULTANCY SERVICES LTD'
};

// 3. Create strategy with universal ID
const strategy = {
  symbol: selectedInstrument.id, // Universal ID
  action: 'BUY',
  quantity: 1,
  userBroker: 'angel'
};

// 4. Validate before execution
const validation = await fetch('/api/instruments/validate-strategy', {
  method: 'POST',
  body: JSON.stringify({
    symbol: strategy.symbol,
    broker: strategy.userBroker
  })
});

// 5. Execute with resolved broker token
if (validation.valid) {
  const order = {
    symbol: validation.instrument.symbol,
    token: validation.instrument.token, // Broker-specific token
    action: strategy.action,
    quantity: strategy.quantity * validation.instrument.lot_size
  };
  // Send to trading engine
}
  `);
}

strategyCreationExample().then(() => {
  frontendIntegrationExample();
});
