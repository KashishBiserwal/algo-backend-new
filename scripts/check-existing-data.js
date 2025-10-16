const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function checkExistingData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    const count = await Instrument.countDocuments();
    console.log(`📊 Total instruments in database: ${count}`);
    
    if (count > 0) {
      // Get sample instruments
      const samples = await Instrument.find().limit(5).lean();
      console.log('📋 Sample instruments:');
      samples.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.symbol} (${inst.exchange}) - Angel: ${inst.brokers?.angel?.token || 'N/A'}, Dhan: ${inst.brokers?.dhan?.token || 'N/A'}`);
      });
      
      // Get statistics by broker
      const angelCount = await Instrument.countDocuments({ 'brokers.angel.token': { $exists: true, $ne: null } });
      const dhanCount = await Instrument.countDocuments({ 'brokers.dhan.token': { $exists: true, $ne: null } });
      
      console.log(`\n📊 Broker statistics:`);
      console.log(`   Angel One: ${angelCount} instruments`);
      console.log(`   Dhan: ${dhanCount} instruments`);
      
      // Get instrument types
      const types = await Instrument.aggregate([
        { $group: { _id: '$instrument_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log(`\n📊 Instrument types:`);
      types.forEach(type => {
        console.log(`   ${type._id}: ${type.count}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkExistingData();
