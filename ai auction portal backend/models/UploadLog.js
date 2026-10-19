const mongoose = require("mongoose");

const uploadLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  filename: String,
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  sharpnessScore: Number,
  lightingScore: Number,
  resolutionScore: Number,
  reflectionLevel: String,
  blurScore: Number,
  brightnessScore: Number,
  resolution: String,
  aiConfidence: Number,
  processingTimeMs: Number,
  detectedDamagesCount: {
    type: Number,
    default: 0,
  },
  conditionScore: {
    type: Number,
    default: 80,
  },
  primaryImageFilename: String,
  combinedReport: String,
  status: {
    type: String,
    enum: ["Accepted", "Warning", "Rejected"],
    default: "Accepted",
  },
  warnings: [String],
  reason: String,
  userOverridden: {
    type: Boolean,
    default: false,
  },
  exifValidation: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("UploadLog", uploadLogSchema);
