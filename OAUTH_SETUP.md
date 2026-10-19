# Google OAuth 2.0 Login System - Complete Setup Guide

## Overview

This guide walks you through setting up Google OAuth login for your AI Vehicle Auction app. Users can:

- Login with Google in the navbar
- See their profile picture and name after login
- Logout
- Place bids (requires login)
- Access "My Bids" (requires login)

---

## Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **"Credentials"** in the left sidebar
4. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Choose **"Web application"**
6. Add these Authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback`
   - `http://localhost:3000` (frontend)
7. Copy your **Client ID** and **Client Secret**

---

## Step 2: Backend Setup

### 2.1 Create `.env` file

In the `ai auction portal backend/` folder, create a `.env` file:

```bash
cd "ai auction portal backend"
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=mysupersecretkeychange_this_in_production_use_random_string
MONGODB_URI=mongodb://localhost:27017/ai-auction
PORT=5000
```

### 2.2 Install Dependencies

```bash
cd "ai auction portal backend"
npm install passport passport-google-oauth20 express-session memorystore
```

### 2.3 Start Backend

```bash
cd "ai auction portal backend"
node server.js
```

You should see:

```
Server running on port 5000
MongoDB Connected
```

---

## Step 3: Frontend Setup

### 3.1 Create `.env` file

In `ai-auction-frontend/` folder, create `.env`:

```bash
cd ai-auction-frontend
cp .env.example .env
```

Contents:

```
VITE_BACKEND_URL=http://localhost:5000
```

### 3.2 Install Dependencies (if not done)

```bash
cd ai-auction-frontend
npm install
```

### 3.3 Start Frontend

```bash
npm run dev
```

You should see:

```
VITE ready in 234 ms
Local:  http://localhost:5000
```

Visit `http://localhost:3000` in your browser (or the port shown).

---

## Step 4: Test the Complete Flow

### 4.1 Login Flow

1. **Open the app** → `http://localhost:3000` (or your frontend URL)
2. Look at the **top-right navbar**
3. Click **"Login with Google"** button
4. Complete Google sign-in
5. Browser redirects back to app
6. **Navbar now shows:**
   - Your Google profile picture
   - Your name
   - A dropdown with "Logout"

### 4.2 Try Protected Features

#### Place a Bid (Requires Login)

1. Click on any vehicle card to view details
2. Scroll to "Place Secure Bid" button
3. **If logged in:** Bid modal opens
4. **If NOT logged in:** Redirects to Google login

#### View My Bids (Requires Login)

1. Click "My Bids" in navbar
2. **If logged in:** Shows your bid history
3. **If NOT logged in:** Redirects to Google login

#### Logout

1. Click your profile picture (top-right)
2. Click "Logout" in dropdown
3. Navbar now shows "Login with Google" button again

---

## Step 5: Production Deployment

When deploying to production:

### Backend `.env` changes:

```
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
FRONTEND_URL=https://your-domain.com
SESSION_SECRET=generate_a_very_long_random_string_here
```

### Session Cookie Security

Edit `server.js` line 24-30:

```javascript
const sessionMiddleware = session({
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true, // ✅ Set to true for HTTPS
    sameSite: "strict", // ✅ Add this
  },
  store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET,
});
```

### Use a Persistent Session Store

Replace MemoryStore with Redis or MongoDB for production:

```bash
npm install connect-redis redis
```

---

## API Endpoints Reference

| Endpoint                | Method | Purpose                    | Auth Required? |
| ----------------------- | ------ | -------------------------- | -------------- |
| `/auth/google`          | GET    | Start Google login         | No             |
| `/auth/google/callback` | GET    | Google callback            | No             |
| `/user`                 | GET    | Get logged-in user         | No             |
| `/logout`               | GET    | Logout and destroy session | No             |
| `/api/bids`             | POST   | Place a bid                | **YES** ✅     |
| `/api/vehicles`         | GET    | Get vehicles               | No             |

---

## Troubleshooting

### Issue: "Redirect URI mismatch" error

**Solution:** Ensure `GOOGLE_CALLBACK_URL` in `.env` matches exactly with Google Cloud Console Authorized URIs.

### Issue: Profile picture not loading

**Solution:** Google may not return a photo if privacy settings restrict it. Fallback icon is shown.

### Issue: Session not persisting after refresh

**Solution:** Make sure cookies are enabled in your browser. Clear cookies and try again.

### Issue: CORS error when calling `/user`

**Solution:** Backend should have `credentials: true` in CORS config (already set in server.js).

### Issue: "Cannot read properties of undefined (reading 'toLocaleString')"

**Solution:** This was an earlier issue, now fixed. Make sure you're using the latest code from VehicleDetails.tsx.

---

## File Structure

```
ai auction portal backend/
├── config/
│   ├── passport.js          ← Google OAuth strategy
│   └── db.js
├── middleware/
│   └── requireAuth.js       ← Auth middleware for protected routes
├── routes/
│   ├── auth.js              ← Login/logout endpoints
│   ├── bidRoutes.js         ← Protected with requireAuth
│   └── ...
├── server.js                ← Main server (sessions, passport setup)
└── .env                     ← Your secrets (DO NOT commit)

ai-auction-frontend/
├── src/
│   ├── hooks/
│   │   └── useAuth.ts       ← Fetch /user, logout, reload
│   ├── components/
│   │   └── Navbar.tsx       ← Login button & profile display
│   └── pages/
│       ├── VehicleDetails.tsx  ← AuthAwareBidButton
│       └── MyBids.tsx          ← Requires login
└── .env                     ← VITE_BACKEND_URL
```

---

## Code Summary

### Backend: Session + Passport Flow

1. User clicks "Login with Google" → calls `GET /auth/google`
2. Passport redirects to Google OAuth consent screen
3. User approves → Google calls `GET /auth/google/callback`
4. Passport receives profile → calls `serializeUser` to store in session
5. Session cookie sent to browser
6. Frontend calls `GET /user` → returns session user or null
7. On logout → `GET /logout` destroys session and clears cookie

### Frontend: Auth Hook + Protected Components

1. `useAuth()` hook fetches `/user` on app load
2. Sets `user` state (logged-in user or null)
3. Navbar conditionally shows login button or profile
4. VehicleDetails & MyBids check `useAuth()` and redirect if not logged in
5. After logout, hook refetches and clears user

---

## Quick Command Reference

**Backend:**

```bash
cd "ai auction portal backend"
npm install passport passport-google-oauth20 express-session memorystore
npm start  # or: node server.js
```

**Frontend:**

```bash
cd ai-auction-frontend
npm install
npm run dev
```

**Both running?**

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000` (or shown in terminal)

---

## Next Steps (Optional Enhancements)

- [ ] Add user profile page (`/profile`)
- [ ] Store user info in database (currently only in session)
- [ ] Add refresh token rotation for extra security
- [ ] Use Redis for persistent sessions
- [ ] Add email verification
- [ ] Add user roles/permissions (e.g., admin, moderator)

---

## Support

If you run into issues:

1. Check `.env` credentials
2. Verify backend is running on `:5000`
3. Verify frontend is running on `:3000`
4. Check browser console for errors
5. Ensure MongoDB is running (if using)
6. Restart both servers after changing `.env`

---

✅ **Your Google OAuth system is now complete and ready to use!**
