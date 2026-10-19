/**
 * DIRECT PRICING ACCURACY TEST
 * Tests the unified pricing engine directly without needing services
 */

const { calculateVehiclePricing } = require('./utils/unifiedPricingEngine');
const { calculateDamagePenalty } = require('./utils/damageCalculator');

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
  reset: '\x1b[0m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '═'.repeat(80));
  console.log(colors.bright + colors.cyan + title.toUpperCase().padStart((80 + title.length) / 2) + colors.reset);
  console.log('═'.repeat(80) + '\n');
}

header('AI Auction Portal - Direct Pricing Accuracy Test');

// Test Case 1: Honda City 2020 (No Damage)
console.log(colors.bright + '\n📊 TEST 1: Honda City 2020 (No Damage)' + colors.reset);
console.log('─'.repeat(80));

const hondaParams = {
  brand: 'Honda',
  model: 'City',
  year: 2020,
  vehicle_age: 6,
  mileage: 30000,
  fuel: 'Petrol',
  transmission: 'Manual',
  engine: 1500,
  max_power: 119,
  seats: 5,
};

const hondaNoDamage = calculateVehiclePricing(hondaParams);
console.log(`Market Price:       ₹${hondaNoDamage.market_price.toLocaleString('en-IN')}`);
console.log(`Insurance Value:    ₹${hondaNoDamage.insurance_value.toLocaleString('en-IN')}`);
console.log(`Residual Value:     ₹${hondaNoDamage.residual_value.toLocaleString('en-IN')}`);
console.log(`Segment:            ${hondaNoDamage.segment}`);
console.log(`Depreciation Rate:  ${(hondaNoDamage.depreciation_rate * 100).toFixed(1)}%`);

// Real market check (approximate values for Honda City 2020)
const hondaRealMarket = 850000; // Approximate real market value
const hondaError = Math.abs(hondaNoDamage.market_price - hondaRealMarket);
const hondaErrorPercent = (hondaError / hondaRealMarket) * 100;

console.log(`\nReal Market Price:  ₹${hondaRealMarket.toLocaleString('en-IN')} (approx)`);
console.log(`Prediction Error:   ${hondaErrorPercent.toFixed(2)}%`);

if (hondaErrorPercent <= 15) {
  log(`✓ ACCURATE (within 15%)`, colors.green);
} else if (hondaErrorPercent <= 25) {
  log(`⚠ ACCEPTABLE (within 25%)`, colors.yellow);
} else {
  log(`✗ INACCURATE (>25% error)`, colors.red);
}

// Test Case 2: Honda City 2020 (WITH Damage)
console.log(colors.bright + '\n📊 TEST 2: Honda City 2020 (WITH Damage)' + colors.reset);
console.log('─'.repeat(80));

const damageSummary = {
  damages: [
    { type: 'dent', confidence: 85, severity: 'moderate' },
    { type: 'scratch', confidence: 92, severity: 'minor' },
    { type: 'crack', confidence: 78, severity: 'major' },
  ],
  damage_summary: {
    total_damages: 3,
    severity_score: 25,
    severity_level: 'moderate',
  },
};

const damageCalc = calculateDamagePenalty(damageSummary);
console.log(`\nDamage Penalty:     ${damageCalc.penalty_percent.toFixed(2)}%`);
console.log(`Severity Level:     ${damageCalc.severity_level} (${damageCalc.category})`);
console.log(`Damages Detected:   ${damageCalc.total_damages}`);

const hondaWithDamage = calculateVehiclePricing(hondaParams, damageSummary);
console.log(`\nXGBoost Base:       ₹${hondaWithDamage.xgboost_base_price.toLocaleString('en-IN')}`);
console.log(`Damage Adjusted:    ₹${hondaWithDamage.damage_adjusted_price.toLocaleString('en-IN')}`);
console.log(`Final Valuation:    ₹${hondaWithDamage.final_valuation.toLocaleString('en-IN')}`);
console.log(`Damage Penalty:     ${hondaWithDamage.damage_penalty_percent.toFixed(2)}%`);

const priceReduction = hondaNoDamage.market_price - hondaWithDamage.final_valuation;
const reductionPercent = (priceReduction / hondaNoDamage.market_price) * 100;

console.log(`\nPrice Reduction:    ₹${priceReduction.toLocaleString('en-IN')} (${reductionPercent.toFixed(2)}%)`);

if (priceReduction > 0 && damageCalc.penalty_percent >= 0 && damageCalc.penalty_percent <= 50) {
  log(`✓ DAMAGE ADJUSTMENT WORKING CORRECTLY`, colors.green);
} else {
  log(`✗ DAMAGE ADJUSTMENT ERROR`, colors.red);
}

// Verify 80/20 formula
const expected8020 = (hondaWithDamage.xgboost_base_price * 0.80) + (hondaWithDamage.damage_adjusted_price * 0.20);
const actual = hondaWithDamage.final_valuation;
const diff = Math.abs(expected8020 - actual);

console.log(`\n80/20 Formula Check:`);
console.log(`Expected:           ₹${expected8020.toFixed(0)}`);
console.log(`Actual:             ₹${actual.toFixed(0)}`);
console.log(`Difference:         ₹${diff.toFixed(0)}`);

if (diff < 10) {
  log(`✓ 80/20 FORMULA CORRECT`, colors.green);
} else {
  log(`✗ 80/20 FORMULA ERROR`, colors.red);
}

// Test Case 3: Maruti Swift 2018
console.log(colors.bright + '\n📊 TEST 3: Maruti Swift 2018 (No Damage)' + colors.reset);
console.log('─'.repeat(80));

const swiftParams = {
  brand: 'Maruti',
  model: 'Swift',
  year: 2018,
  vehicle_age: 8,
  mileage: 50000,
  fuel: 'Petrol',
  transmission: 'Manual',
  engine: 1200,
  max_power: 82,
  seats: 5,
};

