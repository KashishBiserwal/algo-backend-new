// models/brokerModel.js
const mongoose = require("mongoose");

const brokerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  brokerId: {
    type: String,
    enum: ["AG", "FN", "ZE", "UP", 'DH'], 
    required: true,
  },
  brokerClientId: {
    type: String,
    required: true,
  },
  brokerName: {
    type: String,
    required: true,
  },
  brokerLogoUrl: {
    type: String,
    default: "",
  },
  tradeEngineName: {
    type: String,
    required: true,
  },
  tradeEngineStatus: {
    type: String,
    enum: ["Running", "Stopped", "Error"],
    default: "Stopped",
  },
  brokerLoginStatus: {
    type: Boolean,
    default: false,
  },
  maxProfit: {
    type: Number,
    default: null,
  },
  maxLoss: {
    type: Number,
    default: null,
  },
  apiRedirectUrl: {
    type: String,
    default: "",
  },
  apiLoginUrl: {
    type: String,
    default: "",
  },
  brokerAuthQueryString: {
    type: String,
    default: "",
  },
  running: {
    type: Number,
    default: 0,
  },
  deployed: {
    type: Number,
    default: 0,
  },
  
  // Angel One specific fields
  AGAccessToken: {
    type: String,
    default: "",
  },
  AGFeedToken: {
    type: String,
    default: "",
  },
  AGApiKey: {
    type: String,
    default: "",
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

brokerSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Broker = mongoose.model("Broker", brokerSchema);
module.exports = Broker;
