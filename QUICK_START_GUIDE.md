# 🚀 QUICK START GUIDE

**AI Vehicle Auction Portal with YOLO Damage Detection**

---

## ⚡ FASTEST START (Single Command)

```bash
cd "c:\Users\mohak\OneDrive\Desktop\AI auction portal 2\project"
START_ALL_SERVICES.bat
```

This will automatically start:
1. MongoDB
2. XGBoost ML Service (port 5001)
3. YOLO Damage Service (port 5002)
4. Node.js Backend (port 5000)
5. React Frontend (port 5173)

Wait 30 seconds for all services to initialize, then visit:
**http://localhost:5173**

---

## 📋 PREREQUISITES

### Required Software

✅ **Node.js** (v16 or higher)
```bash
node --version
```

✅ **Python** (3.9 or higher)
```bash
python --version
```

✅ **MongoDB** (running on port 27017)
```bash
# Check if running
tasklist /FI "IMAGENAME eq mongod.exe"
```

✅ **npm** (comes with Node.js)
```bash
npm --version
```

---

## 🔧 FIRST TIME SETUP

### 1. Install Backend Dependencies

```bash
cd "ai auction portal backend"
npm install
```

### 2. Setup XGBoost ML Service

```bash
cd "ai auction portal backend\ml"

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Setup YOLO Damage Service

```bash
cd "ai auction portal backend\damage-service"

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
copy .env.example .env
```

### 4. Configure Environment Variables

**Backend** (`ai auction portal backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/auction_db
ML_SERVICE_URL=http://127.0.0.1:5001
DAMAGE_SERVICE_URL=http://127.0.0.1:5002

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Authentication
JWT_SECRET=your_jwt_secret_here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Damage Service** (`ai auction portal backend/damage-service/.env`):
```env
PORT=5002
FLASK_DEBUG=False
YOLO_MODEL_PATH=../../damage-detection/runs/detect/damage_detection/car_damage_v1-3/weights/best.pt
CONFIDENCE_THRESHOLD=0.60
DEVICE=cpu
IMAGE_MIN_BLUR_SCORE=100
IMAGE_MIN_WIDTH=640
IMAGE_MIN_HEIGHT=480
```

### 5. Install Frontend Dependencies

```bash
cd "ai-auction-frontend"
npm install
```

---

## 🚀 MANUAL STARTUP (Step by Step)

### Terminal 1: Start MongoDB

```bash
# If not already running
mongod
```

### Terminal 2: Start XGBoost ML Service

```bash
cd "ai auction portal backend\ml"
venv\Scripts\activate
python app.py
```

**Expected Output**:
```
🚀 XGBoost Price Prediction Service
Port: 5001
Model: model.pkl loaded ✓
Running on http://0.0.0.0:5001
```

### Terminal 3: Start YOLO Damage Service

```bash
cd "ai auction portal backend\damage-service"
venv\Scripts\activate
python app.py
```

**Expected Output**:
```
═══════════════════════════════════════════════════════════════════
🚗 DAMAGE DETECTION SERVICE
═══════════════════════════════════════════════════════════════════
Port: 5002
Model: ../../damage-detection/runs/detect/damage_detection/car_damage_v1-3/weights/best.pt
Confidence Threshold: 0.6
Device: cpu
═══════════════════════════════════════════════════════════════════

✅ YOLO model loaded successfully
 * Running on http://0.0.0.0:5002
```

### Terminal 4: Start Node.js Backend

```bash
cd "ai auction portal backend"
node server.js
```

**Expected Output**:
```
🚀 Server running on http://localhost:5000
   JWT auth:    POST /api/auth/login | /api/auth/register
   Google auth: GET  /auth/google
   Vehicles:    GET  /api/vehicles
   Pricing:     POST /api/predict-price
```

### Terminal 5: Start React Frontend

```bash
cd "ai-auction-frontend"
npm run dev
```

**Expected Output**:
```
VITE v4.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ✅ VERIFY INSTALLATION

### Test All Services

```bash
cd "ai auction portal backend"
node VERIFY_INTEGRATION.js
```

**Expected Output**:
```
═══════════════════════════════════════════════════════════════════
PHASE 3 INTEGRATION VERIFICATION
═══════════════════════════════════════════════════════════════════

TEST 1: Backend Health Check
✅ PASS

... [10 tests]

═══════════════════════════════════════════════════════════════════
VERIFICATION COMPLETE
═══════════════════════════════════════════════════════════════════
Tests Run:    10
Tests Passed: 10 ✓
Tests Failed: 0

✅ ALL TESTS PASSED - INTEGRATION READY
```

---

## 🎯 USING THE APPLICATION

### 1. Access the Application

Open browser: **http://localhost:5173**

### 2. Create an Account

- Click "Sign Up"
- Enter email and password
- OR use Google OAuth

### 3. Add a Vehicle (WITH Damage Detection)

**Current Status**: Backend ready, frontend pending (Phase 4)

**Backend API Ready**:
```bash
# Upload images and create vehicle
POST http://localhost:5000/api/vehicles

# Multipart form data
files: [image1.jpg, image2.jpg, image3.jpg, image4.jpg, image5.jpg]  # Minimum 5
brand: "Honda"
model: "City"
year: 2020
mileage: 30000
...
damage_data: {
  "damages": [...],
  "damage_summary": {...},
  "annotated_images": [...]
}
```

**Available Endpoints**:
```bash
# Validate image quality
POST /api/damage/validate-quality

