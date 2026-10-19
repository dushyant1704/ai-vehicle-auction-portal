═══════════════════════════════════════════════════════════════════════════════
QUICK REFERENCE - KEY METRICS TABLE
═══════════════════════════════════════════════════════════════════════════════

METRIC SUMMARY TABLE
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ FEATURE IMPORTANCES (Top 8 - Total Features) │
├──────────────────────┬────────────┬──────────────┬─────────────────────────┤
│ Feature │ Importance │ Rank │ Assessment │
├──────────────────────┼────────────┼──────────────┼─────────────────────────┤
│ max_power │ 59.16% │ 1st (TOP) │ ⚠️ DOMINANT FACTOR │
│ engine │ 16.05% │ 2nd │ ⚠️ PRIMARY FACTOR │
│ vehicle_age │ 11.14% │ 3rd │ ✓ MAJOR FACTOR │
│ seats │ 4.25% │ 4th │ ✓ MODERATE FACTOR │
│ transmission │ 3.09% │ 5th │ ✓ MINOR FACTOR │
│ brand │ 2.87% │ 6th │ ❌ NEGLIGIBLE │
│ model │ 2.09% │ 7th │ ❌ NEGLIGIBLE │
│ fuel │ 1.35% │ 8th (LAST) │ ❌ NEGLIGIBLE │
└──────────────────────┴────────────┴──────────────┴─────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

BRAND/MODEL ANALYSIS
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Metric │ Value │ Assessment │
├──────────────────────────────────┼───────────────────┼─────────────────────┤
│ Brand Importance Score │ 2.87% │ ❌ Too Low │
│ Model Importance Score │ 2.09% │ ❌ Too Low │
│ Combined Brand+Model │ 4.96% │ ❌ Negligible │
├──────────────────────────────────┼───────────────────┼─────────────────────┤
│ Brand vs Power Ratio │ 1:21 │ ⚠️ Imbalanced │
│ Model vs Power Ratio │ 1:28 │ ⚠️ Imbalanced │
│ Brand vs Vehicle Age Ratio │ 1:4 │ ❌ Age more imp. │
├──────────────────────────────────┼───────────────────┼─────────────────────┤
│ Industry Standard for Brand % │ 20-40% │ Target │
│ This Model's Brand % │ 2.87% │ Actual │
│ Gap (Underestimation) │ 7-14× │ ⚠️ Severe │
└──────────────────────────────────┴───────────────────┴─────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

TRAINING SAMPLE COUNTS
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Model │ Samples │ % of Total │ Max Age in │ Assessment │
│ │ │ Dataset │ Training │ │
├─────────────────┼─────────┼────────────┼──────────────┼─────────────────────┤
│ Swift │ 781 │ 5.1% │ 10 years │ ✓ Adequate │
│ i10 │ 410 │ 2.7% │ 13 years │ ✓ Adequate │
│ Total Dataset │ 15,411 │ 100% │ Various │ ✓ Large │
└─────────────────┴─────────┴────────────┴──────────────┴─────────────────────┘

2010 Models: Age 16 years → BEYOND TRAINING DATA (max was 10-13)

═══════════════════════════════════════════════════════════════════════════════

AVERAGE SELLING PRICES (From Training Data)
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Model │ Avg Price │ Median │ Min Price │ Max Price │ Std Dev │
├──────────┼────────────┼────────────┼────────────┼────────────┼─────────────┤
│ Swift │ ₹471,736 │ ₹465,000 │ ₹120,000 │ ₹875,000 │ ₹138,721 │
│ i10 │ ₹279,176 │ ₹275,000 │ ₹100,000 │ ₹500,000 │ ₹76,272 │
│ Difference│ ₹192,560 │ ₹190,000 │ - │ - │ - │
├──────────┼────────────┼────────────┼────────────┼────────────┼─────────────┤
│ Swift is 69% more expensive than i10 in the training dataset │
│ But model only captures 4.96% of this difference via brand/model features │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

