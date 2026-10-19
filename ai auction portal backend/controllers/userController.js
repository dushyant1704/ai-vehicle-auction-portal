const User = require("../models/User");
const Bid = require("../models/Bid");
const Vehicle = require("../models/Vehicle");
const Auction = require("../models/Auction");
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

// ==================== GET /api/user/profile ====================
const getProfile = async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== GET /api/user/stats ====================
const getStats = async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(decoded.id);
    const userId = decoded.id;

    // Buyer metrics
    const userBids = await Bid.find({ userId });
    const totalBids = userBids.length;
    const totalSpend = userBids.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const uniqueVehicles = new Set(userBids.map((b) => String(b.vehicleId))).size;
    const wonAuctions = userBids.filter((b) => b.status === "won").length;
    const activeBids = userBids.filter((b) => b.status === "active").length;
    
    // Watchlist count
    const Watchlist = require("../models/Watchlist");
    const savedVehicles = await Watchlist.countDocuments({ userId });

    // Seller metrics
    const sellerVehicles = await Vehicle.find({ sellerId: userId });
    const sellerVehiclesCount = sellerVehicles.length;
    const totalSellerViews = sellerVehicles.reduce((sum, v) => sum + (v.viewsCount || 0), 0);
    const totalSellerWatchers = sellerVehicles.reduce((sum, v) => sum + (v.watchCount || 0), 0);
    
    const sellerAuctions = await Auction.find({ sellerId: userId });
    const sellerRevenue = sellerAuctions.filter(a => a.paymentStatus === "completed" || a.paymentStatus === "escrow")
      .reduce((sum, a) => sum + (a.currentPrice || 0), 0);

    const totalAuctions = await Vehicle.countDocuments({});

    res.json({
      role: user?.role || "buyer",
      kycStatus: user?.kycStatus || "verified",
      walletBalance: Number(user?.walletBalance) || 0,
      rating: Number(user?.rating) || 5.0,
      // Buyer
      totalBids,
      totalSpend,
      uniqueVehicles,
      totalAuctions,
      wonAuctions,
      activeBids,
      savedVehicles,
      aiAlerts: activeBids,
      // Seller
      sellerVehiclesCount,
      totalSellerViews,
      totalSellerWatchers,
      sellerRevenue: sellerRevenue,
    });
  } catch (err) {
    console.error("❌ [User] Stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== GET /api/user/bids ====================
const getUserBids = async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const bids = await Bid.find({ userId: decoded.id })
      .sort({ createdAt: -1 })
      .limit(50);

    // Enrich with latest vehicle image if not already stored
    const enriched = await Promise.all(
      bids.map(async (bid) => {
        let image = null;
        try {
          const vehicle = await Vehicle.findById(bid.vehicleId).select("images");
          image = vehicle?.images?.[0] || null;
        } catch {
          // ignore
        }
        return {
          _id: bid._id,
          vehicleId: bid.vehicleId,
          amount: bid.amount,
          status: bid.status,
          time: bid.createdAt,
          brand: bid.brand || "Unknown",
          model: bid.model || "Vehicle",
          year: bid.year || null,
          fuel: bid.fuel || null,
          image,
        };
      })
    );

    res.json({ bids: enriched });
  } catch (err) {
    console.error("❌ [User] Bids error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== GET /api/user/activity ====================
const getActivity = async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: "Unauthorized" });

    const bids = await Bid.find({ userId: decoded.id })
      .sort({ createdAt: -1 })
      .limit(15);

    const activities = bids.map((bid) => {
      const label = `${bid.brand || "Unknown"} ${bid.model || "Vehicle"}`;
      let type = "bid_placed";
      let message = `You placed a bid of ₹${Number(bid.amount).toLocaleString("en-IN")} on ${label}`;

      if (bid.status === "outbid") {
        type = "outbid";
        message = `You were outbid on ${label}`;
      } else if (bid.status === "won") {
        type = "won";
        message = `You won the auction for ${label} at ₹${Number(bid.amount).toLocaleString("en-IN")}`;
      }

      return {
        id: bid._id,
        type,
        message,
        time: bid.createdAt,
        vehicleId: bid.vehicleId,
      };
    });

    res.json({ activities });
  } catch (err) {
    console.error("❌ [User] Activity error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== GET /api/user/recommendations ====================
const getRecommendations = async (req, res) => {
  try {
    // Return latest 6 vehicles as recommendations
    const vehicles = await Vehicle.find({})
      .sort({ _id: -1 })
      .limit(6)
      .select("brand model year fuel images mileage price");
    res.json({ recommendations: vehicles });
  } catch (err) {
    console.error("❌ [User] Recommendations error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== PUT /api/user/profile ====================
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // RBAC Security Guard: Disallow non-admin users from escalating their own role
    if (req.body.role && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Users are not permitted to modify their assigned role." });
    }

    const allowedUpdates = {};
    if (req.body.name) allowedUpdates.name = req.body.name.trim();
    if (req.body.phone !== undefined) allowedUpdates.phone = req.body.phone;
    if (req.body.address !== undefined) allowedUpdates.address = req.body.address;
    if (req.body.profileImage !== undefined) allowedUpdates.profileImage = req.body.profileImage;
    if (req.body.notificationPreferences !== undefined) allowedUpdates.notificationPreferences = req.body.notificationPreferences;

    // Only admin can modify roles or wallet balances directly
    if (req.user.role === "admin") {
      if (req.body.role) allowedUpdates.role = req.body.role;
      if (req.body.kycStatus) allowedUpdates.kycStatus = req.body.kycStatus;
      if (req.body.walletBalance !== undefined) allowedUpdates.walletBalance = req.body.walletBalance;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error("❌ [User] Update profile error:", err);
    res.status(500).json({ error: "Server error updating profile" });
  }
};

module.exports = { getProfile, updateProfile, getStats, getUserBids, getActivity, getRecommendations };
