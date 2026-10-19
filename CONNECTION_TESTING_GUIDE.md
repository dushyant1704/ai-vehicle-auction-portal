# 🚀 AI Car Auction Portal - Connection & Testing Guide

## ✅ Backend-Frontend Connection Troubleshooting

### Current Setup

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000
- **Database**: MongoDB (with fallback dummy data)
- **ML Service**: http://127.0.0.1:5001 (optional, uses fallback if unavailable)

---

## Step 1: Start Backend Server

```bash
cd "ai auction portal backend"
npm install
node server.js
```

**Expected Console Output:**

```
========== ENVIRONMENT CONFIGURATION ==========
📋 Checking Required Environment Variables:
  ✓ GOOGLE_CLIENT_ID: ✅ LOADED
  ✓ GOOGLE_CLIENT_SECRET: ✅ LOADED
  ...
✅ CORS configured for: http://localhost:3000
✅ Express Session configured with MemoryStore
✅ Passport initialized
✅ All routes mounted

📡 API ENDPOINTS:
  ✅ GET  http://localhost:5000/                    (test)
  ✅ GET  http://localhost:5000/health              (health check)
  ✅ GET  http://localhost:5000/api/vehicles        (list vehicles)
  ...

🚀 Frontend should connect to: http://localhost:5000/api/vehicles
```

---

## Step 2: Test Backend API Directly (in Browser or Postman)

### Test 1: Backend Health Check

```
URL: http://localhost:5000/health
```

**Expected Response:**

```json
{
  "status": "✅ Backend is healthy",
  "timestamp": "2024-04-19T10:30:00Z",
  "uptime": 123.456
}
```

### Test 2: Get Vehicles List

```
URL: http://localhost:5000/api/vehicles
```

**Expected Response:**

```json
{
  "vehicles": [
    {
      "_id": "dummy_1",
      "brand": "Hyundai",
      "model": "Creta",
      "year": 2022,
      "mileage": 25000,
      "marketPrice": 850000,
      "insuranceValue": 85000,
      "baseValue": 680000,
      "residualValue": 510000,
      "distressValue": 425000,
      "salvageValue": 212500,
      ...
    },
    ...
  ],
  "total": 4
}
```

### Test 3: Get Single Vehicle

```
URL: http://localhost:5000/api/vehicles/dummy_1
```

**Expected Response:**

```json
{
  "_id": "dummy_1",
  "brand": "Hyundai",
  "model": "Creta",
  "marketPrice": 850000,
  ...
}
```

### Test 4: User Endpoint (No Login)

```
URL: http://localhost:5000/user
```

**Expected Response:**

```json
{
  "user": null
}
```

---

## Step 3: Start Frontend Server

```bash
cd ai-auction-frontend
npm install
npm run dev
```

**Expected Output:**

```
VITE ready in 234 ms

➜  Local:   http://localhost:5173
➜  press h to show help
```

---

## Step 4: Test Frontend Connection

### Open Frontend in Browser

1. Go to: `http://localhost:3000` (or the URL shown in terminal)
2. Click on **"Auctions"** or **"Home"** → **"Explore Auctions"**
3. **Expected**: Vehicles list should load with dummy data

### If You See "Connection Interrupted" Error:

#### ✅ Solution 1: Check Backend is Running

```bash
# In a NEW terminal, test backend health
curl http://localhost:5000/health
```

#### ✅ Solution 2: Check CORS Configuration

Backend server.js should have:

```javascript
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
```

#### ✅ Solution 3: Check Frontend API URL

Frontend Auctions.tsx should use full URL:

```javascript
const axiosInstance = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 60000,
});
```

#### ✅ Solution 4: Check Network Tab in Browser

1. Open Browser DevTools (F12)
2. Go to "Network" tab
3. Refresh page
4. Look for request to `http://localhost:5000/api/vehicles`
5. Check if it has:
   - Status: **200** (success)
   - Response: JSON data
   - If **0** status: backend not running

