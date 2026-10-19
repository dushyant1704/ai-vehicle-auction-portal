/**
 * ═══════════════════════════════════════════════════════════════════
 * COMPREHENSIVE VALUATION AUDIT - DIAGNOSTIC TOOL
 * 
 * Purpose: Trace the COMPLETE valuation pipeline with detailed logging
 * Test Case: Hyundai i10 2010, 63000 km, ₹631,000 original price
 * ═══════════════════════════════════════════════════════════════════
 */

const { calculateVehiclePricing } = require("./utils/unifiedPricingEngine");
const { sanitizeCarData } = require("./utils/dataPreprocessor");

console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║       VALUATION PIPELINE AUDIT - HYUNDAI i10 2010            ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

// ═══════════════════════════════════════════════════════════════════
// TEST CASE 1: Hyundai i10 2010 — User Reported Bug
// ═══════════════════════════════════════════════════════════════════

const testCase = {
  brand: "Hyundai",
  model: "i10",
  year: 2010,
  mileage: 63000,
  fuel: "Petrol",
  transmission: "Manual",
  engine: 1100,
  max_power: 65,
  seats: 5,
  original_price: 631000,
  condition: "good",
};

console.log("┌─ RAW INPUT ───────────────────────────────────────────────────┐");
console.log(JSON.stringify(testCase, null, 2));
console.log("└───────────────────────────────────────────────────────────────┘\n");

// ─── STEP 1: Data Preprocessing ───────────────────────────────────
console.log("┌─ STEP 1: DATA PREPROCESSING ──────────────────────────────────┐");
const sanitized = sanitizeCarData(testCase);
console.log("└───────────────────────────────────────────────────────────────┘\n");

// ─── STEP 2: Calculate Age ────────────────────────────────────────
const currentYear = new Date().getFullYear();
const vehicleAge = currentYear - testCase.year;
console.log("┌─ STEP 2: AGE CALCULATION ─────────────────────────────────────┐");
console.log(`Current Year:    ${currentYear}`);
console.log(`Vehicle Year:    ${testCase.year}`);
console.log(`Vehicle Age:     ${vehicleAge} years`);
console.log("└───────────────────────────────────────────────────────────────┘\n");

// ─── STEP 3: ML Prediction (Simulated) ────────────────────────────
const mlPredictedPrice = 197010; // From user's example
console.log("┌─ STEP 3: ML PREDICTION (SIMULATED) ───────────────────────────┐");
console.log(`ML Predicted Price:  ₹${mlPredictedPrice.toLocaleString("en-IN")}`);
console.log("└───────────────────────────────────────────────────────────────┘\n");

// ─── STEP 4: Unified Pricing Engine ───────────────────────────────
console.log("┌─ STEP 4: UNIFIED PRICING ENGINE ──────────────────────────────┐");
const pricing = calculateVehiclePricing({
  brand: testCase.brand,
  model: testCase.model,
  vehicle_age: vehicleAge,
  year: testCase.year,
  mileage: testCase.mileage,
  mlPredictedPrice: mlPredictedPrice,
  original_price: testCase.original_price,
  segment: null, // Let it auto-detect
  condition: testCase.condition,
});

console.log("\n📊 COMPLETE PRICING BREAKDOWN:");
console.log("─────────────────────────────────────────────────────────────");

// Primary Values
console.log("\n🎯 PRIMARY VALUES:");
console.log(`  Market Price (AI):      ₹${pricing.market_price.toLocaleString("en-IN")}`);
console.log(`  Original/Ex-Showroom:   ₹${pricing.original_price.toLocaleString("en-IN")}`);
console.log(`  Base Depreciated Value: ₹${pricing.base_value.toLocaleString("en-IN")}`);
console.log(`  ML Prediction Input:    ₹${pricing.ml_price.toLocaleString("en-IN")}`);

