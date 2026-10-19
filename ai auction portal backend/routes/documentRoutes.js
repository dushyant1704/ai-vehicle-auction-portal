const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const { verifyToken } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/rbac");
const upload = require("../middleware/upload");

// Optional auth helper: decodes token if present without rejecting public visitors
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return verifyToken(req, res, next);
  }
  next();
};

// POST /api/documents/upload — Upload/register vehicle compliance document (seller, bank, admin)
router.post(
  "/upload",
  verifyToken,
  authorizeRoles("seller", "bank", "admin"),
  upload.single("file"),
  documentController.uploadDocument
);

// GET /api/documents/vehicle/:vehicleId — Retrieve documents (public sees status, owner/admin sees full)
router.get("/vehicle/:vehicleId", optionalAuth, documentController.getVehicleDocuments);

// GET /api/documents/pending — Admin inspection queue
router.get("/pending", verifyToken, authorizeRoles("admin"), documentController.getPendingDocuments);

// POST /api/documents/preflight — Instant verification feedback without saving
router.post(
  "/preflight",
  verifyToken,
  authorizeRoles("seller", "bank", "admin"),
  documentController.preflightDocument
);

// PUT /api/documents/:id/review — Admin document review (approve/reject)
router.put("/:id/review", verifyToken, authorizeRoles("admin"), documentController.reviewDocument);

// DELETE /api/documents/:id — Delete document (uploader or admin)
router.delete("/:id", verifyToken, documentController.deleteDocument);

module.exports = router;
