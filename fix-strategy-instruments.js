// Script to fix strategy instruments by finding correct database IDs
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

// Find correct instrument IDs for strategies
const fixStrategyInstruments = async () => {
  try {
    console.log('🔍 Fixing strategy instrument IDs...\n');

    // Find strategies with incorrect instrument IDs
    const strategies = await Strategy.find({}).select('name type instrument instruments broker status');
    
    for (const strategy of strategies) {
      console.log(`📋 FIXING STRATEGY: ${strategy.name}`);
      console.log(`   Type: ${strategy.type}`);
      console.log(`   Broker: ${strategy.broker}`);
      
      let needsUpdate = false;
      
      if (strategy.type === 'time_based' && strategy.instrument) {
        console.log(`   Current instrument ID: ${strategy.instrument}`);
        
        // Try to find the correct instrument
        let correctInstrument = null;
        
        // Try different search patterns
        const searchPatterns = [
          { symbol: strategy.instrument },
          { name: { $regex: strategy.instrument, $options: 'i' } },
          { symbol: { $regex: strategy.instrument.replace('-', ' '), $options: 'i' } }
        ];
        
        for (const pattern of searchPatterns) {
          correctInstrument = await Instrument.findOne(pattern);
          if (correctInstrument) break;
        }
        
        if (correctInstrument) {
          console.log(`   ✅ Found correct instrument: ${correctInstrument.symbol} (${correctInstrument.name})`);
          console.log(`   📊 Database ID: ${correctInstrument._id}`);
          console.log(`   🏦 Dhan Token: ${correctInstrument.brokers?.dhan?.token || 'MISSING'}`);
          console.log(`   ✅ Dhan Tradable: ${correctInstrument.brokers?.dhan?.tradable || false}`);
          
          if (correctInstrument.brokers?.dhan?.token && correctInstrument.brokers?.dhan?.tradable) {
            console.log(`   🎯 READY FOR DHAN TRADING!`);
            
            // Update the strategy with correct instrument ID
            strategy.instrument = correctInstrument._id.toString();
            needsUpdate = true;
            console.log(`   🔄 Updated instrument ID to: ${strategy.instrument}`);
          } else {
            console.log(`   ❌ Instrument found but missing Dhan token or not tradable`);
          }
        } else {
          console.log(`   ❌ No matching instrument found in database`);
          
          // Show similar instruments
          const similarInstruments = await Instrument.find({
            $or: [
              { symbol: { $regex: strategy.instrument.split('-')[0], $options: 'i' } },
              { name: { $regex: strategy.instrument.split('-')[0], $options: 'i' } }
            ]
          }).limit(5);
          
          if (similarInstruments.length > 0) {
            console.log(`   🔍 Similar instruments found:`);
            similarInstruments.forEach(inst => {
              console.log(`     - ${inst.symbol} (${inst.name}) - ID: ${inst._id}`);
              console.log(`       Dhan Token: ${inst.brokers?.dhan?.token || 'MISSING'}`);
            });
          }
        }
      }
      
      if (strategy.type === 'indicator_based' && strategy.instruments) {
        console.log(`   Indicator-based instruments: ${strategy.instruments.length}`);
        
        for (let i = 0; i < strategy.instruments.length; i++) {
          const instrument = strategy.instruments[i];
          console.log(`   📊 Instrument ${i + 1}: ${instrument.symbol} (${instrument.name})`);
          console.log(`     Current ID: ${instrument.instrument_id}`);
          
          // Try to find the correct instrument
          let correctInstrument = null;
          
          const searchPatterns = [
            { symbol: instrument.symbol },
            { name: instrument.name },
            { symbol: { $regex: instrument.symbol, $options: 'i' } },
            { name: { $regex: instrument.name, $options: 'i' } }
          ];
          
          for (const pattern of searchPatterns) {
            correctInstrument = await Instrument.findOne(pattern);
            if (correctInstrument) break;
          }
          
          if (correctInstrument) {
            console.log(`     ✅ Found correct instrument: ${correctInstrument.symbol}`);
            console.log(`     📊 Database ID: ${correctInstrument._id}`);
            console.log(`     🏦 Dhan Token: ${correctInstrument.brokers?.dhan?.token || 'MISSING'}`);
            console.log(`     ✅ Dhan Tradable: ${correctInstrument.brokers?.dhan?.tradable || false}`);
            
            if (correctInstrument.brokers?.dhan?.token && correctInstrument.brokers?.dhan?.tradable) {
              console.log(`     🎯 READY FOR DHAN TRADING!`);
              
              // Update the strategy with correct instrument ID
              strategy.instruments[i].instrument_id = correctInstrument._id.toString();
              needsUpdate = true;
              console.log(`     🔄 Updated instrument ID to: ${strategy.instruments[i].instrument_id}`);
            } else {
              console.log(`     ❌ Instrument found but missing Dhan token or not tradable`);
            }
          } else {
            console.log(`     ❌ No matching instrument found in database`);
          }
        }
      }
      
      // Save the strategy if it was updated
      if (needsUpdate) {
        await strategy.save();
        console.log(`   ✅ Strategy "${strategy.name}" updated successfully!`);
      } else {
        console.log(`   ⚠️  Strategy "${strategy.name}" needs manual fixing`);
      }
      
      console.log(''); // Empty line for readability
    }

  } catch (error) {
    console.error('❌ Error fixing strategy instruments:', error);
  }
};

// Show recommended instruments for new strategies
const showRecommendedInstruments = async () => {
  try {
    console.log('🎯 RECOMMENDED INSTRUMENTS FOR NEW STRATEGIES:');
    console.log('==============================================\n');

    // Find popular instruments with Dhan tokens
    const popularInstruments = await Instrument.find({
      'brokers.dhan.token': { $exists: true, $ne: null },
      'brokers.dhan.tradable': true,
      $or: [
        { symbol: { $in: ['NIFTY', 'BANKNIFTY', 'TCS', 'RELIANCE', 'INFY', 'HDFC', 'ICICIBANK'] } },
        { name: { $regex: 'NIFTY|BANK|TCS|RELIANCE|INFOSYS|HDFC|ICICI', $options: 'i' } }
      ]
    }).limit(20);

    console.log('📈 POPULAR INSTRUMENTS WITH DHAN TOKENS:');
    popularInstruments.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.symbol} (${inst.name})`);
      console.log(`   ID: ${inst._id}`);
      console.log(`   Dhan Token: ${inst.brokers.dhan.token}`);
      console.log(`   Exchange: ${inst.exchange}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error showing recommended instruments:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Fixing Strategy Instrument IDs\n');
  
  await connectDB();
  await fixStrategyInstruments();
  await showRecommendedInstruments();
  
  console.log('🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Your strategies have been updated with correct instrument IDs');
  console.log('2. Try deploying your strategies to Dhan again');
  console.log('3. If you still get errors, check the console logs for specific issues');
  console.log('4. For new strategies, use the recommended instrument IDs above');
  console.log('');
  console.log('💡 TIP:');
  console.log('=======');
  console.log('When creating new strategies, always use the database IDs from the');
  console.log('recommended instruments list above, not custom IDs.');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the script
main().catch(console.error);
