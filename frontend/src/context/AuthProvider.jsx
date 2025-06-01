// frontend/src/context/AuthProvider.jsx
import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext(null);

console.log("✅ AuthProvider rendered (Top Level)");

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // This user object will contain 'isAdmin' if fetched from profile
  const [token, setToken] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    console.log("🔑 AuthProvider: Attempting to load token from localStorage on mount.");
    const initialToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log("🔑 AuthProvider: Initial token found:", initialToken ? "Yes" : "No");
    setToken(initialToken);
  }, []);

  useEffect(() => {
    console.log("🔄 AuthProvider useEffect triggered by token change. Current token state:", token ? "Exists" : "Null");
    if (token) {
      try {
        console.log("🔍 AuthProvider: Attempting to decode token (first 20 chars):", token.substring(0,20) + "...");
        const decoded = jwtDecode(token);
        console.log("📜 AuthProvider: Decoded token (exp, iat):", { exp: decoded.exp, iat: decoded.iat, user: decoded.user });
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.warn("⏳ AuthProvider: Token expired. Removing token.");
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete client.defaults.headers.common['Authorization'];
          setLoadingAuth(false);
        } else {
          console.log("👍 AuthProvider: Token valid. Setting Axios header and fetching profile.");
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          client.get('/auth/profile')
            .then(response => {
              // response.data from /auth/profile should now include the isAdmin field
              // because the User model on the backend was updated.
              console.log("👤 AuthProvider: Profile fetched successfully. User data (check for isAdmin):", response.data);
              setUser(response.data); // The user object in context will now have 'isAdmin'

              if (response.data && response.data.isAdmin) {
                console.log("👑 AuthProvider: User is an Administrator.");
              } else if (response.data) {
                console.log("👤 AuthProvider: User is not an Administrator.");
              }
              setLoadingAuth(false);
            })
            .catch((err) => {
              console.error("❌ AuthProvider: Failed to fetch profile with token. Logging out.", err.response?.data || err.message);
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
              setLoadingAuth(false);
            });
        }
      } catch (error) {
        console.error("💥 AuthProvider: Error decoding token. Removing token.", error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
        setLoadingAuth(false);
      }
    } else {
      console.log("🚫 AuthProvider: No token in state. Clearing user and auth header.");
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
      setLoadingAuth(false);
    }
  }, [token]);

  const login = async (credentials) => {
    console.log("🚀 AuthProvider: login function called");
    setLoadingAuth(true); // Indicate auth state is changing
    try {
        const { data } = await client.post('/auth/login', credentials);
        if (data.token) {
            console.log("🔑 AuthProvider: Token received from login (first 20 chars):", data.token.substring(0,20) + "...");
            localStorage.setItem('token', data.token);
            // setToken will trigger the useEffect to decode and fetch profile
            setToken(data.token); 
            // setLoadingAuth(false) will be called in the useEffect after profile fetch
        } else {
            console.error("❌ AuthProvider: No token received from login API.");
            setLoadingAuth(false); // Reset loading state on login failure
            throw new Error(data.message || "Login failed: No token received");
        }
        return data; // Return full response which might include user data directly from login
    } catch (error) {
        setLoadingAuth(false); // Reset loading state on login error
        throw error; // Re-throw to be caught by the calling component
    }
  };

  const register = async (userData) => {
    console.log("🚀 AuthProvider: register function called");
    setLoadingAuth(true); // Indicate auth state is changing
    try {
        const { data } = await client.post('/auth/register', userData);
        if (data.token) {
            console.log("🔑 AuthProvider: Token received from register (first 20 chars):", data.token.substring(0,20) + "...");
            localStorage.setItem('token', data.token);
            // setToken will trigger the useEffect to decode and fetch profile
            setToken(data.token);
            // setLoadingAuth(false) will be called in the useEffect after profile fetch
        } else {
            console.error("❌ AuthProvider: No token received from register API.");
            setLoadingAuth(false); // Reset loading state on registration failure
            throw new Error(data.message || "Registration failed: No token received");
        }
        return data; // Return full response
    } catch (error) {
        setLoadingAuth(false); // Reset loading state on registration error
        throw error; // Re-throw
    }
  };

  const logout = () => {
    console.log("🚪 AuthProvider: logout function called");
    localStorage.removeItem('token');
    // Setting token to null will trigger the useEffect, which will then:
    // - setUser(null)
    // - delete Authorization header
    // - setLoadingAuth(false)
    setToken(null); 
  };

  // Value provided to context consumers
  // The 'user' object here will contain 'isAdmin' if the user is logged in and profile is fetched
  const contextValue = { user, token, login, register, logout, loadingAuth, setUser };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) { // Check for undefined, not null, as null could be a valid initial context value if designed that way
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
