// ═══════════════════════════════════════════════════════════════════
//  UNIVERSAL INTELLIGENT PRICING ENGINE  v3.0
//
//  Priority chain for base price:
//    1. User-provided original_price   (most accurate)
//    2. Model lookup table             (curated ex-showroom)
//    3. Segment average price table    (structured fallback)
//    4. ML predicted price × 2        (last-resort fallback)
//
//  Segments:  A / B1 / B2 / C1 / C2 / D1 / Luxury / Exotic
//
//  Depreciation:  Budget–D1 → 8%/yr  |  Luxury → 6%/yr  |  Exotic → 4%/yr
//
//  Final price formula:
//    structuredPrice = baseValue × segmentWeight × mileageFactor × conditionFactor
//    finalPrice      = structuredPrice × 0.75  +  mlPrice × 0.25
// ═══════════════════════════════════════════════════════════════════

const DEPRECIATION_RATE = 0.08; // 8% compound per year

// ── A. Model-level ex-showroom lookup ────────────────────────────
const MODEL_PRICE_MAP = {
  // Maruti
  "Maruti Alto": 400000,
  "Maruti WagonR": 560000,
  "Maruti Celerio": 530000,
  "Maruti Ignis": 600000,
  "Maruti Swift": 650000,
  "Maruti Dzire": 700000,
  "Maruti Baleno": 780000,
  "Maruti Brezza": 880000,
  "Maruti Ertiga": 920000,
  "Maruti S-Cross": 950000,
  "Maruti Grand Vitara": 1350000,
  // Hyundai
  "Hyundai Santro": 490000,
  "Hyundai i10": 560000,
  "Hyundai i20": 780000,
  "Hyundai Venue": 840000,
  "Hyundai Verna": 1050000,
  "Hyundai Creta": 1150000,
  "Hyundai Tucson": 2200000,
  "Hyundai Elantra": 1800000,
  // Honda
  "Honda Amaze": 760000,
  "Honda Jazz": 820000,
  "Honda City": 1150000,
  "Honda WR-V": 950000,
  "Honda Civic": 1900000,
  "Honda CR-V": 2900000,
  // Toyota
  "Toyota Etios": 720000,
  "Toyota Glanza": 800000,
  "Toyota Yaris": 950000,
  "Toyota Innova": 1850000,
  "Toyota Fortuner": 3300000,
  "Toyota Camry": 4200000,
  "Toyota Corolla": 1800000,
  "Toyota Hilux": 3300000,
  // Skoda
  "Skoda Rapid": 920000,
  "Skoda Slavia": 1150000,
  "Skoda Kushaq": 1150000,
  "Skoda Octavia": 2100000,
  "Skoda Superb": 3500000,
  "Skoda Kodiaq": 3700000,
  // Volkswagen
  "Volkswagen Polo": 870000,
  "Volkswagen Vento": 1050000,
  "Volkswagen Taigun": 1150000,
  "Volkswagen Tiguan": 3300000,
  "Volkswagen Virtus": 1200000,
  // Mahindra
  "Mahindra Bolero": 960000,
  "Mahindra Scorpio": 1350000,
  "Mahindra XUV300": 850000,
  "Mahindra XUV500": 1550000,
  "Mahindra XUV700": 1450000,
  "Mahindra Thar": 1650000,
  // Tata
  "Tata Punch": 620000,
  "Tata Altroz": 730000,
  "Tata Nexon": 950000,
  "Tata Harrier": 1550000,
  "Tata Safari": 1600000,
  "Tata Tigor": 660000,
  // Kia
  "Kia Sonet": 840000,
  "Kia Carens": 1050000,
  "Kia Seltos": 1150000,
  "Kia Carnival": 3100000,
  // MG
  "MG Hector": 1550000,
  "MG Gloster": 3300000,
  "MG Astor": 1150000,
  "MG ZS EV": 2300000,
  // Renault
  "Renault Kwid": 410000,
  "Renault Triber": 620000,
  "Renault Duster": 950000,
  // Nissan
  "Nissan Magnite": 620000,
  "Nissan Kicks": 1050000,
  // Ford
  "Ford Figo": 720000,
  "Ford EcoSport": 950000,
  "Ford Endeavour": 3300000,
  // Jeep
  "Jeep Compass": 2100000,
  "Jeep Wrangler": 5800000,
  // BMW
  "BMW 1 Series": 3800000,
  "BMW 2 Series": 4200000,
  "BMW 3 Series": 4500000,
  "BMW 5 Series": 6800000,
  "BMW 7 Series": 11500000,
  "BMW X1": 4700000,
  "BMW X3": 6800000,
  "BMW X5": 9500000,
  "BMW X7": 13000000,
  // Audi
  "Audi A4": 4700000,
  "Audi A6": 6800000,
  "Audi Q3": 4700000,
  "Audi Q5": 6800000,
  "Audi Q7": 9500000,
  "Audi A8": 12000000,
  // Mercedes
  "Mercedes A-Class": 4000000,
  "Mercedes C-Class": 4900000,
  "Mercedes E-Class": 7800000,
  "Mercedes S-Class": 16000000,
  "Mercedes GLA": 4500000,
  "Mercedes GLC": 6800000,
  "Mercedes GLE": 10500000,
  "Mercedes GLS": 14000000,
  // Others
  "Volvo XC40": 4500000,
  "Volvo XC60": 6400000,
  "Volvo XC90": 9500000,
  "Jaguar XE": 4800000,
  "Jaguar F-Pace": 7000000,
  "Porsche Cayenne": 14000000,
  "Land Rover Defender": 9000000,
  "Range Rover Evoque": 6800000,
};

