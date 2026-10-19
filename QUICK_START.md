# 🚀 Quick Start Commands

## All-in-One Setup (Copy & Paste)

### Windows PowerShell

```powershell
# Terminal 1: Backend
cd "c:\Users\mohak\OneDrive\Desktop\project\ai auction portal backend"
node server.js

# Terminal 2: Frontend (in new window)
cd "c:\Users\mohak\OneDrive\Desktop\project\ai-auction-frontend"
npm run dev

# Terminal 3: Test Backend (in new window)
curl http://localhost:5000/health
```

### Mac/Linux Terminal

```bash
# Terminal 1: Backend
cd ~/Desktop/project/ai\ auction\ portal\ backend
node server.js

# Terminal 2: Frontend (new tab)
cd ~/Desktop/project/ai-auction-frontend
npm run dev

# Terminal 3: Test (new tab)
curl http://localhost:5000/health
```

---

## Quick Access URLs

| Purpose            | URL                                        |
| ------------------ | ------------------------------------------ |
| **Frontend**       | http://localhost:3000                      |
| **Backend Health** | http://localhost:5000/health               |
| **Vehicles API**   | http://localhost:5000/api/vehicles         |
| **Single Vehicle** | http://localhost:5000/api/vehicles/dummy_1 |
| **User Info**      | http://localhost:5000/user                 |
| **Google Login**   | Click button in frontend navbar            |

---

## Common Commands

```bash
# Check backend is running
curl http://localhost:5000/health

# Get all vehicles
curl http://localhost:5000/api/vehicles

# Get formatted JSON (Mac/Linux)
curl http://localhost:5000/api/vehicles | jq

# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 5000 (Mac/Linux)
lsof -i :5000
kill -9 <PID>
```

---

## Backend Startup Checklist

- [ ] Terminal in backend folder
- [ ] Run `node server.js`
- [ ] See "✅ Server running on: http://localhost:5000"
- [ ] See "📡 API ENDPOINTS:" list
- [ ] No errors about port 5000 (or it's already running = good!)

## Frontend Startup Checklist

- [ ] Terminal in frontend folder
- [ ] Run `npm run dev`
- [ ] See "Local: http://localhost:3000"
- [ ] Backend is running first

## Testing Checklist

- [ ] Backend health: curl http://localhost:5000/health → Returns JSON
- [ ] Frontend loads: Open http://localhost:3000 in browser
- [ ] Vehicles appear: Navigate to Auctions → See vehicle cards
- [ ] Login works: Click "Login with Google" → Complete sign-in
- [ ] Profile shows: After login, see profile picture in navbar

---

## File Locations for Reference

```
Project Root
├── SETUP_COMPLETE.md              ← This explains everything
├── CONNECTION_TESTING_GUIDE.md    ← Detailed troubleshooting
├── QUICK_START.md                 ← You're reading this!
│
├── ai auction portal backend/
│   ├── .env                       ← Your Google credentials
│   ├── server.js                  ← Main server (fully configured)
│   ├── config/
│   │   ├── passport.js            ← OAuth strategy
│   │   └── db.js
│   ├── routes/
│   │   ├── auth.js                ← Login/logout
│   │   └── vehicleRoutes.js       ← Vehicle list + single vehicle
│   └── ...other files
│
└── ai-auction-frontend/
    ├── .env                       ← Backend URL
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   └── Navbar.tsx         ← Login/Profile UI
    │   ├── hooks/
    │   │   └── useAuth.ts         ← Auth management
    │   ├── pages/
    │   │   ├── Auctions.tsx       ← Vehicle list page
    │   │   ├── VehicleDetails.tsx ← Single vehicle + bid
    │   │   └── MyBids.tsx         ← Requires login
    │   └── ...other files
```

---

## Environment Variables (Already Configured!)

### Backend `.env`

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`

```
VITE_API_BASE_URL=http://localhost:5000
```

---

## What Each Part Does

### Backend Server (Node.js + Express)

- Listens on http://localhost:5000
- Serves vehicle data from MongoDB (or fallback dummy data)
- Handles Google OAuth login
- Manages user sessions
- Computes AI price valuations

### Frontend App (React + Vite)

- Runs on http://localhost:3000
- Fetches vehicles from backend
- Shows login/profile UI
- Allows browsing and bidding on vehicles
- Protected My Bids page

### Google OAuth Flow

1. User clicks "Login with Google"
2. Redirected to http://localhost:5000/auth/google
3. Google login page appears
4. After consent, redirected back to frontend
5. Session created, user info stored
6. Navbar shows profile picture

### Data Flow

```
Frontend Auctions.tsx
    ↓ (fetch)
http://localhost:5000/api/vehicles
    ↓ (backend route)
Connect to MongoDB
    ↓
Return vehicles with AI valuations
    ↓
Frontend receives JSON
    ↓
Display vehicle cards
```

---

## Example API Responses

### GET /api/vehicles

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
      "images": [
        {
          "url": "https://example.com/image1.jpg"
        }
      ]
    }
  ],
  "total": 4
}
```

### GET /health

```json
{
  "status": "✅ Backend is healthy",
  "timestamp": "2024-04-19T10:30:00.000Z",
  "uptime": 123.456
}
```

### GET /user (logged in)

```json
{
  "user": {
    "id": "12345",
    "displayName": "John Doe",
    "photos": [
      {
        "value": "https://lh3.googleusercontent.com/..."
      }
    ],
    "emails": [
      {
        "value": "john@gmail.com"
      }
    ]
  }
}
```

### GET /user (not logged in)

```json
{
  "user": null
}
```

---

## Keyboard Shortcuts

| Key          | Action                             |
| ------------ | ---------------------------------- |
| F12          | Open browser DevTools              |
| F5           | Refresh page                       |
| Ctrl+Shift+N | New Incognito Window (test logout) |
| Ctrl+Tab     | Switch between terminals           |

---

## Pro Tips

1. **Development Mode**: Frontend auto-refreshes when files change
2. **Console Logging**: Backend logs every request - check terminal for debugging
3. **Database Optional**: Fallback dummy data works without MongoDB
4. **CORS Verified**: No cross-origin errors expected
5. **Session Persistence**: User stays logged in until logout or terminal restart

---

## Version Info

- **Node.js**: 18+ required
- **React**: 18.x
- **Express**: 4.x
- **MongoDB**: Optional (fallback included)
- **Google OAuth 2.0**: Latest

---

## Need Help?

1. **Videos won't load**: Backend might not be running → See `SETUP_COMPLETE.md`
2. **Can't login**: Google credentials issue → Check `.env` file
3. **CORS errors**: Frontend can't reach backend → Check `CONNECTION_TESTING_GUIDE.md`
4. **Port already in use**: Kill process on port 5000 → See commands above

---

**You're all set! Run the commands and start building! 🚀**