// Derived Valuations
console.log("\n💰 DERIVED VALUATIONS:");
console.log(`  Insurance Value (IDV):  ₹${pricing.insurance_value.toLocaleString("en-IN")}`);
console.log(`  Residual Value:         ₹${pricing.residual_value.toLocaleString("en-IN")}`);
console.log(`  Distress Sale Value:    ₹${pricing.distress_value.toLocaleString("en-IN")}`);
console.log(`  Salvage Value:          ₹${pricing.salvage_value.toLocaleString("en-IN")}`);

// Factors
console.log("\n⚙️  CALCULATION FACTORS:");
console.log(`  Segment:                ${pricing.segment}`);
console.log(`  Segment Weight:         ${pricing.segment_weight}x`);
console.log(`  Depreciation Factor:    ${pricing.depreciation_factor} (${(pricing.depreciation_factor * 100).toFixed(1)}%)`);
console.log(`  Depreciation Rate:      ${(pricing.depreciation_rate * 100).toFixed(1)}% per year`);
console.log(`  Mileage Factor:         ${pricing.mileage_factor}x`);
console.log(`  Condition:              ${pricing.condition}`);
console.log(`  Condition Factor:       ${pricing.condition_factor}x`);
console.log(`  Price Source:           ${pricing.price_source}`);

// Debug Details
console.log("\n🔍 DEBUG DETAILS:");
console.log(`  Vehicle Age:            ${vehicleAge} years`);
console.log(`  Structured Price:       ₹${pricing.debug.structured_price.toLocaleString("en-IN")}`);
console.log(`  Structured (70%):       ₹${pricing.debug.structured_contribution.toLocaleString("en-IN")}`);
console.log(`  ML Signal (30%):        ₹${pricing.debug.ml_contribution.toLocaleString("en-IN")}`);

console.log("\n└───────────────────────────────────────────────────────────────┘\n");

// ═══════════════════════════════════════════════════════════════════
// STEP 5: MANUAL VERIFICATION OF CALCULATIONS
// ═══════════════════════════════════════════════════════════════════

console.log("┌─ STEP 5: MANUAL CALCULATION VERIFICATION ─────────────────────┐");

// Expected depreciation for 16-year-old Hyundai (B2-Segment)
const segment = "B2-Segment";
const firstYearDep = 0.17;
const subsequentDep = 0.11;

console.log(`\nDEPRECIATION CALCULATION (${segment}):`);
console.log(`  First year depreciation:    ${(firstYearDep * 100).toFixed(0)}%`);
console.log(`  Subsequent depreciation:    ${(subsequentDep * 100).toFixed(0)}% per year`);

let manualDepFactor = 1 - firstYearDep; // Year 1
console.log(`  After Year 1:               ${(manualDepFactor * 100).toFixed(2)}%`);

for (let i = 1; i < vehicleAge; i++) {
  manualDepFactor *= (1 - subsequentDep);
  console.log(`  After Year ${i + 1}:                ${(manualDepFactor * 100).toFixed(2)}%`);
}

const manualBaseValue = testCase.original_price * manualDepFactor;
console.log(`\n  Manual Base Value:          ₹${Math.round(manualBaseValue).toLocaleString("en-IN")}`);
console.log(`  System Base Value:          ₹${pricing.base_value.toLocaleString("en-IN")}`);
console.log(`  Match:                      ${Math.abs(Math.round(manualBaseValue) - pricing.base_value) < 10 ? "✅ YES" : "❌ NO"}`);

// Mileage Factor
const mileage = testCase.mileage;
let expectedMileageFactor = 1.0;
if (mileage > 150000) expectedMileageFactor = 0.72;
else if (mileage > 100000) expectedMileageFactor = 0.82;
else if (mileage > 60000) expectedMileageFactor = 0.90;
else if (mileage > 30000) expectedMileageFactor = 0.95;

