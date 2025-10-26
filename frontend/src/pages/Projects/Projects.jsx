import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axiosConfig';
import './Projects.css';

const Projects = () => {
  const { user } = useAuth();
  
  // State for projects and filters
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    status: '',
    skills: '',
    search: ''
  });

  // Load projects when component mounts
  useEffect(() => {
    loadProjects();
  }, []);

  // Get projects from the server
  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterOptions.status) params.append('status', filterOptions.status);
      if (filterOptions.skills) params.append('skills', filterOptions.skills);
      if (filterOptions.search) params.append('search', filterOptions.search);

      const response = await api.get(`/api/projects?${params.toString()}`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilterOptions({
      ...filterOptions,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = () => {
    loadProjects();
  };

  if (isLoading) {
    return <div className="isLoading">Loading projects...</div>;
  }

  return (
    <div className="container">
      <div className="flex-between mb-20">
        <h1>Projects</h1>
        {user && user.role === 'client' && (
          <Link to="/create-project" className="btn btn-primary">Post New Project</Link>
        )}
      </div>

      <div className="card mb-20">
        <h3>Filters</h3>
        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="status"
              className="form-select"
              value={filterOptions.status}
              onChange={handleFilterChange}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Completed and Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Skills</label>
            <input
              type="text"
              name="skills"
              className="form-input"
              value={filterOptions.skills}
              onChange={handleFilterChange}
              placeholder="e.g., React, Node.js, Python"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              name="search"
              className="form-input"
              value={filterOptions.search}
              onChange={handleFilterChange}
              placeholder="Search projects..."
            />
          </div>
        </div>
        <div className="mt-15">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        {projects.length > 0 ? (
          projects.map(project => (
            <div key={project._id} className="card">
              <div className="flex-between mb-10">
                <Link to={`/projects/${project._id}`} className="project-title-link">
                  <h3>{project.title}</h3>
                </Link>
                <span className={`status-badge status-${project.status}`}>
                  {project.status === 'closed' ? 'completed and closed' : 
                   project.status === 'cancelled' ? 'cancelled' : 
                   project.status.replace('_', ' ')}
                </span>
              </div>
              
              <p className="project-description">
                {project.description.substring(0, 200)}...
              </p>
              
              <div className="mb-10">
                <strong>Budget:</strong> ₹{project.budget}
              </div>
              
              {project.requiredSkills && project.requiredSkills.length > 0 && (
                <div className="mb-10">
                  <strong>Required Skills:</strong>
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
                <div>
                  <strong>Client:</strong> 
                  <Link 
                    to={`/profile/${project.clientId?._id}`}
                    className="client-link"
                  >
                    {project.clientId?.username}
                  </Link>
                </div>
                <div className="project-meta">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="mt-10">
                <Link to={`/projects/${project._id}`} className="btn btn-primary">
                  View Details
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center">
            <h3>No projects found</h3>
            <p>Try adjusting your filters or check back later for new projects.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
