/**
 * ═══════════════════════════════════════════════════════════════════
 * VEHICLE DOCUMENT CONTROLLER (Advanced Verification Edition)
 * Purpose: Secure vehicle compliance document upload, multi-point RTO
 *          and specification integrity validation, deduplication,
 *          RBAC privacy views, and administrative review.
 * ═══════════════════════════════════════════════════════════════════
 */

const Document = require("../models/Document");
const Vehicle = require("../models/Vehicle");
const AuditLog = require("../models/AuditLog");
const { checkResourceOwnership, normalizeRole } = require("../middleware/rbac");
const {
  verifyVehicleDocument,
  calculateContentHash,
  maskRegistrationPlate,
  maskVIN,
  maskName
} = require("../utils/documentVerificationEngine");

const ALLOWED_DOCUMENT_TYPES = [
  "rcBook",
  "repossessionNotice",
  "form35Noc",
  "inspectionCertificate",
  "insurancePolicy",
  "loanClearance",
  "other"
];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const normalizeDocType = (type) => {
  if (!type || typeof type !== "string") return "other";
  const t = type.trim();
  const map = {
    RC_BOOK: "rcBook",
    REPOSSESSION_NOTICE: "repossessionNotice",
    FORM_35_NOC: "form35Noc",
    FORM_35: "form35Noc",
    INSURANCE: "insurancePolicy",
    INSURANCE_POLICY: "insurancePolicy",
    INSPECTION_CERTIFICATE: "inspectionCertificate",
    LOAN_CLEARANCE: "loanClearance",
    rc_book: "rcBook",
    repossession_notice: "repossessionNotice",
    form_35_noc: "form35Noc"
  };
  return map[t] || map[t.toUpperCase()] || t;
};

