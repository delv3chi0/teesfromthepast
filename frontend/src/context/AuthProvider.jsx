// frontend/src/context/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import jwtDecode from "jwt-decode";
import { client, setAuthHeader, clearAuthHeader } from "../api/client";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function readTokenSafely() {
  try {
    const t = localStorage.getItem("token");
    return t && t !== "undefined" ? t : null;
  } catch {
    return null;
  }
}

function isExpired(token) {
  try {
    const { exp } = jwtDecode(token || "");
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return exp <= now;
  } catch {
    return true;
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => readTokenSafely());
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Bootstrap on mount (and whenever token changes)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const t = readTokenSafely();
        if (!t || isExpired(t)) {
          localStorage.removeItem("token");
          clearAuthHeader();
          if (!cancelled) {
            setUser(null);
            setToken(null);
            setLoadingAuth(false);
          }
          return;
        }

        // valid token
        setAuthHeader(t);
        // If you have a lightweight “me” endpoint, you can validate here.
        // Otherwise just decode user info from token claims:
        const decoded = jwtDecode(t);
        if (!cancelled) {
          setUser(decoded?.user || decoded || null);
          setLoadingAuth(false);
        }
      } catch (e) {
        // Any decode/parse failure → clear state so UI can proceed
        console.warn("[Auth] bootstrap failed, clearing state:", e?.message);
        localStorage.removeItem("token");
        clearAuthHeader();
        if (!cancelled) {
          setUser(null);
          setToken(null);
          setLoadingAuth(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  // React to token written/cleared in other tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") {
        setToken(readTokenSafely());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    clearAuthHeader();
    setUser(null);
    setToken(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    loadingAuth,
    login,
    logout,
  }), [token, user, loadingAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
