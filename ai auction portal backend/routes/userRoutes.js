const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  getProfile,
  updateProfile,
  getStats,
  getUserBids,
  getActivity,
  getRecommendations,
} = require("../controllers/userController");

// GET /api/user/profile — authenticated user profile
router.get("/profile", verifyToken, getProfile);

// PUT /api/user/profile — update profile with RBAC escalation protections
router.put("/profile", verifyToken, updateProfile);

// GET /api/user/stats — user dashboard stats
router.get("/stats", verifyToken, getStats);

// GET /api/user/bids — user bid history
router.get("/bids", verifyToken, getUserBids);

// GET /api/user/activity — recent user actions
router.get("/activity", verifyToken, getActivity);

// GET /api/user/recommendations — personalized / trending vehicle recommendations (public)
router.get("/recommendations", getRecommendations);

module.exports = router;
