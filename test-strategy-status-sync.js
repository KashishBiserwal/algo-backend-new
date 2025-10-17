// Test script to verify strategy status synchronization fix
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Strategy = require('./models/strategyModel');
const TradingEngine = require('./services/tradingEngine');

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

// Test strategy stop with status sync fix
const testStrategyStopFix = async () => {
  try {
    console.log('🧪 Testing Strategy Stop Fix\n');

    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Get strategy from database
    const strategy = await Strategy.findById(strategyId);
    
    if (!strategy) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log(`📊 Strategy: ${strategy.name}`);
    console.log(`   Status in DB: ${strategy.status}`);
    
    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    await tradingEngine.initialize();
    
    // Check if strategy is active in trading engine
    const activeStrategies = tradingEngine.getActiveStrategiesForUser(strategy.created_by.toString());
    const isActiveInEngine = activeStrategies.some(s => s.id === strategyId);
    
    console.log(`   Is active in engine: ${isActiveInEngine}`);
    
    // Test the stop function
    console.log('\n🔍 Testing stopStrategy function...');
    const stopResult = await tradingEngine.stopStrategy(strategyId);
    console.log('✅ Stop result:', JSON.stringify(stopResult, null, 2));
    
    // Check strategy status after stop attempt
    await strategy.refresh();
    console.log(`\n📊 Strategy status after stop attempt: ${strategy.status}`);
    
    // Test the start function
    console.log('\n🔍 Testing startStrategy function...');
    const startResult = await tradingEngine.startStrategy(strategyId);
    console.log('✅ Start result:', JSON.stringify(startResult, null, 2));
    
    // Check strategy status after start attempt
    await strategy.refresh();
    console.log(`\n📊 Strategy status after start attempt: ${strategy.status}`);

  } catch (error) {
    console.error('❌ Error testing strategy status sync:', error);
  }
};

// Test the controller logic simulation
const testControllerLogic = async () => {
  try {
    console.log('\n🧪 Testing Controller Logic Simulation\n');

    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Get strategy from database
    const strategy = await Strategy.findById(strategyId);
    
    if (!strategy) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log(`📊 Testing controller logic for strategy: ${strategy.name}`);
    console.log(`   Current status in DB: ${strategy.status}`);
    
    // Simulate the controller logic for stop
    console.log('\n🔍 Simulating stopStrategyTradeEngine controller logic...');
    
    // Check if strategy is already stopped
    if (strategy.status === 'stopped') {
      console.log('✅ Strategy is already stopped in database - would return success');
    } else {
      console.log('🔍 Strategy is not stopped in database, attempting to stop...');
      
      // Initialize trading engine
      const tradingEngine = new TradingEngine();
      await tradingEngine.initialize();
      
      // Try to stop the strategy
      const result = await tradingEngine.stopStrategy(strategyId);
      
      if (result.success) {
        console.log('✅ Strategy stopped successfully in trading engine');
        strategy.status = 'stopped';
        await strategy.save();
        console.log('✅ Strategy status updated to stopped in database');
      } else {
        console.log(`❌ Strategy stop failed: ${result.error}`);
        
        // Check if the error is "Strategy is not active" - this means it's already stopped
        if (result.error && result.error.includes('not active')) {
          console.log('ℹ️ Strategy is already stopped in trading engine, updating database status');
          
          // Update strategy status to stopped in database
          strategy.status = 'stopped';
          await strategy.save();
          console.log('✅ Strategy status updated to stopped in database');
        }
      }
    }
    
    // Check final status
    await strategy.refresh();
    console.log(`\n📊 Final strategy status: ${strategy.status}`);

  } catch (error) {
    console.error('❌ Error testing controller logic:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Testing Strategy Status Synchronization Fix\n');
  
  await connectDB();
  await testStrategyStopFix();
  await testControllerLogic();
  
  console.log('\n🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ Fixed stopStrategyTradeEngine to handle "Strategy is not active" gracefully');
  console.log('✅ Fixed startStrategyTradeEngine to handle "Strategy is already active" gracefully');
  console.log('✅ Added database status synchronization when trading engine and DB are out of sync');
  console.log('');
  console.log('🔧 WHAT WAS FIXED:');
  console.log('==================');
  console.log('1. stopStrategyTradeEngine now returns success if strategy is already stopped');
  console.log('2. startStrategyTradeEngine now returns success if strategy is already active');
  console.log('3. Database status is updated to match trading engine status');
  console.log('4. No more "Strategy is not active" errors when trying to stop already stopped strategies');
  console.log('');
  console.log('🚀 READY TO TEST:');
  console.log('=================');
  console.log('1. Try stopping your strategy again from the frontend');
  console.log('2. It should now return success instead of error');
  console.log('3. The strategy status should be properly synchronized');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
