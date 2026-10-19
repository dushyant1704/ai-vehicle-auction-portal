/**
 * ═══════════════════════════════════════════════════════════════════
 * DATA PREPROCESSOR - STRICT VALIDATION FOR STABLE PRICING
 *
 * Updated for pricing stability:
 * ✅ MILEAGE.MAX = 200000 (per task spec)
 * ✅ YEAR.MIN = 2000 (per task spec)
 * ✅ Added make/model normalization
 * ✅ Enhanced RAW→SANITIZED debug logs
 * ✅ Compatible with new pricingEngine.js
 * ═══════════════════════════════════════════════════════════════════
 */

const DEBUG = process.env.DEBUG_PREPROCESSING === "true" || true;

/**
 * STRICT CONSTRAINTS - Per task requirements
 */
const CONSTRAINTS = {
  YEAR: {
    MIN: 2000, // Task: 2000-current
    MAX: new Date().getFullYear() + 1,
  },
  MILEAGE: {
    MIN: 0,
    MAX: 200000, // Task: max 200000
    EXTREME_THRESHOLD: 1000000,
  },
  PRICE: {
    MIN: 50000,
    MAX: 5000000, // Extended for luxury
  },
  ENGINE: {
    MIN: 600,
    MAX: 8000,
  },
  MAX_POWER: {
    MIN: 30,
    MAX: 500,
  },
  SEATS: {
    MIN: 2,
    MAX: 8,
  },
};

/**
 * Normalize make/model for consistent pricingEngine lookup
 */
function normalizeMakeModel(make, model) {
  if (!make || !model) return { make: "Unknown", model: "Unknown" };

  return {
    make: make
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ""),
    model: model
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ""),
  };
}

/**
 * Clean mileage with strict 200k cap
 */
function sanitizeMileage(mileage) {
  console.log(`[RAW MILEAGE INPUT] ${mileage}`);

  if (mileage === null || mileage === undefined) {
    console.log("   ⚠️ [Mileage] Null → 0");
    return 0;
  }

  let cleanMileage = Number(mileage);
  if (isNaN(cleanMileage)) {
    console.log(`   ⚠️ [Mileage] Non-numeric → 0`);
    return 0;
  }

  if (cleanMileage < 0) {
    console.log(`   ⚠️ [Mileage] Negative → 0`);
    return 0;
  }

  // Fix extreme values
  if (cleanMileage > CONSTRAINTS.MILEAGE.EXTREME_THRESHOLD) {
    console.log(`   🚨 [Mileage] Extreme ${cleanMileage.toLocaleString()}km`);
    if (cleanMileage > 100000000) {
      cleanMileage = Math.round(cleanMileage / 1000);
    } else {
      cleanMileage = Math.round(cleanMileage / 100);
    }
    console.log(`   ✅ [Mileage] Fixed → ${cleanMileage.toLocaleString()}km`);
  }

  // STRICT CLAMP: 0-200k
  cleanMileage = Math.max(
    CONSTRAINTS.MILEAGE.MIN,
    Math.min(cleanMileage, CONSTRAINTS.MILEAGE.MAX),
  );

  console.log(`[SANITIZED MILEAGE] ${cleanMileage.toLocaleString()}km`);
  return cleanMileage;
}

/**
 * Clean year with strict 2000+ clamp
 */
function sanitizeYear(year) {
  console.log(`[RAW YEAR INPUT] ${year}`);

  if (year === null || year === undefined) {
    const defaultYear = new Date().getFullYear() - 3; // Typical 3yo used car
    console.log(`   ⚠️ [Year] Null → ${defaultYear}`);
    return defaultYear;
  }

  let cleanYear = Number(year);
  if (isNaN(cleanYear)) {
    const defaultYear = new Date().getFullYear() - 3;
    console.log(`   ⚠️ [Year] Non-numeric → ${defaultYear}`);
    return defaultYear;
  }

  // STRICT CLAMP: 2000-current+1
  cleanYear = Math.max(
    CONSTRAINTS.YEAR.MIN,
    Math.min(cleanYear, CONSTRAINTS.YEAR.MAX),
  );

  console.log(`[SANITIZED YEAR] ${cleanYear}`);
  return cleanYear;
}

/**
 * Clean price (keep for DB compatibility, not used in formula)
 */
function sanitizePrice(price) {
  console.log(`[RAW PRICE INPUT] ${price}`);

  if (price === null || price === undefined || price <= 0) {
    console.log(`   ⚠️ [Price] Invalid → 0`);
    return 0;
  }

  let cleanPrice = Number(price);
  if (isNaN(cleanPrice) || cleanPrice < 0) {
    console.log(`   ⚠️ [Price] Invalid → 0`);
    return 0;
  }

  console.log(`[SANITIZED PRICE] ₹${cleanPrice.toLocaleString()}`);
  return cleanPrice;
}

/**
 * Clean condition
 */
function sanitizeCondition(condition) {
  console.log(`[RAW CONDITION INPUT] ${condition}`);

  const valid = [
    "Excellent",
    "Good",
    "Fair",
    "Damaged",
    "Like New",
    "Average",
    "Poor",
  ];
  let cleanCondition = (condition || "Good").toString().trim();

  if (!valid.includes(cleanCondition)) cleanCondition = "Good";

  console.log(`[SANITIZED CONDITION] ${cleanCondition}`);
  return cleanCondition;
}

/**
 * MAIN: Full vehicle sanitization with enhanced logs
 */
function sanitizeCarData(car) {
  console.log("\n🔍 [PREPROCESSOR RAW INPUT]");
  console.log(JSON.stringify(car, null, 2));

  if (!car || typeof car !== "object") {
    console.error("❌ Invalid input object");
    return null;
  }

  const cleaned = { ...car };

  // Normalize make/model for pricingEngine
  const normalized = normalizeMakeModel(car.brand, car.model);
  cleaned.brand =
    normalized.make.charAt(0).toUpperCase() + normalized.make.slice(1);
  cleaned.model =
    normalized.model.charAt(0).toUpperCase() + normalized.model.slice(1);

  // Sanitize core fields
  cleaned.year = sanitizeYear(car.year);
  cleaned.mileage = sanitizeMileage(car.mileage);
  cleaned.condition = sanitizeCondition(car.condition);
  cleaned.price = sanitizePrice(car.price); // Keep for display

  cleaned.vehicle_age = new Date().getFullYear() - cleaned.year;

  console.log("\n✅ [PREPROCESSOR SANITIZED OUTPUT]");
  console.log(JSON.stringify(cleaned, null, 2));

  return cleaned;
}

/**
 * Legacy clamp (now handled by pricingEngine)
 */
function clampPriceOutput(price) {
  return Math.max(
    CONSTRAINTS.PRICE.MIN,
    Math.min(price, CONSTRAINTS.PRICE.MAX),
  );
}

/**
 * Validate inputs for pricing engine
 */
function isValidModelInput(vehicle) {
  return (
    vehicle &&
    vehicle.brand &&
    vehicle.model &&
    vehicle.year >= CONSTRAINTS.YEAR.MIN &&
    vehicle.mileage >= 0 &&
    vehicle.mileage <= CONSTRAINTS.MILEAGE.MAX
  );
}

module.exports = {
  sanitizeCarData,
  sanitizeMileage,
  sanitizeYear,
  sanitizePrice,
  sanitizeCondition,
  clampPriceOutput,
  isValidModelInput,
  CONSTRAINTS,
  normalizeMakeModel,
};
