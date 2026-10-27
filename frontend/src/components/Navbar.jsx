import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '16px 0',
      marginBottom: '32px',
      boxShadow: 'var(--shadow)'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <Link to="/" style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'var(--primary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔒 SPDF System
        </Link>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📊 Dashboard
              </Link>
              <Link 
                to="/upload" 
                style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ⬆️ Upload
              </Link>
              <Link 
                to="/open-local" 
                style={{ 
                  textDecoration: 'none', 
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📂 Open Local
              </Link>
              <span style={{ 
                color: 'var(--text-light)',
                fontSize: '14px',
                paddingLeft: '8px',
                borderLeft: '1px solid var(--border)'
              }}>
                👤 {user.username}
              </span>
              <button onClick={logout} className="btn btn-outline" style={{ fontSize: '14px' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline" style={{ fontSize: '14px' }}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '14px' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;