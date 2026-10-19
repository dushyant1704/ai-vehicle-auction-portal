const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  createdAt: { type: Date, default: Date.now }
});

watchlistSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });

module.exports = mongoose.model("Watchlist", watchlistSchema);
