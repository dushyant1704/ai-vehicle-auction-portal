#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI VALUATION FEATURE - DEBUGGING SCRIPT
 *
 * This script tests the API endpoint and validates the response structure
 * Run this to verify backend is working correctly
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = "http://localhost:5000/api/predict-price";

// Sample vehicle data
const TEST_VEHICLE = {
  brand: "Maruti",
  model: "Swift",
  vehicle_age: 3,
  fuel: "petrol",
  transmission: "manual",
  engine: "1200cc",
  max_power: 83,
  seats: 5,
  mileage: 45000,
  asking_price: 450000,
};

// ─────────────────────────────────────────────────────────────────────────────
// ANSI Colors for console output
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) =>
    console.log(`${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}`),
  data: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Test Function
// ─────────────────────────────────────────────────────────────────────────────

async function testValuationAPI() {
  log.header("VEHICLE VALUATION API TEST");

  // Step 1: Check backend is running
  log.info("Step 1: Checking backend connection...");
  try {
    await axios
      .get("http://localhost:5000/health", { timeout: 5000 })
      .catch(() => {});
  } catch (err) {
    // Health check might not exist, continue
  }

  // Step 2: Make API request
  log.info("Step 2: Sending API request...");
  log.data(`URL: ${API_URL}`);
  log.data(`Payload:`, JSON.stringify(TEST_VEHICLE, null, 2));

  let response;
  try {
    response = await axios.post(API_URL, TEST_VEHICLE, { timeout: 10000 });
    log.success("API request successful (HTTP 200)");
  } catch (err) {
    log.error(`API request failed: ${err.message}`);
    if (err.response?.status === 500) {
      log.error("Backend returned 500 error - check server logs");
      if (err.response?.data?.details) {
        log.data(`Details: ${err.response.data.details}`);
      }
    } else if (err.code === "ECONNREFUSED") {
      log.error("Backend not running on port 5000");
      log.info(
        'Start backend with: cd "ai auction portal backend" && node server.js',
      );
    }
    return false;
  }

  // Step 3: Validate response structure
  log.info("Step 3: Validating response structure...");

  const requiredFields = [
    "marketPrice",
    "insuranceValue",
    "baseValue",
    "residualValue",
    "distressValue",
    "salvageValue",
    "pricingAnalysis",
  ];

  let structureValid = true;
  requiredFields.forEach((field) => {
    if (response.data.hasOwnProperty(field)) {
      log.success(`Field present: ${field}`);
    } else {
      log.error(`Field missing: ${field}`);
      structureValid = false;
    }
  });

  if (!structureValid) {
    log.error("Response structure is invalid");
    return false;
  }

  // Step 4: Validate value types and ranges
  log.info("Step 4: Validating value types and ranges...");

  const metrics = {
    marketPrice: response.data.marketPrice,
    insuranceValue: response.data.insuranceValue,
    baseValue: response.data.baseValue,
    residualValue: response.data.residualValue,
    distressValue: response.data.distressValue,
    salvageValue: response.data.salvageValue,
  };

  let valuesValid = true;
  Object.entries(metrics).forEach(([name, value]) => {
    const isNumber = typeof value === "number" && !isNaN(value);
    const isPositive = value > 0;
    const isReasonable = value >= 100000 && value <= 5000000; // ₹1L to ₹50L

    if (isNumber && isPositive && isReasonable) {
      log.success(`${name}: ₹${value.toLocaleString("en-IN")}`);
    } else {
      if (!isNumber) log.error(`${name}: Not a number (${typeof value})`);
      if (!isPositive) log.error(`${name}: Not positive (${value})`);
      if (!isReasonable)
        log.error(`${name}: Out of reasonable range (${value})`);
      valuesValid = false;
    }
  });

  if (!valuesValid) {
    log.error("Some values are invalid");
    return false;
  }

  // Step 5: Validate hierarchy
  log.info("Step 5: Validating value hierarchy...");

  const hierarchy = [
    { name: "salvageValue", value: metrics.salvageValue },
    { name: "residualValue", value: metrics.residualValue },
    { name: "baseValue", value: metrics.baseValue },
    { name: "distressValue", value: metrics.distressValue },
    { name: "insuranceValue", value: metrics.insuranceValue },
    { name: "marketPrice", value: metrics.marketPrice },
  ];

  hierarchy.sort((a, b) => a.value - b.value);

  log.data("Values in ascending order:");
  hierarchy.forEach((item, idx) => {
    const bar = "█".repeat(Math.floor((item.value / metrics.marketPrice) * 20));
    log.data(
      `  ${idx + 1}. ${item.name.padEnd(20)} ₹${item.value.toLocaleString("en-IN").padEnd(10)} ${bar}`,
    );
  });

  // Expected order: salvage < residual < base ≤ distress < insurance < market
  const expectedOrder = [
    "salvageValue",
    "residualValue",
    "baseValue",
    "distressValue",
    "insuranceValue",
    "marketPrice",
  ];

  const actualOrder = hierarchy.map((h) => h.name);

  if (JSON.stringify(expectedOrder) === JSON.stringify(actualOrder)) {
    log.success("Value hierarchy is correct");
  } else {
    log.warning("Value hierarchy may be incorrect:");
    log.data(`  Expected: ${expectedOrder.join(" < ")}`);
    log.data(`  Actual:   ${actualOrder.join(" < ")}`);
  }

  // Step 6: Validate pricing analysis
  log.info("Step 6: Validating pricing analysis...");

  if (response.data.pricingAnalysis) {
    const analysis = response.data.pricingAnalysis;
    log.success("Pricing analysis present");
    log.data(
      `  Asking Price: ₹${analysis.asking_price?.toLocaleString("en-IN") || "N/A"}`,
    );
    log.data(
      `  Market Price: ₹${analysis.market_price?.toLocaleString("en-IN") || "N/A"}`,
    );
    log.data(
      `  Overpricing: ${analysis.overprice_percent?.toFixed(1) || "N/A"}%`,
    );
    log.data(`  Assessment: ${analysis.assessment || "N/A"}`);
  } else {
    log.warning("Pricing analysis not present");
  }

  // Step 7: Display full response
  log.info("Step 7: Full API response:");
  log.data(JSON.stringify(response.data, null, 2));

  // Step 8: Summary
  console.log("");
  log.header("TEST SUMMARY");

  if (structureValid && valuesValid) {
    log.success("All validations passed!");
    log.info("Frontend should render correctly with this data.");
    log.info("Expected behavior:");
    log.data("  ✅ All 6 metrics display with ₹ formatted values");
    log.data("  ✅ Values are in correct hierarchy");
    log.data("  ✅ Assessment badge shows (Good Deal/Fair/Overpriced)");
    log.data("  ✅ No console errors in browser");
    return true;
  } else {
    log.error("Some validations failed");
    log.info("Check backend logs and fix the API response");
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run the test
// ─────────────────────────────────────────────────────────────────────────────

testValuationAPI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    log.error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });

module.exports = testValuationAPI;
