// Script to fetch only Dhan instruments from the database
const mongoose = require('mongoose');
require('dotenv').config();

// Import the Instrument model
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

// Fetch Dhan instruments
const fetchDhanInstruments = async () => {
  try {
    console.log('🔍 Fetching instruments with Dhan tokens...\n');

    // Find all instruments that have Dhan tokens
    const dhanInstruments = await Instrument.find({
      'brokers.dhan.token': { $exists: true, $ne: null }
    }).select('symbol name exchange segment instrument_type brokers.dhan');

    console.log(`📊 Found ${dhanInstruments.length} instruments with Dhan tokens\n`);

    if (dhanInstruments.length === 0) {
      console.log('❌ No instruments found with Dhan tokens');
      console.log('💡 You may need to update instruments with Dhan tokens first');
      return;
    }

    // Group by segment
    const groupedInstruments = {
      equity: [],
      futures: [],
      options: [],
      indices: []
    };

    dhanInstruments.forEach(instrument => {
      const segment = instrument.segment?.toLowerCase() || 'equity';
      if (groupedInstruments[segment]) {
        groupedInstruments[segment].push(instrument);
      } else {
        groupedInstruments.equity.push(instrument);
      }
    });

    // Display results
    console.log('📈 DHAN INSTRUMENTS BY SEGMENT:');
    console.log('===============================\n');

    Object.entries(groupedInstruments).forEach(([segment, instruments]) => {
      if (instruments.length > 0) {
        console.log(`📊 ${segment.toUpperCase()} (${instruments.length} instruments):`);
        console.log('─'.repeat(50));
        
        instruments.forEach(instrument => {
          const dhanData = instrument.brokers?.dhan;
          console.log(`📈 ${instrument.symbol}`);
          console.log(`   Name: ${instrument.name}`);
          console.log(`   Exchange: ${instrument.exchange}`);
          console.log(`   Dhan Token: ${dhanData?.token || 'N/A'}`);
          console.log(`   Tradable: ${dhanData?.tradable ? '✅ Yes' : '❌ No'}`);
          console.log(`   Last Updated: ${dhanData?.last_updated || 'N/A'}`);
          console.log('');
        });
        console.log('');
      }
    });

    // Summary
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`Total Dhan instruments: ${dhanInstruments.length}`);
    console.log(`Equity: ${groupedInstruments.equity.length}`);
    console.log(`Futures: ${groupedInstruments.futures.length}`);
    console.log(`Options: ${groupedInstruments.options.length}`);
    console.log(`Indices: ${groupedInstruments.indices.length}`);

    // Check tradable status
    const tradableInstruments = dhanInstruments.filter(inst => 
      inst.brokers?.dhan?.tradable === true
    );
    
    console.log(`\n✅ Tradable on Dhan: ${tradableInstruments.length}`);
    console.log(`❌ Not tradable on Dhan: ${dhanInstruments.length - tradableInstruments.length}`);

    // Show some examples for strategy creation
    if (tradableInstruments.length > 0) {
      console.log('\n🎯 RECOMMENDED INSTRUMENTS FOR STRATEGY CREATION:');
      console.log('================================================');
      
      const topInstruments = tradableInstruments.slice(0, 10);
      topInstruments.forEach((instrument, index) => {
        console.log(`${index + 1}. ${instrument.symbol} - ${instrument.brokers.dhan.token}`);
      });
      
      if (tradableInstruments.length > 10) {
        console.log(`... and ${tradableInstruments.length - 10} more`);
      }
    }

    // Export to JSON file
    const exportData = {
      total: dhanInstruments.length,
      tradable: tradableInstruments.length,
      segments: groupedInstruments,
      instruments: dhanInstruments.map(inst => ({
        id: inst._id,
        symbol: inst.symbol,
        name: inst.name,
        exchange: inst.exchange,
        segment: inst.segment,
        dhanToken: inst.brokers?.dhan?.token,
        tradable: inst.brokers?.dhan?.tradable,
        lastUpdated: inst.brokers?.dhan?.last_updated
      }))
    };

    const fs = require('fs');
    const filename = `dhan-instruments-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Data exported to: ${filename}`);

  } catch (error) {
    console.error('❌ Error fetching Dhan instruments:', error);
  }
};

// Check instruments without Dhan tokens
const checkMissingDhanTokens = async () => {
  try {
    console.log('\n🔍 Checking instruments without Dhan tokens...\n');

    // Find instruments without Dhan tokens
    const instrumentsWithoutDhan = await Instrument.find({
      $or: [
        { 'brokers.dhan.token': { $exists: false } },
        { 'brokers.dhan.token': null },
        { 'brokers.dhan.token': '' }
      ]
    }).select('symbol name exchange segment brokers.angel');

    console.log(`📊 Found ${instrumentsWithoutDhan.length} instruments without Dhan tokens\n`);

    if (instrumentsWithoutDhan.length > 0) {
      console.log('❌ INSTRUMENTS MISSING DHAN TOKENS:');
      console.log('===================================\n');
      
      // Show first 20 instruments
      const sampleInstruments = instrumentsWithoutDhan.slice(0, 20);
      sampleInstruments.forEach((instrument, index) => {
        const hasAngel = instrument.brokers?.angel?.token;
        console.log(`${index + 1}. ${instrument.symbol} (${instrument.name})`);
        console.log(`   Exchange: ${instrument.exchange}`);
        console.log(`   Angel Token: ${hasAngel ? '✅ ' + hasAngel : '❌ MISSING'}`);
        console.log(`   Dhan Token: ❌ MISSING`);
        console.log('');
      });

      if (instrumentsWithoutDhan.length > 20) {
        console.log(`... and ${instrumentsWithoutDhan.length - 20} more instruments without Dhan tokens`);
      }

      console.log('\n💡 TO FIX MISSING DHAN TOKENS:');
      console.log('===============================');
      console.log('1. Run the update script: node update-dhan-tokens.js');
      console.log('2. Or manually add Dhan tokens to these instruments');
      console.log('3. Use the Dhan API to get proper tokens for each instrument');
    } else {
      console.log('✅ All instruments have Dhan tokens!');
    }

  } catch (error) {
    console.error('❌ Error checking missing Dhan tokens:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Fetching Dhan Instruments\n');
  
  await connectDB();
  await fetchDhanInstruments();
  await checkMissingDhanTokens();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Use instruments with Dhan tokens for strategy creation');
  console.log('2. If missing tokens, run: node update-dhan-tokens.js');
  console.log('3. Create strategies using the recommended instruments above');
  console.log('4. Deploy strategies to Dhan broker');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
};

// Run the script
main().catch(console.error);
