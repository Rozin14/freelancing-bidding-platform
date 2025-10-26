import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axiosConfig';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for dashboard information
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data when user is available
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Get dashboard data from the server
  const loadDashboardData = async () => {
    try {
      const response = await api.get('/api/auth/dashboard');
      setUserData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty data if there's an error
      setUserData({
        projects: [],
        bids: [],
        reviews: [],
        stats: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalBids: 0,
          acceptedBids: 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone and all associated bids will be lost.')) {
      return;
    }

    try {
      await api.delete(`/api/projects/${projectId}`);
      alert('Project deleted successfully!');
      loadDashboardData(); // Refresh dashboard data
    } catch (error) {
      console.error('Error deleting project:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting project. Please try again.';
      alert(errorMessage);
    }
  };

  // Show loading if user is not yet loaded or dashboard data is being fetched
  if (!user || isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!userData) {
    return <div className="container">Error loading dashboard data</div>;
  }

  return (
    <>
      <div className="container">
        <h1>Dashboard</h1>
        <p>Welcome, {user.username}!</p>

      {user.role === 'client' && (
        <div>
          <div className="grid grid-3 mb-20">
            <div className="card text-center">
              <h3>{userData.stats?.totalProjects || 0}</h3>
              <p>Total Projects</p>
            </div>
            <div className="card text-center">
              <h3>{userData.stats?.activeProjects || 0}</h3>
              <p>Active Projects</p>
            </div>
            <div className="card text-center">
              <h3>{userData.stats?.completedProjects || 0}</h3>
              <p>Completed Projects</p>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>My Projects</h3>
              {userData.projects?.length > 0 ? (
                <div>
                  {userData.projects.slice(0, 5).map(project => (
                    <div key={project._id} className="mb-20 project-card">
                      <div className="flex-between">
                        <div className="flex gap-10 align-center">
                          <Link to={`/projects/${project._id}`} className="project-link">
                            <strong>{project.title}</strong>
                          </Link>
                          {/* Show bid count badge only if there are pending bids and no bid is accepted */}
                          {project.bidCount > 0 && !project.hasAcceptedBid && (
                            <span className="bid-count-badge">
                              {project.bidCount} bid{project.bidCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <span className={`status-badge status-${project.status}`}>
                          {project.status === 'closed' ? 'completed and closed' : 
                           project.status === 'cancelled' ? 'cancelled' : 
                           project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="project-description">{project.description.substring(0, 100)}...</p>
                      <div className="flex-between-center">
                        <p className="review-date">
                          Budget: ₹{project.budget} | Posted: {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                        {/* Delete button - only for open and cancelled projects */}
                        {(project.status === 'open' || project.status === 'cancelled') && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteProject(project._id);
                            }}
                            className="btn-delete-project"
                            style={{ marginLeft: '10px' }}
                            title="Delete Project"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {userData.projects.length > 5 && (
                    <Link to="/projects" className="btn btn-secondary">View All Projects</Link>
                  )}
                </div>
              ) : (
                <p>No projects yet. <Link to="/create-project">Create your first project</Link></p>
              )}
            </div>

            <div className="card">
              <h3>Recent Bids</h3>
              {userData.bids?.length > 0 ? (
                <div>
                  {userData.bids.slice(0, 5).map(bid => (
                    <div 
                      key={bid._id} 
                      className="mb-20 bid-card-clickable bid-card-container"
                      onClick={() => navigate(`/projects/${bid.projectId}/bids/${bid._id}`)}
                    >
                      <div className="flex-between">
                        <div className="flex gap-10">
                          <Link
                            to={`/profile/${bid.freelancerId?._id}`}
                            className="freelancer-link"
                          >
                            {bid.freelancerId?.username}
                          </Link>
                        </div>
                        <span className={`status-badge status-${bid.status}`}>
                          {bid.status === 'accepted' ? 'Assigned' : bid.status}
                        </span>
                      </div>
                      <p className="project-description">
                        {bid.proposal.substring(0, 100)}...
                      </p>
                      <p className="review-date">
                        Amount: ₹{bid.amount} | Timeline: {bid.timeline} | Bid Date: {new Date(bid.createdAt).toLocaleDateString()} {new Date(bid.createdAt).toLocaleTimeString()}
                      </p>
                      <div className="bid-actions bid-actions-container">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${bid.projectId}/bids/${bid._id}`);
                          }}
                        >
                          View Full Bid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No bids received yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {user.role === 'freelancer' && (
        <div>
          <div className="grid grid-4 mb-20">
            <div className="card text-center">
              <h3>{userData.stats?.totalBids || 0}</h3>
              <p>Total Bids</p>
            </div>
            <div className="card text-center">
              <h3>{userData.stats?.acceptedBids || 0}</h3>
              <p>Assigned Bids</p>
            </div>
            <div className="card text-center">
              <h3>{userData.stats?.activeProjects || 0}</h3>
              <p>Active Projects</p>
            </div>
            <div className="card text-center">
              <h3>{userData.stats?.projectsDone || 0}</h3>
              <p>Projects Done</p>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>My Bids</h3>
              {userData.bids?.length > 0 ? (
                <div>
                  {userData.bids.slice(0, 5).map(bid => (
                    <div key={bid._id} className="mb-20 project-card">
                      <div className="flex-between">
                        <Link to={`/projects/${bid.projectId?._id}`} className="project-link">
                          <strong>{bid.projectId?.title}</strong>
                        </Link>
                        <span className={`status-badge status-${bid.status}`}>
                          {bid.status === 'accepted' ? 'Assigned' : bid.status}
                        </span>
                      </div>
                      <p className="project-description">{bid.proposal.substring(0, 100)}...</p>
                      <p className="review-date">
                        Amount: ₹{bid.amount} | Timeline: {bid.timeline} | Bid Date: {new Date(bid.createdAt).toLocaleDateString()} {new Date(bid.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No bids placed yet. <Link to="/projects">Browse projects</Link></p>
              )}
            </div>

            <div className="card">
              <h3>My Projects</h3>
              {userData.projects?.length > 0 ? (
                <div>
                  {userData.projects.slice(0, 5).map(project => (
                    <div key={project._id} className="mb-20 project-card">
                      <div className="flex-between">
                        <Link to={`/projects/${project._id}`} className="project-link">
                          <strong>{project.title}</strong>
                        </Link>
                        <span className={`status-badge status-${project.status}`}>
                          {project.status === 'closed' ? 'completed and closed' : 
                           project.status === 'cancelled' ? 'cancelled' : 
                           project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="project-description">{project.description.substring(0, 100)}...</p>
                      <p className="review-date">
                        Client: 
                        <Link 
                          to={`/profile/${project.clientId?._id}`}
                          className="freelancer-link"
                        >
                          {project.clientId?.username}
                        </Link>
                        {' '}| Budget: ₹{project.budget}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No projects assigned yet.</p>
              )}
            </div>
          </div>

          {userData.reviews?.length > 0 && (
            <div className="card">
              <h3>Recent Reviews</h3>
              {userData.reviews.slice(0, 3).map(review => (
                <div key={review._id} className="mb-20 project-card">
                  <div className="flex-between">
                    <Link
                      to={`/profile/${review.clientId?._id}`}
                      className="freelancer-link"
                    >
                      {review.clientId?.username}
                    </Link>
                    <span>⭐ {review.rating}/5</span>
                  </div>
                  <p className="project-description">{review.comment}</p>
                  <p className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
};

export default Dashboard;
