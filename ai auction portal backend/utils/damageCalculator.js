/**
 * ═══════════════════════════════════════════════════════════════════
 * DAMAGE CALCULATOR v1.0
 * 
 * Purpose: Calculate damage penalty percentage for vehicle valuation
 * 
 * Damage Integration:
 *   - XGBoost prediction: 80% weight (primary predictor)
 *   - Damage adjustment: 20% weight (secondary adjustment)
 *   - Final Price = (XGBoost × 0.80) + (DamageAdjusted × 0.20)
 * 
 * Damage Types:
 *   - dent (8% per damage)
 *   - scratch (3% per damage)
 *   - crack (12% per damage)
 *   - glass shatter (15% per damage)
 *   - lamp broken (10% per damage)
 *   - tire flat (5% per damage)
 * 
 * Key Principles:
 *   - Confidence-weighted penalties
 *   - Diminishing returns for multiple damages
 *   - Capped at 50% maximum penalty
 *   - Category-based severity classification
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Damage Severity Weights ─────────────────────────────────────
const DAMAGE_WEIGHTS = {
  'dent': 8,              // 8% per dent (structural concern)
  'scratch': 3,           // 3% per scratch (cosmetic)
  'crack': 12,            // 12% per crack (structural, safety)
  'glass shatter': 15,    // 15% (safety critical)
  'lamp broken': 10,      // 10% (functional, safety)
  'tire flat': 5          // 5% (easily fixable)
};

// ── Damage Categories ───────────────────────────────────────────
const STRUCTURAL_DAMAGES = ['crack', 'dent'];
const COSMETIC_DAMAGES = ['scratch'];
const FUNCTIONAL_DAMAGES = ['lamp broken', 'tire flat', 'glass shatter'];

// ── Configuration ───────────────────────────────────────────────
const CONFIG = {
  MAX_PENALTY: 50,           // Maximum penalty percentage
  DIMINISHING_THRESHOLD: 40, // Apply diminishing returns above this
  MULTIPLE_DAMAGE_MULTIPLIER: 1.2, // 20% increase if 5+ damages
  MULTIPLE_DAMAGE_THRESHOLD: 5
};

/**
 * Calculate damage penalty percentage
 * 
 * @param {Array} damages - Array of damage detections
 * @returns {Object} Penalty details
 */
function calculateDamagePenalty(damages) {
  if (!damages || damages.length === 0) {
    return {
      penalty_percent: 0,
      total_damages: 0,
      damages_by_type: {},
      has_structural_damage: false,
      has_cosmetic_damage: false,
      has_functional_damage: false,
      categories: [],
      severity_level: 'pristine'
    };
  }

  let totalPenalty = 0;
  const damagesByType = {};
  
  let hasStructural = false;
  let hasCosmetic = false;
  let hasFunctional = false;

  // ── Calculate Base Penalty ────────────────────────────────────
  damages.forEach(damage => {
    const damageType = damage.type;
    const confidence = damage.confidence / 100; // Convert to 0-1
    
    // Get base weight for this damage type
    const baseWeight = DAMAGE_WEIGHTS[damageType] || 5; // Default 5% if unknown
    
    // Calculate confidence-weighted penalty
    const damageImpact = baseWeight * confidence;
    totalPenalty += damageImpact;
    
    // Track damage counts by type
    damagesByType[damageType] = (damagesByType[damageType] || 0) + 1;
    
    // Check categories
    if (STRUCTURAL_DAMAGES.includes(damageType)) {
      hasStructural = true;
    }
    if (COSMETIC_DAMAGES.includes(damageType)) {
      hasCosmetic = true;
    }
    if (FUNCTIONAL_DAMAGES.includes(damageType)) {
      hasFunctional = true;
    }
  });

  // ── Apply Diminishing Returns ─────────────────────────────────
  if (totalPenalty > CONFIG.DIMINISHING_THRESHOLD) {
    const excess = totalPenalty - CONFIG.DIMINISHING_THRESHOLD;
    totalPenalty = CONFIG.DIMINISHING_THRESHOLD + (excess * 0.7); // 70% of excess
  }

  // ── Multiple Damage Multiplier ────────────────────────────────
  if (damages.length >= CONFIG.MULTIPLE_DAMAGE_THRESHOLD) {
    totalPenalty *= CONFIG.MULTIPLE_DAMAGE_MULTIPLIER;
  }

  // ── Cap at Maximum Penalty ────────────────────────────────────
  totalPenalty = Math.min(totalPenalty, CONFIG.MAX_PENALTY);

  // ── Build Category List ───────────────────────────────────────
  const categories = [];
  if (hasStructural) categories.push('structural');
  if (hasCosmetic) categories.push('cosmetic');
  if (hasFunctional) categories.push('functional');

  // ── Determine Severity Level ──────────────────────────────────
  const severityLevel = getSeverityLevel(totalPenalty, hasStructural);

  return {
    penalty_percent: Math.round(totalPenalty * 100) / 100,
    total_damages: damages.length,
    damages_by_type: damagesByType,
    has_structural_damage: hasStructural,
    has_cosmetic_damage: hasCosmetic,
    has_functional_damage: hasFunctional,
    categories,
    severity_level: severityLevel
  };
}

