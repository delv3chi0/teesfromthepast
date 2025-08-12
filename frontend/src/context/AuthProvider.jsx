// frontend/src/context/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode"; // v4 named export
import { client, setAuthHeader, clearAuthHeader } from "../api/client";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

// Use both keys for maximum compatibility while we stabilize
const TOKEN_KEYS = ["tftp_token", "token"];
const PRIMARY_TOKEN_KEY = "tftp_token";

function readToken() {
  for (const key of TOKEN_KEYS) {
    const v = localStorage.getItem(key);
    if (v && v !== "undefined") return v;
  }
  return null;
}
function writeToken(token) {
  if (!token) {
    TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
    return;
  }
  // Write to the primary, also mirror to legacy
  localStorage.setItem(PRIMARY_TOKEN_KEY, token);
  localStorage.setItem("token", token);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Init from localStorage once
  useEffect(() => {
    try {
      const stored = readToken();
      if (!stored) {
        clearAuthHeader();
        setLoadingAuth(false);
        return;
      }
      const decoded = jwtDecode(stored);
      const now = Math.floor(Date.now() / 1000);
      if (!decoded?.exp || decoded.exp <= now) {
        writeToken(null);
        clearAuthHeader();
        setLoadingAuth(false);
        return;
      }
      setToken(stored);
      setUser({
        id: decoded.user?.id || decoded.id || decoded.sub || null,
        email: decoded.user?.email || decoded.email || null,
        name: decoded.user?.name || decoded.name || null,
        role: decoded.user?.role || decoded.role || "user",
      });
      setAuthHeader(stored);
    } catch (e) {
      writeToken(null);
      clearAuthHeader();
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  // Keep Authorization header synchronized if token changes
  useEffect(() => {
    if (token) setAuthHeader(token);
    else clearAuthHeader();
  }, [token]);

  // Auto-logout at expiry (best effort)
  useEffect(() => {
    if (!token) return;
    let timer;
    try {
      const { exp } = jwtDecode(token);
      if (exp) {
        const ms = Math.max(0, exp * 1000 - Date.now() - 500);
        timer = setTimeout(() => setSession(null), ms);
      }
    } catch {}
    return () => clearTimeout(timer);
  }, [token]);

  // Session setter used by LoginPage after successful login
  const setSession = (newToken) => {
    if (!newToken) {
      writeToken(null);
      clearAuthHeader();
      setToken(null);
      setUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(newToken);
      writeToken(newToken);
      setToken(newToken);
      setUser({
        id: decoded.user?.id || decoded.id || decoded.sub || null,
        email: decoded.user?.email || decoded.email || null,
        name: decoded.user?.name || decoded.name || null,
        role: decoded.user?.role || decoded.role || "user",
      });
      setAuthHeader(newToken);
    } catch (e) {
      writeToken(null);
      clearAuthHeader();
      setToken(null);
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      await client.post("/auth/logout").catch(() => {});
    } finally {
      setSession(null);
    }
  };

  // Cross-tab sync (if you log out in one tab)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && !TOKEN_KEYS.includes(e.key)) return;
      const fresh = readToken();
      if (!fresh) setSession(null);
      else if (fresh !== token) setSession(fresh);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [token]);

  const value = useMemo(() => ({ token, user, loadingAuth, setSession, logout }), [token, user, loadingAuth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
