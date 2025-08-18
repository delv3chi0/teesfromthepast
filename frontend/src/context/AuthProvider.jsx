// frontend/src/context/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { client, setAuthHeader, clearAuthHeader } from "../api/client";

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

// Support legacy/local keys
const TOKEN_KEYS = ["tftp_token", "token"];
const PRIMARY_TOKEN_KEY = "tftp_token";

function readToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
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

  // Prevent race if we clear while a hydrate is mid-flight
  const clearingRef = useRef(false);

  const setSession = async (newToken) => {
    if (!newToken) {
      clearingRef.current = true;
      writeToken(null);
      clearAuthHeader();
      setToken(null);
      setUser(null);
      clearingRef.current = false;
      return;
    }
    try {
      // sanity check token and set it
      const decoded = jwtDecode(newToken);
      if (!decoded?.exp) throw new Error("Token missing exp");
      writeToken(newToken);
      setToken(newToken);
      setAuthHeader(newToken);
      await hydrateUser(newToken);
    } catch {
      // bad token
      writeToken(null);
      clearAuthHeader();
      setToken(null);
      setUser(null);
    }
  };

  const hydrateUser = async (activeToken) => {
    try {
      if (activeToken) setAuthHeader(activeToken);
      const { data } = await client.get("/auth/profile");
      if (clearingRef.current) return;
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
    } catch {
      // profile failed -> clear session
      await setSession(null);
    }
  };

  // Init once from localStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = readToken();
        if (!stored) {
          clearAuthHeader();
          return;
        }
        const decoded = jwtDecode(stored);
        const nowSec = Math.floor(Date.now() / 1000);
        if (!decoded?.exp || decoded.exp <= nowSec) {
          writeToken(null);
          clearAuthHeader();
          return;
        }
        setToken(stored);
        setAuthHeader(stored);
        await hydrateUser(stored);
      } catch {
        writeToken(null);
        clearAuthHeader();
      } finally {
        setLoadingAuth(false);
      }
    })();
  }, []);

  // Keep Authorization header in sync if token changes externally
  useEffect(() => {
    if (token) setAuthHeader(token);
    else clearAuthHeader();
  }, [token]);

  // Auto-logout at exp (best-effort)
  useEffect(() => {
    if (!token) return;
    let timer;
    try {
      const { exp } = jwtDecode(token);
      if (exp) {
        const ms = Math.max(0, exp * 1000 - Date.now() - 500);
        timer = setTimeout(() => setSession(null), ms);
      }
    } catch {
      // noop
    }
    return () => clearTimeout(timer);
  }, [token]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = async (e) => {
      if (e.key && !TOKEN_KEYS.includes(e.key)) return;
      const fresh = readToken();
      if (!fresh) await setSession(null);
      else if (fresh !== token) await setSession(fresh);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [token]);

  const logout = async () => {
    try {
      await client.post("/auth/logout"); // ok if this 401s
    } catch {}
    await setSession(null);
  };

  const value = useMemo(
    () => ({ token, user, loadingAuth, setSession, logout }),
    [token, user, loadingAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
