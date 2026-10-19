# 🔐 Google OAuth Redirect Fix - Complete Guide

## Problem Solved ✅

**Issue:** After Google OAuth login, user was redirected to `localhost:5000` instead of `localhost:3000`  
**Root Cause:** OAuth callback not redirecting to frontend, session not persisting  
**Solution:** Fixed redirect flow, added session persistence, improved logging

---

## What Was Fixed

### 1. Backend: `/auth/google/callback` Route

**File:** `ai auction portal backend/routes/auth.js`

**Changes:**

- ✅ Explicit session save after successful authentication
- ✅ Proper redirect to frontend with query parameters
- ✅ Comprehensive logging for debugging
- ✅ Error handling for session failures
- ✅ Query param `?login=success&user=email@example.com`

**Key Code:**

```javascript
router.get("/auth/google/callback",
  passport.authenticate("google", {...}),
  (req, res) => {
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        return res.redirect(`${FRONTEND_URL}/login?error=session_failed`);
      }

      // Redirect to frontend with success indicator
      const redirectUrl = `${FRONTEND_URL}/?login=success&user=${encodeURIComponent(req.user.email)}`;
      res.redirect(redirectUrl);
    });
  }
);
```

### 2. Backend: Passport Configuration

**File:** `ai auction portal backend/config/passport.js`

**Changes:**

- ✅ Fixed user serialization to JSON strings
- ✅ Fixed user deserialization from JSON
- ✅ Added detailed logging for debugging
- ✅ Proper error handling in deserialization

**Key Code:**

```javascript
// Serialize user into session
passport.serializeUser((user, done) => {
  console.log(`📦 Serializing user: ${user.email}`);
  done(null, JSON.stringify(user)); // ← Serialize as JSON string
});

// Deserialize user from session
passport.deserializeUser((userData, done) => {
  try {
    const user = typeof userData === "string" ? JSON.parse(userData) : userData;
    console.log(`🔓 Deserializing user: ${user.email}`);
    done(null, user);
  } catch (err) {
    console.error(`❌ Error deserializing:`, err);
    done(err);
  }
});
```

### 3. Frontend: Enhanced useAuth Hook

**File:** `ai-auction-frontend/src/hooks/useAuth.ts`

**Changes:**

- ✅ Handles OAuth callback redirect
- ✅ Cleans up URL parameters after redirect
- ✅ Includes `credentials: "include"` for cookies
- ✅ Better error handling
- ✅ `loginWithGoogle()` method for initiating login

**Key Features:**

```typescript
export default function useAuth() {
  // ✅ OAuth callback handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "success") {
      console.log("✅ OAuth login successful!");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ✅ Credentials included for session
  const fetchUser = async () => {
    const res = await fetch(`${BACKEND}/user`, {
      credentials: "include"  // ← Important!
    });
  };

  // ✅ Google login method
  const loginWithGoogle = () => {
    window.location.href = `${BACKEND}/auth/google`;
  };

  return { user, authenticated, loginWithGoogle, logout, ... };
}
```

### 4. Frontend: Auth Utilities

**File:** `ai-auction-frontend/src/utils/authUtils.ts` (NEW)

**Functions:**

- `checkAuth()` - Check if user is logged in
- `initiateGoogleLogin()` - Start Google OAuth flow
- `handleOAuthCallback()` - Handle redirect from OAuth
- `logout()` - Logout user
- `getCurrentUser()` - Get current user info

---

## How It Works (Step by Step)

### 1️⃣ User Clicks "Login with Google"

```typescript
// In your React component
import useAuth from '@/hooks/useAuth';

function LoginButton() {
  const { loginWithGoogle } = useAuth();

  return (
    <button onClick={loginWithGoogle}>
      Login with Google
    </button>
  );
}
```

### 2️⃣ Frontend Redirects to Backend OAuth Route

```
User clicks button
↓
Calls: window.location.href = "http://localhost:5000/auth/google"
↓
Backend: GET /auth/google
```

### 3️⃣ Backend Redirects to Google

```
Backend: passport.authenticate("google", {...})
↓
Passport redirects to Google OAuth consent screen
↓
Google URL: accounts.google.com/o/oauth2/v2/auth?...
```

