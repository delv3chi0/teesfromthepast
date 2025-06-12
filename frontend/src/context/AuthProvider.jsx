import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

console.log("✅ AuthProvider rendered (Top Level)");

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    console.log("🔑 AuthProvider [useState init]: Reading initial token from localStorage.");
    const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log("🔑 AuthProvider [useState init]: Initial token from localStorage:", initialToken ? "Exists" : "No");
    return initialToken;
  });

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    console.log("🔄 AuthProvider [Token Effect]: Triggered. Current token state:", token ? "Exists" : "Null");

    if (token) {
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
          setToken(null); 
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
              setLoadingAuth(false);
            })
            .catch((err) => {
              console.error("❌ AuthProvider [Token Effect]: Failed to fetch profile. Clearing token/user.", err.response?.data || err.message);
              localStorage.removeItem('token');
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
              setToken(null);
            });
        }
      } catch (error) {
        console.error("💥 AuthProvider [Token Effect]: Error decoding token. Clearing token/user.", error);
        localStorage.removeItem('token');
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
        setToken(null);
      }
    } else {
      console.log("🚫 AuthProvider [Token Effect]: No token. Clearing user, auth header, and setting loadingAuth=false.");
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
      setLoadingAuth(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // CORRECTED: This now accepts email and password as separate arguments
  const login = async (email, password) => {
    console.log("🚀 AuthProvider: login function called");
    const { data } = await client.post('/auth/login', { email, password }); // Pass as an object
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from login.");
      localStorage.setItem('token', data.token);
      setToken(data.token);
    } else {
      console.error("❌ AuthProvider: No token received from login API.");
      throw new Error(data.message || "Login failed: No token received");
    }
    return data;
  };

  // CORRECTED: This now accepts username, email, and password as separate arguments
  const register = async (username, email, password) => {
    console.log("🚀 AuthProvider: register function called");
    const { data } = await client.post('/auth/register', { username, email, password }); // Pass as an object
    if (data.token) {
      console.log("🔑 AuthProvider: Token received from register.");
      localStorage.setItem('token', data.token);
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
    setToken(null);
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
