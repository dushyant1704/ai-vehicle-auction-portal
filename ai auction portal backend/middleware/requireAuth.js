// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please login first." });
  }
  next();
};

module.exports = requireAuth;
