const mongoose = require('mongoose');
const Strategy = require('../models/strategyModel');
const Bar = require('../models/barModel');
const Instrument = require('../models/instrumentModel');
const moment = require('moment-timezone');
require('dotenv').config();

async function testBacktestDirect() {
  try {
    console.log('🔍 Testing backtest logic directly...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get strategy
    const strategy = await Strategy.findOne({ name: 'Nifty Options Backtest Strategy' });
    if (!strategy) {
      console.log('❌ Strategy not found');
      return;
    }
    
    console.log('✅ Strategy found:', strategy.name);
    console.log('📋 Strategy instrument:', strategy.instrument);
    
    // Get instrument
    const instrument = await Instrument.findById(strategy.instrument);
    if (!instrument) {
      console.log('❌ Instrument not found');
      return;
    }
    
    console.log('✅ Instrument found:', instrument.symbol);
    
    const underlyingSymbol = instrument.symbol;
    console.log('📋 Underlying symbol:', underlyingSymbol);
    
    // Get latest bar
    const latestBar = await Bar.findOne({ symbol: underlyingSymbol }).sort({ timestamp: -1 });
    if (!latestBar) {
      console.log('❌ No historical data found');
      return;
    }
    
    console.log('✅ Latest bar found:', latestBar.timestamp);
    console.log('📋 Latest price:', latestBar.close);
    
    // Calculate date range
    const backtestEndDate = moment(latestBar.timestamp).tz("Asia/Kolkata");
    const backtestStartDate = backtestEndDate.clone().subtract(1, "months");
    
    console.log('📋 Backtest period:', backtestStartDate.format('YYYY-MM-DD'), 'to', backtestEndDate.format('YYYY-MM-DD'));
    
    // Get bars for the period
    const allBars = await Bar.find({
      symbol: underlyingSymbol,
      timestamp: {
        $gte: backtestStartDate.toDate(),
        $lte: backtestEndDate.toDate(),
      },
    }).sort({ timestamp: 1 });
    
    console.log('✅ Found', allBars.length, 'bars for backtesting');
    
    if (allBars.length === 0) {
      console.log('❌ No bars found for the period');
      return;
    }
    
    // Test the first bar
    const firstBar = allBars[0];
    console.log('📋 First bar:', firstBar.timestamp, 'Open:', firstBar.open, 'Close:', firstBar.close);
    
    // Test order legs processing
    console.log('\n🧪 Testing order legs processing...');
    for (const leg of strategy.order_legs) {
      console.log('📋 Processing leg:', leg);
      
      // Test strike price calculation
      const { calculateStrikePrice } = require('../utils/optionPricing');
      const strikePrice = calculateStrikePrice(
        firstBar.open, 
        leg.strike_price_reference, 
        leg.strike_price_selection, 
        underlyingSymbol
      );
      console.log('✅ Strike price calculated:', strikePrice);
      
      // Test expiry calculation
      const { getWeeklyExpiry } = require('../utils/optionPricing');
      const day = moment(firstBar.timestamp).tz("Asia/Kolkata");
      const expiryDate = getWeeklyExpiry(day);
      console.log('✅ Expiry date calculated:', expiryDate.format('YYYY-MM-DD'));
      
      // Test option symbol generation
      const { getOptionSymbol } = require('../utils/optionPricing');
      const optionSymbol = getOptionSymbol(
        underlyingSymbol,
        expiryDate,
        strikePrice,
        leg.instrument_type
      );
      console.log('✅ Option symbol generated:', optionSymbol);
      
      // Test option pricing
      const { getRealisticOptionPrice } = require('../utils/optionPricing');
      const timeToExpiry = expiryDate.diff(day, 'days') / 365;
      const optionPricing = getRealisticOptionPrice(
        underlyingSymbol,
        strikePrice,
        firstBar.open,
        timeToExpiry,
        leg.instrument_type,
        leg.quantity,
        {
          volatility: 0.2,
          liquidity: 'normal'
        }
      );
      console.log('✅ Option pricing calculated:', optionPricing.price);
    }
    
    console.log('\n✅ All backtest components working correctly!');
    
  } catch (error) {
    console.error('❌ Error in direct backtest test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testBacktestDirect();
