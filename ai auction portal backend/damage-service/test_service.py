"""
═══════════════════════════════════════════════════════════════════
DAMAGE DETECTION SERVICE - TEST SCRIPT
Purpose: Test all endpoints and modules
═══════════════════════════════════════════════════════════════════
"""

import requests
import base64
import json
import os
from pathlib import Path


class ServiceTester:
    """Test the damage detection service"""
    
    def __init__(self, base_url='http://localhost:5002'):
        self.base_url = base_url
        self.test_images_dir = Path('./test_images')
        
    def encode_image(self, image_path):
        """Encode image to base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("\n" + "="*70)
        print("TEST 1: Health Check")
        print("="*70)
        
        try:
            response = requests.get(f"{self.base_url}/")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            
            if response.status_code == 200:
                print("✅ Health check passed")
                return True
            else:
                print("❌ Health check failed")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_validate_quality(self, image_paths):
        """Test image quality validation"""
        print("\n" + "="*70)
        print("TEST 2: Image Quality Validation")
        print("="*70)
        
        try:
            # Prepare images
            images = []
            for i, path in enumerate(image_paths):
                if os.path.exists(path):
                    encoded = self.encode_image(path)
                    images.append({
                        'data': encoded,
                        'filename': os.path.basename(path)
                    })
                else:
                    print(f"⚠️  Image not found: {path}")
            
            if not images:
                print("❌ No images to test")
                return False
            
            print(f"Testing {len(images)} images...")
            
            # Call API
            response = requests.post(
                f"{self.base_url}/validate-quality",
                json={'images': images}
            )
            
            print(f"Status Code: {response.status_code}")
            
            result = response.json()
            
            print(f"\nValidation Result:")
            print(f"  Images Valid: {result.get('images_valid')}")
            print(f"  Total Images: {result.get('total_images')}")
            
            if result.get('errors'):
                print(f"\nErrors:")
                for error in result['errors']:
                    print(f"  - {error}")
            
            print(f"\nQuality Checks:")
            for check in result.get('quality_checks', []):
                status_icon = "✅" if check['overall_status'] == 'pass' else "❌"
                print(f"  {status_icon} Image {check['image_index']}: {check['filename']}")
                print(f"     Blur: {check['blur_check']['status']}")
                print(f"     Resolution: {check['resolution_check']['status']}")
                print(f"     Brightness: {check['brightness_check']['status']}")
            
            if result.get('images_valid'):
                print("\n✅ Quality validation passed")
                return True
            else:
                print("\n⚠️  Some images failed quality checks")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_detect_damage(self, image_paths):
        """Test damage detection"""
        print("\n" + "="*70)
        print("TEST 3: Damage Detection")
        print("="*70)
        
        try:
            # Prepare images
            images = []
            for i, path in enumerate(image_paths):
                if os.path.exists(path):
                    encoded = self.encode_image(path)
                    images.append({
                        'data': encoded,
                        'filename': os.path.basename(path)
                    })
            
            if not images:
                print("❌ No images to test")
                return False
            
            print(f"Processing {len(images)} images...")
            
            # Call API
            response = requests.post(
                f"{self.base_url}/detect-damage",
                json={'images': images},
                timeout=60  # Longer timeout for YOLO inference
            )
            
            print(f"Status Code: {response.status_code}")
            
            result = response.json()
            
            print(f"\nDetection Result:")
            print(f"  Success: {result.get('success')}")
            print(f"  Total Images: {result.get('total_images')}")
            print(f"  Damages Detected: {len(result.get('damages_detected', []))}")
            
            # Show damage summary
            summary = result.get('damage_summary', {})
            print(f"\nDamage Summary:")
            print(f"  Total Damages: {summary.get('total_damages')}")
            print(f"  Severity Score: {summary.get('severity_score')}")
            print(f"  Severity Level: {summary.get('severity_level')}")
            print(f"  Structural Damage: {summary.get('has_structural_damage')}")
            print(f"  Cosmetic Damage: {summary.get('has_cosmetic_damage')}")
            print(f"  Functional Damage: {summary.get('has_functional_damage')}")
            
            # Show damage counts
            if summary.get('damage_counts'):
                print(f"\nDamage Counts:")
                for damage_type, count in summary['damage_counts'].items():
                    print(f"  {damage_type}: {count}")
            
            # Show individual detections
            if result.get('damages_detected'):
                print(f"\nIndividual Detections:")
                for i, damage in enumerate(result['damages_detected'][:10], 1):
                    print(f"  {i}. {damage['type']} ({damage['confidence']:.1f}%) - {damage['severity']}")
                    print(f"     Image: {damage.get('image_filename', 'N/A')}")
            
            # Check annotated images
            annotated = result.get('annotated_images', [])
            print(f"\nAnnotated Images Generated: {len(annotated)}")
            for ann in annotated:
                if 'error' in ann:
                    print(f"  ❌ Image {ann['image_index']}: {ann['error']}")
                else:
                    print(f"  ✅ Image {ann['image_index']}: {ann['detections_count']} detections")
            
            if result.get('success'):
                print("\n✅ Damage detection completed")
                return True
            else:
                print("\n❌ Damage detection failed")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def test_process_batch(self, image_paths):
        """Test batch processing (validation + detection)"""
        print("\n" + "="*70)
        print("TEST 4: Batch Processing (Validation + Detection)")
        print("="*70)
        
        try:
            # Prepare images
            images = []
            for i, path in enumerate(image_paths):
                if os.path.exists(path):
                    encoded = self.encode_image(path)
                    images.append({
                        'data': encoded,
                        'filename': os.path.basename(path)
                    })
            
            if not images:
                print("❌ No images to test")
                return False
            
            print(f"Processing {len(images)} images (full pipeline)...")
            
            # Call API
            response = requests.post(
                f"{self.base_url}/process-batch",
                json={'images': images},
                timeout=60
            )
            
            print(f"Status Code: {response.status_code}")
            
            result = response.json()
            
            print(f"\nBatch Processing Result:")
            print(f"  Success: {result.get('success')}")
            
            if result.get('validation'):
                val = result['validation']
                print(f"\n  Validation:")
                print(f"    Images Valid: {val.get('images_valid')}")
                print(f"    Errors: {len(val.get('errors', []))}")
            
            if result.get('detection'):
                det = result['detection']
                summary = det.get('damage_summary', {})
                print(f"\n  Detection:")
                print(f"    Damages Found: {summary.get('total_damages')}")
                print(f"    Severity: {summary.get('severity_level')}")
            
            if result.get('success'):
                print("\n✅ Batch processing completed successfully")
                return True
            else:
                print("\n⚠️  Batch processing completed with issues")
                return False
                
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def run_all_tests(self, image_paths):
        """Run all tests"""
        print("\n" + "═"*70)
        print("DAMAGE DETECTION SERVICE - COMPREHENSIVE TEST")
        print("═"*70)
        
        results = {
            'health_check': self.test_health_check(),
            'validate_quality': self.test_validate_quality(image_paths),
            'detect_damage': self.test_detect_damage(image_paths),
            'process_batch': self.test_process_batch(image_paths)
        }
        
        # Summary
        print("\n" + "═"*70)
        print("TEST SUMMARY")
        print("═"*70)
        
        for test_name, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{test_name:20s}: {status}")
        
        total = len(results)
        passed = sum(results.values())
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n✅ All tests passed!")
        else:
            print(f"\n⚠️  {total - passed} test(s) failed")
        
        return results


def main():
    """Main test function"""
    # Service URL
    base_url = os.getenv('DAMAGE_SERVICE_URL', 'http://localhost:5002')
    
    print("Damage Detection Service Tester")
    print(f"Service URL: {base_url}")
    
    # Test image paths (you'll need to provide actual images)
    test_images = [
        './test_images/front.jpg',
        './test_images/rear.jpg',
        './test_images/left.jpg',
        './test_images/right.jpg',
        './test_images/damage.jpg'
    ]
    
    # Check if test images exist
    print(f"\nChecking test images...")
    found_images = []
    for img in test_images:
        if os.path.exists(img):
            print(f"  ✅ {img}")
            found_images.append(img)
        else:
            print(f"  ❌ {img} (not found)")
    
    if not found_images:
        print("\n⚠️  No test images found!")
        print("Please place test images in ./test_images/ directory")
        print("Required: front.jpg, rear.jpg, left.jpg, right.jpg, damage.jpg")
        return
    
    print(f"\nUsing {len(found_images)} test images")
    
    # Run tests
    tester = ServiceTester(base_url)
    tester.run_all_tests(found_images)


if __name__ == '__main__':
    main()
