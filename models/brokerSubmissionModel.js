// models/brokerSubmissionModel.js
const mongoose = require("mongoose");

const fieldValueSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  fileUrl: { type: String }, // For file uploads
});

const brokerSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  brokerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Broker",
    required: true,
  },
  fieldValues: [fieldValueSchema],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BrokerSubmission", brokerSubmissionSchema);
