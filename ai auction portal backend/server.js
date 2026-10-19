require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const connectDB = require("./config/db");
const { rateLimiter, sanitizeQueryParams } = require("./middleware/securityMiddleware");

const app = express();

// ── Database ──────────────────────────────────────────────────────
connectDB();

// ── Security & Sanitization ───────────────────────────────────────
app.use(sanitizeQueryParams);
app.use("/api/", rateLimiter(300, 15 * 60 * 1000));

// ── CORS ──────────────────────────────────────────────────────────
const isAllowedDevOrigin = (origin) => {
  if (!origin) return true;
  return (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    origin === process.env.FRONTEND_URL
  );
};

app.use(
  cors({
    origin: function (origin, callback) {
      if (isAllowedDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// ── Body Parser ───────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Session (Passport Google OAuth) ───────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "auction_session_secret_2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ── Passport (Google OAuth) ───────────────────────────────────────
const configurePassport = require("./config/passport");
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ── Health / Root ─────────────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "Auction backend running" }),
);
app.get("/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }),
);

// ── Primary API Routes ────────────────────────────────────────────
const auctionRoutes = require("./routes/auctionRoutes");
const bidRoutes = require("./routes/bidRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const priceRoutes = require("./routes/priceRoutes");
const authRoutes = require("./routes/authRoutes");
const oauthRoutes = require("./routes/auth");
const userRoutes = require("./routes/userRoutes");
const damageRoutes = require("./routes/damageRoutes");

app.use("/api/auctions", auctionRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api", priceRoutes);
app.use("/api/auth", authRoutes);
app.use("/", oauthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/damage", damageRoutes);

// ── Additional Production Routes ──────────────────────────────────
const notificationRoutes = require("./routes/notificationRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/notifications", notificationRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

// ── Document Compliance & Verification ───────────────────────────
const documentRoutes = require("./routes/documentRoutes");
app.use("/api/documents", documentRoutes);

// ── Role-Based RAG AI Assistant ──────────────────────────────────
const assistantRoutes = require("./routes/assistantRoutes");
app.use("/api/assistant", assistantRoutes);

// ── Socket.IO Real-Time Server Setup ─────────────────────────────
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (isAllowedDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

const auctionViewers = {}; // { auctionId: Set(socketIds) }

io.on("connection", (socket) => {
  console.log(`⚡ [Socket.IO] Client connected: ${socket.id}`);

  socket.on("join:auction", (auctionId) => {
    socket.join(`auction:${auctionId}`);
    if (!auctionViewers[auctionId]) {
      auctionViewers[auctionId] = new Set();
    }
    auctionViewers[auctionId].add(socket.id);

    const count = auctionViewers[auctionId].size;
    io.to(`auction:${auctionId}`).emit("viewer:count", { auctionId, count });
    console.log(`👀 [Socket.IO] Client ${socket.id} joined auction ${auctionId} (Viewers: ${count})`);
  });

  socket.on("leave:auction", (auctionId) => {
    socket.leave(`auction:${auctionId}`);
    if (auctionViewers[auctionId]) {
      auctionViewers[auctionId].delete(socket.id);
      const count = auctionViewers[auctionId].size;
      io.to(`auction:${auctionId}`).emit("viewer:count", { auctionId, count });
    }
  });

  socket.on("disconnect", () => {
    console.log(`⚡ [Socket.IO] Client disconnected: ${socket.id}`);
    for (const [auctionId, viewers] of Object.entries(auctionViewers)) {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        io.to(`auction:${auctionId}`).emit("viewer:count", { auctionId, count: viewers.size });
      }
    }
  });
});

// ── Global Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ [Server] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ── Start Server & Graceful Shutdown ───────────────────────────────
const PORT = process.env.PORT || 5000;
const listenServer = server.listen(PORT, () => {
  console.log(`\n🚀 Production Server running on http://localhost:${PORT}`);
  console.log(`   JWT auth:    POST /api/auth/login | /api/auth/register`);
  console.log(`   Google auth: GET  /auth/google`);
  console.log(`   Vehicles:    GET  /api/vehicles`);
  console.log(`   Pricing:     POST /api/predict-price`);
  console.log(`   Damage:      POST /api/damage/process-batch`);
  console.log(`   Real-time:   Socket.IO connected ✓\n`);
});

const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  Received ${signal}. Shutting down HTTP server gracefully...`);
  listenServer.close(() => {
    console.log("✅ HTTP server closed. Disconnecting database...");
    const mongoose = require("mongoose");
    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB disconnected. Process exiting cleanly.");
      process.exit(0);
    });
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
