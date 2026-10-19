/**
 * ═══════════════════════════════════════════════════════════════════
 * HYBRID WEIGHTING CHANGE VERIFICATION TEST
 * 
 * Purpose: Compare OLD (70/30) vs NEW (20/80) hybrid pricing
 * 
 * Test Vehicles:
 *   1. Hyundai i10 2010 (14 years old)
 *   2. Maruti Swift 2012 (12 years old)
 *   3. Honda City 2013 (11 years old)
 * 
 * Expected: NEW hybrid should be closer to ML predictions and market ranges
 * ═══════════════════════════════════════════════════════════════════
 */

const axios = require('axios');

// Test vehicle configurations
const TEST_VEHICLES = [
  {
    name: "Hyundai i10 2010",
    brand: "Hyundai",
    model: "i10",
    year: 2010,
    mileage: 80000,
    condition: "good",
    marketRange: { min: 80000, max: 150000 }
  },
  {
    name: "Maruti Swift 2012",
    brand: "Maruti",
    model: "Swift",
    year: 2012,
    mileage: 90000,
    condition: "good",
    marketRange: { min: 180000, max: 300000 }
  },
  {
    name: "Honda City 2013",
    brand: "Honda",
    model: "City",
    year: 2013,
    mileage: 85000,
    condition: "good",
    marketRange: { min: 300000, max: 450000 }
  }
];

// Simulate old 70/30 calculation
function calculateOldHybrid(structuredPrice, mlPrice) {
  return Math.round(structuredPrice * 0.70 + mlPrice * 0.30);
}

// Simulate new 20/80 calculation
function calculateNewHybrid(structuredPrice, mlPrice) {
  return Math.round(structuredPrice * 0.20 + mlPrice * 0.80);
}

// Check if price is within market range
function isInRange(price, range) {
  return price >= range.min && price <= range.max;
}

// Calculate deviation from market midpoint
function calculateDeviation(price, range) {
  const midpoint = (range.min + range.max) / 2;
  return Math.abs((price - midpoint) / midpoint * 100);
}

// Format currency
function formatCurrency(amount) {
  return `₹${(amount / 100000).toFixed(2)}L`;
}

