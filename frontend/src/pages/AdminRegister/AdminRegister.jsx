import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminRegister.css';

const AdminRegister = () => {
  const [step, setStep] = useState(1); // 1: passcode verification, 2: registration form
  const [passcode, setPasscode] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Admin registration passcode (you can make this configurable via environment variables)
  const ADMIN_PASSCODE = 'ADMIN2025';

  const handlePasscodeChange = e => {
    setPasscode(e.target.value);
    setError('');
  };

  const verifyPasscode = e => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      setStep(2);
      setError('');
    } else {
      setError('Invalid passcode. Access denied.');
    }
  };

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
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

    setLoading(true);

    try {
      const response = await axios.post('/api/admin/register', formData);

      if (response.data.message) {
        setError('Admin registered successfully! You can now login.');
        // Optionally redirect to admin login
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error registering admin');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="container">
        <div
          className="flex-center admin-register-container"
        >
          <div className="card admin-register-card">
            <h2 className="text-center mb-20">Admin Registration</h2>
            <p className="text-center mb-20 admin-register-description">
              Enter the admin passcode to proceed with registration
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={verifyPasscode}>
              <div className="form-group">
                <label className="form-label">Admin Passcode</label>
                <input
                  type="password"
                  className="form-input"
                  value={passcode}
                  onChange={handlePasscodeChange}
                  placeholder="Enter admin passcode"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full-width"
              >
                Verify Passcode
              </button>
            </form>

            <div className="text-center mt-20">
              <p>
                <Link to="/admin/login">Back to Admin Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="card" style={{ width: '400px' }}>
          <h2 className="text-center mb-20">Register New Admin</h2>

          {error && (
            <div
              className={`alert ${
                error.includes('successfully') ? 'alert-success' : 'alert-error'
              }`}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                className="form-input"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter admin username"
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
                placeholder="Enter admin email"
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
                placeholder="Enter password"
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
                placeholder="Confirm password"
              />
            </div>

            <div className="flex gap-10">
              <button
                type="button"
                className="btn btn-secondary btn-flex"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-flex"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Admin'}
              </button>
            </div>
          </form>

          <div className="text-center mt-20">
            <p>
              <Link to="/admin/login">Back to Admin Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
