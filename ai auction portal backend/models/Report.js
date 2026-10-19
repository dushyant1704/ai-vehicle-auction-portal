const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason: { type: String, required: true },
  description: { type: String, default: "" },
  status: { type: String, enum: ["pending", "reviewed", "resolved", "dismissed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Report", reportSchema);
