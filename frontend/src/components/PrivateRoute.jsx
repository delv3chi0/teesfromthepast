import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function PrivateRoute({ children }) {
  const { user } = useAuth();

  console.log('🔒 PrivateRoute checking user:', user);

  if (user === undefined) return <p>Loading auth...</p>;
  if (user === null) return <Navigate to="/login" replace />;
  return children;
}
