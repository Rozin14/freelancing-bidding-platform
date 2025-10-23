import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'users') {
        const response = await axios.get('/api/admin/users');
        setUsers(response.data);
      } else if (activeTab === 'projects') {
        const response = await axios.get('/api/admin/projects');
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      try {
        const response = await axios.put(`/api/admin/users/${userId}/suspend`);
        
        // Get the suspended user info from response
        const suspendedUser = response.data.user;
        
        // Get all projects involving this user
        const projectsResponse = await axios.get('/api/projects');
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
        
        fetchData(); // Refresh data
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
        await axios.put(`/api/admin/users/${userId}/unsuspend`);
        fetchData(); // Refresh data
        alert('User unsuspended successfully');
      } catch (error) {
        console.error('Error unsuspending user:', error);
        alert('Error unsuspending user');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="container">
      <h1>Admin Panel</h1>
      
      <div className="card mb-20">
        <div className="flex gap-20">
          <button
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects ({projects.length})
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="card">
          <h3>User Management</h3>
          <div className="grid grid-2">
            {users.map(user => (
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
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="card">
          <h3>Project Management</h3>
          <div className="grid grid-2">
            {projects.map(project => (
              <div key={project._id} className="mb-20 project-card">
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
