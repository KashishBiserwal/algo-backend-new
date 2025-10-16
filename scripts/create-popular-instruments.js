const mongoose = require('mongoose');
const Instrument = require('../models/instrumentModel');
require('dotenv').config();

async function createPopularInstruments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Define popular instruments that should be available on both brokers
    const popularInstruments = [
      // Nifty 50
      { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE', type: 'INDEX' },
      { symbol: 'NIFTY 50', name: 'NIFTY 50', exchange: 'NSE', type: 'INDEX' },
      
      // Bank Nifty
      { symbol: 'BANKNIFTY', name: 'NIFTY BANK', exchange: 'NSE', type: 'INDEX' },
      { symbol: 'NIFTY BANK', name: 'NIFTY BANK', exchange: 'NSE', type: 'INDEX' },
      
      // Fin Nifty
      { symbol: 'FINNIFTY', name: 'NIFTY FIN SERVICE', exchange: 'NSE', type: 'INDEX' },
      { symbol: 'NIFTY FIN SERVICE', name: 'NIFTY FIN SERVICE', exchange: 'NSE', type: 'INDEX' },
      
      // Sensex
      { symbol: 'SENSEX', name: 'SENSEX', exchange: 'BSE', type: 'INDEX' },
      
      // Popular Stocks
      { symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'HDFC', name: 'HDFC LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'KOTAKBANK', name: 'KOTAK MAHINDRA BANK LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'BHARTIARTL', name: 'BHARTI AIRTEL LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'ITC', name: 'ITC LTD', exchange: 'NSE', type: 'EQUITY' },
      { symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', type: 'EQUITY' },
    ];
    
    console.log('🔄 Creating popular instruments for both brokers...');
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const inst of popularInstruments) {
      const universalId = `${inst.symbol}-${inst.type}-${inst.exchange}`;
      
      // Check if instrument exists
      const existing = await Instrument.findById(universalId);
      
      if (existing) {
        // Update existing instrument to ensure both brokers are available
        await Instrument.updateOne(
          { _id: universalId },
          {
            $set: {
              'brokers.angel.tradable': true,
              'brokers.dhan.tradable': true,
              updated_at: new Date()
            }
          }
        );
        updatedCount++;
        console.log(`✅ Updated: ${inst.symbol} (${inst.exchange})`);
      } else {
        // Create new instrument
        const newInstrument = {
          _id: universalId,
          symbol: inst.symbol,
          name: inst.name,
          exchange: inst.exchange,
          segment: inst.type,
          instrument_type: inst.type,
          lot_size: inst.type === 'INDEX' ? 1 : 1,
          expiry: null,
          strike_price: null,
          tick_size: 0.05,
          'brokers.angel': {
            token: null, // Will be filled when Angel data is available
            tradable: true,
            last_updated: new Date()
          },
          'brokers.dhan': {
            token: null, // Will be filled when Dhan data is available
            tradable: true,
            last_updated: new Date()
          },
          created_at: new Date(),
          updated_at: new Date()
        };
        
        await Instrument.create(newInstrument);
        createdCount++;
        console.log(`🆕 Created: ${inst.symbol} (${inst.exchange})`);
      }
    }
    
    console.log(`\n✅ Popular instruments setup completed!`);
    console.log(`🆕 Created: ${createdCount}`);
    console.log(`✅ Updated: ${updatedCount}`);
    
    // Check final state
    const totalInstruments = await Instrument.countDocuments();
    const bothBrokers = await Instrument.countDocuments({ 
      'brokers.angel.tradable': true,
      'brokers.dhan.tradable': true
    });
    
    console.log(`\n📊 Final stats:`);
    console.log(`   Total instruments: ${totalInstruments}`);
    console.log(`   Available on both brokers: ${bothBrokers}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

createPopularInstruments();
