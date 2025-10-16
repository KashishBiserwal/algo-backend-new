const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function fixDhanData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Check current state
    const totalInstruments = await Instrument.countDocuments();
    const dhanCount = await Instrument.countDocuments({ 'brokers.dhan.token': { $exists: true, $ne: null } });
    const angelCount = await Instrument.countDocuments({ 'brokers.angel.token': { $exists: true, $ne: null } });
    const bothCount = await Instrument.countDocuments({ 
      'brokers.dhan.token': { $exists: true, $ne: null },
      'brokers.angel.token': { $exists: true, $ne: null }
    });
    
    console.log(`📊 Current database stats:`);
    console.log(`   Total instruments: ${totalInstruments}`);
    console.log(`   Angel One instruments: ${angelCount}`);
    console.log(`   Dhan instruments: ${dhanCount}`);
    console.log(`   Both brokers: ${bothCount}`);
    
    // Check instruments without Dhan data
    const withoutDhan = await Instrument.countDocuments({ 
      'brokers.dhan.token': { $exists: false } 
    });
    console.log(`   Without Dhan data: ${withoutDhan}`);
    
    // Get sample instruments to see the structure
    console.log('\n📋 Sample instruments:');
    const samples = await Instrument.find().limit(5).lean();
    samples.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.symbol} (${inst.exchange})`);
      console.log(`   Angel: ${inst.brokers?.angel?.token || 'N/A'}`);
      console.log(`   Dhan: ${inst.brokers?.dhan?.token || 'N/A'}`);
      console.log(`   ID: ${inst._id}`);
    });
    
    // Check if we have any instruments with both brokers
    const bothBrokers = await Instrument.find({ 
      'brokers.dhan.token': { $exists: true, $ne: null },
      'brokers.angel.token': { $exists: true, $ne: null }
    }).limit(3).lean();
    
    if (bothBrokers.length > 0) {
      console.log('\n✅ Instruments with both brokers:');
      bothBrokers.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.symbol} (${inst.exchange})`);
        console.log(`   Angel: ${inst.brokers.angel.token}`);
        console.log(`   Dhan: ${inst.brokers.dhan.token}`);
      });
    } else {
      console.log('\n❌ No instruments found with both brokers');
    }
    
    // Check instrument types distribution
    const types = await Instrument.aggregate([
      { $group: { _id: '$instrument_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`\n📊 Instrument types:`);
    types.forEach(type => {
      console.log(`   ${type._id}: ${type.count}`);
    });
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

fixDhanData();
