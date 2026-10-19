/**
 * ═══════════════════════════════════════════════════════════════════
 * FULL SYSTEM COMPARISON AUDIT
 * Compare: Logic Engine vs ML Model vs Hybrid System
 * Test across all segments and vehicle ages
 * ═══════════════════════════════════════════════════════════════════
 */

const { calculateVehiclePricing, SEGMENTS, BRAND_SEGMENT_MAP } = require("./utils/unifiedPricingEngine");
const axios = require("axios");

console.log("╔" + "═".repeat(78) + "╗");
console.log("║" + " ".repeat(20) + "FULL SYSTEM COMPARISON AUDIT" + " ".repeat(30) + "║");
console.log("╚" + "═".repeat(78) + "╝\n");

const currentYear = new Date().getFullYear();
const ML_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE TEST VEHICLES
// ═══════════════════════════════════════════════════════════════════

const testVehicles = [
  // Budget Segment
  {
    name: "Hyundai i10 2010 (Very Old - 16 years)",
    brand: "Hyundai",
    model: "i10",
    year: 2010,
    mileage: 50000,
    fuel: "Petrol",
    transmission: "Manual",
    engine: 1100,
    max_power: 65,
    seats: 5,
    original_price: 560000,
    condition: "good",
    marketRange: [80000, 150000],
    segment: "B2-Segment"
  },
  {
    name: "Hyundai i10 2014 (Old - 12 years)",
    brand: "Hyundai",
    model: "i10",
    year: 2014,
    mileage: 40000,
    fuel: "Petrol",
    transmission: "Manual",
    engine: 1100,
    max_power: 65,
    seats: 5,
    original_price: 560000,
    condition: "good",
    marketRange: [150000, 220000],
    segment: "B2-Segment"
  },
  {
    name: "Maruti Swift 2012 (Old - 14 years)",
    brand: "Maruti",
    model: "Swift",
    year: 2012,
    mileage: 60000,
    fuel: "Petrol",
    transmission: "Manual",
    engine: 1197,
    max_power: 82,
    seats: 5,
    original_price: 550000,
    condition: "average",
    marketRange: [180000, 280000],
    segment: "B1-Segment"
  },
  {
    name: "Maruti Swift 2018 (Mid Age - 8 years)",
    brand: "Maruti",
    model: "Swift",
    year: 2018,
    mileage: 35000,
    fuel: "Petrol",
    transmission: "Manual",
    engine: 1197,
    max_power: 82,
    seats: 5,
    original_price: 650000,
    condition: "good",
    marketRange: [400000, 550000],
    segment: "B1-Segment"
  },
  {
    name: "Honda City 2018 (Mid Age - 8 years)",
    brand: "Honda",
    model: "City",
    year: 2018,
    mileage: 30000,
    fuel: "Petrol",
    transmission: "Manual",
    engine: 1497,
    max_power: 117,
    seats: 5,
    original_price: 1050000,
    condition: "good",
    marketRange: [650000, 850000],
    segment: "C1-Segment"
  },
  {
    name: "Skoda Rapid 2016 (Mid-Old - 10 years)",
    brand: "Skoda",
    model: "Rapid",
    year: 2016,
    mileage: 45000,
    fuel: "Petrol",
    transmission: "Manual",
    engine: 1598,
    max_power: 103,
    seats: 5,
    original_price: 920000,
    condition: "good",
    marketRange: [450000, 650000],
    segment: "C2-Segment"
  },
  {
    name: "Toyota Fortuner 2017 (Mid Age - 9 years)",
    brand: "Toyota",
    model: "Fortuner",
    year: 2017,
    mileage: 40000,
    fuel: "Diesel",
    transmission: "Automatic",
    engine: 2755,
    max_power: 171,
    seats: 7,
    original_price: 3000000,
    condition: "excellent",
    marketRange: [2000000, 2600000],
    segment: "C2-Segment"
  },
  {
    name: "BMW 320d 2018 (Luxury - 8 years)",
    brand: "BMW",
    model: "3 Series",
    year: 2018,
    mileage: 28000,
    fuel: "Diesel",
    transmission: "Automatic",
    engine: 1997,
    max_power: 188,
    seats: 5,
    original_price: 4200000,
    condition: "excellent",
    marketRange: [2400000, 3000000],
    segment: "Luxury"
  },
  {
    name: "Mercedes C-Class 2018 (Luxury - 8 years)",
    brand: "Mercedes",
    model: "C-Class",
    year: 2018,
    mileage: 25000,
    fuel: "Petrol",
    transmission: "Automatic",
    engine: 1991,
    max_power: 181,
    seats: 5,
    original_price: 4500000,
    condition: "excellent",
    marketRange: [2600000, 3200000],
    segment: "Luxury"
  }
];

