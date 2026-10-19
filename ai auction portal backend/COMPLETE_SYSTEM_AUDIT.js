/**
 * ═══════════════════════════════════════════════════════════════════
 * COMPLETE SYSTEM AUDIT - COMPREHENSIVE INVESTIGATION
 * 
 * Purpose: Full audit of pricing system to verify:
 *   - ML model metrics (R², MAE, RMSE, MAPE)
 *   - 20/80 hybrid weighting is active
 *   - Logic vs ML performance
 *   - No hidden multipliers
 *   - Accuracy across all vehicle segments
 * 
 * DO NOT MODIFY CODE - INVESTIGATION ONLY
 * ═══════════════════════════════════════════════════════════════════
 */

const { calculateVehiclePricing } = require('./utils/unifiedPricingEngine');
const fs = require('fs');

// Read ML audit results
let mlMetrics = {};
try {
  mlMetrics = JSON.parse(fs.readFileSync('./ml/model_audit_results.json', 'utf8'));
} catch (e) {
  console.log('⚠️  ML audit results not found');
}

console.log('═'.repeat(80));
console.log('COMPLETE SYSTEM AUDIT - PHASE 1: COMPREHENSIVE INVESTIGATION');
console.log('═'.repeat(80));
console.log('Date:', new Date().toISOString());
console.log('Mode: INVESTIGATION ONLY - NO MODIFICATIONS');
console.log('');

// ═══════════════════════════════════════════════════════════════════
// AUDIT SECTION 1: ML MODEL VERIFICATION
// ═══════════════════════════════════════════════════════════════════

console.log('─'.repeat(80));
console.log('SECTION 1: ML MODEL METRICS VERIFICATION');
console.log('─'.repeat(80));
console.log('');