### 4️⃣ User Logs In with Google

```
User: Enters email & password in Google
↓
Google: Verifies credentials
↓
Google: Generates authorization code
```

### 5️⃣ Google Redirects Back to Backend Callback

```
Google redirects to: http://localhost:5000/auth/google/callback?code=xxx
↓
Backend: Exchanges code for access token
↓
Backend: Fetches user profile from Google
↓
Passport: Verifies profile and creates user object
```

### 6️⃣ Backend Saves Session

```
Backend: Serializes user to session
↓
Session: Stored in MemoryStore with session ID
↓
Cookie: Set with session ID (connect.sid)
```

### 7️⃣ Backend Redirects to Frontend

```
Backend: res.redirect("http://localhost:3000/?login=success&user=email%40example.com")
↓
Browser: Navigates to frontend with redirect
↓
Cookie: Included in request (credentials: "include")
```

### 8️⃣ Frontend Handles Redirect

```
Frontend: Detects ?login=success in URL
↓
useAuth Hook: Calls checkAuth()
↓
Backend: GET /user (with credentials)
↓
Backend: Deserializes session and returns user
↓
Frontend: Sets user state
```

### 9️⃣ User Stays Logged In

```
Page reload or new page load:
↓
useAuth Hook: Calls checkAuth()
↓
Backend: Finds session cookie in request
↓
Backend: Deserializes session and returns user
↓
Frontend: User already logged in!
```

---

## Testing the Fix

### 1. Start Backend

```bash
cd "ai auction portal backend"
node server.js
```

**Expected output:**

```
✅ Passport: Google OAuth Strategy configured
   📍 Callback URL: http://localhost:5000/auth/google/callback
```

### 2. Start Frontend

```bash
cd ai-auction-frontend
npm run dev
```

### 3. Test Login Flow

**In browser console:**

```javascript
// Check initial state
// Should show: "No user in session"

// Click "Login with Google"
// Should see:
// 🔐 [OAuth] User initiated Google login
// 🔐 [OAuth] Received callback from Google
// ✅ [OAuth] Authentication successful!
// ✅ [Session] Session saved successfully
// 🚀 [OAuth] Redirecting to: http://localhost:3000/?login=success&user=...
```

### 4. Verify Session Persists

**After OAuth redirect:**

```javascript
// In browser console, check Network tab
// Should see: Cookie header with "connect.sid=..."

// Refresh page (Ctrl+R)
// User should still be logged in!
// Should see: ✅ [User] User found in session
```

---

## Logging Output

### Backend Console (Server Logs)

**On OAuth Login:**

```
🔐 [OAuth] User initiated Google login
🔐 [OAuth] Received callback from Google
  ℹ️ Session ID: abc123def456

🔐 [Passport] Google Strategy Verification Callback
  📧 Email: user@example.com
  👤 Name: John Doe
  🆔 Google ID: 123456789...
  ✅ User object created: {"googleId":"...","name":"John Doe","email":"user@example.com","photo":"..."}

📦 [Passport] Serializing user: user@example.com

✅ [OAuth] Authentication successful!
  ℹ️ Session ID: abc123def456
  👤 User: user@example.com
  🔍 req.user object: {...}

✅ [Session] Session saved successfully
  ℹ️ Session cookies: connect.sid=abc123def456

🚀 [OAuth] Redirecting to: http://localhost:3000/?login=success&user=user%40example.com
```

**On Frontend Check User:**

```
📋 [User] Fetching user info
  ℹ️ Session ID: abc123def456
  ℹ️ Authenticated: true
  ℹ️ User object: {...}

🔓 [Passport] Deserializing user: user@example.com

✅ [User] User found in session
```

### Frontend Console (Browser)

**On OAuth Redirect:**

```
✅ [Auth] OAuth callback handled: user@example.com
🔍 [useAuth] Initializing authentication check...
✅ [Auth] Auth check complete - Authenticated: true
👤 [Auth] User: user@example.com
✅ [useAuth] Auth check complete - User: user@example.com
```

---

## API Endpoints

### GET /auth/google

Initiates Google OAuth login

**Usage:**

```javascript
window.location.href = "http://localhost:5000/auth/google";
```

### GET /auth/google/callback

