const instrumentService = require('../services/instrumentService');
const Instrument = require('../models/instrumentModel');

async function testSmallBatch() {
  try {
    console.log('🚀 Testing small batch processing...');
    
    // Test with just Angel One first, but limit to 100 records
    console.log('\n📊 Testing Angel One with limited records...');
    
    const axios = require('axios');
    const response = await axios.get('https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json');
    const angelData = response.data.slice(0, 100); // Only first 100 records
    
    console.log(`Processing ${angelData.length} records...`);
    
    let processedCount = 0;
    const batchSize = 10; // Very small batches
    
    for (let i = 0; i < angelData.length; i += batchSize) {
      const batch = angelData.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)`);
      
      const bulkOps = [];
      
      for (const item of batch) {
        const symbol = item.symbol;
        const instrumentType = item.instrumenttype;
        const exchange = item.exch_seg;
        
        if (!symbol || !instrumentType || !exchange || 
            symbol.trim() === '' || instrumentType.trim() === '' || exchange.trim() === '') {
          continue;
        }
        
        const universalId = `${symbol}-${instrumentType}-${exchange}`;
        
        const instrumentData = {
          _id: universalId,
          symbol: symbol,
          name: item.name,
          exchange: exchange,
          segment: instrumentType,
          instrument_type: instrumentType,
          lot_size: parseInt(item.lotsize) || 1,
          expiry: (item.expiry && item.expiry.trim() !== '') ? new Date(item.expiry) : null,
          strike_price: (item.strike && item.strike !== '0.000000' && item.strike.trim() !== '') ? parseFloat(item.strike) : null,
          tick_size: item.tick_size ? parseFloat(item.tick_size) : 0.05,
          'brokers.angel': {
            token: item.token,
            tradable: true,
            last_updated: new Date()
          },
          updated_at: new Date()
        };
        
        bulkOps.push({
          updateOne: {
            filter: { _id: universalId },
            update: { $set: instrumentData },
            upsert: true
          }
        });
      }
      
      if (bulkOps.length > 0) {
        try {
          const result = await Instrument.bulkWrite(bulkOps, { ordered: false });
          processedCount += result.upsertedCount + result.modifiedCount;
          console.log(`✅ Batch completed: ${result.upsertedCount} new, ${result.modifiedCount} updated`);
        } catch (error) {
          console.error(`❌ Batch failed:`, error.message);
        }
      }
      
      // Wait between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Test completed! Processed ${processedCount} records total.`);
    
    // Check what we have in the database
    const count = await Instrument.countDocuments();
    console.log(`📊 Total instruments in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testSmallBatch();
