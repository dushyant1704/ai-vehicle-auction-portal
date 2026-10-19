#!/usr/bin/env node
/**
 * 🧪 QUICK TEST SUITE FOR DATA PREPROCESSOR
 *
 * Run with: node test_preprocessor.js
 *
 * Tests all sanitization scenarios to verify the fix is working
 */

const {
  sanitizeCarData,
  sanitizeMileage,
  sanitizeYear,
  sanitizePrice,
  sanitizeCondition,
  isValidModelInput,
  CONSTRAINTS,
} = require("./utils/dataPreprocessor");

const {
  calculateRealisticAIPrice,
  calculateDerivedMetrics,
} = require("./utils/realisticPricingEngine");

// ═══════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  console.log(`\n📝 Test ${testCount}: ${name}`);
  console.log("─".repeat(60));
  try {
    fn();
    console.log("✅ PASSED");
    passCount++;
  } catch (err) {
    console.error("❌ FAILED:", err.message);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (got ${actual}, expected ${expected})`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(60));
console.log("🧪 DATA PREPROCESSOR TEST SUITE");
console.log("═".repeat(60));

// ─────────────────────────────────────────────────────────────────
// MILEAGE SANITIZATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Extreme mileage: 3,800,000 km → 38,000 km", () => {
  const result = sanitizeMileage(3800000);
  assert(result === 38000, `Expected 38000, got ${result}`);
});

test("Extreme mileage: 123,000,000 km → divided", () => {
  const result = sanitizeMileage(123000000);
  assert(result <= CONSTRAINTS.MILEAGE.MAX, "Should be within max constraint");
});

test("Normal mileage: 45,000 km → unchanged", () => {
  const result = sanitizeMileage(45000);
  assertEqual(result, 45000, "Normal mileage should pass through");
});

test("Negative mileage: -25,000 → 0", () => {
  const result = sanitizeMileage(-25000);
  assertEqual(result, 0, "Negative mileage should become 0");
});

test("Null/undefined mileage → 0", () => {
  const result1 = sanitizeMileage(null);
  const result2 = sanitizeMileage(undefined);
  assertEqual(result1, 0, "Null mileage should become 0");
  assertEqual(result2, 0, "Undefined mileage should become 0");
});

test("Zero mileage → 0", () => {
  const result = sanitizeMileage(0);
  assertEqual(result, 0, "Zero should remain zero");
});

// ─────────────────────────────────────────────────────────────────
// YEAR SANITIZATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Too old year: 1975 → 1990", () => {
  const result = sanitizeYear(1975);
  assertEqual(result, 1990, "Year too old should become 1990");
});

test("Valid year: 2022 → 2022", () => {
  const result = sanitizeYear(2022);
  assertEqual(result, 2022, "Valid year should pass through");
});

test("Future year → current year", () => {
  const result = sanitizeYear(2030);
  const currentYear = new Date().getFullYear();
  assertEqual(result, currentYear, "Future year should become current year");
});

test("Null/undefined year → current year", () => {
  const result1 = sanitizeYear(null);
  const result2 = sanitizeYear(undefined);
  const currentYear = new Date().getFullYear();
  assertEqual(result1, currentYear, "Null year should become current year");
  assertEqual(
    result2,
    currentYear,
    "Undefined year should become current year",
  );
});

// ─────────────────────────────────────────────────────────────────
// PRICE SANITIZATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Valid price: 950,000 → 950,000", () => {
  const result = sanitizePrice(950000);
  assertEqual(result, 950000, "Valid price should pass through");
});

test("Zero price → 0", () => {
  const result = sanitizePrice(0);
  assertEqual(result, 0, "Zero price should remain zero");
});

test("Negative price: -100,000 → 0", () => {
  const result = sanitizePrice(-100000);
  assertEqual(result, 0, "Negative price should become 0");
});

test("Null/undefined price → 0", () => {
  const result1 = sanitizePrice(null);
  const result2 = sanitizePrice(undefined);
  assertEqual(result1, 0, "Null price should become 0");
  assertEqual(result2, 0, "Undefined price should become 0");
});

// ─────────────────────────────────────────────────────────────────
// CONDITION SANITIZATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Valid condition: 'Good' → 'Good'", () => {
  const result = sanitizeCondition("Good");
  assertEqual(result, "Good", "Valid condition should pass through");
});

test("Valid condition: 'Excellent' → 'Excellent'", () => {
  const result = sanitizeCondition("Excellent");
  assertEqual(result, "Excellent", "Excellent condition should pass through");
});

test("Invalid condition: 'GARBAGE' → 'Good'", () => {
  const result = sanitizeCondition("GARBAGE");
  assertEqual(result, "Good", "Invalid condition should default to Good");
});

test("Null/undefined condition → 'Good'", () => {
  const result1 = sanitizeCondition(null);
  const result2 = sanitizeCondition(undefined);
  assertEqual(result1, "Good", "Null condition should default to Good");
  assertEqual(result2, "Good", "Undefined condition should default to Good");
});

// ─────────────────────────────────────────────────────────────────
// FULL DATA SANITIZATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Complete data with extreme mileage", () => {
  const input = {
    price: 950000,
    year: 2022,
    mileage: 3800000, // THE BUG!
    condition: "Good",
  };
  const result = sanitizeCarData(input);
  assert(
    result.mileage === 38000,
    `Mileage should be 38000, got ${result.mileage}`,
  );
  assertEqual(result.price, 950000, "Price should be unchanged");
  assertEqual(result.year, 2022, "Year should be unchanged");
  assertEqual(result.condition, "Good", "Condition should be unchanged");
});

test("Complete data with multiple issues", () => {
  const input = {
    price: 500000,
    year: 1980, // Too old
    mileage: -50000, // Negative
    condition: "JUNK", // Invalid
  };
  const result = sanitizeCarData(input);
  assertEqual(result.year, 1990, "Year should be corrected to 1990");
  assertEqual(result.mileage, 0, "Mileage should be corrected to 0");
  assertEqual(result.condition, "Good", "Condition should default to Good");
});

test("Complete data is valid for model input", () => {
  const input = {
    price: 850000,
    year: 2021,
    mileage: 75000,
    condition: "Good",
  };
  const cleaned = sanitizeCarData(input);
  assert(isValidModelInput(cleaned), "Cleaned data should be valid for model");
});

// ─────────────────────────────────────────────────────────────────
// PRICING CALCULATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Pricing with normal data", () => {
  const input = {
    price: 950000,
    year: 2022,
    mileage: 38000,
    condition: "Good",
  };
  const cleaned = sanitizeCarData(input);
  const result = calculateRealisticAIPrice(cleaned);

  assert(result.aiPrice > 0, "AI price should be positive");
  assert(result.aiPrice <= 950000, "AI price should not exceed listed price");
  assert(result.priceLabel, "Should have price label");
});

test("Pricing with extreme mileage (after cleaning)", () => {
  const input = {
    price: 950000,
    year: 2022,
    mileage: 3800000, // THE BUG - gets corrected
    condition: "Good",
  };
  const cleaned = sanitizeCarData(input);
  const result = calculateRealisticAIPrice(cleaned);

  // After cleaning, mileage should be 38,000
  // Price: 950k × 0.75 (depreciation) × 0.95 (mileage) × 0.92 (condition) = ~622k
  assert(result.aiPrice > 500000, `AI price too low: ${result.aiPrice}`);
  assert(result.aiPrice < 700000, `AI price too high: ${result.aiPrice}`);
});

test("Derived metrics calculation", () => {
  const aiPrice = 850000;
  const metrics = calculateDerivedMetrics(aiPrice);

  assert(metrics.marketPrice === aiPrice, "Market price should equal AI price");
  assert(metrics.insuranceValue > 0, "Insurance value should be positive");
  assert(metrics.residualValue > 0, "Residual value should be positive");
  assert(metrics.salvageValue > 0, "Salvage value should be positive");
});

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(60));
console.log("📊 TEST RESULTS");
console.log("═".repeat(60));
console.log(`Total Tests:  ${testCount}`);
console.log(`✅ Passed:    ${passCount}`);
console.log(`❌ Failed:    ${failCount}`);
console.log("═".repeat(60));

if (failCount === 0) {
  console.log(
    "\n🎉 ALL TESTS PASSED! Data preprocessor is working correctly.\n",
  );
  process.exit(0);
} else {
  console.log(
    `\n⚠️ ${failCount} tests failed. Please check the implementation.\n`,
  );
  process.exit(1);
}
