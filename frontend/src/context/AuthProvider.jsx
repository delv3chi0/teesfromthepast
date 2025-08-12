// frontend/src/context/AuthProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode"; // ← v4 named export
import { client, setAuthHeader, clearAuthHeader } from "../api/client";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const TOKEN_KEY = "tftp_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Read token once at startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        // no token: ensure clean client
        clearAuthHeader();
        setLoadingAuth(false);
        return;
      }

      // Validate + decode
      const decoded = jwtDecode(stored);
      const nowSec = Math.floor(Date.now() / 1000);

      if (!decoded?.exp || decoded.exp <= nowSec) {
        // expired
        localStorage.removeItem(TOKEN_KEY);
        clearAuthHeader();
        setLoadingAuth(false);
        return;
      }

      // good token
      setToken(stored);
      setUser({
        id: decoded.user?.id || decoded.id || decoded.sub || null,
        email: decoded.user?.email || decoded.email || null,
        name: decoded.user?.name || decoded.name || null,
        role: decoded.user?.role || decoded.role || "user",
      });
      setAuthHeader(stored);
      setLoadingAuth(false);
    } catch (err) {
      console.warn("[AuthProvider] Failed to init from token:", err);
      localStorage.removeItem(TOKEN_KEY);
      clearAuthHeader();
      setLoadingAuth(false);
    }
  }, []);

  // Helper to programmatically set a new token (after login/refresh)
  const setSession = (newToken) => {
    if (!newToken) {
      localStorage.removeItem(TOKEN_KEY);
      clearAuthHeader();
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const decoded = jwtDecode(newToken);
      localStorage.setItem(TOKEN_KEY, newToken);
      setAuthHeader(newToken);
      setToken(newToken);
      setUser({
        id: decoded.user?.id || decoded.id || decoded.sub || null,
        email: decoded.user?.email || decoded.email || null,
        name: decoded.user?.name || decoded.name || null,
        role: decoded.user?.role || decoded.role || "user",
      });
    } catch (e) {
      console.error("[AuthProvider] setSession decode fail:", e);
      localStorage.removeItem(TOKEN_KEY);
      clearAuthHeader();
      setToken(null);
      setUser(null);
    }
  };

  // Optional: logout API call; even if it fails we clear locally
  const logout = async () => {
    try {
      await client.post("/auth/logout").catch(() => {});
    } finally {
      setSession(null);
    }
  };

  // Auto-logout when token is close to exp (best-effort client-side)
  useEffect(() => {
    if (!token) return;

    let timeoutId;
    try {
      const { exp } = jwtDecode(token);
      if (!exp) return;

      const msUntilExp = Math.max(0, exp * 1000 - Date.now());
      // clear a tiny bit before exp to avoid race
      timeoutId = setTimeout(() => setSession(null), msUntilExp - 500);
    } catch {
      // ignore
    }
    return () => clearTimeout(timeoutId);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loadingAuth,
      setSession, // call with token after successful login/refresh
      logout,
    }),
    [token, user, loadingAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
