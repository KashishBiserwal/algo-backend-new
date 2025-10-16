const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Order identification
    orderId: { type: String, required: true, unique: true },
    brokerOrderId: { type: String, required: true },
    strategyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Strategy",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Trading details
    tradingSymbol: { type: String, required: true },
    exchange: { type: String, default: "NFO" },
    segment: { type: String, default: "NFO" },
    instrumentToken: { type: String, required: true },
    exchangeToken: { type: String, required: true },
    
    // Order parameters
    transactionType: { type: String, enum: ["BUY", "SELL"], required: true },
    quantity: { type: Number, required: true },
    orderType: { type: String, enum: ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_MARKET"], default: "MARKET" },
    productType: { type: String, enum: ["INTRADAY", "DELIVERY", "CNC"], default: "INTRADAY" },
    price: { type: Number, default: 0 },
    triggerPrice: { type: Number, default: 0 },
    
    // Execution details
    entryPrice: { type: Number, default: 0 },
    exitPrice: { type: Number, default: null },
    averagePrice: { type: Number, default: 0 },
    filledQuantity: { type: Number, default: 0 },
    pendingQuantity: { type: Number, default: 0 },
    
    // Status tracking
    orderStatus: { 
      type: String, 
      enum: ["PENDING", "COMPLETE", "CANCELLED", "REJECTED", "PARTIALLY_FILLED"], 
      default: "PENDING" 
    },
    tradeStatus: { 
      type: String, 
      enum: ["OPEN", "CLOSED", "SQUARED_OFF"], 
      default: "OPEN" 
    },
    
    // P&L tracking
    pnl: { type: Number, default: 0 },
    realizedPnl: { type: Number, default: 0 },
    unrealizedPnl: { type: Number, default: 0 },
    
    // Timestamps
    orderTimestamp: { type: Date, default: Date.now },
    entryTimestamp: { type: Date, default: null },
    exitTimestamp: { type: Date, default: null },
    lastUpdateTimestamp: { type: Date, default: Date.now },
    
    // Exit details
    exitReason: { type: String, default: null }, // "manual", "stop_loss", "target", "square_off", "strategy_exit"
    exitType: { type: String, default: null }, // "market", "limit", "stop_loss"
    
    // Risk management
    stopLoss: { type: Number, default: 0 },
    target: { type: Number, default: 0 },
    trailingStopLoss: { type: Number, default: 0 },
    
    // Additional metadata
    orderTag: { type: String, default: "Strategy_Order" },
    orderMessage: { type: String, default: "Order placed by strategy" },
    isActive: { type: Boolean, default: true },
    
    // Broker specific fields
    brokerClientId: { type: String, required: true },
    variety: { type: String, default: "NORMAL" },
    duration: { type: String, default: "DAY" },
    
    // Strategy context
    legIndex: { type: Number, default: 0 }, // Which leg in the strategy this order belongs to
    strategyLeg: { type: Object, default: {} }, // Store the original leg configuration
    
    // Audit fields
    createdBy: { type: String, required: true },
    updatedBy: { type: String, default: null },
    
    // Broker response
    brokerResponse: { type: Object, default: {} },
    
    // Order modifications
    modifications: [{
      timestamp: { type: Date, default: Date.now },
      field: { type: String, required: true },
      oldValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
      reason: { type: String, default: "strategy_modification" }
    }]
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    indexes: [
      { strategyId: 1, orderTimestamp: -1 },
      { userId: 1, orderTimestamp: -1 },
      { orderStatus: 1 },
      { tradeStatus: 1 },
      { brokerOrderId: 1 }
    ]
  }
);

// Pre-save middleware to update lastUpdateTimestamp
OrderSchema.pre("save", function (next) {
  this.lastUpdateTimestamp = new Date();
  next();
});

// Virtual for calculating P&L
OrderSchema.virtual("calculatedPnl").get(function() {
  if (this.tradeStatus === "CLOSED" && this.entryPrice && this.exitPrice) {
    const multiplier = this.transactionType === "BUY" ? 1 : -1;
    return multiplier * (this.exitPrice - this.entryPrice) * this.filledQuantity;
  }
  return 0;
});

// Method to update order status
OrderSchema.methods.updateStatus = function(newStatus, reason = null) {
  this.orderStatus = newStatus;
  if (reason) {
    this.orderMessage = reason;
  }
  this.lastUpdateTimestamp = new Date();
  return this.save();
};

// Method to close position
OrderSchema.methods.closePosition = function(exitPrice, exitReason = "manual") {
  this.exitPrice = exitPrice;
  this.exitTimestamp = new Date();
  this.tradeStatus = "CLOSED";
  this.exitReason = exitReason;
  this.pnl = this.calculatedPnl;
  this.realizedPnl = this.pnl;
  this.unrealizedPnl = 0;
  this.lastUpdateTimestamp = new Date();
  return this.save();
};

// Method to modify order
OrderSchema.methods.modifyOrder = function(modifications, reason = "strategy_modification") {
  const modificationRecord = {
    timestamp: new Date(),
    reason: reason,
    modifications: []
  };
  
  for (const [field, newValue] of Object.entries(modifications)) {
    const oldValue = this[field];
    this[field] = newValue;
    modificationRecord.modifications.push({
      field,
      oldValue,
      newValue
    });
  }
  
  this.modifications.push(modificationRecord);
  this.lastUpdateTimestamp = new Date();
  return this.save();
};

// Static method to get orders by strategy
OrderSchema.statics.getOrdersByStrategy = function(strategyId) {
  return this.find({ strategyId, isActive: true }).sort({ orderTimestamp: -1 });
};

// Static method to get active orders by user
OrderSchema.statics.getActiveOrdersByUser = function(userId) {
  return this.find({ 
    userId, 
    isActive: true, 
    orderStatus: { $in: ["PENDING", "PARTIALLY_FILLED"] } 
  }).sort({ orderTimestamp: -1 });
};

// Static method to get open positions by user
OrderSchema.statics.getOpenPositionsByUser = function(userId) {
  return this.find({ 
    userId, 
    isActive: true, 
    tradeStatus: "OPEN",
    orderStatus: "COMPLETE"
  }).sort({ entryTimestamp: -1 });
};

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;