// ── B. User-defined segment → base price fallback ────────────────
const SEGMENT_BASE_PRICE = {
  "A-Segment": 400000,
  "B1-Segment": 600000,
  "B2-Segment": 800000,
  "C1-Segment": 1200000,
  "C2-Segment": 1500000,
  "D1-Segment": 2000000,
  Luxury: 5000000,
  Exotic: 20000000,
};

// ── C. User-defined segment → weight multiplier ──────────────────
const SEGMENT_WEIGHT = {
  "A-Segment": 0.8,
  "B1-Segment": 0.9,
  "B2-Segment": 1.0,
  "C1-Segment": 1.1,
  "C2-Segment": 1.2,
  "D1-Segment": 1.3,
  Luxury: 1.6,
  Exotic: 1.8,
};

// ── C2. India-specific two-phase depreciation config ─────────────
//
//  Real data sources:
//   • IRDAI depreciation schedule (insurance declared value)
//   • CarDekho / Cars24 / OLX Autos resale market observations
//   • RBI / SEBI asset valuation guidelines
//
//  Key India insight:
//   • ALL cars lose 15-20% in year 1 (registration + first owner premium loss)
//   • Luxury cars depreciate FASTER than budget in India (high maintenance perception)
//   • Exotics hold value well (collector/ultra-premium market, very few buyers)
//
// Strict segment depreciation rates (do not change)
const depreciationRates = {
  "A-Segment": { firstYear: 0.2, after: 0.13 },
  "B1-Segment": { firstYear: 0.18, after: 0.12 },
  "B2-Segment": { firstYear: 0.17, after: 0.11 },
  "C1-Segment": { firstYear: 0.16, after: 0.1 },
  "C2-Segment": { firstYear: 0.15, after: 0.09 },
  "D1-Segment": { firstYear: 0.15, after: 0.09 },
  Luxury: { firstYear: 0.25, after: 0.15 },
  Exotic: { firstYear: 0.08, after: 0.05 },
};

// For backward compatibility
const DEPRECIATION_CONFIG = Object.fromEntries(
  Object.entries(depreciationRates).map(([k, v]) => [
    k,
    { firstYear: v.firstYear, subsequent: v.after },
  ]),
);

