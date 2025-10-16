const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('MongoDB URL:', process.env.MONGO_URL || 'mongodb://localhost:27017/algo-auth');
    
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/algo-auth');
    console.log('✅ MongoDB connected successfully');
    
    // Test a simple operation
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));
    
    // Test insert/read
    const testCollection = db.collection('test');
    await testCollection.insertOne({ test: 'data', timestamp: new Date() });
    console.log('✅ Test insert successful');
    
    const result = await testCollection.findOne({ test: 'data' });
    console.log('✅ Test read successful:', result);
    
    await testCollection.deleteOne({ test: 'data' });
    console.log('✅ Test delete successful');
    
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

testConnection();
