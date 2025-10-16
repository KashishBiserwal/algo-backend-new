const mongoose = require('mongoose');

const instrumentUpdateSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true
  },
  exchange: {
    type: String,
    required: true
  },
  broker: {
    type: String,
    required: true,
    enum: ['angel', 'dhan']
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  count: {
    type: Number,
    default: 0
  },
  new_entries: {
    type: Number,
    default: 0
  },
  updated_entries: {
    type: Number,
    default: 0
  },
  expired_entries: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'partial'],
    default: 'success'
  },
  error_message: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const InstrumentUpdate = mongoose.model('InstrumentUpdate', instrumentUpdateSchema);

module.exports = InstrumentUpdate;
