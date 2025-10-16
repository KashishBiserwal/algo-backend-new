const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function memoryEfficientDhanUpdate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
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
    let successCount = 0;
    let batchCount = 0;
    const batchSize = 50; // Very small batches to avoid memory issues
    let batch = [];
    
    await new Promise((resolve) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', async (row) => {
          processedCount++;
          
          const symbol = row.SYMBOL_NAME;
          const instrumentType = row.INSTRUMENT_TYPE;
          const exchange = row.EXCH_ID;
          
          if (!symbol || !instrumentType || !exchange || 
              symbol.trim() === '' || instrumentType.trim() === '' || exchange.trim() === '') {
            return;
          }
          
          const universalId = `${symbol}-${instrumentType}-${exchange}`;
          
          const instrumentData = {
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
            updated_at: new Date()
          };
          
          batch.push({
            updateOne: {
              filter: { _id: universalId },
              update: { 
                $set: {
                  ...instrumentData,
                  // Preserve existing Angel data
                  $setOnInsert: { 'brokers.angel': { token: null, tradable: false, last_updated: null } }
                }
              },
              upsert: true
            }
          });
          
          // Process batch when it reaches batchSize
          if (batch.length >= batchSize) {
            batchCount++;
            console.log(`🔄 Processing batch ${batchCount} (${batch.length} records) - Total processed: ${processedCount}`);
            
            try {
              const result = await Instrument.bulkWrite(batch, { ordered: false });
              successCount += result.upsertedCount + result.modifiedCount;
              console.log(`✅ Batch ${batchCount} completed: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
            } catch (error) {
              console.error(`❌ Batch ${batchCount} failed:`, error.message);
            }
            
            // Clear batch and force garbage collection
            batch = [];
            if (global.gc) {
              global.gc();
            }
            
            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        })
        .on('end', async () => {
          // Process remaining records in the last batch
          if (batch.length > 0) {
            batchCount++;
            console.log(`🔄 Processing final batch ${batchCount} (${batch.length} records)`);
            
            try {
              const result = await Instrument.bulkWrite(batch, { ordered: false });
              successCount += result.upsertedCount + result.modifiedCount;
              console.log(`✅ Final batch completed: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
            } catch (error) {
              console.error(`❌ Final batch failed:`, error.message);
            }
          }
          
          console.log(`\n✅ Processing completed!`);
          console.log(`📊 Total processed: ${processedCount}`);
          console.log(`✅ Successful: ${successCount}`);
          console.log(`📦 Batches processed: ${batchCount}`);
          
          // Clean up
          fs.unlinkSync(csvPath);
          
          // Check final count
          const totalInstruments = await Instrument.countDocuments();
          const dhanCount = await Instrument.countDocuments({ 'brokers.dhan.token': { $exists: true, $ne: null } });
          const angelCount = await Instrument.countDocuments({ 'brokers.angel.token': { $exists: true, $ne: null } });
          
          console.log(`\n📊 Final database stats:`);
          console.log(`   Total instruments: ${totalInstruments}`);
          console.log(`   Angel One instruments: ${angelCount}`);
          console.log(`   Dhan instruments: ${dhanCount}`);
          
          await mongoose.disconnect();
          resolve();
        });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

memoryEfficientDhanUpdate();
