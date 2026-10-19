const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["deposit", "withdrawal", "escrow_hold", "escrow_release", "refund"], required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  referenceId: { type: String, default: "" },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);