Handles OAuth callback (automatic)

**Response on success:**

```
Redirect to: http://localhost:3000/?login=success&user=email%40example.com
```

### GET /user

Get current user from session

**Request:**

```bash
curl http://localhost:5000/user \
  -H "Cookie: connect.sid=xxx"
```

**Response:**

```json
{
  "user": {
    "googleId": "123456789",
    "name": "John Doe",
    "email": "user@example.com",
    "photo": "https://..."
  },
  "authenticated": true
}
```

### GET /logout

Logout current user

**Usage:**

```javascript
await fetch("http://localhost:5000/logout", {
  credentials: "include",
});
```

---

## Environment Variables

Verify your `.env` file has these set:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000

# Session
SESSION_SECRET=your_secret_here
```

---

## Frontend Usage Example

### In Your Login Component

```typescript
import useAuth from '@/hooks/useAuth';

function LoginPage() {
  const { user, loading, authenticated, loginWithGoogle, logout } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (authenticated && user) {
    return (
      <div>
        <h1>Welcome, {user.name}!</h1>
        <p>Email: {user.email}</p>
        {user.photo && <img src={user.photo} alt="Profile" />}
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Login Required</h1>
      <button onClick={loginWithGoogle}>
        Login with Google
      </button>
    </div>
  );
}
```

### In Your Navbar Component

```typescript
import useAuth from '@/hooks/useAuth';

function Navbar() {
  const { user, authenticated, loginWithGoogle, logout } = useAuth();

  return (
    <nav>
      {authenticated && user ? (
        <div>
          <span>Welcome, {user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={loginWithGoogle}>
          Login with Google
        </button>
      )}
    </nav>
  );
}
```

---

## Troubleshooting

### Issue: Still redirecting to localhost:5000

**Solution:**

1. Restart backend server
2. Check `FRONTEND_URL` in .env (should be `http://localhost:3000`)
3. Check auth.js redirect URL is using `FRONTEND_URL`

### Issue: User not persisting after page reload

**Solution:**

1. Verify browser has cookies enabled
2. Check Network tab for `connect.sid` cookie
3. Ensure `credentials: "include"` is in fetch calls
4. Restart backend to reset sessions

### Issue: OAuth popup closes but nothing happens

**Solution:**

1. Check browser console for errors
2. Check backend console logs
3. Verify Google OAuth credentials are correct
4. Check callback URL matches in .env

### Issue: 403 Forbidden on /user endpoint

**Solution:**

1. Ensure CORS is properly configured (credentials: true)
2. Check browser sending cookies
3. Verify session middleware is before auth routes

---

## Files Modified

```
✅ ai auction portal backend/routes/auth.js
   - Fixed OAuth callback redirect
   - Added session.save()
   - Added logging
   - Added query parameters

✅ ai auction portal backend/config/passport.js
   - Fixed serialization
   - Fixed deserialization
   - Added logging

✅ ai-auction-frontend/src/hooks/useAuth.ts
   - Added OAuth callback handling
   - Added loginWithGoogle()
   - Added credentials to fetch
   - Better error handling
   - Comprehensive logging

✅ ai-auction-frontend/src/utils/authUtils.ts (NEW)
   - Auth utility functions
   - OAuth callback handler
   - User management functions
```

---

## Success Indicators ✅

After implementing these fixes, you should see:

- ✅ Browser redirects to frontend after Google login
- ✅ URL includes `?login=success&user=...`
- ✅ User stays logged in after page reload
- ✅ Logout clears session properly
- ✅ Backend logs show session save/deserialize
- ✅ No CORS errors in browser console
- ✅ Session cookie (`connect.sid`) present in Network tab

---

## Quick Reference

| Task               | Command/Code                                       |
| ------------------ | -------------------------------------------------- |
| Start backend      | `cd "ai auction portal backend" && node server.js` |
| Start frontend     | `cd ai-auction-frontend && npm run dev`            |
| Check if logged in | `useAuth()` hook in component                      |
| Login with Google  | `loginWithGoogle()` from useAuth                   |
| Logout             | `logout()` from useAuth                            |
| Get user info      | `user` from useAuth                                |

---

**Your OAuth flow is now complete and session persists! 🎉**
