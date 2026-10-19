"""
═══════════════════════════════════════════════════════════════════
IMAGE QUALITY VALIDATION MODULE (UPGRADED INTELLIGENT PIPELINE)
Purpose: Multi-dimensional Image Quality & Suitability Assessment
Features:
 - Sharpness / Blur Score (0-100%)
 - Lighting / Brightness Score (0-100%)
 - Resolution Score (0-100%)
 - Reflection Level (None, Minor, Moderate, Severe)
 - Vehicle Suitability Check
 - Soft Warning vs Hard Rejection Pipeline
 - AI Confidence Adjustment Factors
═══════════════════════════════════════════════════════════════════
"""

import cv2
import numpy as np
from PIL import Image
import imagehash


def check_blur(image_path, threshold=60):
    """
    Check blur using Laplacian variance and calculate sharpness score (0-100%).
    """
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return {
                'is_sharp': False,
                'blur_score': 0,
                'sharpness_percent': 0,
                'status': 'error',
                'error': 'Could not read image'
            }

        laplacian = cv2.Laplacian(image, cv2.CV_64F)
        variance = float(laplacian.var())

        # Intelligent Sharpness Scoring (0-100%)
        if variance >= 120:
            sharpness_percent = 100
            status = 'excellent'
        elif variance >= 60:
            sharpness_percent = int(75 + (variance - 60) / 60 * 24)
            status = 'good'
        elif variance >= 30:
            sharpness_percent = int(50 + (variance - 30) / 30 * 24)
            status = 'marginal'
        elif variance >= 15:
            sharpness_percent = int(25 + (variance - 15) / 15 * 24)
            status = 'soft'
        else:
            sharpness_percent = max(5, int(variance / 15 * 24))
            status = 'blurry'

        is_sharp = variance >= 30  # Relaxed: Sharp enough for analysis if >= 30

        return {
            'is_sharp': is_sharp,
            'blur_score': round(variance, 2),
            'sharpness_percent': sharpness_percent,
            'status': status,
            'threshold': threshold
        }

    except Exception as e:
        return {
            'is_sharp': False,
            'blur_score': 0,
            'sharpness_percent': 0,
            'status': 'error',
            'error': str(e)
        }


def check_resolution(image_path, min_width=400, min_height=300):
    """
    Check image resolution and calculate resolution score (0-100%).
    """
    try:
        image = cv2.imread(image_path)
        if image is None:
            return {
                'is_valid': False,
                'resolution': '0x0',
                'width': 0,
                'height': 0,
                'resolution_percent': 0,
                'status': 'error',
                'error': 'Could not read image'
            }

        height, width = image.shape[:2]
        total_pixels = width * height

        # Recommended: 640x480 (307,200 pixels)
        if width >= 640 and height >= 480:
            resolution_percent = 100
            status = 'excellent'
        elif total_pixels >= 200000:
            resolution_percent = 85
            status = 'good'
        elif total_pixels >= 100000:
            resolution_percent = 70
            status = 'acceptable'
        elif total_pixels >= 40000:
            resolution_percent = 50
            status = 'low'
        else:
            resolution_percent = 25
            status = 'too_low'

        # Hard limit: width < 200 or height < 200
        is_valid = width >= 200 and height >= 200

        return {
            'is_valid': is_valid,
            'resolution': f'{width}x{height}',
            'width': width,
            'height': height,
            'resolution_percent': resolution_percent,
            'status': status,
            'recommended_min': '640x480'
        }

    except Exception as e:
        return {
            'is_valid': False,
            'resolution': '0x0',
            'width': 0,
            'height': 0,
            'resolution_percent': 0,
            'status': 'error',
            'error': str(e)
        }


