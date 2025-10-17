// Test script to check engine status update after stopping strategy
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

// Test engine status after stop
const testEngineStatusAfterStop = async () => {
  try {
    console.log('🔍 Testing Engine Status After Stop\n');

    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Get strategy from database
    const strategy = await Strategy.findById(strategyId);
    
    if (!strategy) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log(`📊 Strategy: ${strategy.name}`);
    console.log(`   Status in DB: ${strategy.status}`);
    console.log(`   Created by: ${strategy.created_by}`);
    
    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    await tradingEngine.initialize();
    
    // Check engine status before any operations
    console.log('\n🔍 Engine Status BEFORE operations:');
    const statusBefore = tradingEngine.getStatus();
    console.log(`   Is Running: ${statusBefore.isRunning}`);
    console.log(`   Active Strategies: ${statusBefore.activeStrategies}`);
    console.log(`   Connected Users: ${statusBefore.connectedUsers}`);
    
    // Check if strategy is active in engine
    const activeStrategiesBefore = tradingEngine.getActiveStrategiesForUser(strategy.created_by.toString());
    const isActiveBefore = activeStrategiesBefore.some(s => s.id === strategyId);
    console.log(`   Strategy active in engine: ${isActiveBefore}`);
    
    // Try to stop the strategy
    console.log('\n🔍 Attempting to stop strategy...');
    const stopResult = await tradingEngine.stopStrategy(strategyId);
    console.log('✅ Stop result:', JSON.stringify(stopResult, null, 2));
    
    // Check engine status after stop
    console.log('\n🔍 Engine Status AFTER stop:');
    const statusAfter = tradingEngine.getStatus();
    console.log(`   Is Running: ${statusAfter.isRunning}`);
    console.log(`   Active Strategies: ${statusAfter.activeStrategies}`);
    console.log(`   Connected Users: ${statusAfter.connectedUsers}`);
    
    // Check if strategy is still active in engine
    const activeStrategiesAfter = tradingEngine.getActiveStrategiesForUser(strategy.created_by.toString());
    const isActiveAfter = activeStrategiesAfter.some(s => s.id === strategyId);
    console.log(`   Strategy active in engine: ${isActiveAfter}`);
    
    // Check database status
    await strategy.reload();
    console.log(`   Strategy status in DB: ${strategy.status}`);
    
    // Test the controller endpoint simulation
    console.log('\n🔍 Testing Controller Endpoint Simulation...');
    
    // Simulate what the controller would return
    if (stopResult.success) {
      console.log('✅ Controller would return: Strategy stopped successfully');
    } else if (stopResult.error && stopResult.error.includes('not active')) {
      console.log('✅ Controller would return: Strategy is already stopped');
      // Update database status
      strategy.status = 'stopped';
      await strategy.save();
      console.log('✅ Database status updated to stopped');
    } else {
      console.log(`❌ Controller would return error: ${stopResult.error}`);
    }
    
    // Final status check
    console.log('\n🔍 Final Status Check:');
    const finalStatus = tradingEngine.getStatus();
    console.log(`   Engine Running: ${finalStatus.isRunning}`);
    console.log(`   Active Strategies: ${finalStatus.activeStrategies}`);
    console.log(`   Connected Users: ${finalStatus.connectedUsers}`);
    
    const finalActiveStrategies = tradingEngine.getActiveStrategiesForUser(strategy.created_by.toString());
    const finalIsActive = finalActiveStrategies.some(s => s.id === strategyId);
    console.log(`   Strategy active: ${finalIsActive}`);
    console.log(`   DB Status: ${strategy.status}`);

  } catch (error) {
    console.error('❌ Error testing engine status:', error);
  }
};

// Test the getUserActiveStrategies endpoint
const testGetUserActiveStrategies = async () => {
  try {
    console.log('\n🔍 Testing getUserActiveStrategies Endpoint\n');

    const userId = '68ec9b9620eaf7987c8b9c00'; // Strategy owner
    
    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    await tradingEngine.initialize();
    
    // Get active strategies from trading engine
    const activeStrategies = tradingEngine.getActiveStrategiesForUser(userId);
    console.log(`📊 Active strategies in engine: ${activeStrategies.length}`);
    
    // Get strategies from database
    const dbStrategies = await Strategy.find({
      created_by: userId,
      status: { $in: ['active', 'stopped', 'paused'] }
    }).select('name type broker status created_at updated_at');
    
    console.log(`📊 Strategies in database: ${dbStrategies.length}`);
    
    // Combine engine and database data (like the controller does)
    const strategies = dbStrategies.map(dbStrategy => {
      const engineStrategy = activeStrategies.find(es => es.id === dbStrategy._id.toString());
      
      return {
        id: dbStrategy._id,
        name: dbStrategy.name,
        type: dbStrategy.type,
        broker: dbStrategy.broker,
        status: dbStrategy.status,
        isActiveInEngine: !!engineStrategy,
        lastRun: engineStrategy?.lastRun || null,
        nextRun: engineStrategy?.nextRun || null,
        createdAt: dbStrategy.created_at,
        updatedAt: dbStrategy.updated_at
      };
    });
    
    console.log('\n📋 Combined Strategy Data:');
    strategies.forEach((strategy, index) => {
      console.log(`\n${index + 1}. ${strategy.name}`);
      console.log(`   ID: ${strategy.id}`);
      console.log(`   Status: ${strategy.status}`);
      console.log(`   Is Active in Engine: ${strategy.isActiveInEngine}`);
      console.log(`   Broker: ${strategy.broker}`);
    });
    
    // This is what the frontend would receive
    const frontendResponse = {
      success: true,
      data: {
        strategies,
        total: strategies.length,
        active: strategies.filter(s => s.status === 'active').length,
        stopped: strategies.filter(s => s.status === 'stopped').length,
        paused: strategies.filter(s => s.status === 'paused').length
      }
    };
    
    console.log('\n📤 Frontend Response:');
    console.log(JSON.stringify(frontendResponse, null, 2));

  } catch (error) {
    console.error('❌ Error testing getUserActiveStrategies:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Testing Engine Status Update After Stop\n');
  
  await connectDB();
  await testEngineStatusAfterStop();
  await testGetUserActiveStrategies();
  
  console.log('\n🎯 ANALYSIS:');
  console.log('============');
  console.log('1. Check if the engine status is updating correctly');
  console.log('2. Check if the database status is syncing properly');
  console.log('3. Check if the frontend is receiving the correct data');
  console.log('4. Check if the frontend is refreshing after stop operation');
  console.log('');
  console.log('💡 POTENTIAL ISSUES:');
  console.log('====================');
  console.log('1. Frontend not refreshing data after stop operation');
  console.log('2. Caching issues in frontend');
  console.log('3. Status not being updated in real-time');
  console.log('4. Engine status not being properly reflected in API responses');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
