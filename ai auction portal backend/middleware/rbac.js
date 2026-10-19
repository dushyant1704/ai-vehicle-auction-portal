// Role-Based Access Control (RBAC) Middleware

// Canonical roles and their accepted aliases
const ROLE_ALIASES = {
  buyer: ["buyer", "bidder", "user", "individual_buyer"],
  seller: ["seller", "dealer", "individual_seller"],
  bank: ["bank", "institution", "financial_institution", "creditor", "lender"],
  admin: ["admin", "administrator", "superadmin", "inspector"]
};

// Normalize role string to canonical form
const normalizeRole = (role) => {
  if (!role || typeof role !== "string") return "buyer";
  const r = role.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(ROLE_ALIASES)) {
    if (canonical === r || aliases.includes(r)) {
      return canonical;
    }
  }
  return r;
};

// Authorize one or more roles
const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Please login first." });
    }

    const userRole = normalizeRole(req.user.role || "buyer");
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Action requires one of the following roles: ${allowedRoles.join(", ")}`,
        currentRole: userRole
      });
    }

    next();
  };
};

// Check specific permission rules
const checkPermissions = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Please login first." });
    }

    const role = normalizeRole(req.user.role || "buyer");

    const permissionsByRole = {
      buyer: [
        "place_bid",
        "watchlist",
        "review",
        "make_payment",
        "view_listings",
        "view_verified_documents"
      ],
      seller: [
        "upload_vehicle",
        "manage_own_listings",
        "upload_documents",
        "view_own_revenue",
        "view_listings"
      ],
      bank: [
        "upload_vehicle",
        "manage_own_listings",
        "upload_documents",
        "manage_repossessed_assets",
        "view_institutional_records",
        "view_own_revenue",
        "view_listings"
      ],
      admin: [
        "upload_vehicle",
        "manage_all_vehicles",
        "manage_all_auctions",
        "approve_vehicle",
        "reject_vehicle",
        "verify_document",
        "reject_document",
        "ban_user",
        "view_analytics",
        "view_reports",
        "manage_settings",
        "view_listings"
      ]
    };

    const allowedPermissions = permissionsByRole[role] || [];

    if (!allowedPermissions.includes(permission)) {
      return res.status(403).json({
        error: `Permission denied. Your role '${role}' cannot perform '${permission}'.`,
      });
    }

    next();
  };
};

// Helper: Ensure authenticated user owns the resource or is admin
const checkResourceOwnership = (ownerId, user, resourceName = "resource") => {
  if (!user) return false;
  const userRole = normalizeRole(user.role);
  if (userRole === "admin") return true;

  const currentUserId = (user.id || user._id || "").toString();
  const resOwnerId = (ownerId || "").toString();

  return Boolean(currentUserId && resOwnerId && currentUserId === resOwnerId);
};

module.exports = {
  authorizeRoles,
  checkPermissions,
  normalizeRole,
  checkResourceOwnership
};
