# 🚀 How to Start All Services

## Quick Start Commands

### Start All Services at Once (Recommended)

Open 3 separate terminals and run:

**Terminal 1 - Damage Detection Service:**
```bash
cd "c:\Users\mohak\OneDrive\Desktop\AI auction portal 2\project\ai auction portal backend\damage-service"
python app.py
```

**Terminal 2 - Backend API:**
```bash
cd "c:\Users\mohak\OneDrive\Desktop\AI auction portal 2\project\ai auction portal backend"
node server.js
```

**Terminal 3 - Frontend:**
```bash
cd "c:\Users\mohak\OneDrive\Desktop\AI auction portal 2\project\ai-auction-frontend"
npm run dev
```

---

## Service URLs

Once all services are running, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Damage Service**: http://localhost:5002

---

## Verify Services Are Running

Test each service with these commands:

```bash
# Test Damage Service
curl http://localhost:5002/

# Test Backend
curl http://localhost:5000/

# Test Frontend
curl http://localhost:5173/
```

---

## If Services Don't Start

### Damage Service Issues

**Error: "No module named 'ultralytics'"**
```bash
cd "c:\Users\mohak\OneDrive\Desktop\AI auction portal 2\project\ai auction portal backend\damage-service"
pip install -r requirements.txt
```

**Error: "Model file not found"**
- Check that `yolov8_damage.pt` exists in the damage-service folder
- Verify `.env` file has: `YOLO_MODEL_PATH=yolov8_damage.pt`

### Backend Issues

**Error: "Port 5000 already in use"**
```bash
# Kill the process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

**Error: "MongoDB connection failed"**
- Check your `.env` file has correct `MONGO_URI`
- Verify your IP is whitelisted in MongoDB Atlas

### Frontend Issues

**Error: "Port 5173 already in use"**
```bash
# Kill the process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

---

## Stop All Services

Press `Ctrl+C` in each terminal window to stop the services gracefully.

---

## Current Status

✅ All services are currently running!
- You can access the application at http://localhost:5173
- The system is ready to use

---

## System Requirements

- **Python**: 3.14+ (for damage service)
- **Node.js**: 16+ (for backend and frontend)
- **MongoDB**: Atlas connection required
- **Disk Space**: ~500MB for dependencies
- **RAM**: 2GB minimum (4GB recommended)
- **CPU**: Multi-core recommended for YOLO processing
