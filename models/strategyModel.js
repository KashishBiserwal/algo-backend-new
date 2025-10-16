const mongoose = require('mongoose');

// Entry Condition Schema for indicator-based strategies
const entryConditionSchema = new mongoose.Schema({
  indicator1: {
    type: String,
    required: true,
    enum: ['Moving Average', 'VWAP', 'MACD', 'RSI', 'SuperTrend', 'MACD-Signal', 'Candle', 'Number', 'Camarilla', 'Bollinger Bands', 'Stochastic', 'Williams %R', 'CCI', 'ATR', 'ADX', 'Parabolic SAR', 'Ichimoku', 'Fibonacci', 'Pivot Points', 'Volume', 'Price']
  },
  comparator: {
    type: String,
    required: true,
    enum: ['Crosses Above', 'Crosses Below', 'Higher than', 'Less than', 'Equal', 'Not Equal', 'Greater than or Equal', 'Less than or Equal']
  },
  indicator2: {
    type: String,
    required: true,
    enum: ['Moving Average', 'VWAP', 'MACD', 'RSI', 'SuperTrend', 'MACD-Signal', 'Candle', 'Number', 'Camarilla', 'Bollinger Bands', 'Stochastic', 'Williams %R', 'CCI', 'ATR', 'ADX', 'Parabolic SAR', 'Ichimoku', 'Fibonacci', 'Pivot Points', 'Volume', 'Price']
  },
  value: {
    type: Number,
    default: null // For numeric comparisons
  },
  period: {
    type: Number,
    default: null // For indicators that need period (e.g., MA period)
  }
}, { _id: false });