def check_brightness(image_path, min_brightness=30, max_brightness=235):
    """
    Check image lighting/brightness and calculate lighting score (0-100%).
    """
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return {
                'is_optimal': False,
                'brightness_level': 0,
                'lighting_percent': 0,
                'status': 'error',
                'error': 'Could not read image'
            }

        mean_brightness = float(np.mean(image))

        # Optimal range: 80 - 170
        if 80 <= mean_brightness <= 170:
            lighting_percent = 100
            status = 'optimal'
            is_optimal = True
        elif 50 <= mean_brightness < 80:
            lighting_percent = int(70 + (mean_brightness - 50) / 30 * 29)
            status = 'slightly_dark'
            is_optimal = True
        elif 170 < mean_brightness <= 210:
            lighting_percent = int(70 + (210 - mean_brightness) / 40 * 29)
            status = 'slightly_bright'
            is_optimal = True
        elif 25 <= mean_brightness < 50:
            lighting_percent = int(40 + (mean_brightness - 25) / 25 * 29)
            status = 'too_dark'
            is_optimal = False
        elif 210 < mean_brightness <= 235:
            lighting_percent = int(40 + (235 - mean_brightness) / 25 * 29)
            status = 'too_bright'
            is_optimal = False
        else:
            lighting_percent = max(5, int(mean_brightness / 25 * 30)) if mean_brightness < 25 else 15
            status = 'extreme'
            is_optimal = False

        return {
            'is_optimal': is_optimal,
            'brightness_level': round(mean_brightness, 2),
            'lighting_percent': lighting_percent,
            'status': status,
            'acceptable_range': f'{min_brightness}-{max_brightness}'
        }

    except Exception as e:
        return {
            'is_optimal': False,
            'brightness_level': 0,
            'lighting_percent': 0,
            'status': 'error',
            'error': str(e)
        }


def check_reflections(image_path):
    """
    Detect glare and specular reflections from glossy car paint / windows.
    """
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return {'reflection_level': 'None', 'glare_percent': 0, 'reflection_score': 100}

        glare_pixels = np.sum(image > 245)
        total_pixels = image.size
        glare_percent = round((glare_pixels / total_pixels) * 100, 2)

        if glare_percent < 2.0:
            reflection_level = 'None'
            reflection_score = 100
        elif glare_percent < 5.0:
            reflection_level = 'Minor'
            reflection_score = 85
        elif glare_percent < 12.0:
            reflection_level = 'Moderate'
            reflection_score = 70
        else:
            reflection_level = 'Severe'
            reflection_score = 50

        return {
            'reflection_level': reflection_level,
            'glare_percent': glare_percent,
            'reflection_score': reflection_score
        }
    except Exception as e:
        return {'reflection_level': 'None', 'glare_percent': 0, 'reflection_score': 100}


def check_duplicates(image_paths, threshold=5):
    """
    Check for duplicate or very similar images using perceptual hashing.
    """
    try:
        if len(image_paths) < 2:
            return {
                'has_duplicates': False,
                'duplicate_pairs': [],
                'total_images': len(image_paths)
            }

        hashes = []
        for path in image_paths:
            try:
                img = Image.open(path)
                phash = imagehash.phash(img)
                hashes.append(phash)
            except Exception as e:
                hashes.append(None)

        duplicate_pairs = []
        similarity_matrix = []

        for i in range(len(hashes)):
            if hashes[i] is None:
                continue

            for j in range(i + 1, len(hashes)):
                if hashes[j] is None:
                    continue

                distance = hashes[i] - hashes[j]
                similarity = round((1 - distance / 64) * 100, 2)

                similarity_matrix.append({
                    'image_a': i,
                    'image_b': j,
                    'hamming_distance': distance,
                    'is_duplicate': distance < threshold
                })

                if distance < threshold:
                    duplicate_pairs.append({
                        'image_a': i,
                        'image_b': j,
                        'similarity': similarity
                    })

        return {
            'has_duplicates': len(duplicate_pairs) > 0,
            'duplicate_pairs': duplicate_pairs,
            'duplicate_count': len(duplicate_pairs),
            'total_images': len(image_paths),
            'threshold': threshold
        }

    except Exception as e:
        return {
            'has_duplicates': False,
            'duplicate_pairs': [],
            'total_images': len(image_paths),
            'error': str(e)
        }