// ── POST /api/documents/preflight ─────────────────────────────────
// Live preflight validation before saving (instant UI feedback)
exports.preflightDocument = async (req, res) => {
  try {
    const { vehicleId, documentType } = req.body;
    const normalizedType = normalizeDocType(documentType);
    let vehicle = null;
    if (vehicleId) {
      vehicle = await Vehicle.findById(vehicleId);
    }

    const existingDocs = await Document.find({}).select("contentHash vehicleId");
    const result = verifyVehicleDocument(
      { ...req.body, documentType: normalizedType },
      vehicle || {},
      existingDocs
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("[Document] Preflight error:", error);
    res.status(500).json({ error: "Preflight verification failed", details: error.message });
  }
};

// ── POST /api/documents/upload ────────────────────────────────────
// Upload or register a compliance document for a vehicle
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Authentication required." });
    }

    const {
      vehicleId,
      documentType,
      documentReference,
      registrationNumber,
      chassisNumber,
      engineNumber,
      ownerName,
      bankName,
      loanAccountNumber,
      issueDate,
      expiryDate,
      notes
    } = req.body;

    // 1. Validate mandatory fields
    if (!vehicleId) {
      return res.status(400).json({ error: "Vehicle ID is required." });
    }

    const normalizedType = normalizeDocType(documentType);
    if (!normalizedType || !ALLOWED_DOCUMENT_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `Invalid document type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`
      });
    }

    // 2. Fetch vehicle and verify ownership
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    if (!checkResourceOwnership(vehicle.sellerId, req.user)) {
      return res.status(403).json({
        error: "Forbidden. You do not have permission to upload documents for this vehicle."
      });
    }

    // 3. File validation & Content Hashing
    const file = req.file;
    let actualFileName = req.body.fileName || file?.originalname || `${documentType}_document`;
    let actualFileSize = Number(req.body.fileSize) || file?.size || 0;
    let actualMimeType = req.body.mimeType || file?.mimetype || "application/pdf";
    let actualStorageKey = req.body.storageKey || file?.path || `doc_${Date.now()}`;
    let fileUrl = file?.path || req.body.fileUrl || null;

    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({
          error: "Invalid file format. Allowed formats are PDF, JPEG, PNG, and WebP."
        });
      }
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: "File size exceeds 10MB limit."
        });
      }
    }

    // Compute content hash (for anti-forgery deduplication)
    let contentHash = req.body.contentHash || null;
    if (file?.buffer) {
      contentHash = calculateContentHash(file.buffer);
    } else if (!contentHash && (documentReference || chassisNumber)) {
      contentHash = calculateContentHash(`${documentType}:${documentReference || chassisNumber}:${vehicleId}`);
    }

    // 4. Run Automated Verification Engine
    const existingDocs = await Document.find({}).select("contentHash vehicleId");
    const docPayload = {
      ...req.body,
      contentHash,
      documentReference: documentReference || registrationNumber || chassisNumber
    };

    const verificationResult = verifyVehicleDocument(docPayload, vehicle, existingDocs);

    // 5. Supersede older documents of the exact same type for this vehicle
    await Document.updateMany(
      { vehicleId, documentType: normalizedType, isLatest: true },
      { $set: { isLatest: false, status: "SUPERSEDED" } }
    );

    // 6. Persist Document record
    const userRole = normalizeRole(req.user.role || "seller");
    // Admin uploads are pre-verified if trustScore >= 80, otherwise PENDING
    const initialStatus =
      userRole === "admin" && verificationResult.trustScore >= 80 ? "VERIFIED" : "PENDING";

    const doc = new Document({
      vehicleId,
      documentType: normalizedType,
      version: 1,
      isLatest: true,
      uploaderId: req.user.id || req.user._id,
      uploaderRole: userRole,
      fileName: actualFileName,
      fileSize: actualFileSize,
      mimeType: actualMimeType,
      storageKey: actualStorageKey,
      fileUrl,
      isPrivate: true,
      contentHash,
      documentReference: documentReference || registrationNumber || chassisNumber || "",
      status: initialStatus,
      trustScore: verificationResult.trustScore,
      autoRecommendation: verificationResult.autoRecommendation,
      extractedFields: verificationResult.extractedFields,
      consistencyChecks: verificationResult.checks,
      reviewDetails: {
        submittedAt: new Date(),
        notes: notes || "",
        autoVerdict: verificationResult.verdictMessage,
        reviewedAt: initialStatus === "VERIFIED" ? new Date() : null,
        reviewerName: initialStatus === "VERIFIED" ? req.user.name || "Admin" : null
      }
    });

    await doc.save();

    // 7. Update Vehicle's document verification map & compliance status
    if (!vehicle.documents) vehicle.documents = {};
    vehicle.documents[normalizedType] = {
      verified: doc.status === "VERIFIED",
      status: doc.status,
      documentId: doc._id,
      trustScore: doc.trustScore,
      autoRecommendation: doc.autoRecommendation,
      uploadedAt: new Date(),
      fileName: actualFileName,
      fileUrl: doc.fileUrl,
      maskedReference:
        verificationResult.extractedFields?.maskedPlate ||
        verificationResult.extractedFields?.maskedVIN ||
        doc.documentReference
    };

    // Calculate overall vehicle compliance
    const hasRC = vehicle.documents.rcBook?.verified === true;
    const hasNOC = vehicle.documents.repossessionNotice?.verified === true || vehicle.documents.form35Noc?.verified === true;

    if (hasRC && hasNOC) {
      vehicle.verificationStatus = "verified";
      vehicle.complianceScore = Math.max(95, vehicle.complianceScore || 90);
    } else if (hasRC || hasNOC) {
      vehicle.complianceScore = 80;
    }

    await vehicle.save();

    // 8. Record audit log
    await AuditLog.create({
      userId: req.user.id || req.user._id,
      action: "DOCUMENT_UPLOADED",
      details: {
        documentId: doc._id,
        vehicleId,
        documentType,
        trustScore: doc.trustScore,
        autoRecommendation: doc.autoRecommendation
      }
    }).catch((err) => console.warn("[AuditLog] Document upload log warning:", err.message));

    // 9. Notify via Socket.IO if active
    const io = req.app.get("io");
    if (io) {
      io.emit("document:status_changed", {
        vehicleId: vehicle._id,
        documentType,
        status: doc.status,
        trustScore: doc.trustScore,
        autoRecommendation: doc.autoRecommendation
      });
    }

    res.status(201).json({
      success: true,
      message: "Document uploaded and verified through compliance engine.",
      document: {
        _id: doc._id,
        vehicleId: doc.vehicleId,
        documentType: doc.documentType,
        fileName: doc.fileName,
        status: doc.status,
        trustScore: doc.trustScore,
        autoRecommendation: doc.autoRecommendation,
        consistencyChecks: doc.consistencyChecks,
        extractedFields: doc.extractedFields,
        fileUrl: doc.fileUrl,
        createdAt: doc.createdAt
      }
    });
  } catch (error) {
    console.error("[Document] Upload error:", error);
    res.status(500).json({ error: "Failed to upload and verify document", details: error.message });
  }
};

