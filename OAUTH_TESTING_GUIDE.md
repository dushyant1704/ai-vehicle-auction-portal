# ✅ OAuth Fix - Quick Checklist & Testing

## Pre-Implementation Checklist

- [ ] Backend running on `http://localhost:5000`
- [ ] Frontend running on `http://localhost:3000` or `5173`
- [ ] `.env` file has Google OAuth credentials
- [ ] MongoDB connection is working
- [ ] No errors in backend console on startup

---

## Implementation Checklist

### Backend Files ✅

- [x] **auth.js** - Updated with:
  - OAuth callback route
  - Session save after authentication
  - Redirect to frontend with query params
  - Comprehensive logging

- [x] **passport.js** - Updated with:
  - User serialization to JSON
  - User deserialization from JSON
  - Detailed logging
  - Error handling

### Frontend Files ✅

- [x] **useAuth.ts** hook - Updated with:
  - OAuth callback handling
  - `loginWithGoogle()` method
  - `credentials: "include"` in fetch
  - Comprehensive logging

- [x] **authUtils.ts** - New file with:
  - Auth utilities
  - OAuth handlers
  - User management

---

## Testing Procedure

### Step 1: Start Backend

```bash
cd "ai auction portal backend"
npm start  # or: node server.js
```

**Verify in console:**

```
✅ Passport: Google OAuth Strategy configured
   📍 Callback URL: http://localhost:5000/auth/google/callback
✅ Express Session configured
✅ All routes mounted
🎯 Server running on: http://localhost:5000
```

### Step 2: Start Frontend

```bash
cd ai-auction-frontend
npm run dev
```

**Verify in browser:**

- No CORS errors in console
- Page loads without errors

### Step 3: Test OAuth Login

**Open browser DevTools (F12)**

1. **Click "Login with Google" button**
   - Should see: `🔐 [useAuth] Initiating Google login...`
   - Should redirect to Google OAuth page

2. **Login with test Google account**
   - Enter email
   - Enter password
   - Grant permissions

3. **Check browser console after redirect**

   ```
   ✅ [OAuth] OAuth callback handled: user@example.com
   ✅ [Auth] Auth check complete - Authenticated: true
   👤 [Auth] User: user@example.com
   ```

4. **Check backend console**
   ```
   🔐 [OAuth] User initiated Google login
   🔐 [OAuth] Received callback from Google
   ✅ [OAuth] Authentication successful!
   ✅ [Session] Session saved successfully
   🚀 [OAuth] Redirecting to: http://localhost:3000/?login=success&user=...
   ```

### Step 4: Verify Session Persistence

**Refresh page (Ctrl+R or Cmd+R)**

- User should still be logged in
- No "Login with Google" button visible
- User profile should show

**Browser console should show:**

```
✅ [useAuth] User fetched: user@example.com
✅ [useAuth] Auth check complete - User: user@example.com
```

### Step 5: Test Logout

**Click "Logout" button**

- User should be logged out
- Should return to login page
- Backend should log: `✅ [Logout] Session destroyed successfully`

---

## Network Tab Inspection

### 1. OAuth Callback Request

**URL:** `GET http://localhost:5000/auth/google/callback?code=...&state=...`

**Response:**

- Status: `302 Found`
- Location header: `http://localhost:3000/?login=success&user=...`
- Set-Cookie: `connect.sid=...`

### 2. User Check Request

**URL:** `GET http://localhost:5000/user`

**Headers:**

```
Cookie: connect.sid=...
```

**Response:**

```json
{
  "user": {
    "googleId": "...",
    "name": "John Doe",
    "email": "user@example.com",
    "photo": "..."
  },
  "authenticated": true
}
```

---

## Console Logs to Expect

### Backend Startup

```
✅ Passport: Google OAuth Strategy configured
   📍 Callback URL: http://localhost:5000/auth/google/callback
   🌐 Client ID: 1002382879422-42jee...
✅ Express Session configured with MemoryStore
✅ Passport initialized
✅ All routes mounted
🎯 Server running on: http://localhost:5000
```

### OAuth Login Flow

```
🔐 [OAuth] User initiated Google login
🔐 [OAuth] Received callback from Google
  ℹ️ Session ID: abc123def456

🔐 [Passport] Google Strategy Verification Callback
  📧 Email: user@example.com
  👤 Name: John Doe
  🆔 Google ID: 123456789...
  ✅ User object created: {...}

📦 [Passport] Serializing user: user@example.com

✅ [OAuth] Authentication successful!
  ℹ️ Session ID: abc123def456
  👤 User: user@example.com

✅ [Session] Session saved successfully
🚀 [OAuth] Redirecting to: http://localhost:3000/?login=success&user=user%40example.com
```

