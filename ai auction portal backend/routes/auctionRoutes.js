const express = require("express");
const router = express.Router();
const auctionController = require("../controllers/auctionController");
const Auction = require("../models/Auction");
const { verifyToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/rbac");

// GET all auctions (public)
router.get("/", auctionController.getAllAuctions);

// GET auction by ID (public)
router.get("/:id", auctionController.getAuctionById);

// CREATE auction — RBAC: seller, bank, or admin
router.post("/", verifyToken, authorizeRoles("seller", "bank", "admin"), auctionController.createAuction);

// UPDATE auction status (Lifecycle management) — RBAC: owning seller, bank, or admin
router.put("/:id/status", verifyToken, authorizeRoles("seller", "bank", "admin"), auctionController.updateAuctionStatus);

// DELETE all auctions (for administrative / test reset) — strictly admin only
router.delete("/all", verifyToken, authorizeRoles("admin"), async (req, res) => {
  await Auction.deleteMany({});
  res.json({ message: "All auctions deleted" });
});

module.exports = router;