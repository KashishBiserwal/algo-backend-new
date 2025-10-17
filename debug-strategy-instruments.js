// Debug script to check why strategy deployment fails with "Missing Dhan instrument tokens"
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Strategy = require('./models/strategyModel');
const Instrument = require('./models/instrumentModel');

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

// Debug strategy instruments
const debugStrategyInstruments = async () => {
  try {
    console.log('🔍 Debugging strategy instrument validation...\n');

    // Find all strategies
    const strategies = await Strategy.find({}).select('name type instrument instruments broker status');
    
    console.log(`📊 Found ${strategies.length} strategies in database\n`);

    for (const strategy of strategies) {
      console.log(`📋 STRATEGY: ${strategy.name}`);
      console.log(`   Type: ${strategy.type}`);
      console.log(`   Broker: ${strategy.broker}`);
      console.log(`   Status: ${strategy.status}`);
      
      const instrumentIds = [];
      
      // Collect instrument IDs based on strategy type
      if (strategy.type === 'time_based' && strategy.instrument) {
        instrumentIds.push(strategy.instrument);
        console.log(`   Time-based instrument ID: ${strategy.instrument}`);
      } else if (strategy.type === 'indicator_based' && strategy.instruments) {
        strategy.instruments.forEach(instrument => {
          instrumentIds.push(instrument.instrument_id);
        });
        console.log(`   Indicator-based instruments: ${strategy.instruments.length}`);
        strategy.instruments.forEach((inst, index) => {
          console.log(`     ${index + 1}. ID: ${inst.instrument_id}, Symbol: ${inst.symbol}, Name: ${inst.name}`);
        });
      }
      
      console.log(`   Total instrument IDs to validate: ${instrumentIds.length}`);
      
      // Check each instrument ID
      if (instrumentIds.length > 0) {
        console.log('   🔍 Validating instruments:');
        
        for (const instrumentId of instrumentIds) {
          console.log(`     Checking instrument ID: ${instrumentId}`);
          
          // Try to find the instrument
          const instrument = await Instrument.findById(instrumentId);
          
          if (!instrument) {
            console.log(`     ❌ Instrument not found in database`);
            
            // Try to find by symbol or other fields
            console.log(`     🔍 Searching for similar instruments...`);
            
            // If it's a string that looks like a symbol, try to find by symbol
            if (typeof instrumentId === 'string' && instrumentId.length < 20) {
              const similarInstruments = await Instrument.find({
                $or: [
                  { symbol: instrumentId },
                  { name: { $regex: instrumentId, $options: 'i' } }
                ]
              }).limit(5);
              
              if (similarInstruments.length > 0) {
                console.log(`     📊 Found ${similarInstruments.length} similar instruments:`);
                similarInstruments.forEach(inst => {
                  console.log(`       - ${inst.symbol} (${inst.name}) - ID: ${inst._id}`);
                  console.log(`         Dhan Token: ${inst.brokers?.dhan?.token || 'MISSING'}`);
                  console.log(`         Dhan Tradable: ${inst.brokers?.dhan?.tradable || false}`);
                });
              } else {
                console.log(`     ❌ No similar instruments found`);
              }
            }
          } else {
            console.log(`     ✅ Instrument found: ${instrument.symbol} (${instrument.name})`);
            console.log(`       Dhan Token: ${instrument.brokers?.dhan?.token || 'MISSING'}`);
            console.log(`       Dhan Tradable: ${instrument.brokers?.dhan?.tradable || false}`);
            
            if (!instrument.brokers?.dhan?.token) {
              console.log(`       ❌ MISSING DHAN TOKEN`);
            } else if (!instrument.brokers?.dhan?.tradable) {
              console.log(`       ❌ NOT TRADABLE ON DHAN`);
            } else {
              console.log(`       ✅ READY FOR DHAN TRADING`);
            }
          }
        }
      }
      
      console.log(''); // Empty line for readability
    }

  } catch (error) {
    console.error('❌ Error debugging strategy instruments:', error);
  }
};

// Check all instruments in database
const checkAllInstruments = async () => {
  try {
    console.log('🔍 Checking all instruments in database...\n');

    const totalInstruments = await Instrument.countDocuments();
    const instrumentsWithDhan = await Instrument.countDocuments({
      'brokers.dhan.token': { $exists: true, $ne: null }
    });
    const tradableDhan = await Instrument.countDocuments({
      'brokers.dhan.token': { $exists: true, $ne: null },
      'brokers.dhan.tradable': true
    });

    console.log(`📊 DATABASE SUMMARY:`);
    console.log(`   Total instruments: ${totalInstruments}`);
    console.log(`   Instruments with Dhan tokens: ${instrumentsWithDhan}`);
    console.log(`   Tradable on Dhan: ${tradableDhan}`);

    // Show some examples
    const sampleInstruments = await Instrument.find({
      'brokers.dhan.token': { $exists: true, $ne: null },
      'brokers.dhan.tradable': true
    }).limit(10);

    console.log(`\n📈 SAMPLE INSTRUMENTS WITH DHAN TOKENS:`);
    sampleInstruments.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.symbol} (${inst.name})`);
      console.log(`   ID: ${inst._id}`);
      console.log(`   Dhan Token: ${inst.brokers.dhan.token}`);
      console.log(`   Exchange: ${inst.exchange}`);
    });

  } catch (error) {
    console.error('❌ Error checking all instruments:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Debugging Strategy Instrument Validation\n');
  
  await connectDB();
  await debugStrategyInstruments();
  await checkAllInstruments();
  
  console.log('\n🎯 COMMON ISSUES AND SOLUTIONS:');
  console.log('================================');
  console.log('1. Strategy uses instrument IDs that don\'t exist in database');
  console.log('   Solution: Update strategy to use correct instrument IDs');
  console.log('');
  console.log('2. Strategy uses instrument symbols instead of database IDs');
  console.log('   Solution: Convert symbols to database IDs when creating strategy');
  console.log('');
  console.log('3. Instruments exist but don\'t have Dhan tokens');
  console.log('   Solution: Run update-dhan-tokens.js to add Dhan tokens');
  console.log('');
  console.log('4. Instruments have Dhan tokens but tradable=false');
  console.log('   Solution: Update instruments to set tradable=true');
  console.log('');
  console.log('💡 QUICK FIX:');
  console.log('=============');
  console.log('1. Check what instruments your "DhanTest" strategy uses');
  console.log('2. Verify those instrument IDs exist in the database');
  console.log('3. If not, update the strategy to use correct instrument IDs');
  console.log('4. If they exist but missing tokens, run the update script');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the script
main().catch(console.error);
