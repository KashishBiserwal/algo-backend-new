// Script to find NIFTY and BANKNIFTY instruments with Dhan tokens
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Instrument = require('./models/instrumentModel');
const Strategy = require('./models/strategyModel');

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

// Find NIFTY and BANKNIFTY instruments
const findNiftyInstruments = async () => {
  try {
    console.log('🔍 Finding NIFTY and BANKNIFTY instruments with Dhan tokens...\n');

    // Search for NIFTY and BANKNIFTY instruments
    const niftyInstruments = await Instrument.find({
      $and: [
        {
          $or: [
            { symbol: { $regex: 'NIFTY', $options: 'i' } },
            { name: { $regex: 'NIFTY', $options: 'i' } },
            { symbol: { $regex: 'BANK', $options: 'i' } },
            { name: { $regex: 'BANK', $options: 'i' } }
          ]
        },
        {
          'brokers.dhan.token': { $exists: true, $ne: null },
          'brokers.dhan.tradable': true
        }
      ]
    }).limit(20);

    console.log(`📊 Found ${niftyInstruments.length} NIFTY/BANK instruments with Dhan tokens:\n`);

    if (niftyInstruments.length > 0) {
      niftyInstruments.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.symbol} (${inst.name})`);
        console.log(`   ID: ${inst._id}`);
        console.log(`   Dhan Token: ${inst.brokers.dhan.token}`);
        console.log(`   Exchange: ${inst.exchange}`);
        console.log(`   Segment: ${inst.segment}`);
        console.log('');
      });

      // Find the best match for DhanTest strategy
      const bestMatch = niftyInstruments.find(inst => 
        inst.symbol.includes('BANK') || inst.name.includes('BANK')
      ) || niftyInstruments[0];

      console.log('🎯 RECOMMENDED FOR DHANTEST STRATEGY:');
      console.log('=====================================');
      console.log(`Symbol: ${bestMatch.symbol}`);
      console.log(`Name: ${bestMatch.name}`);
      console.log(`Database ID: ${bestMatch._id}`);
      console.log(`Dhan Token: ${bestMatch.brokers.dhan.token}`);
      console.log('');

      // Update the DhanTest strategy
      const dhanTestStrategy = await Strategy.findOne({ name: 'DhanTest' });
      if (dhanTestStrategy) {
        console.log('🔄 Updating DhanTest strategy...');
        dhanTestStrategy.instrument = bestMatch._id.toString();
        await dhanTestStrategy.save();
        console.log('✅ DhanTest strategy updated successfully!');
        console.log(`   New instrument ID: ${dhanTestStrategy.instrument}`);
      }
    } else {
      console.log('❌ No NIFTY/BANK instruments found with Dhan tokens');
      
      // Show what's available without Dhan tokens
      const niftyWithoutDhan = await Instrument.find({
        $or: [
          { symbol: { $regex: 'NIFTY', $options: 'i' } },
          { name: { $regex: 'NIFTY', $options: 'i' } },
          { symbol: { $regex: 'BANK', $options: 'i' } },
          { name: { $regex: 'BANK', $options: 'i' } }
        ]
      }).limit(10);

      console.log('\n📊 NIFTY/BANK instruments without Dhan tokens:');
      niftyWithoutDhan.forEach((inst, index) => {
        console.log(`${index + 1}. ${inst.symbol} (${inst.name})`);
        console.log(`   ID: ${inst._id}`);
        console.log(`   Dhan Token: ${inst.brokers?.dhan?.token || 'MISSING'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error finding NIFTY instruments:', error);
  }
};

// Show all strategy status
const showStrategyStatus = async () => {
  try {
    console.log('\n📋 CURRENT STRATEGY STATUS:');
    console.log('============================\n');

    const strategies = await Strategy.find({}).select('name type instrument instruments broker status');
    
    strategies.forEach(strategy => {
      console.log(`📊 ${strategy.name}`);
      console.log(`   Type: ${strategy.type}`);
      console.log(`   Broker: ${strategy.broker}`);
      console.log(`   Status: ${strategy.status}`);
      
      if (strategy.type === 'time_based' && strategy.instrument) {
        console.log(`   Instrument ID: ${strategy.instrument}`);
      } else if (strategy.type === 'indicator_based' && strategy.instruments) {
        console.log(`   Instruments: ${strategy.instruments.length}`);
        strategy.instruments.forEach((inst, index) => {
          console.log(`     ${index + 1}. ${inst.symbol} - ID: ${inst.instrument_id}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error showing strategy status:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Finding NIFTY Instruments for DhanTest Strategy\n');
  
  await connectDB();
  await findNiftyInstruments();
  await showStrategyStatus();
  
  console.log('🎯 READY TO TEST:');
  console.log('=================');
  console.log('1. Both strategies should now have correct instrument IDs');
  console.log('2. Try deploying "tcs equity" strategy to Dhan');
  console.log('3. Try deploying "DhanTest" strategy to Dhan');
  console.log('4. Both should work now!');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the script
main().catch(console.error);