// ═══════════════════════════════════════════════════════════════════
// FUNCTION: GET ML PREDICTION
// ═══════════════════════════════════════════════════════════════════

async function getMLPrediction(vehicle) {
  try {
    const vehicleAge = currentYear - vehicle.year;
    const response = await axios.post(`${ML_URL}/predict`, {
      brand: vehicle.brand,
      model: vehicle.model,
      vehicle_age: vehicleAge,
      fuel: vehicle.fuel,
      transmission: vehicle.transmission,
      engine: vehicle.engine,
      max_power: vehicle.max_power,
      seats: vehicle.seats
    }, { timeout: 5000 });
    
    return response.data.predicted_price;
  } catch (error) {
    console.error(`   ⚠️ ML prediction failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCTION: CALCULATE LOGIC-ONLY PRICE
// ═══════════════════════════════════════════════════════════════════

function calculateLogicOnlyPrice(vehicle) {
  const vehicleAge = currentYear - vehicle.year;
  const segmentConfig = SEGMENTS[vehicle.segment] || SEGMENTS["B2-Segment"];
  
  // Depreciation
  let depFactor = 1 - segmentConfig.firstYearDep;
  for (let i = 1; i < vehicleAge; i++) {
    depFactor *= (1 - segmentConfig.subsequentDep);
  }
  depFactor = Math.max(0.1, depFactor);
  
  const baseValue = vehicle.original_price * depFactor;
  
  // Mileage factor
  let mileageFactor = 1.0;
  if (vehicle.mileage > 150000) mileageFactor = 0.72;
  else if (vehicle.mileage > 100000) mileageFactor = 0.82;
  else if (vehicle.mileage > 60000) mileageFactor = 0.90;
  else if (vehicle.mileage > 30000) mileageFactor = 0.95;
  
  // Condition factor
  const conditionMap = { excellent: 1.0, good: 0.9, average: 0.8, damaged: 0.6 };
  const conditionFactor = conditionMap[vehicle.condition] || 0.9;
  
  // Segment weight
  const segmentWeight = segmentConfig.weight;
  
  const logicPrice = baseValue * segmentWeight * mileageFactor * conditionFactor;
  
  return {
    logicPrice: Math.round(logicPrice),
    baseValue: Math.round(baseValue),
    depreciationFactor: depFactor,
    mileageFactor,
    conditionFactor,
    segmentWeight
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN AUDIT FUNCTION
// ═══════════════════════════════════════════════════════════════════

async function runFullAudit() {
  console.log("═".repeat(80));
  console.log("PHASE 6: VEHICLE COMPARISON REPORT");
  console.log("═".repeat(80) + "\n");
  
  const results = [];
  
  for (let i = 0; i < testVehicles.length; i++) {
    const vehicle = testVehicles[i];
    const vehicleAge = currentYear - vehicle.year;
    
    console.log(`\n┌─ TEST ${i + 1}: ${vehicle.name} ${"─".repeat(Math.max(0, 76 - vehicle.name.length))}┐`);
    console.log(`  Brand:               ${vehicle.brand}`);
    console.log(`  Model:               ${vehicle.model}`);
    console.log(`  Year:                ${vehicle.year} (${vehicleAge} years old)`);
    console.log(`  Mileage:             ${vehicle.mileage.toLocaleString("en-IN")} km`);
    console.log(`  Original Price:      ₹${vehicle.original_price.toLocaleString("en-IN")}`);
    console.log(`  Condition:           ${vehicle.condition}`);
    console.log(`  Segment:             ${vehicle.segment}`);
    
    // Get ML prediction
    console.log(`\n  🤖 Fetching ML prediction...`);
    const mlPrice = await getMLPrediction(vehicle);
    
    // Calculate logic-only price
    const logic = calculateLogicOnlyPrice(vehicle);
    
    // Calculate full hybrid price
    let hybridPrice = null;
    if (mlPrice) {
      const pricing = calculateVehiclePricing({
        brand: vehicle.brand,
        model: vehicle.model,
        vehicle_age: vehicleAge,
        year: vehicle.year,
        mileage: vehicle.mileage,
        mlPredictedPrice: mlPrice,
        original_price: vehicle.original_price,
        segment: vehicle.segment,
        condition: vehicle.condition,
      });
      
      hybridPrice = pricing.market_price;
    }
    
    // Display results
    console.log(`\n  ━━━ PRICING RESULTS ━━━`);
    console.log(`  Logic-Only Price:    ₹${logic.logicPrice.toLocaleString("en-IN")}`);
    console.log(`  ML Prediction:       ₹${mlPrice ? mlPrice.toLocaleString("en-IN") : "N/A"}`);
    console.log(`  Hybrid Price (70/30):₹${hybridPrice ? hybridPrice.toLocaleString("en-IN") : "N/A"}`);
    
    console.log(`\n  ━━━ MARKET COMPARISON ━━━`);
    console.log(`  Market Range:        ₹${vehicle.marketRange[0].toLocaleString("en-IN")} - ₹${vehicle.marketRange[1].toLocaleString("en-IN")}`);
    
    const marketMid = (vehicle.marketRange[0] + vehicle.marketRange[1]) / 2;
    
    // Logic vs Market
    const logicInRange = logic.logicPrice >= vehicle.marketRange[0] && logic.logicPrice <= vehicle.marketRange[1];
    const logicDev = ((logic.logicPrice - marketMid) / marketMid * 100).toFixed(1);
    console.log(`  Logic Price:         ${logicInRange ? "✅" : "❌"} ${logicDev > 0 ? "+" : ""}${logicDev}% vs market midpoint`);
    
    // ML vs Market
    if (mlPrice) {
      const mlInRange = mlPrice >= vehicle.marketRange[0] && mlPrice <= vehicle.marketRange[1];
      const mlDev = ((mlPrice - marketMid) / marketMid * 100).toFixed(1);
      console.log(`  ML Price:            ${mlInRange ? "✅" : "❌"} ${mlDev > 0 ? "+" : ""}${mlDev}% vs market midpoint`);
    }
    
    // Hybrid vs Market
    if (hybridPrice) {
      const hybridInRange = hybridPrice >= vehicle.marketRange[0] && hybridPrice <= vehicle.marketRange[1];
      const hybridDev = ((hybridPrice - marketMid) / marketMid * 100).toFixed(1);
      console.log(`  Hybrid Price:        ${hybridInRange ? "✅" : "❌"} ${hybridDev > 0 ? "+" : ""}${hybridDev}% vs market midpoint`);
    }
    
    console.log(`└${"─".repeat(79)}┘`);
    
    results.push({
      vehicle: vehicle.name,
      age: vehicleAge,
      ageGroup: vehicleAge <= 5 ? "0-5y" : vehicleAge <= 10 ? "5-10y" : "10+y",
      segment: vehicle.segment,
      logicPrice: logic.logicPrice,
      mlPrice: mlPrice,
      hybridPrice: hybridPrice,
      marketMin: vehicle.marketRange[0],
      marketMax: vehicle.marketRange[1],
      marketMid: marketMid,
      logicInRange,
      mlInRange: mlPrice ? (mlPrice >= vehicle.marketRange[0] && mlPrice <= vehicle.marketRange[1]) : null,
      hybridInRange: hybridPrice ? (hybridPrice >= vehicle.marketRange[0] && hybridPrice <= vehicle.marketRange[1]) : null
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // PHASE 7: MARKET REALISM ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
  
  console.log("\n" + "═".repeat(80));
  console.log("PHASE 7: MARKET REALISM ANALYSIS");
  console.log("═".repeat(80) + "\n");
  
  const logicCorrect = results.filter(r => r.logicInRange).length;
  const mlCorrect = results.filter(r => r.mlInRange === true).length;
  const hybridCorrect = results.filter(r => r.hybridInRange === true).length;
  
  console.log("Overall Accuracy (Within Market Range):\n");
  console.log(`  Logic Engine:        ${logicCorrect}/${results.length} (${(logicCorrect/results.length*100).toFixed(1)}%)`);
  console.log(`  ML Model:            ${mlCorrect}/${results.length} (${(mlCorrect/results.length*100).toFixed(1)}%)`);
  console.log(`  Hybrid System:       ${hybridCorrect}/${results.length} (${(hybridCorrect/results.length*100).toFixed(1)}%)`);
  
  // Determine winner
  const scores = [
    { name: "Logic Engine", score: logicCorrect },
    { name: "ML Model", score: mlCorrect },
    { name: "Hybrid System", score: hybridCorrect }
  ];
  scores.sort((a, b) => b.score - a.score);
  
  console.log(`\n🏆 Most Accurate: ${scores[0].name} (${scores[0].score}/${results.length})`);
  
  // ═══════════════════════════════════════════════════════════════════
  // PHASE 8: AGE-BASED ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
  
  console.log("\n" + "═".repeat(80));
  console.log("PHASE 8: AGE-BASED ANALYSIS");
  console.log("═".repeat(80) + "\n");
  
  const ageGroups = {
    "0-5y": results.filter(r => r.ageGroup === "0-5y"),
    "5-10y": results.filter(r => r.ageGroup === "5-10y"),
    "10+y": results.filter(r => r.ageGroup === "10+y")
  };
  
  for (const [group, vehicles] of Object.entries(ageGroups)) {
    if (vehicles.length === 0) continue;
    
    console.log(`\n${group} (${vehicles.length} vehicles):`);
    
    const logicAcc = vehicles.filter(v => v.logicInRange).length;
    const mlAcc = vehicles.filter(v => v.mlInRange === true).length;
    const hybridAcc = vehicles.filter(v => v.hybridInRange === true).length;
    
    console.log(`  Logic Accuracy:      ${logicAcc}/${vehicles.length} (${(logicAcc/vehicles.length*100).toFixed(1)}%)`);
    console.log(`  ML Accuracy:         ${mlAcc}/${vehicles.length} (${(mlAcc/vehicles.length*100).toFixed(1)}%)`);
    console.log(`  Hybrid Accuracy:     ${hybridAcc}/${vehicles.length} (${(hybridAcc/vehicles.length*100).toFixed(1)}%)`);
    
    // Check if older vehicles are systematically undervalued
    if (group === "10+y") {
      const avgLogicVsMid = vehicles.map(v => ((v.logicPrice - v.marketMid) / v.marketMid * 100)).reduce((a, b) => a + b, 0) / vehicles.length;
      const avgMLVsMid = vehicles.filter(v => v.mlPrice).map(v => ((v.mlPrice - v.marketMid) / v.marketMid * 100)).reduce((a, b) => a + b, 0) / vehicles.filter(v => v.mlPrice).length;
      
      console.log(`\n  Average deviation from market midpoint:`);
      console.log(`    Logic:  ${avgLogicVsMid.toFixed(1)}%`);
      console.log(`    ML:     ${avgMLVsMid.toFixed(1)}%`);
      
      if (avgLogicVsMid < -10) {
        console.log(`\n  ⚠️ WARNING: Logic engine systematically UNDERVALUES old vehicles by ${Math.abs(avgLogicVsMid).toFixed(1)}%`);
      } else if (avgMLVsMid < -10) {
        console.log(`\n  ⚠️ WARNING: ML model systematically UNDERVALUES old vehicles by ${Math.abs(avgMLVsMid).toFixed(1)}%`);
      } else {
        console.log(`\n  ✅ No systematic undervaluation detected for old vehicles`);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  
  console.log("\n" + "═".repeat(80));
  console.log("AUDIT SUMMARY");
  console.log("═".repeat(80) + "\n");
  
  console.log("Component Ratings:\n");
  
  // Logic Engine Rating
  const logicScore = logicCorrect / results.length;
  let logicRating = "Poor";
  if (logicScore >= 0.9) logicRating = "Excellent";
  else if (logicScore >= 0.75) logicRating = "Very Good";
  else if (logicScore >= 0.6) logicRating = "Good";
  else if (logicScore >= 0.5) logicRating = "Average";
  
  console.log(`  Logic Engine:        ${logicRating} (${(logicScore*100).toFixed(1)}% accuracy)`);
  
  // ML Rating
  const mlScore = mlCorrect / results.length;
  let mlRating = "Poor";
  if (mlScore >= 0.9) mlRating = "Excellent";
  else if (mlScore >= 0.75) mlRating = "Very Good";
  else if (mlScore >= 0.6) mlRating = "Good";
  else if (mlScore >= 0.5) mlRating = "Average";
  
  console.log(`  ML Model:            ${mlRating} (${(mlScore*100).toFixed(1)}% accuracy)`);
  
  // Hybrid Rating
  const hybridScore = hybridCorrect / results.length;
  let hybridRating = "Poor";
  if (hybridScore >= 0.9) hybridRating = "Excellent";
  else if (hybridScore >= 0.75) hybridRating = "Very Good";
  else if (hybridScore >= 0.6) hybridRating = "Good";
  else if (hybridScore >= 0.5) hybridRating = "Average";
  
  console.log(`  Hybrid System:       ${hybridRating} (${(hybridScore*100).toFixed(1)}% accuracy)`);
  
  console.log(`\nMost Accurate Component: ${scores[0].name}`);
  
  console.log("\n✅ Full audit complete. No code modified.");
}

// Run audit
runFullAudit().catch(error => {
  console.error("❌ Audit failed:", error.message);
  process.exit(1);
});
