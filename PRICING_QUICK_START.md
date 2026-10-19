# 🚀 Pricing System - Quick Start Guide

## TL;DR

**One unified pricing engine. One function call. Complete valuation.**

```javascript
const { calculateVehiclePricing } = require('./utils/unifiedPricingEngine');

const pricing = calculateVehiclePricing({
  brand: 'Maruti',
  model: 'Swift',
  vehicle_age: 4,
  mileage: 45000,
  mlPredictedPrice: 470000,
  original_price: 650000,  // Optional but recommended
  segment: 'B1-Segment',   // Optional (auto-detected)
  condition: 'good'        // Optional (default: 'good')
});

console.log(pricing.market_price); // ₹3,36,651
```

---

## 📦 What You Get

```javascript
{
  // Primary Values
  market_price: 336651,      // AI-calculated market value
  ai_price: 336651,          // Alias for compatibility
  
  // Base Calculations
  original_price: 650000,    // Ex-showroom/purchase price
  base_value: 363225,        // Depreciated base value
  ml_price: 470000,          // ML model prediction
  
  // Derived Valuations
  insurance_value: 325000,   // IRDA-compliant IDV
  residual_value: 235656,    // 3-year projected value
  distress_value: 252488,    // Quick sale value
  salvage_value: 67330,      // Scrap/parts value
  
  // Factors & Metadata
  segment: 'B1-Segment',
  segment_weight: 0.9,
  depreciation_factor: 0.559,
  depreciation_rate: 0.14,
  mileage_factor: 0.95,
  condition: 'good',
  condition_factor: 0.9,
  price_source: 'user_provided'
}
```

---

## 🎯 Common Use Cases

### 1. Price Prediction API
```javascript
// controllers/priceController.js
const { calculateVehiclePricing } = require('../utils/unifiedPricingEngine');

exports.predictPrice = async (req, res) => {
  const mlPrice = await getMlPrediction(req.body);
  
  const pricing = calculateVehiclePricing({
    ...req.body,
    mlPredictedPrice: mlPrice
  });
  
  res.json(pricing);
};
```

### 2. Vehicle Listing
```javascript
// routes/vehicleRoutes.js
const { calculateSimpleValuation } = require('../utils/unifiedPricingEngine');

const mlPrice = await getMlPrediction(vehicle);
const valuation = calculateSimpleValuation(mlPrice, vehicle.mileage);

return {
  ...vehicle,
  marketPrice: valuation.market_price,
  insuranceValue: valuation.insurance_value,
  // ... other values
};
```

### 3. Frontend Display
```typescript
// AddVehicle.tsx
const res = await axios.post('/api/predict-price', vehicleData);

setResults({
  ai_price: res.data.market_price,
  insurance_value: res.data.insurance_value,
  residual_value: res.data.residual_value,
  // ... other values
});
```

---

## 🔧 API Endpoints

### POST /api/predict-price

**Request:**
```json
{
  "brand": "Maruti",
  "model": "Swift",
  "year": 2020,
  "mileage": 45000,
  "fuel": "Petrol",
  "transmission": "Manual",
  "engine": 1197,
  "max_power": 82,
  "seats": 5,
  "original_price": 650000,
  "segment": "B1-Segment",
  "condition": "good"
}
```

**Response:**
```json
{
  "market_price": 336651,
  "ai_price": 336651,
  "base_price": 650000,
  "base_value": 363225,
  "ml_price": 470000,
  "insurance_value": 325000,
  "residual_value": 235656,
  "distress_value": 252488,
  "salvage_value": 67330,
  "segment": "B1-Segment",
  "segment_weight": 0.9,
  "depreciation_rate": 0.14,
  "mileage_factor": 0.95,
  "condition": "good",
  "condition_factor": 0.9,
  "price_source": "user_provided"
}
```

---

## 📊 Segments