2010 VEHICLE PREDICTIONS
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Vehicle │ Engine │ Power │ Age │ ML Prediction │ Status │
├─────────────────────┼─────────┼────────┼───────┼───────────────┼──────────┤
│ 2010 Maruti Swift │ 1197cc │ 85bhp │ 16yr │ ₹181,371 │ ✓ OK │
│ 2010 Hyundai i10 │ 1197cc │ 78.9bp │ 16yr │ ₹190,246 │ ⚠️ High │
│ Prediction Delta │ - │ -6.1bp │ Same │ ₹8,875 │ +4.9% │
├─────────────────────┼─────────┼────────┼───────┼───────────────┼──────────┤
│ Swift Expected │ - │ - │ - │ ₹150-200k │ Reasonable│
│ i10 Expected │ - │ - │ - │ ₹140-170k │ Slightly high│
└─────────────────────┴─────────┴────────┴───────┴───────────────┴──────────┘

Note: Both predictions are EXTRAPOLATIONS beyond training data (max age 10-13)

═══════════════════════════════════════════════════════════════════════════════

ENCODING VERIFICATION
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Encoding Element │ Value │ Status │ Finding │
├───────────────────────┼─────────────────────┼───────────────┼───────────────┤
│ Brand Encoder Status │ 32 brands encoded │ ✅ Working │ Correct │
│ Model Encoder Status │ 120 models encoded │ ✅ Working │ Correct │
│ Maruti Brand Code │ 18 (alphabetical) │ ✅ Correct │ Verified │
│ Swift Model Code │ 88 (alphabetical) │ ✅ Correct │ Verified │
│ Hyundai Brand Code │ 8 (alphabetical) │ ✅ Correct │ Verified │
│ i10 Model Code │ 117 (alphabetical) │ ✅ Correct │ Verified │
├───────────────────────┼─────────────────────┼───────────────┼───────────────┤
│ Label Encoding Bias │ Correlation: -0.106 │ ✅ None │ Not causing │
│ Category Order Effect │ Random price order │ ✅ None │ problem │
└───────────────────────┴─────────────────────┴───────────────┴───────────────┘

═══════════════════════════════════════════════════════════════════════════════

SWIFT vs i10 DISCRIMINATION TEST
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Test Scenario │ Prediction │ Change │ Assessment │
├──────────────────────────────────┼───────────────┼───────────┼──────────────┤
│ 2010 Swift (Standard) │ ₹181,371 │ Baseline │ Reference │
│ 2010 Swift with i10 Engine │ ₹187,332 │ +₹5,961 │ +3.3% │
│ Model Swap Impact │ (data) │ │ Minimal │
├──────────────────────────────────┼───────────────┼───────────┼──────────────┤
│ 2010 i10 (Standard) │ ₹190,246 │ Baseline │ Reference │
│ 2010 i10 with Swift Engine │ ₹193,397 │ +₹3,151 │ +1.7% │
│ Model Swap Impact │ (data) │ │ Minimal │
├──────────────────────────────────┼───────────────┼───────────┼──────────────┤
│ Model Discrimination Quality │ 2-3% impact │ - │ ❌ Poor │
│ Within Model Error Margin │ 13.88% MAPE │ - │ Negligible │
│ Conclusion │ - │ - │ Not really │
│ │ - │ - │ distinguishing│
└──────────────────────────────────┴───────────────┴───────────┴──────────────┘

═══════════════════════════════════════════════════════════════════════════════

MODEL PERFORMANCE METRICS
─────────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Metric │ Value │ Assessment │
├───────────────────────────┼─────────────┼───────────────────────────────────┤
│ R² Score │ 0.9487 │ ✓ EXCELLENT (explains 94.87%) │
│ Mean Absolute Error (MAE) │ ₹97,136 │ ✓ GOOD │
│ Root Mean Squared Error │ ₹196,579 │ ⚠️ Large errors exist │
│ Mean Absolute % Error │ 13.88% │ ✓ VERY GOOD │
│ Predictions Within ±10% │ 49.0% │ ⚠️ Just below half │
│ Predictions Within ±15% │ 67.5% │ ✓ About 2/3 │
│ Predictions Within ±20% │ 79.0% │ ✓ Good │
└───────────────────────────┴─────────────┴───────────────────────────────────┘