// ── GET /api/documents/vehicle/:vehicleId ─────────────────────────
// Retrieve vehicle documents with RBAC privacy protection
exports.getVehicleDocuments = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    const docs = await Document.find({ vehicleId, isLatest: true })
      .populate("uploaderId", "name email role")
      .sort({ createdAt: -1 });

    const isPrivileged = req.user && checkResourceOwnership(vehicle.sellerId, req.user);

    // Privileged access for vehicle owner (Seller/Bank) & Admin
    if (isPrivileged) {
      return res.json({
        success: true,
        accessLevel: "privileged",
        complianceSummary: {
          rcBookVerified: vehicle.documents?.rcBook?.verified === true,
          repossessionVerified:
            vehicle.documents?.repossessionNotice?.verified === true ||
            vehicle.documents?.form35Noc?.verified === true,
          insuranceVerified: vehicle.documents?.insurancePolicy?.verified === true,
          complianceScore: vehicle.complianceScore || 85,
          overallStatus: vehicle.verificationStatus
        },
        documents: docs.map((d) => ({
          _id: d._id,
          vehicleId: d.vehicleId,
          documentType: d.documentType,
          fileName: d.fileName,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
          fileUrl: d.fileUrl,
          status: d.status,
          trustScore: d.trustScore,
          autoRecommendation: d.autoRecommendation,
          uploaderRole: d.uploaderRole,
          documentReference: d.documentReference,
          extractedFields: d.extractedFields,
          consistencyChecks: d.consistencyChecks,
          reviewDetails: d.reviewDetails,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        }))
      });
    }

    // Public / Buyer sanitized view (protects confidential PII & private storage keys)
    const sanitizedDocs = docs.map((d) => ({
      _id: d._id,
      documentType: d.documentType,
      status: d.status,
      verified: d.status === "VERIFIED",
      trustScore: d.trustScore,
      maskedReference:
        d.extractedFields?.maskedPlate ||
        d.extractedFields?.maskedVIN ||
        d.extractedFields?.maskedOwner ||
        "Verified Institutional Record",
      verifiedAt: d.reviewDetails?.reviewedAt || null,
      summaryChecks: (d.consistencyChecks || [])
        .filter((c) => c.passed)
        .map((c) => c.name)
    }));

    res.json({
      success: true,
      accessLevel: "public",
      complianceSummary: {
        legalTitleVerified:
          vehicle.documents?.rcBook?.verified === true &&
          (vehicle.documents?.repossessionNotice?.verified === true ||
            vehicle.documents?.form35Noc?.verified === true),
        complianceScore: vehicle.complianceScore || 85,
        overallStatus: vehicle.verificationStatus
      },
      documents: sanitizedDocs
    });
  } catch (error) {
    console.error("[Document] Get vehicle documents error:", error);
    res.status(500).json({ error: "Failed to retrieve documents", details: error.message });
  }
};

