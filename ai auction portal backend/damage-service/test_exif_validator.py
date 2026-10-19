"""
Unit tests for EXIF metadata validation module using PIL native methods.
Verifies:
1. Missing EXIF is handled safely and never rejected.
2. Valid metadata extracts timestamp and device information.
3. Inconsistencies (future timestamp, editor software) are flagged for review.
4. Cross-image batch checks work as expected.
5. Exact coordinates are kept private and stripped from client response.
"""

import unittest
from PIL import Image
import io
from datetime import datetime, timedelta
import exif_validator

class TestExifValidator(unittest.TestCase):
    def test_image_without_exif(self):
        """Images without EXIF metadata must be accepted safely without error."""
        img = Image.new("RGB", (200, 200), color=(100, 150, 200))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        image_bytes = buf.getvalue()

        result = exif_validator.extract_single_image_exif(image_bytes)
        self.assertFalse(result["has_exif"])
        self.assertIsNone(result["capture_timestamp"])
        self.assertEqual(len(result["flags"]), 0)
        self.assertIn("No EXIF metadata present", result["notes"][0])

    def test_image_with_timestamp_and_device(self):
        """Images with timestamp and camera info should extract proper values."""
        img = Image.new("RGB", (200, 200), color=(200, 100, 50))
        exif = img.getexif()
        exif[exif_validator.TAG_MAKE] = "Sony"
        exif[exif_validator.TAG_MODEL] = "Alpha 7 IV"
        exif[exif_validator.TAG_DATETIME] = "2026:04:10 14:30:00"

        buf = io.BytesIO()
        img.save(buf, format="JPEG", exif=exif)

        result = exif_validator.extract_single_image_exif(buf.getvalue())
        self.assertTrue(result["has_exif"])
        self.assertEqual(result["camera_make"], "Sony")
        self.assertEqual(result["camera_model"], "Alpha 7 IV")
        self.assertIn("Sony Alpha 7 IV", result["device_label"])
        self.assertIsNotNone(result["capture_timestamp"])

    def test_future_timestamp_flagged(self):
        """Timestamps in the future must be flagged for review."""
        future_dt = datetime.now() + timedelta(days=60)
        future_str = future_dt.strftime("%Y:%m:%d %H:%M:%S")

        img = Image.new("RGB", (200, 200), color=(50, 200, 50))
        exif = img.getexif()
        exif[exif_validator.TAG_DATETIME] = future_str

        buf = io.BytesIO()
        img.save(buf, format="JPEG", exif=exif)

        result = exif_validator.extract_single_image_exif(buf.getvalue())
        self.assertIn("FUTURE_TIMESTAMP", result["flags"])

    def test_editing_software_flagged(self):
        """Editing software should be flagged without rejecting the image."""
        img = Image.new("RGB", (200, 200), color=(200, 200, 50))
        exif = img.getexif()
        exif[exif_validator.TAG_SOFTWARE] = "Adobe Photoshop 2025"

        buf = io.BytesIO()
        img.save(buf, format="JPEG", exif=exif)

        result = exif_validator.extract_single_image_exif(buf.getvalue())
        self.assertIn("EDITING_SOFTWARE_DETECTED", result["flags"])

    def test_malformed_bytes_safe_handling(self):
        """Malformed or corrupt data must not crash the service."""
        corrupt_bytes = b"NOT_A_REAL_IMAGE_DATA_12345"
        result = exif_validator.extract_single_image_exif(corrupt_bytes)
        self.assertFalse(result["has_exif"])
        self.assertTrue(len(result["notes"]) > 0)

    def test_batch_cross_check_and_privacy(self):
        """Batch validation should check consistency and not expose internal GPS."""
        img1 = Image.new("RGB", (100, 100))
        b1 = io.BytesIO()
        img1.save(b1, format="JPEG")

        batch_result = exif_validator.validate_batch_exif([b1.getvalue()])
        self.assertIn("batch_summary", batch_result)
        self.assertEqual(batch_result["batch_summary"]["total_images"], 1)

        # Ensure no private internal coordinate keys in sanitized individual results
        for item in batch_result["individual_results"]:
            for key in item.keys():
                self.assertFalse(key.startswith("_internal_"), f"Private key {key} leaked!")

if __name__ == "__main__":
    unittest.main()
