/**
 * ═══════════════════════════════════════════════════════════════════
 * RAG KNOWLEDGE INGESTION SERVICE
 * 
 * Preprocesses, chunks, and vector-indexes platform policies,
 * engineering specifications, damage guidelines, institutional SOPs,
 * and live catalog vehicles.
 * ═══════════════════════════════════════════════════════════════════
 */

const KnowledgeChunk = require("../../models/KnowledgeChunk");
const Vehicle = require("../../models/Vehicle");
const { generateEmbedding } = require("./embeddingService");
const { upsertChunk } = require("./vectorStore");

/**
 * Canonical Platform Knowledge Sources
 */
const PLATFORM_DOCUMENTS = [
  {
    sourceId: "doc_bidding_rules_v1",
    sourceType: "policy",
    title: "Platform Bidding Rules and Auction Process",
    permittedRoles: ["buyer", "seller", "bank", "admin"],
    content: `AUCTION BIDDING RULES & PROTOCOLS:
1. Eligibility: Any verified user with a registered 'buyer' account may participate in active vehicle auctions.
2. Placing Bids: Bids must meet or exceed the minimum increment (typically ₹10,000 above the current highest bid or start price).
3. Reserve Price: Certain auctions specify a reserve price. If the auction closes without meeting the reserve price, the seller is not legally bound to transfer the vehicle.
4. Auto-Extension (Anti-Sniping): If a bid is received in the last 2 minutes before scheduled auction close, the auction timer extends automatically by 2 additional minutes to allow fair counter-bidding.
5. Bid Irrevocability: Once placed, bids cannot be retracted or deleted.
6. Winning & Escrow Payment: The highest bidder upon auction end is declared the winner. Payment must be initiated into the platform escrow within 48 hours.
7. Own Bid History: Bidders can view their full active and historical bids in their My Bids dashboard.`,
    metadata: { category: "bidding", section: "rules" },
  },
  {
    sourceId: "doc_hybrid_pricing_v4_1",
    sourceType: "pricing_engine",
    title: "AI Valuation and 80/20 Hybrid Pricing Engine Specification",
    permittedRoles: ["seller", "bank", "admin", "buyer"],
    content: `AI VEHICLE PRICING & HYBRID VALUATION FORMULA (v4.1):
1. Base ML Model: Uses an XGBoost Regressor trained on Indian used-car sales data (R² = 0.9487, MAPE = 13.88%). Evaluates vehicle age, brand, model, fuel type, transmission, engine CC, max power (bhp), and seat capacity.
2. Damage Adjustment: Vehicles undergo YOLOv8 automated visual damage inspection. A damage penalty percentage is calculated based on detected defects.
3. The Single Source of Truth Formula:
   Final Valuation = (XGBoost Base ML Price * 0.80) + (Damage-Adjusted Price * 0.20)
4. Valuation Distinctions:
   - ML Baseline Price: Pure market expectation assuming standard cosmetic condition.
   - Damage-Adjusted Price: The price reflecting physical damage penalties.
   - Final Hybrid Valuation: The balanced institutional appraisal recommendation.
   - Starting / Reserve Price: Set by the seller/bank, usually anchored around or slightly below the AI final valuation to stimulate bidding activity.
5. Depreciation Rates by Segment: A-Segment (20% yr 1, 13% after), B-Segment (17% yr 1, 11% after), C-Segment (16% yr 1, 10% after), Luxury (25% yr 1, 15% after).`,
    metadata: { category: "pricing", section: "methodology" },
  },
  {
    sourceId: "doc_damage_detection_v1",
    sourceType: "damage_inspection",
    title: "YOLOv8 Computer Vision Damage Detection Guidelines",
    permittedRoles: ["seller", "bank", "admin", "buyer"],
    content: `COMPUTER VISION DAMAGE DETECTION SPECIFICATIONS:
1. Inspection Model: Ultralytics YOLOv8s object detection running on dedicated microservice port 5002.
2. Six Damage Classes Detected:
   - 'dent' (Structural concern - 8% baseline penalty per detection)
   - 'crack' (Structural/Safety critical - 12% baseline penalty per detection)
   - 'scratch' (Cosmetic flaw - 3% baseline penalty per detection)
   - 'glass shatter' (Safety critical - 15% baseline penalty per detection)
   - 'lamp broken' (Functional safety - 10% baseline penalty per detection)
   - 'tire flat' (Functional wear - 5% baseline penalty per detection)
3. Diminishing Returns & Penalty Cap: Total damage penalty is capped at a maximum of 50% discount. Multiple defects (>5) apply an additional 1.2x multiplier before capping.
4. Image Quality Pre-Checks: Minimum 5 images required; images must pass blur check (Laplacian variance > 50), minimum resolution (640x480), and brightness checks (30-240). Duplicate photos are rejected via perceptual hashing.
5. Disclaimer: Visual damage detection highlights visible exterior and body defects from submitted photos. It does not certify hidden mechanical, transmission, or internal engine conditions.`,
    metadata: { category: "inspection", section: "computer_vision" },
  },
  {
    sourceId: "doc_institution_listing_sop_v1",
    sourceType: "institution_policy",
    title: "Institutional Seller & Bank Vehicle Listing SOP",
    permittedRoles: ["seller", "bank", "admin"],
    content: `BANK & INSTITUTIONAL SELLER LISTING WORKFLOW:
1. Registration & Authorization: Financial institutions, recovery agencies, and commercial sellers must maintain verified seller credentials.
2. Mandatory Asset Documentation:
   - Registration Certificate (RC) copy or digital RTO verification.
   - Form 35 / Loan Hypothecation Termination (if liquidated asset).
   - Minimum 5 vehicle exterior photos (Front, Rear, Left, Right, Interior/Odometer).
3. Pre-Listing Validation: The portal automated pipeline verifies image clarity, triggers YOLOv8 damage inspection, and executes the XGBoost valuation engine before auction creation.
4. Reserve Pricing Guidelines: Banks are advised to set reserve prices between 85% and 95% of the AI Final Hybrid Valuation to ensure high liquidation clearance rates.
5. Human Confirmation Requirement: The AI assistant may prepare auction drafts, condition summaries, and description copy, but institutional managers must explicitly review and submit listings via the portal dashboard.`,
    metadata: { category: "institutional", section: "sop" },
  },
  {
    sourceId: "doc_admin_anomaly_review_v1",
    sourceType: "admin_guide",
    title: "Platform Administration & Bidding Anomaly Review Policy",
    permittedRoles: ["admin"],
    content: `ADMINISTRATIVE SURVEILLANCE & ANOMALY REVIEW PROTOCOLS:
1. Bidding Concentration Thresholds:
   - Single Bidder Dominance: If one user places more than 60% of all bids on a single vehicle with fewer than 3 unique bidders, the auction is flagged for supervisory review.
   - Rapid Bid Frequency: Bids placed within less than 2 seconds by the same user account are reviewed for bot assistance.
2. Human Review Standard: Anomaly signals represent flags for operational review, NEVER definitive proof of collusion or misconduct. Administrative staff must verify user IP records, KYC status, and payment authorization before taking any account actions.
3. Verification Queue: Newly uploaded vehicles from unverified sellers require admin review if image blur scores fail or automated damage exceeds 40% severity.
4. System Security & Access Policy: Administrative credentials, secrets, and raw database tokens are strictly prohibited from exposure in conversational interfaces.`,
    metadata: { category: "administration", section: "policies" },
  },
];