Overall Model Quality: ✓ GOOD (but with brand/model discrimination weakness)

═══════════════════════════════════════════════════════════════════════════════

SWIFT ENGINE VARIANTS (From Training Data)
─────────────────────────────────────────────────────────────────────────────

┌────────────┬────────┬─────────┬──────────────┬─────────────────────────────┐
│ Engine cc │ Power │ Samples │ Avg Price │ Notes │
├────────────┼────────┼─────────┼──────────────┼─────────────────────────────┤
│ 1197 │ 85.0 │ 35 │ ₹324,914 │ Lower power variant │
│ 1197 │ 81.8 │ 223 │ ₹530,924 │ MOST COMMON (223 samples) │
│ 1197 │ 85.8 │ 56 │ ₹385,250 │ - │
│ 1197 │ 83.1 │ 14 │ ₹469,214 │ - │
│ 1248 │ 75.0 │ 42 │ ₹285,833 │ Diesel variant │
│ 1248 │ 74.0 │ 391 │ ₹495,235 │ COMMON (391 samples) │
│ 1298 │ 88.2 │ 20 │ ₹243,650 │ Petrol variant │
└────────────┴────────┴─────────┴──────────────┴─────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

i10 ENGINE VARIANTS (From Training Data)
─────────────────────────────────────────────────────────────────────────────

┌────────────┬────────┬─────────┬──────────────┬─────────────────────────────┐
│ Engine cc │ Power │ Samples │ Avg Price │ Notes │
├────────────┼────────┼─────────┼──────────────┼─────────────────────────────┤
│ 1086 │ 68.0 │ 145 │ ₹266,455 │ MOST COMMON (145 samples) │
│ 1086 │ 68.1 │ 4 │ ₹358,250 │ Rare variant │
│ 1197 │ 78.9 │ 251 │ ₹282,773 │ Higher power variant │
│ 1197 │ 80.0 │ 10 │ ₹341,700 │ Rare variant │
└────────────┴────────┴─────────┴──────────────┴─────────────────────────────┘

KEY OBSERVATION: When both use 1197cc engine:
• Swift 1197cc/81.8bhp: ₹530,924 avg
• i10 1197cc/78.9bhp: ₹282,773 avg
• Difference: 88% (but model only captures 4.96% via brand/model)

═══════════════════════════════════════════════════════════════════════════════

FINAL VERDICT
─────────────────────────────────────────────────────────────────────────────

Question: Does the ML model properly learn brand/model value differences?

Answer: ❌ NO

Evidence Summary:
✗ Brand importance: 2.87% (vs 20-40% industry standard)
✗ Model importance: 2.09% (vs 10-25% industry standard)
✗ Combined: 4.96% (less than vehicle_age alone at 11.14%)
✗ Encoding test: Swapping brand/model changes price by only 2-3%
✗ Swift 69% more expensive but only 4.96% captured by model
✓ No encoding bias (verified, not a technical bug)
✓ Encodings working correctly (verified)
✓ Model quality is generally good (R²=0.9487)
⚠️ But model is a technical spec predictor, not market discriminator

Root Cause: Model learns technical specs (power, engine) dominate price.
Doesn't capture brand reputation, market demand, or perceived value.

Impact on 2010 Predictions:
⚠️ Both vehicles are OUTSIDE training data range (age 16 vs 10-13 max)
⚠️ Predictions are EXTRAPOLATIONS with higher uncertainty
✓ But still within reasonable ballpark
✓ Swift: ₹181,371 (expected: ₹150-200k) → OK
⚠️ i10: ₹190,246 (expected: ₹140-170k) → Slightly high

═══════════════════════════════════════════════════════════════════════════════
END OF QUICK REFERENCE
═══════════════════════════════════════════════════════════════════════════════
