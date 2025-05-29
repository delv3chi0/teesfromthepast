// frontend/src/context/AuthProvider.jsx
import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

console.log("✅ AuthProvider rendered (Top Level)");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // <-- NEW: Loading state for auth check

  useEffect(() => {
    console.log("🔑 AuthProvider: Attempting to load token from localStorage on mount.");
    const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log("🔑 AuthProvider: Initial token found:", initialToken ? "Yes" : "No");
    setToken(initialToken); // Set token state, which will trigger the next useEffect
    // setLoadingAuth(true); // Already true by default, will be set to false in the next effect
  }, []); // Runs only once on mount to get token from localStorage

  useEffect(() => {
    console.log("🔄 AuthProvider useEffect triggered by token change. Current token state:", token);
    if (token) {
      try {
        console.log("🔍 AuthProvider: Attempting to decode token:", token);
        const decoded = jwtDecode(token);
        console.log("📜 AuthProvider: Decoded token:", decoded);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn("⏳ AuthProvider: Token expired. Removing token.");
          localStorage.removeItem('token');
          setToken(null); // This will cause this useEffect to run again with token=null
          setUser(null);
          delete client.defaults.headers.common['Authorization'];
          setLoadingAuth(false); // Auth check finished
        } else {
          console.log("👍 AuthProvider: Token valid. Setting Axios header and fetching profile.");
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          client.get('/auth/profile')
            .then(response => {
              console.log("👤 AuthProvider: Profile fetched successfully:", response.data);
              setUser(response.data);
              setLoadingAuth(false); // Auth check finished, user set
            })
            .catch((err) => {
              console.error("❌ AuthProvider: Failed to fetch profile with token. Logging out.", err.response?.data || err.message);
              localStorage.removeItem('token');
              setToken(null); // Triggers this useEffect again
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
              setLoadingAuth(false); // Auth check finished
            });
        }
      } catch (error) {
        console.error("💥 AuthProvider: Error decoding token. Removing token.", error);
        localStorage.removeItem('token');
        setToken(null); // Triggers this useEffect again
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
        setLoadingAuth(false); // Auth check finished
      }
    } else {
      console.log("🚫 AuthProvider: No token in state. Clearing user and auth header.");
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
      setLoadingAuth(false); // Auth check finished, no user
    }
  }, [token]); // Re-run effect if token state itself changes

  const login = async (credentials) => {
    // ... (login function remains the same: calls API, localStorage.setItem, setToken)
    console.log("🚀 AuthProvider: login function called");
    const { data } = await client.post('/auth/login', credentials);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from login:", data.token);
      localStorage.setItem('token', data.token);
      setLoadingAuth(true); // Set loading while new token is processed by useEffect
      setToken(data.token); 
    } else {
      console.error("❌ AuthProvider: No token received from login API.");
      throw new Error(data.message || "Login failed: No token received");
    }
    return data;
  };

  const register = async (userData) => {
    // ... (register function remains the same: calls API, localStorage.setItem, setToken)
    console.log("🚀 AuthProvider: register function called");
    const { data } = await client.post('/auth/register', userData);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from register:", data.token);
      localStorage.setItem('token', data.token);
      setLoadingAuth(true); // Set loading while new token is processed by useEffect
      setToken(data.token);
    } else {
      console.error("❌ AuthProvider: No token received from register API.");
      throw new Error(data.message || "Registration failed: No token received");
    }
    return data;
  };

  const logout = () => {
    console.log("🚪 AuthProvider: logout function called");
    localStorage.removeItem('token');
    setLoadingAuth(true); // Set loading while token removal is processed by useEffect
    setToken(null); 
    // setUser(null) and delete header will be handled by useEffect when token becomes null
  };

  // Value provided to context consumers
  const contextValue = { user, token, login, register, logout, loadingAuth, setUser /* if needed directly */ };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  // ... (useAuth hook remains the same)
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
