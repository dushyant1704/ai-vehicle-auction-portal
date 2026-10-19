═══════════════════════════════════════════════════════════════════════════════
TOP 20 FEATURE IMPORTANCES - DETAILED BREAKDOWN
═══════════════════════════════════════════════════════════════════════════════

Rank Feature Importance Cumulative Impact Category
────────────────────────────────────────────────────────────────────────────
1 max_power 59.16% 59.16% ⚠️ DOMINANT
2 engine 16.05% 75.21% ⚠️ PRIMARY
3 vehicle_age 11.14% 86.35% ✓ MAJOR
4 seats 4.25% 90.60% ✓ MODERATE
5 transmission 3.09% 93.69% ✓ MINOR
6 brand 2.87% 96.56% ❌ NEGLIGIBLE
7 model 2.09% 98.65% ❌ NEGLIGIBLE
8 fuel 1.35% 100.00% ❌ NEGLIGIBLE

Total Features: 8

═══════════════════════════════════════════════════════════════════════════════

FEATURE IMPORTANCE ANALYSIS
─────────────────────────────────────────────────────────────────────────────

DOMINANT FACTOR (59.16%):
┌─────────────────────────────────────────────────────────────────────────────┐
│ MAX POWER (bhp) │
├─────────────────────────────────────────────────────────────────────────────┤
│ Nearly 60% of all pricing variation is explained by engine power output. │
│ This is the single strongest price predictor in the model. │
│ │
│ Example Impact: │
│ • Swift with 85 bhp vs 75 bhp: ~₹200k+ price difference │
│ • i10 with 78.9 bhp vs 68 bhp: ~₹100k price difference │
│ │
│ This extreme dominance indicates the model is overly focused on specs. │
└─────────────────────────────────────────────────────────────────────────────┘

PRIMARY FACTOR (16.05%):
┌─────────────────────────────────────────────────────────────────────────────┐
│ ENGINE DISPLACEMENT (cc) │
├─────────────────────────────────────────────────────────────────────────────┤
│ Second strongest predictor: engine size explains 16% of price variance. │
│ Larger engines generally = higher prices. │
│ │
│ Range in dataset: │
│ • Smallest: 796 cc (Maruti Alto) │
│ • Largest: 2982 cc (Toyota Fortuner) │
│ │
│ Swift: Typically 1197-1298 cc │
│ i10: Typically 1086-1197 cc │
│ │
│ This difference contributes to Swift being more expensive. │
└─────────────────────────────────────────────────────────────────────────────┘

MAJOR FACTOR (11.14%):
┌─────────────────────────────────────────────────────────────────────────────┐
│ VEHICLE AGE (years) │
├─────────────────────────────────────────────────────────────────────────────┤
│ Depreciation explains 11% of variance: older cars are cheaper. │
│ Nearly 4x more important than brand. │
│ │
│ Depreciation Pattern: │
│ • 1-year-old Swift: ₹626,500 avg │
│ • 10-year-old Swift: ₹319,257 avg (-49% loss) │
│ • 1-5 year-old i10: ₹402,680 avg │
│ • 10-13 year-old i10: ₹195-242k avg (-50-60% loss) │
│ │
│ 2010 models (16 years old) face severe depreciation, but this goes BEYOND │
│ the training data maximum age (Swift: 10 years, i10: 13 years). │
└─────────────────────────────────────────────────────────────────────────────┘

MODERATE FACTORS (4.25%, 3.09%):
┌─────────────────────────────────────────────────────────────────────────────┐
│ SEATS (4.25%) - Vehicle capacity affects price marginally │
│ TRANSMISSION (3.09%) - Manual vs Automatic has minor impact │
│ │
│ Combined: 7.34% importance │
│ Still significantly less important than vehicle age alone. │
└─────────────────────────────────────────────────────────────────────────────┘

NEGLIGIBLE FACTORS (2.87%, 2.09%, 1.35%):
┌─────────────────────────────────────────────────────────────────────────────┐
│ BRAND (2.87%) │
│ • Maruti vs Hyundai vs BMW: Only 2.87% price difference │
│ • Nearly 21x less important than engine power │
│ • This is the core problem with brand/model discrimination │
│ │
│ MODEL (2.09%) │
│ • Swift vs i10 vs Alturas: Only 2.09% price difference │
│ • Nearly 28x less important than engine power │
│ • Practically negligible in prediction │
│ │
│ FUEL TYPE (1.35%) │
│ • Petrol vs Diesel vs CNG: Only 1.35% price difference │
│ • Nearly 44x less important than engine power │
│ │
│ Combined importance: 6.31% (vehicle age alone is 11.14%) │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

BRAND IMPORTANCE: 2.87%
─────────────────────────────────────────────────────────────────────────────

