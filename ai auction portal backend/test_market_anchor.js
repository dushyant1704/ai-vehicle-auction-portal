#!/usr/bin/env node
/**
 * 🧪 MARKET ANCHORING TEST SUITE
 *
 * Tests that verify:
 * 1. Market baseline pricing works correctly
 * 2. Price blending formula (60% baseline + 40% AI)
 * 3. Deviation control keeps prices within ±30% bounds
 * 4. Similar cars get similar prices (stability)
 * 5. Age and mileage adjustments work properly
 *
 * Run with: node test_market_anchor.js
 */

const {
  calculateStableMarketPrice,
  getMarketBaseline,
  applyAgeDepreciation,
  applyMileageAdjustment,
  blendPrices,
  controlDeviation,
  getPriceStabilityStats,
  CONFIG,
} = require("./utils/marketBaseline");

// ═══════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  console.log(`\n📝 Test ${testCount}: ${name}`);
  console.log("─".repeat(70));
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

function assertEqual(actual, expected, tolerance = 0, message = "") {
  const diff = Math.abs(actual - expected);
  if (tolerance === 0 && actual !== expected) {
    throw new Error(`${message} (got ${actual}, expected ${expected})`);
  } else if (tolerance > 0 && diff > tolerance) {
    throw new Error(
      `${message} (got ${actual}, expected ≈${expected}, tolerance ${tolerance})`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(70));
console.log("🧪 MARKET ANCHORING TEST SUITE");
console.log("═".repeat(70));

// ─────────────────────────────────────────────────────────────────
// MARKET BASELINE TESTS
// ─────────────────────────────────────────────────────────────────

test("Market baseline: Maruti Swift", () => {
  const baseline = getMarketBaseline("maruti", "swift");
  assert(baseline === 600000, `Expected 600000, got ${baseline}`);
});

test("Market baseline: Honda City", () => {
  const baseline = getMarketBaseline("honda", "city");
  assert(baseline === 850000, `Expected 850000, got ${baseline}`);
});

test("Market baseline: Unknown model → default", () => {
  const baseline = getMarketBaseline("unknown", "model");
  assert(baseline === 750000, `Should return default 750000, got ${baseline}`);
});

// ─────────────────────────────────────────────────────────────────
// AGE DEPRECIATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Age depreciation: 0 years → 100% of baseline", () => {
  const baseline = 800000;
  const adjusted = applyAgeDepreciation(baseline, 0);
  assertEqual(adjusted, baseline, 1000, "0 years should retain 100%");
});

test("Age depreciation: 1 year → 90% of baseline", () => {
  const baseline = 800000;
  const adjusted = applyAgeDepreciation(baseline, 1);
  const expected = baseline * 0.9; // 720000
  assertEqual(adjusted, expected, 1000, "1 year should be 90% of baseline");
});

test("Age depreciation: 3 years → ~72.9% of baseline", () => {
  const baseline = 800000;
  const adjusted = applyAgeDepreciation(baseline, 3);
  const expected = baseline * Math.pow(0.9, 3); // ~583200
  assertEqual(adjusted, expected, 1000, "3 years should depreciate compound");
});

// ─────────────────────────────────────────────────────────────────
// MILEAGE ADJUSTMENT TESTS
// ─────────────────────────────────────────────────────────────────

test("Mileage adjustment: 0 km → 100% of price", () => {
  const price = 800000;
  const adjusted = applyMileageAdjustment(price, 0);
  assertEqual(adjusted, price, 1000, "0 km should have no discount");
});

test("Mileage adjustment: 100k km → 50% of price", () => {
  const price = 800000;
  const adjusted = applyMileageAdjustment(price, 100000);
  const expected = price * (1.0 - 100000 / 200000); // 50%
  assertEqual(adjusted, expected, 1000, "100k km should be 50%");
});

test("Mileage adjustment: 200k km → 50% of price (floor)", () => {
  const price = 800000;
  const adjusted = applyMileageAdjustment(price, 200000);
  const expected = price * 0.5;
  assertEqual(adjusted, expected, 1000, "200k km should be 50% (floor)");
});

test("Mileage adjustment: 300k km → 50% of price (clamped)", () => {
  const price = 800000;
  const adjusted = applyMileageAdjustment(price, 300000);
  const expected = price * 0.5; // Clamped at 50%
  assertEqual(adjusted, expected, 1000, "300k km should be clamped at 50%");
});

// ─────────────────────────────────────────────────────────────────
// PRICE BLENDING TESTS
// ─────────────────────────────────────────────────────────────────

test("Price blending: 60% baseline + 40% AI", () => {
  const baseline = 800000;
  const aiPrice = 700000;
  const blended = blendPrices(aiPrice, baseline);
  const expected = 0.6 * baseline + 0.4 * aiPrice; // 0.6*800k + 0.4*700k = 760k
  assertEqual(blended, expected, 1000, "Blending formula incorrect");
});

test("Price blending: When AI > baseline", () => {
  const baseline = 700000;
  const aiPrice = 900000;
  const blended = blendPrices(aiPrice, baseline);
  const expected = 0.6 * baseline + 0.4 * aiPrice; // 0.6*700k + 0.4*900k = 780k
  assertEqual(blended, expected, 1000, "Blending should work both ways");
});

// ─────────────────────────────────────────────────────────────────
// DEVIATION CONTROL TESTS
// ─────────────────────────────────────────────────────────────────

test("Deviation control: Price within bounds (70%-130%)", () => {
  const baseline = 800000;
  const price = 850000; // Within bounds
  const controlled = controlDeviation(price, baseline);
  assertEqual(controlled, price, 1000, "Price within bounds should not change");
});

