const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function updatePopularWithTokens() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Find instruments that have both Angel and Dhan tokens
    console.log('🔄 Finding instruments with both broker tokens...');
    
    const instrumentsWithBothTokens = await Instrument.find({
      'brokers.angel.token': { $exists: true, $ne: null },
      'brokers.dhan.token': { $exists: true, $ne: null }
    }).limit(10);
    
    console.log(`📊 Found ${instrumentsWithBothTokens.length} instruments with both tokens`);
    
    if (instrumentsWithBothTokens.length > 0) {
      console.log('📋 Sample instruments with both tokens:');
      instrumentsWithBothTokens.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.symbol} (${inst.exchange})`);
        console.log(`   Angel: ${inst.brokers.angel.token}`);
        console.log(`   Dhan: ${inst.brokers.dhan.token}`);
      });
    }
    
    // Update popular instruments to use real tokens from existing instruments
    console.log('\n🔄 Updating popular instruments with real tokens...');
    
    const popularSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK'];
    let updatedCount = 0;
    
    for (const symbol of popularSymbols) {
      // Find existing instrument with Angel token
      const angelInstrument = await Instrument.findOne({
        symbol: { $regex: symbol, $options: 'i' },
        'brokers.angel.token': { $exists: true, $ne: null }
      });
      
      // Find existing instrument with Dhan token
      const dhanInstrument = await Instrument.findOne({
        symbol: { $regex: symbol, $options: 'i' },
        'brokers.dhan.token': { $exists: true, $ne: null }
      });
      
      if (angelInstrument && dhanInstrument) {
        // Update the popular instrument with real tokens
        const popularId = `${symbol}-EQUITY-NSE`;
        const popularInstrument = await Instrument.findById(popularId);
        
        if (popularInstrument) {
          await Instrument.updateOne(
            { _id: popularId },
            {
              $set: {
                'brokers.angel.token': angelInstrument.brokers.angel.token,
                'brokers.angel.tradable': true,
                'brokers.angel.last_updated': new Date(),
                'brokers.dhan.token': dhanInstrument.brokers.dhan.token,
                'brokers.dhan.tradable': true,
                'brokers.dhan.last_updated': new Date(),
                updated_at: new Date()
              }
            }
          );
          updatedCount++;
          console.log(`✅ Updated ${symbol} with real tokens`);
        }
      } else {
        console.log(`⚠️ Could not find both tokens for ${symbol}`);
        if (angelInstrument) console.log(`   Angel found: ${angelInstrument.brokers.angel.token}`);
        if (dhanInstrument) console.log(`   Dhan found: ${dhanInstrument.brokers.dhan.token}`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} popular instruments with real tokens`);
    
    // Check final state
    const multiBrokerCount = await Instrument.countDocuments({
      'brokers.angel.token': { $exists: true, $ne: null },
      'brokers.dhan.token': { $exists: true, $ne: null }
    });
    
    console.log(`\n📊 Final multi-broker instruments: ${multiBrokerCount}`);
    
    // Show sample multi-broker instruments
    const multiBrokerInstruments = await Instrument.find({
      'brokers.angel.token': { $exists: true, $ne: null },
      'brokers.dhan.token': { $exists: true, $ne: null }
    }).limit(5);
    
    if (multiBrokerInstruments.length > 0) {
      console.log('\n📋 Sample multi-broker instruments:');
      multiBrokerInstruments.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.symbol} (${inst.exchange})`);
        console.log(`   Angel: ${inst.brokers.angel.token}`);
        console.log(`   Dhan: ${inst.brokers.dhan.token}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

updatePopularWithTokens();
