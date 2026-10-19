"""
═══════════════════════════════════════════════════════════════════
DAMAGE DETECTION SERVICE - Flask API
Purpose: YOLOv8 damage detection for vehicle images
Port: 5002
Version: 1.0
═══════════════════════════════════════════════════════════════════
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import base64
from io import BytesIO
import tempfile
import traceback
from datetime import datetime

# Import custom modules
from image_quality import (
    validate_image_file,
    check_blur,
    check_resolution,
    check_brightness,
    check_duplicates
)
from damage_detector import DamageDetector
from annotator import ImageAnnotator
from exif_validator import validate_batch_exif, extract_single_image_exif

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Increase max request size for base64 image uploads (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

# Configuration
CONFIG = {
    'YOLO_MODEL_PATH': os.getenv('YOLO_MODEL_PATH', './yolov8_damage.pt'),
    'CONFIDENCE_THRESHOLD': float(os.getenv('CONFIDENCE_THRESHOLD', '0.60')),
    'IMAGE_SIZE': 640,
    'DEVICE': 'cpu',  # Use 'cuda' if GPU available
    'TEMP_DIR': './temp',
    'MIN_BLUR_SCORE': float(os.getenv('IMAGE_MIN_BLUR_SCORE', '50')),
    'MIN_WIDTH': int(os.getenv('IMAGE_MIN_WIDTH', '640')),
    'MIN_HEIGHT': int(os.getenv('IMAGE_MIN_HEIGHT', '480')),
    'MIN_BRIGHTNESS': float(os.getenv('IMAGE_MIN_BRIGHTNESS', '30')),
    'MAX_BRIGHTNESS': float(os.getenv('IMAGE_MAX_BRIGHTNESS', '240')),
}

# Ensure temp directory exists
os.makedirs(CONFIG['TEMP_DIR'], exist_ok=True)

# Initialize YOLO model and detector
try:
    print(f"Loading YOLO model from {CONFIG['YOLO_MODEL_PATH']}...")
    detector = DamageDetector(
        model_path=CONFIG['YOLO_MODEL_PATH'],
        confidence_threshold=CONFIG['CONFIDENCE_THRESHOLD'],
        device=CONFIG['DEVICE']
    )
    annotator = ImageAnnotator()
    print("✅ YOLO model loaded successfully")
except Exception as e:
    print(f"❌ Error loading YOLO model: {e}")
    detector = None
    annotator = None


# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def save_base64_image(base64_string, filename):
    """Save base64 encoded image to temp file"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        temp_path = os.path.join(CONFIG['TEMP_DIR'], filename)
        
        with open(temp_path, 'wb') as f:
            f.write(image_data)
        
        return temp_path
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {str(e)}")


def image_to_base64(image_path):
    """Convert image file to base64 string"""
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
        return base64.b64encode(image_data).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Failed to encode image to base64: {str(e)}")


def cleanup_temp_files(file_paths):
    """Clean up temporary files"""
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            print(f"Warning: Could not delete temp file {path}: {e}")


# ═══════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Damage Detection Service',
        'version': '1.0',
        'model_loaded': detector is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/validate-quality', methods=['POST'])
