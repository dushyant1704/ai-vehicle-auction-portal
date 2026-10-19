═══════════════════════════════════════════════════════════════════════════════
BRAND/MODEL DISCRIMINATION AUDIT REPORT
ML Model Analysis: Swift vs i10 Pricing Predictions
═══════════════════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
─────────────────────────────────────────────────────────────────────────────

FINDING: The ML model shows POOR brand/model discrimination capability.

The difference in Swift vs i10 predictions (₹181k vs ₹190k for 2010 models) is NOT
primarily due to brand/model differentiation. Instead, it's driven by technical
specifications (engine displacement, power output) which both vehicles happen to
share but with slight differences.

⚠️ CRITICAL ISSUE: Brand and model features have extremely low importance:

- Brand importance: 2.87% (only 1/35th of max_power importance)
- Model importance: 2.09% (only 1/28th of max_power importance)
- Combined: 4.96% (almost irrelevant compared to 59.16% for power alone)

═══════════════════════════════════════════════════════════════════════════════

1. TRAINING SAMPLE COUNTS
   ─────────────────────────────────────────────────────────────────────────────

Swift Samples: 781 (from 15,411 total dataset)
i10 Samples: 410
Sample Ratio: Swift has 1.90x more training data

Average Prices (from training data):
• Swift: ₹471,736 (median: ₹465,000)
• i10: ₹279,176 (median: ₹275,000)
• Difference: ₹192,560 (Swift is 69% more expensive)

Price Range:
• Swift: ₹120,000 - ₹875,000 (std dev: ₹138,721)
• i10: ₹100,000 - ₹500,000 (std dev: ₹76,272)

⚠️ OBSERVATION: Swift has higher average price despite lower model importance.

═══════════════════════════════════════════════════════════════════════════════

2. SAMPLE COUNT BY VEHICLE AGE
   ─────────────────────────────────────────────────────────────────────────────

SWIFT - Distribution by Age:
Age 1: 10 samples | ₹626,500 avg | 1207cc/80.2bhp
Age 2: 43 samples | ₹627,419 avg | 1205cc/80.6bhp
Age 3: 102 samples | ₹647,971 avg | 1217cc/78.8bhp
Age 4: 74 samples | ₹564,014 avg | 1223cc/78.0bhp
Age 5: 78 samples | ₹508,974 avg | 1223cc/78.1bhp
Age 6: 117 samples | ₹487,915 avg | 1228cc/77.4bhp
Age 7: 88 samples | ₹434,648 avg | 1232cc/77.1bhp
Age 8: 86 samples | ₹402,256 avg | 1235cc/76.8bhp
Age 9: 74 samples | ₹380,189 avg | 1234cc/77.2bhp
Age 10: 35 samples | ₹319,257 avg | 1233cc/78.0bhp

i10 - Distribution by Age:
Age 4: 2 samples | ₹392,500 avg | 1086cc/68.0bhp
Age 5: 25 samples | ₹402,680 avg | 1117cc/71.1bhp
Age 6: 20 samples | ₹346,650 avg | 1119cc/71.3bhp
Age 7: 29 samples | ₹313,793 avg | 1147cc/74.0bhp
Age 8: 46 samples | ₹311,261 avg | 1166cc/75.8bhp
Age 9: 76 samples | ₹288,263 avg | 1160cc/75.4bhp
Age 10: 74 samples | ₹270,703 avg | 1173cc/76.6bhp
Age 11: 67 samples | ₹242,552 avg | 1172cc/76.5bhp
Age 12: 42 samples | ₹222,000 avg | 1155cc/74.8bhp
Age 13: 26 samples | ₹195,154 avg | 1129cc/72.3bhp

OBSERVATION: i10 training data maxes out at age 13, while Swift has data down to
age 10. The 2010 model (16 years old) is OUTSIDE the typical training range.

═══════════════════════════════════════════════════════════════════════════════

3. FEATURE IMPORTANCE ANALYSIS (TOP 20)
   ─────────────────────────────────────────────────────────────────────────────

Rank Feature Importance Bar Chart
────────────────────────────────────────────────────────────────
1 max_power 59.16% ██████████████████████████████
2 engine 16.05% ████████
3 vehicle_age 11.14% █████
4 seats 4.25% ██
5 transmission 3.09% █
6 brand 2.87% █
7 model 2.09% █
8 fuel 1.35%

