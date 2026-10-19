const Bid = require("../models/Bid");
const Vehicle = require("../models/Vehicle");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "auction_jwt_secret_key_2024_secure";

// Helper: extract user from JWT token
function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// POST /api/bids — place a bid on a vehicle
exports.placeBid = async (req, res) => {
  try {
    // ── Auth check ────────────────────────────────────────────────
    const decoded = req.user || getUserFromToken(req);
    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized. Please login first." });
    }

    // ── RBAC Security Guard 1: Admin cannot bid ────────────────────
    if (decoded.role === "admin") {
      return res.status(403).json({
        error: "Forbidden. Administrators are not allowed to place bids on auctions."
      });
    }

    // ── Input validation ──────────────────────────────────────────
    const { vehicleId, amount } = req.body || {};
    if (!vehicleId) {
      return res.status(400).json({ error: "vehicleId is required." });
    }
    const bidAmount = Number(amount);
    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({ error: "A valid bid amount is required." });
    }

    // ── Fetch vehicle ─────────────────────────────────────────────
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    // ── RBAC Security Guard 2: Seller cannot bid on own vehicle ────
    if (vehicle.sellerId && String(vehicle.sellerId) === String(decoded.id)) {
      return res.status(403).json({
        error: "Forbidden. Sellers cannot place bids on their own vehicles."
      });
    }

    // ── Auction Auto-Extension & Timer Guard ──────────────────────
    const Auction = require("../models/Auction");
    if (vehicle.auctionId) {
      const auction = await Auction.findById(vehicle.auctionId);
      if (auction) {
        if (auction.status === "ended" || (auction.endTime && new Date() > new Date(auction.endTime))) {
          return res.status(400).json({ error: "This auction has already ended. Bids are closed." });
        }

        // Auto-extend by 3 mins if bid in final 2 mins
        const now = Date.now();
        const endTimeMs = new Date(auction.endTime).getTime();
        const twoMinsMs = 2 * 60 * 1000;
        if (endTimeMs - now <= twoMinsMs && auction.autoExtension !== false) {
          const newEndTime = new Date(now + 3 * 60 * 1000);
          auction.endTime = newEndTime;
          await auction.save();

          const io = req.app.get("io");
          if (io) {
            io.to(`auction:${vehicleId}`).emit("auction:extended", {
              vehicleId,
              newEndTime: newEndTime.toISOString(),
              message: "Auction auto-extended by 3 minutes due to last-minute bid!"
            });
          }
        }
      }
    }

    // ── Check if user already has a higher bid on this vehicle ────
    const existingBid = await Bid.findOne({
      vehicleId,
      userId: decoded.id,
    }).sort({ amount: -1 });

    if (existingBid && bidAmount <= existingBid.amount) {
      return res.status(400).json({
        error: `You already have a bid of ₹${existingBid.amount.toLocaleString()} on this vehicle. Enter a higher amount.`,
      });
    }

    // ── Mark previous bids on this vehicle as outbid ──────────────
    await Bid.updateMany(
      { vehicleId, userId: { $ne: decoded.id }, status: "active" },
      { $set: { status: "outbid" } }
    );

    // ── Create new bid ────────────────────────────────────────────
    const bid = await Bid.create({
      vehicleId,
      userId: decoded.id,
      userName: decoded.name || decoded.username || decoded.email || "Anonymous Bidder",
      userEmail: decoded.email || "",
      amount: bidAmount,
      status: "active",
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      fuel: vehicle.fuel,
    });

    // ── Create Notification for outbid users ───────────────────────
    const previousBidders = await Bid.find({ vehicleId, userId: { $ne: decoded.id } }).distinct("userId");
    const Notification = require("../models/Notification");
    for (const prevUserId of previousBidders) {
      await Notification.create({
        userId: prevUserId,
        title: "Outbid Alert!",
        message: `You were outbid on ${vehicle.brand} ${vehicle.model}. New highest bid: ₹${bidAmount.toLocaleString()}`,
        type: "outbid",
        link: `/auctions`
      });
    }

    // ── Socket.IO Broadcast ───────────────────────────────────────
    const io = req.app.get("io");
    if (io) {
      io.to(`auction:${vehicleId}`).emit("bid:placed", {
        vehicleId,
        amount: bidAmount,
        userName: decoded.name,
        time: bid.createdAt
      });
    }

    // ── Update vehicle bid count ──────────────────────────────────
    await Vehicle.findByIdAndUpdate(vehicleId, { $inc: { bidCount: 1 } });

    console.log(`✅ [Bid] ${decoded.email} bid ₹${bidAmount} on ${vehicle.brand} ${vehicle.model}`);

    return res.status(201).json({
      message: "Bid placed successfully!",
      bid: {
        _id: bid._id,
        vehicleId: bid.vehicleId,
        amount: bid.amount,
        status: bid.status,
        brand: bid.brand,
        model: bid.model,
        time: bid.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ [Bid] Error:", error);
    return res.status(500).json({ error: "Server error placing bid." });
  }
};

// GET /api/bids/vehicle/:vehicleId — get all bids for a vehicle
exports.getVehicleBids = async (req, res) => {
  try {
    const bids = await Bid.find({ vehicleId: req.params.vehicleId })
      .sort({ amount: -1 })
      .limit(20)
      .select("userName amount status createdAt");

    return res.json({ bids });
  } catch (error) {
    return res.status(500).json({ error: "Server error fetching bids." });
  }
};
