// frontend/src/context/AuthProvider.jsx
import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

console.log("✅ AuthProvider rendered (Top Level)");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const initialToken = localStorage.getItem('token');
      console.log("🔑 AuthProvider: Initial token from localStorage on load:", initialToken);
      return initialToken;
    }
    return null;
  });

  useEffect(() => {
    console.log("🔄 AuthProvider useEffect triggered. Current token state:", token);
    if (typeof window === 'undefined') {
      console.log("🚪 AuthProvider useEffect: Not in browser, exiting.");
      return;
    }

    if (token) {
      try {
        console.log("🔍 AuthProvider useEffect: Attempting to decode token:", token);
        const decoded = jwtDecode(token);
        console.log("📜 AuthProvider useEffect: Decoded token:", decoded);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn("⏳ AuthProvider useEffect: Token expired. Removing token.");
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete client.defaults.headers.common['Authorization'];
        } else {
          console.log("👍 AuthProvider useEffect: Token valid. Setting user and auth header.");
          setUser(decoded.user); // Assuming payload is { user: { id: ... } }
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          console.log("👤 AuthProvider useEffect: Fetching profile...");
          client.get('/auth/profile')
            .then(response => {
              console.log("👤 AuthProvider useEffect: Profile fetched successfully:", response.data);
              setUser(response.data);
            })
            .catch((err) => {
              console.error("❌ AuthProvider useEffect: Failed to fetch profile with token. Logging out.", err.response?.data || err.message);
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
            });
        }
      } catch (error) {
        console.error("💥 AuthProvider useEffect: Error decoding token. Removing token.", error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
      }
    } else {
      console.log("🚫 AuthProvider useEffect: No token in state. Clearing user and auth header.");
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
    }
  }, [token]); // Re-run effect if token state changes

  const login = async (credentials) => {
    console.log("🚀 AuthProvider: login function called");
    const { data } = await client.post('/auth/login', credentials);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from login:", data.token);
      localStorage.setItem('token', data.token);
      setToken(data.token); // This will trigger the useEffect
    } else {
      console.error("❌ AuthProvider: No token received from login API.");
    }
    return data;
  };

  const register = async (userData) => {
    console.log("🚀 AuthProvider: register function called");
    const { data } = await client.post('/auth/register', userData);
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from register:", data.token);
      localStorage.setItem('token', data.token);
      setToken(data.token); // This will trigger the useEffect
    } else {
      console.error("❌ AuthProvider: No token received from register API.");
    }
    return data;
  };

  const logout = () => {
    console.log("🚪 AuthProvider: logout function called");
    localStorage.removeItem('token');
    setToken(null); // This will trigger the useEffect
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
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
