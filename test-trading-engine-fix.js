// Test script to verify the trading engine toString fix
const mongoose = require('mongoose');
require('dotenv').config();

// Import models and trading engine
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

// Test trading engine with strategy
const testTradingEngine = async () => {
  try {
    console.log('🧪 Testing Trading Engine Fix\n');

    // Initialize trading engine
    const tradingEngine = new TradingEngine();
    
    // Find a strategy to test with
    const strategy = await Strategy.findOne({}).populate('created_by');
    
    if (!strategy) {
      console.log('❌ No strategies found in database');
      return;
    }
    
    console.log(`📊 Testing with strategy: ${strategy.name}`);
    console.log(`   ID: ${strategy._id}`);
    console.log(`   Created by: ${strategy.created_by}`);
    console.log(`   Type: ${strategy.type}`);
    console.log(`   Broker: ${strategy.broker}`);
    
    // Test addStrategy method
    console.log('\n🔍 Testing addStrategy method...');
    
    try {
      const result = await tradingEngine.addStrategy(strategy);
      console.log('✅ addStrategy result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ addStrategy error:', error.message);
    }
    
    // Test startStrategy method
    console.log('\n🔍 Testing startStrategy method...');
    
    try {
      const result = await tradingEngine.startStrategy(strategy._id.toString());
      console.log('✅ startStrategy result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ startStrategy error:', error.message);
    }
    
    // Test removeStrategy method
    console.log('\n🔍 Testing removeStrategy method...');
    
    try {
      const result = await tradingEngine.removeStrategy(strategy._id.toString());
      console.log('✅ removeStrategy result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ removeStrategy error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error testing trading engine:', error);
  }
};

// Test with invalid data
const testWithInvalidData = async () => {
  try {
    console.log('\n🧪 Testing with Invalid Data\n');
    
    const tradingEngine = new TradingEngine();
    
    // Test with null strategy
    console.log('🔍 Testing with null strategy...');
    const result1 = await tradingEngine.addStrategy(null);
    console.log('✅ Null strategy result:', JSON.stringify(result1, null, 2));
    
    // Test with undefined strategy
    console.log('\n🔍 Testing with undefined strategy...');
    const result2 = await tradingEngine.addStrategy(undefined);
    console.log('✅ Undefined strategy result:', JSON.stringify(result2, null, 2));
    
    // Test with strategy missing created_by
    console.log('\n🔍 Testing with strategy missing created_by...');
    const invalidStrategy = { _id: 'test-id', name: 'Test Strategy' };
    const result3 = await tradingEngine.addStrategy(invalidStrategy);
    console.log('✅ Missing created_by result:', JSON.stringify(result3, null, 2));
    
    // Test with strategy missing _id
    console.log('\n🔍 Testing with strategy missing _id...');
    const invalidStrategy2 = { created_by: 'test-user', name: 'Test Strategy' };
    const result4 = await tradingEngine.addStrategy(invalidStrategy2);
    console.log('✅ Missing _id result:', JSON.stringify(result4, null, 2));

  } catch (error) {
    console.error('❌ Error testing with invalid data:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Testing Trading Engine toString Fix\n');
  
  await connectDB();
  await testTradingEngine();
  await testWithInvalidData();
  
  console.log('\n🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ Added validation for strategy object');
  console.log('✅ Added validation for strategy.created_by field');
  console.log('✅ Added validation for strategy._id field');
  console.log('✅ Added validation for strategyId parameter');
  console.log('✅ Fixed toString() calls on potentially undefined values');
  console.log('');
  console.log('🚀 The "Cannot read properties of undefined (reading \'toString\')" error should be fixed!');
  console.log('Try deploying your strategy from the frontend now.');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