console.log(`\nMILEAGE ADJUSTMENT (${mileage.toLocaleString("en-IN")} km):`);
console.log(`  Expected Factor:            ${expectedMileageFactor}x`);
console.log(`  System Factor:              ${pricing.mileage_factor}x`);
console.log(`  Match:                      ${pricing.mileage_factor === expectedMileageFactor ? "✅ YES" : "❌ NO"}`);

// Condition Factor
const conditionFactor = 0.9; // good = 0.9
console.log(`\nCONDITION ADJUSTMENT (${testCase.condition}):`);
console.log(`  Expected Factor:            ${conditionFactor}x`);
console.log(`  System Factor:              ${pricing.condition_factor}x`);
console.log(`  Match:                      ${pricing.condition_factor === conditionFactor ? "✅ YES" : "❌ NO"}`);

// Segment Weight
const segmentWeight = 1.0; // B2-Segment = 1.0
console.log(`\nSEGMENT WEIGHT (${segment}):`);
console.log(`  Expected Weight:            ${segmentWeight}x`);
console.log(`  System Weight:              ${pricing.segment_weight}x`);
console.log(`  Match:                      ${pricing.segment_weight === segmentWeight ? "✅ YES" : "❌ NO"}`);

// Final Hybrid Calculation
const manualStructuredPrice = manualBaseValue * segmentWeight * expectedMileageFactor * conditionFactor;
const manualHybridPrice = manualStructuredPrice * 0.7 + mlPredictedPrice * 0.3;

console.log(`\nFINAL HYBRID PRICE CALCULATION:`);
console.log(`  Structured Price:           ₹${Math.round(manualStructuredPrice).toLocaleString("en-IN")}`);
console.log(`  Structured (70%):           ₹${Math.round(manualStructuredPrice * 0.7).toLocaleString("en-IN")}`);
console.log(`  ML Signal (30%):            ₹${Math.round(mlPredictedPrice * 0.3).toLocaleString("en-IN")}`);
console.log(`  Manual Hybrid Price:        ₹${Math.round(manualHybridPrice).toLocaleString("en-IN")}`);
console.log(`  System Hybrid Price:        ₹${pricing.market_price.toLocaleString("en-IN")}`);
console.log(`  Match:                      ${Math.abs(Math.round(manualHybridPrice) - pricing.market_price) < 10 ? "✅ YES" : "❌ NO"}`);

console.log("\n└───────────────────────────────────────────────────────────────┘\n");

// ═══════════════════════════════════════════════════════════════════
// STEP 6: BUG DETECTION
// ═══════════════════════════════════════════════════════════════════

console.log("┌─ STEP 6: BUG DETECTION ───────────────────────────────────────┐");

const bugs = [];

// Check 1: Original price suspiciously low
if (pricing.original_price < testCase.original_price * 0.2) {
  bugs.push({
    type: "CRITICAL",
    issue: "Original price calculation error",
    expected: testCase.original_price,
    actual: pricing.original_price,
    description: "Original price is being incorrectly reduced"
  });
}

// Check 2: Base value equals original price (no depreciation applied)
if (Math.abs(pricing.base_value - pricing.original_price) < 1000) {
  bugs.push({
    type: "WARNING",
    issue: "No depreciation applied",
    description: "Base value equals original price despite vehicle age"
  });
}

// Check 3: Market price lower than ML prediction when it should be higher
if (pricing.market_price < mlPredictedPrice * 0.5) {
  bugs.push({
    type: "WARNING",
    issue: "Market price suspiciously low",
    ml: mlPredictedPrice,
    market: pricing.market_price,
    description: "Market price is less than 50% of ML prediction"
  });
}

// Check 4: Unit conversion issues (631000 → 6310 or 91192)
if (pricing.original_price.toString().length < testCase.original_price.toString().length - 1) {
  bugs.push({
    type: "CRITICAL",
    issue: "Unit conversion error detected",
    description: "Original price appears to have lost digits (₹631,000 → ₹" + pricing.original_price + ")"
  });
}

