const instrumentService = require('../services/instrumentService');
const brokerTokenService = require('../services/brokerTokenService');

// Get popular instruments for frontend tabs (multi-broker only)
const getPopularInstruments = async (req, res) => {
  try {
    const result = await brokerTokenService.getPopularMultiBrokerInstruments();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch popular instruments',
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Popular multi-broker instruments fetched successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in getPopularInstruments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular instruments',
      error: error.message
    });
  }
};

// Search instruments with pagination
const searchInstruments = async (req, res) => {
  try {
    const { 
      query = '', 
      category = 'all', 
      page = 1, 
      limit = 20, 
      broker = null 
    } = req.query;

    const result = await instrumentService.searchInstruments(
      query, 
      category, 
      parseInt(page), 
      parseInt(limit), 
      broker
    );

    res.status(200).json({
      success: true,
      message: 'Instruments search completed successfully',
      data: result.instruments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error in searchInstruments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search instruments',
      error: error.message
    });
  }
};

// Get instrument by ID
const getInstrumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const Instrument = require('../models/instrumentModel');
    const instrument = await Instrument.findById(id);

    if (!instrument) {
      return res.status(404).json({
        success: false,
        message: 'Instrument not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Instrument fetched successfully',
      data: instrument
    });
  } catch (error) {
    console.error('Error in getInstrumentById:', error);
    res.status(404).json({
      success: false,
      message: 'Instrument not found',
      error: error.message
    });
  }
};

// Get instruments by category (for specific tabs)
const getInstrumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 50, broker = null, strategyType = null } = req.query;

    // Special handling for time-based strategies - return only 4 predefined instruments
    if (strategyType === 'time_based' && category === 'options') {
      const predefinedInstruments = [
        { 
          _id: 'nifty-50-idx-nse',
          symbol: 'NIFTY 50', 
          name: 'NIFTY 50', 
          exchange: 'NSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'NIFTY50' },
            dhan: { tradable: true, token: 'NIFTY50' }
          }
        },
        { 
          _id: 'nifty-bank-idx-nse',
          symbol: 'NIFTY BANK', 
          name: 'NIFTY BANK', 
          exchange: 'NSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'BANKNIFTY' },
            dhan: { tradable: true, token: 'BANKNIFTY' }
          }
        },
        { 
          _id: 'nifty-fin-service-idx-nse',
          symbol: 'NIFTY FIN SERVICE', 
          name: 'NIFTY FIN SERVICE', 
          exchange: 'NSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'FINNIFTY' },
            dhan: { tradable: true, token: 'FINNIFTY' }
          }
        },
        { 
          _id: 'sensex-idx-bse',
          symbol: 'SENSEX', 
          name: 'SENSEX', 
          exchange: 'BSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'SENSEX' },
            dhan: { tradable: true, token: 'SENSEX' }
          }
        }
      ];

      return res.status(200).json({
        success: true,
        message: 'Predefined instruments for time-based strategies fetched successfully',
        data: predefinedInstruments,
        pagination: {
          page: 1,
          limit: 4,
          total: 4,
          pages: 1
        }
      });
    }

    const result = await instrumentService.searchInstruments(
      '', 
      category, 
      parseInt(page), 
      parseInt(limit), 
      broker
    );

    res.status(200).json({
      success: true,
      message: `${category} instruments fetched successfully`,
      data: result.instruments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error in getInstrumentsByCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instruments by category',
      error: error.message
    });
  }
};

// Get all available symbols for a category (for search dropdown)
const getSymbolsForCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { broker = null } = req.query;

    let filter = {};
    
    // Add category filter
    if (category && category !== 'all') {
      const instrumentTypes = getInstrumentTypeForCategory(category);
      if (instrumentTypes.length > 0) {
        filter.instrument_type = { $in: instrumentTypes };
      }
    }

    // Add broker filter
    if (broker) {
      filter[`brokers.${broker}.tradable`] = true;
    }

    const symbols = await Instrument.distinct('symbol', filter);

    res.status(200).json({
      success: true,
      message: `Symbols for ${category} fetched successfully`,
      data: symbols.sort()
    });
  } catch (error) {
    console.error('Error in getSymbolsForCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch symbols for category',
      error: error.message
    });
  }
};

