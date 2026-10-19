const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { verifyToken } = require("../middleware/auth");

router.post("/create-intent", verifyToken, paymentController.createPaymentIntent);
router.post("/escrow-release", verifyToken, paymentController.releaseEscrow);

module.exports = router;
