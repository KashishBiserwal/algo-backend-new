const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  // Strategy and User Information
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  broker: {
    type: String,
    enum: ['angel', 'dhan'],
    required: true
  },
  
  // Trade Information
  tradeId: {
    type: String,
    required: true,
    unique: true
  },
  brokerOrderId: {
    type: String,
    required: true
  },
  
  // Instrument Details
  instrument: {
    instrumentId: {
      type: String,
      required: true
    },
    symbol: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      required: true
    }
  },
  
  // Order Details
  orderType: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  productType: {
    type: String,
    enum: ['INTRADAY', 'DELIVERY', 'MARGIN', 'BO', 'CO'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  triggerPrice: {
    type: Number,
    default: null
  },
  
  // Execution Details
  status: {
    type: String,
    enum: ['PENDING', 'TRANSIT', 'TRADED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },
  averagePrice: {
    type: Number,
    default: null
  },
  filledQuantity: {
    type: Number,
    default: 0
  },
  remainingQuantity: {
    type: Number,
    default: null
  },
  
  // Financial Details
  totalValue: {
    type: Number,
    default: null
  },
  brokerage: {
    type: Number,
    default: 0
  },
  taxes: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: null
  },
  
  // Timestamps
  orderTime: {
    type: Date,
    required: true
  },
  tradeTime: {
    type: Date,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Strategy Context
  strategyContext: {
    entryCondition: {
      type: String,
      default: null
    },
    exitCondition: {
      type: String,
      default: null
    },
    riskManagement: {
      stopLoss: {
        type: Number,
        default: null
      },
      takeProfit: {
        type: Number,
        default: null
      }
    }
  },
  
  // Broker Response
  brokerResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Error Information
  error: {
    code: {
      type: String,
      default: null
    },
    message: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
tradeSchema.index({ strategyId: 1, userId: 1 });
tradeSchema.index({ userId: 1, broker: 1 });
tradeSchema.index({ tradeId: 1 });
tradeSchema.index({ brokerOrderId: 1 });
tradeSchema.index({ orderTime: -1 });
tradeSchema.index({ status: 1 });

// Virtual for P&L calculation
tradeSchema.virtual('pnl').get(function() {
  if (this.status === 'TRADED' && this.averagePrice && this.quantity) {
    // This is a simplified P&L calculation
    // In real implementation, you'd need to track entry/exit prices
    return 0; // Placeholder
  }
  return 0;
});

// Method to update trade status
tradeSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  this.lastUpdated = new Date();
  
  if (additionalData.averagePrice) {
    this.averagePrice = additionalData.averagePrice;
  }
  if (additionalData.filledQuantity) {
    this.filledQuantity = additionalData.filledQuantity;
  }
  if (additionalData.tradeTime) {
    this.tradeTime = additionalData.tradeTime;
  }
  if (additionalData.brokerResponse) {
    this.brokerResponse = additionalData.brokerResponse;
  }
  
  return this.save();
};

// Static method to get trades for a strategy
tradeSchema.statics.getStrategyTrades = function(strategyId, userId) {
  return this.find({
    strategyId: strategyId,
    userId: userId
  }).sort({ orderTime: -1 });
};

// Static method to get trades for a user
tradeSchema.statics.getUserTrades = function(userId, broker = null) {
  const query = { userId: userId };
  if (broker) {
    query.broker = broker;
  }
  return this.find(query).sort({ orderTime: -1 });
};

// Static method to get trade statistics
tradeSchema.statics.getTradeStatistics = function(userId, strategyId = null) {
  const matchQuery = { userId: userId };
  if (strategyId) {
    matchQuery.strategyId = strategyId;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalValue' }
      }
    }
  ]);
};

module.exports = mongoose.model('Trade', tradeSchema);
