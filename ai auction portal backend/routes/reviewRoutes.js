const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { verifyToken } = require("../middleware/auth");

router.get("/user/:userId", reviewController.getUserReviews);
router.post("/", verifyToken, reviewController.addReview);

module.exports = router;
