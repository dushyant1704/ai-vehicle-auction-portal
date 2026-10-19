const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: "buyer" }, // buyer/seller/bank/admin
  profileImage: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  kycStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "verified" },
  verificationBadge: { type: Boolean, default: true },
  rating: { type: Number, default: 4.8 },
  walletBalance: { type: Number, default: 250000 },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true }
  },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
