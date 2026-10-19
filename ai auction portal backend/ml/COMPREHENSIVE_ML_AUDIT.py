"""
═══════════════════════════════════════════════════════════════════
COMPREHENSIVE ML MODEL AUDIT - INVESTIGATION ONLY
Purpose: Calculate ACTUAL metrics from the trained model
DO NOT RETRAIN. DO NOT MODIFY.
═══════════════════════════════════════════════════════════════════
"""

import joblib
import numpy as np
import pandas as pd
import os
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
from sklearn.model_selection import train_test_split
import json

def print_header(title):
    print("\n" + "═" * 80)
    print(f" {title}")
    print("═" * 80 + "\n")

def print_subheader(title):
    print("\n" + "─" * 80)
    print(f" {title}")
    print("─" * 80)

# ═══════════════════════════════════════════════════════════════════
# PHASE 1: LOAD MODEL AND DATA
# ═══════════════════════════════════════════════════════════════════

print_header("COMPREHENSIVE ML MODEL AUDIT REPORT")
print("Investigation Mode: AUDIT ONLY - NO MODIFICATIONS")
print("Date:", pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"))

print_header("PHASE 1: LOADING MODEL AND DATA")

# Load model and encoders
if not os.path.exists("model.pkl"):
    print("❌ ERROR: model.pkl not found!")
    exit(1)

if not os.path.exists("encoders.pkl"):
    print("❌ ERROR: encoders.pkl not found!")
    exit(1)

model = joblib.load("model.pkl")
encoders = joblib.load("encoders.pkl")

print("✅ Model loaded successfully")
print("✅ Encoders loaded successfully")

# Check for dataset
dataset_path = "../cardekho_dataset.csv"
if not os.path.exists(dataset_path):
    print("❌ ERROR: cardekho_dataset.csv not found!")
    print("   Cannot calculate actual metrics without training data.")
    exit(1)

print("✅ Dataset found")

# Load dataset
df = pd.read_csv(dataset_path)
print(f"\n📊 Dataset loaded: {len(df)} samples")

# ═══════════════════════════════════════════════════════════════════
# PHASE 2: DATA INSPECTION
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 2: DATASET INSPECTION")

print("Dataset Shape:", df.shape)
print("Columns:", list(df.columns))
print("\nFirst 5 rows:")
print(df.head())

print("\nData Types:")
print(df.dtypes)

print("\nMissing Values:")
print(df.isnull().sum())

print("\nBasic Statistics:")
print(df.describe())

# ═══════════════════════════════════════════════════════════════════
# PHASE 3: PREPARE DATA FOR EVALUATION
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 3: DATA PREPARATION")

# Identify target column
if 'selling_price' in df.columns:
    target_col = 'selling_price'
elif 'price' in df.columns:
    target_col = 'price'
else:
    print("❌ ERROR: Cannot find target column (selling_price or price)")
    exit(1)

print(f"✅ Target column identified: {target_col}")

# Extract number from strings
def extract_number(val):
    if pd.isna(val):
        return np.nan
    if isinstance(val, (int, float)):
        return float(val)
    import re
    match = re.search(r'[\d.]+', str(val))
    return float(match.group()) if match else np.nan

# Clean engine and max_power
if 'engine' in df.columns:
    df['engine'] = df['engine'].apply(extract_number)
if 'max_power' in df.columns:
    df['max_power'] = df['max_power'].apply(extract_number)

# Required features
required_features = ['brand', 'model', 'vehicle_age', 'fuel_type', 'transmission_type', 
                     'engine', 'max_power', 'seats']

# Check if features exist
missing_features = [f for f in required_features if f not in df.columns]
if missing_features:
    print(f"❌ ERROR: Missing features: {missing_features}")
    exit(1)

print(f"✅ All required features present")

# Drop rows with missing values
df_clean = df.dropna(subset=required_features + [target_col])
print(f"\n📊 Clean dataset: {len(df_clean)} samples (dropped {len(df) - len(df_clean)} with missing values)")

# ═══════════════════════════════════════════════════════════════════
# PHASE 4: ENCODE FEATURES
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 4: FEATURE ENCODING")

try:
    # Encode categorical features
    df_clean['brand_encoded'] = encoders['brand'].transform(df_clean['brand'])
    df_clean['model_encoded'] = encoders['model'].transform(df_clean['model'])
    df_clean['fuel_encoded'] = encoders['fuel'].transform(df_clean['fuel_type'])
    df_clean['transmission_encoded'] = encoders['transmission'].transform(df_clean['transmission_type'])
    
    print("✅ All features encoded successfully")
    
except ValueError as e:
    print(f"⚠️ Encoding warning: {e}")
    print("   Filtering out unseen labels...")
    
    # Filter to only known labels
    valid_brands = set(encoders['brand'].classes_)
    valid_models = set(encoders['model'].classes_)
    valid_fuels = set(encoders['fuel'].classes_)
    valid_transmissions = set(encoders['transmission'].classes_)
    
    df_clean = df_clean[
        df_clean['brand'].isin(valid_brands) &
        df_clean['model'].isin(valid_models) &
        df_clean['fuel_type'].isin(valid_fuels) &
        df_clean['transmission_type'].isin(valid_transmissions)
    ]
    
    print(f"   Filtered dataset: {len(df_clean)} samples")
    
    # Re-encode
    df_clean['brand_encoded'] = encoders['brand'].transform(df_clean['brand'])
    df_clean['model_encoded'] = encoders['model'].transform(df_clean['model'])
    df_clean['fuel_encoded'] = encoders['fuel'].transform(df_clean['fuel_type'])
    df_clean['transmission_encoded'] = encoders['transmission'].transform(df_clean['transmission_type'])
    
    print("✅ Encoding complete after filtering")

# ═══════════════════════════════════════════════════════════════════
# PHASE 5: PREPARE FEATURES AND TARGET
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 5: PREPARE FEATURES AND TARGET")

X = df_clean[[
    'brand_encoded',
    'model_encoded',
    'vehicle_age',
    'fuel_encoded',
    'transmission_encoded',
    'engine',
    'max_power',
    'seats'
]].values

y = df_clean[target_col].values

print(f"✅ Feature matrix: {X.shape}")
print(f"✅ Target vector: {y.shape}")

# ═══════════════════════════════════════════════════════════════════
# PHASE 6: TRAIN/TEST SPLIT (SAME AS TRAINING)
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 6: TRAIN/TEST SPLIT")

# Use same random state as original training (assuming 42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training set: {X_train.shape[0]} samples")
print(f"Testing set:  {X_test.shape[0]} samples")
print(f"Split ratio:  {(X_test.shape[0] / X.shape[0] * 100):.1f}% test")

# ═══════════════════════════════════════════════════════════════════
# PHASE 7: CALCULATE ACTUAL METRICS
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 7: CALCULATE ACTUAL MODEL METRICS")

# Predictions on test set
y_pred = model.predict(X_test)

# Calculate metrics
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
mape = mean_absolute_percentage_error(y_test, y_pred) * 100  # Convert to percentage

print_subheader("ACTUAL MODEL PERFORMANCE METRICS")

print(f"\n📊 R² Score (Coefficient of Determination):")
print(f"   Value: {r2:.4f}")
print(f"   Interpretation:")
if r2 >= 0.9:
    print(f"   ✅ EXCELLENT - Model explains {r2*100:.2f}% of price variance")
elif r2 >= 0.8:
    print(f"   ✅ VERY GOOD - Model explains {r2*100:.2f}% of price variance")
elif r2 >= 0.7:
    print(f"   ✅ GOOD - Model explains {r2*100:.2f}% of price variance")
elif r2 >= 0.6:
    print(f"   ⚠️ FAIR - Model explains {r2*100:.2f}% of price variance")
else:
    print(f"   ❌ POOR - Model explains only {r2*100:.2f}% of price variance")

print(f"\n📊 MAE (Mean Absolute Error):")
print(f"   Value: ₹{mae:,.0f}")
print(f"   Interpretation:")
print(f"   On average, predictions are off by ₹{mae:,.0f}")
if mae < 50000:
    print(f"   ✅ EXCELLENT - Very accurate predictions")
elif mae < 100000:
    print(f"   ✅ GOOD - Acceptable error for vehicle pricing")
elif mae < 200000:
    print(f"   ⚠️ FAIR - Noticeable error, but usable")
else:
    print(f"   ❌ POOR - High error, may need improvement")

print(f"\n📊 RMSE (Root Mean Squared Error):")
print(f"   Value: ₹{rmse:,.0f}")
print(f"   Interpretation:")
print(f"   Penalizes larger errors more than MAE")
print(f"   RMSE/MAE ratio: {rmse/mae:.2f}")
if rmse / mae < 1.2:
    print(f"   ✅ Errors are consistent (few outliers)")
elif rmse / mae < 1.5:
    print(f"   ⚠️ Some outliers present")
else:
    print(f"   ❌ Many large errors (outliers)")

print(f"\n📊 MAPE (Mean Absolute Percentage Error):")
print(f"   Value: {mape:.2f}%")
print(f"   Interpretation:")
print(f"   On average, predictions are off by {mape:.2f}%")
if mape < 10:
    print(f"   ✅ EXCELLENT - Highly accurate")
elif mape < 15:
    print(f"   ✅ VERY GOOD - Good predictive power")
elif mape < 20:
    print(f"   ✅ GOOD - Acceptable for vehicle pricing")
elif mape < 30:
    print(f"   ⚠️ FAIR - Noticeable errors")
else:
    print(f"   ❌ POOR - High percentage errors")

# ═══════════════════════════════════════════════════════════════════
# PHASE 8: FEATURE IMPORTANCE
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 8: FEATURE IMPORTANCE ANALYSIS")

feature_names = [
    'brand',
    'model',
    'vehicle_age',
    'fuel',
    'transmission',
    'engine',
    'max_power',
    'seats'
]

importances = model.feature_importances_
feature_importance = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)

