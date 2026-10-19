/**
 * OAuth and Authentication Utilities
 * Handles Google OAuth login flow and session management
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface User {
  googleId: string;
  name: string;
  email: string;
  photo?: string;
}

export interface AuthResponse {
  user: User | null;
  authenticated: boolean;
}

/**
 * Check if user is currently logged in
 * Fetches user info from backend session
 */
export async function checkAuth(): Promise<AuthResponse> {
  try {
    console.log("🔍 [Auth] Checking authentication status...");

    const response = await fetch(`${API_URL}/user`, {
      method: "GET",
      credentials: "include", // Include cookies for session
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ [Auth] Server returned ${response.status}`);
      return { user: null, authenticated: false };
    }

    const data = (await response.json()) as AuthResponse;
    console.log(
      `✅ [Auth] Auth check complete - Authenticated: ${data.authenticated}`,
    );

    if (data.user) {
      console.log(`👤 [Auth] User: ${data.user.email}`);
    }

    return data;
  } catch (error) {
    console.error("❌ [Auth] Error checking authentication:", error);
    return { user: null, authenticated: false };
  }
}

/**
 * Initiate Google OAuth login
 * Redirects to Google OAuth consent screen
 */
export function initiateGoogleLogin(): void {
  console.log("🔐 [Auth] Initiating Google login...");
  window.location.href = `${API_URL}/auth/google`;
}

/**
 * Handle OAuth callback after redirect from backend
 * Called when user is redirected back from OAuth provider
 */
export function handleOAuthCallback(): {
  isSuccess: boolean;
  loginParam: string | null;
  userParam: string | null;
} {
  console.log("📍 [Auth] Handling OAuth callback");

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const loginSuccess = params.get("login") === "success";
  const userParam = params.get("user");
  const errorParam = params.get("error");

  if (errorParam) {
    console.warn(`⚠️ [Auth] OAuth error: ${errorParam}`);
    return { isSuccess: false, loginParam: null, userParam: null };
  }

  if (loginSuccess) {
    console.log("✅ [Auth] OAuth login successful!");
    if (userParam) {
      console.log(`👤 [Auth] Logged in as: ${decodeURIComponent(userParam)}`);
    }

    // Clean up URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    return { isSuccess: true, loginParam: "success", userParam };
  }

  return { isSuccess: false, loginParam: null, userParam: null };
}

/**
 * Logout current user
 * Clears session on backend and frontend
 */
export async function logout(): Promise<void> {
  try {
    console.log("🚪 [Auth] Initiating logout...");

    const response = await fetch(`${API_URL}/logout`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Logout failed with status ${response.status}`);
    }

    console.log("✅ [Auth] Logout successful");
    window.location.href = "/"; // Redirect to home
  } catch (error) {
    console.error("❌ [Auth] Logout error:", error);
  }
}

/**
 * Get current user from session
 * Non-blocking call for checking user state
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_URL}/user`, {
      credentials: "include",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as AuthResponse;
    return data.user || null;
  } catch (error) {
    console.error("❌ [Auth] Error getting current user:", error);
    return null;
  }
}

/**
 * Format user display name
 */
export function formatUserName(user: User | null): string {
  if (!user) return "Guest";
  return user.name || user.email || "User";
}