// Instrument Schema for multiple instruments in indicator-based strategies
const instrumentSchema = new mongoose.Schema({
  instrument_id: {
    type: String,
    required: true // Universal Instrument ID
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  symbol: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
}, { _id: false });

// Order Leg Schema for individual trades within a strategy (for time-based)
const orderLegSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  instrument_type: {
    type: String,
    enum: ['CE', 'PE', 'FUT', 'EQ'], // Call, Put, Future, Equity
    required: true
  },
  expiry: {
    type: String,
    enum: ['Weekly', 'Monthly', 'Quarterly'],
    required: true
  },
  strike_price_reference: {
    type: String,
    enum: ['ATM pt', 'ATM %', 'CP', 'CP >=', 'CP <='],
    required: true
  },
  strike_price_selection: {
    type: String,
    enum: ['ATM', 'ITM 100', 'ITM 200', 'ITM 300', 'ITM 400', 'ITM 500', 'ITM 600', 'ITM 700', 'ITM 800', 'ITM 900', 'ITM 1000', 'ITM 1100', 'ITM 1200', 'ITM 1300', 'ITM 1400', 'ITM 1500', 'ITM 1600', 'ITM 1700', 'OTM 100', 'OTM 200', 'OTM 300', 'OTM 400', 'OTM 500', 'OTM 600', 'OTM 700', 'OTM 800', 'OTM 900', 'OTM 1000', 'OTM 1100', 'OTM 1200', 'OTM 1300', 'OTM 1400', 'OTM 1500', 'OTM 1600', 'OTM 1700'],
    required: true
  },
  stop_loss_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  stop_loss_value: {
    type: Number,
    default: 0,
    min: 0
  },
  stop_loss_type: {
    type: String,
    enum: ['On Price', 'On Percentage', 'On Points'],
    default: 'On Price'
  },
  take_profit_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  take_profit_value: {
    type: Number,
    default: 0,
    min: 0
  },
  take_profit_type: {
    type: String,
    enum: ['On Price', 'On Percentage', 'On Points'],
    default: 'On Price'
  },
  profit_trailing: {
    type: String,
    enum: ['No Trailing', 'Lock Fix Profit', 'Trail Profit', 'Lock and Trail'],
    default: 'No Trailing'
  },
  profit_reaches: {
    type: Number,
    default: 0,
    min: 0
  },
  lock_profit_at: {
    type: Number,
    default: 0,
    min: 0
  },
  every_increase_of: {
    type: Number,
    default: 0,
    min: 0
  },
  trail_profit_by: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Risk Management Schema
const riskManagementSchema = new mongoose.Schema({
  // For indicator-based strategies
  target_on_each_script: {
    type: Number,
    default: 0,
    min: 0
  },
  stop_loss_on_each_script: {
    type: Number,
    default: 0,
    min: 0
  },
  target_sl_type: {
    type: String,
    enum: ['Percentage(%)', 'Amount', 'Points'],
    default: 'Percentage(%)'
  },
  exit_when_overall_profit_amount: {
    type: Number,
    default: null,
    min: 0
  },
  exit_when_overall_loss_amount: {
    type: Number,
    default: null,
    min: 0
  },
  max_trade_cycle: {
    type: Number,
    default: 1,
    min: 1
  },
  no_trade_after_time: {
    type: String, // Time in HH:MM format
    default: '15:15'
  },
  // Legacy fields for time-based strategies
  exit_profit_amount: {
    type: Number,
    default: null,
    min: 0
  },
  exit_loss_amount: {
    type: Number,
    default: null,
    min: 0
  },
  profit_trailing: {
    type: {
      type: String,
      enum: ['No Trailing', 'Lock Fix Profit', 'Trail Profit', 'Lock and Trail'],
      default: 'No Trailing'
    },
    // For lock_fix_profit
    profit_reaches: {
      type: Number,
      default: null,
      min: 0
    },
    lock_profit_at: {
      type: Number,
      default: null,
      min: 0
    },
    // For trail_profit
    on_every_increase_of: {
      type: Number,
      default: null,
      min: 0
    },
    trail_profit_by: {
      type: Number,
      default: null,
      min: 0
    }
  },
  // Additional fields for compatibility
  profit_reaches: {
    type: Number,
    default: null,
    min: 0
  },
  lock_profit_at: {
    type: Number,
    default: null,
    min: 0
  },
  every_increase_of: {
    type: Number,
    default: null,
    min: 0
  },
  trail_profit_by: {
    type: Number,
    default: null,
    min: 0
  }
}, { _id: false });

// Main Strategy Schema
const strategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['time_based', 'indicator_based'],
    required: true
  },
  // For time-based strategies (single instrument)
  instrument: {
    type: String, // Universal instrument ID
    required: function() { return this.type === 'time_based'; }
  },
  // For indicator-based strategies (multiple instruments)
  instruments: [instrumentSchema],
  order_type: {
    type: String,
    enum: ['MIS', 'NRML', 'CNC', 'BTST'],
    default: 'MIS'
  },
  // Indicator-based strategy specific fields
  transaction_type: {
    type: String,
    enum: ['Both Side', 'Only Long', 'Only Short'],
    default: 'Both Side'
  },
  chart_type: {
    type: String,
    enum: ['Candle', 'Heikin Ashi'],
    default: 'Candle'
  },
  interval: {
    type: String,
    enum: ['1 Min', '3 Min', '5 Min', '10 Min', '15 Min', '30 Min', '1H'],
    default: '1 Min'
  },
  // Entry conditions for indicator-based strategies
  entry_conditions: [entryConditionSchema],
  start_time: {
    type: String, // Time in HH:MM format
    required: true
  },
  square_off_time: {
    type: String, // Time in HH:MM format
    required: true
  },
  trading_days: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  order_legs: [orderLegSchema],
  risk_management: riskManagementSchema,
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'stopped', 'completed', 'backtested'],
    default: 'draft'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  broker: {
    type: String,
    enum: ['angel', 'dhan'],
    default: 'angel'
  },
  // Execution tracking
  execution_history: [{
    executed_at: { type: Date, default: Date.now },
    leg_index: { type: Number, required: true },
    action: { type: String, enum: ['BUY', 'SELL'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    broker_token: { type: String, required: true },
    order_id: { type: String },
    status: { type: String, enum: ['pending', 'filled', 'cancelled', 'rejected'], default: 'pending' }
  }],
  // Performance metrics
  total_trades: { type: Number, default: 0 },
  successful_trades: { type: Number, default: 0 },
  total_profit: { type: Number, default: 0 },
  total_loss: { type: Number, default: 0 },
  net_pnl: { type: Number, default: 0 },
  // Additional fields for compatibility
  profit_reaches: { type: Number, default: null },
  lock_profit_at: { type: Number, default: null },
  every_increase_of: { type: Number, default: null },
  trail_profit_by: { type: Number, default: null },
  // Additional fields for time-based strategies
  target_on_each_script: { type: Number, default: 0 },
  stop_loss_on_each_script: { type: Number, default: 0 },
  target_sl_type: { type: String, enum: ['Percentage(%)', 'Amount', 'Points'], default: 'Percentage(%)' },
  max_trade_cycle: { type: Number, default: 1 },
  // Additional fields for indicator-based strategies
  transaction_type: { type: String, enum: ['Both Side', 'Only Long', 'Only Short'], default: 'Both Side' },
  chart_type: { type: String, enum: ['Candle', 'Heikin Ashi'], default: 'Candle' },
  interval: { type: String, enum: ['1 Min', '3 Min', '5 Min', '10 Min', '15 Min', '30 Min', '1H'], default: '1 Min' },
  // Additional fields for time-based strategies
  order_type: { type: String, enum: ['MIS', 'NRML', 'CNC', 'BTST'], default: 'MIS' }
}, {
  timestamps: true
});

// Indexes for better query performance
strategySchema.index({ created_by: 1, status: 1 });
strategySchema.index({ instrument: 1 });
strategySchema.index({ type: 1 });
strategySchema.index({ created_at: -1 });

module.exports = mongoose.model('Strategy', strategySchema);
