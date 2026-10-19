const express = require("express");
const router = express.Router();
const bidController = require("../controllers/bidController");
const { verifyToken } = require("../middleware/auth");

// POST /api/bids — place a bid (authenticated users only)
router.post("/", verifyToken, bidController.placeBid);

// GET /api/bids/vehicle/:vehicleId — get bids for a vehicle (public)
router.get("/vehicle/:vehicleId", bidController.getVehicleBids);

module.exports = router;
