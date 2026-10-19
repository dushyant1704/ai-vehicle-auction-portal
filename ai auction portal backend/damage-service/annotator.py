"""
═══════════════════════════════════════════════════════════════════
IMAGE ANNOTATOR MODULE
Purpose: Draw bounding boxes and labels on detected damages
═══════════════════════════════════════════════════════════════════
"""

import cv2
import numpy as np


class ImageAnnotator:
    """
    Draw annotations on images for damage detection results
    """
    
    # Color scheme for different damage types (BGR format)
    COLORS = {
        'dent': (0, 165, 255),          # Orange
        'scratch': (255, 255, 0),       # Cyan
        'crack': (0, 0, 255),           # Red
        'glass shatter': (255, 0, 255), # Magenta
        'lamp broken': (0, 255, 255),   # Yellow
        'tire flat': (255, 0, 0),       # Blue
        'default': (0, 255, 0)          # Green
    }
    
    # Severity colors
    SEVERITY_COLORS = {
        'minor': (0, 255, 0),    # Green
        'moderate': (0, 165, 255),  # Orange
        'severe': (0, 0, 255)    # Red
    }
    
    def __init__(self, font_scale=0.6, thickness=2):
        """
        Initialize annotator
        
        Args:
            font_scale (float): Font size for labels
            thickness (int): Line thickness for bounding boxes
        """
        self.font_scale = font_scale
        self.thickness = thickness
        self.font = cv2.FONT_HERSHEY_SIMPLEX
    
    def draw_detections(self, image_path, detections, output_path):
        """
        Draw all detections on an image
        
        Args:
            image_path (str): Path to original image
            detections (list): List of detection dictionaries
            output_path (str): Path to save annotated image
        
        Returns:
            str: Path to saved annotated image
        """
        # Read image
        image = cv2.imread(image_path)
        
        if image is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        # Draw each detection
        for detection in detections:
            self._draw_single_detection(image, detection)
        
        # Add summary text
        self._draw_summary(image, detections)
        
        # Save annotated image
        cv2.imwrite(output_path, image)
        
        return output_path
    
    def _draw_single_detection(self, image, detection):
        """
        Draw a single detection (bounding box + label)
        
        Args:
            image (numpy.ndarray): Image to draw on (modified in place)
            detection (dict): Detection dictionary
        """
        damage_type = detection['type']
        confidence = detection['confidence']
        bbox = detection['bbox']
        severity = detection.get('severity', 'moderate')
        
        # Get coordinates
        x1 = int(bbox['x1'])
        y1 = int(bbox['y1'])
        x2 = int(bbox['x2'])
        y2 = int(bbox['y2'])
        
        # Get color based on damage type
        color = self.COLORS.get(damage_type, self.COLORS['default'])
        
        # Draw bounding box
        cv2.rectangle(image, (x1, y1), (x2, y2), color, self.thickness)
        
        # Prepare label text
        label = f"{damage_type} {confidence:.1f}%"
        
        # Get text size for background
        (text_width, text_height), baseline = cv2.getTextSize(
            label,
            self.font,
            self.font_scale,
            self.thickness
        )
        
        # Draw background rectangle for label
        label_y = y1 - 10 if y1 - 10 > text_height else y1 + text_height + 10
        cv2.rectangle(
            image,
            (x1, label_y - text_height - baseline),
            (x1 + text_width, label_y + baseline),
            color,
            -1  # Filled
        )
        
        # Draw label text
        cv2.putText(
            image,
            label,
            (x1, label_y),
            self.font,
            self.font_scale,
            (255, 255, 255),  # White text
            self.thickness,
            cv2.LINE_AA
        )
        
        # Draw severity indicator (small circle in corner)
        severity_color = self.SEVERITY_COLORS.get(severity, (0, 255, 0))
        cv2.circle(image, (x2 - 10, y1 + 10), 5, severity_color, -1)
    
    def _draw_summary(self, image, detections):
        """
        Draw summary information on image
        
        Args:
            image (numpy.ndarray): Image to draw on (modified in place)
            detections (list): List of all detections
        """
        if not detections:
            return
        
        # Count damages by type
        damage_counts = {}
        for detection in detections:
            damage_type = detection['type']
            damage_counts[damage_type] = damage_counts.get(damage_type, 0) + 1
        
        # Prepare summary text
        summary_lines = [
            f"Total Damages: {len(detections)}",
            "─" * 30
        ]
        
        for damage_type, count in sorted(damage_counts.items()):
            summary_lines.append(f"{damage_type}: {count}")
        
        # Draw summary box (top-left corner)
        padding = 10
        line_height = 25
        box_width = 250
        box_height = len(summary_lines) * line_height + 2 * padding
        
        # Semi-transparent background
        overlay = image.copy()
        cv2.rectangle(
            overlay,
            (10, 10),
            (10 + box_width, 10 + box_height),
            (0, 0, 0),
            -1
        )
        cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
        
        # Draw border
        cv2.rectangle(
            image,
            (10, 10),
            (10 + box_width, 10 + box_height),
            (255, 255, 255),
            2
        )
        
        # Draw text lines
        y_position = 10 + padding + 15
        for line in summary_lines:
            cv2.putText(
                image,
                line,
                (20, y_position),
                self.font,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )
            y_position += line_height
    
    def create_comparison_image(self, original_path, annotated_path, output_path):
        """
        Create side-by-side comparison of original and annotated images
        
        Args:
            original_path (str): Path to original image
            annotated_path (str): Path to annotated image
            output_path (str): Path to save comparison image
        
        Returns:
            str: Path to saved comparison image
        """
        # Read images
        original = cv2.imread(original_path)
        annotated = cv2.imread(annotated_path)
        
        if original is None or annotated is None:
            raise ValueError("Could not read input images")
        
        # Ensure same height
        h1, w1 = original.shape[:2]
        h2, w2 = annotated.shape[:2]
        
        if h1 != h2:
            # Resize to match heights
            target_height = min(h1, h2)
            original = cv2.resize(original, (int(w1 * target_height / h1), target_height))
            annotated = cv2.resize(annotated, (int(w2 * target_height / h2), target_height))
        
        # Add labels
        cv2.putText(
            original,
            "ORIGINAL",
            (20, 40),
            self.font,
            1.2,
            (0, 255, 0),
            3,
            cv2.LINE_AA
        )
        
        cv2.putText(
            annotated,
            "DETECTED DAMAGES",
            (20, 40),
            self.font,
            1.2,
            (0, 0, 255),
            3,
            cv2.LINE_AA
        )
        
        # Concatenate horizontally
        comparison = np.hstack((original, annotated))
        
        # Save
        cv2.imwrite(output_path, comparison)
        
        return output_path
    
    def draw_legend(self, image, position='bottom-right'):
        """
        Draw a legend showing damage types and colors
        
        Args:
            image (numpy.ndarray): Image to draw on (modified in place)
            position (str): 'top-left', 'top-right', 'bottom-left', 'bottom-right'
        """
        height, width = image.shape[:2]
        
        # Legend dimensions
        legend_width = 200
        legend_height = len(self.COLORS) * 30 + 40
        padding = 15
        
        # Calculate position
        if position == 'top-left':
            x, y = padding, padding
        elif position == 'top-right':
            x, y = width - legend_width - padding, padding
        elif position == 'bottom-left':
            x, y = padding, height - legend_height - padding
        else:  # bottom-right
            x, y = width - legend_width - padding, height - legend_height - padding
        
        # Draw semi-transparent background
        overlay = image.copy()
        cv2.rectangle(
            overlay,
            (x, y),
            (x + legend_width, y + legend_height),
            (0, 0, 0),
            -1
        )
        cv2.addWeighted(overlay, 0.7, image, 0.3, 0, image)
        
        # Draw border
        cv2.rectangle(
            image,
            (x, y),
            (x + legend_width, y + legend_height),
            (255, 255, 255),
            2
        )
        
        # Draw title
        cv2.putText(
            image,
            "DAMAGE TYPES",
            (x + 10, y + 25),
            self.font,
            0.6,
            (255, 255, 255),
            2,
            cv2.LINE_AA
        )
        
        # Draw each damage type with color
        y_pos = y + 50
        for damage_type, color in self.COLORS.items():
            if damage_type == 'default':
                continue
            
            # Draw color box
            cv2.rectangle(
                image,
                (x + 10, y_pos - 10),
                (x + 30, y_pos + 5),
                color,
                -1
            )
            
            # Draw label
            cv2.putText(
                image,
                damage_type,
                (x + 40, y_pos),
                self.font,
                0.4,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )
            
            y_pos += 25
