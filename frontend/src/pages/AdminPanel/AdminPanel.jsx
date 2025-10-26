import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/axiosConfig';
import './AdminPanel.css';

const AdminPanel = () => {
  // State for admin panel
  const [currentTab, setCurrentTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data when tab changes
  useEffect(() => {
    loadData();
  }, [currentTab]);

  // Get data from the server
  const loadData = async () => {
    try {
      setIsLoading(true);
      if (currentTab === 'users') {
        const response = await api.get('/api/admin/users');
        setUsers(response.data);
      } else if (currentTab === 'projects') {
        const response = await api.get('/api/admin/projects');
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      try {
        const response = await api.put(`/api/admin/users/${userId}/suspend`);
        
        // Get the suspended user info from response
        const suspendedUser = response.data.user;
        
        // Get all projects involving this user
        const projectsResponse = await api.get('/api/projects');
        const allProjects = projectsResponse.data;
        
        // Find active projects where this user is involved
        const activeProjects = allProjects.filter(project => {
          const isClientSuspended = project.clientId?._id === userId || project.clientId === userId;
          const isFreelancerSuspended = project.freelancerId?._id === userId || project.freelancerId === userId;
          const isActiveProject = project.status === 'in_progress' || project.status === 'completed';
          return (isClientSuspended || isFreelancerSuspended) && isActiveProject;
        });
        
        // Send notifications to all partners in active projects
        activeProjects.forEach(project => {
          const clientId = project.clientId?._id || project.clientId;
          const freelancerId = project.freelancerId?._id || project.freelancerId;
          
          // Determine who to notify (the other party)
          const notifyUserId = clientId === userId ? freelancerId : clientId;
          
          if (notifyUserId) {
            const notification = {
              id: Date.now() + Math.random(),
              from: 'platform',
              to: notifyUserId,
              content: `${suspendedUser.username} has been suspended by administration`,
              timestamp: new Date().toISOString(),
              fromUsername: 'FreelanceHub Platform',
              toUsername: 'User',
              projectId: project._id,
              type: 'platform_notification',
              isRead: false
            };
            
            // Add to platform notifications
            const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
            existingNotifications.push(notification);
            localStorage.setItem('platformNotifications', JSON.stringify(existingNotifications));
          }
        });
        
        loadData(); // Refresh data
        alert(`User suspended successfully. ${activeProjects.length} partner(s) notified.`);
      } catch (error) {
        console.error('Error suspending user:', error);
        alert('Error suspending user');
      }
    }
  };

  const handleUnsuspendUser = async (userId) => {
    if (window.confirm('Are you sure you want to unsuspend this user?')) {
      try {
        await api.put(`/api/admin/users/${userId}/unsuspend`);
        loadData(); // Refresh data
        alert('User unsuspended successfully');
      } catch (error) {
        console.error('Error unsuspending user:', error);
        alert('Error unsuspending user');
      }
    }
  };

  if (isLoading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="container">
      <h1>Admin Panel</h1>
      
      <div className="card mb-20">
        <div className="flex gap-20">
          <button
            className={`btn ${currentTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            className={`btn ${currentTab === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('projects')}
          >
            Projects ({projects.length})
          </button>
        </div>
      </div>

      {currentTab === 'users' && (
        <div className="card">
          <h3>User Management</h3>
          <div className="admin-user-management">
            {/* Clients Section */}
            <div className="user-group">
              <h4 className="user-group-title">
                <span className="user-group-icon">👥</span>
                Clients ({users.filter(user => user.role === 'client').length})
              </h4>
              <div className="user-group-content">
                {users.filter(user => user.role === 'client').map(user => (
                  <div key={user._id} className="mb-20 user-card">
                    <div className="flex-between mb-10">
                      <h4>{user.username}</h4>
                      <span className={`status-badge ${user.isActive ? 'status-accepted' : 'status-rejected'}`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    
                    <div className="mb-10">
                      <strong>Email:</strong> {user.email}
                    </div>
                    
                    <div className="mb-10">
                      <strong>Role:</strong> {user.role}
                    </div>
                    
                    {user.profile && (
                      <div className="mb-10">
                        <strong>Name:</strong> {user.profile.name}
                        {user.profile.company && (
                          <span> | <strong>Company:</strong> {user.profile.company}</span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex-between">
                      <div className="user-info">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex gap-10">
                        {user.isActive ? (
                          <button
                            className="btn btn-danger"
                            onClick={() => handleSuspendUser(user._id)}
                          >
                            Suspend User
                          </button>
                        ) : (
                          <button
                            className="btn btn-success"
                            onClick={() => handleUnsuspendUser(user._id)}
                          >
                            Unsuspend User
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {users.filter(user => user.role === 'client').length === 0 && (
                  <div className="no-users-message">
                    <p>No clients found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Freelancers Section */}
            <div className="user-group">
              <h4 className="user-group-title">
                <span className="user-group-icon">💼</span>
                Freelancers ({users.filter(user => user.role === 'freelancer').length})
              </h4>
              <div className="user-group-content">
                {users.filter(user => user.role === 'freelancer').map(user => (
                  <div key={user._id} className="mb-20 user-card">
                    <div className="flex-between mb-10">
                      <h4>{user.username}</h4>
                      <span className={`status-badge ${user.isActive ? 'status-accepted' : 'status-rejected'}`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    
                    <div className="mb-10">
                      <strong>Email:</strong> {user.email}
                    </div>
                    
                    <div className="mb-10">
                      <strong>Role:</strong> {user.role}
                    </div>
                    
                    {user.profile && (
                      <div className="mb-10">
                        <strong>Name:</strong> {user.profile.name}
                        {user.profile.hourlyRate && (
                          <span> | <strong>Rate:</strong> ₹{user.profile.hourlyRate}/hr</span>
                        )}
                      </div>
                    )}
                    
                    {user.profile?.skills && user.profile.skills.length > 0 && (
                      <div className="mb-10">
                        <strong>Skills:</strong>
                        <div className="flex flex-wrap gap-10 mt-5">
                          {user.profile.skills.map((skill, index) => (
                            <span key={index} className="skill-badge">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-between">
                      <div className="user-info">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex gap-10">
                        {user.isActive ? (
                          <button
                            className="btn btn-danger"
                            onClick={() => handleSuspendUser(user._id)}
                          >
                            Suspend User
                          </button>
                        ) : (
                          <button
                            className="btn btn-success"
                            onClick={() => handleUnsuspendUser(user._id)}
                          >
                            Unsuspend User
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {users.filter(user => user.role === 'freelancer').length === 0 && (
                  <div className="no-users-message">
                    <p>No freelancers found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'projects' && (
        <div className="card">
          <h3>Project Management</h3>
          <div className="grid grid-2">
            {projects.map(project => (
              <div key={project._id} className="mb-20 admin-project-card">
                <div className="flex-between mb-10">
                  <h4>{project.title}</h4>
                  <span className={`status-badge status-${project.status}`}>
                    {project.status === 'closed' ? 'completed and closed' : 
                     project.status === 'cancelled' ? 'cancelled' : 
                     project.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="mb-10">
                  <p className="project-description">{project.description.substring(0, 150)}...</p>
                </div>
                
                <div className="mb-10">
                  <strong>Budget:</strong> ₹{project.budget}
                </div>
                
                <div className="mb-10">
                  <strong>Client:</strong> 
                  <Link 
                    to={`/profile/${project.clientId?._id}`}
                    className="client-link"
                  >
                    {project.clientId?.username}
                  </Link>
                  {project.freelancerId && (
                    <span> | <strong>Freelancer:</strong> 
                      <Link 
                        to={`/profile/${project.freelancerId._id}`}
                        className="client-link"
                      >
                        {project.freelancerId.username}
                      </Link>
                    </span>
                  )}
                </div>
                
                {project.requiredSkills && project.requiredSkills.length > 0 && (
                  <div className="mb-10">
                    <strong>Skills:</strong>
                    <div className="flex flex-wrap gap-10 mt-5">
                      {project.requiredSkills.map((skill, index) => (
                        <span key={index} className="skill-badge">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex-between">
                  <div className="user-info">
                    Posted: {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
