# 🏗️ System Architecture

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI CAR AUCTION PORTAL                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐              ┌──────────────────────┐     │
│  │   FRONTEND (React)   │              │   BACKEND (Node.js)  │     │
│  │   localhost:3000     │              │   localhost:5000     │     │
│  │                      │              │                      │     │
│  │  Components:         │◄────HTTP────►│  Express Server      │     │
│  │  ├─ Navbar           │   CORS ✅    │  ├─ Auth Routes     │     │
│  │  ├─ Home             │  Cookies 🍪  │  ├─ Vehicle Routes  │     │
│  │  ├─ Auctions         │              │  ├─ Bid Routes      │     │
│  │  ├─ VehicleDetails   │              │  └─ Health Endpoint │     │
│  │  ├─ MyBids           │              │                      │     │
│  │  └─ Filters          │              │  Middleware:        │     │
│  │                      │              │  ├─ Session Mgmt    │     │
│  │  Hooks:              │              │  ├─ Passport Auth   │     │
│  │  └─ useAuth()        │              │  └─ Error Handler   │     │
│  │                      │              │                      │     │
│  └──────────────────────┘              └──────────────────────┘     │
│         │                                       │                    │
│         └──────────────┬───────────────────────┘                    │
│                        │                                             │
│                   ┌────▼─────────────────┐                         │
│                   │  API Endpoints:      │                         │
│                   ├─────────────────────┤                         │
│                   │  GET  /              │ ← Test                │
│                   │  GET  /health        │ ← Health Check        │
│                   │  GET  /user          │ ← Session User        │
│                   │  GET  /auth/google   │ ← Start Login         │
│                   │  GET  /auth/google/  │ ← OAuth Callback      │
│                   │       callback       │                        │
│                   │  GET  /logout        │ ← End Session         │
│                   │  GET  /api/vehicles  │ ← List Vehicles       │
│                   │  GET  /api/vehicles/:id │ ← Single Vehicle  │
│                   │  POST /api/bids      │ ← Place Bid (Auth)   │
│                   └────────────────────┘                         │
│                        │                                             │
│         ┌──────────────┼──────────────┬────────────┐               │
│         │              │              │            │               │
│    ┌────▼───┐   ┌──────▼────┐  ┌─────▼──┐  ┌─────▼──┐           │
│    │ Google │   │ MongoDB   │  │   ML   │  │Session │           │
│    │ OAuth  │   │ Database  │  │Service │  │ Store  │           │
│    │        │   │           │  │        │  │        │           │
│    │ ✅ ENV │   │ Optional  │  │Python  │  │Memory  │           │
│    │Var Set │   │ + Fallback│  │Flask   │  │Store   │           │
│    └────────┘   │ Dummy Data│  │:5001   │  │✅ Ready│           │
│                 │ ✅ Ready  │  │        │  └────────┘           │
│                 └───────────┘  └────────┘                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow: Browsing Vehicles

```
1. User opens http://localhost:3000
   │
   ├─ Frontend loads React app (Vite)
   │
   ├─ Auctions.tsx component mounts
   │
   ├─ Component calls: axios.get("http://localhost:5000/api/vehicles")
   │
   ├─ Request crosses CORS boundary (✅ Allowed)
   │
   ├─ Backend receives GET /api/vehicles
   │  ├─ Logs: "📨 GET /api/vehicles request received"
   │  │
   │  ├─ Tries MongoDB query
   │  │  ├─ If successful: Returns database vehicles
   │  │  └─ If failed: Uses DUMMY_VEHICLES fallback
   │  │
   │  ├─ For each vehicle:
   │  │  ├─ Calls ML service for price prediction
   │  │  ├─ If ML fails: Uses default price
   │  │  └─ Computes valuations (insurance, residual, etc.)
   │  │
   │  └─ Logs: "📤 Returning X vehicles to frontend"
   │
   ├─ Frontend receives JSON response
   │
   ├─ Auctions.tsx renders VehicleCard components
   │
   └─ User sees 4 vehicle cards on screen ✅
```

---

## Request Flow: Google Login

```
1. User clicks "Login with Google" button
   │
   ├─ Navbar component calls: window.location.href = "/auth/google"
   │
   ├─ Request to http://localhost:5000/auth/google
   │
   ├─ Backend receives GET /auth/google
   │  ├─ Calls passport.authenticate("google", {...scopes})
   │  └─ Redirects to Google OAuth consent screen
   │
   ├─ User completes Google sign-in
   │  ├─ Grants permission to app
   │  └─ Google redirects to /auth/google/callback
   │
   ├─ Backend receives GET /auth/google/callback?code=...
   │  ├─ Passport exchanges code for tokens
   │  ├─ Fetches user profile from Google
   │  ├─ Calls passport.serializeUser() to store in session
   │  └─ Redirects back to http://localhost:3000
   │
   ├─ Frontend loads (user still on home page)
   │
   ├─ Navbar component calls useAuth()
   │  ├─ Fetches GET http://localhost:5000/user
   │  ├─ Backend returns user profile from session
   │  └─ Navbar sees user object
   │
   ├─ Navbar re-renders
   │  ├─ Hides "Login with Google" button
   │  ├─ Shows profile picture and name
   │  └─ Shows logout dropdown
   │
   └─ User is logged in ✅
```

