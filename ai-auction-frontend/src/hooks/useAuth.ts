import { useState, useEffect, useCallback } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export interface User {
  googleId: string;
  name: string;
  email: string;
  photo?: string;
}

/**
 * useAuth Hook - Manages authentication state and OAuth flow
 * ✅ Handles OAuth redirects after Google login
 * ✅ Persists session across page reloads
 * ✅ Provides login/logout functionality
 */
export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  /**
   * Fetch current user from backend session
   */
  const fetchUser = useCallback(async () => {
    try {
      console.log("🔍 [useAuth] Fetching user from session...");
      setLoading(true);

      const res = await fetch(`${BACKEND}/user`, {
        method: "GET",
        credentials: "include", // Important: Include cookies for session
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const json = await res.json();
      const currentUser = json.user || null;
      const isAuthenticated = json.authenticated ?? !!currentUser;

      setUser(currentUser);
      setAuthenticated(isAuthenticated);

      console.log(`✅ [useAuth] User fetched: ${currentUser?.email || "none"}`);
    } catch (err) {
      console.error("❌ [useAuth] Error fetching user:", err);
      setUser(null);
      setAuthenticated(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle OAuth callback on component mount
   * Checks URL for ?login=success parameter
   */
  useEffect(() => {
    const handleOAuthCallback = () => {
      const params = new URLSearchParams(window.location.search);
      const loginParam = params.get("login");
      const userParam = params.get("user");

      if (loginParam === "success") {
        console.log(`✅ [useAuth] OAuth login successful!`);
        if (userParam) {
          console.log(`👤 [useAuth] User: ${decodeURIComponent(userParam)}`);
        }

        // Clean up URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    };

    handleOAuthCallback();
  }, []);

  /**
   * Initial auth check on mount
   */
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      console.log("🚪 [useAuth] Logging out...");

      const res = await fetch(`${BACKEND}/logout`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        console.log("✅ [useAuth] Logout successful");
        setUser(null);
        setAuthenticated(false);
      }
    } catch (err) {
      console.error("❌ [useAuth] Logout error:", err);
      setError(err instanceof Error ? err.message : "Logout failed");
    }
  };

  /**
   * Initiate Google login
   */
  const loginWithGoogle = () => {
    console.log("🔐 [useAuth] Initiating Google login...");
    window.location.href = `${BACKEND}/auth/google`;
  };

  return {
    user,
    loading,
    error,
    authenticated,
    reload: fetchUser,
    logout,
    loginWithGoogle,
  };
}
