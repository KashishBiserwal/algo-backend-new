const yahooFinance = require("yahoo-finance2").default;
const Bar = require('../models/barModel');
const moment = require('moment-timezone');

// Mapping of instrument symbols to Yahoo Finance symbols
const INSTRUMENT_MAPPING = {
  "NIFTY50": "^NSEI",      // NSE NIFTY 50
  "BANKNIFTY": "^NSEBANK", // NSE BANK NIFTY
  "FINNIFTY": "^NSEFINNIFTY", // NSE FINNIFTY
  "SENSEX": "^BSESN",      // BSE SENSEX
  "NIFTY": "^NSEI",        // Alias for NIFTY50
  "NIFTY BANK": "^NSEBANK", // Alias for BANKNIFTY
  "NIFTY FINANCIAL": "^NSEFINNIFTY", // Alias for FINNIFTY
  "MIDCAPNIFTY": "^NSEMIDCAP", // NSE MIDCAP NIFTY
  "SMALLCAPNIFTY": "^NSESMALLCAP", // NSE SMALLCAP NIFTY
  "NIFTYIT": "^NSEIT",     // NSE IT NIFTY
  "NIFTYPHARMA": "^NSEPHARMA", // NSE PHARMA NIFTY
  "NIFTYAUTO": "^NSEAUTO", // NSE AUTO NIFTY
  "NIFTYFMCG": "^NSEFMCG", // NSE FMCG NIFTY
  "NIFTYMETAL": "^NSEMETAL", // NSE METAL NIFTY
  "NIFTYREALTY": "^NSEREALTY", // NSE REALTY NIFTY
  "NIFTYENERGY": "^NSEENERGY", // NSE ENERGY NIFTY
  "NIFTYPSU": "^NSEPSU",   // NSE PSU NIFTY
  "NIFTYPVT": "^NSEPVT",   // NSE PVT NIFTY
  "NIFTYCONSUMER": "^NSECONSUMER", // NSE CONSUMER NIFTY
  "NIFTYINFRA": "^NSEINFRA", // NSE INFRA NIFTY
  "NIFTYMEDIA": "^NSEMEDIA", // NSE MEDIA NIFTY
  "NIFTYMNC": "^NSEMNC",   // NSE MNC NIFTY
  "NIFTYGROWTH": "^NSEGROWTH", // NSE GROWTH NIFTY
  "NIFTYVALUE": "^NSEVALUE", // NSE VALUE NIFTY
  "NIFTYQUALITY": "^NSEQUALITY", // NSE QUALITY NIFTY
  "NIFTYLOWVOL": "^NSELOWVOL", // NSE LOW VOL NIFTY
  "NIFTYALPHA": "^NSEALPHA", // NSE ALPHA NIFTY
  "NIFTYBETA": "^NSEBETA", // NSE BETA NIFTY
  "NIFTYMOMENTUM": "^NSEMOMENTUM", // NSE MOMENTUM NIFTY
  "NIFTYDIVIDEND": "^NSEDIVIDEND", // NSE DIVIDEND NIFTY
  "NIFTYEQUAL": "^NSEEQUAL", // NSE EQUAL NIFTY
  "NIFTY100": "^NSE100",   // NSE 100 NIFTY
  "NIFTY200": "^NSE200",   // NSE 200 NIFTY
  "NIFTY500": "^NSE500",   // NSE 500 NIFTY
  "NIFTYNEXT50": "^NSENEXT50", // NSE NEXT 50 NIFTY
  "NIFTYMICROCAP": "^NSEMICROCAP", // NSE MICROCAP NIFTY
  "NIFTYSMALLCAP100": "^NSESMALLCAP100", // NSE SMALLCAP 100 NIFTY
  "NIFTYSMALLCAP250": "^NSESMALLCAP250", // NSE SMALLCAP 250 NIFTY
  "NIFTYSMALLCAP400": "^NSESMALLCAP400", // NSE SMALLCAP 400 NIFTY
  "NIFTYSMALLCAP500": "^NSESMALLCAP500", // NSE SMALLCAP 500 NIFTY
  "NIFTYSMALLCAP600": "^NSESMALLCAP600", // NSE SMALLCAP 600 NIFTY
  "NIFTYSMALLCAP700": "^NSESMALLCAP700", // NSE SMALLCAP 700 NIFTY
  "NIFTYSMALLCAP800": "^NSESMALLCAP800", // NSE SMALLCAP 800 NIFTY
  "NIFTYSMALLCAP900": "^NSESMALLCAP900", // NSE SMALLCAP 900 NIFTY
  "NIFTYSMALLCAP1000": "^NSESMALLCAP1000", // NSE SMALLCAP 1000 NIFTY
  "NIFTYMIDCAP100": "^NSEMIDCAP100", // NSE MIDCAP 100 NIFTY
  "NIFTYMIDCAP150": "^NSEMIDCAP150", // NSE MIDCAP 150 NIFTY
  "NIFTYMIDCAP200": "^NSEMIDCAP200", // NSE MIDCAP 200 NIFTY
  "NIFTYMIDCAP250": "^NSEMIDCAP250", // NSE MIDCAP 250 NIFTY
  "NIFTYMIDCAP300": "^NSEMIDCAP300", // NSE MIDCAP 300 NIFTY
  "NIFTYMIDCAP400": "^NSEMIDCAP400", // NSE MIDCAP 400 NIFTY
  "NIFTYMIDCAP500": "^NSEMIDCAP500", // NSE MIDCAP 500 NIFTY
  "NIFTYMIDCAP600": "^NSEMIDCAP600", // NSE MIDCAP 600 NIFTY
  "NIFTYMIDCAP700": "^NSEMIDCAP700", // NSE MIDCAP 700 NIFTY
  "NIFTYMIDCAP800": "^NSEMIDCAP800", // NSE MIDCAP 800 NIFTY
  "NIFTYMIDCAP900": "^NSEMIDCAP900", // NSE MIDCAP 900 NIFTY
  "NIFTYMIDCAP1000": "^NSEMIDCAP1000", // NSE MIDCAP 1000 NIFTY
  // Individual stocks
  "TCS": "TCS.NS", // TCS on NSE
  "RELIANCE": "RELIANCE.NS", // Reliance on NSE
  "HDFCBANK": "HDFCBANK.NS", // HDFC Bank on NSE
  "INFY": "INFY.NS", // Infosys on NSE
  "HDFC": "HDFC.NS", // HDFC on NSE
  "ICICIBANK": "ICICIBANK.NS", // ICICI Bank on NSE
  "KOTAKBANK": "KOTAKBANK.NS", // Kotak Bank on NSE
  "BHARTIARTL": "BHARTIARTL.NS", // Bharti Airtel on NSE
  "ITC": "ITC.NS", // ITC on NSE
  "SBIN": "SBIN.NS" // State Bank of India on NSE
};

