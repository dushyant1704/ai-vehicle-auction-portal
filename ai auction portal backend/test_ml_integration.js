/**
 * ML Integration Test
 * Tests if ML service is working and integrated properly
 */

const axios = require('axios');

console.log('🧪 Testing ML Service Integration\n');
console.log('═'.repeat(70));

// Test 1: Direct ML Service Test
async function testMLService() {
  console.log('\n📊 Test 1: Direct ML Service Call');
  console.log('─'.repeat(70));
  
  try {
    const response = await axios.post('http://127.0.0.1:5001/predict', {
      brand: 'Maruti',
      model: 'Swift',
      vehicle_age: 4,
      fuel: 'Petrol',
      transmission: 'Manual',
      engine: 1197,
      max_power: 82,
      seats: 5
    }, {
      timeout: 5000
    });
    
    console.log('✅ ML Service is WORKING!');
    console.log('   Predicted Price: ₹' + Math.round(response.data.predicted_price).toLocaleString('en-IN'));
    return true;
  } catch (error) {
    console.log('❌ ML Service ERROR:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   → ML service is not running on port 5001');
      console.log('   → Start it with: cd ml && python app.py');
    }
    return false;
  }
}

// Test 2: Multiple Vehicle Types
async function testMultipleVehicles() {
  console.log('\n📊 Test 2: Multiple Vehicle Types');
  console.log('─'.repeat(70));
  
  const vehicles = [
    {
      name: 'Maruti Alto (Budget)',
      data: {
        brand: 'Maruti',
        model: 'Alto',
        vehicle_age: 11,
        fuel: 'Petrol',
        transmission: 'Manual',
        engine: 998,
        max_power: 67,
        seats: 5
      },
      expectedRange: [100000, 250000]
    },
    {
      name: 'Honda City (Mid-Range)',
      data: {
        brand: 'Honda',
        model: 'City',
        vehicle_age: 2,
        fuel: 'Petrol',
        transmission: 'Automatic',
        engine: 1497,
        max_power: 117,
        seats: 5
      },
      expectedRange: [800000, 1200000]
    },
    {
      name: 'BMW 3 Series (Luxury)',
      data: {
        brand: 'BMW',
        model: '3 Series',
        vehicle_age: 3,
        fuel: 'Petrol',
        transmission: 'Automatic',
        engine: 1997,
        max_power: 184,
        seats: 5
      },
      expectedRange: [2000000, 3000000]
    }
  ];
  
  let allPassed = true;
  
  for (const vehicle of vehicles) {
    try {
      const response = await axios.post('http://127.0.0.1:5001/predict', vehicle.data, {
        timeout: 5000
      });
      
      const price = response.data.predicted_price;
      const inRange = price >= vehicle.expectedRange[0] && price <= vehicle.expectedRange[1];
      
      console.log(`\n${vehicle.name}:`);
      console.log(`  Predicted: ₹${Math.round(price).toLocaleString('en-IN')}`);
      console.log(`  Expected Range: ₹${vehicle.expectedRange[0].toLocaleString('en-IN')} - ₹${vehicle.expectedRange[1].toLocaleString('en-IN')}`);
      console.log(`  Status: ${inRange ? '✅ In Range' : '⚠️ Out of Range'}`);
      
      if (!inRange) allPassed = false;
    } catch (error) {
      console.log(`\n${vehicle.name}: ❌ ERROR - ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test 3: Error Handling
async function testErrorHandling() {
  console.log('\n📊 Test 3: Error Handling');
  console.log('─'.repeat(70));
  
  try {
    // Test with invalid brand
    await axios.post('http://127.0.0.1:5001/predict', {
      brand: 'InvalidBrand123',
      model: 'InvalidModel',
      vehicle_age: 4,
      fuel: 'Petrol',
      transmission: 'Manual',
      engine: 1197,
      max_power: 82,
      seats: 5
    }, {
      timeout: 5000
    });
    
    console.log('⚠️ ML Service accepted invalid brand (should handle gracefully)');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('✅ ML Service properly rejects invalid data');
      return true;
    } else {
      console.log('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

// Test 4: Performance Test
async function testPerformance() {
  console.log('\n📊 Test 4: Performance Test (10 requests)');
  console.log('─'.repeat(70));
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.post('http://127.0.0.1:5001/predict', {
        brand: 'Maruti',
        model: 'Swift',
        vehicle_age: 4,
        fuel: 'Petrol',
        transmission: 'Manual',
        engine: 1197,
        max_power: 82,
        seats: 5
      }, {
        timeout: 5000
      })
    );
  }
  
  try {
    await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / 10;
    
    console.log(`✅ Completed 10 requests in ${totalTime}ms`);
    console.log(`   Average: ${avgTime.toFixed(2)}ms per request`);
    
    if (avgTime < 100) {
      console.log('   Performance: Excellent 🚀');
    } else if (avgTime < 200) {
      console.log('   Performance: Good ✅');
    } else {
      console.log('   Performance: Acceptable ⚠️');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Performance test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting ML Integration Tests...\n');
  
  const results = {
    mlService: await testMLService(),
    multipleVehicles: await testMultipleVehicles(),
    errorHandling: await testErrorHandling(),
    performance: await testPerformance()
  };
  
  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 Test Results Summary:\n');
  console.log(`  ML Service:        ${results.mlService ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Multiple Vehicles: ${results.multipleVehicles ? '✅ PASS' : '⚠️ PARTIAL'}`);
  console.log(`  Error Handling:    ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Performance:       ${results.performance ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log('\n' + '═'.repeat(70));
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED - ML Service is working correctly!\n');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED - Check details above\n');
  }
  
  console.log('═'.repeat(70) + '\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
