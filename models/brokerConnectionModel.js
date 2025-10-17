const mongoose = require('mongoose');

const brokerConnectionSchema = new mongoose.Schema({
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
  // Angel One specific fields
  clientCode: {
    type: String,
    default: ''
  },
  apiKey: {
    type: String,
    default: ''
  },
  accessToken: {
    type: String,
    default: ''
  },
  refreshToken: {
    type: String,
    default: ''
  },
  feedToken: {
    type: String,
    default: ''
  },
  jwtToken: {
    type: String,
    default: ''
  },
  // Dhan specific fields (for future implementation)
  dhanClientId: {
    type: String,
    default: ''
  },
  dhanAccessToken: {
    type: String,
    default: ''
  },
  dhanRefreshToken: {
    type: String,
    default: ''
  },
  // Connection status
  isConnected: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Profile information
  profile: {
    name: String,
    email: String,
    mobile: String,
    clientCode: String,
    exchangeEnabled: [String],
    productType: [String]
  },
  // Connection metadata
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  // Error tracking
  lastError: {
    message: String,
    timestamp: Date,
    code: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
brokerConnectionSchema.index({ userId: 1, broker: 1 }, { unique: true });
brokerConnectionSchema.index({ userId: 1, isConnected: 1 });
brokerConnectionSchema.index({ broker: 1, isActive: 1 });

// Virtual for checking if connection is expired
brokerConnectionSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to update last used timestamp
brokerConnectionSchema.methods.updateLastUsed = function() {
  this.lastUsedAt = new Date();
  return this.save();
};

// Method to set error
brokerConnectionSchema.methods.setError = function(message, code = null) {
  this.lastError = {
    message,
    code,
    timestamp: new Date()
  };
  return this.save();
};

// Method to clear error
brokerConnectionSchema.methods.clearError = function() {
  this.lastError = undefined;
  return this.save();
};

// Static method to find active connections for a user
brokerConnectionSchema.statics.findActiveConnections = function(userId) {
  return this.find({
    userId,
    isActive: true,
    isConnected: true
  });
};

// Static method to find connection by user and broker
brokerConnectionSchema.statics.findByUserAndBroker = function(userId, broker, activeOnly = true) {
  const query = { userId, broker };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.findOne(query);
};

module.exports = mongoose.model('BrokerConnection', brokerConnectionSchema);
