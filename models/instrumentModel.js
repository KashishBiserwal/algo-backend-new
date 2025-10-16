const mongoose = require('mongoose');

const instrumentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true
  },
  symbol: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  exchange: {
    type: String,
    required: true,
    index: true
  },
  segment: {
    type: String,
    required: true,
    index: true
  },
  instrument_type: {
    type: String,
    required: true,
    index: true
  },
  lot_size: {
    type: Number,
    default: 1
  },
  expiry: {
    type: Date,
    default: null
  },
  strike_price: {
    type: Number,
    default: null
  },
  tick_size: {
    type: Number,
    default: 0.05
  },
  brokers: {
    angel: {
      token: {
        type: String,
        default: null
      },
      tradable: {
        type: Boolean,
        default: false
      },
      last_updated: {
        type: Date,
        default: null
      }
    },
    dhan: {
      token: {
        type: String,
        default: null
      },
      tradable: {
        type: Boolean,
        default: false
      },
      last_updated: {
        type: Date,
        default: null
      }
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
instrumentSchema.index({ symbol: 1, exchange: 1 });
instrumentSchema.index({ instrument_type: 1, exchange: 1 });
instrumentSchema.index({ 'brokers.angel.tradable': 1 });
instrumentSchema.index({ 'brokers.dhan.tradable': 1 });

const Instrument = mongoose.model('Instrument', instrumentSchema);

module.exports = Instrument;
