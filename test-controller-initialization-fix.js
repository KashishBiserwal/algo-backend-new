// Test script to verify controller initialization fix
const mongoose = require('mongoose');
require('dotenv').config();

// Import the controller (this will trigger the initialization)
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

// Test the controller method after initialization
const testControllerAfterInitialization = async () => {
  try {
    console.log('🧪 Testing Controller After Initialization\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Wait a moment for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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

// Main execution
const main = async () => {
  console.log('🧪 Testing Controller Initialization Fix\n');
  
  await connectDB();
  await testControllerAfterInitialization();
  
  console.log('\n🎯 EXPECTED RESULT:');
  console.log('==================');
  console.log('✅ Trading engine should be initialized when controller loads');
  console.log('✅ "No broker client found for user" error should be resolved');
  console.log('✅ Strategy should start successfully');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
