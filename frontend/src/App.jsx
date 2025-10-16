import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Projects from './pages/Projects/Projects';
import ProjectDetail from './pages/ProjectDetail/ProjectDetail';
import CreateProject from './pages/CreateProject/CreateProject';
import AdminPanel from './pages/AdminPanel/AdminPanel';
import AdminLogin from './pages/AdminLogin/AdminLogin';
import AdminRegister from './pages/AdminRegister/AdminRegister';
import BidDetail from './pages/BidDetail/BidDetail';
import FreelancerProfile from './pages/FreelancerProfile/FreelancerProfile';
import MessagingSystem from './components/MessagingSystem/MessagingSystem';
import './App.css';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute - user:', user, 'allowedRoles:', allowedRoles);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to /login');
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('ProtectedRoute - User role not allowed, redirecting to /dashboard');
    return <Navigate to="/dashboard" />;
  }
  
  console.log('ProtectedRoute - Access granted');
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/register" element={<AdminRegister />} />
              <Route path="/projects/:projectId/bids/:bidId" element={<BidDetail />} />
              <Route path="/freelancer/:freelancerId" element={<FreelancerProfile />} />
              <Route path="/profile/:userId" element={<FreelancerProfile />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              
              <Route path="/projects/:id" element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/create-project" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <CreateProject />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              
              <Route path="/messages" element={
                <ProtectedRoute>
                  <MessagingSystem />
                </ProtectedRoute>
              } />
              
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
