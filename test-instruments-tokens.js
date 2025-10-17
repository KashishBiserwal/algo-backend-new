// Test script to fetch all instruments and check their token status for Angel One and Dhan
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Instrument = require('./models/instrumentModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/algo-trading');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test function to check instrument tokens
const testInstrumentTokens = async () => {
  try {
    console.log('🔍 Fetching all instruments and checking token status...\n');

    // Get all instruments
    const instruments = await Instrument.find({}).limit(50); // Limit to first 50 for testing
    console.log(`📊 Found ${instruments.length} instruments\n`);

    // Categorize instruments by token status
    const angelInstruments = [];
    const dhanInstruments = [];
    const bothTokens = [];
    const noTokens = [];

    instruments.forEach(instrument => {
      const hasAngelToken = instrument.brokers?.angel?.token;
      const hasDhanToken = instrument.brokers?.dhan?.token;
      const isDhanTradable = instrument.brokers?.dhan?.tradable;

      if (hasAngelToken && hasDhanToken && isDhanTradable) {
        bothTokens.push(instrument);
      } else if (hasAngelToken && !hasDhanToken) {
        angelInstruments.push(instrument);
      } else if (!hasAngelToken && hasDhanToken && isDhanTradable) {
        dhanInstruments.push(instrument);
      } else {
        noTokens.push(instrument);
      }
    });

    // Display results
    console.log('📈 INSTRUMENT TOKEN ANALYSIS:');
    console.log('================================\n');

    console.log(`✅ Instruments with BOTH Angel & Dhan tokens: ${bothTokens.length}`);
    console.log(`🔵 Instruments with ONLY Angel tokens: ${angelInstruments.length}`);
    console.log(`🟡 Instruments with ONLY Dhan tokens: ${dhanInstruments.length}`);
    console.log(`❌ Instruments with NO tokens: ${noTokens.length}\n`);

    // Show sample instruments with both tokens
    if (bothTokens.length > 0) {
      console.log('✅ SAMPLE INSTRUMENTS WITH BOTH TOKENS:');
      console.log('=====================================');
      bothTokens.slice(0, 5).forEach(instrument => {
        console.log(`📊 ${instrument.symbol} (${instrument.name})`);
        console.log(`   Angel Token: ${instrument.brokers.angel.token}`);
        console.log(`   Dhan Token: ${instrument.brokers.dhan.token}`);
        console.log(`   Dhan Tradable: ${instrument.brokers.dhan.tradable}`);
        console.log('');
      });
    }

    // Show sample instruments with only Angel tokens
    if (angelInstruments.length > 0) {
      console.log('🔵 SAMPLE INSTRUMENTS WITH ONLY ANGEL TOKENS:');
      console.log('============================================');
      angelInstruments.slice(0, 5).forEach(instrument => {
        console.log(`📊 ${instrument.symbol} (${instrument.name})`);
        console.log(`   Angel Token: ${instrument.brokers.angel.token}`);
        console.log(`   Dhan Token: ${instrument.brokers.dhan?.token || 'MISSING'}`);
        console.log(`   Dhan Tradable: ${instrument.brokers.dhan?.tradable || false}`);
        console.log('');
      });
    }

    // Show sample instruments with only Dhan tokens
    if (dhanInstruments.length > 0) {
      console.log('🟡 SAMPLE INSTRUMENTS WITH ONLY DHAN TOKENS:');
      console.log('===========================================');
      dhanInstruments.slice(0, 5).forEach(instrument => {
        console.log(`📊 ${instrument.symbol} (${instrument.name})`);
        console.log(`   Angel Token: ${instrument.brokers.angel?.token || 'MISSING'}`);
        console.log(`   Dhan Token: ${instrument.brokers.dhan.token}`);
        console.log(`   Dhan Tradable: ${instrument.brokers.dhan.tradable}`);
        console.log('');
      });
    }

    // Show sample instruments with no tokens
    if (noTokens.length > 0) {
      console.log('❌ SAMPLE INSTRUMENTS WITH NO TOKENS:');
      console.log('====================================');
      noTokens.slice(0, 5).forEach(instrument => {
        console.log(`📊 ${instrument.symbol} (${instrument.name})`);
        console.log(`   Angel Token: ${instrument.brokers?.angel?.token || 'MISSING'}`);
        console.log(`   Dhan Token: ${instrument.brokers?.dhan?.token || 'MISSING'}`);
        console.log(`   Dhan Tradable: ${instrument.brokers?.dhan?.tradable || false}`);
        console.log('');
      });
    }

    // Summary and recommendations
    console.log('📋 SUMMARY & RECOMMENDATIONS:');
    console.log('==============================\n');

    if (bothTokens.length === 0) {
      console.log('⚠️  WARNING: No instruments have both Angel and Dhan tokens!');
      console.log('   This means Dhan strategies cannot be deployed.');
      console.log('   You need to update instruments with Dhan tokens.\n');
    } else {
      console.log(`✅ ${bothTokens.length} instruments are ready for Dhan deployment`);
    }

    if (angelInstruments.length > 0) {
      console.log(`🔵 ${angelInstruments.length} instruments need Dhan tokens to be added`);
    }

    if (dhanInstruments.length > 0) {
      console.log(`🟡 ${dhanInstruments.length} instruments have Dhan tokens but no Angel tokens`);
    }

    if (noTokens.length > 0) {
      console.log(`❌ ${noTokens.length} instruments have no tokens at all`);
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Run instrument update script to fetch Dhan tokens');
    console.log('2. Ensure instruments have both Angel and Dhan tokens');
    console.log('3. Verify Dhan tradable status is set to true');
    console.log('4. Test strategy deployment with instruments that have both tokens');

    // Get popular instruments specifically
    console.log('\n🎯 CHECKING POPULAR INSTRUMENTS:');
    console.log('================================');
    
    const popularSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK'];
    
    for (const symbol of popularSymbols) {
      const instrument = await Instrument.findOne({ symbol: symbol });
      if (instrument) {
        console.log(`📊 ${instrument.symbol}:`);
        console.log(`   Angel Token: ${instrument.brokers?.angel?.token || 'MISSING'}`);
        console.log(`   Dhan Token: ${instrument.brokers?.dhan?.token || 'MISSING'}`);
        console.log(`   Dhan Tradable: ${instrument.brokers?.dhan?.tradable || false}`);
        console.log('');
      } else {
        console.log(`📊 ${symbol}: NOT FOUND in database`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing instrument tokens:', error);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await testInstrumentTokens();
  } catch (error) {
    console.error('❌ Main execution error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the test
main();
