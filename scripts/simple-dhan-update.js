const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function simpleDhanUpdate() {
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
    let errorCount = 0;
    
    await new Promise((resolve) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', async (row) => {
          processedCount++;
          
          if (processedCount % 1000 === 0) {
            console.log(`📊 Processed ${processedCount} records (${successCount} success, ${errorCount} errors)`);
          }
          
          try {
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
            
            // Use findOneAndUpdate with upsert for better performance
            await Instrument.findOneAndUpdate(
              { _id: universalId },
              { 
                $set: {
                  ...instrumentData,
                  // Preserve existing Angel data
                  $setOnInsert: { 'brokers.angel': { token: null, tradable: false, last_updated: null } }
                }
              },
              { upsert: true, new: true }
            );
            
            successCount++;
            
          } catch (error) {
            errorCount++;
            if (errorCount % 100 === 0) {
              console.warn(`⚠️ ${errorCount} errors so far. Latest: ${error.message}`);
            }
          }
        })
        .on('end', async () => {
          console.log(`\n✅ Processing completed!`);
          console.log(`📊 Total processed: ${processedCount}`);
          console.log(`✅ Successful: ${successCount}`);
          console.log(`❌ Errors: ${errorCount}`);
          
          // Clean up
          fs.unlinkSync(csvPath);
          
          // Check final count
          const totalInstruments = await Instrument.countDocuments();
          const dhanCount = await Instrument.countDocuments({ 'brokers.dhan.token': { $exists: true, $ne: null } });
          
          console.log(`\n📊 Final database stats:`);
          console.log(`   Total instruments: ${totalInstruments}`);
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

simpleDhanUpdate();
