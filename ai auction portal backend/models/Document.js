const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      index: true,
    },
    documentType: {
      type: String,
      required: true,
    },
    version: { type: Number, default: 1 },
    isLatest: { type: Boolean, default: true },
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    uploaderRole: {
      type: String,
      default: "seller",
    },
    fileName: String,
    fileSize: Number,
    mimeType: String,
    storageKey: String,
    isPrivate: { type: Boolean, default: true },
    contentHash: String,
    documentReference: String,
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "SUPERSEDED"],
      default: "PENDING",
    },
    extractedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    consistencyChecks: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    fileUrl: String,
    trustScore: { type: Number, default: 0 },
    autoRecommendation: { type: String, default: "MANUAL_REVIEW_REQUIRED" },
    reviewDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: "documents",
    timestamps: true,
  }
);

documentSchema.index({ vehicleId: 1, uploaderId: 1 });
documentSchema.index({ uploaderId: 1, isPrivate: 1 });

module.exports = mongoose.model("Document", documentSchema);