/**
 * Calculate final hybrid price with damage adjustment
 * 
 * @param {Number} xgboostPrice - XGBoost predicted price
 * @param {Number} damagePenaltyPercent - Damage penalty (0-50)
 * @returns {Object} Pricing breakdown
 */
function calculateDamageAdjustedPrice(xgboostPrice, damagePenaltyPercent) {
  const xgboost = Number(xgboostPrice) || 0;
  const penaltyDecimal = (damagePenaltyPercent || 0) / 100;
  
  // Calculate damage adjusted price
  const damageAdjustedPrice = xgboost * (1 - penaltyDecimal);
  
  // Final hybrid: 80% XGBoost + 20% Damage Adjusted
  const finalPrice = (xgboost * 0.80) + (damageAdjustedPrice * 0.20);
  
  return {
    xgboost_base_price: Math.round(xgboost),
    damage_penalty_percent: Math.round(penaltyDecimal * 10000) / 100, // 2 decimals
    damage_adjusted_price: Math.round(damageAdjustedPrice),
    final_valuation: Math.round(finalPrice),
    
    // Debug breakdown
    debug: {
      xgboost_contribution: Math.round(xgboost * 0.80),
      damage_contribution: Math.round(damageAdjustedPrice * 0.20),
      price_reduction: Math.round(xgboost - finalPrice),
      reduction_percent: Math.round((1 - finalPrice / xgboost) * 10000) / 100
    }
  };
}

/**
 * Determine severity level from penalty percentage
 * 
 * @param {Number} penaltyPercent - Penalty percentage (0-50)
 * @param {Boolean} hasStructuralDamage - Whether structural damage exists
 * @returns {String} Severity level
 */
function getSeverityLevel(penaltyPercent, hasStructuralDamage = false) {
  if (penaltyPercent === 0) {
    return 'pristine';
  } else if (penaltyPercent < 8) {
    return 'minor';
  } else if (penaltyPercent < 18) {
    return 'moderate';
  } else if (penaltyPercent < 30) {
    return hasStructuralDamage ? 'major' : 'moderate';
  } else {
    return 'severe';
  }
}

/**
 * Generate damage report summary for display
 * 
 * @param {Object} damageData - Damage detection results
 * @param {Object} pricing - Pricing breakdown
 * @returns {Object} Human-readable report
 */
function generateDamageReport(damageData, pricing) {
  const { damages, damage_summary } = damageData;
  const { penalty_percent, severity_level, damages_by_type, categories } = damage_summary || {};
  
  // Count damages by severity
  const bySeverity = {
    minor: 0,
    moderate: 0,
    severe: 0
  };
  
  if (damages && Array.isArray(damages)) {
    damages.forEach(d => {
      if (d.severity) {
        bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
      }
    });
  }
  
  return {
    summary: {
      total_damages: damages?.length || 0,
      severity_level: severity_level || 'unknown',
      penalty_percent: penalty_percent || 0,
      categories: categories || []
    },
    damages_by_type: damages_by_type || {},
    damages_by_severity: bySeverity,
    pricing: {
      xgboost_price: pricing?.xgboost_base_price || 0,
      damage_adjusted: pricing?.damage_adjusted_price || 0,
      final_price: pricing?.final_valuation || 0,
      reduction: pricing?.debug?.price_reduction || 0,
      reduction_percent: pricing?.debug?.reduction_percent || 0
    },
    recommendations: generateRecommendations(severity_level, categories)
  };
}

