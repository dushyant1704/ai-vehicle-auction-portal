const Watchlist = require("../models/Watchlist");
const Vehicle = require("../models/Vehicle");

exports.getUserWatchlist = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const items = await Watchlist.find({ userId }).populate("vehicleId");
    const vehicles = items.map(item => item.vehicleId).filter(Boolean);
    res.json({ watchlist: vehicles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist", details: err.message });
  }
};

exports.toggleWatchlist = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { vehicleId } = req.body;

    const existing = await Watchlist.findOne({ userId, vehicleId });
    if (existing) {
      await Watchlist.deleteOne({ _id: existing._id });
      await Vehicle.findByIdAndUpdate(vehicleId, { $inc: { watchCount: -1 } });
      return res.json({ success: true, isWatched: false, message: "Removed from watchlist" });
    } else {
      await Watchlist.create({ userId, vehicleId });
      await Vehicle.findByIdAndUpdate(vehicleId, { $inc: { watchCount: 1 } });
      return res.json({ success: true, isWatched: true, message: "Added to watchlist" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle watchlist", details: err.message });
  }
};
