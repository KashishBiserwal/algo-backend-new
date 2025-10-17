// Test script to verify userId fix
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

// Test the fix
const testUserIdFix = async () => {
  try {
    console.log('🧪 Testing UserId Fix\n');

    const userId = '68ec9b9620eaf7987c8b9c00';
    const strategyId = '68f1fad2e5bb308dd0e99b3d';
    
    // Wait for controller initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1. First, stop the strategy if it's running
    console.log('🔍 Stopping strategy first...');
    const mockReqStop = {
      user: { id: userId },
      params: { strategyId: strategyId }
    };
    
    const mockResStop = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Stop Response Status: ${code}`);
          console.log('📤 Stop Response Data:', JSON.stringify(data, null, 2));
          return mockResStop;
        }
      })
    };
    
    await tradingEngineController.stopStrategyTradeEngine(mockReqStop, mockResStop);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. Now start the strategy
    console.log('\n🔍 Starting strategy...');
    const mockReqStart = {
      user: { id: userId },
      params: { strategyId: strategyId }
    };
    
    const mockResStart = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Start Response Status: ${code}`);
          console.log('📤 Start Response Data:', JSON.stringify(data, null, 2));
          return mockResStart;
        }
      })
    };
    
    await tradingEngineController.startStrategyTradeEngine(mockReqStart, mockResStart);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Now check the active strategies
    console.log('\n🔍 Checking active strategies...');
    const mockReqActive = {
      user: { id: userId }
    };
    
    const mockResActive = {
      status: (code) => ({
        json: (data) => {
          console.log(`📤 Active Strategies Response Status: ${code}`);
          console.log('📤 Active Strategies Response Data:', JSON.stringify(data, null, 2));
          
          // Check if isActiveInEngine is true
          if (data.success && data.data.strategies.length > 0) {
            const strategy = data.data.strategies[0];
            console.log(`\n🎯 Strategy Status Check:`);
            console.log(`   Status: ${strategy.status}`);
            console.log(`   isActiveInEngine: ${strategy.isActiveInEngine}`);
            console.log(`   Should show as running: ${strategy.status === 'active' && strategy.isActiveInEngine}`);
          }
          
          return mockResActive;
        }
      })
    };
    
    await tradingEngineController.getUserActiveStrategies(mockReqActive, mockResActive);

  } catch (error) {
    console.error('❌ Error testing userId fix:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Testing UserId Fix\n');
  
  await connectDB();
  await testUserIdFix();
  
  console.log('\n🎯 EXPECTED RESULT:');
  console.log('==================');
  console.log('✅ Strategy should start successfully');
  console.log('✅ isActiveInEngine should be true');
  console.log('✅ Frontend should show engine as Running');
  console.log('✅ Engine toggle should show ON');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