test("Deviation control: Price below 70% → clamped to lower bound", () => {
  const baseline = 800000;
  const price = 500000; // Below 70%
  const controlled = controlDeviation(price, baseline);
  const expected = baseline * 0.7; // 560000
  assertEqual(controlled, expected, 1000, "Price below 70% should clamp");
});

test("Deviation control: Price above 130% → clamped to upper bound", () => {
  const baseline = 800000;
  const price = 1200000; // Above 130%
  const controlled = controlDeviation(price, baseline);
  const expected = baseline * 1.3; // 1040000
  assertEqual(controlled, expected, 1000, "Price above 130% should clamp");
});

// ─────────────────────────────────────────────────────────────────
// FULL CALCULATION TESTS
// ─────────────────────────────────────────────────────────────────

test("Full stable market price: Normal case (Maruti Swift)", () => {
  const vehicle = {
    brand: "maruti",
    model: "swift",
    year: 2022,
    mileage: 50000,
    price: 700000,
  };
  const aiPrice = 680000;

  const result = calculateStableMarketPrice(vehicle, aiPrice);

  assert(result.finalPrice > 0, "Final price should be positive");
  assert(
    result.finalPrice >= CONFIG.PRICE_MIN,
    `Final price should be >= ₹${CONFIG.PRICE_MIN}`,
  );
  assert(
    result.finalPrice <= CONFIG.PRICE_MAX,
    `Final price should be <= ₹${CONFIG.PRICE_MAX}`,
  );
  assert(result.breakdown, "Should have price breakdown");
});

test("Full stable market price: Extreme AI prediction (too high)", () => {
  const vehicle = {
    brand: "maruti",
    model: "swift",
    year: 2022,
    mileage: 50000,
    price: 700000,
  };
  const aiPrice = 1200000; // Way too high!

  const result = calculateStableMarketPrice(vehicle, aiPrice);

  // Should be clamped to baseline * 1.3 = 600k * 1.3 = 780k
  assert(
    result.finalPrice < aiPrice,
    "Stable price should be less than extreme AI prediction",
  );
  assert(
    result.finalPrice <= 600000 * 1.3,
    "Should respect deviation control (±30%)",
  );
});

test("Full stable market price: Extreme AI prediction (too low)", () => {
  const vehicle = {
    brand: "maruti",
    model: "swift",
    year: 2022,
    mileage: 50000,
    price: 700000,
  };
  const aiPrice = 300000; // Way too low!

  const result = calculateStableMarketPrice(vehicle, aiPrice);

  // Should be clamped to baseline * 0.7 = 600k * 0.7 = 420k
  assert(
    result.finalPrice > aiPrice,
    "Stable price should be higher than extreme low AI prediction",
  );
  assert(
    result.finalPrice >= 600000 * 0.7,
    "Should respect deviation control (±30%)",
  );
});

// ─────────────────────────────────────────────────────────────────
// PRICE STABILITY TESTS
// ─────────────────────────────────────────────────────────────────

test("Price stability: Similar cars get similar prices", () => {
  // Create multiple Maruti Swifts with slight variations
  const vehicles = [];

  for (let i = 0; i < 5; i++) {
    const vehicle = {
      brand: "maruti",
      model: "swift",
      year: 2022 - i, // Different years
      mileage: 30000 + i * 10000, // Different mileages
      price: 700000 - i * 50000,
    };
    const aiPrice = 680000 - i * 60000; // Varying AI predictions

    const result = calculateStableMarketPrice(vehicle, aiPrice);
    vehicles.push(result);
  }

  const stats = getPriceStabilityStats(vehicles);
  console.log(
    `        Price range: ₹${stats.minPrice.toLocaleString()} - ₹${stats.maxPrice.toLocaleString()}`,
  );
  console.log(`        Range variation: ${stats.rangePercent}%`);
  console.log(`        Stability: ${stats.stability}`);

  assert(
    stats.rangePercent < 30,
    `Price variation should be < 30%, got ${stats.rangePercent}%`,
  );
});

test("Price stability: Different models get appropriately different prices", () => {
  // Swift (cheaper model)
  const swift = calculateStableMarketPrice(
    {
      brand: "maruti",
      model: "swift",
      year: 2022,
      mileage: 50000,
    },
    650000,
  );

  // Honda City (more expensive model)
  const city = calculateStableMarketPrice(
    {
      brand: "honda",
      model: "city",
      year: 2022,
      mileage: 50000,
    },
    750000,
  );

  console.log(`        Maruti Swift: ₹${swift.finalPrice.toLocaleString()}`);
  console.log(`        Honda City: ₹${city.finalPrice.toLocaleString()}`);

  assert(
    city.finalPrice > swift.finalPrice,
    "More expensive model should have higher price",
  );
  assert(
    city.finalPrice - swift.finalPrice > 50000,
    "Price difference should reflect model difference",
  );
});

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(70));
console.log("📊 TEST RESULTS");
console.log("═".repeat(70));
console.log(`Total Tests:  ${testCount}`);
console.log(`✅ Passed:    ${passCount}`);
console.log(`❌ Failed:    ${failCount}`);
console.log("═".repeat(70));

if (failCount === 0) {
  console.log(
    "\n🎉 ALL TESTS PASSED! Market anchoring system is working correctly.\n",
  );
  process.exit(0);
} else {
  console.log(
    `\n⚠️ ${failCount} tests failed. Please check the implementation.\n`,
  );
  process.exit(1);
}