/**
 * Generate recommendations based on damage assessment
 * 
 * @param {String} severityLevel - Severity level
 * @param {Array} categories - Damage categories
 * @returns {Array} Recommendations
 */
function generateRecommendations(severityLevel, categories = []) {
  const recommendations = [];
  
  if (severityLevel === 'pristine') {
    recommendations.push('Vehicle is in excellent condition');
    recommendations.push('No significant damage detected');
    return recommendations;
  }
  
  if (categories.includes('structural')) {
    recommendations.push('⚠️ Structural damage detected - Professional inspection recommended');
  }
  
  if (categories.includes('functional')) {
    recommendations.push('⚠️ Functional components affected - Repair costs should be considered');
  }
  
  if (severityLevel === 'severe' || severityLevel === 'major') {
    recommendations.push('❌ Major damage present - Comprehensive repair estimate advised before purchase');
  }
  
  if (categories.includes('cosmetic') && categories.length === 1) {
    recommendations.push('✓ Only cosmetic damage - Relatively minor impact on value');
  }
  
  return recommendations;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * VEHICLE CONDITION ASSESSMENT SYSTEM v2.0
 * 
 * Automatically generates comprehensive condition scores after YOLO
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Condition Categories ────────────────────────────────────────
const CONDITION_CATEGORIES = {
  EXCELLENT: { min: 90, max: 100, label: 'Excellent', color: 'green' },
  VERY_GOOD: { min: 80, max: 89, label: 'Very Good', color: 'blue' },
  GOOD: { min: 70, max: 79, label: 'Good', color: 'cyan' },
  FAIR: { min: 60, max: 69, label: 'Fair', color: 'yellow' },
  POOR: { min: 40, max: 59, label: 'Poor', color: 'orange' },
  SALVAGE: { min: 0, max: 39, label: 'Salvage', color: 'red' }
};

// ── Damage Severity Ranges ──────────────────────────────────────
const DAMAGE_SEVERITY_RANGES = {
  MINOR: { min: 0, max: 10, label: 'Minor', impact: 'low' },
  MODERATE: { min: 11, max: 25, label: 'Moderate', impact: 'medium' },
  SIGNIFICANT: { min: 26, max: 50, label: 'Significant', impact: 'high' },
  SEVERE: { min: 51, max: 100, label: 'Severe', impact: 'critical' }
};

/**
 * Calculate Exterior Condition Score
 * 
 * Based on:
 * - Number of damages
 * - Types of damages
 * - Damage locations
 * - Visual impact
 * 
 * @param {Array} damages - Detected damages
 * @returns {Number} Score 0-100
 */
function calculateExteriorConditionScore(damages) {
  if (!damages || damages.length === 0) {
    return 100; // Perfect exterior
  }

  let score = 100;
  
  // ── Deduct Based on Damage Count ──────────────────────────────
  const damageCountPenalty = Math.min(damages.length * 3, 30); // Max 30 points
  score -= damageCountPenalty;
  
  // ── Deduct Based on Damage Types ──────────────────────────────
  damages.forEach(damage => {
    const type = damage.type;
    const confidence = damage.confidence / 100;
    
    // Weight by damage type visibility/severity
    const typeWeight = {
      'scratch': 2,        // Low visibility
      'dent': 4,          // Medium visibility
      'crack': 5,         // High visibility + structural
      'glass shatter': 6, // Very visible + safety
      'lamp broken': 5,   // Visible + functional
      'tire flat': 3      // Functional but replaceable
    };
    
    const weight = typeWeight[type] || 3;
    score -= weight * confidence;
  });
  
  // ── Apply Confidence Factor ───────────────────────────────────
  const avgConfidence = damages.reduce((sum, d) => sum + d.confidence, 0) / damages.length;
  const confidenceFactor = avgConfidence / 100;
  
  // Higher confidence = more certain about poor condition
  score *= (1 - (confidenceFactor * 0.1)); // Max 10% additional reduction
  
  // ── Ensure Valid Range ────────────────────────────────────────
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate Damage Severity Score
 * 
 * Represents overall damage severity (0-100)
 * 
 * @param {Array} damages - Detected damages
 * @param {Number} penaltyPercent - Calculated damage penalty
 * @returns {Number} Score 0-100
 */
function calculateDamageSeverityScore(damages, penaltyPercent) {
  if (!damages || damages.length === 0) {
    return 0; // No damage
  }
  
  // Base severity from penalty percentage
  let severityScore = penaltyPercent * 2; // Scale to 0-100 (penalty max is 50)
  
  // Adjust for damage count
  const damageCountFactor = Math.min(damages.length / 10, 1); // Normalize to max 10 damages
  severityScore += damageCountFactor * 20; // Add up to 20 points
  
  // Adjust for structural damages
  const structuralCount = damages.filter(d => 
    STRUCTURAL_DAMAGES.includes(d.type)
  ).length;
  
  if (structuralCount > 0) {
    severityScore += structuralCount * 5; // +5 per structural damage
  }
  
  // Adjust for safety-critical damages
  const safetyCritical = damages.filter(d => 
    ['glass shatter', 'lamp broken', 'crack'].includes(d.type)
  ).length;
  
  if (safetyCritical > 0) {
    severityScore += safetyCritical * 4; // +4 per safety issue
  }
  
  // Ensure valid range
  return Math.max(0, Math.min(100, Math.round(severityScore)));
}

/**
 * Calculate Final Condition Score
 * 
 * Weighted combination of exterior and damage severity
 * 
 * @param {Number} exteriorScore - Exterior condition (0-100)
 * @param {Number} damageSeverityScore - Damage severity (0-100)
 * @returns {Number} Final score 0-100
 */
function calculateFinalConditionScore(exteriorScore, damageSeverityScore) {
  // Weight: 60% exterior, 40% inverse of damage severity
  const inverseDamageSeverity = 100 - damageSeverityScore;
  const finalScore = (exteriorScore * 0.6) + (inverseDamageSeverity * 0.4);
  
  return Math.round(finalScore);
}

/**
 * Get Condition Category from Score
 * 
 * @param {Number} score - Condition score (0-100)
 * @returns {Object} Category details
 */
function getConditionCategory(score) {
  for (const [key, category] of Object.entries(CONDITION_CATEGORIES)) {
    if (score >= category.min && score <= category.max) {
      return {
        key: key,
        label: category.label,
        color: category.color,
        score: score
      };
    }
  }
  
  return {
    key: 'UNKNOWN',
    label: 'Unknown',
    color: 'gray',
    score: score
  };
}

/**
 * Get Damage Severity Category
 * 
 * @param {Number} severityScore - Severity score (0-100)
 * @returns {Object} Severity details
 */
function getDamageSeverityCategory(severityScore) {
  for (const [key, range] of Object.entries(DAMAGE_SEVERITY_RANGES)) {
    if (severityScore >= range.min && severityScore <= range.max) {
      return {
        key: key,
        label: range.label,
        impact: range.impact,
        score: severityScore
      };
    }
  }
  
  return {
    key: 'UNKNOWN',
    label: 'Unknown',
    impact: 'unknown',
    score: severityScore
  };
}

/**
 * Generate Detailed Recommendations
 * 
 * @param {Object} conditionAssessment - Full assessment
 * @returns {Array} Detailed recommendations
 */
function generateDetailedRecommendations(conditionAssessment) {
  const { conditionCategory, damageSeverityCategory, damages, categories } = conditionAssessment;
  const recommendations = [];
  
  // ── Overall Condition Recommendations ─────────────────────────
  if (conditionCategory.key === 'EXCELLENT') {
    recommendations.push({
      type: 'positive',
      priority: 'low',
      message: 'Vehicle is in excellent condition with minimal to no damage',
      action: 'No immediate repairs required'
    });
  } else if (conditionCategory.key === 'VERY_GOOD') {
    recommendations.push({
      type: 'positive',
      priority: 'low',
      message: 'Vehicle is in very good condition with minor cosmetic issues',
      action: 'Consider minor cosmetic touch-ups for optimal presentation'
    });
  } else if (conditionCategory.key === 'GOOD') {
    recommendations.push({
      type: 'info',
      priority: 'medium',
      message: 'Vehicle is in good condition with some visible damage',
      action: 'Address visible damages to improve marketability'
    });
  } else if (conditionCategory.key === 'FAIR') {
    recommendations.push({
      type: 'warning',
      priority: 'medium',
      message: 'Vehicle has noticeable damage affecting value',
      action: 'Professional inspection and repair estimate recommended'
    });
  } else if (conditionCategory.key === 'POOR') {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: 'Vehicle has significant damage requiring attention',
      action: 'Comprehensive repair plan needed before sale'
    });
  } else if (conditionCategory.key === 'SALVAGE') {
    recommendations.push({
      type: 'critical',
      priority: 'critical',
      message: 'Vehicle may be salvage-grade with severe damage',
      action: 'Professional assessment required - may need salvage title'
    });
  }
  
  // ── Category-Specific Recommendations ─────────────────────────
  if (categories.includes('structural')) {
    recommendations.push({
      type: 'critical',
      priority: 'high',
      message: 'Structural damage detected affecting vehicle integrity',
      action: 'Mandatory structural inspection by certified mechanic'
    });
  }
  
  if (categories.includes('functional')) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: 'Functional components require repair',
      action: 'Repair or replace affected functional parts before use'
    });
  }
  
  if (categories.includes('cosmetic') && categories.length === 1) {
    recommendations.push({
      type: 'info',
      priority: 'low',
      message: 'Only cosmetic damage present',
      action: 'Cosmetic repairs optional based on buyer preferences'
    });
  }
  
  // ── Damage Severity Recommendations ───────────────────────────
  if (damageSeverityCategory.key === 'SEVERE') {
    recommendations.push({
      type: 'critical',
      priority: 'critical',
      message: 'Severe damage level detected',
      action: 'Immediate professional assessment and extensive repairs needed'
    });
  } else if (damageSeverityCategory.key === 'SIGNIFICANT') {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: 'Significant damage requiring substantial repairs',
      action: 'Obtain detailed repair estimates before purchasing/selling'
    });
  }
  
  return recommendations;
}

