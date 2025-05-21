import { client } from '../api/client';
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

console.log("✅ AuthProvider rendered");
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // no undefined

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) { setUser(null); return; }
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setUser(null);
        } else {
          setUser(decoded);
    client.get('/profile').catch(() => { localStorage.removeItem('token'); setUser(null); });
        }
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  }, []);

  if (user === undefined) return <p>Loading user…</p>;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