### User Check

```
📋 [User] Fetching user info
  ℹ️ Session ID: abc123def456
  ℹ️ Authenticated: true

🔓 [Passport] Deserializing user: user@example.com

✅ [User] User found in session
```

---

## Common Issues & Solutions

### ❌ Issue: Redirect to localhost:5000 instead of 3000

**Cause:** `FRONTEND_URL` not set or not used in redirect

**Check:**

```bash
# In .env
FRONTEND_URL=http://localhost:3000

# In auth.js, check redirect uses FRONTEND_URL
```

**Fix:**

```bash
# Restart backend
node server.js
```

---

### ❌ Issue: User not persistent after reload

**Cause:** Session not being saved or cookie not sent

**Check:**

1. Network tab → Cookies
   - Should see: `connect.sid=...`
2. Browser console
   - Should see: `✅ [Session] Session saved successfully`

**Fix:**

1. Clear browser cookies
2. Logout and login again
3. Check backend logs for session errors

---

### ❌ Issue: "User not found" after redirect

**Cause:** Session deserialization failed

**Fix:**

1. Check backend logs for deserialization errors
2. Restart backend
3. Try login again

**Backend console should show:**

```
🔓 [Passport] Deserializing user: user@example.com
✅ [User] User found in session
```

---

### ❌ Issue: CORS error in browser

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Cause:** `credentials: "include"` not set, or CORS not configured

**Fix:**

1. Verify CORS in server.js has `credentials: true`
2. Verify useAuth uses `credentials: "include"`
3. Restart both servers

---

### ❌ Issue: Google OAuth not starting

**Cause:** Wrong callback URL or credentials

**Fix:**

1. Check Google Cloud Console
   - OAuth redirect URI matches: `http://localhost:5000/auth/google/callback`
   - Client ID and Secret are correct
2. Check .env file
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
   ```
3. Restart backend

---

## Verification Points

| Point            | Expected          | Check              |
| ---------------- | ----------------- | ------------------ |
| Backend starts   | No errors         | `node server.js`   |
| Frontend loads   | No errors         | Browser console    |
| OAuth page loads | Google login page | Click OAuth button |
| Redirect happens | Goes to frontend  | Check URL          |
| User persists    | Still logged in   | Refresh page       |
| Logout works     | Clears session    | Click logout       |

---

## Debug Mode

To see detailed logs, add this to server.js:

```javascript
// Enable detailed logging
app.use((req, res, next) => {
  console.log(`\n📍 ${req.method} ${req.path}`);
  console.log(`  🔍 Session: ${req.sessionID}`);
  console.log(`  👤 User: ${req.user?.email || "None"}`);
  next();
});
```

---

## Quick Verify Script

Run this in browser console to verify auth:

```javascript
// Check if logged in
fetch("http://localhost:5000/user", { credentials: "include" })
  .then((r) => r.json())
  .then((d) => {
    console.log("User:", d.user);
    console.log("Authenticated:", d.authenticated);
  });

// Check session cookies
console.log("Cookies:", document.cookie);

// Check request headers
fetch("http://localhost:5000/user", {
  credentials: "include",
  headers: { "X-Debug": "true" },
});
```

---

## Success Criteria

✅ All of these should be true:

- Backend starts with no errors
- Frontend loads with no CORS errors
- Google OAuth page opens when clicking login
- After login, redirects to `http://localhost:3000/?login=success&user=...`
- User stays logged in after page refresh
- Backend logs show session save and deserialize
- Logout clears session and user
- No errors in console

---

## Final Verification

**Run this checklist after implementing:**

```
[ ] Backend starts: node server.js
[ ] Frontend starts: npm run dev
[ ] No errors in console
[ ] OAuth button visible
[ ] Google login works
[ ] Redirects to frontend
[ ] User logged in
[ ] Page refresh keeps user
[ ] Logout works
[ ] User clears after logout
[ ] Login again works
```

✅ **If all checked:** OAuth flow is working! 🎉

---

**Ready to test?**

1. Restart backend: `node server.js`
2. Restart frontend: `npm run dev`
3. Open browser to `http://localhost:3000`
4. Click "Login with Google"
5. Check console logs
6. Verify redirect and persistence
