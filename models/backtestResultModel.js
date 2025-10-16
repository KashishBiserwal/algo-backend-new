const mongoose = require('mongoose');

// Trade result schema for individual trades within backtest
const tradeResultSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  qty: { type: Number, required: true },
  entryPrice: { type: Number, required: true },
  exitPrice: { type: Number, default: null },
  entryTime: { type: Date, required: true },
  exitTime: { type: Date, default: null },
  pnl: { type: Number, required: true },
  stopLoss: { type: Number },
  target: { type: Number },
  reason: { type: String },
  // Enhanced fields
  theoreticalPrice: { type: Number },
  transactionCosts: { type: Number, default: 0 },
  slippage: { type: Number, default: 0 },
  strikePrice: { type: Number },
  timeToExpiry: { type: Number },
  totalTransactionCosts: { type: Number, default: 0 }
}, { _id: false });

// Equity curve point schema
const equityCurvePointSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "YYYY-MM-DD" format
  equity: { type: Number, required: true }
}, { _id: false });

// Main backtest result schema
const backtestResultSchema = new mongoose.Schema({
  // Links to strategy and user
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

  // Summary metrics
  initialCapital: { type: Number, required: true },
  finalEquity: { type: Number, required: true },
  totalReturnPct: { type: String, required: true }, // Stored as string due to toFixed(2)
  totalPnl: { type: String, required: true }, // Stored as string due to toFixed(2)
  totalTrades: { type: Number, required: true },
  winningLegs: { type: Number, required: true },
  losingLegs: { type: Number, required: true },
  winRate: { type: String, required: true }, // Stored as string due to toFixed(2)

  // Enhanced metrics
  totalTransactionCosts: { type: String, default: "0.00" },
  totalSlippage: { type: String, default: "0.00" },
  netReturn: { type: String, default: "0.00" },
  sharpeRatio: { type: String, default: "0.00" },
  maxDrawdown: { type: String, default: "0.00" },
  maxDrawdownDate: { type: String, default: null },
  consecutiveWins: { type: Number, default: 0 },
  consecutiveLosses: { type: Number, default: 0 },

  // Detailed data
  trades: [tradeResultSchema], // Array of individual trade results
  equityCurve: [equityCurvePointSchema], // Array of daily equity values

  // Backtest metadata
  period: { type: String, required: true }, // e.g., "1m", "3m", "1y"
  runAt: { type: Date, default: Date.now }, // When this backtest was run
  instrument: { type: String, required: true }, // The underlying instrument
  strategyName: { type: String, required: true } // Strategy name for easy reference
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Indexes for better query performance
backtestResultSchema.index({ strategyId: 1, runAt: -1 });
backtestResultSchema.index({ userId: 1, runAt: -1 });
backtestResultSchema.index({ instrument: 1, period: 1 });

module.exports = mongoose.model('BacktestResult', backtestResultSchema);
