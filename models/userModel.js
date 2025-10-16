const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  walletAmount: {
    type: Number,
    default: 0.00,
  },
  backtestCredit: {
    type: Number,
    default: 50.00,
  },
  plan: {
    type: String,
    enum: ["Free Plan", "Basic Plan", "Premium Plan", "Pro Plan"],
    default: "Free Plan",
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  totalReferrals: {
    type: Number,
    default: 0,
  },
  referralEarnings: {
    type: Number,
    default: 0.00,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  risk_disclaimer_accepted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER",
  },
  Timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware to generate referral code
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    // Generate a unique referral code (e.g., AR + 6 random alphanumeric characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referralCode = 'AR';
    for (let i = 0; i < 6; i++) {
      referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.referralCode = referralCode;
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
