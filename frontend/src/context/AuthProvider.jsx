// frontend/src/context/AuthProvider.jsx
import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

console.log("✅ AuthProvider rendered (Top Level)");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Initialize to true

  // Effect to load initial token from localStorage
  useEffect(() => {
    console.log("🔑 AuthProvider [Mount]: Attempting to load token from localStorage.");
    const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log("🔑 AuthProvider [Mount]: Initial token found:", initialToken ? "Yes" : "No");
    
    // Set the token. The other useEffect will handle processing and loadingAuth.
    // If initialToken is null, the other effect will quickly set loadingAuth to false.
    // If initialToken exists, the other effect will set loadingAuth to true during processing.
    setToken(initialToken);
  }, []); // Runs only once on mount

  // Effect to process token changes (from mount, login, register, logout)
  useEffect(() => {
    console.log("🔄 AuthProvider [Token Change]: useEffect triggered. Current token state:", token ? "Exists" : "Null");
    
    if (token) {
      // If a token exists, we are actively trying to authenticate. Set loading to true.
      setLoadingAuth(true); 
      try {
        console.log("🔍 AuthProvider [Token Change]: Attempting to decode token (first 20 chars):", token.substring(0,20) + "...");
        const decoded = jwtDecode(token);
        console.log("📜 AuthProvider [Token Change]: Decoded token (exp, iat, user):", { exp: decoded.exp, iat: decoded.iat, user: decoded.user });
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn("⏳ AuthProvider [Token Change]: Token expired. Removing token.");
          localStorage.removeItem('token');
          setToken(null); // This will re-trigger this effect with token = null
          setUser(null);
          delete client.defaults.headers.common['Authorization'];
          // setLoadingAuth(false) will be handled by the re-run of this effect when token becomes null
        } else {
          console.log("👍 AuthProvider [Token Change]: Token valid. Setting Axios header and fetching profile.");
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          client.get('/auth/profile')
            .then(response => {
              console.log("👤 AuthProvider [Token Change]: Profile fetched successfully. User data (check for isAdmin):", response.data);
              setUser(response.data);
              if (response.data && response.data.isAdmin) {
                console.log("👑 AuthProvider [Token Change]: User is an Administrator.");
              } else if (response.data) {
                console.log("👤 AuthProvider [Token Change]: User is not an Administrator.");
              }
              setLoadingAuth(false); // Authentication process complete
            })
            .catch((err) => {
              console.error("❌ AuthProvider [Token Change]: Failed to fetch profile with token. Logging out.", err.response?.data || err.message);
              localStorage.removeItem('token');
              setToken(null); // This will re-trigger this effect with token = null
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
              // setLoadingAuth(false) will be handled by the re-run of this effect when token becomes null
            });
        }
      } catch (error) {
        console.error("💥 AuthProvider [Token Change]: Error decoding token. Removing token.", error);
        localStorage.removeItem('token');
        setToken(null); // This will re-trigger this effect with token = null
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
        // setLoadingAuth(false) will be handled by the re-run of this effect when token becomes null
      }
    } else {
      // No token in state (either initially, after logout, or after an error cleared it)
      console.log("🚫 AuthProvider [Token Change]: No token in state. Clearing user, auth header, and finishing auth load.");
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
      setLoadingAuth(false); // Authentication process complete (no user)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Re-run effect if token state itself changes

  const login = async (credentials) => {
    console.log("🚀 AuthProvider: login function called");
    // setLoadingAuth(true) will be handled by the useEffect when token changes
    const { data } = await client.post('/auth/login', credentials);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from login (first 20 chars):", data.token.substring(0,20) + "...");
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
      console.log("🔑 AuthProvider: Token received from register (first 20 chars):", data.token.substring(0,20) + "...");
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
