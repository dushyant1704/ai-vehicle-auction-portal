# Valuation System Implementation Plan

✅ **APPROVED**: User confirmed plan for minimal targeted improvements

## Step-by-Step Implementation (5 steps)

### [ ] 1. Create this TODO.md (Current step - ✅ DONE)

### [ ] 2. Update pricingEngine.js

- Ensure computeValuationMetrics strictly uses calculateIDV for insurance_value
- Standardize distress_value = finalPrice \* 0.75
- Add explicit comments for "STRICT IRDA IDV" separation

### [ ] 3. Update priceController.js

- Consistent API response keys (ai_price → market_price)
- vehicle_age fallback from year if missing
- Add debug logging for IDV vs Market separation

### [ ] 4. Enhance Frontend Displays

- VehicleDetails.tsx: Clarify "Insurance Value (IDV)" labels
- Add loading states for valuation metrics
- VehicleCard.tsx: Show compact IDV badge

### [ ] 5. Testing & Verification

```
# Backend tests
node ai auction portal backend/utils/testPricingEngine.js
curl -X POST http://localhost:5000/api/predict-price -d '{"brand":"Maruti","model":"Swift","vehicle_age":3,"mileage":50000,"original_price":700000,"segment":"B2-Segment"}'

# Frontend verification
- AddVehicle.tsx: Test missing original_price fallback
- VehicleDetails.tsx: Verify all 6 metrics display
- Check IDV independence from market price
```

### [ ] 6. Final Completion

```
attempt_completion
```


