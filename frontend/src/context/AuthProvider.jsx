// frontend/src/context/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { client, setAuthHeader, clearAuthHeader } from "../api/client";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

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
  localStorage.setItem(PRIMARY_TOKEN_KEY, token);
  localStorage.setItem("token", token);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Fetch full user (includes isAdmin) once we have a valid token
  const hydrateUser = async (activeToken) => {
    try {
      setAuthHeader(activeToken);
      const { data } = await client.get("/auth/profile");
      // data from your backend already excludes password and includes isAdmin
      setUser({
        _id: data._id || data.id,
        id: data._id || data.id,
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isAdmin: !!data.isAdmin,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
      });
    } catch (err) {
      // Token probably expired or invalid; clear session
      setSession(null);
    }
  };

  // Init from localStorage once
  useEffect(() => {
    (async () => {
      try {
        const stored = readToken();
        if (!stored) {
          clearAuthHeader();
          return;
        }
        const decoded = jwtDecode(stored);
        const now = Math.floor(Date.now() / 1000);
        if (!decoded?.exp || decoded.exp <= now) {
          writeToken(null);
          clearAuthHeader();
          return;
        }
        setToken(stored);
        await hydrateUser(stored);
      } catch {
        writeToken(null);
        clearAuthHeader();
      } finally {
        setLoadingAuth(false);
      }
    })();
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
  const setSession = async (newToken) => {
    if (!newToken) {
      writeToken(null);
      clearAuthHeader();
      setToken(null);
      setUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(newToken); // sanity-check token
      writeToken(newToken);
      setToken(newToken);
      await hydrateUser(newToken); // <-- ensures isAdmin is populated
    } catch {
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

  // Cross-tab sync
  useEffect(() => {
    const onStorage = async (e) => {
      if (e.key && !TOKEN_KEYS.includes(e.key)) return;
      const fresh = readToken();
      if (!fresh) setSession(null);
      else if (fresh !== token) await setSession(fresh);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [token]);

  const value = useMemo(() => ({ token, user, loadingAuth, setSession, logout }), [token, user, loadingAuth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
