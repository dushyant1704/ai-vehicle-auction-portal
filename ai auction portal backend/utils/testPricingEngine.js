/**
 * ═══════════════════════════════════════════════════════════════════
 * PRICING ENGINE TEST FILE
 *
 * Run this to verify pricing calculations are correct
 * ═══════════════════════════════════════════════════════════════════
 */

const {
  calculateRealisticAIPrice,
  getDepreciationFactor,
  getMileageFactor,
  getConditionFactor,
} = require("./utils/realisticPricingEngine");

// Test Case 1: Recent car, low mileage, good condition
console.log("\n📋 TEST 1: Recent Car (2022 Creta)");
console.log("─".repeat(60));
const test1 = {
  price: 950000,
  year: 2022,
  mileage: 25000,
  condition: "Good",
};
const result1 = calculateRealisticAIPrice(test1);
console.log("Input:", test1);
console.log("Output:", result1);
console.log("Expected: aiPrice ~850-900k, label='Fair', gap ~10-15%");
console.log(
  result1.priceLabel === "Fair" && result1.priceGap > 5 && result1.priceGap < 20
    ? "✅ PASS"
    : "❌ FAIL",
);

// Test Case 2: Older car, high mileage, fair condition
console.log("\n📋 TEST 2: Older Car (2019 City)");
console.log("─".repeat(60));
const test2 = {
  price: 650000,
  year: 2019,
  mileage: 85000,
  condition: "Fair",
};
const result2 = calculateRealisticAIPrice(test2);
console.log("Input:", test2);
console.log("Output:", result2);
console.log("Expected: aiPrice ~390-450k, label='Overpriced', gap >15%");
console.log(
  result2.priceLabel === "Overpriced" && result2.priceGap > 15
    ? "✅ PASS"
    : "❌ FAIL",
);

// Test Case 3: Low mileage elderly car, excellent condition
console.log("\n📋 TEST 3: Elderly Well-Maintained Car (2018 Fortuner)");
console.log("─".repeat(60));
const test3 = {
  price: 2100000,
  year: 2018,
  mileage: 45000,
  condition: "Excellent",
};
const result3 = calculateRealisticAIPrice(test3);
console.log("Input:", test3);
console.log("Output:", result3);
console.log("Expected: aiPrice ~1.0-1.5M, label='Fair'/'Overpriced'");
console.log(result3.aiPrice > 1000000 ? "✅ PASS" : "❌ FAIL");

// Test Case 4: Very new car, minimal mileage, excellent
console.log("\n📋 TEST 4: Brand New Car (2024 Model)");
console.log("─".repeat(60));
const test4 = {
  price: 1200000,
  year: 2024,
  mileage: 5000,
  condition: "Excellent",
};
const result4 = calculateRealisticAIPrice(test4);
console.log("Input:", test4);
console.log("Output:", result4);
console.log("Expected: aiPrice ~1.0-1.1M, label='Good Deal', gap <5%");
console.log(
  result4.priceLabel === "Good Deal" && result4.priceGap < 10
    ? "✅ PASS"
    : "❌ FAIL",
);

// Test Case 5: Boundary test - very high mileage
console.log("\n📋 TEST 5: Very High Mileage (2015 Swift)");
console.log("─".repeat(60));
const test5 = {
  price: 500000,
  year: 2015,
  mileage: 250000,
  condition: "Fair",
};
const result5 = calculateRealisticAIPrice(test5);
console.log("Input:", test5);
console.log("Output:", result5);
console.log("Expected: aiPrice at/near 60% minimum (300k)");
console.log(
  result5.aiPrice >= 500000 * 0.6 && result5.aiPrice <= 500000 * 0.9
    ? "✅ PASS"
    : "❌ FAIL",
);

// Verify individual factors
console.log("\n📋 FACTOR VERIFICATION");
console.log("─".repeat(60));
console.log("Depreciation Factors:");
console.log(`  1 year:  ${getDepreciationFactor(2023)} (expect ~0.90)`);
console.log(`  5 years: ${getDepreciationFactor(2019)} (expect ~0.75)`);
console.log(`  10 years: ${getDepreciationFactor(2014)} (expect ~0.45)`);

console.log("\nMileage Factors:");
console.log(`  10k km:  ${getMileageFactor(10000)} (expect 1.0)`);
console.log(`  50k km:  ${getMileageFactor(50000)} (expect ~0.95)`);
console.log(`  150k km: ${getMileageFactor(150000)} (expect ~0.70)`);

console.log("\nCondition Factors:");
console.log(`  Excellent: ${getConditionFactor("Excellent")} (expect 1.0)`);
console.log(`  Good:      ${getConditionFactor("Good")} (expect 0.92)`);
console.log(`  Fair:      ${getConditionFactor("Fair")} (expect 0.82)`);
console.log(`  Damaged:   ${getConditionFactor("Damaged")} (expect 0.70)`);

// Summary
console.log("\n" + "═".repeat(60));
console.log("✅ ALL TESTS COMPLETED");
console.log("═".repeat(60));
console.log(
  "\nIf all tests show ✅ PASS, pricing engine is working correctly!",
);
console.log("\nNext steps:");
console.log("  1. Start backend: node server.js");
console.log("  2. Test API: curl http://localhost:5000/api/vehicles");
console.log("  3. Update frontend with pricing labels and factors");