---

## Common Issues & Fixes

### Issue: "Cannot GET /api/vehicles"

**Cause**: Backend server not running or routes not mounted
**Fix**:

```bash
# Kill any process on port 5000
# Then restart backend
cd "ai auction portal backend"
node server.js
```

### Issue: "Cross-Origin Request Blocked (CORS Error)"

**Cause**: CORS not configured for frontend URL
**Fix**: Check `.env` has:

```
FRONTEND_URL=http://localhost:3000
```

### Issue: "Connection Interrupted – Failed to load vehicles"

**Cause**: One of the above + network issue
**Fix**:

1. Check backend console for errors
2. Verify MongoDB connection (or use dummy data fallback)
3. Check firewall/antivirus blocking port 5000

### Issue: Port Already in Use

```bash
# Windows: Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux: Kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

---

## Dummy Data Fallback

If MongoDB is not running:

- Backend automatically uses **4 dummy vehicles**
- Frontend will still display them
- All features work without database

Dummy vehicles included:

1. **Hyundai Creta** (2022) - ₹950,000
2. **Maruti Swift** (2021) - ₹650,000
3. **Toyota Fortuner** (2020) - ₹2,100,000
4. **Honda City** (2019) - ₹850,000

---

## Complete Testing Flow

### 1️⃣ Terminal 1: Start Backend

```bash
cd "ai auction portal backend"
node server.js
```

Wait for: `🚀 Frontend should connect to: http://localhost:5000/api/vehicles`

### 2️⃣ Terminal 2: Test Backend

```bash
curl http://localhost:5000/api/vehicles
```

Should return JSON with vehicles

### 3️⃣ Terminal 3: Start Frontend

```bash
cd ai-auction-frontend
npm run dev
```

Wait for: `Local: http://localhost:3000`

### 4️⃣ Browser: Open Frontend

```
http://localhost:3000
```

### 5️⃣ Check if Vehicles Load

- Navigate to Auctions page
- Should show 4 dummy vehicles (or database vehicles)
- No "Connection Interrupted" error

---

## Backend Logging

When frontend calls backend, you'll see in backend console:

```
📨 GET /api/vehicles request received
  Query params: { limit: '20', page: '1', search: '', ... }
  ✅ Database query successful. Found 4 vehicles
  📤 Returning 4 vehicles to frontend
```

Or if database fails:

```
📨 GET /api/vehicles request received
  ...
  ⚠️ Database query failed, using fallback dummy data
  📤 Returning 4 vehicles to frontend
```

---

## API Response Format

All vehicle responses include:

```json
{
  "_id": "unique_id",
  "brand": "Hyundai",
  "model": "Creta",
  "year": 2022,
  "mileage": 25000,
  "price": 950000,
  "engine": 1200,
  "max_power": 110,
  "seats": 5,
  "fuel": "Petrol",
  "transmission": "Manual",
  "vehicle_age": 2,
  "location": "Mumbai",
  "condition": "Good",
  "images": [{ "url": "https://..." }],
  "marketPrice": 850000,
  "insuranceValue": 85000,
  "baseValue": 680000,
  "residualValue": 510000,
  "distressValue": 425000,
  "salvageValue": 212500
}
```

---

## 🎯 Summary

✅ **Backend**: Listens on http://localhost:5000
✅ **CORS**: Allows http://localhost:3000
✅ **Routes**: /api/vehicles returns vehicle list
✅ **Fallback**: Dummy data if database fails
✅ **Logging**: Detailed console output for debugging
✅ **Error Handling**: Returns errors with messages

**If vehicles don't load:**

1. Check backend is running: `node server.js`
2. Test: `curl http://localhost:5000/api/vehicles`
3. Check browser console (F12) for errors
4. Verify no firewall blocking port 5000

---

**Everything is now configured to work! Start backend → start frontend → open browser. 🚀**