MODEL PERFORMANCE:
• R² Score: 0.9487 (explains 94.87% of variance)
• MAE: ₹97,136
• RMSE: ₹196,579
• MAPE: 13.88%

⚠️ CRITICAL FINDINGS:

✓ Overall model quality is GOOD (R² = 0.9487)

✗ Brand discrimination is POOR: - Brand importance: 2.87% - Model importance: 2.09% - Combined: 4.96% - Price driven by power (59.16%) not brand/model identity

✗ The model relies excessively on technical specs: - max_power alone explains more than brand+model+transmission combined - vehicle_age is 4x more important than brand - This makes discrimination between similar cars weak

═══════════════════════════════════════════════════════════════════════════════

4. BRAND/MODEL ENCODING VERIFICATION
   ─────────────────────────────────────────────────────────────────────────────

ENCODING MAPPINGS (Alphabetical order - LabelEncoder):

Brand Encodings:
Audi→0, BMW→1, Bentley→2, Datsun→3, Ferrari→4, Force→5, Ford→6, Honda→7,
Hyundai→8, ISUZU→9, Isuzu→10, Jaguar→11, Jeep→12, Kia→13, Land Rover→14,
Lexus→15, MG→16, Mahindra→17, Maruti→18, Maserati→19, Mercedes-AMG→20,
Mercedes-Benz→21, Mini→22, Nissan→23, Porsche→24, Renault→25,
Rolls-Royce→26, Skoda→27, Tata→28, Toyota→29, Volkswagen→30, Volvo→31

Model Encodings (120 unique models):
3→0, 5→1, 6→2, 7→3, A4→4, A6→5, A8→6, Alto→7, Altroz→8, Alturas→9,
Amaze→10, Aspire→11, Aura→12, Baleno→13, Bolero→14, C→15, C-Class→16,
CLS→17, CR→18, CR-V→19, ... (101 more)

TARGET VEHICLES - ENCODINGS:
Maruti brand: 18
Swift model: 88
Hyundai brand: 8
i10 model: 117

✅ VERIFICATION RESULT: Encodings are working correctly.
The numerical values are stable and consistent mappings.

═══════════════════════════════════════════════════════════════════════════════

5. LABEL ENCODING BIAS CHECK
   ─────────────────────────────────────────────────────────────────────────────

Risk: LabelEncoder encodes categories alphabetically. If prices correlate with
alphabetical order, this creates spurious bias.

Correlation Analysis:
Brand encoding values vs. Average brand prices: -0.1060

⚠️ INTERPRETATION:

- Correlation is NEGATIVE and WEAK
- No significant ordering bias detected
- ✅ Encodings are NOT causing category ordering bias

Brand Prices (showing no correlation with encoding value):
• Encoding 0 (Audi): ₹1,966,865
• Encoding 4 (Ferrari): ₹39,500,000 (highest!)
• Encoding 18 (Maruti): ₹487,089 (typical budget)
• Encoding 26 (Rolls-Royce): ₹24,200,000 (very high)

Example: Higher encoding values don't consistently mean higher prices.

═══════════════════════════════════════════════════════════════════════════════

6. SWIFT vs i10 DISTINCTION - ENGINE SPECIFICATIONS
   ─────────────────────────────────────────────────────────────────────────────

SWIFT Engine Variants (from training data):
Engine Power Samples Avg Price
────────────────────────────────────────
1197cc 85.0bhp 35 ₹324,914
1197cc 81.8bhp 223 ₹530,924
1197cc 85.8bhp 56 ₹385,250
1197cc 83.1bhp 14 ₹469,214
1248cc 75.0bhp 42 ₹285,833
1248cc 74.0bhp 391 ₹495,235
1298cc 88.2bhp 20 ₹243,650

i10 Engine Variants (from training data):
Engine Power Samples Avg Price
────────────────────────────────────────
1086cc 68.0bhp 145 ₹266,455
1086cc 68.1bhp 4 ₹358,250
1197cc 78.9bhp 251 ₹282,773
1197cc 80.0bhp 10 ₹341,700

