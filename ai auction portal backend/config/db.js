require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Try connection with multiple fallback strategies
  const strategies = [
    // Strategy 1: Standard with explicit TLS options
    {
      label: "Standard TLS",
      opts: {
        tls: true,
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 15000,
        family: 4,
      },
    },
    // Strategy 2: With tlsInsecure (bypasses cert validation — for dev only)
    {
      label: "TLS Insecure (dev fallback)",
      opts: {
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        serverSelectionTimeoutMS: 2000,
        family: 4,
      },
    },
    // Strategy 3: No explicit TLS flags — let driver decide
    {
      label: "Driver default",
      opts: {
        serverSelectionTimeoutMS: 2000,
        family: 4,
      },
    },
    // Strategy 4: Local MongoDB Fallback
    {
      label: "Local MongoDB",
      uri: process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/auctionDB",
      opts: {
        serverSelectionTimeoutMS: 5000,
        family: 4,
      },
    },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🔄 MongoDB: trying ${strategy.label}...`);
      await mongoose.connect(strategy.uri || uri, strategy.opts);
      console.log(`✅ MongoDB Connected (${strategy.label})`);
      return;
    } catch (err) {
      console.warn(`   ❌ ${strategy.label} failed: ${err.message.substring(0, 80)}`);
      // Disconnect before retrying
      try { await mongoose.disconnect(); } catch {}
    }
  }

  console.error("❌ All MongoDB connection strategies failed.");
  console.warn("⚠️  Server running without DB — check MONGO_URI and Atlas IP whitelist.");
};

module.exports = connectDB;
