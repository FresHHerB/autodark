import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CloneChannelPage from './pages/CloneChannelPage';
import ManageChannelPage from './pages/ManageChannelPage';
import GenerateContentPage from './pages/GenerateContentPage';
import SettingsPage from './pages/SettingsPage';
import GenerateVideoPage from './pages/GenerateVideoPage';
import ReviewEditPage from './pages/ReviewEditPage';
import PublishSchedulePage from './pages/PublishSchedulePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-black">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clone-channel" 
              element={
                <ProtectedRoute>
                  <CloneChannelPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/manage-channel"
              element={
                <ProtectedRoute>
                  <ManageChannelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/generate-content"
              element={
                <ProtectedRoute>
                  <GenerateContentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/generate-video" 
              element={
                <ProtectedRoute>
                  <GenerateVideoPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/review-edit" 
              element={
                <ProtectedRoute>
                  <ReviewEditPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/publish-schedule"
              element={
                <ProtectedRoute>
                  <PublishSchedulePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;