import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axiosConfig';

// Create a context for sharing user data across the app
const AuthContext = createContext();

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component that manages user authentication
export const AuthProvider = ({ children }) => {
  // State for current user and loading status
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in when app starts
  useEffect(() => {
    const savedToken = sessionStorage.getItem('token');
    if (savedToken) {
      // Set up axios to use the token for all requests
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      // Get user info from the token
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Get user information from the saved token
  const fetchUserProfile = async () => {
    try {
      const savedToken = sessionStorage.getItem('token');
      if (savedToken) {
        // Decode the token to get user information
        const tokenParts = savedToken.split('.');
        const userData = JSON.parse(atob(tokenParts[1]));
        
        // Fetch complete user profile from server
        try {
          const response = await api.get(`/api/auth/profile/${userData.id}`);
          // Ensure the user object has both _id and id for consistency
          const userProfile = {
            ...response.data,
            id: response.data._id || response.data.id
          };
          setCurrentUser(userProfile);
        } catch (profileError) {
          // If profile fetch fails, fall back to basic info from token
          const userInfo = { 
            id: userData.id, 
            role: userData.role, 
            username: userData.username || (userData.role === 'admin' ? 'admin' : 'user')
          };
          setCurrentUser(userInfo);
        }
      }
    } catch (error) {
      // If token is invalid, clear it and log out user
      sessionStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log in a user
  const login = async (email, password, isAdmin = false) => {
    try {
      // Choose the right login endpoint
      const loginUrl = isAdmin ? '/api/admin/login' : '/api/auth/login';
      const response = await api.post(loginUrl, { email, password });
      
      const { token, user: userData } = response.data;
      
      // Save the token and set it for future requests
      sessionStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Handle admin login differently
      if (isAdmin && !userData) {
        try {
          // Get admin info from the token
          const tokenParts = token.split('.');
          const adminData = JSON.parse(atob(tokenParts[1]));
          const adminUser = {
            id: adminData.id,
            role: adminData.role || 'admin',
            username: adminData.username || 'admin'
          };
          setCurrentUser(adminUser);
        } catch (tokenError) {
          // If token decoding fails, create a basic admin user
          setCurrentUser({ id: 'admin', role: 'admin', username: 'admin' });
        }
      } else {
        // For regular users, fetch complete profile to ensure we have all fields including image
        try {
          const tokenParts = token.split('.');
          const tokenData = JSON.parse(atob(tokenParts[1]));
          const profileResponse = await api.get(`/api/auth/profile/${tokenData.id}`);
          // Ensure the user object has both _id and id for consistency
          const userProfile = {
            ...profileResponse.data,
            id: profileResponse.data._id || profileResponse.data.id
          };
          setCurrentUser(userProfile);
        } catch (profileError) {
          // If profile fetch fails, use the user data from login response
          setCurrentUser(userData);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  // Function to register a new user
  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      
      const { token, user: newUser } = response.data;
      
      // Save the token and set it for future requests
      sessionStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(newUser);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  // Function to log out the user
  const logout = () => {
    // Clear the saved token
    sessionStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  // All the functions and data we want to share
  const value = {
    user: currentUser,
    loading: isLoading,
    login,
    register,
    logout,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