/**
 * Estimate Repair Costs
 * 
 * @param {Array} damages - Detected damages
 * @param {Number} marketPrice - Vehicle market price
 * @returns {Object} Repair cost estimates
 */
function estimateRepairCosts(damages, marketPrice) {
  if (!damages || damages.length === 0) {
    return {
      estimated_repair_cost: 0,
      repair_cost_range: { min: 0, max: 0 },
      repair_to_value_ratio: 0,
      economic_to_repair: true
    };
  }
  
  // Base repair costs per damage type (in INR)
  const repairCosts = {
    'scratch': { min: 2500, max: 8500 },
    'dent': { min: 6000, max: 25000 },
    'crack': { min: 10000, max: 35000 },
    'glass shatter': { min: 5000, max: 18000 },
    'lamp broken': { min: 3500, max: 12000 },
    'tire flat': { min: 2000, max: 6000 }
  };
  
  let totalMin = 0;
  let totalMax = 0;
  
  damages.forEach(damage => {
    const rawType = (damage.type || '').toLowerCase().replace(/_/g, ' ');
    const costs = repairCosts[rawType] || { min: 4000, max: 15000 };
    const rawConf = typeof damage.confidence === 'number' ? damage.confidence : 85;
    const confidence = rawConf > 1 ? rawConf / 100 : rawConf;
    
    totalMin += costs.min * confidence;
    totalMax += costs.max * confidence;
  });
  
  const estimatedCost = (totalMin + totalMax) / 2;
  const repairToValueRatio = marketPrice > 0 ? (estimatedCost / marketPrice) * 100 : 0;
  const economicToRepair = marketPrice > 0 ? repairToValueRatio < 30 : true;
  
  return {
    estimated_repair_cost: Math.round(estimatedCost),
    repair_cost_range: {
      min: Math.round(totalMin),
      max: Math.round(totalMax)
    },
    repair_to_value_ratio: Math.round(repairToValueRatio * 100) / 100,
    economic_to_repair: economicToRepair
  };
}

