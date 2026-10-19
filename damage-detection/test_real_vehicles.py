"""
Real Vehicle Damage Detection Test
Tests YOLO model on actual vehicle images from test set
"""

import os
import json
from pathlib import Path
from ultralytics import YOLO
import cv2
import random

# Configuration
MODEL_PATH = "runs/detect/damage_detection/car_damage_v1-3/weights/best.pt"
TEST_IMAGES_DIR = "test/images"
OUTPUT_DIR = "test_results"
NUM_SAMPLES = 10  # Test on 10 random images
CONFIDENCE_THRESHOLD = 0.60

# Damage class names
CLASS_NAMES = ['dent', 'scratch', 'crack', 'glass shatter', 'lamp broken', 'tire flat']

def setup_output_dir():
    """Create output directory for results"""
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    return OUTPUT_DIR

def load_model():
    """Load YOLO model"""
    print(f"\n{'='*80}")
    print("LOADING YOLO MODEL")
    print('='*80)
    print(f"Model path: {MODEL_PATH}")
    
    try:
        model = YOLO(MODEL_PATH)
        print(f"✓ Model loaded successfully")
        print(f"  Model type: YOLOv8")
        print(f"  Classes: {len(CLASS_NAMES)}")
        print(f"  Confidence threshold: {CONFIDENCE_THRESHOLD}")
        return model
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        return None

def get_random_test_images(num_samples=10):
    """Get random test images"""
    image_files = list(Path(TEST_IMAGES_DIR).glob("*.jpg"))
    if len(image_files) < num_samples:
        return image_files
    return random.sample(image_files, num_samples)

def run_detection(model, image_path):
    """Run YOLO detection on a single image"""
    try:
        # Run inference
        results = model(str(image_path), conf=CONFIDENCE_THRESHOLD, verbose=False)
        
        # Extract detections
        detections = []
        boxes = results[0].boxes
        
        for box in boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            
            detections.append({
                'class_id': cls_id,
                'class_name': CLASS_NAMES[cls_id],
                'confidence': round(conf * 100, 2),
                'bbox': [round(x, 2) for x in bbox]
            })
        
        return results[0], detections
    except Exception as e:
        print(f"  ✗ Error during detection: {e}")
        return None, []

def calculate_severity(detections):
    """Calculate damage severity"""
    if not detections:
        return "none", 0
    
    # Severity weights
    severity_weights = {
        'scratch': 1,
        'dent': 2,
        'crack': 3,
        'tire flat': 2,
        'lamp broken': 3,
        'glass shatter': 4
    }
    
    total_severity = 0
    for det in detections:
        weight = severity_weights.get(det['class_name'], 1)
        conf_factor = det['confidence'] / 100
        total_severity += weight * conf_factor
    
    # Classify severity
    if total_severity == 0:
        return "none", 0
    elif total_severity < 2:
        return "minor", total_severity
    elif total_severity < 4:
        return "moderate", total_severity
    elif total_severity < 7:
        return "major", total_severity
    else:
        return "severe", total_severity

def save_annotated_image(result, image_path, output_dir):
    """Save image with bounding boxes"""
    try:
        # Get annotated image from YOLO
        annotated = result.plot()
        
        # Save
        output_path = Path(output_dir) / Path(image_path).name
        cv2.imwrite(str(output_path), annotated)
        return str(output_path)
    except Exception as e:
        print(f"  ⚠ Error saving annotated image: {e}")
        return None

