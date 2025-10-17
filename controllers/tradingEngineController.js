const TradingEngine = require('../services/tradingEngine');
const Strategy = require('../models/strategyModel');
const Order = require('../models/orderModel');
const BrokerConnection = require('../models/brokerConnectionModel');
const Instrument = require('../models/instrumentModel');

// Initialize trading engine instance
const tradingEngine = new TradingEngine();

// Initialize the trading engine when the controller loads
(async () => {
  try {
    await tradingEngine.initialize();
    console.log('✅ Trading engine initialized in controller');
  } catch (error) {
    console.error('❌ Failed to initialize trading engine in controller:', error);
  }
})();

// Validate Dhan instrument tokens for strategy
const validateDhanInstrumentTokens = async (strategy) => {
  try {
    console.log(`🔍 Validating Dhan instrument tokens for strategy: ${strategy.name}`);
    
    const missingTokens = [];
    const instrumentIds = [];
    
    // Collect all instrument IDs from strategy
    if (strategy.type === 'time_based' && strategy.instrument) {
      instrumentIds.push(strategy.instrument);
    } else if (strategy.type === 'indicator_based' && strategy.instruments) {
      strategy.instruments.forEach(instrument => {
        instrumentIds.push(instrument.instrument_id);
      });
    }
    
    console.log(`📊 Found ${instrumentIds.length} instruments to validate`);
    
    // Check each instrument for Dhan token
    for (const instrumentId of instrumentIds) {
      const instrument = await Instrument.findById(instrumentId);
      
      if (!instrument) {
        missingTokens.push({
          instrumentId,
          symbol: 'Unknown',
          reason: 'Instrument not found in database'
        });
        continue;
      }
      
      if (!instrument.brokers?.dhan?.token) {
        missingTokens.push({
          instrumentId,
          symbol: instrument.symbol,
          name: instrument.name,
          reason: 'Missing Dhan token'
        });
      } else if (!instrument.brokers?.dhan?.tradable) {
        missingTokens.push({
          instrumentId,
          symbol: instrument.symbol,
          name: instrument.name,
          reason: 'Instrument not tradable on Dhan'
        });
      }
    }
    
    if (missingTokens.length > 0) {
      console.log(`❌ Found ${missingTokens.length} instruments with missing Dhan tokens`);
      return {
        success: false,
        error: `${missingTokens.length} instruments missing Dhan tokens`,
        missingTokens
      };
    }
    
    console.log(`✅ All ${instrumentIds.length} instruments have valid Dhan tokens`);
    return {
      success: true,
      validatedCount: instrumentIds.length
    };
    
  } catch (error) {
    console.error('Error validating Dhan instrument tokens:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

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
    const { broker } = req.body;
    
    console.log(`🚀 Deploying strategy ${strategyId} for user ${userId} on broker ${broker}`);
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      created_by: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Update strategy broker if specified
    if (broker && broker !== strategy.broker) {
      strategy.broker = broker;
      await strategy.save();
      console.log(`📝 Updated strategy broker to: ${broker}`);
    }
    
    console.log(`📋 Strategy found: ${strategy.name} (${strategy.type}) for broker: ${strategy.broker}`);
    
    // Check if user has broker connection
    const connection = await BrokerConnection.findOne({
      userId: userId,
      broker: strategy.broker,
      isConnected: true
    });
    
    if (!connection) {
      return res.status(400).json({
        success: false,
        message: `No ${strategy.broker} broker connection found. Please connect your ${strategy.broker} account first.`
      });
    }
    
    console.log(`✅ Broker connection found for ${strategy.broker}`);
    
    // Initialize user's broker client in trading engine if not already done
    if (!tradingEngine.userClients.has(userId.toString())) {
      console.log(`🔧 Initializing broker client for user ${userId}`);
      await tradingEngine.initializeUserClient(userId.toString(), connection);
    }
    
    // Validate Dhan instrument tokens if strategy is for Dhan
    if (strategy.broker === 'dhan') {
      const tokenValidation = await validateDhanInstrumentTokens(strategy);
      
      if (!tokenValidation.success) {
        return res.status(400).json({
          success: false,
          message: 'Strategy deployment failed: Missing Dhan instrument tokens',
          error: tokenValidation.error,
          missingTokens: tokenValidation.missingTokens
        });
      }
      
      console.log(`✅ All Dhan instrument tokens validated for strategy: ${strategy.name}`);
    }
    
    // Add strategy to trading engine
    const result = await tradingEngine.addStrategy(strategy);
    
    if (result.success) {
      // Update strategy status in database
      strategy.status = 'active';
      await strategy.save();
      
      console.log(`✅ Strategy ${strategy.name} deployed successfully to ${strategy.broker}`);
      
      res.status(200).json({
        success: true,
        message: `Strategy deployed successfully to ${strategy.broker}`,
        data: {
          strategyId: result.strategyId,
          strategyName: strategy.name,
          broker: strategy.broker,
          status: 'active'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to deploy strategy to trading engine',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error deploying strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deploy strategy',
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

// Start trade engine for specific strategy
const startStrategyTradeEngine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    console.log(`🚀 Starting trade engine for strategy ${strategyId} (user: ${userId})`);
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      created_by: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Check if strategy is already active
    if (strategy.status === 'active') {
      return res.status(200).json({
        success: true,
        message: 'Strategy is already active',
        data: {
          strategyId,
          strategyName: strategy.name,
          broker: strategy.broker,
          status: 'active'
        }
      });
    }
    
    // Check broker connection
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
    
    // Validate Dhan tokens if needed
    if (strategy.broker === 'dhan') {
      const tokenValidation = await validateDhanInstrumentTokens(strategy);
      
      if (!tokenValidation.success) {
        return res.status(400).json({
          success: false,
          message: 'Cannot start trade engine: Missing Dhan instrument tokens',
          error: tokenValidation.error,
          missingTokens: tokenValidation.missingTokens
        });
      }
    }
    
    // Start the strategy trade engine
    const result = await tradingEngine.startStrategy(strategyId);
    
    if (result.success) {
      // Update strategy status
      strategy.status = 'active';
      await strategy.save();
      
      console.log(`✅ Trade engine started for strategy: ${strategy.name}`);
      
      res.status(200).json({
        success: true,
        message: `Trade engine started for strategy: ${strategy.name}`,
        data: {
          strategyId,
          strategyName: strategy.name,
          broker: strategy.broker,
          status: 'active'
        }
      });
    } else {
      // Check if the error is "Strategy is already active" - this means it's already running
      if (result.error && result.error.includes('already active')) {
        console.log(`ℹ️ Strategy ${strategy.name} is already active in trading engine, ensuring database status is correct`);
        
        // Ensure strategy status is active in database
        if (strategy.status !== 'active') {
          strategy.status = 'active';
          await strategy.save();
        }
        
        res.status(200).json({
          success: true,
          message: 'Strategy is already active',
          data: {
            strategyId,
            strategyName: strategy.name,
            broker: strategy.broker,
            status: 'active'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to start trade engine',
          error: result.error
        });
      }
    }
  } catch (error) {
    console.error('Error starting strategy trade engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trade engine',
      error: error.message
    });
  }
};

// Stop trade engine for specific strategy
const stopStrategyTradeEngine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    console.log(`⏹️ Stopping trade engine for strategy ${strategyId} (user: ${userId})`);
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      created_by: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Check if strategy is already stopped
    if (strategy.status === 'stopped') {
      return res.status(200).json({
        success: true,
        message: 'Strategy is already stopped',
        data: {
          strategyId,
          strategyName: strategy.name,
          broker: strategy.broker,
          status: 'stopped'
        }
      });
    }
    
    // Stop the strategy trade engine
    const result = await tradingEngine.stopStrategy(strategyId);
    
    if (result.success) {
      // Update strategy status
      strategy.status = 'stopped';
      await strategy.save();
      
      console.log(`✅ Trade engine stopped for strategy: ${strategy.name}`);
      
      res.status(200).json({
        success: true,
        message: `Trade engine stopped for strategy: ${strategy.name}`,
        data: {
          strategyId,
          strategyName: strategy.name,
          broker: strategy.broker,
          status: 'stopped'
        }
      });
    } else {
      // Check if the error is "Strategy is not active" - this means it's already stopped
      if (result.error && result.error.includes('not active')) {
        console.log(`ℹ️ Strategy ${strategy.name} is already stopped in trading engine, updating database status`);
        
        // Update strategy status to stopped in database
        strategy.status = 'stopped';
        await strategy.save();
        
        res.status(200).json({
          success: true,
          message: 'Strategy is already stopped',
          data: {
            strategyId,
            strategyName: strategy.name,
            broker: strategy.broker,
            status: 'stopped'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to stop trade engine',
          error: result.error
        });
      }
    }
  } catch (error) {
    console.error('Error stopping strategy trade engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop trade engine',
      error: error.message
    });
  }
};

// Validate strategy deployment readiness
const validateStrategyDeployment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    const { broker } = req.query;
    
    console.log(`🔍 Validating deployment readiness for strategy ${strategyId} on broker ${broker}`);
    
    // Get strategy from database
    const strategy = await Strategy.findOne({ 
      _id: strategyId, 
      created_by: userId 
    });
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }
    
    // Use specified broker or strategy's default broker
    const targetBroker = broker || strategy.broker;
    
    const validation = {
      strategy: {
        id: strategy._id,
        name: strategy.name,
        type: strategy.type,
        broker: targetBroker,
        status: strategy.status
      },
      checks: {
        brokerConnection: false,
        instrumentTokens: false,
        strategyStatus: false
      },
      issues: []
    };
    
    // Check broker connection
    const connection = await BrokerConnection.findOne({
      userId: userId,
      broker: targetBroker,
      isConnected: true
    });
    
    if (connection) {
      validation.checks.brokerConnection = true;
    } else {
      validation.issues.push(`No ${targetBroker} broker connection found`);
    }
    
    // Check strategy status
    if (strategy.status !== 'active') {
      validation.checks.strategyStatus = true;
    } else {
      validation.issues.push('Strategy is already active');
    }
    
    // Check Dhan instrument tokens if needed
    if (targetBroker === 'dhan') {
      const tokenValidation = await validateDhanInstrumentTokens(strategy);
      
      if (tokenValidation.success) {
        validation.checks.instrumentTokens = true;
      } else {
        validation.issues.push(`Missing Dhan tokens: ${tokenValidation.error}`);
        validation.missingTokens = tokenValidation.missingTokens;
      }
    } else {
      validation.checks.instrumentTokens = true; // Not needed for other brokers
    }
    
    const isReady = validation.checks.brokerConnection && 
                   validation.checks.instrumentTokens && 
                   validation.checks.strategyStatus;
    
    res.status(200).json({
      success: true,
      data: {
        ...validation,
        isReady,
        canDeploy: isReady
      }
    });
    
  } catch (error) {
    console.error('Error validating strategy deployment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate strategy deployment',
      error: error.message
    });
  }
};

