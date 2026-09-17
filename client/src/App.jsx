import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Citizen/Dashboard';
import NewComplaint from './pages/Citizen/NewComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import AdminDashboard from './pages/Admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes - App Layout */}
          <Route element={<AppLayout />}>
            {/* Citizen Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute roles={['citizen']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/complaints/new" 
              element={
                <ProtectedRoute roles={['citizen']}>
                  <NewComplaint />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/complaints/:id" 
              element={
                <ProtectedRoute roles={['citizen', 'officer', 'admin']}>
                  <ComplaintDetail />
                </ProtectedRoute>
              } 
            />

            {/* Admin / Officer Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute roles={['officer', 'admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/complaints/:id" 
              element={
                <ProtectedRoute roles={['officer', 'admin']}>
                  <ComplaintDetail />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