class HistoricalDataService {
  
  // Fetch and save historical data for an instrument
  async fetchAndSaveHistoricalData(instrument = "NIFTY50", startDate = "2023-01-01", endDate = null) {
    try {
      console.log(`📊 Fetching historical data for ${instrument}...`);
      
      const yahooSymbol = INSTRUMENT_MAPPING[instrument];
      console.log(`🔍 Looking up symbol mapping for ${instrument}: ${yahooSymbol}`);
      if (!yahooSymbol) {
        console.log(`❌ No mapping found for ${instrument}`);
        throw new Error(`No Yahoo Finance symbol mapping found for ${instrument}`);
      }

      // Set default end date to today if not provided
      if (!endDate) {
        endDate = moment().format('YYYY-MM-DD');
      }

      console.log(`🔍 Fetching data for ${yahooSymbol} from ${startDate} to ${endDate}`);

      // Fetch data from Yahoo Finance
      const result = await yahooFinance.historical(yahooSymbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d' // Daily data
      });

      if (!result || result.length === 0) {
        throw new Error(`No data received from Yahoo Finance for ${yahooSymbol}`);
      }

      console.log(`📈 Received ${result.length} data points for ${instrument}`);

      // Process and save data
      const bars = [];
      let savedCount = 0;
      let skippedCount = 0;

      for (const dataPoint of result) {
        try {
          const bar = {
            symbol: instrument,
            timestamp: new Date(dataPoint.date),
            open: dataPoint.open,
            high: dataPoint.high,
            low: dataPoint.low,
            close: dataPoint.close,
            volume: dataPoint.volume || 0
          };

          // Use upsert to avoid duplicates
          const existingBar = await Bar.findOneAndUpdate(
            { symbol: instrument, timestamp: bar.timestamp },
            bar,
            { upsert: true, new: true }
          );

          if (existingBar.isNew) {
            savedCount++;
          } else {
            skippedCount++;
          }

          bars.push(bar);
        } catch (error) {
          console.warn(`⚠️ Error processing data point for ${instrument}:`, error.message);
          skippedCount++;
        }
      }

      console.log(`✅ Data processing completed for ${instrument}:`);
      console.log(`   📊 Total data points: ${result.length}`);
      console.log(`   💾 New records saved: ${savedCount}`);
      console.log(`   ⏭️ Existing records skipped: ${skippedCount}`);

      return {
        success: true,
        instrument,
        yahooSymbol,
        totalDataPoints: result.length,
        newRecords: savedCount,
        skippedRecords: skippedCount,
        dateRange: {
          from: result[0].date,
          to: result[result.length - 1].date
        },
        latestPrice: result[result.length - 1].close
      };

    } catch (error) {
      console.error(`❌ Error fetching data for ${instrument}:`, error.message);
      throw error;
    }
  }

  // Check data availability for an instrument
  async checkDataAvailability(instrument = "NIFTY50") {
    try {
      const latestBar = await Bar.findOne({ symbol: instrument }).sort({ timestamp: -1 });
      const earliestBar = await Bar.findOne({ symbol: instrument }).sort({ timestamp: 1 });
      const totalBars = await Bar.countDocuments({ symbol: instrument });

      if (!latestBar) {
        return {
          available: false,
          message: `No data found for ${instrument}`,
          instrument
        };
      }

      return {
        available: true,
        instrument,
        totalBars,
        dateRange: {
          from: earliestBar.timestamp,
          to: latestBar.timestamp
        },
        latestPrice: latestBar.close
      };
    } catch (error) {
      return {
        available: false,
        message: `Error checking data for ${instrument}: ${error.message}`,
        instrument
      };
    }
  }

  // Ensure data is available for backtesting
  async ensureDataAvailable(instrument, options = {}) {
    const { minRecords = 100, startDate = '2023-01-01' } = options;
    
    try {
      console.log(`🔍 Checking data availability for ${instrument}...`);
      console.log(`📊 Options:`, { minRecords, startDate });
      
      const dataCheck = await this.checkDataAvailability(instrument);
      console.log(`📊 Data check result:`, dataCheck);
      
      if (!dataCheck.available) {
        console.log(`📥 No data found for ${instrument}, fetching...`);
        const fetchResult = await this.fetchAndSaveHistoricalData(instrument, startDate);
        return {
          success: true,
          fetched: true,
          dataInfo: {
            totalBars: fetchResult.newRecords,
            dateRange: fetchResult.dateRange,
            latestPrice: fetchResult.latestPrice
          },
          message: `Data fetched successfully for ${instrument}`
        };
      }

      if (dataCheck.totalBars < minRecords) {
        console.log(`📥 Insufficient data for ${instrument} (${dataCheck.totalBars} < ${minRecords}), fetching more...`);
        const fetchResult = await this.fetchAndSaveHistoricalData(instrument, startDate);
        return {
          success: true,
          fetched: true,
          dataInfo: {
            totalBars: dataCheck.totalBars + fetchResult.newRecords,
            dateRange: dataCheck.dateRange,
            latestPrice: dataCheck.latestPrice
          },
          message: `Additional data fetched for ${instrument}`
        };
      }

      return {
        success: true,
        fetched: false,
        dataInfo: {
          totalBars: dataCheck.totalBars,
          dateRange: dataCheck.dateRange,
          latestPrice: dataCheck.latestPrice
        },
        message: `Data already available for ${instrument}`
      };

    } catch (error) {
      return {
        success: false,
        fetched: false,
        message: `Failed to ensure data for ${instrument}: ${error.message}`
      };
    }
  }

  // Fetch all instruments data
  async fetchAllInstruments() {
    const instruments = Object.keys(INSTRUMENT_MAPPING);
    const results = {};

    for (const instrument of instruments) {
      try {
        results[instrument] = await this.fetchAndSaveHistoricalData(instrument);
      } catch (error) {
        console.error(`Failed to fetch ${instrument}:`, error.message);
        results[instrument] = { error: error.message };
      }
    }

    return results;
  }

  // Check all instruments data availability
  async checkAllInstrumentsData() {
    const instruments = Object.keys(INSTRUMENT_MAPPING);
    const results = {};

    for (const instrument of instruments) {
      results[instrument] = await this.checkDataAvailability(instrument);
    }

    return results;
  }

  // Get data for backtesting
  async getBacktestData(instrument, startDate, endDate) {
    try {
      const bars = await Bar.find({
        symbol: instrument,
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).sort({ timestamp: 1 });

      return {
        success: true,
        instrument,
        data: bars,
        count: bars.length,
        dateRange: {
          from: bars[0]?.timestamp,
          to: bars[bars.length - 1]?.timestamp
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new HistoricalDataService();
