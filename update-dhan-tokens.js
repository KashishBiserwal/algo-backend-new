// Script to update instruments with Dhan tokens
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Instrument = require('./models/instrumentModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/algo-trading');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Mock Dhan token data (in real implementation, this would come from Dhan API)
const mockDhanTokens = {
  'NIFTY': 'NSE|NIFTY 50',
  'BANKNIFTY': 'NSE|NIFTY BANK',
  'RELIANCE': 'NSE|RELIANCE',
  'TCS': 'NSE|TCS',
  'INFY': 'NSE|INFY',
  'HDFC': 'NSE|HDFC',
  'ICICIBANK': 'NSE|ICICIBANK',
  'SBIN': 'NSE|SBIN',
  'HINDUNILVR': 'NSE|HINDUNILVR',
  'ITC': 'NSE|ITC',
  'BHARTIARTL': 'NSE|BHARTIARTL',
  'KOTAKBANK': 'NSE|KOTAKBANK',
  'LT': 'NSE|LT',
  'ASIANPAINT': 'NSE|ASIANPAINT',
  'AXISBANK': 'NSE|AXISBANK',
  'MARUTI': 'NSE|MARUTI',
  'SUNPHARMA': 'NSE|SUNPHARMA',
  'TITAN': 'NSE|TITAN',
  'ULTRACEMCO': 'NSE|ULTRACEMCO',
  'WIPRO': 'NSE|WIPRO'
};

// Function to update instruments with Dhan tokens
const updateDhanTokens = async () => {
  try {
    console.log('🔄 Updating instruments with Dhan tokens...\n');

    let updatedCount = 0;
    let skippedCount = 0;

    // Get all instruments that don't have Dhan tokens
    const instruments = await Instrument.find({
      $or: [
        { 'brokers.dhan.token': { $exists: false } },
        { 'brokers.dhan.token': null },
        { 'brokers.dhan.token': '' }
      ]
    });

    console.log(`📊 Found ${instruments.length} instruments without Dhan tokens\n`);

    for (const instrument of instruments) {
      const symbol = instrument.symbol;
      const dhanToken = mockDhanTokens[symbol];

      if (dhanToken) {
        // Update the instrument with Dhan token
        instrument.brokers = instrument.brokers || {};
        instrument.brokers.dhan = instrument.brokers.dhan || {};
        
        instrument.brokers.dhan.token = dhanToken;
        instrument.brokers.dhan.tradable = true;
        instrument.brokers.dhan.last_updated = new Date();

        await instrument.save();
        updatedCount++;
        console.log(`✅ Updated ${symbol} with Dhan token: ${dhanToken}`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped ${symbol} - no Dhan token available`);
      }
    }

    console.log('\n📈 UPDATE SUMMARY:');
    console.log('==================');
    console.log(`✅ Updated: ${updatedCount} instruments`);
    console.log(`⏭️  Skipped: ${skippedCount} instruments`);
    console.log(`📊 Total processed: ${instruments.length} instruments`);

    // Verify the updates
    console.log('\n🔍 VERIFICATION:');
    console.log('================');
    
    const instrumentsWithDhanTokens = await Instrument.countDocuments({
      'brokers.dhan.token': { $exists: true, $ne: null, $ne: '' },
      'brokers.dhan.tradable': true
    });

    console.log(`✅ Instruments with Dhan tokens: ${instrumentsWithDhanTokens}`);

    // Show some examples
    const sampleInstruments = await Instrument.find({
      'brokers.dhan.token': { $exists: true, $ne: null, $ne: '' },
      'brokers.dhan.tradable': true
    }).limit(5);

    console.log('\n📊 SAMPLE UPDATED INSTRUMENTS:');
    sampleInstruments.forEach(instrument => {
      console.log(`   ${instrument.symbol}: ${instrument.brokers.dhan.token}`);
    });

  } catch (error) {
    console.error('❌ Error updating Dhan tokens:', error);
  }
};

// Function to add Dhan tokens to popular instruments manually
const addPopularDhanTokens = async () => {
  try {
    console.log('\n🎯 Adding Dhan tokens to popular instruments...\n');

    const popularInstruments = [
      { symbol: 'NIFTY', token: 'NSE|NIFTY 50' },
      { symbol: 'BANKNIFTY', token: 'NSE|NIFTY BANK' },
      { symbol: 'RELIANCE', token: 'NSE|RELIANCE' },
      { symbol: 'TCS', token: 'NSE|TCS' },
      { symbol: 'INFY', token: 'NSE|INFY' },
      { symbol: 'HDFC', token: 'NSE|HDFC' },
      { symbol: 'ICICIBANK', token: 'NSE|ICICIBANK' },
      { symbol: 'SBIN', token: 'NSE|SBIN' },
      { symbol: 'HINDUNILVR', token: 'NSE|HINDUNILVR' },
      { symbol: 'ITC', token: 'NSE|ITC' }
    ];

    for (const { symbol, token } of popularInstruments) {
      const instrument = await Instrument.findOne({ symbol: symbol });
      
      if (instrument) {
        instrument.brokers = instrument.brokers || {};
        instrument.brokers.dhan = instrument.brokers.dhan || {};
        
        instrument.brokers.dhan.token = token;
        instrument.brokers.dhan.tradable = true;
        instrument.brokers.dhan.last_updated = new Date();

        await instrument.save();
        console.log(`✅ Added Dhan token to ${symbol}: ${token}`);
      } else {
        console.log(`❌ Instrument ${symbol} not found in database`);
      }
    }

  } catch (error) {
    console.error('❌ Error adding popular Dhan tokens:', error);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Starting Dhan token update process...\n');
    
    // First, add tokens to popular instruments
    await addPopularDhanTokens();
    
    // Then, update remaining instruments
    await updateDhanTokens();
    
    console.log('\n🎉 Dhan token update completed!');
    console.log('\n📋 NEXT STEPS:');
    console.log('==============');
    console.log('1. Run the test-instruments-tokens.js script to verify updates');
    console.log('2. Try deploying a Dhan strategy again');
    console.log('3. Check that instruments now have Dhan tokens');
    
  } catch (error) {
    console.error('❌ Main execution error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the update
main();
