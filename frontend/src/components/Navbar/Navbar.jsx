import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getEscrowNotificationsCount } from '../../utils/escrowManager';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [escrowNotificationCount, setEscrowNotificationCount] = useState(0);

  useEffect(() => {
    const loadNotificationCount = () => {
      if (user && user.role !== 'admin') {
        let count = 0;
        
        // Count unread platform notifications
        const storedNotifications = localStorage.getItem('platformNotifications');
        if (storedNotifications) {
          const notifications = JSON.parse(storedNotifications);
          const userNotifications = notifications.filter(notification => 
            (notification.to === user.id || notification.toUserId === user.id) && !notification.isRead
          );
          count += userNotifications.length;
        }
        
        // Count unread admin messages
        const storedMessages = localStorage.getItem('messages');
        if (storedMessages) {
          const messages = JSON.parse(storedMessages);
          const unreadAdminMessages = messages.filter(msg => {
            // Check if it's an admin message
            if (!msg.isAdminMessage) return false;
            
            // For clients, check messages where client is involved
            if (user.role === 'client') {
              // Check if user is the clientId in the message
              const isInvolved = msg.clientId === user.id || msg.to === user.id || msg.from === user.id;
              return isInvolved && !msg.isReadByClient;
            } 
            // For freelancers, check messages where freelancer is involved
            else if (user.role === 'freelancer') {
              // Check if user is the freelancerId in the message
              const isInvolved = msg.freelancerId === user.id || msg.to === user.id || msg.from === user.id;
              return isInvolved && !msg.isReadByFreelancer;
            }
            return false;
          });
          console.log('Navbar - Unread admin messages:', unreadAdminMessages);
          count += unreadAdminMessages.length;
        }
        
        setNotificationCount(count);
      } else if (user && user.role === 'admin') {
        // For admins, count unread disputes
        const storedDisputes = localStorage.getItem('disputes');
        if (storedDisputes) {
          const disputes = JSON.parse(storedDisputes);
          const unreadDisputes = disputes.filter(dispute => !dispute.isReadByAdmin);
          setNotificationCount(unreadDisputes.length);
        } else {
          setNotificationCount(0);
        }
        
        // Count escrow notifications for admin
        setEscrowNotificationCount(getEscrowNotificationsCount());
      } else {
        setNotificationCount(0);
        setEscrowNotificationCount(0);
      }
    };

    loadNotificationCount();
    
    // Listen for storage changes to update notification count
    const handleStorageChange = () => {
      loadNotificationCount();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes (in case of same-tab updates)
    const interval = setInterval(loadNotificationCount, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" className="navbar">
      <div className="container">
        <div className="flex-between navbar-container">
          <Link to="/" className="brand-link">
            FreelanceHub
          </Link>
          
          <div className="flex gap-20">
            {user ? (
              <>
                {user.role !== 'admin' && (
                  <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="btn btn-primary">Admin Panel</Link>
                )}
                <Link to="/projects" className="btn btn-secondary">Projects</Link>
                <Link to="/messages" className="btn btn-secondary messages-link">
                  Messages and Dispute
                  {notificationCount > 0 && (
                    <span className="notification-badge">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </Link>
                {user.role === 'admin' && (
                  <Link to="/escrow" className="btn btn-secondary escrow-link">
                    💰 Escrow
                    {escrowNotificationCount > 0 && (
                      <span className="notification-badge">
                        {escrowNotificationCount > 99 ? '99+' : escrowNotificationCount}
                      </span>
                    )}
                  </Link>
                )}
                
                {user.role === 'client' && (
                  <Link to="/create-project" className="btn btn-primary">Post Project</Link>
                )}
                
                <div className="flex gap-10">
                  <span className="welcome-text">
                    Welcome,{' '}
                    <Link 
                      to={`/profile/${user.id}`}
                      className="profile-link"
                    >
                      {user.username}
                    </Link>
                    {' '}({user.role})
                  </span>
                  <button onClick={handleLogout} className="btn btn-danger">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary">Login</Link>
                <Link to="/register" className="btn btn-secondary">Register</Link>
                <Link to="/admin/login" className="btn btn-secondary">Admin</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
