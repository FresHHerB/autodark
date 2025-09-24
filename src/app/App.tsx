import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/contexts';
import { LoginPage } from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { CloneChannelPage, ManageChannelPage, ReviewEditPage, PublishSchedulePage } from '@features/channel-management';
import { GenerateContentPage, GenerateVideoPage } from '@features/content-generation';
import { SettingsPage } from '@features/settings';

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