const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: true
  },
  brokerOrderId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['TRANSIT', 'PENDING', 'REJECTED', 'CANCELLED', 'PART_TRADED', 'TRADED', 'EXPIRED', 'MODIFIED', 'TRIGGERED'],
    required: true
  },
  orderData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  broker: {
    type: String,
    enum: ['dhan', 'angel'],
    required: true
  },
  exchangeSegment: {
    type: String,
    enum: ['NSE_EQ', 'NSE_FNO', 'NSE_CURRENCY', 'BSE_EQ', 'BSE_FNO', 'BSE_CURRENCY', 'MCX_COMM'],
    required: true
  },
  transactionType: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  productType: {
    type: String,
    enum: ['CNC', 'INTRADAY', 'MARGIN', 'MTF', 'CO', 'BO'],
    required: true
  },
  orderType: {
    type: String,
    enum: ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_MARKET'],
    required: true
  },
  securityId: {
    type: String,
    required: true
  },
  tradingSymbol: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    default: 0
  },
  triggerPrice: {
    type: Number,
    default: 0
  },
  averagePrice: {
    type: Number,
    default: 0
  },
  filledQuantity: {
    type: Number,
    default: 0
  },
  remainingQuantity: {
    type: Number,
    default: 0
  },
  pnl: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ userId: 1, timestamp: -1 });
orderSchema.index({ strategyId: 1, timestamp: -1 });
orderSchema.index({ brokerOrderId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ broker: 1, timestamp: -1 });

// Virtual for order status
orderSchema.virtual('isActive').get(function() {
  return ['TRANSIT', 'PENDING', 'PART_TRADED'].includes(this.status);
});

orderSchema.virtual('isCompleted').get(function() {
  return ['TRADED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(this.status);
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  this.updatedAt = new Date();
  
  if (additionalData.averagePrice) {
    this.averagePrice = additionalData.averagePrice;
  }
  
  if (additionalData.filledQuantity) {
    this.filledQuantity = additionalData.filledQuantity;
  }
  
  if (additionalData.remainingQuantity) {
    this.remainingQuantity = additionalData.remainingQuantity;
  }
  
  if (additionalData.pnl) {
    this.pnl = additionalData.pnl;
  }
  
  return this.save();
};

// Static method to get orders by user
orderSchema.statics.getUserOrders = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('strategyId', 'name type');
};

// Static method to get orders by strategy
orderSchema.statics.getStrategyOrders = function(strategyId, limit = 50, skip = 0) {
  return this.find({ strategyId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(userId, fromDate = null, toDate = null) {
  const match = { userId };
  
  if (fromDate || toDate) {
    match.timestamp = {};
    if (fromDate) match.timestamp.$gte = new Date(fromDate);
    if (toDate) match.timestamp.$lte = new Date(toDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
      }
    }
  ]);
};

// Static method to get PnL summary
orderSchema.statics.getPnLSummary = function(userId, fromDate = null, toDate = null) {
  const match = { userId, status: 'TRADED' };
  
  if (fromDate || toDate) {
    match.timestamp = {};
    if (fromDate) match.timestamp.$gte = new Date(fromDate);
    if (toDate) match.timestamp.$lte = new Date(toDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPnL: { $sum: '$pnl' },
        totalOrders: { $sum: 1 },
        profitableOrders: {
          $sum: {
            $cond: [{ $gt: ['$pnl', 0] }, 1, 0]
          }
        },
        losingOrders: {
          $sum: {
            $cond: [{ $lt: ['$pnl', 0] }, 1, 0]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);
