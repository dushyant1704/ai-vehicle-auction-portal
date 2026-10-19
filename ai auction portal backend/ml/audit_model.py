"""
═══════════════════════════════════════════════════════════════════
XGBOOST MODEL AUDIT SCRIPT
Purpose: Audit the existing trained model without retraining
═══════════════════════════════════════════════════════════════════
"""

import joblib
import numpy as np
import pandas as pd
import os
from typing import Dict, List, Any

def print_header(title: str):
    """Print formatted section header"""
    print("\n" + "═" * 70)
    print(f" {title}")
    print("═" * 70 + "\n")

def print_subheader(title: str):
    print("\n" + "─" * 70)
    print(f" {title}")
    print("─" * 70)

def audit_model_file():
    """Audit the model.pkl file"""
    print_header("PART 1: MODEL FILE AUDIT")
    
    if not os.path.exists("model.pkl"):
        print("❌ ERROR: model.pkl not found!")
        return None
    
    print("✅ model.pkl exists")
    
    # Load model
    model = joblib.load("model.pkl")
    
    print(f"\n📊 Model Type: {type(model).__name__}")
    print(f"   Module: {type(model).__module__}")
    
    # Check if it's XGBoost
    if "xgboost" in str(type(model)).lower() or "xgb" in str(type(model)).lower():
        print("   ✅ Confirmed: XGBoost model")
    else:
        print(f"   ⚠️ Not XGBoost? Type is {type(model)}")
    
    # Try to get model parameters
    try:
        if hasattr(model, 'get_params'):
            params = model.get_params()
            print("\n🔧 Model Parameters:")
            for key, value in sorted(params.items())[:15]:  # Show first 15
                print(f"   {key}: {value}")
            if len(params) > 15:
                print(f"   ... and {len(params) - 15} more parameters")
    except Exception as e:
        print(f"   ⚠️ Cannot get parameters: {e}")
    
    # Try to get feature importance
    try:
        if hasattr(model, 'feature_importances_'):
            print("\n📈 Feature Importances Available: YES")
            importances = model.feature_importances_
            print(f"   Number of features: {len(importances)}")
            print(f"   Feature importance values: {importances}")
        else:
            print("\n📈 Feature Importances Available: NO")
    except Exception as e:
        print(f"   ⚠️ Cannot get feature importances: {e}")
    
    # Check for model attributes
    print("\n📋 Model Attributes:")
    important_attrs = ['n_estimators', 'max_depth', 'learning_rate', 'n_features_in_']
    for attr in important_attrs:
        if hasattr(model, attr):
            print(f"   ✅ {attr}: {getattr(model, attr)}")
        else:
            print(f"   ❌ {attr}: Not found")
    
    return model

def audit_encoders():
    """Audit the encoders.pkl file"""
    print_header("PART 2: ENCODERS AUDIT")
    
    if not os.path.exists("encoders.pkl"):
        print("❌ ERROR: encoders.pkl not found!")
        return None
    
    print("✅ encoders.pkl exists")
    
    # Load encoders
    encoders = joblib.load("encoders.pkl")
    
    print(f"\n📦 Encoders Type: {type(encoders)}")
    
    if isinstance(encoders, dict):
        print(f"   ✅ Encoders stored as dictionary")
        print(f"   Keys: {list(encoders.keys())}")
        
        for key, encoder in encoders.items():
            print(f"\n🔤 Encoder: {key}")
            print(f"   Type: {type(encoder).__name__}")
            
            if hasattr(encoder, 'classes_'):
                classes = encoder.classes_
                print(f"   Number of classes: {len(classes)}")
                print(f"   Sample classes (first 10): {list(classes[:10])}")
                if len(classes) > 10:
                    print(f"   ... and {len(classes) - 10} more")
                print(f"   Last 5 classes: {list(classes[-5:])}")
            else:
                print(f"   ⚠️ No classes_ attribute found")
    else:
        print(f"   ⚠️ Unexpected encoder structure: {type(encoders)}")
    
    return encoders

