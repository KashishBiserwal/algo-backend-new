const TradingEngine = require('../services/tradingEngine');
const Strategy = require('../models/strategyModel');
const Order = require('../models/orderModel');
const BrokerConnection = require('../models/brokerConnectionModel');

// Initialize trading engine instance
const tradingEngine = new TradingEngine();

// Start trading engine
const startTradingEngine = async (req, res) => {
  try {
    const result = await tradingEngine.start();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Trading engine started successfully',
        status: tradingEngine.getStatus()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to start trading engine',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error starting trading engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trading engine',
      error: error.message
    });
  }
};

// Stop trading engine
const stopTradingEngine = async (req, res) => {
  try {
    const result = await tradingEngine.stop();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Trading engine stopped successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to stop trading engine',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error stopping trading engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop trading engine',
      error: error.message
    });
  }
};

// Get trading engine status
const getTradingEngineStatus = async (req, res) => {
  try {
    const status = tradingEngine.getStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting trading engine status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trading engine status',
      error: error.message
    });
  }
};

// Add strategy to trading engine
const addStrategyToEngine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      userId: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Check if user has broker connection
    const connection = await BrokerConnection.findOne({
      userId: userId,
      broker: strategy.broker,
      isConnected: true
    });
    
    if (!connection) {
      return res.status(400).json({
        success: false,
        message: `No ${strategy.broker} broker connection found`
      });
    }
    
    // Add strategy to trading engine
    const result = await tradingEngine.addStrategy(strategy);
    
    if (result.success) {
      // Update strategy status in database
      strategy.status = 'active';
      await strategy.save();
      
      res.status(200).json({
        success: true,
        message: 'Strategy added to trading engine successfully',
        strategyId: result.strategyId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to add strategy to trading engine',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error adding strategy to engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add strategy to trading engine',
      error: error.message
    });
  }
};

// Remove strategy from trading engine
const removeStrategyFromEngine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      userId: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Remove strategy from trading engine
    const result = await tradingEngine.removeStrategy(strategyId);
    
    if (result.success) {
      // Update strategy status in database
      strategy.status = 'stopped';
      await strategy.save();
      
      res.status(200).json({
        success: true,
        message: 'Strategy removed from trading engine successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to remove strategy from trading engine',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error removing strategy from engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove strategy from trading engine',
      error: error.message
    });
  }
};

// Execute strategy manually
const executeStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      userId: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Execute strategy
    const result = await tradingEngine.executeStrategy(strategyId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Strategy executed successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to execute strategy',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error executing strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute strategy',
      error: error.message
    });
  }
};

// Get user portfolio
const getUserPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await tradingEngine.getUserPortfolio(userId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get portfolio',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting user portfolio:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get portfolio',
      error: error.message
    });
  }
};

// Get strategy performance
const getStrategyPerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    // Verify strategy belongs to user
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      userId: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    const result = await tradingEngine.getStrategyPerformance(strategyId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get strategy performance',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting strategy performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get strategy performance',
      error: error.message
    });
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, skip = 0, status } = req.query;
    
    let query = { userId };
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('strategyId', 'name type');
    
    const total = await Order.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        orders,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error.message
    });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    
    const order = await Order.findOne({ 
      _id: orderId, 
      userId: userId 
    }).populate('strategyId', 'name type');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order details',
      error: error.message
    });
  }
};

// Get order statistics
const getOrderStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate } = req.query;
    
    const [stats, pnlSummary] = await Promise.all([
      Order.getOrderStats(userId, fromDate, toDate),
      Order.getPnLSummary(userId, fromDate, toDate)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        orderStats: stats,
        pnlSummary: pnlSummary[0] || {
          totalPnL: 0,
          totalOrders: 0,
          profitableOrders: 0,
          losingOrders: 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order statistics',
      error: error.message
    });
  }
};

module.exports = {
  startTradingEngine,
  stopTradingEngine,
  getTradingEngineStatus,
  addStrategyToEngine,
  removeStrategyFromEngine,
  executeStrategy,
  getUserPortfolio,
  getStrategyPerformance,
  getUserOrders,
  getOrderDetails,
  getOrderStatistics
};
