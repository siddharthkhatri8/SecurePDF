import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="spinner" style={{ width: '50px', height: '50px' }}></div>
        <p style={{ color: 'var(--text-light)' }}>Loading...</p>
      </div>
    );
  }

  if (requireAuth) {
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  }

  if (!requireAuth) {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      return <Navigate to={from} replace />;
    }
    return children;
  }

  return children;
};

export default ProtectedRoute;