// ── D. Auto-infer segment from brand (when user doesn't select) ──
const BRAND_AUTO_SEGMENT = {
  // Budget
  Maruti: "B1-Segment",
  Suzuki: "B1-Segment",
  Renault: "B1-Segment",
  Nissan: "B1-Segment",
  // Mid
  Hyundai: "B2-Segment",
  Honda: "C1-Segment",
  Tata: "B2-Segment",
  Ford: "C1-Segment",
  // Premium
  Mahindra: "C1-Segment",
  Kia: "C1-Segment",
  MG: "C1-Segment",
  Toyota: "C2-Segment",
  Skoda: "C2-Segment",
  Volkswagen: "C2-Segment",
  Jeep: "C2-Segment",
  // Luxury
  BMW: "Luxury",
  Audi: "Luxury",
  Mercedes: "Luxury",
  Volvo: "Luxury",
  Jaguar: "Luxury",
  Land: "Luxury",
  // Exotic / Supercar
  Lamborghini: "Exotic",
  Ferrari: "Exotic",
  McLaren: "Exotic",
  Bugatti: "Exotic",
  Porsche: "Exotic",
  Maserati: "Exotic",
  "Rolls-Royce": "Exotic",
  RollsRoyce: "Exotic",
  Bentley: "Exotic",
  Aston: "Exotic",
};

// ── E. Condition factor ───────────────────────────────────────────
const CONDITION_FACTOR = {
  excellent: 1.0,
  good: 0.9,
  average: 0.8,
  damaged: 0.6,
};

// ═════════════════════════════════════════════════════════════════
//  SYSTEM 1: MARKET DEPRECIATION  (AI Price engine)
//  Source: CarDekho / Cars24 / OLX Autos India resale data
//
//  Two-phase year-by-year model:
//    Year 1  → steep first-owner loss (registration + first-hand premium)
//    Year 2+ → iterate each full year at 'after' rate
// ═════════════════════════════════════════════════════════════════
// Strict market base price function (do not change)
function calculateMarketBasePrice(originalPrice, age, segment) {
  const rates = depreciationRates[segment] || { firstYear: 0.17, after: 0.11 };
  let value = originalPrice;
  if (age >= 1) {
    value *= 1 - rates.firstYear;
    for (let i = 1; i < age; i++) {
      value *= 1 - rates.after;
    }
  }
  return value;
}