// Get user's active strategies
const getUserActiveStrategies = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📊 Getting active strategies for user ${userId}`);
    
    // Get active strategies from trading engine
    const activeStrategies = tradingEngine.getActiveStrategiesForUser(userId);
    
    // Get strategies from database for additional info
    const dbStrategies = await Strategy.find({ 
      created_by: userId,
      status: { $in: ['active', 'stopped', 'paused'] }
    }).select('name type broker status created_at updated_at');
    
    // Combine engine and database data
    const strategies = dbStrategies.map(dbStrategy => {
      const engineStrategy = activeStrategies.find(es => es.id === dbStrategy._id.toString());
      
      return {
        id: dbStrategy._id,
        name: dbStrategy.name,
        type: dbStrategy.type,
        broker: dbStrategy.broker,
        status: dbStrategy.status,
        isActiveInEngine: !!engineStrategy,
        lastRun: engineStrategy?.lastRun || null,
        nextRun: engineStrategy?.nextRun || null,
        createdAt: dbStrategy.created_at,
        updatedAt: dbStrategy.updated_at
      };
    });
    
    console.log(`✅ Found ${strategies.length} strategies for user ${userId}`);
    
    res.status(200).json({
      success: true,
      data: {
        strategies,
        total: strategies.length,
        active: strategies.filter(s => s.status === 'active').length,
        stopped: strategies.filter(s => s.status === 'stopped').length,
        paused: strategies.filter(s => s.status === 'paused').length
      }
    });
    
  } catch (error) {
    console.error('Error getting user active strategies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active strategies',
      error: error.message
    });
  }
};

// Get strategy trades for terminal
const getStrategyTrades = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    console.log(`📊 Getting trades for strategy ${strategyId} and user ${userId}`);
    
    const result = await tradingEngine.getStrategyTrades(strategyId, userId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get strategy trades',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting strategy trades:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get strategy trades',
      error: error.message
    });
  }
};

// Get strategy trade statistics
const getStrategyTradeStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;
    
    console.log(`📈 Getting trade statistics for strategy ${strategyId} and user ${userId}`);
    
    const result = await tradingEngine.getStrategyTradeStats(strategyId, userId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get strategy trade statistics',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting strategy trade statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get strategy trade statistics',
      error: error.message
    });
  }
};

// Get strategy terminal data
const getStrategyTerminal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;

    console.log(`📊 Getting strategy terminal for strategy ${strategyId} and user ${userId}`);

    // Get strategy from database
    const strategy = await Strategy.findOne({
      _id: strategyId,
      created_by: userId
    });

    if (!strategy) {
      return res.status(404).json({
        Status: 'Error',
        Message: 'Strategy not found'
      });
    }

    // Get recent trades for this strategy
    const trades = await Trade.find({
      strategyId: strategyId,
      userId: userId
    }).sort({ orderTime: -1 }).limit(20);

    const terminalData = {
      strategyId: strategy._id,
      strategyName: strategy.name,
      status: strategy.status,
      mode: strategy.broker,
      deployedAt: strategy.updated_at,
      strategyConfig: {
        startTime: strategy.start_time,
        squareOffTime: strategy.square_off_time,
        orderType: strategy.order_type,
        tradeDays: Object.keys(strategy.trading_days).filter(day => strategy.trading_days[day]),
        instruments: strategy.type === 'time_based' ? [strategy.instrument] : 
                    strategy.instruments?.map(inst => inst.symbol) || []
      },
      recentOrders: trades.map(trade => ({
        orderId: trade.brokerOrderId,
        tradingSymbol: trade.instrument.symbol,
        transactionType: trade.orderType,
        qty: trade.quantity,
        entryPrice: trade.price,
        exitPrice: trade.exitPrice || null,
        pnl: trade.pnl || 0,
        orderStatus: trade.status
      }))
    };

    res.status(200).json({
      Status: 'Success',
      Data: terminalData
    });

  } catch (error) {
    console.error('Error getting strategy terminal:', error);
    res.status(500).json({
      Status: 'Error',
      Message: 'Failed to get strategy terminal data',
      Error: error.message
    });
  }
};

// Get strategy status
const getStrategyStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { strategyId } = req.params;

    console.log(`📊 Getting strategy status for strategy ${strategyId} and user ${userId}`);

    // Get strategy from database
    const strategy = await Strategy.findOne({
      _id: strategyId,
      created_by: userId
    });

    if (!strategy) {
      return res.status(404).json({
        Status: 'Error',
        Message: 'Strategy not found'
      });
    }

    // Check if strategy is active in trading engine
    const activeStrategies = tradingEngine.getActiveStrategiesForUser(userId.toString());
    const isActiveInEngine = activeStrategies.some(s => s.id === strategyId);

    // Get recent trade stats
    const recentTrades = await Trade.find({
      strategyId: strategyId,
      userId: userId
    }).sort({ orderTime: -1 }).limit(10);

    const totalPnl = recentTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const runningPositions = recentTrades.filter(trade => trade.status === 'TRADED').length;
    const pendingOrders = recentTrades.filter(trade => trade.status === 'PENDING').length;

    const statusData = {
      isRunning: strategy.status === 'active' && isActiveInEngine,
      deploymentInfo: {
        totalPnl: totalPnl,
        runningPositions: runningPositions,
        pendingOrders: pendingOrders,
        runningStatusFromDeployment: strategy.status === 'active',
        runningStatusFromRunner: isActiveInEngine
      },
      lastUpdate: new Date().toISOString()
    };

    res.status(200).json({
      Status: 'Success',
      Data: statusData
    });

  } catch (error) {
    console.error('Error getting strategy status:', error);
    res.status(500).json({
      Status: 'Error',
      Message: 'Failed to get strategy status',
      Error: error.message
    });
  }
};

// Get debug info
const getDebugInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔍 Getting debug info for user ${userId}`);

    // Get trading engine status
    const engineStatus = tradingEngine.getStatus();

    // Get user's strategies
    const strategies = await Strategy.find({ created_by: userId });
    const activeStrategies = strategies.filter(s => s.status === 'active');

    // Get user's broker connections
    const connections = await BrokerConnection.find({ userId: userId });

    const debugData = {
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      marketConditions: {
        currentTime: new Date().toLocaleTimeString(),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        isTradeDay: true, // Simplified
        isMarketOpen: true, // Simplified
        marketHours: '09:15 - 15:30',
        currentTimeValue: new Date().getTime()
      },
      userCredentials: {
        hasAngelCredentials: connections.some(c => c.broker === 'angel' && c.isConnected),
        hasAuthToken: true, // Simplified
        hasFeedToken: true, // Simplified
        clientCode: connections.find(c => c.broker === 'angel')?.clientCode || null
      },
      strategies: {
        total: strategies.length,
        deployed: activeStrategies.length,
        active: activeStrategies.length,
        details: strategies.map(strategy => ({
          strategyId: strategy._id.toString(),
          strategyName: strategy.name,
          status: strategy.status,
          runnerRunning: engineStatus.strategies.some(s => s.id === strategy._id.toString()),
          deploymentRunning: strategy.status === 'active',
          startTime: strategy.start_time,
          squareOffTime: strategy.square_off_time,
          tradeDays: Object.keys(strategy.trading_days).filter(day => strategy.trading_days[day]),
          legs: strategy.order_legs || [],
          runnerSnapshot: null
        }))
      },
      runnerManager: {
        available: true,
        totalRunners: engineStatus.connectedUsers
      }
    };

    res.status(200).json({
      Status: 'Success',
      Data: debugData
    });

  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({
      Status: 'Error',
      Message: 'Failed to get debug info',
      Error: error.message
    });
  }
};

// Start/Stop trade engine
const startStopTradeEngine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { TradeEngineName, BrokerClientId, ConnectOptions } = req.body;

    console.log(`🔧 ${ConnectOptions} trade engine for user ${userId}, broker ${BrokerClientId}`);

    // This is a simplified implementation
    // In a real system, you would start/stop the actual trading engine
    
    const result = {
      success: true,
      message: `Trade engine ${ConnectOptions.toLowerCase()}ed successfully`,
      data: {
        engineName: TradeEngineName,
        brokerId: BrokerClientId,
        status: ConnectOptions === 'Start' ? 'Running' : 'Stopped',
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Error starting/stopping trade engine:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start/stop trade engine',
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
  getOrderStatistics,
  startStrategyTradeEngine,
  stopStrategyTradeEngine,
  validateStrategyDeployment,
  getUserActiveStrategies,
  getStrategyTrades,
  getStrategyTradeStats,
  getStrategyTerminal,
  getStrategyStatus,
  getDebugInfo,
  startStopTradeEngine
};