print("Top 10 Most Important Features:\n")
for i, (feature, importance) in enumerate(feature_importance[:10], 1):
    print(f"  {i}. {feature:15s} {importance*100:6.2f}%  {'█' * int(importance * 50)}")

# ═══════════════════════════════════════════════════════════════════
# PHASE 9: SAMPLE PREDICTIONS
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 9: SAMPLE PREDICTION VALIDATION (20 RANDOM TEST SAMPLES)")

# Select 20 random test samples
sample_indices = np.random.choice(len(X_test), size=min(20, len(X_test)), replace=False)

print(f"{'#':<4} {'Actual Price':>15} {'Predicted':>15} {'Abs Error':>15} {'% Error':>10}")
print("─" * 80)

for i, idx in enumerate(sample_indices, 1):
    actual = y_test[idx]
    predicted = y_pred[idx]
    abs_error = abs(actual - predicted)
    pct_error = (abs_error / actual) * 100
    
    print(f"{i:<4} ₹{actual:>13,.0f} ₹{predicted:>13,.0f} ₹{abs_error:>13,.0f} {pct_error:>9.1f}%")

# ═══════════════════════════════════════════════════════════════════
# PHASE 10: ERROR DISTRIBUTION ANALYSIS
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 10: ERROR DISTRIBUTION ANALYSIS")

