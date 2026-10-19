/**
 * DEPRECATED: marketBaseline.js - Redirect to pricingEngine
 * Legacy compatibility layer
 * MARKET_BASELINES & functions merged into pricingEngine.js
 */

const { getStablePricingData } = require("./pricingEngine");

/**
 * Legacy exports → new unified engine
 */
module.exports = {
  calculateStableMarketPrice: getStablePricingData,
  getMarketBaseline: () => {
    console.warn("Deprecated - baselines in pricingEngine");
    return 750000;
  },
  getPriceStabilityStats: () => ({ stability: "Use new engine" }),
  CONFIG: { deprecated: true },
  MARKET_BASELINES: { deprecated: "Moved to pricingEngine.js" },
};

console.log("✅ [marketBaseline] Legacy redirect to pricingEngine.js active");
