const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", required: true },
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  payeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  provider: { type: String, enum: ["razorpay", "stripe", "wallet", "escrow"], default: "escrow" },
  paymentIntentId: { type: String, default: "" },
  status: { type: String, enum: ["created", "authorized", "captured", "refunded", "escrow_held"], default: "escrow_held" },
  invoiceUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", paymentSchema);
