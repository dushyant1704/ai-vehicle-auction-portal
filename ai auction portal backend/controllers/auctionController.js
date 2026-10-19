const Auction = require("../models/Auction");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");

// GET /api/auctions - Get all auctions with optional status filter
exports.getAllAuctions = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const auctions = await Auction.find(filter)
      .populate("sellerId", "name email verificationStatus")
      .populate("vehicleId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Auction.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      auctions
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch auctions", message: error.message });
  }
};

// GET /api/auctions/:id - Get single auction by ID
exports.getAuctionById = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate("sellerId", "name email verificationStatus")
      .populate("vehicleId")
      .populate("winnerId", "name email");

    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    res.json({ success: true, auction });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch auction details", message: error.message });
  }
};

// POST /api/auctions - Create new auction (RBAC + Verified seller check)
const { checkResourceOwnership, normalizeRole } = require("../middleware/rbac");

// POST /api/auctions - Create new auction (RBAC + Verified seller check)
exports.createAuction = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Authentication required." });
    }

    const userRole = normalizeRole(req.user.role || "buyer");
    if (userRole === "buyer") {
      return res.status(403).json({ error: "Forbidden. Buyers cannot publish auctions." });
    }

    // Sellers & banks must use their own ID; only admin can create on behalf of another user
    const sellerId = (userRole === "admin" && req.body.sellerId) ? req.body.sellerId : (req.user.id || req.user._id);

    // Verify user account exists
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ error: "Seller account not found." });
    }

    // If a vehicleId is specified, verify existence and check ownership
    if (req.body.vehicleId) {
      const vehicle = await Vehicle.findById(req.body.vehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found for auction creation." });
      }

      if (!checkResourceOwnership(vehicle.sellerId, req.user)) {
        return res.status(403).json({
          error: "Forbidden. You can only create an auction for a vehicle you own."
        });
      }
    }

    // Verified seller requirement for Live status
    const initialStatus = req.body.status || (seller.verificationStatus === "verified" ? "Live" : "Pending Verification");

    const auctionData = {
      title: req.body.title || `${req.body.brand || ''} ${req.body.model || ''} Auction`,
      description: req.body.description || "AI-verified vehicle auction.",
      assetType: req.body.assetType || "vehicle",
      startPrice: Number(req.body.startPrice) || 0,
      currentPrice: Number(req.body.startPrice) || 0,
      reservePrice: Number(req.body.reservePrice) || Number(req.body.startPrice) || 0,
      status: initialStatus,
      startTime: req.body.startTime || new Date(),
      endTime: req.body.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      images: req.body.images || [],
      sellerId: seller._id,
      vehicleId: req.body.vehicleId || null,
      autoExtension: req.body.autoExtension !== false,
      paymentStatus: "pending"
    };

    const auction = new Auction(auctionData);
    await auction.save();

    if (req.body.vehicleId) {
      await Vehicle.findByIdAndUpdate(req.body.vehicleId, { auctionId: auction._id });
    }

    res.status(201).json({
      success: true,
      message: "Auction created successfully",
      auction
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to create auction", message: error.message });
  }
};

// PUT /api/auctions/:id/status - Lifecycle transition endpoint
exports.updateAuctionStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Authentication required." });
    }

    const { status } = req.body;
    const validStatuses = [
      "Draft", "Pending AI", "Pending Verification", "Pending Approval",
      "Scheduled", "Live", "Extended", "Ended", "Payment Pending", "Completed", "Archived"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid auction status", validStatuses });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    // Ownership check: only owning seller, owning bank, or admin can change auction status
    if (!checkResourceOwnership(auction.sellerId, req.user)) {
      return res.status(403).json({
        error: "Forbidden. You do not have permission to update this auction's status."
      });
    }

    auction.status = status;
    await auction.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`auction:${auction._id}`).emit("auction:status_changed", {
        auctionId: auction._id,
        status: auction.status,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: `Auction status updated to ${status}`, auction });
  } catch (error) {
    res.status(500).json({ error: "Failed to update auction status", message: error.message });
  }
};