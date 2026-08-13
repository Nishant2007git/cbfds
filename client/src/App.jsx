import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FileBrowser from './pages/FileBrowser.jsx';
import UploadPage from './pages/UploadPage.jsx';
import PublicDownload from './pages/PublicDownload.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import ShareBoard from './pages/ShareBoard.jsx';
import TrashManager from './pages/TrashManager.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import SplashScreen from './components/SplashScreen.jsx';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="app-loading-screen glass-panel">
        <div className="skeleton" style={{ width: '120px', height: '120px', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (adminOnly && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  const { showSplash, completeSplash } = useAuth();

  return (
    <>
      {/* Splash screen overlay — plays after login/register */}
      {showSplash && (
        <SplashScreen
          videoSrc="/intro-animation.mp4"
          onComplete={completeSplash}
        />
      )}

      <Routes>
        {/* Public Share Route */}
        <Route path="/share/:token" element={<PublicDownload />} />

        {/* Authenticated Application Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/files"
          element={
            <ProtectedRoute>
              <FileBrowser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shares"
          element={
            <ProtectedRoute>
              <ShareBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash"
          element={
            <ProtectedRoute>
              <TrashManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