/**
 * Ingest or refresh canonical platform documents
 */
async function ingestPlatformDocuments() {
  console.log("📚 [Ingestion] Ingesting canonical platform knowledge documents...");
  let count = 0;

  for (const doc of PLATFORM_DOCUMENTS) {
    const embedding = await generateEmbedding(`${doc.title}\n${doc.content}`);
    await upsertChunk({
      title: doc.title,
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      chunkIndex: 0,
      content: doc.content,
      permittedRoles: doc.permittedRoles,
      sellerId: null,
      metadata: doc.metadata,
      embedding,
      tokenCount: Math.round(doc.content.length / 4),
    });
    count++;
  }

  console.log(`✅ [Ingestion] Successfully ingested ${count} platform documents.`);
  return count;
}

/**
 * Ingest vehicles into knowledge chunks with rich technical specifications
 */
async function ingestVehicleCatalog(limit = 50) {
  console.log(`🚗 [Ingestion] Ingesting vehicle catalog (up to ${limit} vehicles)...`);
  const vehicles = await Vehicle.find({}).limit(limit).lean();
  let count = 0;

  for (const v of vehicles) {
    const title = `${v.year || ""} ${v.brand} ${v.model} — Specifications & AI Valuation`;
    const dmgSummary = v.damage_summary?.severity_level || (v.damages?.length > 0 ? "Damaged" : "Clean");
    const damagesDetected = v.damages?.map((d) => `${d.type} (${d.severity || "minor"})`).join(", ") || "None";
    
    const content = `VEHICLE RECORD: ${v.year || ""} ${v.brand} ${v.model}
- Technical Specs: ${v.transmission || "Manual"} transmission, ${v.fuel || "Petrol"} engine (${v.engine || 1200} cc, ${v.max_power || 90} bhp), ${v.seats || 5} seats.
- Mileage & Usage: ${v.mileage ? v.mileage.toLocaleString("en-IN") + " km" : "Low km"}, registered in ${v.location || "India"}, ${v.ownerType || "1st Owner"}.
- Visual Damage Assessment: ${v.damages?.length || 0} issues detected (${damagesDetected}). Condition Category: ${v.condition || "Good"} (Condition Score: ${v.conditionScore || 80}/100).
- Pricing Breakdown:
  • XGBoost Base ML Price: ₹${Number(v.xgboost_base_price || v.price).toLocaleString("en-IN")}
  • Damage-Adjusted Price: ₹${Number(v.damage_adjusted_price || v.price * 0.9).toLocaleString("en-IN")} (Penalty: ${v.damage_penalty_percent || 0}%)
  • Final AI Hybrid Valuation: ₹${Number(v.final_valuation || v.price).toLocaleString("en-IN")}
  • Current Listed Price: ₹${Number(v.price || 0).toLocaleString("en-IN")}
- AI Inspection Summary: ${v.aiSummary || "Vehicle verified for auction listing."}`;

    const embedding = await generateEmbedding(`${title}\n${content}`);

    await upsertChunk({
      title,
      sourceType: "vehicle",
      sourceId: String(v._id),
      chunkIndex: 0,
      content,
      permittedRoles: ["buyer", "seller", "bank", "admin"],
      sellerId: v.sellerId || null,
      metadata: {
        vehicleId: String(v._id),
        brand: v.brand,
        model: v.model,
        year: v.year,
        price: v.price,
      },
      embedding,
      tokenCount: Math.round(content.length / 4),
    });
    count++;
  }

  console.log(`✅ [Ingestion] Successfully indexed ${count} vehicles into vector store.`);
  return count;
}

/**
 * Execute full ingestion workflow
 */
async function runFullIngestion() {
  const docCount = await ingestPlatformDocuments();
  const vehicleCount = await ingestVehicleCatalog(50);
  const totalChunks = await KnowledgeChunk.countDocuments();
  return {
    success: true,
    platformDocsIngested: docCount,
    vehiclesIngested: vehicleCount,
    totalIndexedChunks: totalChunks,
  };
}

module.exports = {
  ingestPlatformDocuments,
  ingestVehicleCatalog,
  runFullIngestion,
  PLATFORM_DOCUMENTS,
};
