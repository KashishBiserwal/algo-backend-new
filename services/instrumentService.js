const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Instrument = require('../models/instrumentModel');
const InstrumentUpdate = require('../models/instrumentUpdateModel');

class InstrumentService {
  constructor() {
    this.angelUrl = 'https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json';
    this.dhanUrl = 'https://images.dhan.co/api-data/api-scrip-master-detailed.csv';
  }

  // Generate universal ID for instruments
  generateUniversalId(symbol, instrumentType, exchange) {
    const segment = this.getSegmentFromInstrumentType(instrumentType);
    return `${symbol}-${segment}-${exchange}`;
  }

  // Map instrument types to segments
  getSegmentFromInstrumentType(instrumentType) {
    const mapping = {
      'EQUITY': 'EQ',
      'FUTIDX': 'FUT',
      'FUTSTK': 'FUT',
      'OPTIDX': 'OPT',
      'OPTSTK': 'OPT',
      'INDEX': 'IDX'
    };
    return mapping[instrumentType] || instrumentType;
  }

  // Update Angel One instruments
  async updateAngelInstruments() {
    try {
      console.log('🔄 Fetching Angel One instruments...');
      
      const response = await axios.get(this.angelUrl);
      const angelData = response.data;

      console.log('📊 Angel One data sample:', angelData[0]); // Debug log

      let processedCount = 0;
      let newEntries = 0;
      let updatedEntries = 0;
      const batchSize = 1000; // Process in batches
      const batches = [];

      // Create batches
      for (let i = 0; i < angelData.length; i += batchSize) {
        batches.push(angelData.slice(i, i + batchSize));
      }

      console.log(`📦 Processing ${batches.length} batches of ${batchSize} records each`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);
        
        const bulkOps = [];
        
        for (const item of batch) {
          // Angel One API field mapping
          const symbol = item.symbol;
          const instrumentType = item.instrumenttype;
          const exchange = item.exch_seg;
          const name = item.name;
          const lotSize = item.lotsize;
          const expiry = item.expiry;
          const strikePrice = item.strike;
          const tickSize = item.tick_size;
          const token = item.token;

          // Skip if essential fields are missing or empty
          if (!symbol || !instrumentType || !exchange || 
              symbol.trim() === '' || instrumentType.trim() === '' || exchange.trim() === '') {
            continue; // Skip silently to avoid log spam
          }

          const universalId = this.generateUniversalId(symbol, instrumentType, exchange);

          const instrumentData = {
            _id: universalId,
            symbol: symbol,
            name: name,
            exchange: exchange,
            segment: this.getSegmentFromInstrumentType(instrumentType),
            instrument_type: instrumentType,
            lot_size: parseInt(lotSize) || 1,
            expiry: (expiry && expiry.trim() !== '') ? new Date(expiry) : null,
            strike_price: (strikePrice && strikePrice !== '0.000000' && strikePrice.trim() !== '') ? parseFloat(strikePrice) : null,
            tick_size: tickSize ? parseFloat(tickSize) : 0.05,
            'brokers.angel': {
              token: token,
              tradable: true, // Angel One doesn't provide status field, assume all are tradable
              last_updated: new Date()
            },
            updated_at: new Date()
          };

          // Use upsert operation for bulk efficiency
          bulkOps.push({
            updateOne: {
              filter: { _id: universalId },
              update: { 
                $set: {
                  ...instrumentData,
                  // Preserve existing Dhan data if it exists
                  $setOnInsert: { 'brokers.dhan': { token: null, tradable: false, last_updated: null } }
                }
              },
              upsert: true
            }
          });
        }
        
        // Execute bulk operation
        if (bulkOps.length > 0) {
          try {
            const result = await Instrument.bulkWrite(bulkOps, { ordered: false });
            processedCount += result.upsertedCount + result.modifiedCount;
            newEntries += result.upsertedCount;
            updatedEntries += result.modifiedCount;
          } catch (error) {
            console.error(`❌ Bulk operation failed for batch ${batchIndex + 1}:`, error.message);
            // Continue with next batch
          }
        }
        
        // Add a small delay between batches to prevent overwhelming the database
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Log the update
      await InstrumentUpdate.create({
        _id: `${new Date().toISOString().split('T')[0]}-angel`,
        exchange: 'ALL',
        broker: 'angel',
        count: processedCount,
        new_entries: newEntries,
        updated_entries: updatedEntries,
        status: 'success'
      });

      console.log(`✅ Angel One: Processed ${processedCount} instruments (${newEntries} new, ${updatedEntries} updated)`);
      return { success: true, count: processedCount, new: newEntries, updated: updatedEntries };

    } catch (error) {
      console.error('❌ Error updating Angel One instruments:', error.message);
      
      await InstrumentUpdate.create({
        _id: `${new Date().toISOString().split('T')[0]}-angel`,
        exchange: 'ALL',
        broker: 'angel',
        status: 'failed',
        error_message: error.message
      });

      return { success: false, error: error.message };
    }
  }