// Manual instrument update (admin only)
const updateInstruments = async (req, res) => {
  try {
    const { broker } = req.query;
    
    let result;
    if (broker === 'angel') {
      result = await instrumentService.updateAngelInstruments();
    } else if (broker === 'dhan') {
      result = await instrumentService.updateDhanInstruments();
    } else {
      result = await instrumentService.updateAllInstruments();
    }

    res.status(200).json({
      success: true,
      message: 'Instruments updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in updateInstruments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update instruments',
      error: error.message
    });
  }
};

// Get update history
const getUpdateHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const history = await instrumentService.getUpdateHistory(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Update history fetched successfully',
      data: history
    });
  } catch (error) {
    console.error('Error in getUpdateHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch update history',
      error: error.message
    });
  }
};

// Get instrument statistics
const getInstrumentStats = async (req, res) => {
  try {
    const Instrument = require('../models/instrumentModel');
    
    const stats = await Instrument.aggregate([
      {
        $group: {
          _id: '$instrument_type',
          count: { $sum: 1 },
          angelTradable: {
            $sum: { $cond: ['$brokers.angel.tradable', 1, 0] }
          },
          dhanTradable: {
            $sum: { $cond: ['$brokers.dhan.tradable', 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalInstruments = await Instrument.countDocuments();
    const angelTradable = await Instrument.countDocuments({ 'brokers.angel.tradable': true });
    const dhanTradable = await Instrument.countDocuments({ 'brokers.dhan.tradable': true });

    res.status(200).json({
      success: true,
      message: 'Instrument statistics fetched successfully',
      data: {
        total: totalInstruments,
        angelTradable,
        dhanTradable,
        byType: stats
      }
    });
  } catch (error) {
    console.error('Error in getInstrumentStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instrument statistics',
      error: error.message
    });
  }
};

// Helper function for instrument type mapping
const getInstrumentTypeForCategory = (category) => {
  const mapping = {
    'options': ['OPTIDX', 'OPTSTK'],
    'indices': ['INDEX'],
    'equity': ['EQUITY'],
    'futures': ['FUTIDX', 'FUTSTK']
  };
  return mapping[category] || [];
};

// Get broker token for an instrument
const getBrokerToken = async (req, res) => {
  try {
    const { id } = req.params;
    const { broker } = req.query;
    
    if (!broker) {
      return res.status(400).json({
        success: false,
        message: 'Broker parameter is required'
      });
    }
    
    const result = await brokerTokenService.getBrokerToken(id, broker);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Broker token fetched successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getBrokerToken:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker token',
      error: error.message
    });
  }
};

// Get available brokers for an instrument
const getAvailableBrokers = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await brokerTokenService.getAvailableBrokers(id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Available brokers fetched successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getAvailableBrokers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available brokers',
      error: error.message
    });
  }
};

// Get multi-broker instruments only
const getMultiBrokerInstruments = async (req, res) => {
  try {
    const { category = null, limit = 50 } = req.query;
    const result = await brokerTokenService.getMultiBrokerInstruments(category, parseInt(limit));
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch multi-broker instruments',
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Multi-broker instruments fetched successfully',
      data: result.instruments
    });
  } catch (error) {
    console.error('Error in getMultiBrokerInstruments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch multi-broker instruments',
      error: error.message
    });
  }
};

// Validate strategy for broker
const validateStrategyForBroker = async (req, res) => {
  try {
    const { symbol, broker } = req.body;
    
    if (!symbol || !broker) {
      return res.status(400).json({
        success: false,
        message: 'Symbol and broker are required'
      });
    }
    
    const result = await brokerTokenService.validateStrategyForBroker({ symbol }, broker);
    
    res.status(200).json({
      success: true,
      message: 'Strategy validation completed',
      data: result
    });
  } catch (error) {
    console.error('Error in validateStrategyForBroker:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate strategy',
      error: error.message
    });
  }
};

module.exports = {
  getPopularInstruments,
  searchInstruments,
  getInstrumentById,
  getInstrumentsByCategory,
  getSymbolsForCategory,
  updateInstruments,
  getUpdateHistory,
  getInstrumentStats,
  getBrokerToken,
  getAvailableBrokers,
  getMultiBrokerInstruments,
  validateStrategyForBroker
};
