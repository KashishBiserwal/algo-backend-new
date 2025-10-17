const mongoose = require('mongoose');
const DhanClient = require('./dhanClient');
const BrokerConnection = require('../models/brokerConnectionModel');
const Strategy = require('../models/strategyModel');
const Order = require('../models/orderModel');
const Trade = require('../models/tradeModel');
const User = require('../models/userModel');

class TradingEngine {
  constructor({ logger = console } = {}) {
    this.log = logger;
    this.activeStrategies = new Map(); // userId -> strategy instances
    this.userClients = new Map(); // userId -> broker clients
    this.orderQueue = new Map(); // userId -> order queue
    this.isRunning = false;
  }

  // Initialize trading engine
  async initialize() {
    try {
      this.log.info('[TradingEngine] Initializing trading engine...');
      
      // Load active strategies from database
      await this.loadActiveStrategies();
      
      // Initialize user broker connections
      await this.initializeUserConnections();
      
      this.isRunning = true;
      this.log.info('[TradingEngine] Trading engine initialized successfully');
      
      return { success: true };
    } catch (error) {
      this.log.error('[TradingEngine] Initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Load active strategies from database
  async loadActiveStrategies() {
    try {
      const activeStrategies = await Strategy.find({ 
        status: 'active',
        isActive: true 
      }).populate('userId');

      this.log.info(`[TradingEngine] Loading ${activeStrategies.length} active strategies`);

      for (const strategy of activeStrategies) {
        await this.addStrategy(strategy);
      }
    } catch (error) {
      this.log.error('[TradingEngine] Failed to load active strategies:', error);
    }
  }

  // Initialize user broker connections
  async initializeUserConnections() {
    try {
      const connections = await BrokerConnection.find({ 
        isConnected: true,
        isActive: true 
      });

      this.log.info(`[TradingEngine] Initializing ${connections.length} user connections`);

      for (const connection of connections) {
        await this.initializeUserClient(connection.userId, connection);
      }
    } catch (error) {
      this.log.error('[TradingEngine] Failed to initialize user connections:', error);
    }
  }

  // Initialize broker client for user
  async initializeUserClient(userId, connection) {
    try {
      let client;
      
      if (connection.broker === 'dhan') {
        client = new DhanClient({
          dhanClientId: connection.dhanClientId,
          accessToken: connection.dhanAccessToken,
          isSandbox: connection.profile?.isSandbox || false,
          logger: this.log
        });
      } else if (connection.broker === 'angel') {
        // Initialize Angel One client if needed
        const AngelOneClient = require('./angelOneClient');
        client = new AngelOneClient({
          apiKey: connection.apiKey,
          clientCode: connection.clientCode,
          jwtToken: connection.jwtToken,
          feedToken: connection.feedToken,
          refreshToken: connection.refreshToken,
          logger: this.log
        });
      }

      if (client) {
        this.userClients.set(userId.toString(), client);
        this.orderQueue.set(userId.toString(), []);
        this.log.info(`[TradingEngine] Initialized ${connection.broker} client for user ${userId}`);
      }
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to initialize client for user ${userId}:`, error);
    }
  }

  // Add strategy to trading engine
  async addStrategy(strategy) {
    try {
      // Validate strategy object
      if (!strategy) {
        return { success: false, error: 'Strategy object is null or undefined' };
      }
      
      if (!strategy.created_by) {
        return { success: false, error: 'Strategy created_by field is missing' };
      }
      
      if (!strategy._id) {
        return { success: false, error: 'Strategy _id field is missing' };
      }

      const userId = strategy.created_by.toString();
      
      if (!this.userClients.has(userId)) {
        this.log.warn(`[TradingEngine] No broker client found for user ${userId}`);
        return { success: false, error: 'No broker connection found' };
      }

      const strategyInstance = {
        id: strategy._id,
        userId: userId,
        name: strategy.name,
        type: strategy.type,
        status: strategy.status,
        config: strategy,
        client: this.userClients.get(userId),
        lastRun: null,
        nextRun: this.calculateNextRun(strategy),
        isActive: true
      };

      this.activeStrategies.set(strategy._id.toString(), strategyInstance);
      
      this.log.info(`[TradingEngine] Added strategy: ${strategy.name} for user ${userId}`);
      
      return { success: true, strategyId: strategy._id };
    } catch (error) {
      this.log.error('[TradingEngine] Failed to add strategy:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove strategy from trading engine
  async removeStrategy(strategyId) {
    try {
      if (!strategyId) {
        return { success: false, error: 'Strategy ID is required' };
      }
      
      const strategy = this.activeStrategies.get(strategyId.toString());
      if (strategy) {
        this.activeStrategies.delete(strategyId.toString());
        this.log.info(`[TradingEngine] Removed strategy: ${strategy.name}`);
        return { success: true };
      }
      return { success: false, error: 'Strategy not found' };
    } catch (error) {
      this.log.error('[TradingEngine] Failed to remove strategy:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate next run time for strategy
  calculateNextRun(strategy) {
    const now = new Date();
    const startTime = new Date(`2000-01-01 ${strategy.start_time}`);
    const endTime = new Date(`2000-01-01 ${strategy.square_off_time}`);
    
    // For now, return immediate execution
    // In production, implement proper scheduling based on trading hours
    return now;
  }

  // Execute strategy
  async executeStrategy(strategyId) {
    try {
      const strategy = this.activeStrategies.get(strategyId.toString());
      if (!strategy) {
        return { success: false, error: 'Strategy not found' };
      }

      this.log.info(`[TradingEngine] Executing strategy: ${strategy.name}`);

      if (strategy.type === 'time_based') {
        return await this.executeTimeBasedStrategy(strategy);
      } else if (strategy.type === 'indicator_based') {
        return await this.executeIndicatorBasedStrategy(strategy);
      } else {
        return { success: false, error: 'Unknown strategy type' };
      }
    } catch (error) {
      this.log.error('[TradingEngine] Strategy execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Execute time-based strategy
  async executeTimeBasedStrategy(strategy) {
    try {
      const client = strategy.client;
      const orders = [];

      for (const orderLeg of strategy.config.order_legs) {
        const orderPayload = {
          transactionType: orderLeg.action,
          exchangeSegment: 'NSE_EQ', // Default, should be from instrument
          productType: strategy.config.order_type || 'INTRADAY',
          orderType: 'MARKET', // Default for time-based
          validity: 'DAY',
          securityId: strategy.config.instrument, // Should be actual security ID
          quantity: orderLeg.quantity,
          disclosedQuantity: 0,
          price: 0,
          triggerPrice: 0,
          afterMarketOrder: false,
          amoTime: 'OPEN'
        };

        // Add stop loss and take profit if specified
        if (orderLeg.stop_loss_value > 0) {
          orderPayload.triggerPrice = orderLeg.stop_loss_value;
          orderPayload.orderType = 'STOP_LOSS_MARKET';
        }

        const orderResult = await client.placeOrder(orderPayload);
        
        if (orderResult.success) {
          orders.push({
            orderId: orderResult.orderId,
            status: orderResult.orderStatus,
            leg: orderLeg,
            timestamp: new Date()
          });
          
          // Save order to database
          await this.saveOrder(strategy.userId, strategy.id, orderResult, orderLeg);
        } else {
          this.log.error(`[TradingEngine] Order failed: ${orderResult.error}`);
        }
      }

      strategy.lastRun = new Date();
      strategy.nextRun = this.calculateNextRun(strategy.config);

      return {
        success: true,
        orders: orders,
        strategyId: strategy.id,
        executedAt: new Date()
      };
    } catch (error) {
      this.log.error('[TradingEngine] Time-based strategy execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Execute indicator-based strategy
  async executeIndicatorBasedStrategy(strategy) {
    try {
      const client = strategy.client;
      const orders = [];

      // For indicator-based strategies, we need to:
      // 1. Check entry conditions
      // 2. Place orders for multiple instruments
      // 3. Monitor positions

      for (const instrument of strategy.config.instruments) {
        // Check if entry conditions are met (simplified)
        const shouldEnter = await this.checkEntryConditions(strategy.config.entry_conditions, instrument);
        
        if (shouldEnter) {
          const orderPayload = {
            transactionType: strategy.config.transaction_type === 'Only Long' ? 'BUY' : 
                           strategy.config.transaction_type === 'Only Short' ? 'SELL' : 'BUY',
            exchangeSegment: 'NSE_EQ',
            productType: strategy.config.order_type || 'INTRADAY',
            orderType: 'MARKET',
            validity: 'DAY',
            securityId: instrument.instrument_id,
            quantity: instrument.quantity,
            disclosedQuantity: 0,
            price: 0,
            triggerPrice: 0,
            afterMarketOrder: false,
            amoTime: 'OPEN'
          };

          const orderResult = await client.placeOrder(orderPayload);
          
          if (orderResult.success) {
            orders.push({
              orderId: orderResult.orderId,
              status: orderResult.orderStatus,
              instrument: instrument,
              timestamp: new Date()
            });
            
            await this.saveOrder(strategy.userId, strategy.id, orderResult, instrument);
          }
        }
      }

      strategy.lastRun = new Date();
      strategy.nextRun = this.calculateNextRun(strategy.config);

      return {
        success: true,
        orders: orders,
        strategyId: strategy.id,
        executedAt: new Date()
      };
    } catch (error) {
      this.log.error('[TradingEngine] Indicator-based strategy execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Check entry conditions for indicator-based strategies
  async checkEntryConditions(conditions, instrument) {
    // Simplified condition checking
    // In production, implement proper technical analysis
    return Math.random() > 0.5; // Random for demo
  }

  // Save order to database
  async saveOrder(userId, strategyId, orderResult, orderData) {
    try {
      const order = new Order({
        userId: userId,
        strategyId: strategyId,
        brokerOrderId: orderResult.orderId,
        status: orderResult.orderStatus,
        orderData: orderData,
        result: orderResult,
        timestamp: new Date()
      });

      await order.save();
      this.log.info(`[TradingEngine] Saved order: ${orderResult.orderId}`);
      
      // Also save trade data for comprehensive tracking
      await this.saveTrade(userId, strategyId, orderResult, orderData);
    } catch (error) {
      this.log.error('[TradingEngine] Failed to save order:', error);
    }
  }

  // Save trade to database
  async saveTrade(userId, strategyId, orderResult, orderData) {
    try {
      // Get strategy to determine broker
      const strategy = await Strategy.findById(strategyId);
      if (!strategy) {
        this.log.error(`[TradingEngine] Strategy not found: ${strategyId}`);
        return;
      }

      const trade = new Trade({
        strategyId: strategyId,
        userId: userId,
        broker: strategy.broker,
        tradeId: `${strategy.broker}_${orderResult.orderId}_${Date.now()}`,
        brokerOrderId: orderResult.orderId,
        instrument: {
          instrumentId: orderData.instrumentId || orderData.instrument_id,
          symbol: orderData.symbol,
          name: orderData.name || orderData.symbol,
          exchange: orderData.exchange || 'NSE'
        },
        orderType: orderData.orderType || orderData.transaction_type,
        productType: orderData.productType || orderData.product_type || 'INTRADAY',
        quantity: orderData.quantity,
        price: orderData.price,
        triggerPrice: orderData.triggerPrice || orderData.trigger_price,
        status: orderResult.orderStatus || 'PENDING',
        orderTime: new Date(),
        strategyContext: {
          entryCondition: orderData.entryCondition,
          exitCondition: orderData.exitCondition,
          riskManagement: {
            stopLoss: orderData.stopLoss,
            takeProfit: orderData.takeProfit
          }
        },
        brokerResponse: orderResult
      });

      await trade.save();
      this.log.info(`[TradingEngine] Saved trade: ${trade.tradeId}`);
    } catch (error) {
      this.log.error('[TradingEngine] Failed to save trade:', error);
    }
  }

  // Process order queue for user
  async processOrderQueue(userId) {
    try {
      const queue = this.orderQueue.get(userId);
      if (!queue || queue.length === 0) return;

      const client = this.userClients.get(userId);
      if (!client) return;

      const order = queue.shift();
      const result = await client.placeOrder(order.payload);
      
      if (result.success) {
        await this.saveOrder(userId, order.strategyId, result, order.data);
      }
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to process order queue for user ${userId}:`, error);
    }
  }

  // Get user portfolio
  async getUserPortfolio(userId) {
    try {
      const client = this.userClients.get(userId);
      if (!client) {
        return { success: false, error: 'No broker connection found' };
      }

      const [positions, holdings, funds] = await Promise.all([
        client.getPositions(),
        client.getHoldings(),
        client.getFunds()
      ]);

      return {
        success: true,
        data: {
          positions: positions.success ? positions.data : [],
          holdings: holdings.success ? holdings.data : [],
          funds: funds.success ? funds.data : null,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to get portfolio for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get strategy performance
  async getStrategyPerformance(strategyId) {
    try {
      const orders = await Order.find({ strategyId: strategyId });
      
      const performance = {
        totalOrders: orders.length,
        successfulOrders: orders.filter(o => o.status === 'TRADED').length,
        pendingOrders: orders.filter(o => ['PENDING', 'TRANSIT'].includes(o.status)).length,
        failedOrders: orders.filter(o => o.status === 'REJECTED').length,
        totalPnL: 0, // Calculate from order results
        winRate: 0
      };

      performance.winRate = performance.totalOrders > 0 ? 
        (performance.successfulOrders / performance.totalOrders) * 100 : 0;

      return { success: true, data: performance };
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to get strategy performance:`, error);
      return { success: false, error: error.message };
    }
  }

  // Start trading engine
  async start() {
    try {
      this.log.info('[TradingEngine] Starting trading engine...');
      
      await this.initialize();
      
      // Start strategy execution loop
      this.executionInterval = setInterval(async () => {
        await this.executeActiveStrategies();
      }, 60000); // Run every minute

      // Start order queue processing
      this.queueInterval = setInterval(async () => {
        await this.processAllOrderQueues();
      }, 5000); // Process queues every 5 seconds

      this.log.info('[TradingEngine] Trading engine started successfully');
      return { success: true };
    } catch (error) {
      this.log.error('[TradingEngine] Failed to start trading engine:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop trading engine
  async stop() {
    try {
      this.log.info('[TradingEngine] Stopping trading engine...');
      
      if (this.executionInterval) {
        clearInterval(this.executionInterval);
      }
      
      if (this.queueInterval) {
        clearInterval(this.queueInterval);
      }

      this.isRunning = false;
      this.log.info('[TradingEngine] Trading engine stopped');
      return { success: true };
    } catch (error) {
      this.log.error('[TradingEngine] Failed to stop trading engine:', error);
      return { success: false, error: error.message };
    }
  }

  // Execute all active strategies
  async executeActiveStrategies() {
    try {
      const now = new Date();
      
      for (const [strategyId, strategy] of this.activeStrategies) {
        if (strategy.isActive && strategy.nextRun <= now) {
          await this.executeStrategy(strategyId);
        }
      }
    } catch (error) {
      this.log.error('[TradingEngine] Failed to execute active strategies:', error);
    }
  }

  // Process all order queues
  async processAllOrderQueues() {
    try {
      for (const userId of this.orderQueue.keys()) {
        await this.processOrderQueue(userId);
      }
    } catch (error) {
      this.log.error('[TradingEngine] Failed to process order queues:', error);
    }
  }

  // Start individual strategy
  async startStrategy(strategyId) {
    try {
      this.log.info(`[TradingEngine] Starting strategy: ${strategyId}`);
      
      // Get strategy from database
      const strategy = await Strategy.findById(strategyId).populate('created_by');
      
      if (!strategy) {
        return { success: false, error: 'Strategy not found' };
      }
      
      // Check if strategy is already active
      if (this.activeStrategies.has(strategyId)) {
        return { success: false, error: 'Strategy is already active' };
      }
      
      // Get user's broker client
      const userId = strategy.created_by._id ? strategy.created_by._id.toString() : strategy.created_by.toString();
      const client = this.userClients.get(userId);
      
      if (!client) {
        return { success: false, error: 'No broker client found for user' };
      }
      
      // Add strategy to active strategies
      this.activeStrategies.set(strategyId, {
        ...strategy.toObject(),
        userId: userId, // Ensure userId is set for getActiveStrategiesForUser
        client: client,
        isActive: true,
        lastRun: null,
        nextRun: this.calculateNextRun(strategy)
      });
      
      this.log.info(`[TradingEngine] Strategy ${strategy.name} started successfully`);
      return { success: true, strategyId: strategyId };
      
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to start strategy ${strategyId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Stop individual strategy
  async stopStrategy(strategyId) {
    try {
      this.log.info(`[TradingEngine] Stopping strategy: ${strategyId}`);
      
      // Check if strategy is active
      if (!this.activeStrategies.has(strategyId)) {
        return { success: false, error: 'Strategy is not active' };
      }
      
      // Remove strategy from active strategies
      this.activeStrategies.delete(strategyId);
      
      this.log.info(`[TradingEngine] Strategy ${strategyId} stopped successfully`);
      return { success: true, strategyId: strategyId };
      
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to stop strategy ${strategyId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get active strategies for a user
  getActiveStrategiesForUser(userId) {
    try {
      const userStrategies = [];
      
      for (const [strategyId, strategy] of this.activeStrategies) {
        if (strategy.userId === userId.toString()) {
          userStrategies.push({
            id: strategyId,
            name: strategy.name,
            type: strategy.type,
            status: strategy.status,
            lastRun: strategy.lastRun,
            nextRun: strategy.nextRun,
            isActive: strategy.isActive
          });
        }
      }
      
      return userStrategies;
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to get active strategies for user ${userId}:`, error);
      return [];
    }
  }

  // Get all active strategies as array
  getAllActiveStrategies() {
    try {
      const strategies = [];
      
      for (const [strategyId, strategy] of this.activeStrategies) {
        strategies.push({
          id: strategyId,
          userId: strategy.userId,
          name: strategy.name,
          type: strategy.type,
          status: strategy.status,
          lastRun: strategy.lastRun,
          nextRun: strategy.nextRun,
          isActive: strategy.isActive
        });
      }
      
      return strategies;
    } catch (error) {
      this.log.error('[TradingEngine] Failed to get all active strategies:', error);
      return [];
    }
  }

  // Get trade data for strategy terminal
  async getStrategyTrades(strategyId, userId) {
    try {
      const trades = await Trade.find({
        strategyId: strategyId,
        userId: userId
      }).sort({ orderTime: -1 }).limit(100);

      return {
        success: true,
        data: trades
      };
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to get trades for strategy ${strategyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get trade statistics for strategy
  async getStrategyTradeStats(strategyId, userId) {
    try {
      const stats = await Trade.aggregate([
        {
          $match: {
            strategyId: mongoose.Types.ObjectId(strategyId),
            userId: mongoose.Types.ObjectId(userId)
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalValue' }
          }
        }
      ]);

      const totalTrades = await Trade.countDocuments({
        strategyId: strategyId,
        userId: userId
      });

      return {
        success: true,
        data: {
          totalTrades,
          statusBreakdown: stats,
          lastTrade: await Trade.findOne({
            strategyId: strategyId,
            userId: userId
          }).sort({ orderTime: -1 })
        }
      };
    } catch (error) {
      this.log.error(`[TradingEngine] Failed to get trade stats for strategy ${strategyId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get engine status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeStrategies: this.activeStrategies.size,
      connectedUsers: this.userClients.size,
      totalOrderQueues: this.orderQueue.size,
      strategies: this.getAllActiveStrategies()
    };
  }
}

module.exports = TradingEngine;