// ── PUT /api/documents/:id/review ─────────────────────────────────
// Strictly Admin only: Review and verify or reject a document
exports.reviewDocument = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Authentication required." });
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole !== "admin") {
      return res.status(403).json({ error: "Forbidden. Only administrators can review and verify documents." });
    }

    const { id } = req.params;
    const { status, reason, notes } = req.body;

    if (!status || !["VERIFIED", "REJECTED"].includes(status.toUpperCase())) {
      return res.status(400).json({
        error: "Invalid review decision. Status must be 'VERIFIED' or 'REJECTED'."
      });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ error: "Document not found." });
    }

    const decisionStatus = status.toUpperCase();
    document.status = decisionStatus;
    document.reviewDetails = {
      reviewerId: req.user.id || req.user._id,
      reviewerName: req.user.name || "Administrator",
      reviewedAt: new Date(),
      decision: decisionStatus,
      reason: reason || (decisionStatus === "VERIFIED" ? "Document verified compliant with RTO specifications." : "Document rejected."),
      notes: notes || ""
    };

    await document.save();

    // Update parent vehicle's compliance map
    const vehicle = await Vehicle.findById(document.vehicleId);
    if (vehicle) {
      if (!vehicle.documents) vehicle.documents = {};
      const docTypeKey = document.documentType;

      vehicle.documents[docTypeKey] = {
        verified: decisionStatus === "VERIFIED",
        status: decisionStatus,
        reviewedAt: new Date(),
        reviewerName: req.user.name || "Admin",
        trustScore: document.trustScore
      };

      const hasRC = vehicle.documents.rcBook?.verified === true;
      const hasNOC =
        vehicle.documents.repossessionNotice?.verified === true ||
        vehicle.documents.form35Noc?.verified === true;

      if (hasRC && hasNOC) {
        vehicle.verificationStatus = "verified";
        vehicle.complianceScore = Math.max(95, vehicle.complianceScore || 90);
      } else if (decisionStatus === "REJECTED" && (docTypeKey === "rcBook" || docTypeKey === "repossessionNotice")) {
        vehicle.verificationStatus = "flagged";
      }

      await vehicle.save();
    }

    // Record audit trail
    await AuditLog.create({
      userId: req.user.id || req.user._id,
      action: `DOCUMENT_${decisionStatus}`,
      details: {
        documentId: document._id,
        vehicleId: document.vehicleId,
        documentType: document.documentType,
        decision: decisionStatus,
        reason: document.reviewDetails.reason
      }
    }).catch((err) => console.warn("[AuditLog] Document review audit warning:", err.message));

    // Notify via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("document:status_changed", {
        vehicleId: document.vehicleId,
        documentType: document.documentType,
        status: decisionStatus
      });
    }

    res.json({
      success: true,
      message: `Document successfully ${decisionStatus.toLowerCase()}.`,
      document
    });
  } catch (error) {
    console.error("[Document] Review error:", error);
    res.status(500).json({ error: "Failed to review document", details: error.message });
  }
};

// ── GET /api/documents/pending ────────────────────────────────────
// Strictly Admin only: Retrieve pending compliance queue
exports.getPendingDocuments = async (req, res) => {
  try {
    if (!req.user || normalizeRole(req.user.role) !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admin access required." });
    }

    const pendingDocs = await Document.find({ status: "PENDING", isLatest: true })
      .populate("vehicleId", "brand model year location price verificationStatus")
      .populate("uploaderId", "name email role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      totalPending: pendingDocs.length,
      documents: pendingDocs
    });
  } catch (error) {
    console.error("[Document] Get pending documents error:", error);
    res.status(500).json({ error: "Failed to fetch pending documents", details: error.message });
  }
};

// ── DELETE /api/documents/:id ─────────────────────────────────────
// Delete a document (by uploader if pending, or by admin)
exports.deleteDocument = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const userRole = normalizeRole(req.user.role);
    const isOwner = String(doc.uploaderId) === String(req.user.id || req.user._id);

    if (userRole !== "admin" && !isOwner) {
      return res.status(403).json({ error: "Forbidden. You cannot delete this document." });
    }

    await Document.findByIdAndDelete(req.params.id);

    // Update parent vehicle map if necessary
    const vehicle = await Vehicle.findById(doc.vehicleId);
    if (vehicle && vehicle.documents && vehicle.documents[doc.documentType]) {
      delete vehicle.documents[doc.documentType];
      vehicle.markModified("documents");
      await vehicle.save();
    }

    res.json({ success: true, message: "Document deleted successfully." });
  } catch (error) {
    console.error("[Document] Delete error:", error);
    res.status(500).json({ error: "Failed to delete document", details: error.message });
  }
};
