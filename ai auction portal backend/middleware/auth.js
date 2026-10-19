const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "auction_jwt_secret_key_2024_secure";

const verifyToken = (req, res, next) => {
  if (req.user) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Token missing." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = { verifyToken };