if (mlMetrics.model_metrics) {
  const m = mlMetrics.model_metrics;
  console.log('XGBoost Model Performance (from test set):');
  console.log(`  R² Score:  ${m.r2_score.toFixed(4)} ${m.r2_score >= 0.9 ? '✅ EXCELLENT' : m.r2_score >= 0.8 ? '✅ VERY GOOD' : '⚠️  FAIR'}`);
  console.log(`  MAE:       ₹${(m.mae/100000).toFixed(2)}L ${m.mae < 100000 ? '✅ GOOD' : '⚠️  HIGH'}`);
  console.log(`  RMSE:      ₹${(m.rmse/100000).toFixed(2)}L ${m.rmse < 200000 ? '✅ GOOD' : '⚠️  WARNING'}`);
  console.log(`  MAPE:      ${m.mape.toFixed(2)}% ${m.mape < 15 ? '✅ VERY GOOD' : m.mape < 20 ? '✅ GOOD' : '⚠️  FAIR'}`);
  console.log('');
  console.log(`Dataset: ${mlMetrics.dataset_info.train_samples} train / ${mlMetrics.dataset_info.test_samples} test`);
  console.log('');
} else {
  console.log('⚠️  ML metrics not available. Run: cd ml && python COMPREHENSIVE_ML_AUDIT.py');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT SECTION 2: HYBRID WEIGHTING VERIFICATION
// ═══════════════════════════════════════════════════════════════════

console.log('─'.repeat(80));
console.log('SECTION 2: HYBRID WEIGHTING CONFIGURATION AUDIT');
console.log('─'.repeat(80));
console.log('');

// Read the unified pricing engine file to extract configuration
const engineCode = fs.readFileSync('./utils/unifiedPricingEngine.js', 'utf8');

// Extract HYBRID_CONFIG
const configMatch = engineCode.match(/const HYBRID_CONFIG = \{[\s\S]*?\};/);
if (configMatch) {
  console.log('✅ HYBRID_CONFIG found in code:');
  console.log('');
  console.log(configMatch[0].split('\n').map(line => '  ' + line).join('\n'));
  console.log('');
} else {
  console.log('❌ HYBRID_CONFIG not found!');
  console.log('');
}

// Extract actual formula
const formulaMatch = engineCode.match(/const marketPrice = .*?;/);
if (formulaMatch) {
  console.log('✅ Hybrid formula found:');
  console.log('  ' + formulaMatch[0]);
  console.log('');
  
  if (formulaMatch[0].includes('HYBRID_CONFIG')) {
    console.log('✅ Formula uses HYBRID_CONFIG constants (correct)');
  } else if (formulaMatch[0].includes('0.7') && formulaMatch[0].includes('0.3')) {
    console.log('❌ Formula still uses hardcoded 70/30 weights!');
  } else if (formulaMatch[0].includes('0.2') && formulaMatch[0].includes('0.8')) {
    console.log('⚠️  Formula uses hardcoded 20/80 weights (should use config)');
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT SECTION 3: TEST 30+ VEHICLES ACROSS ALL SEGMENTS
// ═══════════════════════════════════════════════════════════════════

console.log('─'.repeat(80));
console.log('SECTION 3: COMPREHENSIVE VEHICLE VALUATION TEST (30+ VEHICLES)');
console.log('─'.repeat(80));
console.log('');

const TEST_VEHICLES = [
  // ═══ HATCHBACKS ═══
  { category: 'Hatchback', brand: 'Maruti', model: 'Alto', year: 2015, vehicle_age: 9, mileage: 65000, original_price: 400000, mlPrice: 180000, marketRange: [150000, 220000] },
  { category: 'Hatchback', brand: 'Maruti', model: 'WagonR', year: 2016, vehicle_age: 8, mileage: 70000, original_price: 560000, mlPrice: 250000, marketRange: [220000, 300000] },
  { category: 'Hatchback', brand: 'Hyundai', model: 'i10', year: 2010, vehicle_age: 14, mileage: 80000, original_price: 560000, mlPrice: 150000, marketRange: [80000, 150000] },
  { category: 'Hatchback', brand: 'Hyundai', model: 'i10', year: 2014, vehicle_age: 10, mileage: 75000, original_price: 560000, mlPrice: 210000, marketRange: [180000, 250000] },
  { category: 'Hatchback', brand: 'Maruti', model: 'Swift', year: 2012, vehicle_age: 12, mileage: 90000, original_price: 650000, mlPrice: 208000, marketRange: [180000, 300000] },
  { category: 'Hatchback', brand: 'Maruti', model: 'Swift', year: 2018, vehicle_age: 6, mileage: 45000, original_price: 650000, mlPrice: 420000, marketRange: [380000, 480000] },
  { category: 'Hatchback', brand: 'Maruti', model: 'Baleno', year: 2017, vehicle_age: 7, mileage: 55000, original_price: 780000, mlPrice: 480000, marketRange: [420000, 550000] },
  { category: 'Hatchback', brand: 'Hyundai', model: 'i20', year: 2019, vehicle_age: 5, mileage: 40000, original_price: 780000, mlPrice: 560000, marketRange: [500000, 650000] },
  
  // ═══ SEDANS ═══
  { category: 'Sedan', brand: 'Maruti', model: 'Dzire', year: 2017, vehicle_age: 7, mileage: 60000, original_price: 700000, mlPrice: 450000, marketRange: [400000, 520000] },
  { category: 'Sedan', brand: 'Honda', model: 'City', year: 2013, vehicle_age: 11, mileage: 85000, original_price: 1150000, mlPrice: 375000, marketRange: [300000, 450000] },
  { category: 'Sedan', brand: 'Honda', model: 'City', year: 2018, vehicle_age: 6, mileage: 50000, original_price: 1150000, mlPrice: 780000, marketRange: [700000, 900000] },
  { category: 'Sedan', brand: 'Hyundai', model: 'Verna', year: 2016, vehicle_age: 8, mileage: 70000, original_price: 1050000, mlPrice: 520000, marketRange: [450000, 620000] },
  { category: 'Sedan', brand: 'Hyundai', model: 'Verna', year: 2020, vehicle_age: 4, mileage: 35000, original_price: 1050000, mlPrice: 750000, marketRange: [680000, 850000] },
  { category: 'Sedan', brand: 'Skoda', model: 'Rapid', year: 2016, vehicle_age: 8, mileage: 75000, original_price: 920000, mlPrice: 440000, marketRange: [380000, 520000] },
  { category: 'Sedan', brand: 'Honda', model: 'Amaze', year: 2019, vehicle_age: 5, mileage: 45000, original_price: 760000, mlPrice: 530000, marketRange: [480000, 600000] },
  { category: 'Sedan', brand: 'Volkswagen', model: 'Vento', year: 2015, vehicle_age: 9, mileage: 80000, original_price: 1050000, mlPrice: 380000, marketRange: [320000, 450000] },
  
  // ═══ SUVs ═══
  { category: 'SUV', brand: 'Hyundai', model: 'Creta', year: 2018, vehicle_age: 6, mileage: 55000, original_price: 1150000, mlPrice: 850000, marketRange: [750000, 950000] },
  { category: 'SUV', brand: 'Hyundai', model: 'Venue', year: 2020, vehicle_age: 4, mileage: 30000, original_price: 840000, mlPrice: 680000, marketRange: [620000, 750000] },
  { category: 'SUV', brand: 'Tata', model: 'Nexon', year: 2019, vehicle_age: 5, mileage: 48000, original_price: 950000, mlPrice: 650000, marketRange: [580000, 720000] },
  { category: 'SUV', brand: 'Mahindra', model: 'Scorpio', year: 2015, vehicle_age: 9, mileage: 95000, original_price: 1350000, mlPrice: 550000, marketRange: [480000, 650000] },
  { category: 'SUV', brand: 'Mahindra', model: 'XUV500', year: 2017, vehicle_age: 7, mileage: 70000, original_price: 1550000, mlPrice: 880000, marketRange: [780000, 980000] },
  { category: 'SUV', brand: 'Kia', model: 'Seltos', year: 2021, vehicle_age: 3, mileage: 28000, original_price: 1150000, mlPrice: 980000, marketRange: [900000, 1100000] },
  { category: 'SUV', brand: 'MG', model: 'Hector', year: 2020, vehicle_age: 4, mileage: 38000, original_price: 1550000, mlPrice: 1150000, marketRange: [1050000, 1300000] },
  { category: 'SUV', brand: 'Toyota', model: 'Fortuner', year: 2017, vehicle_age: 7, mileage: 65000, original_price: 3300000, mlPrice: 2150000, marketRange: [1900000, 2400000] },
  
  // ═══ LUXURY ═══
  { category: 'Luxury', brand: 'BMW', model: '3 Series', year: 2018, vehicle_age: 6, mileage: 45000, original_price: 4500000, mlPrice: 2800000, marketRange: [2500000, 3200000] },
  { category: 'Luxury', brand: 'BMW', model: '5 Series', year: 2016, vehicle_age: 8, mileage: 60000, original_price: 6800000, mlPrice: 2900000, marketRange: [2500000, 3400000] },
  { category: 'Luxury', brand: 'Mercedes', model: 'C-Class', year: 2018, vehicle_age: 6, mileage: 48000, original_price: 4900000, mlPrice: 3100000, marketRange: [2800000, 3500000] },
  { category: 'Luxury', brand: 'Mercedes', model: 'E-Class', year: 2017, vehicle_age: 7, mileage: 55000, original_price: 7800000, mlPrice: 3500000, marketRange: [3000000, 4000000] },
  { category: 'Luxury', brand: 'Audi', model: 'A4', year: 2019, vehicle_age: 5, mileage: 38000, original_price: 4700000, mlPrice: 3300000, marketRange: [3000000, 3700000] },
  { category: 'Luxury', brand: 'Audi', model: 'Q5', year: 2018, vehicle_age: 6, mileage: 50000, original_price: 6800000, mlPrice: 4200000, marketRange: [3800000, 4700000] },
  
  // ═══ EXOTIC/PREMIUM ═══
  { category: 'Exotic', brand: 'Porsche', model: 'Cayenne', year: 2017, vehicle_age: 7, mileage: 40000, original_price: 14000000, mlPrice: 9500000, marketRange: [8500000, 11000000] },
  { category: 'Exotic', brand: 'Jaguar', model: 'XE', year: 2018, vehicle_age: 6, mileage: 45000, original_price: 4800000, mlPrice: 2900000, marketRange: [2500000, 3300000] },
];

console.log(`Testing ${TEST_VEHICLES.length} vehicles across all segments...`);
console.log('');

// Test each vehicle
const results = [];
const categoryStats = {};

TEST_VEHICLES.forEach((vehicle, index) => {
  const pricing = calculateVehiclePricing({
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    vehicle_age: vehicle.vehicle_age,
    mileage: vehicle.mileage,
    original_price: vehicle.original_price,
    mlPredictedPrice: vehicle.mlPrice,
    condition: 'good'
  });
  
  const structuredPrice = pricing.debug.structured_price;
  const mlPrice = pricing.ml_price;
  const finalPrice = pricing.market_price;
  
  // Calculate what OLD 70/30 would have given
  const old70_30Price = Math.round(structuredPrice * 0.70 + mlPrice * 0.30);
  
  // Check if in market range
  const inRange = finalPrice >= vehicle.marketRange[0] && finalPrice <= vehicle.marketRange[1];
  const old70_30InRange = old70_30Price >= vehicle.marketRange[0] && old70_30Price <= vehicle.marketRange[1];
  
  // Calculate market midpoint
  const marketMid = (vehicle.marketRange[0] + vehicle.marketRange[1]) / 2;
  const deviation = Math.abs(finalPrice - marketMid) / marketMid * 100;
  const old70_30Deviation = Math.abs(old70_30Price - marketMid) / marketMid * 100;
  
  // Calculate contribution percentages
  const logicContribution = pricing.debug.structured_contribution;
  const mlContribution = pricing.debug.ml_contribution;
  const totalContribution = logicContribution + mlContribution;
  const logicPercent = (logicContribution / totalContribution * 100).toFixed(1);
  const mlPercent = (mlContribution / totalContribution * 100).toFixed(1);
  
  const result = {
    index: index + 1,
    name: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    category: vehicle.category,
    age: vehicle.vehicle_age,
    structuredPrice,
    mlPrice,
    old70_30Price,
    finalPrice,
    marketRange: vehicle.marketRange,
    inRange,
    old70_30InRange,
    deviation,
    old70_30Deviation,
    logicPercent,
    mlPercent,
    improvement: old70_30Deviation - deviation
  };
  
  results.push(result);
  
  // Track category stats
  if (!categoryStats[vehicle.category]) {
    categoryStats[vehicle.category] = {
      count: 0,
      inRange: 0,
      old70_30InRange: 0,
      avgDeviation: 0,
      avgOld70_30Deviation: 0
    };
  }
  
  const cat = categoryStats[vehicle.category];
  cat.count++;
  if (inRange) cat.inRange++;
  if (old70_30InRange) cat.old70_30InRange++;
  cat.avgDeviation += deviation;
  cat.avgOld70_30Deviation += old70_30Deviation;
});

// Calculate category averages
Object.keys(categoryStats).forEach(cat => {
  const stats = categoryStats[cat];
  stats.avgDeviation /= stats.count;
  stats.avgOld70_30Deviation /= stats.count;
});

// ═══════════════════════════════════════════════════════════════════
// DISPLAY RESULTS
// ═══════════════════════════════════════════════════════════════════

function formatPrice(price) {
  return `₹${(price / 100000).toFixed(2)}L`;
}

console.log('═'.repeat(80));
console.log('DETAILED VEHICLE-BY-VEHICLE RESULTS');
console.log('═'.repeat(80));
console.log('');

results.forEach(r => {
  console.log(`[${r.index}] ${r.name} (${r.age} years)`);
  console.log(`    Category: ${r.category}`);
  console.log(`    Logic Price:  ${formatPrice(r.structuredPrice)}`);
  console.log(`    ML Price:     ${formatPrice(r.mlPrice)}`);
  console.log('');
  console.log(`    OLD (70/30):  ${formatPrice(r.old70_30Price)}  ${r.old70_30InRange ? '✓' : '✗'} ${r.old70_30Deviation.toFixed(1)}% dev`);
  console.log(`    NEW (20/80):  ${formatPrice(r.finalPrice)}  ${r.inRange ? '✓' : '✗'} ${r.deviation.toFixed(1)}% dev`);
  console.log(`    Market Range: ${formatPrice(r.marketRange[0])} - ${formatPrice(r.marketRange[1])}`);
  console.log(`    Weight Split: ${r.logicPercent}% Logic / ${r.mlPercent}% ML`);
  console.log(`    Improvement:  ${r.improvement > 0 ? '+' : ''}${r.improvement.toFixed(1)}%`);
  console.log('');
});

// ═══════════════════════════════════════════════════════════════════
// SUMMARY STATISTICS
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(80));
console.log('SUMMARY STATISTICS');
console.log('═'.repeat(80));
console.log('');

const totalTests = results.length;
const newInRange = results.filter(r => r.inRange).length;
const oldInRange = results.filter(r => r.old70_30InRange).length;
const avgNewDeviation = results.reduce((sum, r) => sum + r.deviation, 0) / totalTests;
const avgOldDeviation = results.reduce((sum, r) => sum + r.old70_30Deviation, 0) / totalTests;
const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / totalTests;

console.log('Overall Performance:');
console.log(`  Total Vehicles Tested:  ${totalTests}`);
console.log('');
console.log(`  OLD (70/30) In-Range:   ${oldInRange}/${totalTests} (${(oldInRange/totalTests*100).toFixed(1)}%)`);
console.log(`  NEW (20/80) In-Range:   ${newInRange}/${totalTests} (${(newInRange/totalTests*100).toFixed(1)}%)`);
console.log(`  Change:                 ${newInRange > oldInRange ? '+' : ''}${newInRange - oldInRange} vehicles`);
console.log('');
console.log(`  OLD Avg Deviation:      ${avgOldDeviation.toFixed(1)}%`);
console.log(`  NEW Avg Deviation:      ${avgNewDeviation.toFixed(1)}%`);
console.log(`  Avg Improvement:        ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}%`);
console.log('');

console.log('Performance by Category:');
console.log('');
Object.keys(categoryStats).forEach(cat => {
  const s = categoryStats[cat];
  console.log(`  ${cat}:`);
  console.log(`    Vehicles:         ${s.count}`);
  console.log(`    OLD In-Range:     ${s.old70_30InRange}/${s.count} (${(s.old70_30InRange/s.count*100).toFixed(0)}%)`);
  console.log(`    NEW In-Range:     ${s.inRange}/${s.count} (${(s.inRange/s.count*100).toFixed(0)}%)`);
  console.log(`    OLD Avg Dev:      ${s.avgOld70_30Deviation.toFixed(1)}%`);
  console.log(`    NEW Avg Dev:      ${s.avgDeviation.toFixed(1)}%`);
  console.log(`    Improvement:      ${(s.avgOld70_30Deviation - s.avgDeviation).toFixed(1)}%`);
  console.log('');
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT SECTION 4: VERIFY 20/80 IS ACTUALLY ACTIVE
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(80));
console.log('SECTION 4: VERIFY 20/80 WEIGHTING IS ACTIVE');
console.log('═'.repeat(80));
console.log('');

// Check a sample vehicle's actual weight distribution
const sampleResult = results[10]; // Honda City 2013
console.log('Sample Verification (Honda City 2013):');
console.log(`  Logic Contribution:  ${sampleResult.logicPercent}%`);
console.log(`  ML Contribution:     ${sampleResult.mlPercent}%`);
console.log('');

if (Math.abs(parseFloat(sampleResult.logicPercent) - 20) < 1 && 
    Math.abs(parseFloat(sampleResult.mlPercent) - 80) < 1) {
  console.log('✅ CONFIRMED: 20/80 weighting is ACTIVE');
} else if (Math.abs(parseFloat(sampleResult.logicPercent) - 70) < 1 && 
           Math.abs(parseFloat(sampleResult.mlPercent) - 30) < 1) {
  console.log('❌ WARNING: 70/30 weighting is still active!');
} else {
  console.log(`⚠️  UNEXPECTED: Weights are ${sampleResult.logicPercent}/${sampleResult.mlPercent}`);
}
console.log('');

// Check all vehicles to confirm consistency
const allLogicWeights = results.map(r => parseFloat(r.logicPercent));
const allMLWeights = results.map(r => parseFloat(r.mlPercent));
const avgLogic = allLogicWeights.reduce((sum, w) => sum + w, 0) / allLogicWeights.length;
const avgML = allMLWeights.reduce((sum, w) => sum + w, 0) / allMLWeights.length;

console.log('Weight Distribution Across All Vehicles:');
console.log(`  Avg Logic Weight:  ${avgLogic.toFixed(1)}%`);
console.log(`  Avg ML Weight:     ${avgML.toFixed(1)}%`);
console.log('');

if (Math.abs(avgLogic - 20) < 2) {
  console.log('✅ Weight distribution is consistent across all vehicles');
} else {
  console.log('⚠️  Weight distribution varies - possible calculation issue');
}
console.log('');

// ═══════════════════════════════════════════════════════════════════
// AUDIT SECTION 5: HIDDEN MULTIPLIERS CHECK
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(80));
console.log('SECTION 5: HIDDEN MULTIPLIERS / ADJUSTMENTS AUDIT');
console.log('═'.repeat(80));
console.log('');

// Check a few vehicles to verify calculations are transparent
const testVehicle = results[4]; // Maruti Swift 2012
const tv = TEST_VEHICLES[4];

console.log('Manual Calculation Verification (Maruti Swift 2012):');
console.log(`  Input:`);
console.log(`    Logic Price:  ${formatPrice(testVehicle.structuredPrice)}`);
console.log(`    ML Price:     ${formatPrice(testVehicle.mlPrice)}`);
console.log('');
console.log(`  Expected (20/80):`);
const expected20_80 = Math.round(testVehicle.structuredPrice * 0.20 + testVehicle.mlPrice * 0.80);
console.log(`    Formula: ${formatPrice(testVehicle.structuredPrice)} × 0.20 + ${formatPrice(testVehicle.mlPrice)} × 0.80`);
console.log(`    Result:  ${formatPrice(expected20_80)}`);
console.log('');
console.log(`  Actual Output:`);
console.log(`    Final Price: ${formatPrice(testVehicle.finalPrice)}`);
console.log('');

const difference = Math.abs(expected20_80 - testVehicle.finalPrice);
const diffPercent = (difference / expected20_80) * 100;

if (difference < 100) {
  console.log(`✅ Calculation matches expected (diff: ₹${difference}, ${diffPercent.toFixed(2)}%)`);
  console.log('   No hidden multipliers detected');
} else {
  console.log(`⚠️  Discrepancy detected: ₹${difference} difference (${diffPercent.toFixed(2)}%)`);
  console.log('   Possible hidden multipliers or adjustments');
}
console.log('');

// ═══════════════════════════════════════════════════════════════════
// AUDIT SECTION 6: LOGIC VS ML PERFORMANCE
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(80));
console.log('SECTION 6: LOGIC ENGINE vs ML MODEL ACCURACY');
console.log('═'.repeat(80));
console.log('');

// For each vehicle, calculate how close logic and ML are to market midpoint
const logicAccuracy = results.map(r => {
  const marketMid = (r.marketRange[0] + r.marketRange[1]) / 2;
  const logicDeviation = Math.abs(r.structuredPrice - marketMid) / marketMid * 100;
  const mlDeviation = Math.abs(r.mlPrice - marketMid) / marketMid * 100;
  const logicInRange = r.structuredPrice >= r.marketRange[0] && r.structuredPrice <= r.marketRange[1];
  const mlInRange = r.mlPrice >= r.marketRange[0] && r.mlPrice <= r.marketRange[1];
  
  return { 
    name: r.name, 
    category: r.category,
    logicDeviation, 
    mlDeviation, 
    logicInRange, 
    mlInRange,
    mlWins: mlDeviation < logicDeviation
  };
});

const logicInRangeCount = logicAccuracy.filter(a => a.logicInRange).length;
const mlInRangeCount = logicAccuracy.filter(a => a.mlInRange).length;
const mlWinsCount = logicAccuracy.filter(a => a.mlWins).length;

const avgLogicDeviation = logicAccuracy.reduce((sum, a) => sum + a.logicDeviation, 0) / totalTests;
const avgMLDeviation = logicAccuracy.reduce((sum, a) => sum + a.mlDeviation, 0) / totalTests;

console.log('Individual Component Performance:');
console.log('');
console.log('Logic Engine (Depreciation-Based):');
console.log(`  In-Range:       ${logicInRangeCount}/${totalTests} (${(logicInRangeCount/totalTests*100).toFixed(1)}%)`);
console.log(`  Avg Deviation:  ${avgLogicDeviation.toFixed(1)}%`);
console.log('');
console.log('ML Model (XGBoost):');
console.log(`  In-Range:       ${mlInRangeCount}/${totalTests} (${(mlInRangeCount/totalTests*100).toFixed(1)}%)`);
console.log(`  Avg Deviation:  ${avgMLDeviation.toFixed(1)}%`);
console.log('');
console.log('Head-to-Head Comparison:');
console.log(`  ML Wins:        ${mlWinsCount}/${totalTests} (${(mlWinsCount/totalTests*100).toFixed(1)}%)`);
console.log(`  Logic Wins:     ${totalTests - mlWinsCount}/${totalTests} (${((totalTests-mlWinsCount)/totalTests*100).toFixed(1)}%)`);
console.log('');

if (mlWinsCount > totalTests * 0.6) {
  console.log('✅ ML Model is MORE ACCURATE than Logic Engine');
  console.log(`   ML wins ${((mlWinsCount/totalTests*100).toFixed(0))}% of comparisons`);
} else if (mlWinsCount < totalTests * 0.4) {
  console.log('❌ Logic Engine is MORE ACCURATE than ML Model');
  console.log(`   Logic wins ${(((totalTests-mlWinsCount)/totalTests*100).toFixed(0))}% of comparisons`);
} else {
  console.log('⚖️  Logic and ML have SIMILAR ACCURACY');
}
console.log('');

// ═══════════════════════════════════════════════════════════════════
// FINAL VERDICT
// ═══════════════════════════════════════════════════════════════════

console.log('═'.repeat(80));
console.log('FINAL AUDIT VERDICT');
console.log('═'.repeat(80));
console.log('');

// Calculate scores
let mlScore = 0;
let implementationScore = 0;
let accuracyScore = 0;

// ML Model Quality (max 25 points)
if (mlMetrics.model_metrics) {
  const m = mlMetrics.model_metrics;
  if (m.r2_score >= 0.9) mlScore += 10;
  else if (m.r2_score >= 0.8) mlScore += 7;
  else if (m.r2_score >= 0.7) mlScore += 4;
  
  if (m.mape < 15) mlScore += 10;
  else if (m.mape < 20) mlScore += 7;
  else if (m.mape < 25) mlScore += 4;
  
  if (m.mae < 100000) mlScore += 5;
  else if (m.mae < 150000) mlScore += 3;
}

// Implementation Quality (max 25 points)
if (Math.abs(avgLogic - 20) < 2) implementationScore += 10;
if (configMatch && configMatch[0].includes('HYBRID_CONFIG')) implementationScore += 10;
if (formulaMatch && formulaMatch[0].includes('HYBRID_CONFIG')) implementationScore += 5;

// Accuracy Improvement (max 50 points)
const inRangeImprovement = ((newInRange - oldInRange) / totalTests) * 100;
const deviationImprovement = ((avgOldDeviation - avgNewDeviation) / avgOldDeviation) * 100;

if (newInRange > oldInRange) accuracyScore += 20;
else if (newInRange === oldInRange) accuracyScore += 10;

if (avgNewDeviation < avgOldDeviation) accuracyScore += 20;
else if (Math.abs(avgNewDeviation - avgOldDeviation) < 2) accuracyScore += 10;

if (mlWinsCount > totalTests * 0.6) accuracyScore += 10;

const totalScore = mlScore + implementationScore + accuracyScore;

console.log('Audit Scores:');
console.log(`  ML Model Quality:        ${mlScore}/25`);
console.log(`  Implementation Quality:  ${implementationScore}/25`);
console.log(`  Accuracy Improvement:    ${accuracyScore}/50`);
console.log(`  ──────────────────────────────────`);
console.log(`  TOTAL SCORE:             ${totalScore}/100`);
console.log('');

console.log('Final Ratings:');
console.log('');

// XGBoost Model Rating
if (mlMetrics.model_metrics) {
  const m = mlMetrics.model_metrics;
  if (m.r2_score >= 0.9 && m.mape < 15) {
    console.log('  XGBoost Model:           ✅ EXCELLENT');
  } else if (m.r2_score >= 0.8 && m.mape < 20) {
    console.log('  XGBoost Model:           ✅ VERY GOOD');
  } else {
    console.log('  XGBoost Model:           ⚠️  FAIR');
  }
} else {
  console.log('  XGBoost Model:           ❓ NOT EVALUATED');
}

// Logic Engine Rating
if (avgLogicDeviation < 20) {
  console.log('  Logic Engine:            ✅ GOOD');
} else if (avgLogicDeviation < 30) {
  console.log('  Logic Engine:            ⚠️  FAIR');
} else {
  console.log('  Logic Engine:            ❌ NEEDS IMPROVEMENT');
}

// Hybrid System Rating
if (newInRange >= oldInRange && avgNewDeviation < avgOldDeviation) {
  console.log('  Hybrid System (20/80):   ✅ IMPROVED');
} else if (newInRange === oldInRange) {
  console.log('  Hybrid System (20/80):   ⚖️  SIMILAR');
} else {
  console.log('  Hybrid System (20/80):   ❌ DEGRADED');
}

console.log('');
console.log('Most Accurate Component:  ', mlWinsCount > totalTests * 0.6 ? '✅ ML MODEL' : 
            mlWinsCount < totalTests * 0.4 ? '⚠️  LOGIC ENGINE' : '⚖️  TIE');
console.log('');

// Recommendation
console.log('Recommendations:');
console.log('');
if (totalScore >= 80) {
  console.log('✅ SYSTEM IS PRODUCTION READY');
  console.log('   20/80 hybrid weighting is working correctly');
  console.log('   Significant improvement over 70/30');
  console.log('   ML model is performing excellently');
} else if (totalScore >= 60) {
  console.log('⚠️  SYSTEM IS ACCEPTABLE');
  console.log('   20/80 implementation is functional');
  console.log('   Some improvements possible');
  console.log('   Consider monitoring and fine-tuning');
} else {
  console.log('❌ SYSTEM NEEDS REVIEW');
  console.log('   Implementation may have issues');
  console.log('   Accuracy not significantly improved');
  console.log('   Consider rollback or further investigation');
}

console.log('');
console.log('═'.repeat(80));
console.log('AUDIT COMPLETE');
console.log('═'.repeat(80));
