import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      // Get user info from token since dashboard doesn't return user data
      const token = localStorage.getItem('token');
      if (token) {
        // Decode token to get user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userInfo = { 
          id: payload.id, 
          role: payload.role, 
          username: payload.username || (payload.role === 'admin' ? 'admin' : 'user')
        };
        setUser(userInfo);
      }
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, isAdmin = false) => {
    try {
      const endpoint = isAdmin ? '/api/admin/login' : '/api/auth/login';
      const response = await axios.post(endpoint, { email, password });
      
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // For admin login, create user object from token since backend doesn't return user data
      if (isAdmin && !userData) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const adminUser = {
            id: payload.id,
            role: payload.role || 'admin',
            username: payload.username || 'admin'
          };
          console.log('Admin login successful:', adminUser);
          setUser(adminUser);
        } catch (tokenError) {
          console.error('Error decoding admin token:', tokenError);
          setUser({ id: 'admin', role: 'admin', username: 'admin' });
        }
      } else {
        setUser(userData);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      
      const { token, user: newUser } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(newUser);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
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
