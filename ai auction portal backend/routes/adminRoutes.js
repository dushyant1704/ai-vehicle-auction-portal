const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/rbac");

// Admin statistics and analytics — strictly admin only
router.get("/stats", verifyToken, authorizeRoles("admin"), adminController.getAdminStats);

// Fraud and dispute reports — strictly admin only
router.get("/reports", verifyToken, authorizeRoles("admin"), adminController.getReports);

// Vehicle verification approval / rejection — strictly admin only
router.put("/verify-vehicle/:vehicleId", verifyToken, authorizeRoles("admin"), adminController.verifyVehicle);

module.exports = router;
