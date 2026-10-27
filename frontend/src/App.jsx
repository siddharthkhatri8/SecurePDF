import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadPDF from './pages/UploadPDF';
import SPDFViewer from './pages/SPDFViewer';
import AccessManagement from './pages/AccessManagement';
import OpenLocalSPDF from './pages/OpenLocalSPDF';
import AccessLogs from './pages/AccessLogs';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>

              <Route path="/login" element={
                <ProtectedRoute requireAuth={false}>
                  <Login />
                </ProtectedRoute>
              } />

              <Route path="/register" element={
                <ProtectedRoute requireAuth={false}>
                  <Register />
                </ProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="/upload" element={
                <ProtectedRoute>
                  <UploadPDF />
                </ProtectedRoute>
              } />

              <Route path="/viewer/:id" element={
                <ProtectedRoute>
                  <SPDFViewer />
                </ProtectedRoute>
              } />

              <Route path="/access/:id" element={
                <ProtectedRoute>
                  <AccessManagement />
                </ProtectedRoute>
              } />

              <Route path="/access-logs/:id" element={
                <ProtectedRoute>
                  <AccessLogs />
                </ProtectedRoute>
              } />

              <Route path="/open-local" element={
                <ProtectedRoute>
                  <OpenLocalSPDF />
                </ProtectedRoute>
              } />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </main>

          <footer style={{
            padding: '20px',
            textAlign: 'center',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            marginTop: '40px'
          }}>
            <p style={{ color: 'var(--text-light)', fontSize: '14px', margin: 0 }}>
              🔒 SPDF System - AES-256 Encrypted Document Management • Built with MERN Stack
            </p>
          </footer>

        </div>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;