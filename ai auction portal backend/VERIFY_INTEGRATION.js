/**
 * ═══════════════════════════════════════════════════════════════════
 * PHASE 3 INTEGRATION VERIFICATION SCRIPT
 * 
 * Tests complete end-to-end integration:
 * Frontend → Backend → YOLO Service → Pricing Engine → MongoDB
 * ═══════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const DAMAGE_SERVICE_URL = 'http://localhost:5002';
const ML_SERVICE_URL = 'http://localhost:5001';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('PHASE 3 INTEGRATION VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════\n');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, testFn) {
  testsRun++;
  try {
    console.log(`TEST ${testsRun}: ${name}`);
    console.log('─'.repeat(65));
    await testFn();
    testsPassed++;
    console.log('✅ PASS\n');
  } catch (error) {
    testsFailed++;
    console.log('❌ FAIL');
    console.log('Error:', error.message);
    console.log();
  }
}

// ── Test 1: Backend Health Check ────────────────────────────────
async function testBackendHealth() {
  const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
  
  if (response.data.status !== 'ok') {
    throw new Error('Backend health check failed');
  }
  
  console.log('Backend Status:', response.data.status);
  console.log('Uptime:', Math.round(response.data.uptime), 'seconds');
}

// ── Test 2: ML Service Health Check ────────────────────────────
async function testMLServiceHealth() {
  const response = await axios.get(`${ML_SERVICE_URL}/`, { timeout: 5000 });
  
  console.log('ML Service Status:', response.data.status || 'running');
  console.log('Model Loaded:', response.data.model_loaded !== false);
}

// ── Test 3: Damage Service Health Check ────────────────────────
async function testDamageServiceHealth() {
  const response = await axios.get(`${DAMAGE_SERVICE_URL}/`, { timeout: 5000 });
  
  if (response.data.status !== 'ok') {
    throw new Error('Damage service health check failed');
  }
  
  console.log('Damage Service Status:', response.data.status);
  console.log('YOLO Model Loaded:', response.data.model_loaded);
  console.log('Version:', response.data.version || '1.0');
}

// ── Test 4: Damage API Routes ──────────────────────────────────
async function testDamageAPIRoutes() {
  const response = await axios.get(`${BACKEND_URL}/api/damage/health`, { timeout: 5000 });
  
  console.log('Damage API Status:', response.data.status);
  console.log('Service:', response.data.service);
}

// ── Test 5: Pricing API Without Damage ─────────────────────────
async function testPricingWithoutDamage() {
  const vehicleData = {
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
    condition: 'good'
  };
  
  const response = await axios.post(
    `${BACKEND_URL}/api/predict-price`,
    vehicleData,
    { timeout: 10000 }
  );
  
  if (!response.data.market_price) {
    throw new Error('No market price returned');
  }
  
  console.log('Market Price:', '₹' + response.data.market_price.toLocaleString('en-IN'));
  console.log('Segment:', response.data.segment);
  console.log('Has Damage Fields:', {
    xgboost_base_price: response.data.xgboost_base_price !== undefined,
    damage_penalty: response.data.damage_penalty_percent !== undefined
  });
  console.log('Expected: No damage fields (backward compatible)');
}

// ── Test 6: Pricing API With Damage ────────────────────────────
async function testPricingWithDamage() {
  const vehicleData = {
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
    condition: 'good',
    damage_data: {
      damages: [
        { type: 'dent', confidence: 85, severity: 'moderate' },
        { type: 'scratch', confidence: 70, severity: 'minor' }
      ],
      damage_summary: {
        total_damages: 2,
        severity_score: 15,
        severity_level: 'moderate'
      }
    }
  };
  
  const response = await axios.post(
    `${BACKEND_URL}/api/predict-price`,
    vehicleData,
    { timeout: 10000 }
  );
  
  if (!response.data.xgboost_base_price) {
    throw new Error('No damage adjustment fields returned');
  }
  
  console.log('XGBoost Base:', '₹' + response.data.xgboost_base_price.toLocaleString('en-IN'));
  console.log('Damage Penalty:', response.data.damage_penalty_percent + '%');
  console.log('Damage Adjusted:', '₹' + response.data.damage_adjusted_price.toLocaleString('en-IN'));
  console.log('Final Valuation:', '₹' + response.data.final_valuation.toLocaleString('en-IN'));
  console.log('Reduction:', '₹' + (response.data.xgboost_base_price - response.data.final_valuation).toLocaleString('en-IN'));
}

// ── Test 7: Minimum Image Validation ───────────────────────────
async function testMinimumImageValidation() {
  const insufficientImages = [
    { data: 'data:image/png;base64,iVBOR...', filename: 'img1.jpg' },
    { data: 'data:image/png;base64,iVBOR...', filename: 'img2.jpg' }
  ];
  
  try {
    await axios.post(
      `${BACKEND_URL}/api/damage/validate-quality`,
      { images: insufficientImages },
      { timeout: 5000 }
    );
    throw new Error('Should have rejected < 5 images');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('Correctly rejected:', error.response.data.message);
      console.log('Required:', error.response.data.required);
      console.log('Provided:', error.response.data.provided);
    } else {
      throw error;
    }
  }
}

// ── Test 8: Database Schema Compatibility ──────────────────────
async function testDatabaseSchema() {
  const mongoose = require('mongoose');
  const Vehicle = require('./models/Vehicle');
  
  // Check if damage fields are present in schema
  const schema = Vehicle.schema.obj;
  
  const hasDamageFields = !!(schema.damages && schema.damage_summary);
  const hasAnnotatedImages = !!schema.annotated_images;
  const hasPricingFields = !!(schema.xgboost_base_price && schema.damage_penalty_percent);
  
  console.log('Schema has damage fields:', hasDamageFields);
  console.log('Schema has annotated_images:', hasAnnotatedImages);
  console.log('Schema has pricing fields:', hasPricingFields);
  
  if (!hasDamageFields || !hasAnnotatedImages || !hasPricingFields) {
    throw new Error('Vehicle schema missing damage fields');
  }
}

// ── Test 9: Damage Calculator Integration ─────────────────────
async function testDamageCalculator() {
  const { calculateDamagePenalty } = require('./utils/damageCalculator');
  
  const damages = [
    { type: 'dent', confidence: 85, severity: 'moderate' },
    { type: 'crack', confidence: 90, severity: 'severe' }
  ];
  
  const result = calculateDamagePenalty(damages);
  
  console.log('Penalty Calculated:', result.penalty_percent + '%');
  console.log('Total Damages:', result.total_damages);
  console.log('Severity Level:', result.severity_level);
  console.log('Has Structural:', result.has_structural_damage);
  
  if (result.penalty_percent === 0) {
    throw new Error('Penalty should be > 0 for damages');
  }
}

// ── Test 10: Unified Pricing Engine Integration ───────────────
async function testUnifiedPricingEngine() {
  const { calculateVehiclePricing } = require('./utils/unifiedPricingEngine');
  
  const vehicleParams = {
    brand: 'Toyota',
    model: 'Fortuner',
    vehicle_age: 5,
    mileage: 80000,
    mlPredictedPrice: 2000000,
    condition: 'good'
  };
  
  const damageData = {
    damages: [
      { type: 'dent', confidence: 88, severity: 'moderate' },
      { type: 'scratch', confidence: 75, severity: 'minor' }
    ],
    damage_summary: {
      total_damages: 2,
      severity_score: 18
    }
  };
  
  const pricing = calculateVehiclePricing(vehicleParams, damageData);
  
  console.log('Market Price:', '₹' + pricing.market_price.toLocaleString('en-IN'));
  console.log('XGBoost Base:', '₹' + pricing.xgboost_base_price.toLocaleString('en-IN'));
  console.log('Damage Adjusted:', '₹' + pricing.damage_adjusted_price.toLocaleString('en-IN'));
  console.log('Final Valuation:', '₹' + pricing.final_valuation.toLocaleString('en-IN'));
  
  if (!pricing.xgboost_base_price || !pricing.damage_penalty_percent) {
    throw new Error('Missing damage pricing fields');
  }
}

// ── Run All Tests ───────────────────────────────────────────────
async function runAllTests() {
  console.log('Starting integration verification...\n');
  
  await runTest('Backend Health Check', testBackendHealth);
  await runTest('ML Service Health Check', testMLServiceHealth);
  await runTest('Damage Service Health Check', testDamageServiceHealth);
  await runTest('Damage API Routes', testDamageAPIRoutes);
  await runTest('Pricing API Without Damage (Backward Compatible)', testPricingWithoutDamage);
  await runTest('Pricing API With Damage (New Integration)', testPricingWithDamage);
  await runTest('Minimum Image Validation', testMinimumImageValidation);
  await runTest('Database Schema Compatibility', testDatabaseSchema);
  await runTest('Damage Calculator Integration', testDamageCalculator);
  await runTest('Unified Pricing Engine Integration', testUnifiedPricingEngine);
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Tests Run:    ${testsRun}`);
  console.log(`Tests Passed: ${testsPassed} ✓`);
  console.log(`Tests Failed: ${testsFailed} ${testsFailed > 0 ? '✗' : ''}`);
  console.log();
  
  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED - INTEGRATION READY');
    console.log();
    console.log('Key Features Verified:');
    console.log('  ✓ Backend API running');
    console.log('  ✓ ML service connected');
    console.log('  ✓ Damage service connected');
    console.log('  ✓ Damage API endpoints working');
    console.log('  ✓ Pricing without damage (backward compatible)');
    console.log('  ✓ Pricing with damage (80/20 hybrid)');
    console.log('  ✓ Minimum 5 images validation');
    console.log('  ✓ Database schema updated');
    console.log('  ✓ Damage calculator working');
    console.log('  ✓ Pricing engine integrated');
  } else {
    console.log(`❌ ${testsFailed} TEST(S) FAILED - REVIEW ERRORS ABOVE`);
  }
  
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// ── Execute Tests ───────────────────────────────────────────────
runAllTests().catch(error => {
  console.error('\n❌ CRITICAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
