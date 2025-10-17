// Debug script to check broker connections and trading engine setup
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Strategy = require('./models/strategyModel');
const BrokerConnection = require('./models/brokerConnectionModel');
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

// Debug broker connections
const debugBrokerConnections = async () => {
  try {
    console.log('🔍 Debugging Broker Connections\n');

    // Find the strategy that's failing
    const strategy = await Strategy.findById('68f1fad2e5bb308dd0e99b3d');
    
    if (!strategy) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log(`📊 Strategy: ${strategy.name}`);
    console.log(`   ID: ${strategy._id}`);
    console.log(`   Created by: ${strategy.created_by}`);
    console.log(`   Broker: ${strategy.broker}`);
    console.log(`   Status: ${strategy.status}`);
    
    // Check broker connections for this user
    const connections = await BrokerConnection.find({
      userId: strategy.created_by
    });
    
    console.log(`\n🔍 Broker Connections for user ${strategy.created_by}:`);
    console.log(`   Total connections: ${connections.length}`);
    
    if (connections.length === 0) {
      console.log('❌ No broker connections found for this user');
      console.log('💡 User needs to connect a broker first');
      return;
    }
    
    connections.forEach((conn, index) => {
      console.log(`\n   Connection ${index + 1}:`);
      console.log(`     Broker: ${conn.broker}`);
      console.log(`     Is Connected: ${conn.isConnected}`);
      console.log(`     Is Active: ${conn.isActive}`);
      console.log(`     Connected At: ${conn.connectedAt}`);
      console.log(`     Last Used: ${conn.lastUsedAt}`);
      
      if (conn.broker === 'dhan') {
        console.log(`     Dhan Client ID: ${conn.dhanClientId ? '✅ Set' : '❌ Missing'}`);
        console.log(`     Dhan Access Token: ${conn.dhanAccessToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`     Expires At: ${conn.expiresAt}`);
        console.log(`     Last Error: ${conn.lastError ? JSON.stringify(conn.lastError) : 'None'}`);
      }
    });
    
    // Check if there's a connection for the strategy's broker
    const strategyBrokerConnection = connections.find(conn => 
      conn.broker === strategy.broker && conn.isConnected && conn.isActive
    );
    
    if (!strategyBrokerConnection) {
      console.log(`\n❌ No active connection found for broker: ${strategy.broker}`);
      console.log('💡 User needs to connect the Dhan broker first');
      
      // Show what connections are available
      const availableConnections = connections.filter(conn => conn.isConnected && conn.isActive);
      if (availableConnections.length > 0) {
        console.log('\n📋 Available active connections:');
        availableConnections.forEach(conn => {
          console.log(`   - ${conn.broker} (connected at ${conn.connectedAt})`);
        });
      }
    } else {
      console.log(`\n✅ Found active connection for broker: ${strategy.broker}`);
      console.log(`   Connection ID: ${strategyBrokerConnection._id}`);
      console.log(`   Connected at: ${strategyBrokerConnection.connectedAt}`);
    }

  } catch (error) {
    console.error('❌ Error debugging broker connections:', error);
  }
};

// Test trading engine initialization
const testTradingEngineInitialization = async () => {
  try {
    console.log('\n🧪 Testing Trading Engine Initialization\n');
    
    const tradingEngine = new TradingEngine();
    
    // Initialize the trading engine
    console.log('🔍 Initializing trading engine...');
    const initResult = await tradingEngine.initialize();
    console.log('✅ Initialization result:', JSON.stringify(initResult, null, 2));
    
    // Check engine status
    const status = tradingEngine.getStatus();
    console.log('\n📊 Trading Engine Status:');
    console.log(`   Is Running: ${status.isRunning}`);
    console.log(`   Active Strategies: ${status.activeStrategies}`);
    console.log(`   Connected Users: ${status.connectedUsers}`);
    console.log(`   Total Order Queues: ${status.totalOrderQueues}`);
    
    // Check user clients
    console.log('\n🔍 User Clients in Trading Engine:');
    if (status.connectedUsers === 0) {
      console.log('❌ No user clients found in trading engine');
      console.log('💡 This means no broker connections were initialized');
    } else {
      console.log(`✅ Found ${status.connectedUsers} user clients`);
    }
    
    // Try to add the strategy manually
    const strategy = await Strategy.findById('68f1fad2e5bb308dd0e99b3d');
    if (strategy) {
      console.log('\n🔍 Testing strategy addition...');
      const addResult = await tradingEngine.addStrategy(strategy);
      console.log('✅ Add strategy result:', JSON.stringify(addResult, null, 2));
    }

  } catch (error) {
    console.error('❌ Error testing trading engine:', error);
  }
};

// Check all broker connections in database
const checkAllBrokerConnections = async () => {
  try {
    console.log('\n🔍 Checking All Broker Connections in Database\n');
    
    const allConnections = await BrokerConnection.find({});
    console.log(`📊 Total broker connections in database: ${allConnections.length}`);
    
    if (allConnections.length === 0) {
      console.log('❌ No broker connections found in database');
      console.log('💡 Users need to connect brokers first');
      return;
    }
    
    // Group by user
    const connectionsByUser = {};
    allConnections.forEach(conn => {
      const userId = conn.userId.toString();
      if (!connectionsByUser[userId]) {
        connectionsByUser[userId] = [];
      }
      connectionsByUser[userId].push(conn);
    });
    
    console.log(`📊 Connections by user:`);
    Object.entries(connectionsByUser).forEach(([userId, userConnections]) => {
      console.log(`\n   User ${userId}:`);
      userConnections.forEach(conn => {
        console.log(`     - ${conn.broker}: ${conn.isConnected ? '✅ Connected' : '❌ Disconnected'} (${conn.isActive ? 'Active' : 'Inactive'})`);
      });
    });
    
    // Check for active Dhan connections
    const activeDhanConnections = allConnections.filter(conn => 
      conn.broker === 'dhan' && conn.isConnected && conn.isActive
    );
    
    console.log(`\n📊 Active Dhan connections: ${activeDhanConnections.length}`);
    activeDhanConnections.forEach(conn => {
      console.log(`   - User ${conn.userId}: Connected at ${conn.connectedAt}`);
    });

  } catch (error) {
    console.error('❌ Error checking all broker connections:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Debugging Broker Connection Issues\n');
  
  await connectDB();
  await debugBrokerConnections();
  await testTradingEngineInitialization();
  await checkAllBrokerConnections();
  
  console.log('\n🎯 DIAGNOSIS:');
  console.log('=============');
  console.log('The "No broker connection found" error occurs when:');
  console.log('1. User has not connected any broker');
  console.log('2. User\'s broker connection is not active');
  console.log('3. Trading engine has not initialized user clients');
  console.log('4. Strategy broker does not match connected broker');
  console.log('');
  console.log('💡 SOLUTIONS:');
  console.log('=============');
  console.log('1. Go to Brokers page and connect Dhan broker');
  console.log('2. Make sure the connection is active and working');
  console.log('3. Restart the backend server to reinitialize trading engine');
  console.log('4. Try deploying the strategy again');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the test
main().catch(console.error);
