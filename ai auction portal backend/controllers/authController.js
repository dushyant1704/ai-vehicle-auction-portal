const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "auction_jwt_secret_key_2024_secure";

// ==================== REGISTER ====================
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Role selection: allow buyer, seller, bank; forbid self-assigning admin
    let assignedRole = "buyer";
    if (role) {
      const r = role.toLowerCase().trim();
      if (r === "seller" || r === "dealer") assignedRole = "seller";
      else if (r === "bank" || r === "institution" || r === "financial_institution") assignedRole = "bank";
      // Explicitly reject or prevent privilege escalation
      if (r === "admin" || r === "administrator" || r === "superadmin") {
        return res.status(403).json({ error: "Security violation: Administrator accounts cannot be self-registered." });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole,
      createdAt: new Date(),
    });

    // Issue JWT token
    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ [Auth] New user registered: ${newUser.email}`);

    return res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ [Auth] Register error:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Issue JWT token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ [Auth] User logged in: ${user.email}`);

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ [Auth] Login error:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
};

// ==================== GET ME (verify token) ====================
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("❌ [Auth] Token verification error:", err);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = { register, login, getMe };