def validate_image_quality():
    """
    Validate image quality before damage detection using multi-dimensional quality scoring
    """
    start_time = datetime.now()
    try:
        data = request.json
        images = data.get('images', [])
        
        if not images:
            return jsonify({
                'error': 'No images provided',
                'images_valid': False
            }), 400
        
        if len(images) < 5:
            return jsonify({
                'error': f'Minimum 5 images required, got {len(images)}',
                'images_valid': False
            }), 400
        
        temp_files = []
        quality_checks = []
        errors = []
        all_warnings = []
        overall_scores = []
        
        # Save images and perform quality checks
        for idx, img in enumerate(images):
            try:
                if isinstance(img, str):
                    filename = f'image_{idx}.jpg'
                    image_data = img
                elif isinstance(img, dict):
                    filename = img.get('filename', f'image_{idx}.jpg')
                    image_data = img.get('data', '') or img.get('preview', '') or img.get('image', '')
                else:
                    filename = f'image_{idx}.jpg'
                    image_data = str(img)
                
                # Save image temporarily
                temp_path = save_base64_image(image_data, f'temp_{idx}_{filename}')
                temp_files.append(temp_path)
                
                # Perform quality checks
                res = validate_image_file(temp_path, config={
                    'blur_threshold': CONFIG['MIN_BLUR_SCORE'],
                    'min_width': CONFIG['MIN_WIDTH'],
                    'min_height': CONFIG['MIN_HEIGHT'],
                    'min_brightness': CONFIG['MIN_BRIGHTNESS'],
                    'max_brightness': CONFIG['MAX_BRIGHTNESS']
                })
                
                overall_scores.append(res['overall_score'])
                
                quality_check = {
                    'image_index': idx,
                    'filename': filename,
                    'overall_status': 'pass' if res['passed'] else 'fail',
                    'quality_grade': res.get('quality_grade', res['status']),
                    'status': res['status'],
                    'overall_score': res['overall_score'],
                    'sharpness_score': res['sharpness_score'],
                    'lighting_score': res['lighting_score'],
                    'resolution_score': res['resolution_score'],
                    'reflection_level': res['reflection_level'],
                    'vehicle_detected': res['vehicle_detected'],
                    'warnings': res['warnings'],
                    'reason': res['reason'],
                    'confidence_multiplier': res['confidence_multiplier'],
                    'blur_check': res['blur'],
                    'resolution_check': res['resolution'],
                    'brightness_check': res['brightness'],
                    'reflection_check': res['reflection'],
                    'failure_reasons': res['warnings'] if res['status'] == 'Rejected' else []
                }
                
                quality_checks.append(quality_check)
                if res['warnings']:
                    all_warnings.extend([f"Img {idx + 1}: {w}" for w in res['warnings']])
                
                if res['status'] == 'Rejected':
                    errors.append(f"Image {idx + 1} ({filename}) is unusable: {'; '.join(res['warnings'])}")
                    
            except Exception as e:
                print(f"[Damage] Error processing image {idx}: {e}")
                errors.append(f"Image {idx + 1}: {str(e)}")
                quality_checks.append({
                    'image_index': idx,
                    'filename': filename if 'filename' in locals() else f'image_{idx}.jpg',
                    'overall_status': 'fail',
                    'status': 'Rejected',
                    'overall_score': 0,
                    'analysisFailed': True,
                    'reason': 'Unable to calculate image quality',
                    'error': str(e)
                })
        
        # Check for duplicates
        duplicate_result = check_duplicates(temp_files)
        if duplicate_result['has_duplicates']:
            all_warnings.append(f"Duplicate images detected ({duplicate_result['duplicate_count']} pairs).")

        # EXIF Metadata Validation & Cross-Image Consistency
        try:
            exif_analysis = validate_batch_exif(temp_files)
            for idx, qc in enumerate(quality_checks):
                if idx < len(exif_analysis.get('individual_results', [])):
                    qc['exif_validation'] = exif_analysis['individual_results'][idx]
            if exif_analysis.get('batch_summary', {}).get('flags'):
                for flg in exif_analysis['batch_summary']['flags']:
                    all_warnings.append(f"EXIF Notice: {flg.replace('_', ' ').title()}")
        except Exception as exif_err:
            print(f"[Damage] EXIF validation notice: {exif_err}")
            exif_analysis = {
                'batch_summary': {
                    'overall_status': 'NO_METADATA',
                    'badge': 'No EXIF Data',
                    'findings': ['EXIF extraction handled safely.']
                }
            }

        # Cleanup temp files
        cleanup_temp_files(temp_files)
        
        # Truly invalid only if rejected (unreadable/extremely blurry/corrupted)
        images_valid = len(errors) == 0
        avg_quality_score = int(np.mean(overall_scores)) if overall_scores else 0
        
        # Overall status for entire batch
        batch_status = 'Accepted'
        if not images_valid:
            batch_status = 'Rejected'
        elif any(qc.get('status') == 'Warning' for qc in quality_checks):
            batch_status = 'Warning'
        
        processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        def convert_numpy(obj):
            if isinstance(obj, (np.bool_, bool)):
                return bool(obj)
            elif isinstance(obj, (np.integer, int)):
                return int(obj)
            elif isinstance(obj, (np.floating, float)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {k: convert_numpy(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [convert_numpy(x) for x in obj]
            return obj

        return jsonify(convert_numpy({
            'success': True,
            'images_valid': bool(images_valid),
            'continueToYOLO': bool(images_valid),
            'overallStatus': batch_status,
            'overallScore': avg_quality_score,
            'status': batch_status,
            'avg_quality_score': avg_quality_score,
            'total_images': len(images),
            'quality_checks': quality_checks,
            'images': quality_checks,
            'duplicate_check': duplicate_result,
            'exif_validation': exif_analysis.get('batch_summary', {}),
            'warnings': all_warnings,
            'errors': errors,
            'processing_time_ms': processing_time_ms,
            'timestamp': datetime.now().isoformat()
        }))
        
    except Exception as e:
        return jsonify({
            'error': f'Validation failed: {str(e)}',
            'traceback': traceback.format_exc(),
            'images_valid': False
        }), 500



@app.route('/detect-damage', methods=['POST'])
@app.route('/api/detect', methods=['POST'])
def detect_damage():
    """
    Detect damage in vehicle images using YOLOv8
    
    Expected payload:
    {
        "images": [
            {"data": "base64_string", "filename": "front.jpg"},
            ...
        ]
    }
    
    Returns:
    {
        "success": true,
        "total_images": 5,
        "damages_detected": [...],
        "annotated_images": [...],
        "damage_summary": {...}
    }
    """
    try:
        if detector is None:
            return jsonify({
                'error': 'YOLO model not loaded',
                'success': False
            }), 500
        
        data = request.json
        images = data.get('images', [])
        
        if not images:
            return jsonify({
                'error': 'No images provided',
                'success': False
            }), 400
        
        temp_files = []
        all_damages = []
        annotated_images_b64 = []
        image_quality_scores = []
        
        # Process each image
        for idx, img in enumerate(images):
            try:
                filename = img.get('filename', f'image_{idx}.jpg')
                image_data = img.get('data', '')
                
                # Save image temporarily
                temp_path = save_base64_image(image_data, f'detect_{idx}_{filename}')
                temp_files.append(temp_path)
                
                # Assess quality score to identify best primary image
                val_res = validate_image_file(temp_path)
                image_quality_scores.append({
                    'index': idx,
                    'filename': filename,
                    'score': val_res['overall_score'],
                    'confidence_multiplier': val_res['confidence_multiplier']
                })

                # Run YOLO detection
                detections = detector.detect(temp_path)
                
                # Add image index to each detection
                for detection in detections:
                    detection['image_index'] = idx
                    detection['image_filename'] = filename
                
                all_damages.extend(detections)
                
                # Generate annotated image
                annotated_path = temp_path.replace('.jpg', '_annotated.jpg')
                annotator.draw_detections(temp_path, detections, annotated_path)
                temp_files.append(annotated_path)
                
                # Convert annotated image to base64
                annotated_b64 = image_to_base64(annotated_path)
                annotated_images_b64.append({
                    'image_index': idx,
                    'filename': filename,
                    'annotated_data': annotated_b64,
                    'detections_count': len(detections),
                    'quality_score': val_res['overall_score']
                })
                
            except Exception as e:
                print(f"Error processing image {idx}: {e}")
                annotated_images_b64.append({
                    'image_index': idx,
                    'filename': img.get('filename', f'image_{idx}.jpg'),
                    'error': str(e)
                })
        
        # Select best quality image as primary image
        best_image = max(image_quality_scores, key=lambda x: x['score']) if image_quality_scores else {'index': 0, 'filename': 'image_0.jpg', 'score': 85, 'confidence_multiplier': 0.95}
        avg_confidence_mult = float(np.mean([iq['confidence_multiplier'] for iq in image_quality_scores])) if image_quality_scores else 0.95

        # Calculate merged damage summary across all images
        damage_summary = detector.calculate_damage_summary(all_damages)
        
        # Calculate quality adjusted confidence score
        base_confidence = 95.0
        quality_adjusted_confidence = round(base_confidence * avg_confidence_mult, 1)

        combined_ai_report = {
            'total_images_analyzed': len(images),
            'primary_image_index': best_image['index'],
            'primary_image_filename': best_image['filename'],
            'best_quality_score': best_image['score'],
            'total_damages_detected': damage_summary.get('total_damages', 0),
            'severity_level': damage_summary.get('severity_level', 'pristine'),
            'overall_confidence': quality_adjusted_confidence,
            'summary_text': f"Combined AI Analysis of {len(images)} images: Best view identified from '{best_image['filename']}' ({best_image['score']}% quality). Found {damage_summary.get('total_damages', 0)} total damages across all angles."
        }

        # EXIF Metadata Validation on original images
        try:
            orig_paths = [p for p in temp_files if '_annotated' not in p]
            exif_batch_analysis = validate_batch_exif(orig_paths)
        except Exception as e:
            exif_batch_analysis = {'batch_summary': {'overall_status': 'NO_METADATA', 'badge': 'No EXIF Data', 'findings': []}}

        # Cleanup temp files
        cleanup_temp_files(temp_files)
        
        return jsonify({
            'success': True,
            'total_images': len(images),
            'primary_image_index': best_image['index'],
            'primary_image_filename': best_image['filename'],
            'exif_validation': exif_batch_analysis.get('batch_summary', {}),
            'quality_adjusted_confidence': quality_adjusted_confidence,
            'damages_detected': all_damages,
            'annotated_images': annotated_images_b64,
            'damage_summary': damage_summary,
            'combined_ai_report': combined_ai_report,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        # Cleanup on error
        if 'temp_files' in locals():
            cleanup_temp_files(temp_files)
        
        return jsonify({
            'error': f'Damage detection failed: {str(e)}',
            'traceback': traceback.format_exc(),
            'success': False
        }), 500


@app.route('/process-batch', methods=['POST'])
@app.route('/analyze', methods=['POST'])
@app.route('/api/damage/analyze', methods=['POST'])
def process_batch():
    """
    Complete pipeline: validate quality + detect damage
    """
    try:
        def unpack_res(res_obj):
            if isinstance(res_obj, tuple):
                data = res_obj[0].get_json()
                code = res_obj[1]
            else:
                data = res_obj.get_json()
                code = getattr(res_obj, 'status_code', 200)
            return data, code

        # Step 1: Validate quality
        validation_response = validate_image_quality()
        validation_data, val_code = unpack_res(validation_response)
        
        if val_code != 200 or not validation_data.get('images_valid'):
            return jsonify({
                'success': False,
                'stage': 'validation',
                'validation': validation_data,
                'message': 'Image quality validation failed'
            }), val_code if val_code != 200 else 400
        
        # Step 2: Detect damage
        detection_response = detect_damage()
        detection_data, det_code = unpack_res(detection_response)
        
        if det_code != 200 or not detection_data.get('success'):
            return jsonify({
                'success': False,
                'stage': 'detection',
                'validation': validation_data,
                'detection': detection_data,
                'message': 'Damage detection failed'
            }), det_code if det_code != 200 else 500
        
        return jsonify({
            'success': True,
            'validation': validation_data,
            'detection': detection_data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Batch processing failed: {str(e)}',
            'traceback': traceback.format_exc(),
            'success': False
        }), 500


# ═══════════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5002'))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print("\n" + "═" * 70)
    print("🚗 DAMAGE DETECTION SERVICE")
    print("═" * 70)
    print(f"Port: {port}")
    print(f"Model: {CONFIG['YOLO_MODEL_PATH']}")
    print(f"Confidence Threshold: {CONFIG['CONFIDENCE_THRESHOLD']}")
    print(f"Device: {CONFIG['DEVICE']}")
    print("═" * 70 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
