const Review = require("../models/Review");
const User = require("../models/User");

exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ targetUserId: userId }).populate("reviewerId", "name profileImage rating").sort({ createdAt: -1 });
    const total = reviews.length;
    const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1) : 5.0;

    res.json({ reviews, total, avgRating: parseFloat(avgRating) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews", details: err.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const reviewerId = req.user.id || req.user._id;
    const { targetUserId, vehicleId, rating, comment } = req.body;

    const review = await Review.create({
      reviewerId,
      targetUserId,
      vehicleId,
      rating,
      comment
    });

    // Update target user's average rating
    const allReviews = await Review.find({ targetUserId });
    const avgRating = (allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length).toFixed(1);
    await User.findByIdAndUpdate(targetUserId, { rating: parseFloat(avgRating) });

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: "Failed to post review", details: err.message });
  }
};
