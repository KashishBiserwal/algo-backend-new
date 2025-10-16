const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function matchAndUpdateDhan() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // First, let's see what we have
    const existingCount = await Instrument.countDocuments();
    const angelCount = await Instrument.countDocuments({ 'brokers.angel.token': { $exists: true, $ne: null } });
    console.log(`📊 Current state: ${existingCount} total, ${angelCount} with Angel data`);
    
    console.log('🔄 Fetching Dhan CSV...');
    const response = await axios.get('https://images.dhan.co/api-data/api-scrip-master-detailed.csv', {
      responseType: 'stream'
    });
    
    const csvPath = path.join(__dirname, '../temp/dhan_instruments.csv');
    const tempDir = path.dirname(csvPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const writer = fs.createWriteStream(csvPath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log('✅ CSV downloaded');
    
    let processedCount = 0;
    let matchedCount = 0;
    let updatedCount = 0;
    let newCount = 0;
    
    // Create a map of existing instruments for faster lookup
    console.log('🔄 Building instrument lookup map...');
    const existingInstruments = await Instrument.find({}, '_id symbol exchange instrument_type').lean();
    const instrumentMap = new Map();
    
    existingInstruments.forEach(inst => {
      // Create multiple possible keys for matching
      const keys = [
        `${inst.symbol}-${inst.instrument_type}-${inst.exchange}`,
        `${inst.symbol}-${inst.exchange}`,
        inst.symbol
      ];
      keys.forEach(key => {
        if (!instrumentMap.has(key)) {
          instrumentMap.set(key, inst);
        }
      });
    });
    
    console.log(`📊 Built lookup map with ${instrumentMap.size} keys for ${existingInstruments.length} instruments`);
    
    await new Promise((resolve) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', async (row) => {
          processedCount++;
          
          if (processedCount % 10000 === 0) {
            console.log(`📊 Processed ${processedCount} records (${matchedCount} matched, ${updatedCount} updated, ${newCount} new)`);
          }
          
          const symbol = row.SYMBOL_NAME;
          const instrumentType = row.INSTRUMENT_TYPE;
          const exchange = row.EXCH_ID;
          
          if (!symbol || !instrumentType || !exchange || 
              symbol.trim() === '' || instrumentType.trim() === '' || exchange.trim() === '') {
            return;
          }
          
          // Try to find matching existing instrument
          const possibleKeys = [
            `${symbol}-${instrumentType}-${exchange}`,
            `${symbol}-${exchange}`,
            symbol
          ];
          
          let existingInstrument = null;
          for (const key of possibleKeys) {
            if (instrumentMap.has(key)) {
              existingInstrument = instrumentMap.get(key);
              break;
            }
          }
          
          if (existingInstrument) {
            // Update existing instrument with Dhan data
            try {
              await Instrument.updateOne(
                { _id: existingInstrument._id },
                {
                  $set: {
                    'brokers.dhan': {
                      token: row.SECURITY_ID,
                      tradable: true,
                      last_updated: new Date()
                    },
                    updated_at: new Date()
                  }
                }
              );
              matchedCount++;
              updatedCount++;
            } catch (error) {
              console.warn(`⚠️ Failed to update ${existingInstrument._id}: ${error.message}`);
            }
          } else {
            // Create new instrument if no match found
            const universalId = `${symbol}-${instrumentType}-${exchange}`;
            try {
              const newInstrument = {
                _id: universalId,
                symbol: symbol,
                name: row.DISPLAY_NAME,
                exchange: exchange,
                segment: instrumentType,
                instrument_type: instrumentType,
                lot_size: parseInt(row.LOT_SIZE) || 1,
                expiry: (row.SM_EXPIRY_DATE && row.SM_EXPIRY_DATE.trim() !== '') ? new Date(row.SM_EXPIRY_DATE) : null,
                strike_price: (row.STRIKE_PRICE && row.STRIKE_PRICE !== '-0.01000' && row.STRIKE_PRICE.trim() !== '') ? parseFloat(row.STRIKE_PRICE) : null,
                tick_size: row.TICK_SIZE ? parseFloat(row.TICK_SIZE) : 0.05,
                'brokers.dhan': {
                  token: row.SECURITY_ID,
                  tradable: true,
                  last_updated: new Date()
                },
                'brokers.angel': {
                  token: null,
                  tradable: false,
                  last_updated: null
                },
                created_at: new Date(),
                updated_at: new Date()
              };
              
              await Instrument.create(newInstrument);
              newCount++;
            } catch (error) {
              // Ignore duplicate key errors
              if (!error.message.includes('duplicate key')) {
                console.warn(`⚠️ Failed to create ${universalId}: ${error.message}`);
              }
            }
          }
        })
        .on('end', async () => {
          console.log(`\n✅ Processing completed!`);
          console.log(`📊 Total processed: ${processedCount}`);
          console.log(`🔗 Matched existing: ${matchedCount}`);
          console.log(`✅ Updated: ${updatedCount}`);
          console.log(`🆕 New created: ${newCount}`);
          
          // Clean up
          fs.unlinkSync(csvPath);
          
          // Check final count
          const totalInstruments = await Instrument.countDocuments();
          const dhanCount = await Instrument.countDocuments({ 'brokers.dhan.token': { $exists: true, $ne: null } });
          const angelCount = await Instrument.countDocuments({ 'brokers.angel.token': { $exists: true, $ne: null } });
          const bothCount = await Instrument.countDocuments({ 
            'brokers.dhan.token': { $exists: true, $ne: null },
            'brokers.angel.token': { $exists: true, $ne: null }
          });
          
          console.log(`\n📊 Final database stats:`);
          console.log(`   Total instruments: ${totalInstruments}`);
          console.log(`   Angel One instruments: ${angelCount}`);
          console.log(`   Dhan instruments: ${dhanCount}`);
          console.log(`   Both brokers: ${bothCount}`);
          
          await mongoose.disconnect();
          resolve();
        });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

matchAndUpdateDhan();
