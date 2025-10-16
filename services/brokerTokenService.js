const Instrument = require('../models/instrumentModel');

class BrokerTokenService {
  
  // Get broker token for a universal instrument ID
  async getBrokerToken(universalId, broker) {
    try {
      const instrument = await Instrument.findById(universalId);
      
      if (!instrument) {
        throw new Error(`Instrument not found: ${universalId}`);
      }
      
      if (!instrument.brokers[broker]?.tradable) {
        throw new Error(`Instrument not available on ${broker}`);
      }
      
      if (!instrument.brokers[broker]?.token) {
        throw new Error(`No token available for ${broker}`);
      }
      
      return {
        success: true,
        token: instrument.brokers[broker].token,
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        instrument_type: instrument.instrument_type,
        lot_size: instrument.lot_size,
        tick_size: instrument.tick_size
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get all available brokers for an instrument
  async getAvailableBrokers(universalId) {
    try {
      const instrument = await Instrument.findById(universalId);
      
      if (!instrument) {
        throw new Error(`Instrument not found: ${universalId}`);
      }
      
      const availableBrokers = [];
      
      Object.keys(instrument.brokers).forEach(broker => {
        if (instrument.brokers[broker]?.tradable && instrument.brokers[broker]?.token) {
          availableBrokers.push({
            broker,
            token: instrument.brokers[broker].token,
            last_updated: instrument.brokers[broker].last_updated
          });
        }
      });
      
      return {
        success: true,
        brokers: availableBrokers,
        symbol: instrument.symbol,
        exchange: instrument.exchange
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get instruments available on both brokers (for strategy creation)
  async getMultiBrokerInstruments(category = null, limit = 50) {
    try {
      let filter = {
        'brokers.angel.tradable': true,
        'brokers.dhan.tradable': true,
        'brokers.angel.token': { $exists: true, $ne: null },
        'brokers.dhan.token': { $exists: true, $ne: null }
      };
      
      if (category && category !== 'all') {
        const instrumentTypes = this.getInstrumentTypeForCategory(category);
        if (instrumentTypes.length > 0) {
          filter.instrument_type = { $in: instrumentTypes };
        }
      }
      
      const instruments = await Instrument.find(filter)
        .sort({ symbol: 1 })
        .limit(limit)
        .lean();
      
      return {
        success: true,
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
          brokers: {
            angel: inst.brokers.angel,
            dhan: inst.brokers.dhan
          }
        }))
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get popular instruments for frontend tabs (multi-broker only)
  async getPopularMultiBrokerInstruments() {
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
          'brokers.angel.tradable': true,
          'brokers.dhan.tradable': true,
          'brokers.angel.token': { $exists: true, $ne: null },
          'brokers.dhan.token': { $exists: true, $ne: null }
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

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Helper function for instrument type mapping
  getInstrumentTypeForCategory(category) {
    const mapping = {
      'options': ['OPTIDX', 'OPTSTK'],
      'indices': ['INDEX', 'AMXIDX'],
      'equity': ['EQUITY'],
      'futures': ['FUTIDX', 'FUTSTK']
    };
    return mapping[category] || [];
  }
  
  // Validate strategy can be executed on user's broker
  async validateStrategyForBroker(strategyData, userBroker) {
    try {
      const instrument = await Instrument.findById(strategyData.symbol);
      
      if (!instrument) {
        return {
          valid: false,
          error: 'Instrument not found'
        };
      }
      
      if (!instrument.brokers[userBroker]?.tradable) {
        return {
          valid: false,
          error: `Instrument not available on ${userBroker}`
        };
      }
      
      if (!instrument.brokers[userBroker]?.token) {
        return {
          valid: false,
          error: `No token available for ${userBroker}`
        };
      }
      
      return {
        valid: true,
        instrument: {
          id: instrument._id,
          symbol: instrument.symbol,
          exchange: instrument.exchange,
          token: instrument.brokers[userBroker].token,
          lot_size: instrument.lot_size,
          tick_size: instrument.tick_size
        }
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new BrokerTokenService();
