import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getEscrowNotificationsCount } from '../../utils/escrowManager';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for notification counts
  const [messageCount, setMessageCount] = useState(0);
  const [escrowCount, setEscrowCount] = useState(0);

  // Function to check if a link is active
  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true; // Home page is considered dashboard
    }
    if (path === '/profile' && location.pathname.startsWith('/profile/')) {
      return true; // Any profile page
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Update notification counts when user changes
  useEffect(() => {
    const updateNotificationCounts = () => {
      if (user && user.role !== 'admin') {
        let totalCount = 0;
        
        // Count platform notifications for this user
        const savedNotifications = localStorage.getItem('platformNotifications');
        if (savedNotifications) {
          const allNotifications = JSON.parse(savedNotifications);
          const userNotifications = allNotifications.filter(notification => 
            (notification.to === user.id || notification.toUserId === user.id) && !notification.isRead
          );
          totalCount += userNotifications.length;
        }
        
        // Count admin messages for this user
        const savedMessages = localStorage.getItem('messages');
        if (savedMessages) {
          const allMessages = JSON.parse(savedMessages);
          const unreadAdminMessages = allMessages.filter(msg => {
            if (!msg.isAdminMessage) return false;
            
            if (user.role === 'client') {
              const isUserInvolved = msg.clientId === user.id || msg.to === user.id || msg.from === user.id;
              return isUserInvolved && !msg.isReadByClient;
            } else if (user.role === 'freelancer') {
              const isUserInvolved = msg.freelancerId === user.id || msg.to === user.id || msg.from === user.id;
              return isUserInvolved && !msg.isReadByFreelancer;
            }
            return false;
          });
          totalCount += unreadAdminMessages.length;
        }
        
        setMessageCount(totalCount);
      } else if (user && user.role === 'admin') {
        // Count disputes for admin
        const savedDisputes = localStorage.getItem('disputes');
        if (savedDisputes) {
          const allDisputes = JSON.parse(savedDisputes);
          const unreadDisputes = allDisputes.filter(dispute => !dispute.isReadByAdmin);
          setMessageCount(unreadDisputes.length);
        } else {
          setMessageCount(0);
        }
        
        // Count escrow notifications for admin
        setEscrowCount(getEscrowNotificationsCount());
      } else {
        setMessageCount(0);
        setEscrowCount(0);
      }
    };

    updateNotificationCounts();
    
    // Listen for changes in storage to update counts
    const handleStorageChange = () => {
      updateNotificationCounts();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check for updates every second
    const timer = setInterval(updateNotificationCounts, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(timer);
    };
  }, [user]);

  // Handle user logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-background"></div>
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="brand-link">
            <div className="brand-logo">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="brand-text">FreelanceHub</span>
            </div>
          </Link>
          
          <div className="navbar-menu">
            {user ? (
              <>
                <div className="nav-links">
                  {user.role !== 'admin' && (
                    <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Dashboard
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`}>
                      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Admin Panel
                    </Link>
                  )}
                  <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Projects
                  </Link>
                  <Link to="/messages" className={`nav-link messages-link ${isActive('/messages') ? 'active' : ''}`}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Messages
                    {messageCount > 0 && (
                      <span className="notification-badge">
                        {messageCount > 99 ? '99+' : messageCount}
                      </span>
                    )}
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/escrow" className={`nav-link escrow-link ${isActive('/escrow') ? 'active' : ''}`}>
                      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 11.6312 16.9749 10.9749C17.6312 10.3185 18 9.42826 18 8.5C18 7.57174 17.6312 6.6815 16.9749 6.02513C16.3185 5.36875 15.4283 5 14.5 5H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Escrow
                      {escrowCount > 0 && (
                        <span className="notification-badge">
                          {escrowCount > 99 ? '99+' : escrowCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {user.role === 'client' && (
                    <Link to="/create-project" className={`nav-link primary-link ${isActive('/create-project') ? 'active' : ''}`}>
                      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Post Project
                    </Link>
                  )}
                </div>
                
                <div className="user-section">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.image && !user.image.includes('/img/no-image.png') ? (
                        <img 
                          src={user.image} 
                          alt={`${user.username}'s profile`}
                          className="user-profile-image"
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </div>
                    <div className="user-details">
                      <Link 
                        to={`/profile/${user.id}`}
                        className="username-link"
                      >
                        {user.username}
                      </Link>
                      <span className="user-role">{user.role}</span>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="logout-btn">
                    <svg className="logout-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="auth-links">
                <Link to="/login" className="auth-link primary">
                  <svg className="auth-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Login
                </Link>
                <Link to="/register" className="auth-link secondary">
                  <svg className="auth-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2"/>
                    <line x1="17" y1="11" x2="23" y2="11" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Register
                </Link>
                <Link to="/admin/login" className="auth-link admin">
                  <svg className="auth-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Admin
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