---

## Request Flow: Placing a Bid

```
1. User views VehicleDetails page
   │
   ├─ Clicks "Place Secure Bid" button
   │
   ├─ AuthAwareBidButton checks:
   │  ├─ Calls useAuth() to check if logged in
   │  ├─ If NOT logged in:
   │  │  └─ Redirects to http://localhost:5000/auth/google
   │  └─ If logged in:
   │     └─ Opens BidModal
   │
   ├─ User enters bid amount in modal
   │
   ├─ Clicks "Place Bid"
   │  │
   │  ├─ Frontend calls: POST /api/bids
   │  │  ├─ With credentials: include (sends session cookie)
   │  │  └─ Body: { vehicleId, amount, bidderId }
   │  │
   │  ├─ Backend receives POST /api/bids
   │  │  ├─ Middleware requireAuth checks session
   │  │  ├─ If NOT authenticated: Returns 401 Unauthorized
   │  │  ├─ If authenticated:
   │  │  │  ├─ Saves bid to MongoDB
   │  │  │  ├─ Returns success response
   │  │  │  └─ Logs bid placement
   │  │  │
   │  │  └─ Sends JSON response
   │  │
   │  └─ Frontend closes modal
   │
   └─ Bid placed successfully ✅
```

---

## Request Flow: Viewing My Bids (Protected Route)

```
1. User clicks "My Bids" in sidebar
   │
   ├─ MyBids.tsx component mounts
   │
   ├─ Component calls useAuth()
   │  ├─ Fetches GET /user from backend
   │  ├─ Backend checks session cookie
   │  │  ├─ If valid session: Returns user object
   │  │  └─ If no session: Returns { user: null }
   │  │
   │  ├─ Frontend receives response
   │  └─ Sets user state
   │
   ├─ Component checks: if (!user) {...}
   │  ├─ If user is null (not logged in)
   │  │  └─ Renders: <Navigate to="/auth/google" />
   │  │
   │  └─ If user exists (logged in)
   │     ├─ Fetches bids from backend
   │     ├─ Renders bid cards
   │     └─ User sees their bids ✅
   │
   └─ If redirected to Google login:
      ├─ User completes sign-in
      └─ Session created, returns to My Bids
```

---

## Data Structure: Vehicle Object

```javascript
{
  // Database fields
  "_id": "ObjectId",
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

  // Computed fields (added by backend)
  "marketPrice": 850000,           // From ML prediction
  "insuranceValue": 85000,         // 10% of market price
  "baseValue": 680000,             // 80% of market price
  "residualValue": 510000,         // 60% of market price
  "distressValue": 425000,         // 50% of market price
  "salvageValue": 212500,          // 25% of market price

  // Media
  "images": [
    {
      "url": "https://example.com/image.jpg"
    }
  ]
}
```

---

## Data Structure: Session User Object

```javascript
{
  "id": "google_oauth_id",
  "displayName": "John Doe",
  "name": {
    "familyName": "Doe",
    "givenName": "John"
  },
  "emails": [
    {
      "value": "john@gmail.com",
      "verified": true
    }
  ],
  "photos": [
    {
      "value": "https://lh3.googleusercontent.com/..."
    }
  ],
  "provider": "google"
}
```

---

## Data Structure: Bid Object

```javascript
{
  "_id": "ObjectId",
  "vehicleId": "vehicle_id_string",
  "bidderId": "user_id_string",
  "bidAmount": 900000,
  "bidDate": "2024-04-19T10:30:00.000Z",
  "status": "active",  // or "won", "outbid"
  "bidderName": "John Doe",
  "bidderEmail": "john@gmail.com",
  "bidderPhoto": "https://lh3.googleusercontent.com/..."
}
```

---

## Component Hierarchy

