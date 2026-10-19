"""
═══════════════════════════════════════════════════════════════════
DAMAGE DETECTOR MODULE
Purpose: YOLOv8 inference for vehicle damage detection
Classes: dent, scratch, crack, glass shatter, lamp broken, tire flat
═══════════════════════════════════════════════════════════════════
"""

from ultralytics import YOLO
import cv2
import numpy as np


class DamageDetector:
    """
    Vehicle damage detector using YOLOv8
    """
    
    # Damage type severity weights (0-100)
    DAMAGE_SEVERITY = {
        'dent': 15,
        'scratch': 8,
        'crack': 20,
        'glass shatter': 25,
        'lamp broken': 18,
        'tire flat': 10
    }
    
    # Damage categories
    STRUCTURAL_DAMAGES = ['crack', 'dent']
    COSMETIC_DAMAGES = ['scratch']
    FUNCTIONAL_DAMAGES = ['lamp broken', 'tire flat', 'glass shatter']
    
    def __init__(self, model_path, confidence_threshold=0.60, device='cpu'):
        """
        Initialize YOLO model
        
        Args:
            model_path (str): Path to YOLO weights file
            confidence_threshold (float): Minimum confidence for detections
            device (str): 'cpu' or 'cuda'
        """
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.device = device
        
        print(f"✅ YOLO model loaded from {model_path}")
        print(f"   Confidence threshold: {confidence_threshold}")
        print(f"   Device: {device}")
    
    def detect(self, image_path):
        """
        Run damage detection on a single image
        
        Args:
            image_path (str): Path to image file
        
        Returns:
            list: List of detections, each containing:
                - type: damage type
                - confidence: confidence score (0-100)
                - bbox: bounding box coordinates
                - severity: damage severity category
        """
        # Run inference
        results = self.model(
            image_path,
            conf=self.confidence_threshold,
            device=self.device,
            verbose=False
        )
        
        detections = []
        
        # Parse results
        for result in results:
            boxes = result.boxes
            
            for i in range(len(boxes)):
                # Get class name and confidence
                class_id = int(boxes.cls[i])
                confidence = float(boxes.conf[i])
                
                # Get damage type from class names
                damage_type = result.names[class_id]
                
                # Get bounding box coordinates
                bbox = boxes.xyxy[i].cpu().numpy().tolist()
                
                # Determine severity
                severity = self._determine_severity(damage_type, confidence)
                
                detection = {
                    'type': damage_type,
                    'confidence': round(confidence * 100, 2),  # Convert to percentage
                    'bbox': {
                        'x1': round(bbox[0], 2),
                        'y1': round(bbox[1], 2),
                        'x2': round(bbox[2], 2),
                        'y2': round(bbox[3], 2)
                    },
                    'severity': severity,
                    'class_id': class_id
                }
                
                detections.append(detection)
        
        return detections
    
    def _determine_severity(self, damage_type, confidence):
        """
        Determine damage severity based on type and confidence
        
        Args:
            damage_type (str): Type of damage
            confidence (float): Detection confidence
        
        Returns:
            str: 'minor', 'moderate', or 'severe'
        """
        base_severity = self.DAMAGE_SEVERITY.get(damage_type, 10)
        
        # Adjust for confidence
        adjusted_severity = base_severity * confidence
        
        if adjusted_severity < 10:
            return 'minor'
        elif adjusted_severity < 20:
            return 'moderate'
        else:
            return 'severe'
    
    def calculate_damage_summary(self, all_detections):
        """
        Calculate overall damage summary from all detections
        
        Args:
            all_detections (list): List of all damage detections
        
        Returns:
            dict: Summary containing:
                - total_damages: total number of damages
                - severity_score: overall severity (0-100)
                - damage_counts: count by type
                - has_structural_damage: bool
                - has_cosmetic_damage: bool
                - has_functional_damage: bool
        """
        if not all_detections:
            return {
                'total_damages': 0,
                'severity_score': 0,
                'damage_counts': {},
                'has_structural_damage': False,
                'has_cosmetic_damage': False,
                'has_functional_damage': False,
                'categories': []
            }
        
        # Count damages by type
        damage_counts = {}
        total_severity = 0
        
        has_structural = False
        has_cosmetic = False
        has_functional = False
        
        for detection in all_detections:
            damage_type = detection['type']
            confidence = detection['confidence'] / 100  # Convert back to 0-1
            
            # Count by type
            damage_counts[damage_type] = damage_counts.get(damage_type, 0) + 1
            
            # Add to severity score
            base_severity = self.DAMAGE_SEVERITY.get(damage_type, 10)
            total_severity += base_severity * confidence
            
            # Check categories
            if damage_type in self.STRUCTURAL_DAMAGES:
                has_structural = True
            if damage_type in self.COSMETIC_DAMAGES:
                has_cosmetic = True
            if damage_type in self.FUNCTIONAL_DAMAGES:
                has_functional = True
        
        # Calculate overall severity score (0-100)
        # Cap at 100 even if multiple damages
        severity_score = min(total_severity, 100)
        
        # Determine overall categories
        categories = []
        if has_structural:
            categories.append('structural')
        if has_cosmetic:
            categories.append('cosmetic')
        if has_functional:
            categories.append('functional')
        
        return {
            'total_damages': len(all_detections),
            'severity_score': round(severity_score, 2),
            'damage_counts': damage_counts,
            'has_structural_damage': has_structural,
            'has_cosmetic_damage': has_cosmetic,
            'has_functional_damage': has_functional,
            'categories': categories,
            'severity_level': self._get_severity_level(severity_score)
        }
    
    def _get_severity_level(self, severity_score):
        """
        Convert numerical severity score to human-readable level
        
        Args:
            severity_score (float): Severity score (0-100)
        
        Returns:
            str: 'pristine', 'minor', 'moderate', 'major', 'severe'
        """
        if severity_score == 0:
            return 'pristine'
        elif severity_score < 15:
            return 'minor'
        elif severity_score < 35:
            return 'moderate'
        elif severity_score < 60:
            return 'major'
        else:
            return 'severe'
    
    def batch_detect(self, image_paths):
        """
        Run detection on multiple images
        
        Args:
            image_paths (list): List of image file paths
        
        Returns:
            dict: Dictionary mapping image paths to detections
        """
        results = {}
        
        for image_path in image_paths:
            try:
                detections = self.detect(image_path)
                results[image_path] = {
                    'success': True,
                    'detections': detections,
                    'count': len(detections)
                }
            except Exception as e:
                results[image_path] = {
                    'success': False,
                    'error': str(e),
                    'detections': [],
                    'count': 0
                }
        
        return results
