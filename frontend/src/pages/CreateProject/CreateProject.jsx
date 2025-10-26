import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axiosConfig';
import './CreateProject.css';

const CreateProject = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  
  // State for project form
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    budget: '',
    requiredSkills: [],
    deadline: ''
  });
  const [currentSkill, setCurrentSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setIsLoadingProject(true);
      const response = await api.get(`/api/projects/${id}`);
      const project = response.data;
      
      // Check if user is the owner of the project
      if (user?.role !== 'client' || project.clientId._id !== user.id) {
        setErrorMessage('You are not authorized to edit this project');
        return;
      }

      // Check if project can be edited
      if (project.status === 'closed' || project.status === 'cancelled') {
        setErrorMessage('This project cannot be edited as it is closed or cancelled');
        return;
      }

      // Populate form with existing project data
      setProjectForm({
        title: project.title || '',
        description: project.description || '',
        budget: project.budget?.toString() || '',
        requiredSkills: project.requiredSkills || [],
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
      });
    } catch (errorMessage) {
      console.error('Error fetching project:', errorMessage);
      setErrorMessage(errorMessage.response?.data?.message || 'Error loading project');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleChange = (e) => {
    setProjectForm({
      ...projectForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSkillsChange = (e) => {
    setCurrentSkill(e.target.value);
  };

  const addSkill = () => {
    if (currentSkill.trim() && !projectForm.requiredSkills.includes(currentSkill.trim())) {
      setProjectForm({
        ...projectForm,
        requiredSkills: [...projectForm.requiredSkills, currentSkill.trim()]
      });
      setCurrentSkill('');
    }
  };

  const removeSkill = (skill) => {
    setProjectForm({
      ...projectForm,
      requiredSkills: projectForm.requiredSkills.filter(s => s !== skill)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const projectData = {
        ...projectForm,
        budget: parseFloat(projectForm.budget),
        deadline: projectForm.deadline ? new Date(projectForm.deadline) : null
      };

      if (isEditMode) {
        // Update existing project
        await api.put(`/api/projects/${id}`, projectData);
        navigate(`/projects/${id}`);
      } else {
        // Create new project
        const response = await api.post('/api/projects', projectData);
        navigate(`/projects/${response.data._id}`);
      }
    } catch (errorMessage) {
      setErrorMessage(errorMessage.response?.data?.message || `Error ${isEditMode ? 'updating' : 'creating'} project`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="container">
        <div className="flex-center create-project-container">
          <div className="isSubmitting">Loading project details...</div>
        </div>
      </div>
    );
  }

  if (errorMessage && (errorMessage.includes('not authorized') || errorMessage.includes('cannot be edited'))) {
    return (
      <div className="container">
        <div className="flex-center create-project-container">
          <div className="card create-project-card">
            <div className="alert alert-errorMessage text-center">
              {errorMessage}
            </div>
            <div className="text-center mt-20">
              <button
                className="btn btn-danger"
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
          
          {errorMessage && (
            <div className="alert alert-errorMessage">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project Title</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={projectForm.title}
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
                value={projectForm.description}
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
                value={projectForm.budget}
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
                  value={currentSkill}
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
                {projectForm.requiredSkills.map((skill, index) => (
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
                value={projectForm.deadline}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-10">
              <button
                type="submit"
                className="btn btn-primary btn-flex"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? (isEditMode ? 'Updating Project...' : 'Creating Project...') 
                  : (isEditMode ? 'Update Project' : 'Create Project')
                }
              </button>
              <button
                type="button"
                className="btn btn-danger btn-flex"
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
