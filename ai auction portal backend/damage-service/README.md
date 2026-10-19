# 🚗 Vehicle Damage Detection Service

Flask-based REST API for detecting vehicle damage using YOLOv8.

## Features

- **Image Quality Validation**: Blur, resolution, brightness checks
- **Damage Detection**: Detects 6 damage types using YOLOv8
- **Annotated Images**: Generates images with bounding boxes
- **Batch Processing**: Process multiple images at once

## Damage Types Detected

1. Dent
2. Scratch
3. Crack
4. Glass shatter
5. Lamp broken
6. Tire flat

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key settings:
- `YOLO_MODEL_PATH`: Path to trained YOLO weights
- `CONFIDENCE_THRESHOLD`: Minimum confidence (default: 0.60)
- `PORT`: Service port (default: 5002)

## Running the Service

```bash
python app.py
```

Server will start on `http://localhost:5002`

## API Endpoints

### 1. Health Check
```
GET /
```

Returns service status and model info.

### 2. Validate Image Quality
```
POST /validate-quality
```

**Payload**:
```json
{
  "images": [
    {
      "data": "base64_encoded_image",
      "filename": "front.jpg"
    }
  ]
}
```

**Response**:
```json
{
  "images_valid": true,
  "total_images": 5,
  "quality_checks": [
    {
      "image_index": 0,
      "filename": "front.jpg",
      "blur_check": { "is_sharp": true, "blur_score": 245.8 },
      "resolution_check": { "is_valid": true, "resolution": "1920x1080" },
      "brightness_check": { "is_optimal": true, "brightness_level": 125.3 },
      "overall_status": "pass"
    }
  ],
  "duplicate_check": { "has_duplicates": false },
  "errors": []
}
```

### 3. Detect Damage
```
POST /detect-damage
```

**Payload**:
```json
{
  "images": [
    {
      "data": "base64_encoded_image",
      "filename": "front.jpg"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "total_images": 5,
  "damages_detected": [
    {
      "type": "dent",
      "confidence": 85.5,
      "bbox": { "x1": 150, "y1": 200, "x2": 250, "y2": 300 },
      "severity": "moderate",
      "image_index": 0,
      "image_filename": "front.jpg"
    }
  ],
  "annotated_images": [
    {
      "image_index": 0,
      "filename": "front.jpg",
      "annotated_data": "base64_encoded_annotated_image",
      "detections_count": 1
    }
  ],
  "damage_summary": {
    "total_damages": 1,
    "severity_score": 15.5,
    "damage_counts": { "dent": 1 },
    "has_structural_damage": true,
    "has_cosmetic_damage": false,
    "has_functional_damage": false,
    "severity_level": "minor"
  }
}
```

### 4. Process Batch (Recommended)
```
POST /process-batch
```

Combines validation + detection in one call.

**Payload**: Same as above

**Response**: Combined validation and detection results

## Image Quality Requirements

- **Minimum Resolution**: 640x480 pixels
- **Blur Threshold**: Laplacian variance > 100
- **Brightness Range**: Mean pixel intensity 60-200
- **No Duplicates**: Perceptual hash distance > 5

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (validation failed)
- `500`: Server error (detection failed)

Error responses include:
```json
{
  "error": "Error message",
  "traceback": "Full stack trace (in debug mode)",
  "success": false
}
```

## Testing

Test with curl:

```bash
# Health check
curl http://localhost:5002/

# Validate quality
curl -X POST http://localhost:5002/validate-quality \
  -H "Content-Type: application/json" \
  -d @test_payload.json

# Detect damage
curl -X POST http://localhost:5002/detect-damage \
  -H "Content-Type: application/json" \
  -d @test_payload.json
```

## Model Files

Place your trained YOLO model in the service directory:
- `yolov8_damage.pt` - Trained weights

Model should be trained on 6 classes:
1. dent
2. scratch
3. crack
4. glass shatter
5. lamp broken
6. tire flat

## Performance

- **Processing Time**: ~2-3 seconds per image (CPU)
- **Batch Processing**: ~10-15 seconds for 5 images
- **GPU Acceleration**: Set `DEVICE=cuda` for faster inference

## Directory Structure

```
damage-service/
├── app.py                  # Main Flask application
├── image_quality.py        # Image validation module
├── damage_detector.py      # YOLO inference module
├── annotator.py            # Image annotation module
├── requirements.txt        # Python dependencies
├── .env.example            # Configuration template
├── README.md               # This file
├── temp/                   # Temporary files (auto-created)
└── yolov8_damage.pt        # YOLO model weights
```

## Integration with Main Backend

This service is called by the Node.js backend:

```javascript
// Example: Call from Node.js
const response = await axios.post('http://localhost:5002/process-batch', {
  images: [
    { data: base64Image, filename: 'front.jpg' },
    // ... more images
  ]
});

const { detection } = response.data;
console.log(`Detected ${detection.damage_summary.total_damages} damages`);
```

## Troubleshooting

**Model not loading:**
- Check `YOLO_MODEL_PATH` in `.env`
- Ensure model file exists
- Verify model is compatible with ultralytics version

**Out of memory:**
- Reduce batch size
- Use smaller image resolution
- Set `DEVICE=cpu` if GPU issues

**Slow inference:**
- Use `DEVICE=cuda` if GPU available
- Reduce image resolution
- Lower confidence threshold

## License

Proprietary - AI Auction Portal