errors = np.abs(y_test - y_pred)
pct_errors = (errors / y_test) * 100

print("Error Distribution:")
print(f"  Minimum error:    ₹{errors.min():,.0f} ({pct_errors.min():.2f}%)")
print(f"  25th percentile:  ₹{np.percentile(errors, 25):,.0f} ({np.percentile(pct_errors, 25):.2f}%)")
print(f"  Median error:     ₹{np.median(errors):,.0f} ({np.median(pct_errors):.2f}%)")
print(f"  75th percentile:  ₹{np.percentile(errors, 75):,.0f} ({np.percentile(pct_errors, 75):.2f}%)")
print(f"  Maximum error:    ₹{errors.max():,.0f} ({pct_errors.max():.2f}%)")

print("\nPredictions within tolerance:")
print(f"  Within 10%:  {(pct_errors < 10).sum()} / {len(pct_errors)} ({(pct_errors < 10).mean() * 100:.1f}%)")
print(f"  Within 15%:  {(pct_errors < 15).sum()} / {len(pct_errors)} ({(pct_errors < 15).mean() * 100:.1f}%)")
print(f"  Within 20%:  {(pct_errors < 20).sum()} / {len(pct_errors)} ({(pct_errors < 20).mean() * 100:.1f}%)")
print(f"  Within 30%:  {(pct_errors < 30).sum()} / {len(pct_errors)} ({(pct_errors < 30).mean() * 100:.1f}%)")

# ═══════════════════════════════════════════════════════════════════
# PHASE 11: SAVE RESULTS
# ═══════════════════════════════════════════════════════════════════

print_header("PHASE 11: EXPORT RESULTS")

results = {
    "model_metrics": {
        "r2_score": float(r2),
        "mae": float(mae),
        "rmse": float(rmse),
        "mape": float(mape)
    },
    "dataset_info": {
        "total_samples": int(len(df)),
        "clean_samples": int(len(df_clean)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test))
    },
    "feature_importance": {name: float(imp) for name, imp in feature_importance},
    "error_distribution": {
        "min_error": float(errors.min()),
        "median_error": float(np.median(errors)),
        "max_error": float(errors.max()),
        "within_10pct": float((pct_errors < 10).mean()),
        "within_15pct": float((pct_errors < 15).mean()),
        "within_20pct": float((pct_errors < 20).mean()),
        "within_30pct": float((pct_errors < 30).mean())
    }
}

with open("model_audit_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("✅ Results saved to: model_audit_results.json")

# ═══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════

print_header("AUDIT COMPLETE - SUMMARY")

ratings = ['POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT']
rating_idx = min(4, int(r2 * 5))
print("Model Performance:")
print(f"  R² Score:  {r2:.4f} ({ratings[rating_idx]})")
print(f"  MAE:       ₹{mae:,.0f}")
print(f"  RMSE:      ₹{rmse:,.0f}")
print(f"  MAPE:      {mape:.2f}%")

print("\nDataset:")
print(f"  Training:  {len(X_train):,} samples")
print(f"  Testing:   {len(X_test):,} samples")

print("\nTop 3 Features:")
for i, (feature, importance) in enumerate(feature_importance[:3], 1):
    print(f"  {i}. {feature}: {importance*100:.2f}%")

print("\n✅ Investigation complete. No code modified.")
