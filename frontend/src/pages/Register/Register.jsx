import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '', // Start with no role selected
    profile: {
      name: '',
      company: '',
      skills: [],
      hourlyRate: '',
      bio: ''
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData({
        ...formData,
        profile: {
          ...formData.profile,
          [profileField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData({
      ...formData,
      role: role,
      profile: {
        name: formData.profile.name,
        company: role === 'client' ? formData.profile.company : '',
        skills: role === 'freelancer' ? formData.profile.skills : [],
        hourlyRate: role === 'freelancer' ? formData.profile.hourlyRate : '',
        bio: formData.profile.bio
      }
    });
  };

  const handleSkillsChange = (e) => {
    setSkillsInput(e.target.value);
  };

  const addSkill = () => {
    if (skillsInput.trim() && !formData.profile.skills.includes(skillsInput.trim())) {
      setFormData({
        ...formData,
        profile: {
          ...formData.profile,
          skills: [...formData.profile.skills, skillsInput.trim()]
        }
      });
      setSkillsInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      profile: {
        ...formData.profile,
        skills: formData.profile.skills.filter(s => s !== skill)
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.role) {
      setError('Please select a role');
      return;
    }

    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.profile.name.trim()) {
      setError('Full name is required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.role === 'freelancer' && formData.profile.skills.length === 0) {
      setError('Please add at least one skill');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="container">
      <div className="flex-center register-container">
        <div className="card register-card">
          <h2 className="text-center mb-20">Register</h2>
          
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleRoleChange}
                required
              >
                <option value="">Select a role</option>
                <option value="client">Client</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="profile.name"
                className="form-input"
                value={formData.profile.name}
                onChange={handleChange}
                required
              />
            </div>

            {formData.role === 'client' && (
              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  type="text"
                  name="profile.company"
                  className="form-input"
                  value={formData.profile.company}
                  onChange={handleChange}
                />
              </div>
            )}

            {formData.role === 'freelancer' && (
              <>
                <div className="form-group">
                  <label className="form-label">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    name="profile.hourlyRate"
                    className="form-input"
                    value={formData.profile.hourlyRate}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Skills</label>
                  <div className="flex gap-10">
                    <input
                      type="text"
                      className="form-input"
                      value={skillsInput}
                      onChange={handleSkillsChange}
                      placeholder="Add a skill"
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
                    {formData.profile.skills.map((skill, index) => (
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
              </>
            )}

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                name="profile.bio"
                className="form-textarea"
                value={formData.profile.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full-width"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="text-center mt-20">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