// ── Effective annual rate helper (for display badge) ──────────────
function effectiveAnnualRate(segment) {
  const cfg = DEPRECIATION_CONFIG[segment] || {
    firstYear: 0.17,
    subsequent: 0.11,
  };
  return (cfg.firstYear + cfg.subsequent * 4) / 5; // 5-yr weighted average
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//  SYSTEM 2: INSURANCE VALUE (IDV) → STRICT IRDA-BASED (COMPLETELY SEPARATE FROM MARKET PRICE)
//  Source: IRDA Motor Vehicle Tariff, Schedule I - DO NOT CHANGE FORMULAS
//
//  STRICT RULES:
//  • Applied ONLY to original/ex-showroom price
//  • Independent of ML/market price calculation
//  • Exact depreciation table (no modifications)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Strict IRDA IDV function (do not change)
function calculateIDV(originalPrice, age) {
  let depreciation = 0;
  if (age < 0.5) depreciation = 0.05;
  else if (age < 1) depreciation = 0.15;
  else if (age < 2) depreciation = 0.2;
  else if (age < 3) depreciation = 0.3;
  else if (age < 4) depreciation = 0.4;
  else if (age < 5) depreciation = 0.5;
  else depreciation = 0.55;
  return originalPrice * (1 - depreciation);
}

// ═════════════════════════════════════════════════════════════════

// Strict base value calculation (do not change)
function computeIndiaDepreciation(originalPrice, age, segment) {
  return calculateMarketBasePrice(originalPrice, age, segment);
}

// Strict hybrid price computation (do not change)
function computeHybridPrice({
  brand,
  model,
  vehicle_age,
  mileage = 0,
  mlPredictedPrice,
  original_price = null,
  segment = null,
  condition = "good",
  year = null,
}) {
  // Error handling for missing inputs
  let age = vehicle_age;
  if ((age === undefined || age === null) && year) {
    const currentYear = new Date().getFullYear();
    age = currentYear - Number(year);
  }
  age = Math.max(0, Number(age));

  // Segment fallback
  const effectiveSegment = segment || BRAND_AUTO_SEGMENT[brand] || "B2-Segment";
  const segmentWeight = SEGMENT_WEIGHT[effectiveSegment] || 1.0;

  // Base price fallback
  let basePrice;
  let priceSource;
  if (original_price && Number(original_price) > 0) {
    basePrice = Number(original_price);
    priceSource = "user_provided";
  } else {
    const key = `${brand} ${model}`;
    if (MODEL_PRICE_MAP[key]) {
      basePrice = MODEL_PRICE_MAP[key];
      priceSource = "model_database";
    } else if (SEGMENT_BASE_PRICE[effectiveSegment]) {
      basePrice = SEGMENT_BASE_PRICE[effectiveSegment];
      priceSource = "segment_average";
    } else {
      basePrice = mlPredictedPrice * 2;
      priceSource = "ml_fallback";
    }
  }

  // Strict base value
  const baseValue = computeIndiaDepreciation(basePrice, age, effectiveSegment);

  // Mileage factor (unchanged)
  const km = Number(mileage);
  let mileageFactor;
  if (effectiveSegment === "Exotic") {
    mileageFactor = km > 30000 ? 0.85 : km > 15000 ? 0.92 : 1.0;
  } else if (effectiveSegment === "Luxury") {
    mileageFactor =
      km > 120000 ? 0.78 : km > 80000 ? 0.86 : km > 40000 ? 0.93 : 1.0;
  } else if (
    effectiveSegment === "D1-Segment" ||
    effectiveSegment === "C2-Segment"
  ) {
    mileageFactor =
      km > 150000 ? 0.76 : km > 100000 ? 0.84 : km > 60000 ? 0.91 : 1.0;
  } else {
    mileageFactor =
      km > 150000
        ? 0.72
        : km > 100000
          ? 0.82
          : km > 60000
            ? 0.9
            : km > 30000
              ? 0.95
              : 1.0;
  }

  // Condition factor (unchanged)
  const condFactor = CONDITION_FACTOR[condition] || 0.9;

  // Strict final price formula
  const baseFormula = baseValue * segmentWeight * condFactor * mileageFactor;
  const finalPrice = baseFormula * 0.75 + mlPredictedPrice * 0.25;

  return {
    base_price: Math.round(basePrice),
    base_value: Math.round(baseValue),
    segment: effectiveSegment,
    segment_weight: segmentWeight,
    mileage_factor: mileageFactor,
    condition,
    condition_factor: condFactor,
    ml_price: Math.round(mlPredictedPrice),
    final_price: Math.round(finalPrice),
    price_source: priceSource,
  };
}

// ═════════════════════════════════════════════════════════════════
//  VALUATION METRICS  (India-accurate, IRDAI-aligned)
// ═════════════════════════════════════════════════════════════════
// Strict valuation metrics (do not change)
function computeValuationMetrics(
  finalPrice,
  originalPrice,
  vehicle_age,
  segment = "B2-Segment",
) {
  let age = vehicle_age;
  if (age === undefined || age === null) age = 0;
  age = Math.max(0, Number(age));
  let op =
    originalPrice && Number(originalPrice) > 0
      ? Number(originalPrice)
      : finalPrice * 2; // ERROR HANDLING: originalPrice missing → mlPredictedPrice * 2 (MANDATORY)

  // Strict insurance value (IDV)
  const insurance_value = calculateIDV(op, age);

  // Strict residual value
  let residual_value;
  if (segment === "Exotic") {
    residual_value = op * 0.5;
  } else if (segment === "Luxury") {
    residual_value = op * 0.4;
  } else {
    residual_value = calculateMarketBasePrice(op, age, segment);
  }

  // Strict salvage and distress values (EXACT weights - DO NOT rebalance)
  // FINAL PRICE FORMULA: distress = 75% market | salvage = 15-20% market (scrap/parts)
  const salvage_value = finalPrice * 0.15; // Scrap + reusable parts (India scrap rates)
  const distress_value = finalPrice * 0.75; // Quick sale penalty (25% discount)

  return {
    ai_price: Math.round(finalPrice),
    residual_value: Math.round(residual_value),
    salvage_value: Math.round(salvage_value),
    insurance_value: Math.round(insurance_value),
    distress_value: Math.round(distress_value),
  };
}

module.exports = {
  computeHybridPrice,
  computeValuationMetrics,
  calculateIDV,
  calculateMarketBasePrice,
  depreciationRates,
  BRAND_AUTO_SEGMENT,
};