| Segment | Examples | Weight | Depreciation |
|---------|----------|--------|--------------|
| A-Segment | Alto, Kwid | 0.8 | 20% → 13% |
| B1-Segment | Swift, WagonR | 0.9 | 18% → 12% |
| B2-Segment | i20, Baleno | 1.0 | 17% → 11% |
| C1-Segment | Creta, City | 1.1 | 16% → 10% |
| C2-Segment | Seltos, Octavia | 1.2 | 15% → 9% |
| D1-Segment | Fortuner, XUV700 | 1.3 | 15% → 9% |
| Luxury | BMW, Audi, Mercedes | 1.6 | 25% → 15% |
| Exotic | Lamborghini, Ferrari | 1.8 | 8% → 5% |

**Auto-detection:** If segment not provided, automatically detected from brand.

---

## 🎨 Conditions

| Condition | Factor | Description |
|-----------|--------|-------------|
| excellent | 1.0 | Like new, no issues |
| good | 0.9 | Minor wear, well maintained |
| average | 0.8 | Normal wear, some issues |
| damaged | 0.6 | Significant damage/issues |

**Default:** `good` if not specified

---

## 💡 Price Sources

| Source | Priority | Description |
|--------|----------|-------------|
| user_provided | 1 | User-entered original price (most accurate) |
| model_database | 2 | Curated ex-showroom prices |
| segment_average | 3 | Segment-based fallback |
| ml_estimated | 4 | Reverse-engineered from ML (last resort) |

---

## ⚡ Quick Examples

### Example 1: With Original Price
```javascript
const pricing = calculateVehiclePricing({
  brand: 'Honda',
  model: 'City',
  vehicle_age: 2,
  mileage: 25000,
  mlPredictedPrice: 950000,
  original_price: 1150000,  // ✅ Most accurate
  condition: 'good'
});
// Result: ₹8,87,494
```

### Example 2: Without Original Price
```javascript
const pricing = calculateVehiclePricing({
  brand: 'Honda',
  model: 'City',
  vehicle_age: 2,
  mileage: 25000,
  mlPredictedPrice: 950000,
  // No original_price - uses database (₹11,50,000)
  condition: 'good'
});
// Result: ₹8,87,494 (same - database has correct price)
```

### Example 3: Simple Valuation (Listings)
```javascript
const valuation = calculateSimpleValuation(850000, 60000);
// Returns: market_price, insurance_value, base_value, etc.
```

---

## 🧪 Testing

```bash
# Run test suite
cd "ai auction portal backend"
node test_unified_pricing.js

# Expected output:
# ✅ ALL TESTS PASSED - Pricing engine is working correctly!
```

---

## 🐛 Common Issues

### Issue: Prices too low
**Check:** Original price is correct (not asking price)

### Issue: Segment wrong
**Solution:** Explicitly provide segment parameter

### Issue: ML service down
**No problem:** System uses ₹8L fallback, pricing still works

### Issue: Missing fields
**Error:** Clear validation message tells you what's missing

---

## 📚 Full Documentation

- **Complete Guide:** `PRICING_SYSTEM_FIXED.md`
- **Migration:** `PRICING_MIGRATION_GUIDE.md`
- **Summary:** `PRICING_FIX_COMPLETE_SUMMARY.md`
- **Source Code:** `ai auction portal backend/utils/unifiedPricingEngine.js`

---

## ✅ Checklist

Before using the pricing system:

- [ ] ML service running on port 5001
- [ ] Database connected
- [ ] Required fields provided (brand, model, age, mileage, fuel, transmission, engine, max_power, seats)
- [ ] Original price provided (optional but recommended)
- [ ] Condition set (optional, defaults to 'good')

---

## 🎯 Key Takeaways

1. **One function** - `calculateVehiclePricing()` does everything
2. **Smart fallbacks** - Works even without original price
3. **Auto-detection** - Segment detected from brand
4. **Complete output** - All valuations in one response
5. **Error-proof** - Handles missing data gracefully

---

## 🚀 Ready to Use

```javascript
// That's it! You're ready to go.
const { calculateVehiclePricing } = require('./utils/unifiedPricingEngine');

// One call, complete valuation
const pricing = calculateVehiclePricing({ /* your data */ });
```

**Happy coding! 🎉**
