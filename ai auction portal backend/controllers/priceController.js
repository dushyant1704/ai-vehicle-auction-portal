const axios = require("axios");
const { calculateVehiclePricing } = require("../utils/unifiedPricingEngine");
const { sanitizeMileage } = require("../utils/dataPreprocessor");

exports.predictPrice = async (req, res) => {
  console.log(
    "[PRICE API] Request received:",
    JSON.stringify(req.body, null, 2),
  );

  try {
    const {
      brand,
      model,
      year,
      vehicle_age,
      mileage = 0,
      fuel,
      transmission,
      engine,
      max_power,
      seats,
      original_price = null,
      segment = null,
      condition = "good",
      damage_data = null, // NEW: Optional damage detection results
    } = req.body;

    // ── Input Validation ─────────────────────────────────────────
    const required = ["brand", "model", "fuel", "transmission", "engine", "max_power", "seats"];
    const missing = required.filter((f) => req.body[f] == null || req.body[f] === "");
    
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missingFields: missing,
      });
    }

    // Calculate age if not provided
    let computedAge = vehicle_age;
    if ((computedAge === undefined || computedAge === null || isNaN(Number(computedAge))) && year) {
      const currentYr = new Date().getFullYear();
      computedAge = currentYr - Number(year);
    }
    
    // ML model trained baseline age normalization
    const mlAge = year && Number(year) <= 2024 ? Math.max(0, 2024 - Number(year)) : Number(computedAge);
    
    if (!computedAge && computedAge !== 0) {
      return res.status(400).json({
        error: "Either vehicle_age or year must be provided",
      });
    }

    // Sanitize mileage to fix extreme values (e.g., 3.8M km → 38k km)
    const sanitizedMileage = sanitizeMileage(mileage);

    // ── Step 1: Get ML Prediction ────────────────────────────────
    const { MODEL_PRICES } = require("../utils/unifiedPricingEngine");
    const modelKey = `${brand} ${model}`;
    const fallbackBaseline = MODEL_PRICES[modelKey] || (original_price ? Number(original_price) * 0.7 : 700000);
    
    let mlPredictedPrice = fallbackBaseline;
    const ML_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";
    
    try {
      const mlResponse = await axios.post(
        `${ML_URL}/predict`,
        {
          brand,
          model,
          vehicle_age: mlAge,
          fuel,
          transmission,
          engine: Number(engine),
          max_power: Number(max_power),
          seats: Number(seats),
        },
        { timeout: 5000 }
      );
      
      if (mlResponse.data && mlResponse.data.predicted_price && !isNaN(Number(mlResponse.data.predicted_price))) {
        mlPredictedPrice = Number(mlResponse.data.predicted_price);
      }
      console.log("[PRICE API] ML prediction:", mlPredictedPrice);
    } catch (mlError) {
      console.warn("[PRICE API] ML service unavailable, using dynamic baseline:", mlError.message);
    }

    // ── Step 2: Parse Damage Data (if provided) ───────────────────
    let parsedDamageData = null;
    if (damage_data) {
      try {
        parsedDamageData = typeof damage_data === 'string' ? JSON.parse(damage_data) : damage_data;
        console.log("[PRICE API] Damage data provided:", {
          damages: parsedDamageData.damages?.length || parsedDamageData.damages_detected?.length || 0,
          severity: parsedDamageData.damage_summary?.severity_level
        });
      } catch (parseError) {
        console.warn("[PRICE API] Failed to parse damage data:", parseError.message);
        parsedDamageData = null;
      }
    }

    // ── Step 3: Calculate Complete Pricing (with optional damage) ─
    const pricing = calculateVehiclePricing(
      {
        brand,
        model,
        vehicle_age: computedAge,
        year,
        mileage: sanitizedMileage,
        mlPredictedPrice,
        original_price: original_price ? Number(original_price) : null,
        segment,
        condition,
      },
      parsedDamageData // Pass damage data to pricing engine
    );

    console.log("[PRICE API] Final market price:", pricing.market_price);
    console.log("[PRICE API] Sanitized mileage:", sanitizedMileage, "km (original:", mileage, "km)");
    
    if (parsedDamageData) {
      console.log("[PRICE API] Damage adjustment applied:", {
        base_price: pricing.xgboost_base_price,
        penalty: pricing.damage_penalty_percent + '%',
        final: pricing.final_valuation
      });
    }

    // ── Step 4: Build Requirement 13 Unified Response ─────────────
    const response = {
      // Primary prices (snake_case — used by AddVehicle.tsx)
      market_price:    pricing.market_price,
      ai_price:        pricing.ai_price,
      base_price:      pricing.original_price,
      base_value:      pricing.base_value,
      ml_price:        pricing.ml_price,
      insurance_value: pricing.insurance_value,
      residual_value:  pricing.residual_value,
      distress_value:  pricing.distress_value,
      salvage_value:   pricing.salvage_value,

      // camelCase aliases — used by VehicleDetails.tsx / priceEstimator.ts
      marketPrice:    pricing.market_price,
      aiPrice:        pricing.ai_price,
      baseValue:      pricing.base_value,
      mlRawPrediction: pricing.ml_price,
      insuranceValue: pricing.insurance_value,
      residualValue:  pricing.residual_value,
      distressValue:  pricing.distress_value,
      salvageValue:   pricing.salvage_value,

      // Factors & metadata
      segment:            pricing.segment,
      segment_weight:     pricing.segment_weight,
      depreciation_rate:  pricing.depreciation_rate,
      depreciation_factor: pricing.depreciation_factor,
      mileage_factor:     pricing.mileage_factor,
      condition:          pricing.condition,
      condition_factor:   pricing.condition_factor,
      price_source:       pricing.price_source,

      // Requirement 13: Standardized Unified Response Object
      valuation: {
        predictedPrice: pricing.market_price,
        startingBid: Math.round(pricing.market_price * 0.7),
        reservePrice: Math.round(pricing.market_price * 0.9),
        sellingRange: {
          min: Math.round(pricing.market_price * 0.85),
          max: Math.round(pricing.market_price * 1.15)
        },
        insuranceValue: pricing.insurance_value,
        distressFloor: pricing.distress_value,
        salvageValue: pricing.salvage_value,
        residualValue: pricing.residual_value
      },
      condition: pricing.condition,
      damage: parsedDamageData?.damage_summary || { total_damages: 0, severity_level: "pristine", categories: [] },
      repair: parsedDamageData?.conditionAssessment?.repairEstimate || { estimated_repair_cost: 0 },
      summary: `AI Valuation complete: Estimated market value of ₹${pricing.market_price.toLocaleString('en-IN')}`,
      recommendation: pricing.condition === 'excellent' || pricing.condition === 'good'
        ? "Vehicle is verified for immediate auction listing."
        : "Minor repairs recommended prior to auction for optimal price.",
      metadata: {
        timestamp: new Date().toISOString(),
        engineVersion: "v4.1-hybrid"
      },

      // Debug
      debug: pricing.debug,
    };

    // Add damage-specific fields if damage data was provided
    if (parsedDamageData && pricing.xgboost_base_price !== undefined) {
      response.xgboost_base_price = pricing.xgboost_base_price;
      response.damage_adjusted_price = pricing.damage_adjusted_price;
      response.damage_penalty_percent = pricing.damage_penalty_percent;
      response.final_valuation = pricing.final_valuation;
      
      // Add camelCase aliases
      response.xgboostBasePrice = pricing.xgboost_base_price;
      response.damageAdjustedPrice = pricing.damage_adjusted_price;
      response.damagePenaltyPercent = pricing.damage_penalty_percent;
      response.finalValuation = pricing.final_valuation;
    }

    res.json(response);
  } catch (err) {
    console.error("[PRICE API] Error:", err);
    res.status(500).json({
      error: "Failed to calculate valuation",
      details: err.message,
    });
  }
};