# Detect damage
POST /api/damage/detect

# Full pipeline (quality + detection)
POST /api/damage/process-batch

# Get pricing with damage
POST /api/predict-price
```

---

## 🧪 TESTING DAMAGE DETECTION

### Using cURL (Backend Testing)

#### 1. Health Check

```bash
curl http://localhost:5002/
```

**Expected**:
```json
{
  "status": "ok",
  "service": "Damage Detection Service",
  "version": "1.0",
  "model_loaded": true
}
```

#### 2. Test Pricing Without Damage (Backward Compatible)

```bash
curl -X POST http://localhost:5000/api/predict-price \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Maruti",
    "model": "Swift",
    "year": 2018,
    "vehicle_age": 8,
    "mileage": 50000,
    "fuel": "Petrol",
    "transmission": "Manual",
    "engine": 1200,
    "max_power": 82,
    "seats": 5
  }'
```

**Expected**: Standard pricing response (no damage fields)

#### 3. Test Pricing With Damage (New Feature)

```bash
curl -X POST http://localhost:5000/api/predict-price \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Honda",
    "model": "City",
    "year": 2020,
    "vehicle_age": 6,
    "mileage": 30000,
    "fuel": "Petrol",
    "transmission": "Manual",
    "engine": 1500,
    "max_power": 119,
    "seats": 5,
    "damage_data": {
      "damages": [
        {"type": "dent", "confidence": 85, "severity": "moderate"}
      ],
      "damage_summary": {
        "total_damages": 1,
        "severity_score": 15,
        "severity_level": "moderate"
      }
    }
  }'
```

**Expected**: Pricing with damage adjustment fields

---

## 🐛 TROUBLESHOOTING

### Issue 1: MongoDB Not Running

**Error**: `Failed to connect to MongoDB`

**Solution**:
```bash
# Start MongoDB
mongod

# Or as Windows service
net start MongoDB
```

---

### Issue 2: YOLO Model Not Found

**Error**: `[Errno 2] No such file or directory: '...best.pt'`

**Solution**:
```bash
# Verify model exists
dir "damage-detection\runs\detect\damage_detection\car_damage_v1-3\weights\best.pt"

# If missing, check other versions
dir "damage-detection\runs\detect\damage_detection\*\weights\*.pt" /s

# Update .env with correct path
cd "ai auction portal backend\damage-service"
notepad .env
# Edit: YOLO_MODEL_PATH=<correct_path>
```

---

### Issue 3: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F

# Or change port in .env
PORT=5001
```

---

### Issue 4: Python Dependencies Missing

**Error**: `ModuleNotFoundError: No module named 'ultralytics'`

**Solution**:
```bash
cd "ai auction portal backend\damage-service"
venv\Scripts\activate
pip install -r requirements.txt
```

---

### Issue 5: Cloudinary Upload Failing

**Error**: `Must supply cloud_name`

**Solution**:
```bash
# Configure Cloudinary in .env
cd "ai auction portal backend"
notepad .env

# Add credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 📊 SERVICE STATUS

### Check All Services

```bash
# Backend
curl http://localhost:5000/health

# XGBoost ML
curl http://localhost:5001/

# Damage Detection
curl http://localhost:5002/

# Damage API
curl http://localhost:5000/api/damage/health
```

**All should return 200 OK**

---

## 🔄 STOPPING SERVICES

### Using START_ALL_SERVICES.bat

Close the batch window and all terminal windows.

### Manual Stop

```bash
# Press Ctrl+C in each terminal window
# OR
# Close all terminal windows
```

### Force Stop

```bash
# Kill all Node.js processes
taskkill /F /IM node.exe

# Kill all Python processes
taskkill /F /IM python.exe

# Stop MongoDB (if needed)
net stop MongoDB
```

---

## 📚 NEXT STEPS

### Current Status

✅ **Completed**:
- Phase 1: Damage Detection Service
- Phase 2: Database Schema & Calculator
- Phase 3: Backend Integration

⏳ **Pending**:
- Phase 4: Frontend - AddVehicle Updates
- Phase 5: Frontend - Damage Display
- Phase 6: Testing & Refinement

### For Frontend Developers

**To implement Phase 4 (AddVehicle updates)**:

1. Read: `IMPLEMENTATION_COMPLETION_REPORT.md`
2. Read: Backend API documentation (in report)
3. Modify: `src/pages/AddVehicle.tsx`
4. Add: Damage detection flow
5. Test: With backend APIs

**Backend APIs Ready**:
- `POST /api/damage/process-batch` - Full damage detection
- `POST /api/predict-price` - Pricing with damage
- `POST /api/vehicles` - Create vehicle with damage data

---

## 🆘 NEED HELP?

### Documentation

- **Implementation Report**: `IMPLEMENTATION_COMPLETION_REPORT.md`
- **Safety Report**: `SAFE_INTEGRATION_REPORT.md`
- **Phase 1 Report**: `PHASE_1_IMPLEMENTATION_COMPLETE.md`
- **Phase 2 Report**: `PHASE_2_IMPLEMENTATION_COMPLETE.md`

### Testing

```bash
# Backend verification
node VERIFY_INTEGRATION.js

# Phase 2 verification
node verify_phase2.js
```

### Logs

Check terminal windows for detailed logs from each service.

---

**Status**: ✅ BACKEND READY FOR USE

**Version**: 3.0 (with Damage Detection)

**Last Updated**: June 19, 2026

