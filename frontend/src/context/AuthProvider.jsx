import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import {
  client,
  setAuthHeader,
  clearAuthHeader,
  setSessionIdHeader,
  clearSessionIdHeader,
} from "../api/client";

const AuthContext = createContext(null);

// ✅ Named export that pages/components import
export function useAuth() {
  return useContext(AuthContext);
}

// --- storage keys ---
const TOKEN_KEYS = ["tftp_token", "token"];
const PRIMARY_TOKEN_KEY = "tftp_token";
const SESSION_KEY = "tftp_session";

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
  localStorage.setItem("token", token); // legacy
}
function readSessionId() {
  const v = localStorage.getItem(SESSION_KEY);
  return v && v !== "undefined" ? v : null;
}
function writeSessionId(jti) {
  if (!jti) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, jti);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [sessionId, setSessionId] = useState(null); // jti
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // prevent race when clearing mid-flight
  const clearingRef = useRef(false);

  // Single source of truth to set/clear session on the client
  const setSession = async (newToken, newSessionId) => {
    if (!newToken) {
      clearingRef.current = true;
      writeToken(null);
      writeSessionId(null);
      clearAuthHeader();
      clearSessionIdHeader();
      setToken(null);
      setSessionId(null);
      setUser(null);
      clearingRef.current = false;
      return;
    }
    try {
      const decoded = jwtDecode(newToken);
      if (!decoded?.exp) throw new Error("Token missing exp");
      writeToken(newToken);
      setToken(newToken);
      setAuthHeader(newToken);

      if (newSessionId) {
        writeSessionId(newSessionId);
        setSessionId(newSessionId);
        setSessionIdHeader(newSessionId);
      }

      await hydrateUser(newToken);
    } catch {
      // bad/expired token
      writeToken(null);
      writeSessionId(null);
      clearAuthHeader();
      clearSessionIdHeader();
      setToken(null);
      setSessionId(null);
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
      // profile failed (expired/revoked) -> clear
      await setSession(null);
    }
  };

  // Init once from localStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = readToken();
        const storedJti = readSessionId();

        if (!stored) {
          clearAuthHeader();
          clearSessionIdHeader();
          return;
        }
        const decoded = jwtDecode(stored);
        const nowSec = Math.floor(Date.now() / 1000);
        if (!decoded?.exp || decoded.exp <= nowSec) {
          writeToken(null);
          writeSessionId(null);
          clearAuthHeader();
          clearSessionIdHeader();
          return;
        }

        setToken(stored);
        setAuthHeader(stored);

        if (storedJti) {
          setSessionId(storedJti);
          setSessionIdHeader(storedJti);
        }

        await hydrateUser(stored);
      } catch {
        writeToken(null);
        writeSessionId(null);
        clearAuthHeader();
        clearSessionIdHeader();
      } finally {
        setLoadingAuth(false);
      }
    })();
  }, []);

  // Keep axios headers in sync if token/jti change externally
  useEffect(() => {
    if (token) setAuthHeader(token);
    else clearAuthHeader();
  }, [token]);

  useEffect(() => {
    if (sessionId) setSessionIdHeader(sessionId);
    else clearSessionIdHeader();
  }, [sessionId]);

  // Auto-logout at exp (best effort)
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

  // Cross-tab sync
  useEffect(() => {
    const onStorage = async (e) => {
      if (e.key && ![PRIMARY_TOKEN_KEY, "token", SESSION_KEY].includes(e.key)) return;
      const freshToken = readToken();
      const freshJti = readSessionId();

      if (!freshToken) {
        await setSession(null);
      } else if (freshToken !== token || freshJti !== sessionId) {
        await setSession(freshToken, freshJti || undefined);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [token, sessionId]);

  const logout = async () => {
    try {
      await client.post("/auth/logout"); // ok if this 401s
    } catch {}
    await setSession(null);
  };

  const value = useMemo(
    () => ({ token, sessionId, user, loadingAuth, setSession, logout }),
    [token, sessionId, user, loadingAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
