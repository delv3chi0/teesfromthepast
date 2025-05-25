// frontend/src/context/AuthProvider.jsx
import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode'; // Ensure you have installed jwt-decode: npm install jwt-decode

export const AuthContext = createContext(null); // Initialize with null

console.log("✅ AuthProvider rendered");

export function AuthProvider({ children }) {
  // Initialize user to null, indicating no user is loaded/logged in yet.
  // undefined can be used for a "loading" state if preferred.
  const [user, setUser] = useState(null); 
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
          console.log("Token expired, removing.");
          localStorage.removeItem('token');
          setToken(null); // Update token state
          setUser(null);
          delete client.defaults.headers.common['Authorization'];
        } else {
          console.log("Token valid, setting user and fetching profile.");
          // Set user based on decoded token initially
          // The 'user' object within the decoded token might just be { id: '...' }
          // It's often better to fetch the full profile.
          setUser(decoded.user); // Assuming your JWT payload has a 'user' object like { id: '...' }
          
          // Set Authorization header for future client requests
          client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Fetch full profile to get up-to-date user details
          client.get('/auth/profile') // Corrected path
            .then(response => {
              setUser(response.data); // Update user with full profile data
            })
            .catch(() => {
              console.error("Failed to fetch profile with token, logging out.");
              localStorage.removeItem('token');
              setToken(null); // Update token state
              setUser(null);
              delete client.defaults.headers.common['Authorization'];
            });
        }
      } catch (error) {
        console.error("Error decoding token, removing.");
        localStorage.removeItem('token');
        setToken(null); // Update token state
        setUser(null);
        delete client.defaults.headers.common['Authorization'];
      }
    } else {
      // No token found
      setUser(null);
      delete client.defaults.headers.common['Authorization'];
    }
  }, [token]); // Re-run effect if token changes

  const login = async (credentials) => {
    const { data } = await client.post('/auth/login', credentials);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token); // This will trigger the useEffect above
      // The useEffect will handle setting the user and auth header
    }
    return data; // Return full response for potential further handling
  };

  const register = async (userData) => {
    const { data } = await client.post('/auth/register', userData);
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token); // This will trigger the useEffect above
    }
    return data;
  };

  const logout = () => {
    console.log("Logging out.");
    localStorage.removeItem('token');
    setToken(null); // This will trigger the useEffect to clear user and auth header
    // No need to call setUser(null) or delete header here, useEffect handles it
    // Optionally, call a backend logout endpoint if you have one:
    // client.post('/auth/logout').catch(err => console.error("Logout API call failed", err));
  };

  // Initial loading state: if user is undefined, it means we haven't checked localStorage yet.
  // Once checked, user will be an object or null.
  // For simplicity, we can remove the explicit "Loading user..." and let the UI handle null user state.
  // if (user === undefined && token === undefined) return <p>Loading auth state…</p>;


  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, setUser /* if needed directly */ }}>
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
