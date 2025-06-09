// frontend/src/context/AuthProvider.jsx
import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

console.log("✅ AuthProvider rendered (Top Level)");

export function AuthProvider({ children }) {
  // Initialize token directly from localStorage.
  // This means the token state is immediately up-to-date on first render.
  const [token, setToken] = useState(() => {
    console.log("🔑 AuthProvider [useState init]: Reading initial token from localStorage.");
    const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log("🔑 AuthProvider [useState init]: Initial token from localStorage:", initialToken ? "Exists" : "No");
    return initialToken;
  });

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Still start as true

  useEffect(() => {
    console.log("🔄 AuthProvider [Token Effect]: Triggered. Current token state:", token ? "Exists" : "Null");

    if (token) {
      // If a token exists (either from initial load or after login/register),
      // we need to validate it and fetch the profile. Ensure loading is true.
      setLoadingAuth(true); 
      try {
        console.log("🔍 AuthProvider [Token Effect]: Attempting to decode token (first 20 chars):", token.substring(0,20) + "...");
        const decoded = jwtDecode(token);
        console.log("📜 AuthProvider [Token Effect]: Decoded token (exp, iat, user):", { exp: decoded.exp, iat: decoded.iat, user: decoded.user });
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn("⏳ AuthProvider [Token Effect]: Token expired. Removing token.");
          localStorage.removeItem('token');
          setUser(null);
          delete client.defaults.headers.common['Authorization'];
          setToken(null); // This will re-trigger this effect with token = null
                          // The next run will hit the 'else' block and set loadingAuth = false.
        } else {
          console.log("👍 AuthProvider [Token Effect]: Token valid. Setting Axios header and fetching profile.");
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          client.get('/auth/profile')
            .then(response => {
              console.log("👤 AuthProvider [Token Effect]: Profile fetched successfully. User data:", response.data);
              setUser(response.data);
              if (response.data && response.data.isAdmin) {
                console.log("👑 AuthProvider [Token Effect]: User is an Administrator.");
              } else if (response.data) {
                console.log("👤 AuthProvider [Token Effect]: User is not an Administrator.");
              }
              setLoadingAuth(false); // Profile fetched (or attempted), auth process for this token is complete.
            })
            .catch((err) => {
              console.error("❌ AuthProvider [Token Effect]: Failed to fetch profile. Clearing token/user.", err.response?.data || err.message);
              localStorage.removeItem('token');
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
              setToken(null); // Re-trigger, will hit 'else' block and set loadingAuth = false.
            });
        }
      } catch (error) {
        console.error("💥 AuthProvider [Token Effect]: Error decoding token. Clearing token/user.", error);
        localStorage.removeItem('token');
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
        setToken(null); // Re-trigger, will hit 'else' block and set loadingAuth = false.
      }
    } else {
      // No token in state. This means auth process is complete (no user).
      console.log("🚫 AuthProvider [Token Effect]: No token. Clearing user, auth header, and setting loadingAuth=false.");
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
      setLoadingAuth(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // This effect runs when 'token' state changes.

  const login = async (credentials) => {
    console.log("🚀 AuthProvider: login function called");
    // setLoadingAuth(true) will be handled by the useEffect when token changes
    const { data } = await client.post('/auth/login', credentials);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from login.");
      localStorage.setItem('token', data.token);
      setToken(data.token); // This triggers the useEffect
    } else {
      console.error("❌ AuthProvider: No token received from login API.");
      throw new Error(data.message || "Login failed: No token received");
    }
    return data;
  };

  const register = async (userData) => {
    console.log("🚀 AuthProvider: register function called");
    // setLoadingAuth(true) will be handled by the useEffect when token changes
    const { data } = await client.post('/auth/register', userData);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from register.");
      localStorage.setItem('token', data.token);
      setToken(data.token); // This triggers the useEffect
    } else {
      console.error("❌ AuthProvider: No token received from register API.");
      throw new Error(data.message || "Registration failed: No token received");
    }
    return data;
  };

  const logout = () => {
    console.log("🚪 AuthProvider: logout function called");
    localStorage.removeItem('token');
    setToken(null); // This triggers the useEffect, which will handle cleanup and setLoadingAuth(false)
  };

  const contextValue = { user, token, login, register, logout, loadingAuth, setUser };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
