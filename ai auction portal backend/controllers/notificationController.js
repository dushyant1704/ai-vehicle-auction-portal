const Notification = require("../models/Notification");

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications", details: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { read: true }
    );
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification", details: err.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notifications", details: err.message });
  }
};