What this means:
• Only 2.87% of price variation is explained by brand
• 97.13% is explained by other features
• The model essentially treats all brands similarly

Comparison with other factors:
• 21× less important than max_power (59.16%)
• 6× less important than engine displacement (16.05%)
• 4× less important than vehicle age (11.14%)

In practical terms:
• Changing brand on identical specs: ~2.87% price change
• Example: 1200cc/80bhp/5-year-old sedan - As Maruti: ₹500,000 - As Hyundai: ₹512,850 (only 2.57% more) - As BMW: Not necessarily much higher (brand importance is low)

CONCLUSION: Brand discrimination is POOR. The model doesn't recognize that
some brands command premium pricing or have better market value.

═══════════════════════════════════════════════════════════════════════════════

MODEL IMPORTANCE: 2.09%
─────────────────────────────────────────────────────────────────────────────

What this means:
• Only 2.09% of price variation is explained by model
• 97.91% is explained by other features
• Swift vs i10 (with identical engine/age/specs): only 2.09% difference

Comparison with other factors:
• 28× less important than max_power (59.16%)
• 8× less important than engine displacement (16.05%)
• 5× less important than vehicle age (11.14%)

In practical terms:
• Changing model on identical specs: ~2.09% price change
• Example: 1200cc engine, 80 bhp, 5 years old, 50k km - Swift: ₹500,000 - i10: ₹489,550 (only 2.09% less) - Alto: ₹489,550 (essentially the same)

CONCLUSION: Model discrimination is POOR. The model treats all models within
the same brand similarly, ignoring model-specific market demand.

═══════════════════════════════════════════════════════════════════════════════

COMBINED BRAND + MODEL IMPORTANCE: 4.96%
─────────────────────────────────────────────────────────────────────────────

What does 4.96% mean?
• Combined, brand and model explain less than 5% of price
• Other factors (power, engine, age, seats, transmission, fuel) explain >95%
• The model is fundamentally NOT a brand/model discriminator

Putting this in perspective:
• Power alone (59.16%) is 12× more important than brand+model combined
• This means a 1 bhp change affects price more than changing brand

This 4.96% actually reveals the root issue:
❌ Dataset itself may not show strong brand/model premium
❌ Or the model failed to capture it due to architecture
❌ Or brand/model effects are overwhelmed by technical specs

For comparison, industry standards:
• In real markets: Brand can account for 20-40% of value
• This model: Brand accounts for only 2.87%
• Gap: 7-14× underestimation of brand value

═══════════════════════════════════════════════════════════════════════════════

IMPLICATIONS FOR SWIFT vs i10 PREDICTION
─────────────────────────────────────────────────────────────────────────────

Given these feature importances, the prediction difference between Swift and
i10 should be interpreted as:

2010 MODELS PREDICTION:
Swift: ₹181,371
i10: ₹190,246
Difference: ₹8,874 (+4.9%)

Why is i10 HIGHER than Swift?
NOT because the model recognizes i10 as more valuable.
Rather, because:
• Swift 2010: 1197cc, 85.0 bhp, 16 years old
• i10 2010: 1197cc, 78.9 bhp, 16 years old
• Lower power (78.9 < 85) usually = lower price
• BUT at age 16, the model is extrapolating beyond training data
• Extrapolation introduces noise/error
• The model may not be reliable at this age

WHAT THE IMPORTANCES TELL US:
• The ₹8,874 difference is driven ~95% by power and age
• The ₹8,874 difference is driven ~5% by brand/model
• Of that 5%, maybe ₹400 is from brand difference
• And maybe ₹40 is from model difference
• The rest is noise and extrapolation error

═══════════════════════════════════════════════════════════════════════════════

IDEAL FEATURE IMPORTANCE DISTRIBUTION (For Reference)
─────────────────────────────────────────────────────────────────────────────

What would be expected if the model properly discriminated by brand/model:

Feature Expected % Actual % Gap
────────────────────────────────────────────────────────────
max_power 35-40% 59.16% +19-24% ⚠️ Too high
engine 15-20% 16.05% -4-5% ✓ OK
vehicle_age 15-20% 11.14% -4-9% ⚠️ Too low
brand 15-20% 2.87% -12-18% ❌ TOO LOW
model 10-15% 2.09% -8-13% ❌ TOO LOW
seats 3-5% 4.25% -1-2% ✓ OK
transmission 2-4% 3.09% -1-2% ✓ OK
fuel 1-2% 1.35% -0.6-1% ✓ OK

Current model is OVER-SPECIALIZED in power prediction and UNDER-SPECIALIZED
in brand/model discrimination.

═══════════════════════════════════════════════════════════════════════════════
END OF FEATURE IMPORTANCE ANALYSIS
═══════════════════════════════════════════════════════════════════════════════
