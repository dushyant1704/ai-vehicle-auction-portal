const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  brand: String,
  model: String,
  year: Number,
  mileage: Number, // Corresponds to km_driven

  // Required ML Features
  vehicle_age: Number,
  fuel: String,
  transmission: String,
  engine: Number, // Cleaned to Number (CC)
  max_power: Number, // Cleaned to Number (bhp)
  torque: Number, // NEW: Torque (Nm) - Optional
  seats: Number,

  // Additional Metadata
  ownerType: String,
  condition: { type: String, default: "good" },
  segment: String, // User-selected segment (optional)
  damageType: String,
  location: String,
  
  // Pricing Fields
  price: Number, // Asking/listing price
  original_price: Number, // Ex-showroom/purchase price (optional but recommended)

  // AI Valuation Results (Computed, not stored permanently)
  expected_price: Number,
  ai_price: Number,
  residual_value: Number,
  salvage_value: Number,
  insurance_value: Number,
  distress_value: Number,

  // Damage Detection Results (Phase 2)
  damages: [{
    type: { type: String }, // 'dent', 'scratch', 'crack', 'glass shatter', 'lamp broken', 'tire flat'
    confidence: Number,     // 0-100
    bbox: {                 // Bounding box
      x1: Number,
      y1: Number,
      x2: Number,
      y2: Number
    },
    image_index: Number,    // Which image (0-4)
    severity: String        // 'minor', 'moderate', 'severe'
  }],
  
  damage_summary: {
    total_damages: { type: Number, default: 0 },
    severity_score: { type: Number, default: 0 },     // 0-100 (0=pristine, 100=totaled)
    severity_level: String,                           // 'pristine', 'minor', 'moderate', 'major', 'severe'
    has_structural_damage: { type: Boolean, default: false },
    has_cosmetic_damage: { type: Boolean, default: false },
    has_functional_damage: { type: Boolean, default: false },
    categories: [String]    // ['structural', 'cosmetic', 'functional']
  },
  
  annotated_images: [String],   // URLs of images with bounding boxes
  
  // Image Quality Metadata
  image_quality: [{
    image_url: String,
    blur_score: Number,       // Higher = sharper
    resolution: String,       // "1920x1080"
    brightness_level: String, // "optimal", "too_dark", "too_bright"
    passed_quality_check: { type: Boolean, default: true },
    exif_validation: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  exif_summary: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      overall_status: "NO_METADATA",
      badge: "No EXIF Data",
      findings: []
    }
  },
  
  // Pricing with Damage Adjustment (80% XGBoost + 20% Damage Adjusted)
  xgboost_base_price: Number,      // Pure ML prediction
  damage_adjusted_price: Number,   // After damage penalty
  damage_penalty_percent: Number,  // e.g., 15.5%
  final_valuation: Number,         // 80% XGBoost + 20% Damage Adjusted

  // ═══════════════════════════════════════════════════════════════
  // VEHICLE CONDITION ASSESSMENT (Phase 3)
  // Automatically generated after YOLO damage detection
  // ═══════════════════════════════════════════════════════════════
  
  conditionAssessment: {
    // Condition Scores (0-100)
    scores: {
      exterior_condition: { type: Number, min: 0, max: 100 },  // Exterior appearance
      damage_severity: { type: Number, min: 0, max: 100 },     // Overall damage level
      final_condition: { type: Number, min: 0, max: 100 }      // Composite score
    },
    
    // Overall Condition Category
    conditionCategory: {
      label: String,        // 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Salvage'
      score: Number,        // Final condition score
      color: String,        // UI color indicator
      key: String          // Category key
    },
    
    // Damage Severity Category
    damageSeverityCategory: {
      label: String,        // 'Minor', 'Moderate', 'Significant', 'Severe'
      score: Number,        // Damage severity score
      impact: String,       // 'low', 'medium', 'high', 'critical'
      key: String          // Severity key
    },
    
    // Repair Cost Estimates
    repairEstimate: {
      estimated_repair_cost: Number,
      repair_cost_range: {
        min: Number,
        max: Number
      },
      repair_to_value_ratio: Number,  // Repair cost / market price (%)
      economic_to_repair: Boolean     // Is it worth repairing?
    },
    
    // Value Impact Analysis
    valueImpact: {
      original_value: Number,
      adjusted_value: Number,
      value_reduction: Number,
      reduction_percent: Number,
      penalty_applied: Number
    },
    
    // Detailed Recommendations
    recommendedRepairs: [{
      type: String,         // 'positive', 'info', 'warning', 'critical'
      priority: String,     // 'low', 'medium', 'high', 'critical'
      message: String,
      action: String
    }],
    
    // Assessment Metadata
    assessed_at: { type: Date, default: Date.now }
  },
  
  // MongoDB-Queryable Fields (Denormalized for performance)
  conditionScore: { type: Number, min: 0, max: 100 },  // For sorting/filtering
  conditionCategory: String,                             // 'Excellent', 'Good', etc.
  damageSeverity: { type: Number, min: 0, max: 100 },  // For sorting/filtering

  // Media
  images: [String],
  videos: [String],

  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auction",
  },
  // Additional Analytics & Features
  confidenceScore: { type: Number, default: 94 },
  ownershipHistory: {
    ownersCount: { type: Number, default: 1 },
    registrationCity: { type: String, default: "Mumbai" },
    registrationYear: { type: Number, default: 2021 }
  },
  serviceHistory: {
    fullServiceRecord: { type: Boolean, default: true },
    lastServiceKm: { type: Number, default: 45000 },
    majorRepairs: { type: Boolean, default: false }
  },
  insuranceDetails: {
    validUntil: { type: Date, default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
    type: { type: String, default: "Comprehensive" },
    claimHistory: { type: Boolean, default: false }
  },
  registrationValidity: { type: Date, default: () => new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000) },
  viewsCount: { type: Number, default: 0 },
  watchCount: { type: Number, default: 0 },
  bidCount: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 88 },
  verificationStatus: { type: String, enum: ["pending", "verified", "flagged"], default: "verified" },
  documents: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  complianceScore: { type: Number, default: 85 },
  aiSummary: { type: String, default: "Clean title vehicle in good condition with low damage risk." },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Compound MongoDB Indexes for fast queries & analytics
vehicleSchema.index({ brand: 1, model: 1 });
vehicleSchema.index({ sellerId: 1, createdAt: -1 });
vehicleSchema.index({ status: 1, price: 1 });
vehicleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Vehicle", vehicleSchema);