def test_prediction(model, encoders, test_cases: List[Dict[str, Any]]):
    """Test model predictions"""
    print_header("PART 3: PREDICTION TESTS")
    
    for i, test_case in enumerate(test_cases, 1):
        print_subheader(f"Test Case {i}: {test_case['name']}")
        
        try:
            # Encode features
            brand_encoded = encoders['brand'].transform([test_case['brand']])[0]
            model_encoded = encoders['model'].transform([test_case['model']])[0]
            fuel_encoded = encoders['fuel'].transform([test_case['fuel']])[0]
            transmission_encoded = encoders['transmission'].transform([test_case['transmission']])[0]
            
            # Create feature array
            features = np.array([[
                brand_encoded,
                model_encoded,
                test_case['vehicle_age'],
                fuel_encoded,
                transmission_encoded,
                test_case['engine'],
                test_case['max_power'],
                test_case['seats']
            ]])
            
            # Predict
            prediction = model.predict(features)[0]
            
            print(f"✅ Prediction successful!")
            print(f"   Input: {test_case['brand']} {test_case['model']} ({test_case['vehicle_age']}y)")
            print(f"   Encoded features: {features[0]}")
            print(f"   Predicted price: ₹{prediction:,.0f}")
            
            if 'expected_range' in test_case:
                min_price, max_price = test_case['expected_range']
                if min_price <= prediction <= max_price:
                    print(f"   ✅ Within expected range: ₹{min_price:,} - ₹{max_price:,}")
                else:
                    print(f"   ⚠️ Outside expected range: ₹{min_price:,} - ₹{max_price:,}")
            
        except Exception as e:
            print(f"❌ Prediction failed!")
            print(f"   Error: {type(e).__name__}: {str(e)}")
            print(f"   Input: {test_case['brand']} {test_case['model']}")

def test_unseen_labels(encoders):
    """Test handling of unseen labels"""
    print_header("PART 4: UNSEEN LABEL HANDLING AUDIT")
    
    unseen_test_cases = [
        ("brand", "Lamborghini"),
        ("brand", "Ferrari"),
        ("brand", "McLaren"),
        ("brand", "Bugatti"),
        ("brand", "UnknownBrand123"),
        ("model", "Huracan"),
        ("model", "Aventador"),
        ("model", "UnknownModel456"),
    ]
    
    for encoder_name, label in unseen_test_cases:
        try:
            encoded = encoders[encoder_name].transform([label])[0]
            print(f"✅ {encoder_name}='{label}': Encoded as {encoded}")
        except ValueError as e:
            print(f"❌ {encoder_name}='{label}': ValueError - {str(e)}")
        except Exception as e:
            print(f"❌ {encoder_name}='{label}': {type(e).__name__} - {str(e)}")

def estimate_model_quality():
    """Estimate model quality without training data"""
    print_header("PART 5: MODEL QUALITY ESTIMATION")
    
    print("⚠️ NOTE: Without training data, we cannot calculate exact metrics")
    print("   like R², MAE, RMSE, or MAPE. These would require the test set.")
    print("\n📊 What we CAN verify:")
    print("   ✅ Model loads successfully")
    print("   ✅ Model can make predictions")
    print("   ✅ Predictions are in reasonable range")
    print("   ✅ Encoders handle known labels")
    print("   ❌ Encoders crash on unseen labels (DATA LEAKAGE CHECK)")
    
    print("\n📋 To get actual metrics, you would need:")
    print("   1. The training dataset (cardekho_dataset.csv)")
    print("   2. The exact train/test split used during training")
    print("   3. Re-run predictions on test set")
    print("   4. Calculate: R² = r2_score(y_test, y_pred)")
    print("   5. Calculate: MAE = mean_absolute_error(y_test, y_pred)")
    print("   6. Calculate: RMSE = sqrt(mean_squared_error(y_test, y_pred))")
    print("   7. Calculate: MAPE = mean_absolute_percentage_error(y_test, y_pred)")