  // Update Dhan instruments
  async updateDhanInstruments() {
    try {
      console.log('🔄 Fetching Dhan instruments...');
      
      const response = await axios.get(this.dhanUrl, { responseType: 'stream' });
      const csvPath = path.join(__dirname, '../temp/dhan_instruments.csv');
      
      // Ensure temp directory exists
      const tempDir = path.dirname(csvPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write CSV to file
      const writer = fs.createWriteStream(csvPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
          try {
            const instruments = [];
            
            await new Promise((resolveParse) => {
              fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                  // Dhan CSV field mapping
                  const symbol = row.SYMBOL_NAME;
                  const instrumentType = row.INSTRUMENT_TYPE;
                  const exchange = row.EXCH_ID;
                  const name = row.DISPLAY_NAME;
                  const lotSize = row.LOT_SIZE;
                  const expiryDate = row.SM_EXPIRY_DATE;
                  const strikePrice = row.STRIKE_PRICE;
                  const tickSize = row.TICK_SIZE;
                  const token = row.SECURITY_ID;

                  // Skip if essential fields are missing or empty
                  if (!symbol || !instrumentType || !exchange || 
                      symbol.trim() === '' || instrumentType.trim() === '' || exchange.trim() === '') {
                    return; // Skip silently
                  }

                  const universalId = this.generateUniversalId(symbol, instrumentType, exchange);

                  const instrumentData = {
                    _id: universalId,
                    symbol: symbol,
                    name: name,
                    exchange: exchange,
                    segment: this.getSegmentFromInstrumentType(instrumentType),
                    instrument_type: instrumentType,
                    lot_size: parseInt(lotSize) || 1,
                    expiry: (expiryDate && expiryDate.trim() !== '') ? new Date(expiryDate) : null,
                    strike_price: (strikePrice && strikePrice !== '-0.01000' && strikePrice.trim() !== '') ? parseFloat(strikePrice) : null,
                    tick_size: tickSize ? parseFloat(tickSize) : 0.05,
                    'brokers.dhan': {
                      token: token,
                      tradable: true, // Assume all Dhan instruments are tradable
                      last_updated: new Date()
                    },
                    updated_at: new Date()
                  };

                  instruments.push(instrumentData);
                })
                .on('end', resolveParse);
            });

            let processedCount = 0;
            let newEntries = 0;
            let updatedEntries = 0;
            const batchSize = 1000; // Process in batches
            const batches = [];

            // Create batches
            for (let i = 0; i < instruments.length; i += batchSize) {
              batches.push(instruments.slice(i, i + batchSize));
            }

            console.log(`📦 Processing ${batches.length} batches of ${batchSize} records each for Dhan`);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
              const batch = batches[batchIndex];
              console.log(`🔄 Processing Dhan batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);
              
              const bulkOps = [];
              
              for (const instrumentData of batch) {
                // Use upsert operation for bulk efficiency
                bulkOps.push({
                  updateOne: {
                    filter: { _id: instrumentData._id },
                    update: { 
                      $set: {
                        ...instrumentData,
                        // Preserve existing Angel data if it exists
                        $setOnInsert: { 'brokers.angel': { token: null, tradable: false, last_updated: null } }
                      }
                    },
                    upsert: true
                  }
                });
              }
              
              // Execute bulk operation
              if (bulkOps.length > 0) {
                try {
                  const result = await Instrument.bulkWrite(bulkOps, { ordered: false });
                  processedCount += result.upsertedCount + result.modifiedCount;
                  newEntries += result.upsertedCount;
                  updatedEntries += result.modifiedCount;
                } catch (error) {
                  console.error(`❌ Dhan bulk operation failed for batch ${batchIndex + 1}:`, error.message);
                  // Continue with next batch
                }
              }
              
              // Add a small delay between batches
              if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }

            // Clean up temp file
            fs.unlinkSync(csvPath);

            // Log the update
            await InstrumentUpdate.create({
              _id: `${new Date().toISOString().split('T')[0]}-dhan`,
              exchange: 'ALL',
              broker: 'dhan',
              count: processedCount,
              new_entries: newEntries,
              updated_entries: updatedEntries,
              status: 'success'
            });

            console.log(`✅ Dhan: Processed ${processedCount} instruments (${newEntries} new, ${updatedEntries} updated)`);
            resolve({ success: true, count: processedCount, new: newEntries, updated: updatedEntries });

          } catch (error) {
            console.error('❌ Error processing Dhan CSV:', error.message);
            reject(error);
          }
        });

        writer.on('error', (error) => {
          console.error('❌ Error downloading Dhan CSV:', error.message);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Error updating Dhan instruments:', error.message);
      
      await InstrumentUpdate.create({
        _id: `${new Date().toISOString().split('T')[0]}-dhan`,
        exchange: 'ALL',
        broker: 'dhan',
        status: 'failed',
        error_message: error.message
      });

      return { success: false, error: error.message };
    }
  }

  // Update all instruments (both brokers)
  async updateAllInstruments() {
    console.log('🚀 Starting instrument update for all brokers...');
    
    const angelResult = await this.updateAngelInstruments();
    const dhanResult = await this.updateDhanInstruments();

    return {
      angel: angelResult,
      dhan: dhanResult,
      timestamp: new Date()
    };
  }

  // Get popular instruments for frontend tabs
  async getPopularInstruments() {
    try {
      const popularSymbols = {
        options: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'],
        indices: ['NIFTY 50', 'NIFTY BANK', 'NIFTY FIN SERVICE'],
        equity: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HDFC', 'ICICIBANK', 'KOTAKBANK', 'BHARTIARTL', 'ITC', 'SBIN'],
        futures: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HDFC', 'ICICIBANK']
      };

      const result = {};

      for (const [category, symbols] of Object.entries(popularSymbols)) {
        const instruments = await Instrument.find({
          symbol: { $in: symbols },
          instrument_type: this.getInstrumentTypeForCategory(category)
        }).limit(50);

        result[category] = instruments.map(inst => ({
          id: inst._id,
          symbol: inst.symbol,
          name: inst.name,
          exchange: inst.exchange,
          segment: inst.segment,
          instrument_type: inst.instrument_type,
          lot_size: inst.lot_size,
          expiry: inst.expiry,
          strike_price: inst.strike_price,
          brokers: inst.brokers
        }));
      }

      return result;
    } catch (error) {
      console.error('Error getting popular instruments:', error);
      throw error;
    }
  }

  // Get instrument type filter for category
  getInstrumentTypeForCategory(category) {
    const mapping = {
      'options': ['OPTIDX', 'OPTSTK'],
      'indices': ['INDEX'],
      'equity': ['EQUITY'],
      'futures': ['FUTIDX', 'FUTSTK']
    };
    return mapping[category] || [];
  }

  // Search instruments with pagination
  async searchInstruments(query, category, page = 1, limit = 20, broker = null) {
    try {
      const skip = (page - 1) * limit;
      let filter = {};

      // Add category filter
      if (category && category !== 'all') {
        const instrumentTypes = this.getInstrumentTypeForCategory(category);
        if (instrumentTypes.length > 0) {
          filter.instrument_type = { $in: instrumentTypes };
        }
      }

      // Add broker filter
      if (broker) {
        filter[`brokers.${broker}.tradable`] = true;
      }

      // Add search filter
      if (query) {
        filter.$or = [
          { symbol: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } }
        ];
      }

      const [instruments, total] = await Promise.all([
        Instrument.find(filter)
          .sort({ symbol: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Instrument.countDocuments(filter)
      ]);

      return {
        instruments: instruments.map(inst => ({
          id: inst._id,
          symbol: inst.symbol,
          name: inst.name,
          exchange: inst.exchange,
          segment: inst.segment,
          instrument_type: inst.instrument_type,
          lot_size: inst.lot_size,
          expiry: inst.expiry,
          strike_price: inst.strike_price,
          brokers: inst.brokers
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error searching instruments:', error);
      throw error;
    }
  }

  // Get instrument by ID
  async getInstrumentById(id) {
    try {
      const instrument = await Instrument.findById(id);
      if (!instrument) {
        throw new Error('Instrument not found');
      }

      return {
        id: instrument._id,
        symbol: instrument.symbol,
        name: instrument.name,
        exchange: instrument.exchange,
        segment: instrument.segment,
        instrument_type: instrument.instrument_type,
        lot_size: instrument.lot_size,
        expiry: instrument.expiry,
        strike_price: instrument.strike_price,
        tick_size: instrument.tick_size,
        brokers: instrument.brokers
      };
    } catch (error) {
      console.error('Error getting instrument by ID:', error);
      throw error;
    }
  }

  // Get update history
  async getUpdateHistory(limit = 10) {
    try {
      const updates = await InstrumentUpdate.find()
        .sort({ updated_at: -1 })
        .limit(limit)
        .lean();

      return updates;
    } catch (error) {
      console.error('Error getting update history:', error);
      throw error;
    }
  }
}

module.exports = new InstrumentService();
