// src/App.jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

import ProtectedLayout from './components/Layout/ProtectedLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AiDiagnosticsPage from './pages/AiDiagnosticsPage';
import MonitoringPage from './pages/MonitoringPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlarmsPage from './pages/AlarmsPage';
import SetpointsPage from './pages/SetpointsPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import UserProfilePage from './pages/UserProfilePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ReportsPage from './pages/ReportsPage';
import GooseAssistant from './components/GooseAssistant/GooseAssistant';


function AppRoutes() {
  const { isAuthenticated } = useAppContext();

  // 🔧 TEMPORARY: Bypass authentication for AI setup/testing
  const bypassAuth = true;

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          (isAuthenticated || bypassAuth) ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes - TEMPORARILY ACCESSIBLE WITHOUT LOGIN */}
        <Route element={(isAuthenticated || bypassAuth) ? <ProtectedLayout /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ai-diagnostics" element={<AiDiagnosticsPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/alarms" element={<AlarmsPage />} />
          <Route path="/setpoints" element={<SetpointsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={(isAuthenticated || bypassAuth) ? "/dashboard" : "/login"} replace />}
        />
      </Routes>

      {/* Goose Assistant Chatbot - Available on all authenticated pages */}
      {(isAuthenticated || bypassAuth) && <GooseAssistant />}
    </>
  );
}

// *** Main App component wraps everything in AppProvider ***
export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}