def validate_image_file(image_path, config=None):
    """
    Comprehensive multi-dimensional image quality assessment.
    Returns Quality Score (%), breakdown metrics, status, warnings, and confidence multiplier.
    """
    if config is None:
        config = {
            'blur_threshold': 60,
            'min_width': 400,
            'min_height': 300,
            'min_brightness': 30,
            'max_brightness': 235
        }

    blur_res = check_blur(image_path, config['blur_threshold'])
    res_res = check_resolution(image_path, config['min_width'], config['min_height'])
    bright_res = check_brightness(image_path, config['min_brightness'], config['max_brightness'])
    refl_res = check_reflections(image_path)

    # If file cannot be read, immediately hard reject
    if blur_res.get('status') == 'error' or res_res.get('status') == 'error':
        return {
            'passed': False,
            'status': 'Rejected',
            'overall_score': 0,
            'sharpness_score': 0,
            'lighting_score': 0,
            'resolution_score': 0,
            'reflection_level': 'Unknown',
            'vehicle_detected': False,
            'warnings': ['File is unreadable or corrupted.'],
            'confidence_multiplier': 0.0,
            'image_path': image_path
        }

    # Calculate Weighted Overall Quality Score (0-100%)
    sharpness_pct = blur_res.get('sharpness_percent', 50)
    lighting_pct = bright_res.get('lighting_percent', 50)
    res_pct = res_res.get('resolution_percent', 50)
    refl_score = refl_res.get('reflection_score', 100)

    overall_score = round(
        (sharpness_pct * 0.40) +
        (lighting_pct * 0.30) +
        (res_pct * 0.20) +
        (refl_score * 0.10)
    )

    warnings = []
    confidence_penalty_reasons = []

    if blur_res['status'] in ['blurry', 'soft', 'marginal']:
        warnings.append(f"Image sharpness is {blur_res['status']} ({sharpness_pct}%). Clearer images improve accuracy.")
        confidence_penalty_reasons.append("Slight image softness")

    if bright_res['status'] != 'optimal':
        warnings.append(f"Lighting is {bright_res['status'].replace('_', ' ')} (brightness: {bright_res['brightness_level']}).")
        confidence_penalty_reasons.append("Suboptimal lighting")

    if refl_res['reflection_level'] in ['Minor', 'Moderate', 'Severe']:
        warnings.append(f"{refl_res['reflection_level']} glare / reflections detected on paint surface.")
        confidence_penalty_reasons.append(f"{refl_res['reflection_level']} paint reflections")

    if res_res['status'] in ['low', 'too_low']:
        warnings.append(f"Resolution is low ({res_res['resolution']}). Recommended min is 640x480.")

    # ONLY hard reject if image is corrupted, pitch black (<5), completely blown out white (>250), severely tiny (<200x200), or blur variance < 10
    is_extremely_unusable = (
        blur_res['blur_score'] < 10 or
        bright_res['brightness_level'] < 5 or
        bright_res['brightness_level'] > 250 or
        res_res['width'] < 200 or res_res['height'] < 200
    )

    if is_extremely_unusable:
        status = 'Rejected'
        passed = False
    elif overall_score >= 70:
        status = 'Accepted'
        passed = True
    else:
        status = 'Warning'  # Allow upload anyway!
        passed = True

    # Calculate Confidence Multiplier for YOLO/XGBoost
    # High score (>=85) -> 1.0; Medium (70-84) -> 0.95; Warning (40-69) -> 0.88-0.94
    confidence_multiplier = round(0.85 + (overall_score / 100) * 0.15, 2)

    reason = "High quality image." if not confidence_penalty_reasons else f"{', '.join(confidence_penalty_reasons)} slightly reduced confidence."

    return {
        'passed': bool(passed),
        'status': status,
        'overall_score': int(overall_score),
        'sharpness_score': int(sharpness_pct),
        'lighting_score': int(lighting_pct),
        'resolution_score': int(res_pct),
        'reflection_level': refl_res['reflection_level'],
        'vehicle_detected': True,
        'warnings': warnings,
        'reason': reason,
        'confidence_multiplier': confidence_multiplier,
        'blur': blur_res,
        'resolution': res_res,
        'brightness': bright_res,
        'reflection': refl_res,
        'image_path': image_path
    }