// Check 5: Logical inconsistencies
if (pricing.insurance_value > pricing.market_price) {
  bugs.push({
    type: "ERROR",
    issue: "Insurance value exceeds market price",
    description: "Insurance value should be ≤ market price"
  });
}

if (pricing.residual_value > pricing.market_price) {
  bugs.push({
    type: "ERROR",
    issue: "Residual value exceeds market price",
    description: "Future value cannot exceed current value"
  });
}

// Display bugs
if (bugs.length === 0) {
  console.log("\n✅ NO BUGS DETECTED - All calculations appear correct\n");
} else {
  console.log(`\n🚨 ${bugs.length} BUG(S) DETECTED:\n`);
  bugs.forEach((bug, idx) => {
    console.log(`${idx + 1}. [${bug.type}] ${bug.issue}`);
    console.log(`   ${bug.description}`);
    if (bug.expected) console.log(`   Expected: ₹${bug.expected.toLocaleString("en-IN")}`);
    if (bug.actual) console.log(`   Actual:   ₹${bug.actual.toLocaleString("en-IN")}`);
    if (bug.ml) console.log(`   ML:       ₹${bug.ml.toLocaleString("en-IN")}`);
    if (bug.market) console.log(`   Market:   ₹${bug.market.toLocaleString("en-IN")}`);
    console.log("");
  });
}

console.log("└───────────────────────────────────────────────────────────────┘\n");

// ═══════════════════════════════════════════════════════════════════
// STEP 7: USER REPORTED VALUES COMPARISON
// ═══════════════════════════════════════════════════════════════════

console.log("┌─ STEP 7: USER REPORTED VALUES COMPARISON ─────────────────────┐");

const userReported = {
  exShowroomPrice: 91192,
  depreciatedBaseValue: 91192,
  mlPrediction: 197010,
  finalHybridPrice: 110809,
};

console.log("\nUSER REPORTED VALUES:");
console.log(`  Ex-Showroom Price:      ₹${userReported.exShowroomPrice.toLocaleString("en-IN")}`);
console.log(`  Depreciated Base:       ₹${userReported.depreciatedBaseValue.toLocaleString("en-IN")}`);
console.log(`  ML Prediction:          ₹${userReported.mlPrediction.toLocaleString("en-IN")}`);
console.log(`  Final Hybrid Price:     ₹${userReported.finalHybridPrice.toLocaleString("en-IN")}`);

console.log("\nSYSTEM CALCULATED VALUES:");
console.log(`  Ex-Showroom Price:      ₹${pricing.original_price.toLocaleString("en-IN")}`);
console.log(`  Depreciated Base:       ₹${pricing.base_value.toLocaleString("en-IN")}`);
console.log(`  ML Prediction:          ₹${pricing.ml_price.toLocaleString("en-IN")}`);
console.log(`  Final Hybrid Price:     ₹${pricing.market_price.toLocaleString("en-IN")}`);

console.log("\nDISCREPANCY ANALYSIS:");
const discrepancies = [
  {
    field: "Ex-Showroom Price",
    user: userReported.exShowroomPrice,
    system: pricing.original_price,
    diff: pricing.original_price - userReported.exShowroomPrice,
  },
  {
    field: "Depreciated Base",
    user: userReported.depreciatedBaseValue,
    system: pricing.base_value,
    diff: pricing.base_value - userReported.depreciatedBaseValue,
  },
  {
    field: "Final Hybrid",
    user: userReported.finalHybridPrice,
    system: pricing.market_price,
    diff: pricing.market_price - userReported.finalHybridPrice,
  },
];

discrepancies.forEach(d => {
  const pctDiff = ((d.diff / d.user) * 100).toFixed(1);
  console.log(`  ${d.field.padEnd(20)} Diff: ₹${d.diff.toLocaleString("en-IN").padStart(10)} (${pctDiff}%)`);
});

console.log("\n└───────────────────────────────────────────────────────────────┘\n");

console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║                    AUDIT COMPLETE                             ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");
