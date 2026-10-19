/**
 * Test Script for Unified Pricing Engine
 * Run: node test_unified_pricing.js
 */

const { calculateVehiclePricing, calculateSimpleValuation } = require('./utils/unifiedPricingEngine');

console.log('🧪 Testing Unified Pricing Engine\n');
console.log('═'.repeat(70));

// Test Case 1: Budget Car (Maruti Swift)
console.log('\n📊 Test 1: Budget Car - Maruti Swift');
console.log('─'.repeat(70));
const test1 = calculateVehiclePricing({
  brand: 'Maruti',
  model: 'Swift',
  vehicle_age: 4,
  mileage: 45000,
  mlPredictedPrice: 470000,
  original_price: 650000,
  segment: 'B1-Segment',
  condition: 'good'
});

console.log('Input:');
console.log('  Original Price: ₹6,50,000');
console.log('  Age: 4 years');
console.log('  Mileage: 45,000 km');
console.log('  Condition: Good');
console.log('  ML Prediction: ₹4,70,000');
console.log('\nOutput:');
console.log('  Market Price: ₹' + test1.market_price.toLocaleString('en-IN'));
console.log('  Base Value: ₹' + test1.base_value.toLocaleString('en-IN'));
console.log('  Insurance Value: ₹' + test1.insurance_value.toLocaleString('en-IN'));
console.log('  Residual Value: ₹' + test1.residual_value.toLocaleString('en-IN'));
console.log('  Distress Value: ₹' + test1.distress_value.toLocaleString('en-IN'));
console.log('  Salvage Value: ₹' + test1.salvage_value.toLocaleString('en-IN'));
console.log('\nFactors:');
console.log('  Segment: ' + test1.segment);
console.log('  Depreciation Factor: ' + (test1.depreciation_factor * 100).toFixed(1) + '%');
console.log('  Mileage Factor: ' + (test1.mileage_factor * 100).toFixed(1) + '%');
console.log('  Condition Factor: ' + (test1.condition_factor * 100).toFixed(1) + '%');
console.log('  Price Source: ' + test1.price_source);

// Test Case 2: Luxury Car (BMW 3 Series)
console.log('\n\n📊 Test 2: Luxury Car - BMW 3 Series');
console.log('─'.repeat(70));
const test2 = calculateVehiclePricing({
  brand: 'BMW',
  model: '3 Series',
  vehicle_age: 3,
  mileage: 30000,
  mlPredictedPrice: 2200000,
  original_price: 4500000,
  condition: 'excellent'
});

console.log('Input:');
console.log('  Original Price: ₹45,00,000');
console.log('  Age: 3 years');
console.log('  Mileage: 30,000 km');
console.log('  Condition: Excellent');
console.log('  ML Prediction: ₹22,00,000');
console.log('\nOutput:');
console.log('  Market Price: ₹' + test2.market_price.toLocaleString('en-IN'));
console.log('  Base Value: ₹' + test2.base_value.toLocaleString('en-IN'));
console.log('  Insurance Value: ₹' + test2.insurance_value.toLocaleString('en-IN'));
console.log('  Residual Value: ₹' + test2.residual_value.toLocaleString('en-IN'));
console.log('  Distress Value: ₹' + test2.distress_value.toLocaleString('en-IN'));
console.log('  Salvage Value: ₹' + test2.salvage_value.toLocaleString('en-IN'));
console.log('\nFactors:');
console.log('  Segment: ' + test2.segment);
console.log('  Depreciation Factor: ' + (test2.depreciation_factor * 100).toFixed(1) + '%');
console.log('  Mileage Factor: ' + (test2.mileage_factor * 100).toFixed(1) + '%');
console.log('  Condition Factor: ' + (test2.condition_factor * 100).toFixed(1) + '%');
console.log('  Price Source: ' + test2.price_source);

// Test Case 3: High Mileage Car
console.log('\n\n📊 Test 3: High Mileage - Hyundai i20');
console.log('─'.repeat(70));
const test3 = calculateVehiclePricing({
  brand: 'Hyundai',
  model: 'i20',
  vehicle_age: 5,
  mileage: 120000,
  mlPredictedPrice: 350000,
  original_price: 780000,
  condition: 'average'
});

console.log('Input:');
console.log('  Original Price: ₹7,80,000');
console.log('  Age: 5 years');
console.log('  Mileage: 1,20,000 km (HIGH)');
console.log('  Condition: Average');
console.log('  ML Prediction: ₹3,50,000');
console.log('\nOutput:');
console.log('  Market Price: ₹' + test3.market_price.toLocaleString('en-IN'));
console.log('  Base Value: ₹' + test3.base_value.toLocaleString('en-IN'));
console.log('  Insurance Value: ₹' + test3.insurance_value.toLocaleString('en-IN'));
console.log('  Residual Value: ₹' + test3.residual_value.toLocaleString('en-IN'));
console.log('  Distress Value: ₹' + test3.distress_value.toLocaleString('en-IN'));
console.log('  Salvage Value: ₹' + test3.salvage_value.toLocaleString('en-IN'));
console.log('\nFactors:');
console.log('  Segment: ' + test3.segment);
console.log('  Depreciation Factor: ' + (test3.depreciation_factor * 100).toFixed(1) + '%');
console.log('  Mileage Factor: ' + (test3.mileage_factor * 100).toFixed(1) + '%');
console.log('  Condition Factor: ' + (test3.condition_factor * 100).toFixed(1) + '%');
console.log('  Price Source: ' + test3.price_source);

