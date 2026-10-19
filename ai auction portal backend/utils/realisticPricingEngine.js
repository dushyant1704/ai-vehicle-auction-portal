/**
 * DEPRECATED: realisticPricingEngine.js - Redirect to pricingEngine
 * Legacy compatibility layer for stable pricing migration
 * All functionality moved to utils/pricingEngine.js
 */

const {
  getStablePricingData,
  calculateDerivedMetrics,
} = require("./pricingEngine");

/**
 * Legacy exports → new stable engine
 * Prevents breaking changes during migration
 */
module.exports = {
  calculateRealisticAIPrice: getStablePricingData,
  calculateDerivedMetrics,
  getDepreciationFactor: () => {
    console.warn("Deprecated - use pricingEngine");
    return 1.0;
  },
  getMileageFactor: () => {
    console.warn("Deprecated - use pricingEngine");
    return 1.0;
  },
  getConditionFactor: () => {
    console.warn("Deprecated - use pricingEngine");
    return 1.0;
  },
};

console.log(
  "✅ [realisticPricingEngine] Legacy redirect to pricingEngine.js active",
);