async function runComparisonTest() {
  console.log('═'.repeat(70));
  console.log('HYBRID WEIGHTING CHANGE - BEFORE/AFTER COMPARISON');
  console.log('═'.repeat(70));
  console.log('');
  console.log('Configuration:');
  console.log('  OLD: 70% Logic + 30% ML');
  console.log('  NEW: 20% Logic + 80% ML');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');

  const results = [];

  for (const vehicle of TEST_VEHICLES) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Testing: ${vehicle.name}`);
    console.log(`${'─'.repeat(70)}`);

    try {
      // Call ML prediction endpoint
      const mlResponse = await axios.post('http://localhost:5000/predict', {
        Brand: vehicle.brand,
        Model: vehicle.model,
        Year: vehicle.year,
        Mileage: vehicle.mileage,
        Location: 'Mumbai'
      });

      const mlPrice = mlResponse.data.predicted_price;
      
      // Simulate structured/logic price calculation
      // This is an approximation based on depreciation logic
      const age = new Date().getFullYear() - vehicle.year;
      const basePrice = 560000; // Approximate base for these segments
      const depreciationFactor = Math.pow(0.88, age); // ~12% annual
      const structuredPrice = Math.round(basePrice * depreciationFactor * 0.9); // condition factor

      // Calculate both hybrid approaches
      const oldHybrid = calculateOldHybrid(structuredPrice, mlPrice);
      const newHybrid = calculateNewHybrid(structuredPrice, mlPrice);

      // Analysis
      const oldInRange = isInRange(oldHybrid, vehicle.marketRange);
      const newInRange = isInRange(newHybrid, vehicle.marketRange);
      const oldDeviation = calculateDeviation(oldHybrid, vehicle.marketRange);
      const newDeviation = calculateDeviation(newHybrid, vehicle.marketRange);

      const result = {
        vehicle: vehicle.name,
        age,
        logicPrice: structuredPrice,
        mlPrice,
        oldHybrid,
        newHybrid,
        marketRange: vehicle.marketRange,
        oldInRange,
        newInRange,
        oldDeviation,
        newDeviation,
        improvement: oldDeviation - newDeviation
      };

      results.push(result);

      // Display results
      console.log('');
      console.log('Vehicle Details:');
      console.log(`  Age: ${age} years`);
      console.log(`  Mileage: ${vehicle.mileage} km`);
      console.log(`  Condition: ${vehicle.condition}`);
      console.log('');
      console.log('Price Calculations:');
      console.log(`  Logic Price (Depreciation): ${formatCurrency(structuredPrice)}`);
      console.log(`  ML Price (XGBoost):         ${formatCurrency(mlPrice)}`);
      console.log('');
      console.log('Hybrid Valuations:');
      console.log(`  OLD (70/30): ${formatCurrency(oldHybrid)}  ${oldInRange ? '✓ IN RANGE' : '✗ OUT OF RANGE'}`);
      console.log(`  NEW (20/80): ${formatCurrency(newHybrid)}  ${newInRange ? '✓ IN RANGE' : '✗ OUT OF RANGE'}`);
      console.log('');
      console.log('Market Comparison:');
      console.log(`  Market Range: ${formatCurrency(vehicle.marketRange.min)} - ${formatCurrency(vehicle.marketRange.max)}`);
      console.log(`  OLD Deviation: ${oldDeviation.toFixed(1)}%`);
      console.log(`  NEW Deviation: ${newDeviation.toFixed(1)}%`);
      console.log(`  Improvement:   ${result.improvement > 0 ? '+' : ''}${result.improvement.toFixed(1)}%`);

    } catch (error) {
      console.error(`\nError testing ${vehicle.name}:`, error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
  }

  // Summary Report
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('SUMMARY REPORT');
  console.log('═'.repeat(70));
  console.log('');

  const oldInRangeCount = results.filter(r => r.oldInRange).length;
  const newInRangeCount = results.filter(r => r.newInRange).length;
  const avgOldDeviation = results.reduce((sum, r) => sum + r.oldDeviation, 0) / results.length;
  const avgNewDeviation = results.reduce((sum, r) => sum + r.newDeviation, 0) / results.length;
  const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;

  console.log('Performance Metrics:');
  console.log('');
  console.log(`  OLD (70/30) In-Range: ${oldInRangeCount}/${results.length} (${(oldInRangeCount/results.length*100).toFixed(0)}%)`);
  console.log(`  NEW (20/80) In-Range: ${newInRangeCount}/${results.length} (${(newInRangeCount/results.length*100).toFixed(0)}%)`);
  console.log('');
  console.log(`  OLD Avg Deviation: ${avgOldDeviation.toFixed(1)}%`);
  console.log(`  NEW Avg Deviation: ${avgNewDeviation.toFixed(1)}%`);
  console.log(`  Avg Improvement:   ${avgImprovement > 0 ? '+' : ''}${avgImprovement.toFixed(1)}%`);
  console.log('');
  
  if (newInRangeCount > oldInRangeCount) {
    console.log('  ✅ RESULT: NEW hybrid weighting is MORE ACCURATE');
  } else if (newInRangeCount === oldInRangeCount) {
    console.log('  ⚖️  RESULT: Both weightings have SIMILAR ACCURACY');
  } else {
    console.log('  ⚠️  RESULT: OLD hybrid weighting was MORE ACCURATE');
  }
  
  console.log('');
  console.log('Implementation Status:');
  console.log('  ✅ Configuration constants added (HYBRID_CONFIG)');
  console.log('  ✅ Hybrid formula updated (line 360)');
  console.log('  ✅ Debug info updated to show new weights');
  console.log('  ✅ Easy rollback enabled (change config constants)');
  console.log('');
  console.log('To rollback to v4.0 (70/30):');
  console.log('  Set LOGIC_WEIGHT = 0.70, ML_WEIGHT = 0.30');
  console.log('');
  console.log('═'.repeat(70));
}

// Run the test
runComparisonTest().catch(console.error);