// Test Case 4: No Original Price (Fallback)
console.log('\n\n📊 Test 4: No Original Price - Honda City');
console.log('─'.repeat(70));
const test4 = calculateVehiclePricing({
  brand: 'Honda',
  model: 'City',
  vehicle_age: 2,
  mileage: 25000,
  mlPredictedPrice: 950000,
  original_price: null, // No original price provided
  condition: 'good'
});

console.log('Input:');
console.log('  Original Price: NOT PROVIDED (using database)');
console.log('  Age: 2 years');
console.log('  Mileage: 25,000 km');
console.log('  Condition: Good');
console.log('  ML Prediction: ₹9,50,000');
console.log('\nOutput:');
console.log('  Market Price: ₹' + test4.market_price.toLocaleString('en-IN'));
console.log('  Base Value: ₹' + test4.base_value.toLocaleString('en-IN'));
console.log('  Insurance Value: ₹' + test4.insurance_value.toLocaleString('en-IN'));
console.log('  Residual Value: ₹' + test4.residual_value.toLocaleString('en-IN'));
console.log('  Distress Value: ₹' + test4.distress_value.toLocaleString('en-IN'));
console.log('  Salvage Value: ₹' + test4.salvage_value.toLocaleString('en-IN'));
console.log('\nFactors:');
console.log('  Segment: ' + test4.segment);
console.log('  Depreciation Factor: ' + (test4.depreciation_factor * 100).toFixed(1) + '%');
console.log('  Mileage Factor: ' + (test4.mileage_factor * 100).toFixed(1) + '%');
console.log('  Condition Factor: ' + (test4.condition_factor * 100).toFixed(1) + '%');
console.log('  Price Source: ' + test4.price_source);

// Test Case 5: Simple Valuation (for listings)
console.log('\n\n📊 Test 5: Simple Valuation (Vehicle Listing)');
console.log('─'.repeat(70));
const test5 = calculateSimpleValuation(850000, 60000);

console.log('Input:');
console.log('  ML Prediction: ₹8,50,000');
console.log('  Mileage: 60,000 km');
console.log('\nOutput:');
console.log('  Market Price: ₹' + test5.market_price.toLocaleString('en-IN'));
console.log('  Insurance Value: ₹' + test5.insurance_value.toLocaleString('en-IN'));
console.log('  Base Value: ₹' + test5.base_value.toLocaleString('en-IN'));
console.log('  Residual Value: ₹' + test5.residual_value.toLocaleString('en-IN'));
console.log('  Distress Value: ₹' + test5.distress_value.toLocaleString('en-IN'));
console.log('  Salvage Value: ₹' + test5.salvage_value.toLocaleString('en-IN'));

// Validation Tests
console.log('\n\n✅ Validation Tests');
console.log('═'.repeat(70));

let allPassed = true;

// Test 1: Logical hierarchy
const validateHierarchy = (test, name) => {
  const checks = [
    { condition: test.market_price > 0, msg: 'Market price > 0' },
    { condition: test.insurance_value > 0, msg: 'Insurance > 0 (IRDA-based)' },
    { condition: test.residual_value < test.market_price, msg: 'Residual < Market' },
    { condition: test.distress_value < test.market_price, msg: 'Distress < Market' },
    { condition: test.salvage_value < test.residual_value, msg: 'Salvage < Residual' },
    { condition: test.salvage_value > 0, msg: 'Salvage > 0' },
  ];
  
  console.log(`\n${name}:`);
  checks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`  ${status} ${check.msg}`);
    if (!check.condition) allPassed = false;
  });
};

validateHierarchy(test1, 'Test 1 (Maruti Swift)');
validateHierarchy(test2, 'Test 2 (BMW 3 Series)');
validateHierarchy(test3, 'Test 3 (Hyundai i20)');
validateHierarchy(test4, 'Test 4 (Honda City)');
validateHierarchy(test5, 'Test 5 (Simple Valuation)');

// Summary
console.log('\n\n' + '═'.repeat(70));
if (allPassed) {
  console.log('✅ ALL TESTS PASSED - Pricing engine is working correctly!');
} else {
  console.log('❌ SOME TESTS FAILED - Please review the output above');
}
console.log('═'.repeat(70) + '\n');