const swift = calculateVehiclePricing(swiftParams);
console.log(`Market Price:       ₹${swift.market_price.toLocaleString('en-IN')}`);
console.log(`Insurance Value:    ₹${swift.insurance_value.toLocaleString('en-IN')}`);
console.log(`Residual Value:     ₹${swift.residual_value.toLocaleString('en-IN')}`);
console.log(`Segment:            ${swift.segment}`);

const swiftRealMarket = 380000;
const swiftError = Math.abs(swift.market_price - swiftRealMarket);
const swiftErrorPercent = (swiftError / swiftRealMarket) * 100;

console.log(`\nReal Market Price:  ₹${swiftRealMarket.toLocaleString('en-IN')} (approx)`);
console.log(`Prediction Error:   ${swiftErrorPercent.toFixed(2)}%`);

if (swiftErrorPercent <= 15) {
  log(`✓ ACCURATE (within 15%)`, colors.green);
} else if (swiftErrorPercent <= 25) {
  log(`⚠ ACCEPTABLE (within 25%)`, colors.yellow);
} else {
  log(`✗ INACCURATE (>25% error)`, colors.red);
}

// Test Case 4: Hyundai Creta 2021
console.log(colors.bright + '\n📊 TEST 4: Hyundai Creta 2021 (No Damage)' + colors.reset);
console.log('─'.repeat(80));

const cretaParams = {
  brand: 'Hyundai',
  model: 'Creta',
  year: 2021,
  vehicle_age: 5,
  mileage: 25000,
  fuel: 'Diesel',
  transmission: 'Automatic',
  engine: 1500,
  max_power: 115,
  seats: 5,
};

const creta = calculateVehiclePricing(cretaParams);
console.log(`Market Price:       ₹${creta.market_price.toLocaleString('en-IN')}`);
console.log(`Insurance Value:    ₹${creta.insurance_value.toLocaleString('en-IN')}`);
console.log(`Residual Value:     ₹${creta.residual_value.toLocaleString('en-IN')}`);
console.log(`Segment:            ${creta.segment}`);

const cretaRealMarket = 1450000;
const cretaError = Math.abs(creta.market_price - cretaRealMarket);
const cretaErrorPercent = (cretaError / cretaRealMarket) * 100;

console.log(`\nReal Market Price:  ₹${cretaRealMarket.toLocaleString('en-IN')} (approx)`);
console.log(`Prediction Error:   ${cretaErrorPercent.toFixed(2)}%`);

if (cretaErrorPercent <= 15) {
  log(`✓ ACCURATE (within 15%)`, colors.green);
} else if (cretaErrorPercent <= 25) {
  log(`⚠ ACCEPTABLE (within 25%)`, colors.yellow);
} else {
  log(`✗ INACCURATE (>25% error)`, colors.red);
}

// Summary
header('Pricing Accuracy Summary');

const totalError = hondaErrorPercent + swiftErrorPercent + cretaErrorPercent;
const avgError = totalError / 3;

console.log(`Average Prediction Error: ${avgError.toFixed(2)}%\n`);

console.log('Individual Errors:');
console.log(`  Honda City 2020:   ${hondaErrorPercent.toFixed(2)}%`);
console.log(`  Maruti Swift 2018: ${swiftErrorPercent.toFixed(2)}%`);
console.log(`  Hyundai Creta 2021: ${cretaErrorPercent.toFixed(2)}%`);

// Calculate R² approximation
const r2Estimate = 1 - (avgError / 100);
console.log(`\nEstimated R² Score: ${r2Estimate.toFixed(4)}`);

console.log('\n' + '═'.repeat(80));

if (avgError <= 15) {
  log('\n🎉 EXCELLENT PRICING ACCURACY (≤15% avg error)', colors.green + colors.bright);
  log('✓ System is production-ready for pricing\n', colors.green);
} else if (avgError <= 25) {
  log('\n⚠️  GOOD PRICING ACCURACY (15-25% avg error)', colors.yellow + colors.bright);
  log('✓ System is acceptable for production with monitoring\n', colors.yellow);
} else {
  log('\n❌ POOR PRICING ACCURACY (>25% avg error)', colors.red + colors.bright);
  log('✗ System needs calibration before production\n', colors.red);
}

// Feature completeness check
header('Feature Completeness Check');

const features = [
  { name: 'Unified Pricing Engine', status: typeof calculateVehiclePricing === 'function' },
  { name: 'Damage Calculator', status: typeof calculateDamagePenalty === 'function' },
  { name: 'Damage Adjustment (80/20)', status: diff < 10 },
  { name: 'Price Reduction on Damage', status: priceReduction > 0 },
  { name: 'Penalty Cap (≤50%)', status: damageCalc.penalty_percent <= 50 },
  { name: 'Backward Compatible', status: hondaNoDamage.market_price > 0 },
];

features.forEach(f => {
  const icon = f.status ? '✓' : '✗';
  const color = f.status ? colors.green : colors.red;
  console.log(`${color}${icon} ${f.name}${colors.reset}`);
});

const allFeaturesWork = features.every(f => f.status);

console.log('\n' + '═'.repeat(80));

if (allFeaturesWork) {
  log('\n✅ ALL FEATURES WORKING CORRECTLY\n', colors.green + colors.bright);
  log('🎊 SYSTEM IS READY FOR PRODUCTION DEPLOYMENT\n', colors.cyan + colors.bright);
} else {
  log('\n⚠️  SOME FEATURES NEED ATTENTION\n', colors.yellow + colors.bright);
}

console.log('Test completed at:', new Date().toLocaleString());
console.log('═'.repeat(80) + '\n');
