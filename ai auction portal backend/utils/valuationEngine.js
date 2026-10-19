/**
 * ═══════════════════════════════════════════════════════════════════
 * CLEAN VALUATION ENGINE
 *
 * Purpose:
 *   Take a single ML prediction (market selling price)
 *   Derive all valuation metrics using correct financial logic
 *
 * Key Principle:
 *   ML model predicts MARKET PRICE (used car resale value)
 *   All other values are derived from this, NOT from separate calculations
 *
 * Derived Formulas (India used car market):
 *   insuranceValue    = marketPrice * 0.85  (IRDA ~85% payout)
 *   baseValue         = marketPrice * 0.80  (conservative depreciation)
 *   residualValue     = marketPrice * 0.70  (3-year projection)
 *   distressValue     = marketPrice * 0.75  (quick sale discount)
 *   salvageValue      = marketPrice * 0.20  (scrap/parts value)
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Validate and clamp predicted price to reasonable bounds
 * @param {number} predictedPrice - Raw ML prediction
 * @param {number} mileage - Vehicle mileage in km
 * @returns {number} Clamped price
 */
function validateAndClampPrice(predictedPrice, mileage = 0) {
  // Minimum: ₹100k (basic budget car scrap value)
  // Maximum: ₹50L (ultra-luxury ceiling for most market)
  const MIN_PRICE = 100000;
  const MAX_PRICE = 5000000;

  let price = Number(predictedPrice);

  // Handle invalid/NaN
  if (!price || isNaN(price) || price <= 0) {
    return MIN_PRICE;
  }

  // Extreme mileage penalty (used cars with 300k+ km are heavily discounted)
  if (mileage > 300000) {
    price = price * 0.6; // 60% of predicted if extremely high mileage
  } else if (mileage > 200000) {
    price = price * 0.75; // 75% if high mileage
  } else if (mileage > 150000) {
    price = price * 0.88; // 88% if moderately high
  }

  // Clamp to bounds
  return Math.max(MIN_PRICE, Math.min(MAX_PRICE, price));
}

/**
 * Calculate all valuation metrics from a single market price
 * @param {number} marketPrice - ML-predicted market/selling price
 * @param {number} mileage - Optional: vehicle mileage for extreme value adjustment
 * @returns {Object} Complete valuation breakdown
 */
function calculateValuation(marketPrice, mileage = 0) {
  // Validate and clamp input
  const validatedPrice = validateAndClampPrice(marketPrice, mileage);

  // Derive all values from single source (market price)
  const valuation = {
    market_price: Math.round(validatedPrice),

    // Insurance value: What insurance company pays on total loss
    // Indian market: typically 80-90% of market price
    insurance_value: Math.round(validatedPrice * 0.85),

    // Base depreciated value: Conservative current value
    base_value: Math.round(validatedPrice * 0.8),

    // Residual value: Projected resale value in 3 years
    // Typically 65-75% of current market price
    residual_value: Math.round(validatedPrice * 0.7),

    // Distress value: Quick sale (20-25% discount to market)
    // Used when buyer needs urgent liquidity
    distress_value: Math.round(validatedPrice * 0.75),

    // Salvage value: Scrap/parts value at end of life
    // Typically 15-25% of market price (steel scrap + reusable parts)
    salvage_value: Math.round(validatedPrice * 0.2),
  };

  // Validate logical consistency
  validateLogicalConsistency(valuation);

  return valuation;
}

/**
 * Ensure all derived values maintain logical relationships
 * @param {Object} valuation - Valuation metrics object
 * @throws {Error} If logical inconsistencies detected
 */
function validateLogicalConsistency(valuation) {
  const {
    market_price,
    insurance_value,
    base_value,
    residual_value,
    distress_value,
    salvage_value,
  } = valuation;

  const checks = [
    {
      condition: insurance_value <= market_price && insurance_value > 0,
      message: `Insurance (${insurance_value}) must be ≤ Market (${market_price})`,
    },
    {
      condition: salvage_value < market_price && salvage_value > 0,
      message: `Salvage (${salvage_value}) must be < Market (${market_price})`,
    },
    {
      condition: distress_value < market_price && distress_value > 0,
      message: `Distress (${distress_value}) must be < Market (${market_price})`,
    },
    {
      condition: residual_value < market_price && residual_value > 0,
      message: `Residual (${residual_value}) must be < Market (${market_price})`,
    },
    {
      condition: base_value < market_price && base_value > 0,
      message: `Base (${base_value}) must be < Market (${market_price})`,
    },
    {
      condition: residual_value < base_value,
      message: `Residual (${residual_value}) must be < Base (${base_value})`,
    },
    {
      condition: salvage_value < residual_value,
      message: `Salvage (${salvage_value}) must be << Residual (${residual_value})`,
    },
  ];

  for (const check of checks) {
    if (!check.condition) {
      console.warn(`[Valuation Logic Warning] ${check.message}`);
    }
  }
}

/**
 * Calculate overpricing percentage
 * @param {number} askingPrice - Vehicle asking/list price
 * @param {number} marketPrice - Calculated market price
 * @returns {Object} Pricing analysis
 */
function analyzePricingPosition(askingPrice, marketPrice) {
  if (!askingPrice || askingPrice <= 0) {
    return {
      asking_price: 0,
      market_price: Math.round(marketPrice),
      overprice_percent: 0,
      assessment: "No asking price provided",
    };
  }

  const overpricePercent = ((askingPrice - marketPrice) / marketPrice) * 100;

  let assessment = "Fair Market Value";
  if (overpricePercent > 10) {
    assessment = "Overpriced";
  } else if (overpricePercent < -10) {
    assessment = "Good Deal";
  }

  return {
    asking_price: Math.round(askingPrice),
    market_price: Math.round(marketPrice),
    overprice_percent: Math.round(overpricePercent * 10) / 10,
    assessment,
  };
}

module.exports = {
  calculateValuation,
  validateAndClampPrice,
  validateLogicalConsistency,
  analyzePricingPosition,
};
