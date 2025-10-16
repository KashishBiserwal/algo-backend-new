const { min } = require("moment-timezone");
const mongoose = require("mongoose");

const FeatureSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Live Deployment"
  value: { type: String },
  enabled: { type: Boolean, default: false },
}, { _id: false });

const PackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["Free Plan", "Unlimited Plan", "Limited Plan"],
    unique: true,
  },
  pricingPerDay: {
    monthly: { type: Number, required: true, min: 0 },   // ₹81
    quarterly: { type: Number, required: true, min: 0 }, // ₹78
    yearly: { type: Number, required: true, min: 0 },    // ₹69
  },
  mostPopular: {
    type: Boolean,
    default: false,
  },
  features: {
    type: [FeatureSchema],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Package", PackageSchema);
