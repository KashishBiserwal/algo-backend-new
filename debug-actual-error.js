// Debug script to check the actual error from frontend perspective
const mongoose = require('mongoose');
require('dotenv').config();

// Import models and controllers
const Strategy = require('./models/strategyModel');
const BrokerConnection = require('./models/brokerConnectionModel');
const TradingEngine = require('./services/tradingEngine');
const tradingEngineController = require('./controllers/tradingEngineController');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/algodb');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Test the actual controller method that the frontend calls
const testActualControllerMethod = async () => {
  try {
    console.log('🧪 Testing Actual Controller Method\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Create a mock request object
    const mockReq = {
      user: { id: userId },
      params: { strategyId: strategyId }
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Response Status: ${code}`);
          console.log('📤 Response Data:', JSON.stringify(data, null, 2));
          return mockRes;
        }
      })
    };
    
    console.log('🔍 Testing startStrategyTradeEngine controller method...');
    console.log(`📊 User ID: ${userId}`);
    console.log(`📊 Strategy ID: ${strategyId}`);
    
    // Call the actual controller method
    await tradingEngineController.startStrategyTradeEngine(mockReq, mockRes);

  } catch (error) {
    console.error('❌ Error testing controller method:', error);
  }
};

// Test the trading engine directly
const testTradingEngineDirectly = async () => {
  try {
    console.log('\n🧪 Testing Trading Engine Directly\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    await tradingEngine.initialize();
    
    console.log('✅ Trading engine initialized');
    console.log(`📊 User clients map size: ${tradingEngine.userClients.size}`);
    console.log(`📊 Has user client: ${tradingEngine.userClients.has(userId)}`);
    
    if (tradingEngine.userClients.has(userId)) {
      const userClient = tradingEngine.userClients.get(userId);
      console.log(`📊 User client type: ${typeof userClient}`);
      console.log(`📊 User client keys: ${Object.keys(userClient || {})}`);
    }
    
    // Test startStrategy method
    console.log('\n🔍 Testing startStrategy method...');
    const result = await tradingEngine.startStrategy(strategyId);
    console.log('✅ Start result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error testing trading engine directly:', error);
  }
};

// Check if there are multiple trading engine instances
const checkTradingEngineInstances = async () => {
  try {
    console.log('\n🧪 Checking Trading Engine Instances\n');

    // Check if there's a global trading engine instance
    console.log('🔍 Checking for global trading engine instance...');
    
    // Try to access the trading engine from the controller
    const tradingEngine = require('./services/tradingEngine');
    console.log(`📊 Trading engine type: ${typeof tradingEngine}`);
    
    // Check if it's a class or instance
    if (typeof tradingEngine === 'function') {
      console.log('📊 Trading engine is a class, creating new instance...');
      const instance = new tradingEngine();
      await instance.initialize();
      console.log(`📊 New instance user clients: ${instance.userClients.size}`);
    } else {
      console.log('📊 Trading engine is an instance');
      console.log(`📊 User clients: ${tradingEngine.userClients?.size || 'undefined'}`);
    }

  } catch (error) {
    console.error('❌ Error checking trading engine instances:', error);
  }
};

// Test the specific error scenario
const testSpecificErrorScenario = async () => {
  try {
    console.log('\n🧪 Testing Specific Error Scenario\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Check strategy details
    const strategy = await Strategy.findById(strategyId);
    if (!strategy) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log(`📊 Strategy: ${strategy.name}`);
    console.log(`📊 Strategy broker: ${strategy.broker}`);
    console.log(`📊 Strategy created_by: ${strategy.created_by}`);
    
    // Check broker connection
    const connection = await BrokerConnection.findOne({
      userId: userId,
      broker: strategy.broker,
      isConnected: true
    });
    
    if (!connection) {
      console.log(`❌ No ${strategy.broker} broker connection found`);
      return;
    }
    
    console.log(`✅ Broker connection found: ${connection.broker}`);
    console.log(`📊 Connection isConnected: ${connection.isConnected}`);
    console.log(`📊 Connection isActive: ${connection.isActive}`);
    
    // Test the exact scenario from the controller
    console.log('\n🔍 Testing exact controller scenario...');
    
    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    await tradingEngine.initialize();
    
    // Check if user client exists
    if (!tradingEngine.userClients.has(userId)) {
      console.log(`🔧 Initializing broker client for user ${userId}`);
      await tradingEngine.initializeUserClient(userId, connection);
    } else {
      console.log(`✅ User client already exists for user ${userId}`);
    }
    
    // Now test startStrategy
    console.log('\n🔍 Testing startStrategy...');
    const result = await tradingEngine.startStrategy(strategyId);
    console.log('✅ Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error in specific scenario:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Debugging Actual Error from Frontend\n');
  
  await connectDB();
  await testActualControllerMethod();
  await testTradingEngineDirectly();
  await checkTradingEngineInstances();
  await testSpecificErrorScenario();
  
  console.log('\n🎯 ANALYSIS:');
  console.log('============');
  console.log('1. Check if the controller method is working correctly');
  console.log('2. Check if there are multiple trading engine instances');
  console.log('3. Check if the error is happening in a different context');
  console.log('4. Check if the frontend is calling a different endpoint');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
