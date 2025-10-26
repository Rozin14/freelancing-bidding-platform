import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';
import api from '../../utils/axiosConfig';
import './Register.css';

const Register = ({ id, onUpdate, onClose }) => {
  const isEditMode = Boolean(id);
  
  // State for form inputs
  const [userForm, setUserForm] = useState({
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
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [currentSkill, setCurrentSkill] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Fetch user data when in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true);
      const response = await api.get(`/api/auth/profile/${id}`);
      const userData = response.data;
      
      setUserForm({
        username: userData.username || '',
        email: userData.email || '',
        password: '', // Don't pre-fill password
        confirmPassword: '', // Don't pre-fill password
        role: userData.role || '',
        profile: {
          name: userData.profile?.name || '',
          company: userData.profile?.company || '',
          skills: userData.profile?.skills || [],
          hourlyRate: userData.profile?.hourlyRate || '',
          bio: userData.profile?.bio || ''
        }
      });
      setImagePreview(userData.image || null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setErrorMessage(error.response?.data?.message || 'Error loading user data');
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Image upload functions
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
      // Don't upload immediately - wait for form submission
    }
  };

  // Upload image to server
  const uploadImage = async (file) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.url) {
        return response.data.url;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    // No need to update userForm.image since we handle it during submission
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setUserForm({
        ...userForm,
        profile: {
          ...userForm.profile,
          [profileField]: value
        }
      });
    } else {
      setUserForm({
        ...userForm,
        [name]: value
      });
    }
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setUserForm({
      ...userForm,
      role: role,
      profile: {
        name: userForm.profile.name,
        company: role === 'client' ? userForm.profile.company : '',
        skills: role === 'freelancer' ? userForm.profile.skills : [],
        hourlyRate: role === 'freelancer' ? userForm.profile.hourlyRate : '',
        bio: userForm.profile.bio
      }
    });
  };

  const handleSkillsChange = (e) => {
    setCurrentSkill(e.target.value);
  };

  const addSkill = () => {
    if (currentSkill.trim() && !userForm.profile.skills.includes(currentSkill.trim())) {
      setUserForm({
        ...userForm,
        profile: {
          ...userForm.profile,
          skills: [...userForm.profile.skills, currentSkill.trim()]
        }
      });
      setCurrentSkill('');
    }
  };

  const removeSkill = (skill) => {
    setUserForm({
      ...userForm,
      profile: {
        ...userForm.profile,
        skills: userForm.profile.skills.filter(s => s !== skill)
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!userForm.role) {
      setErrorMessage('Please select a role');
      return;
    }

    if (!userForm.username.trim()) {
      setErrorMessage('Username is required');
      return;
    }

    if (!userForm.email.trim()) {
      setErrorMessage('Email is required');
      return;
    }

    if (!userForm.profile.name.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    // Password validation only for registration, not for edit
    if (!isEditMode) {
      if (userForm.password !== userForm.confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }

      if (userForm.password.length < 6) {
        setErrorMessage('Password must be at least 6 characters');
        return;
      }
    }

    if (userForm.role === 'freelancer' && userForm.profile.skills.length === 0) {
      setErrorMessage('Please add at least one skill');
      return;
    }

    setIsLoading(true);

    try {
      // Upload image first if one is selected
      let imageUrl = '';
      if (profileImage) {
        imageUrl = await uploadImage(profileImage);
      }

      const { confirmPassword, ...userData } = userForm;
      // Add the uploaded image URL to user data
      const userDataWithImage = {
        ...userData,
        image: imageUrl
      };

      if (isEditMode) {
        // Update existing user profile
        const response = await api.put('/api/auth/profile', userDataWithImage);
        if (response.data.success) {
          if (onUpdate) {
            onUpdate(response.data.user);
          } else {
            navigate('/dashboard');
          }
          alert('Profile updated successfully!');
        } else {
          setErrorMessage(response.data.message || 'Failed to update profile');
        }
      } else {
        // Create new user
        const result = await register(userDataWithImage);
        
        if (result.success) {
          navigate('/dashboard');
        } else {
          setErrorMessage(result.message);
        }
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || `${isEditMode ? 'Profile update' : 'Registration'} failed. Please try again.`);
    }
    
    setIsLoading(false);
  };

  if (isLoadingUser) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="register-card">
            <div className="isLoading">Loading profile data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-background">
        <div className="register-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>
      
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">{isEditMode ? 'Edit Profile' : 'Join Our Community'}</h1>
            <p className="register-subtitle">{isEditMode ? 'Update your profile information' : 'Create your account and start your journey'}</p>
          </div>
          
          {errorMessage && (
            <div className="register-error">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Account Type
              </h3>
              <div className="form-group">
                <label className="form-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Choose Your Role
                </label>
                <select
                  name="role"
                  className="form-select"
                  value={userForm.role}
                  onChange={handleRoleChange}
                  required
                  disabled={isEditMode}
                >
                  <option value="">Select your role</option>
                  <option value="client">Client - I want to hire freelancers</option>
                  <option value="freelancer">Freelancer - I want to work on projects</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Basic Information
              </h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    className="form-input"
                    value={userForm.username}
                    onChange={handleChange}
                    placeholder="Choose a unique username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={userForm.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Full Name
                </label>
                <input
                  type="text"
                  name="profile.name"
                  className="form-input"
                  value={userForm.profile.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {!isEditMode && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                        <path d="M7 11V7A5 5 0 0 1 17 7V11" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      className="form-input"
                      value={userForm.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                        <path d="M7 11V7A5 5 0 0 1 17 7V11" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-input"
                      value={userForm.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16L8.586 11.414C8.961 11.039 9.47 10.828 10 10.828H14C14.53 10.828 15.039 11.039 15.414 11.414L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Profile Picture
              </h3>
              
              <div className="form-group">
                <label className="form-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C8.961 11.039 9.47 10.828 10 10.828H14C14.53 10.828 15.039 11.039 15.414 11.414L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload Profile Picture
                </label>
                
                {!imagePreview ? (
                  <div 
                    {...getRootProps()} 
                    className={`image-upload-zone ${isDragActive ? 'drag-active' : ''} ${isUploadingImage ? 'uploading' : ''}`}
                  >
                    <input {...getInputProps()} />
                    <div className="upload-content">
                      {isUploadingImage ? (
                        <>
                          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                            </circle>
                          </svg>
                          <p>Uploading...</p>
                        </>
                      ) : (
                        <>
                          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <p className="upload-text">
                            {isDragActive ? 'Drop the image here...' : 'Drag & drop an image here, or click to select'}
                          </p>
                          <p className="upload-hint">Supports: JPG, PNG, GIF, WebP (Max 5MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <div className="image-preview">
                      <img src={imagePreview} alt="Profile preview" className="preview-image" />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={removeImage}
                        disabled={isUploadingImage}
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="image-info">Profile picture uploaded successfully!</p>
                  </div>
                )}
              </div>
            </div>

            {userForm.role === 'client' && (
              <div className="form-section">
                <h3 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 21V7L13 2L21 7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Company Information
                </h3>
                <div className="form-group">
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 21V7L13 2L21 7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="profile.company"
                    className="form-input"
                    value={userForm.profile.company}
                    onChange={handleChange}
                    placeholder="Your company name (optional)"
                  />
                </div>
              </div>
            )}

            {userForm.role === 'freelancer' && (
              <div className="form-section">
                <h3 className="section-title">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 11.6312 16.9749 10.9749C17.6312 10.3185 18 9.42826 18 8.5C18 7.57174 17.6312 6.6815 16.9749 6.02513C16.3185 5.36875 15.4283 5 14.5 5H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Professional Details
                </h3>
                <div className="form-group">
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 11.6312 16.9749 10.9749C17.6312 10.3185 18 9.42826 18 8.5C18 7.57174 17.6312 6.6815 16.9749 6.02513C16.3185 5.36875 15.4283 5 14.5 5H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Hourly Rate (₹)
                  </label>
                  <input
                    type="number"
                    name="profile.hourlyRate"
                    className="form-input"
                    value={userForm.profile.hourlyRate}
                    onChange={handleChange}
                    placeholder="Your hourly rate"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Skills
                  </label>
                  <div className="skills-input-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      value={currentSkill}
                      onChange={handleSkillsChange}
                      placeholder="Add a skill (e.g., React, Python, Design)"
                    />
                    <button
                      type="button"
                      className="add-skill-btn"
                      onClick={addSkill}
                    >
                      <svg className="add-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Add
                    </button>
                  </div>
                  <div className="skills-container">
                    {userForm.profile.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="skill-tag"
                        onClick={() => removeSkill(skill)}
                      >
                        {skill}
                        <svg className="remove-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="form-section">
              <h3 className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                About You
              </h3>
              <div className="form-group">
                <label className="form-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Bio
                </label>
                <textarea
                  name="profile.bio"
                  className="form-textarea"
                  value={userForm.profile.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself, your experience, and what makes you unique..."
                  rows="4"
                />
              </div>
            </div>

            <button
              type="submit"
              className="register-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="loading-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  {isEditMode ? 'Updating Profile...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  <svg className="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="17" y1="11" x2="23" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isEditMode ? 'Update Profile' : 'Create Account'}
                </>
              )}
            </button>

            {isEditMode && onClose && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isLoading}
                style={{ marginTop: '10px', width: '100%' }}
              >
                Cancel
              </button>
            )}
          </form>

          <div className="register-footer">
            {!isEditMode && (
              <div className="register-links">
                <Link to="/login" className="login-link">
                  <svg className="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Already have an account? Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
