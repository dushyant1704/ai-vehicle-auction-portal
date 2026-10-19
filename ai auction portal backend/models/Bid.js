const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    // Vehicle being bid on
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    // Bidder info (from JWT)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true },
    userEmail: { type: String },
    // Bid details
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["active", "won", "outbid"],
      default: "active",
    },
    // Denormalised vehicle info for fast dashboard queries
    brand: { type: String },
    model: { type: String },
    year: { type: Number },
    fuel: { type: String },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

module.exports = mongoose.model("Bid", bidSchema);