/**
 * Calculate Value Impact
 * 
 * @param {Number} originalPrice - Original vehicle price
 * @param {Number} damageAdjustedPrice - Price after damage adjustment
 * @param {Number} penaltyPercent - Damage penalty percentage
 * @returns {Object} Value impact details
 */
function calculateValueImpact(originalPrice, damageAdjustedPrice, penaltyPercent) {
  const valueReduction = originalPrice - damageAdjustedPrice;
  const reductionPercent = (valueReduction / originalPrice) * 100;
  
  return {
    original_value: Math.round(originalPrice),
    adjusted_value: Math.round(damageAdjustedPrice),
    value_reduction: Math.round(valueReduction),
    reduction_percent: Math.round(reductionPercent * 100) / 100,
    penalty_applied: Math.round(penaltyPercent * 100) / 100
  };
}

/**
 * Generate Complete Vehicle Condition Assessment
 * 
 * Main function that ties everything together
 * 
 * @param {Array} damages - YOLO detected damages
 * @param {Object} damageData - Full damage detection result
 * @param {Number} marketPrice - Vehicle market price
 * @returns {Object} Complete condition assessment
 */
function generateVehicleConditionAssessment(damages, damageData, marketPrice = 0) {
  // Calculate penalty (existing logic)
  const penaltyResult = calculateDamagePenalty(damages);
  const { penalty_percent, categories, severity_level } = penaltyResult;
  
  // Calculate condition scores
  const exteriorScore = calculateExteriorConditionScore(damages);
  const damageSeverityScore = calculateDamageSeverityScore(damages, penalty_percent);
  const finalConditionScore = calculateFinalConditionScore(exteriorScore, damageSeverityScore);
  
  // Get categories
  const conditionCategory = getConditionCategory(finalConditionScore);
  const damageSeverityCategory = getDamageSeverityCategory(damageSeverityScore);
  
  // Build complete assessment
  const assessment = {
    // ── Scores ───────────────────────────────────────────────────
    scores: {
      exterior_condition: exteriorScore,
      damage_severity: damageSeverityScore,
      final_condition: finalConditionScore
    },
    
    // ── Categories ───────────────────────────────────────────────
    conditionCategory: conditionCategory,
    damageSeverityCategory: damageSeverityCategory,
    
    // ── Damage Summary ───────────────────────────────────────────
    damageSummary: {
      total_damages: damages?.length || 0,
      damage_types: penaltyResult.damages_by_type,
      categories: categories,
      severity_level: severity_level,
      penalty_percent: penalty_percent
    },
    
    // ── For MongoDB Storage ──────────────────────────────────────
    conditionScore: finalConditionScore,
    conditionCategory: conditionCategory.label,
    damageSeverity: damageSeverityScore,
    
    // ── Timestamps ───────────────────────────────────────────────
    assessed_at: new Date().toISOString()
  };
  
  // Always estimate repair costs
  assessment.repairEstimate = estimateRepairCosts(damages, marketPrice);
  
  // Generate recommendations
  assessment.recommendedRepairs = generateDetailedRecommendations({
    ...assessment,
    damages,
    categories
  });
  
  // Calculate value impact if price provided
  if (marketPrice > 0) {
    const damageAdjustedPrice = marketPrice * (1 - penalty_percent / 100);
    assessment.valueImpact = calculateValueImpact(marketPrice, damageAdjustedPrice, penalty_percent);
  }
  
  return assessment;
}

module.exports = {
  calculateDamagePenalty,
  calculateDamageAdjustedPrice,
  generateDamageReport,
  getSeverityLevel,
  generateVehicleConditionAssessment,
  calculateExteriorConditionScore,
  calculateDamageSeverityScore,
  calculateFinalConditionScore,
  getConditionCategory,
  getDamageSeverityCategory,
  generateDetailedRecommendations,
  estimateRepairCosts,
  calculateValueImpact,
  DAMAGE_WEIGHTS,
  CONFIG,
  CONDITION_CATEGORIES,
  DAMAGE_SEVERITY_RANGES
};
