// frontend/src/context/AuthProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode";
import { client, setAuthHeader, clearAuthHeader } from "../api/client";

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

const TOKEN_KEY = "tftp_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // ---- helpers ----
  const deriveUser = (decoded) => ({
    id: decoded?.user?.id || decoded?.id || decoded?.sub || null,
    email: decoded?.user?.email || decoded?.email || null,
    name: decoded?.user?.name || decoded?.name || null,
    role: decoded?.user?.role || decoded?.role || "user",
  });

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
      if (!decoded?.exp || decoded.exp * 1000 <= Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        clearAuthHeader();
        setToken(null);
        setUser(null);
        return;
      }
      localStorage.setItem(TOKEN_KEY, newToken);
      setAuthHeader(newToken);
      setToken(newToken);
      setUser(deriveUser(decoded));
    } catch (e) {
      console.warn("[AuthProvider] setSession decode fail:", e);
      localStorage.removeItem(TOKEN_KEY);
      clearAuthHeader();
      setToken(null);
      setUser(null);
    }
  };

  const logout = async () => {
    try { await client.post("/auth/logout").catch(() => {}); }
    finally { setSession(null); }
  };

  // ---- boot from storage once ----
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        clearAuthHeader();
        setLoadingAuth(false);
        return;
      }
      const decoded = jwtDecode(stored);
      if (!decoded?.exp || decoded.exp * 1000 <= Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        clearAuthHeader();
        setLoadingAuth(false);
        return;
      }
      setToken(stored);
      setUser(deriveUser(decoded));
      setAuthHeader(stored);
    } catch (err) {
      console.warn("[AuthProvider] init -> bad token, clearing", err);
      localStorage.removeItem(TOKEN_KEY);
      clearAuthHeader();
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  // ---- auto clear just before exp (client-side safety) ----
  useEffect(() => {
    if (!token) return;
    let id;
    try {
      const { exp } = jwtDecode(token) || {};
      if (!exp) return;
      const ms = Math.max(0, exp * 1000 - Date.now() - 500);
      id = setTimeout(() => setSession(null), ms);
    } catch {}
    return () => clearTimeout(id);
  }, [token]);

  // ---- axios interceptor: clears on 401 / invalid token ----
  const interceptorInstalled = useRef(false);
  useEffect(() => {
    if (interceptorInstalled.current) return;
    interceptorInstalled.current = true;

    const resInterceptor = client.interceptors.response.use(
      (res) => res,
      (error) => {
        const status = error?.response?.status;
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "";

        if (
          status === 401 ||
          /token/i.test(msg) && /invalid|expired|malformed/i.test(msg)
        ) {
          console.warn("[AuthProvider] clearing session due to auth error:", status, msg);
          setSession(null);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      client.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // ---- cross-tab logout sync ----
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY) {
        const val = e.newValue;
        if (!val) {
          // someone logged out in another tab
          setSession(null);
        } else {
          setSession(val);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ token, user, loadingAuth, setSession, logout }),
    [token, user, loadingAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
