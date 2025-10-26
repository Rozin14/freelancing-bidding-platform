import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/axiosConfig';
import './AdminRegister.css';

const AdminRegister = () => {
  // State for admin registration process
  const [currentStep, setCurrentStep] = useState(1); // 1: adminPasscode verification, 2: registration form
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminForm, setAdminForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Admin registration adminPasscode (you can make this configurable via environment variables)
  const ADMIN_PASSCODE = 'ADMIN2025';

  const handlePasscodeChange = e => {
    setAdminPasscode(e.target.value);
    setErrorMessage('');
  };

  const verifyPasscode = e => {
    e.preventDefault();
    if (adminPasscode === ADMIN_PASSCODE) {
      setCurrentStep(2);
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid adminPasscode. Access denied.');
    }
  };

  const handleChange = e => {
    setAdminForm({
      ...adminForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!adminForm.username.trim()) {
      setErrorMessage('Username is required');
      return;
    }

    if (!adminForm.email.trim()) {
      setErrorMessage('Email is required');
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (adminForm.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/api/admin/register', adminForm);

      if (response.data.message) {
        setErrorMessage('Admin registered successfully! You can now login.');
        // Optionally redirect to admin login
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Error registering admin');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStep === 1) {
    return (
      <div className="admin-register-page">
        <div className="admin-register-container">
          <div className="admin-register-card">
            <div className="admin-register-header">
              <h1 className="admin-register-title">Admin Registration</h1>
              <p className="admin-register-subtitle">Enter the admin adminPasscode to proceed with registration</p>
            </div>

            {errorMessage && (
            <div className="admin-register-error">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {errorMessage}
              </div>
            )}

            <form onSubmit={verifyPasscode} className="admin-register-form">
              <div className="form-group">
                <label className="form-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    <path d="M7 11V7A5 5 0 0 1 17 7V11" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Admin Passcode
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={adminPasscode}
                  onChange={handlePasscodeChange}
                  placeholder="Enter admin adminPasscode"
                  required
                />
              </div>

              <button
                type="submit"
                className="admin-register-button"
              >
                <svg className="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Verify Passcode
              </button>
            </form>

            <div className="admin-register-footer">
              <Link to="/admin/login" className="back-to-admin-login-link">
                <svg className="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-register-page">
      <div className="admin-register-container">
        <div className="admin-register-card">
          <div className="admin-register-header">
            <h1 className="admin-register-title">Register New Admin</h1>
            <p className="admin-register-subtitle">Create a new administrator account</p>
          </div>

          {errorMessage && (
            <div className={`admin-register-error ${errorMessage.includes('successfully') ? 'success' : ''}`}>
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {errorMessage.includes('successfully') ? (
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                  </>
                )}
              </svg>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-register-form">
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
                  value={adminForm.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter admin username"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={adminForm.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter admin email"
                />
              </div>
            </div>

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
                  value={adminForm.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
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
                  value={adminForm.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="admin-register-button secondary"
                onClick={() => setCurrentStep(1)}
              >
                <svg className="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
              <button
                type="submit"
                className="admin-register-button"
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
                    Registering...
                  </>
                ) : (
                  <>
                    <svg className="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2"/>
                      <line x1="17" y1="11" x2="23" y2="11" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Register Admin
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="admin-register-footer">
            <Link to="/admin/login" className="back-to-admin-login-link">
              <svg className="link-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