KEY OBSERVATION:
• Swift has predominantly 1197-1298cc engines (223+35+56+14 = 328 samples)
• i10 has mix of 1086cc and 1197cc engines
• Most i10s (251/410) use 1086cc engine
• When both use 1197cc: - Swift 1197cc/81.8bhp averages ₹530,924 - i10 1197cc/78.9bhp averages ₹282,773 - This 88% price difference is partly engine, partly brand perception
• BUT: Since model importance is only 2.09%, this brand difference is minimized

═══════════════════════════════════════════════════════════════════════════════

7. PREDICTIONS FOR 2010 MODELS (16 YEARS OLD)
   ─────────────────────────────────────────────────────────────────────────────

INPUT SCENARIO: 2010 Maruti Swift vs 2010 Hyundai i10
Vehicle Age: 16 years
Fuel: Petrol
Transmission: Manual
Seats: 5

Using first available variant from training data:

2010 MARUTI SWIFT:
Engine: 1197cc
Power: 85.0 bhp
Encoding: Maruti(18) + Swift(88)

🔮 ML PREDICTION: ₹181,371

2010 HYUNDAI i10:
Engine: 1197cc
Power: 78.9 bhp
Encoding: Hyundai(8) + i10(117)

🔮 ML PREDICTION: ₹190,246

DIFFERENCE:
i10 prediction is ₹8,874 HIGHER (+4.9%)

⚠️ UNEXPECTED RESULT: Despite i10 being cheaper in training data, the model
predicts it 5% higher for a 2010 model. This is because: 1. The prediction uses i10's 78.9 bhp (vs Swift's 85 bhp) 2. At 16 years age, model/brand factors barely matter (2.87% + 2.09%) 3. The slightly lower power of i10 shouldn't push it higher 4. This suggests the model is EXTRAPOLATING poorly outside its training data

═══════════════════════════════════════════════════════════════════════════════

8. BRAND/MODEL ENCODING IMPACT TEST (Engine Swap Experiment)
   ─────────────────────────────────────────────────────────────────────────────

Hypothesis: If brand/model matter, swapping engine specs should have minimal
impact. If they don't matter, swapping should have large impact.

Original Predictions (correct specs):
Swift: ₹181,371 (1197cc/85.0bhp)
i10: ₹190,246 (1197cc/78.9bhp)

Swapped Engine Specs:
Swift with i10 engine (1197cc/78.9bhp): ₹187,332 (change: +3.3%)
i10 with Swift engine (1197cc/85.0bhp): ₹193,397 (change: +1.7%)

⚠️ CRITICAL FINDING:

✓ Small changes when swapping engines (+1.7% to +3.3%)

✗ This proves brand/model encodings have MINIMAL impact on predictions

What changed:
• Power dropped by 6.1 bhp for Swift
• Power increased by 6.1 bhp for i10
• This ~7% power change caused only ~2-3% price change
• Brand (Swift→i10 or vice versa) caused almost no additional change

Interpretation:
The model is NOT effectively discriminating between Swift and i10 based on
their brand/model identity. The small 4.9% difference in predictions is
almost entirely due to the engine power difference (85 vs 78.9 bhp), not
the 4.96% combined importance of brand+model features.

═══════════════════════════════════════════════════════════════════════════════

9. EXPECTED vs PREDICTED MARKET VALUE
   ─────────────────────────────────────────────────────────────────────────────

Market Expectations (based on training data patterns):

For 2010 models (16 years old), extrapolating the depreciation curves:

2010 SWIFT - Expected Market Value:
Training data shows Swift at age 10 averages ₹319,257
Depreciation per year appears to be ~₹30-40k
Conservative estimate for 16-year-old Swift: ₹150,000 - ₹200,000

ML Prediction: ₹181,371 ✓ REASONABLE (within expected range)

2010 i10 - Expected Market Value:
Training data shows i10 at age 13 averages ₹195,154
For 16 years, likely: ₹140,000 - ₹170,000

ML Prediction: ₹190,246 ✗ SLIGHTLY HIGH (above expected)

Note: 2010 models are at/beyond the edge of training data (Swift max age 10,
i10 max age 13), so predictions are EXTRAPOLATIONS with higher uncertainty.

═══════════════════════════════════════════════════════════════════════════════

10. COMPREHENSIVE FINDINGS & DIAGNOSIS
    ─────────────────────────────────────────────────────────────────────────────

DOES THE MODEL PROPERLY LEARN BRAND/MODEL VALUE DIFFERENCES?

