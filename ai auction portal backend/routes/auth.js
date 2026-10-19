const express = require("express");
const router = express.Router();
const passport = require("passport");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ==================== ROUTE: /auth/google ====================
// Initiates Google OAuth login
router.get(
  "/auth/google",
  (req, res, next) => {
    console.log("🔐 [OAuth] User initiated Google login");
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// ==================== ROUTE: /auth/google/callback ====================
// Google OAuth callback - handles authentication
router.get(
  "/auth/google/callback",
  (req, res, next) => {
    console.log("🔐 [OAuth] Received callback from Google");
    console.log("  ℹ️ Session ID:", req.sessionID);
    next();
  },
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed`,
    session: true,
    keepSessionInfo: true,
  }),
  (req, res) => {
    // Successful authentication
    console.log("✅ [OAuth] Authentication successful!");
    console.log("  ℹ️ Session ID:", req.sessionID);
    console.log("  👤 User:", req.user?.email || req.user?.googleId);
    console.log("  🔍 req.user object:", JSON.stringify(req.user, null, 2));

    // Save session explicitly to ensure persistence
    req.session.save((err) => {
      if (err) {
        console.error("❌ [Session] Failed to save session:", err);
        return res.redirect(`${FRONTEND_URL}/login?error=session_failed`);
      }

      console.log("✅ [Session] Session saved successfully");
      console.log("  ℹ️ Session cookies:", req.headers.cookie);

      // Redirect to frontend with success indicator
      const redirectUrl = `${FRONTEND_URL}/?login=success&user=${encodeURIComponent(
        req.user?.email || req.user?.name || "User",
      )}`;
      console.log(`🚀 [OAuth] Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);
    });
  },
);

// ==================== ROUTE: /user ====================
// Returns current user info from session
router.get("/user", (req, res) => {
  console.log("📋 [User] Fetching user info");
  console.log("  ℹ️ Session ID:", req.sessionID);
  console.log("  ℹ️ Authenticated:", req.isAuthenticated?.() || false);
  console.log(
    "  ℹ️ User object:",
    req.user ? JSON.stringify(req.user) : "none",
  );

  if (req.user) {
    console.log("✅ [User] User found in session");
    return res.json({ user: req.user, authenticated: true });
  }

  console.log("⚠️ [User] No user in session");
  res.json({ user: null, authenticated: false });
});

// ==================== ROUTE: /logout ====================
// Logout current user
router.get("/logout", (req, res) => {
  console.log("🚪 [Logout] User requesting logout");
  console.log("  ℹ️ Session ID:", req.sessionID);
  console.log("  ℹ️ User before logout:", req.user?.email || "unknown");

  req.logout?.((err) => {
    if (err) {
      console.error("❌ [Logout] Error during logout:", err);
    }

    req.session?.destroy((err) => {
      if (err) {
        console.error("❌ [Logout] Error destroying session:", err);
      } else {
        console.log("✅ [Logout] Session destroyed successfully");
      }

      res.clearCookie("connect.sid");
      console.log("✅ [Logout] Session cookie cleared");
      res.json({ ok: true, message: "Logged out successfully" });
    });
  });
});

module.exports = router;
