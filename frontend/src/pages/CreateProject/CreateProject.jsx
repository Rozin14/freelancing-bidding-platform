import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './CreateProject.css';

const CreateProject = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    requiredSkills: [],
    deadline: ''
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoadingProject(true);
      const response = await axios.get(`/api/projects/${id}`);
      const project = response.data;
      
      // Check if user is the owner of the project
      if (user?.role !== 'client' || project.clientId._id !== user.id) {
        setError('You are not authorized to edit this project');
        return;
      }

      // Check if project can be edited
      if (project.status === 'closed' || project.status === 'cancelled') {
        setError('This project cannot be edited as it is closed or cancelled');
        return;
      }

      // Populate form with existing project data
      setFormData({
        title: project.title || '',
        description: project.description || '',
        budget: project.budget?.toString() || '',
        requiredSkills: project.requiredSkills || [],
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      setError(error.response?.data?.message || 'Error loading project');
    } finally {
      setLoadingProject(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSkillsChange = (e) => {
    setSkillsInput(e.target.value);
  };

  const addSkill = () => {
    if (skillsInput.trim() && !formData.requiredSkills.includes(skillsInput.trim())) {
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, skillsInput.trim()]
      });
      setSkillsInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter(s => s !== skill)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const projectData = {
        ...formData,
        budget: parseFloat(formData.budget),
        deadline: formData.deadline ? new Date(formData.deadline) : null
      };

      if (isEditMode) {
        // Update existing project
        await axios.put(`/api/projects/${id}`, projectData);
        navigate(`/projects/${id}`);
      } else {
        // Create new project
        const response = await axios.post('/api/projects', projectData);
        navigate(`/projects/${response.data._id}`);
      }
    } catch (error) {
      setError(error.response?.data?.message || `Error ${isEditMode ? 'updating' : 'creating'} project`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="container">
        <div className="flex-center create-project-container">
          <div className="loading">Loading project details...</div>
        </div>
      </div>
    );
  }

  if (error && (error.includes('not authorized') || error.includes('cannot be edited'))) {
    return (
      <div className="container">
        <div className="flex-center create-project-container">
          <div className="card create-project-card">
            <div className="alert alert-error text-center">
              {error}
            </div>
            <div className="text-center mt-20">
              <button
                className="btn btn-secondary"
                onClick={() => navigate(isEditMode ? `/projects/${id}` : '/projects')}
              >
                Back to {isEditMode ? 'Project' : 'Projects'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex-center create-project-container">
        <div className="card create-project-card">
          <h2 className="text-center mb-20">{isEditMode ? 'Edit Project' : 'Create New Project'}</h2>
          
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project Title</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter project title"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Describe your project in detail..."
                rows="6"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Budget (₹)</label>
              <input
                type="number"
                name="budget"
                className="form-input"
                value={formData.budget}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="Enter your budget"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Required Skills</label>
              <div className="flex gap-10">
                <input
                  type="text"
                  className="form-input"
                  value={skillsInput}
                  onChange={handleSkillsChange}
                  placeholder="Add a required skill"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addSkill}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-10 mt-10">
                {formData.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="status-badge status-open skill-tag-removable"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill} ×
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Deadline (Optional)</label>
              <input
                type="date"
                name="deadline"
                className="form-input"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-10">
              <button
                type="submit"
                className="btn btn-primary btn-flex"
                disabled={loading}
              >
                {loading 
                  ? (isEditMode ? 'Updating Project...' : 'Creating Project...') 
                  : (isEditMode ? 'Update Project' : 'Create Project')
                }
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-flex"
                onClick={() => navigate(isEditMode ? `/projects/${id}` : '/projects')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