Answer: ❌ NO - The model shows POOR discrimination ability.

Evidence:

1. Brand importance: 2.87% (extremely low)
2. Model importance: 2.09% (extremely low)
3. Engine swap experiment: Only 2-3% price change when swapping brands
4. Feature dominance: 59% of price is just max_power, overwhelming brand/model
5. Label encoding bias: None detected, so it's intentional (not a bug)

WHY IS SWIFT vs i10 DIFFERENT?

The ₹8,874 (4.9%) difference between the predictions is NOT because the model
recognizes Swift vs i10 as distinct brands/models. Instead:

• Swift's 85.0 bhp vs i10's 78.9 bhp creates ~3-4% price difference
• The remaining ~1% difference might be residual model/brand effect
• But this 1% is mathematically insignificant given 2.09% model importance

CORRECT INTERPRETATION:

The model predicts Swift slightly lower than i10 for 2010 models, but NOT because
it understands brand differences. Rather:
• Lower power (78.9 < 85.0) normally prices lower
• But 16 years age puts both cars in extrapolation territory
• The model's training doesn't extend to such old vehicles
• Result: Slightly unreliable predictions for out-of-sample ages

ROOT CAUSE OF POOR DISCRIMINATION:

The ML model is a TECHNICAL SPEC PREDICTOR, not a BRAND DISCRIMINATOR:

It learns: "Power, engine size, and age determine price"

It ignores: "Swift is a more popular budget brand", "i10 has brand identity",
"Swift has better resale value in some markets"

Result: Two cars with similar specs get similar prices, regardless of actual
market demand and brand perception differences.

═══════════════════════════════════════════════════════════════════════════════

11. SUMMARY TABLE - KEY METRICS
    ─────────────────────────────────────────────────────────────────────────────

Metric Value Status
────────────────────────────────────────────────────────────────
Swift Training Samples 781 ✓ Sufficient
i10 Training Samples 410 ⚠ Lower

Swift Average Price ₹471,736 ✓ Clear data
i10 Average Price ₹279,176 ✓ Clear data

Brand Encoding - Working Correctly Yes ✓ Verified
Model Encoding - Working Correctly Yes ✓ Verified
Label Encoding Bias No ✓ None found

Brand Feature Importance 2.87% ❌ Too Low
Model Feature Importance 2.09% ❌ Too Low

Swift vs i10 Prediction Difference ₹8,874 ⚠ Minimal
Difference as % of average 4.9% ⚠ Small

2010 Swift Prediction ₹181,371 ✓ Reasonable
2010 i10 Prediction ₹190,246 ⚠ Slightly high

Engine Swap Impact 2-3% ⚠ Low
Brand/Model Encoding Impact ~1% ❌ Negligible

Model Extrapolation (Age 16) Poor ❌ Beyond training
Training Data Max Age Swift: 10 yrs ❌ Below 16
i10: 13 yrs ❌ Below 16

═══════════════════════════════════════════════════════════════════════════════

CONCLUSION
─────────────────────────────────────────────────────────────────────────────

The ML model IS FUNCTIONALLY CORRECT in terms of:
✓ Training properly (R² = 0.9487)
✓ Encoding working correctly (no encoding bias)
✓ Making reasonable predictions for in-sample ages

However, the model DOES NOT effectively discriminate by brand/model:
❌ Brand/model importance: 4.96% (vs 59.16% for power)
❌ Minimal price difference when brand/model swapped
❌ Pricing driven almost entirely by technical specs
❌ Does not capture brand reputation, market demand, or perceived value

For 2010 models specifically:
⚠ Age 16 is OUTSIDE training data (max was 10-13)
⚠ Predictions are EXTRAPOLATIONS with higher uncertainty
⚠ Models may not be reliable this far beyond training range

RECOMMENDATION:
The low brand/model importance might be APPROPRIATE if the dataset doesn't
show strong price correlations by brand. However, if brand/model should
matter more in real markets, the model needs: 1. Feature engineering (e.g., brand-based buckets) 2. Different algorithms (e.g., tree-based models that naturally distinguish) 3. More training data with explicit brand/model variance 4. Possibly a weighted feature approach emphasizing brand more

═══════════════════════════════════════════════════════════════════════════════
END OF AUDIT
═══════════════════════════════════════════════════════════════════════════════