```
App
├─ Router
│  └─ Routes
│     ├─ Route: /
│     │  └─ Home
│     │     └─ Hero
│     │
│     ├─ Route: /auctions
│     │  └─ Auctions
│     │     ├─ Navbar
│     │     ├─ Filters
│     │     └─ VehicleCard (×N)
│     │        └─ onClick: navigate to VehicleDetails
│     │
│     ├─ Route: /vehicle/:id
│     │  └─ VehicleDetails
│     │     ├─ Navbar
│     │     ├─ Vehicle image & details
│     │     ├─ Valuation breakdown
│     │     └─ AuthAwareBidButton
│     │        └─ BidModal
│     │
│     ├─ Route: /my-bids
│     │  └─ MyBids (protected)
│     │     ├─ Navbar
│     │     └─ BidCard (×N)
│     │
│     ├─ Route: /profile
│     │  └─ Profile (protected)
│     │
│     └─ Route: /add-vehicle
│        └─ AddVehicle (protected)
│
└─ Navbar (all pages)
   ├─ Logo
   ├─ Navigation links
   ├─ Search
   └─ Auth section
      ├─ "Login with Google" button (if not logged in)
      └─ Profile dropdown (if logged in)
         ├─ Profile picture
         ├─ Name
         └─ Logout
```

---

## Session Management Flow

```
Session Creation (after Google login):
│
├─ Backend generates session ID
│  └─ Stores in MemoryStore
│
├─ Session ID sent in Set-Cookie header
│  └─ Cookie: connect.sid=abc123...
│
├─ Browser stores cookie automatically
│
└─ Subsequent requests include cookie
   └─ Backend retrieves session user from cookie

Session Persistence:
│
├─ User visits different pages
│
├─ Each request includes cookie
│
├─ Backend can access: req.user (from deserialization)
│
└─ User stays logged in ✅

Session Termination (logout):
│
├─ User clicks "Logout"
│
├─ Frontend calls: GET /logout
│
├─ Backend destroys session
│
├─ Cookie deleted
│
└─ User logged out ✅
```

---

## Error Handling Strategy

```
Frontend Error:
├─ fetch() fails
├─ Catch in try-catch
├─ Show user-friendly message
└─ Fallback to empty state or retry

Backend Database Error:
├─ MongoDB connection fails
├─ Catch in try-catch
├─ Log error to console
├─ Return DUMMY_VEHICLES fallback
└─ User still sees 4 vehicles ✅

Backend ML Service Error:
├─ Flask service unavailable
├─ Catch in try-catch
├─ Use default price prediction
├─ Continue processing
└─ Vehicle returned with fallback price ✅

Backend Auth Error:
├─ User not authenticated
├─ Return 401 Unauthorized
├─ Frontend receives error
├─ Redirects to Google login
└─ User redirected to consent screen ✅

CORS Error:
├─ Frontend tries to access backend
├─ CORS policy blocks it
├─ Check backend has correct origin
├─ Restart backend if needed
└─ Request succeeds ✅
```

---

## Port Configuration

```
Frontend:    localhost:3000   (Vite dev server)
Backend:     localhost:5000   (Express server)
ML Service:  127.0.0.1:5001   (Python Flask)
MongoDB:     localhost:27017  (Optional)
```

---

## Environment Variable Dependencies

```
Backend needs:
├─ GOOGLE_CLIENT_ID         ✅ Set
├─ GOOGLE_CLIENT_SECRET     ✅ Set
├─ GOOGLE_CALLBACK_URL      ✅ Set
├─ SESSION_SECRET           ✅ Set
├─ FRONTEND_URL             ✅ Set
└─ MONGODB_URI              (Optional)

Frontend needs:
└─ VITE_API_BASE_URL        ✅ Set to http://localhost:5000
```

---

## Complete Feature Map

```
✅ User Authentication
   ├─ Google OAuth 2.0 login
   ├─ Session management
   ├─ Auto-login on page refresh
   └─ Logout functionality

✅ Vehicle Browsing
   ├─ List all vehicles
   ├─ Search vehicles
   ├─ Filter by price/year/brand
   ├─ View single vehicle details
   └─ See AI valuations

✅ Bidding System
   ├─ Place bid (requires login)
   ├─ Bid history (requires login)
   ├─ Bid status tracking
   └─ Real-time bid updates (ready for enhancement)

✅ AI Features
   ├─ Price prediction (via ML service)
   ├─ Valuation breakdown
   └─ Insurance value calculation

✅ Reliability
   ├─ CORS properly configured
   ├─ Error handling with fallbacks
   ├─ Fallback dummy data
   ├─ Comprehensive logging
   └─ Session persistence
```

---

## You Are Here ✅

```
┌──────────────────────────────────────────┐
│  IMPLEMENTATION COMPLETE                 │
│                                          │
│  ✅ Backend fully configured             │
│  ✅ Frontend fully configured            │
│  ✅ OAuth credentials set up             │
│  ✅ CORS enabled                         │
│  ✅ Session management ready             │
│  ✅ Error handling in place              │
│  ✅ Fallback data available              │
│                                          │
│  👉 NEXT: Start servers and test!      │
│                                          │
│  Terminal 1: node server.js             │
│  Terminal 2: npm run dev                │
│  Terminal 3: open http://localhost:3000 │
└──────────────────────────────────────────┘
```
