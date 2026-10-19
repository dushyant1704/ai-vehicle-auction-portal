const express = require("express");
const router = express.Router();
const watchlistController = require("../controllers/watchlistController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, watchlistController.getUserWatchlist);
router.post("/toggle", verifyToken, watchlistController.toggleWatchlist);

module.exports = router;