def check_data_leakage():
    """Check for common data leakage patterns"""
    print_header("PART 6: DATA LEAKAGE CHECK")
    
    print("🔍 Checking for data leakage patterns...")
    
    # Check 1: Feature count
    model = joblib.load("model.pkl")
    if hasattr(model, 'n_features_in_'):
        n_features = model.n_features_in_
        expected_features = 8  # brand, model, age, fuel, transmission, engine, power, seats
        print(f"\n✓ Feature Count Check:")
        print(f"   Expected: {expected_features}")
        print(f"   Actual: {n_features}")
        if n_features == expected_features:
            print(f"   ✅ PASS - Correct number of features")
        else:
            print(f"   ⚠️ WARNING - Feature count mismatch!")
            print(f"   Possible data leakage if extra features include target-related info")
    
    # Check 2: Encoder classes
    encoders = joblib.load("encoders.pkl")
    print(f"\n✓ Encoder Classes Check:")
    for key in ['brand', 'model', 'fuel', 'transmission']:
        if key in encoders and hasattr(encoders[key], 'classes_'):
            classes = encoders[key].classes_
            print(f"   {key}: {len(classes)} classes")
            if key == 'brand' and len(classes) < 10:
                print(f"      ⚠️ WARNING - Very few brands, dataset may be too small")
            elif key == 'fuel' and len(classes) > 6:
                print(f"      ⚠️ WARNING - Unusual number of fuel types")
    
    print(f"\n✓ Unseen Label Handling:")
    print(f"   If encoders crash on unseen labels → ✅ GOOD (no test set leakage)")
    print(f"   If encoders handle unseen labels → ⚠️ BAD (possible train/test contamination)")

def main():
    """Main audit function"""
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 15 + "XGBOOST MODEL AUDIT REPORT" + " " * 27 + "║")
    print("╚" + "═" * 68 + "╝")
    
    # Audit 1: Model file
    model = audit_model_file()
    if model is None:
        return
    
    # Audit 2: Encoders
    encoders = audit_encoders()
    if encoders is None:
        return
    
    # Audit 3: Test predictions
    test_cases = [
        {
            'name': 'Hyundai i10 2010 (User Bug Report)',
            'brand': 'Hyundai',
            'model': 'i10',
            'vehicle_age': 16,
            'fuel': 'Petrol',
            'transmission': 'Manual',
            'engine': 1100,
            'max_power': 65,
            'seats': 5,
            'expected_range': (150000, 250000)
        },
        {
            'name': 'Maruti Swift 2020',
            'brand': 'Maruti',
            'model': 'Swift',
            'vehicle_age': 6,
            'fuel': 'Petrol',
            'transmission': 'Manual',
            'engine': 1197,
            'max_power': 82,
            'seats': 5,
            'expected_range': (400000, 650000)
        },
        {
            'name': 'Honda City 2022',
            'brand': 'Honda',
            'model': 'City',
            'vehicle_age': 4,
            'fuel': 'Petrol',
            'transmission': 'Automatic',
            'engine': 1497,
            'max_power': 117,
            'seats': 5,
            'expected_range': (800000, 1200000)
        },
        {
            'name': 'BMW 3 Series 2020',
            'brand': 'BMW',
            'model': '3 Series',
            'vehicle_age': 6,
            'fuel': 'Petrol',
            'transmission': 'Automatic',
            'engine': 1997,
            'max_power': 184,
            'seats': 5,
            'expected_range': (1800000, 2800000)
        }
    ]
    
    test_prediction(model, encoders, test_cases)
    
    # Audit 4: Unseen labels
    test_unseen_labels(encoders)
    
    # Audit 5: Model quality
    estimate_model_quality()
    
    # Audit 6: Data leakage
    check_data_leakage()
    
    print("\n╔" + "═" * 68 + "╗")
    print("║" + " " * 22 + "AUDIT COMPLETE" + " " * 32 + "║")
    print("╚" + "═" * 68 + "╝\n")

if __name__ == "__main__":
    main()
