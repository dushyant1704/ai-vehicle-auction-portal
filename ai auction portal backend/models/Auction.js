const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema({
  title: String,
  description: String,
  assetType: String,
  startPrice: Number,
  currentPrice: Number,
  reservePrice: Number,
  reserveMet: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: [
      "Draft",
      "Pending AI",
      "Pending Verification",
      "Pending Approval",
      "Scheduled",
      "Live",
      "Extended",
      "Ended",
      "Payment Pending",
      "Completed",
      "Archived",
      "upcoming",
      "active",
      "cancelled"
    ], 
    default: "Live" 
  },
  startTime: Date,
  endTime: Date,
  images: [String],
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", index: true },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  liveViewers: { type: Number, default: 1 },
  autoExtension: { type: Boolean, default: true },
  paymentStatus: { type: String, enum: ["pending", "escrow", "completed", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ sellerId: 1, status: 1 });

module.exports = mongoose.model("Auction", auctionSchema);