def main():
    """Main test function"""
    print("\n" + "="*80)
    print("REAL VEHICLE DAMAGE DETECTION TEST")
    print("="*80)
    
    # Setup
    output_dir = setup_output_dir()
    print(f"\nOutput directory: {output_dir}")
    
    # Load model
    model = load_model()
    if model is None:
        print("\n✗ FAILED TO LOAD MODEL")
        return
    
    # Get test images
    print(f"\n{'='*80}")
    print("SELECTING TEST IMAGES")
    print('='*80)
    test_images = get_random_test_images(NUM_SAMPLES)
    print(f"✓ Selected {len(test_images)} random images from test set")
    
    # Run detection on each image
    results = []
    print(f"\n{'='*80}")
    print("RUNNING DAMAGE DETECTION")
    print('='*80)
    
    for idx, image_path in enumerate(test_images, 1):
        print(f"\nImage {idx}/{len(test_images)}: {image_path.name}")
        print("-" * 80)
        
        # Run detection
        result, detections = run_detection(model, image_path)
        
        if result is None:
            continue
        
        # Calculate severity
        severity, severity_score = calculate_severity(detections)
        
        # Save annotated image
        annotated_path = save_annotated_image(result, image_path, output_dir)
        
        # Print results
        if detections:
            print(f"  ✓ Detected {len(detections)} damage(s)")
            for det in detections:
                print(f"    • {det['class_name']}: {det['confidence']}% confidence")
        else:
            print(f"  ○ No damage detected (clean vehicle)")
        
        print(f"  Severity: {severity.upper()} (score: {severity_score:.2f})")
        if annotated_path:
            print(f"  Annotated image saved: {annotated_path}")
        
        # Store results
        results.append({
            'image': image_path.name,
            'detections': detections,
            'severity': severity,
            'severity_score': round(severity_score, 2),
            'total_damages': len(detections),
            'annotated_image': annotated_path
        })
    
    # Summary statistics
    print(f"\n{'='*80}")
    print("DETECTION SUMMARY")
    print('='*80)
    
    total_damages = sum(r['total_damages'] for r in results)
    images_with_damage = sum(1 for r in results if r['total_damages'] > 0)
    avg_damages_per_vehicle = total_damages / len(results) if results else 0
    
    # Count by class
    class_counts = {cls: 0 for cls in CLASS_NAMES}
    for r in results:
        for det in r['detections']:
            class_counts[det['class_name']] += 1
    
    print(f"\nImages tested: {len(results)}")
    print(f"Images with damage: {images_with_damage} ({images_with_damage/len(results)*100:.1f}%)")
    print(f"Images without damage: {len(results) - images_with_damage} ({(len(results)-images_with_damage)/len(results)*100:.1f}%)")
    print(f"Total damages detected: {total_damages}")
    print(f"Average damages per vehicle: {avg_damages_per_vehicle:.2f}")
    
    print(f"\nDamage breakdown by type:")
    for cls_name, count in sorted(class_counts.items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            print(f"  • {cls_name}: {count} ({count/total_damages*100:.1f}%)")
    
    # Severity distribution
    severity_dist = {}
    for r in results:
        sev = r['severity']
        severity_dist[sev] = severity_dist.get(sev, 0) + 1
    
    print(f"\nSeverity distribution:")
    for severity in ['none', 'minor', 'moderate', 'major', 'severe']:
        count = severity_dist.get(severity, 0)
        if count > 0:
            print(f"  • {severity.capitalize()}: {count} vehicles ({count/len(results)*100:.1f}%)")
    
    # Save results to JSON
    results_file = Path(output_dir) / "detection_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            'summary': {
                'total_images': len(results),
                'images_with_damage': images_with_damage,
                'total_damages': total_damages,
                'avg_damages_per_vehicle': round(avg_damages_per_vehicle, 2),
                'damage_counts': class_counts,
                'severity_distribution': severity_dist
            },
            'detections': results
        }, f, indent=2)
    
    print(f"\n✓ Detailed results saved to: {results_file}")
    print(f"✓ Annotated images saved to: {output_dir}/")
    
    # Performance assessment
    print(f"\n{'='*80}")
    print("MODEL PERFORMANCE ASSESSMENT")
    print('='*80)
    
    detection_rate = (images_with_damage / len(results)) * 100
    
    print(f"\nDetection rate: {detection_rate:.1f}%")
    if detection_rate >= 60:
        print("✓ GOOD - Model is detecting damages effectively")
    elif detection_rate >= 40:
        print("⚠ MODERATE - Model is detecting some damages")
    else:
        print("⚠ LOW - Model may need improvement or test set has few damages")
    
    print(f"\nAverage damages per vehicle: {avg_damages_per_vehicle:.2f}")
    if avg_damages_per_vehicle >= 2:
        print("✓ Test vehicles have multiple damages (realistic)")
    elif avg_damages_per_vehicle >= 1:
        print("✓ Test vehicles have moderate damage")
    else:
        print("○ Test vehicles are relatively clean")
    
    print(f"\n{'='*80}")
    print("TEST COMPLETE - CHECK test_results/ FOR ANNOTATED IMAGES")
    print('='*80)
    print()

if __name__ == "__main__":
    main()
