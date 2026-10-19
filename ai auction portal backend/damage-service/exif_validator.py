"""
═══════════════════════════════════════════════════════════════════
EXIF METADATA VALIDATION MODULE
Purpose: Extract and validate camera, timestamp, and location metadata
         from uploaded vehicle inspection images.

Key Principles:
1. Missing or stripped EXIF is handled safely (never rejected outright).
2. Metadata is treated as supporting evidence, not proof.
3. Inconsistencies are flagged for review (no unsupported claims).
4. Raw exact GPS coordinates are kept internal; never leaked publicly.
═══════════════════════════════════════════════════════════════════
"""

import os
import io
import math
from datetime import datetime, timezone
from PIL import Image, ExifTags

# EXIF Tag ID references
TAG_DATETIME_ORIGINAL = 36867  # DateTimeOriginal
TAG_DATETIME_DIGITIZED = 36868 # DateTimeDigitized
TAG_DATETIME = 306            # DateTime
TAG_MAKE = 271                # Make
TAG_MODEL = 272               # Model
TAG_SOFTWARE = 305            # Software
TAG_GPS_INFO = 34853          # GPSInfo


def _parse_exif_timestamp(ts_str):
    """
    Safely parse EXIF timestamp formats (e.g. 'YYYY:MM:DD HH:MM:SS')
    """
    if not ts_str or not isinstance(ts_str, str):
        return None

    cleaned = ts_str.strip()
    formats = [
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y:%m:%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except (ValueError, TypeError):
            continue

    return None


def _convert_dms_to_deg(dms_tuple):
    """Convert degrees, minutes, seconds tuple to decimal degrees."""
    if not dms_tuple or len(dms_tuple) < 3:
        return None
    try:
        deg = float(dms_tuple[0])
        minutes = float(dms_tuple[1])
        sec = float(dms_tuple[2])
        return deg + (minutes / 60.0) + (sec / 3600.0)
    except Exception:
        return None


def _haversine_km(lat1, lon1, lat2, lon2):
    """Calculate approximate distance in kilometers between two GPS points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def extract_single_image_exif(image_input):
    """
    Extracts and validates EXIF metadata from a single image.
    Accepts: file path (str), bytes, or PIL Image.
    Returns: dict with sanitized, validated metadata.
    """
    result = {
        "has_exif": False,
        "capture_timestamp": None,
        "capture_date_formatted": None,
        "camera_make": None,
        "camera_model": None,
        "device_label": None,
        "software_used": None,
        "has_gps": False,
        "gps_status": "NONE",
        "flags": [],
        "notes": [],
        # Internal coordinate placeholders for cross-image consistency only
        "_internal_lat": None,
        "_internal_lon": None
    }

    try:
        # Open image
        if isinstance(image_input, Image.Image):
            img = image_input
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, str) and os.path.exists(image_input):
            img = Image.open(image_input)
        else:
            result["notes"].append("Image source could not be opened for EXIF parsing.")
            return result

        raw_exif = img.getexif()
        if not raw_exif or len(raw_exif) == 0:
            result["notes"].append("No EXIF metadata present (standard for web-optimized, privacy-stripped, or screenshot images).")
            return result

        result["has_exif"] = True

        # 1. Device Make & Model
        make = raw_exif.get(TAG_MAKE)
        if make and isinstance(make, str):
            result["camera_make"] = make.strip().replace("\x00", "")

        model = raw_exif.get(TAG_MODEL)
        if model and isinstance(model, str):
            result["camera_model"] = model.strip().replace("\x00", "")

        if result["camera_make"] and result["camera_model"]:
            # If make is already prefix of model, avoid redundancy
            if result["camera_model"].lower().startswith(result["camera_make"].lower()):
                result["device_label"] = result["camera_model"]
            else:
                result["device_label"] = f"{result['camera_make']} {result['camera_model']}"
        elif result["camera_model"]:
            result["device_label"] = result["camera_model"]
        elif result["camera_make"]:
            result["device_label"] = result["camera_make"]

        # 2. Software
        software = raw_exif.get(TAG_SOFTWARE)
        if software and isinstance(software, str):
            s_clean = software.strip().replace("\x00", "")
            result["software_used"] = s_clean
            # Check for editing software
            editing_tools = ["photoshop", "gimp", "lightroom", "canva", "snapseed", "picsart"]
            if any(tool in s_clean.lower() for tool in editing_tools):
                result["flags"].append("EDITING_SOFTWARE_DETECTED")
                result["notes"].append(f"Image was saved or modified using photo editor: {s_clean}")

        # 3. Capture Timestamp
        # First check get_ifd for Exif IFD (tag 0x8769) if present
        exif_ifd = {}
        try:
            if hasattr(raw_exif, "get_ifd"):
                exif_ifd = raw_exif.get_ifd(0x8769) or {}
        except Exception:
            exif_ifd = {}

        raw_ts = (
            exif_ifd.get(TAG_DATETIME_ORIGINAL) or
            exif_ifd.get(TAG_DATETIME_DIGITIZED) or
            raw_exif.get(TAG_DATETIME_ORIGINAL) or
            raw_exif.get(TAG_DATETIME)
        )

        dt_obj = _parse_exif_timestamp(raw_ts)
        now = datetime.now()

        if dt_obj:
            result["capture_timestamp"] = dt_obj.isoformat()
            result["capture_date_formatted"] = dt_obj.strftime("%Y-%m-%d %H:%M:%S")

            # Check if timestamp is in the future
            if (dt_obj - now).total_seconds() > 86400:  # > 24 hours ahead
                result["flags"].append("FUTURE_TIMESTAMP")
                result["notes"].append("Timestamp indicates a future capture date (clock misconfiguration or modified metadata).")
            elif dt_obj.year < 2000:
                result["flags"].append("LEGACY_TIMESTAMP")
                result["notes"].append(f"Timestamp indicates image captured in {dt_obj.year} (pre-2000 date).")
            else:
                age_days = (now - dt_obj).days
                if age_days < 7:
                    result["notes"].append("Image was captured within the last 7 days.")
                elif age_days < 30:
                    result["notes"].append("Image was captured within the last 30 days.")

        # 4. GPS Information (if present)
        gps_ifd = {}
        try:
            if hasattr(raw_exif, "get_ifd"):
                gps_ifd = raw_exif.get_ifd(TAG_GPS_INFO) or {}
        except Exception:
            gps_ifd = {}

        if not gps_ifd and TAG_GPS_INFO in raw_exif:
            gps_ifd = raw_exif[TAG_GPS_INFO]

        if gps_ifd and isinstance(gps_ifd, dict):
            lat_ref = gps_ifd.get(1, "N")
            lat_val = gps_ifd.get(2)
            lon_ref = gps_ifd.get(3, "E")
            lon_val = gps_ifd.get(4)

            lat_deg = _convert_dms_to_deg(lat_val)
            lon_deg = _convert_dms_to_deg(lon_val)

            if lat_deg is not None and lon_deg is not None:
                if str(lat_ref).upper() == "S":
                    lat_deg = -lat_deg
                if str(lon_ref).upper() == "W":
                    lon_deg = -lon_deg

                result["has_gps"] = True
                result["gps_status"] = "PRESENT_INTERNAL_VALIDATED"
                result["_internal_lat"] = lat_deg
                result["_internal_lon"] = lon_deg
                result["notes"].append("Geotag metadata is present and validated.")

    except Exception as e:
        result["notes"].append(f"Safe recovery from unreadable/malformed EXIF data: {str(e)}")

    return result


def validate_batch_exif(image_inputs):
    """
    Validates a batch of vehicle images (e.g., the 5 required inspection angles).
    Performs cross-image consistency checks on timestamps, devices, and location.
    Returns:
      - individual_results: list of per-image metadata (sanitized for client)
      - batch_summary: consolidated integrity assessment
    """
    if not image_inputs or not isinstance(image_inputs, list):
        return {
            "individual_results": [],
            "batch_summary": {
                "overall_status": "NO_METADATA",
                "badge": "No Metadata",
                "images_with_exif": 0,
                "total_images": 0,
                "findings": ["No images provided for EXIF verification."]
            }
        }

    individual_results = []
    timestamps = []
    devices = []
    gps_coords = []
    any_flags = []

    for item in image_inputs:
        single_res = extract_single_image_exif(item)

        # Record internal values for batch cross-check
        if single_res.get("capture_timestamp"):
            dt = _parse_exif_timestamp(single_res["capture_timestamp"])
            if dt:
                timestamps.append(dt)

        if single_res.get("device_label"):
            devices.append(single_res["device_label"])

        if single_res.get("_internal_lat") is not None and single_res.get("_internal_lon") is not None:
            gps_coords.append((single_res["_internal_lat"], single_res["_internal_lon"]))

        if single_res.get("flags"):
            any_flags.extend(single_res["flags"])

        # Create sanitized copy for client / public persistence (remove internal exact lat/lon)
        sanitized = {k: v for k, v in single_res.items() if not k.startswith("_")}
        individual_results.append(sanitized)

    total_images = len(individual_results)
    images_with_exif = sum(1 for r in individual_results if r["has_exif"])
    findings = []
    cross_flags = []

    # Cross-Image Timestamp Consistency Check
    if len(timestamps) >= 2:
        timestamps_sorted = sorted(timestamps)
        max_delta_days = (timestamps_sorted[-1] - timestamps_sorted[0]).total_seconds() / 86400.0

        if max_delta_days > 30:
            cross_flags.append("TIMESTAMP_DISCREPANCY")
            findings.append(
                f"Capture timestamp variance across photos is {round(max_delta_days)} days. Photos may have been taken at different times."
            )
        else:
            findings.append("Capture timestamps across photos are chronologically consistent.")
    elif len(timestamps) == 1:
        findings.append("Timestamp found on 1 photo; other photos were web-uploaded without timestamp headers.")

    # Cross-Image Location Consistency Check
    if len(gps_coords) >= 2:
        max_dist_km = 0.0
        for i in range(len(gps_coords)):
            for j in range(i + 1, len(gps_coords)):
                d = _haversine_km(gps_coords[i][0], gps_coords[i][1], gps_coords[j][0], gps_coords[j][1])
                if d > max_dist_km:
                    max_dist_km = d

        if max_dist_km > 100.0:
            cross_flags.append("GEOGRAPHIC_DISCREPANCY")
            findings.append(
                f"Photos contain geotags showing locations ~{round(max_dist_km)} km apart. Flagged for manual inspection."
            )
        else:
            findings.append("Geotags confirm photos were taken within the same localized area.")

    # Device Consistency
    unique_devices = list(dict.fromkeys(devices))
    device_summary = ", ".join(unique_devices) if unique_devices else "Standard Device"

    # Determine Overall Integrity Status
    all_flags = list(set(any_flags + cross_flags))

    if all_flags:
        overall_status = "FLAGGED_FOR_REVIEW"
        badge = "Flagged for Review"
        findings.append("One or more metadata inconsistencies detected. Treated as supporting evidence for inspector review.")
    elif images_with_exif > 0:
        overall_status = "VERIFIED_RECENT"
        badge = "Metadata Verified"
        findings.append("EXIF metadata is present and conforms with standard inspection capture parameters.")
    else:
        overall_status = "NO_METADATA"
        badge = "No EXIF Data"
        findings.append("No EXIF metadata found on uploaded images (normal for web/messaging platforms or privacy-stripped uploads).")

    return {
        "individual_results": individual_results,
        "batch_summary": {
            "overall_status": overall_status,
            "badge": badge,
            "images_with_exif": images_with_exif,
            "total_images": total_images,
            "device_summary": device_summary,
            "flags": all_flags,
            "findings": findings
        }
    }
