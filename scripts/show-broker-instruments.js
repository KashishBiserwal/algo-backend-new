const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function showBrokerInstruments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Angel One instruments
    console.log('\n🔵 ANGEL ONE INSTRUMENTS:');
    const angelInstruments = await Instrument.find({ 
      'brokers.angel.token': { $exists: true, $ne: null } 
    }).limit(10).lean();
    
    angelInstruments.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.symbol} (${inst.exchange}) - Token: ${inst.brokers.angel.token}`);
    });
    
    // Dhan instruments
    console.log('\n🟢 DHAN INSTRUMENTS:');
    const dhanInstruments = await Instrument.find({ 
      'brokers.dhan.token': { $exists: true, $ne: null } 
    }).limit(10).lean();
    
    dhanInstruments.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.symbol} (${inst.exchange}) - Token: ${inst.brokers.dhan.token}`);
    });
    
    // Check for popular symbols in both brokers
    console.log('\n🔍 CHECKING FOR POPULAR SYMBOLS:');
    const popularSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK'];
    
    for (const symbol of popularSymbols) {
      const angelMatch = await Instrument.findOne({ 
        symbol: { $regex: symbol, $options: 'i' },
        'brokers.angel.token': { $exists: true, $ne: null }
      });
      
      const dhanMatch = await Instrument.findOne({ 
        symbol: { $regex: symbol, $options: 'i' },
        'brokers.dhan.token': { $exists: true, $ne: null }
      });
      
      console.log(`${symbol}:`);
      console.log(`  Angel: ${angelMatch ? `${angelMatch.symbol} (${angelMatch.brokers.angel.token})` : 'Not found'}`);
      console.log(`  Dhan: ${dhanMatch ? `${dhanMatch.symbol} (${dhanMatch.brokers.dhan.token})` : 'Not found'}`);
    }
    
    // Get statistics by exchange
    console.log('\n📊 BY EXCHANGE:');
    const angelByExchange = await Instrument.aggregate([
      { $match: { 'brokers.angel.token': { $exists: true, $ne: null } } },
      { $group: { _id: '$exchange', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const dhanByExchange = await Instrument.aggregate([
      { $match: { 'brokers.dhan.token': { $exists: true, $ne: null } } },
      { $group: { _id: '$exchange', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('Angel One by exchange:');
    angelByExchange.forEach(ex => {
      console.log(`  ${ex._id}: ${ex.count}`);
    });
    
    console.log('Dhan by exchange:');
    dhanByExchange.forEach(ex => {
      console.log(`  ${ex._id}: ${ex.count}`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

showBrokerInstruments();
