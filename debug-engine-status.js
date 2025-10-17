// Debug script to check engine status issue
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

// Test the getUserActiveStrategies endpoint
const testGetUserActiveStrategies = async () => {
  try {
    console.log('🧪 Testing getUserActiveStrategies Endpoint\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Wait for controller initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a mock request object
    const mockReq = {
      user: { id: userId }
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
    
    console.log('🔍 Testing getUserActiveStrategies controller method...');
    console.log(`📊 User ID: ${userId}`);
    
    // Call the actual controller method
    await tradingEngineController.getUserActiveStrategies(mockReq, mockRes);

  } catch (error) {
    console.error('❌ Error testing getUserActiveStrategies:', error);
  }
};

// Test trading engine directly
const testTradingEngineDirectly = async () => {
  try {
    console.log('\n🧪 Testing Trading Engine Directly\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    await tradingEngine.initialize();
    
    console.log('✅ Trading engine initialized');
    
    // Get active strategies for user
    const activeStrategies = tradingEngine.getActiveStrategiesForUser(userId);
    console.log(`📊 Active strategies for user: ${activeStrategies.length}`);
    
    activeStrategies.forEach((strategy, index) => {
      console.log(`\n${index + 1}. Strategy:`);
      console.log(`   ID: ${strategy.id}`);
      console.log(`   Name: ${strategy.name}`);
      console.log(`   Status: ${strategy.status}`);
      console.log(`   Is Active: ${strategy.isActive}`);
    });
    
    // Check if our specific strategy is in the active list
    const ourStrategy = activeStrategies.find(s => s.id === strategyId);
    console.log(`\n🔍 Our strategy (${strategyId}) in active list: ${!!ourStrategy}`);
    
    if (ourStrategy) {
      console.log('✅ Strategy found in active list:', {
        id: ourStrategy.id,
        name: ourStrategy.name,
        status: ourStrategy.status,
        isActive: ourStrategy.isActive
      });
    } else {
      console.log('❌ Strategy not found in active list');
    }

  } catch (error) {
    console.error('❌ Error testing trading engine directly:', error);
  }
};

// Test the complete flow
const testCompleteFlow = async () => {
  try {
    console.log('\n🧪 Testing Complete Flow\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Wait for controller initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1. Get strategy from database
    const strategy = await Strategy.findById(strategyId);
    console.log(`📊 Strategy: ${strategy.name}`);
    console.log(`📊 Strategy status: ${strategy.status}`);
    console.log(`📊 Strategy created_by: ${strategy.created_by}`);
    
    // 2. Get active strategies from trading engine
    const activeStrategies = tradingEngine.getActiveStrategiesForUser(userId);
    console.log(`📊 Active strategies in engine: ${activeStrategies.length}`);
    
    // 3. Check if our strategy is in the active list
    const engineStrategy = activeStrategies.find(es => es.id === strategyId);
    console.log(`📊 Strategy in engine: ${!!engineStrategy}`);
    
    // 4. Simulate the controller logic
    const isActiveInEngine = !!engineStrategy;
    console.log(`📊 isActiveInEngine: ${isActiveInEngine}`);
    
    // 5. Check the final result
    const finalResult = {
      id: strategy._id,
      name: strategy.name,
      status: strategy.status,
      isActiveInEngine: isActiveInEngine,
      shouldShowAsRunning: strategy.status === 'active' && isActiveInEngine
    };
    
    console.log('\n📤 Final Result:');
    console.log(JSON.stringify(finalResult, null, 2));
    
    if (finalResult.shouldShowAsRunning) {
      console.log('✅ Strategy should show as running in frontend');
    } else {
      console.log('❌ Strategy will not show as running in frontend');
      console.log(`   Reason: status=${strategy.status}, isActiveInEngine=${isActiveInEngine}`);
    }

  } catch (error) {
    console.error('❌ Error in complete flow:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Debugging Engine Status Issue\n');
  
  await connectDB();
  await testGetUserActiveStrategies();
  await testTradingEngineDirectly();
  await testCompleteFlow();
  
  console.log('\n🎯 ANALYSIS:');
  console.log('============');
  console.log('1. Check if strategy is in trading engine active list');
  console.log('2. Check if isActiveInEngine is being set correctly');
  console.log('3. Check if frontend is receiving the correct data');
  console.log('4. Check if there are any ID format mismatches');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
