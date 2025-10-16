const mongoose = require('mongoose');

const barSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  open: {
    type: Number,
    required: true
  },
  high: {
    type: Number,
    required: true
  },
  low: {
    type: Number,
    required: true
  },
  close: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
barSchema.index({ symbol: 1, timestamp: 1 });

// Ensure unique combination of symbol and timestamp
barSchema.index({ symbol: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('Bar', barSchema);
