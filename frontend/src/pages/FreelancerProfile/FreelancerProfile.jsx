import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axiosConfig';
import Register from '../Register/Register';
import './FreelancerProfile.css';

const FreelancerProfile = () => {
  const { freelancerId, userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for freelancer information
  const [freelancer, setFreelancer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewInput, setReviewInput] = useState({
    rating: 5,
    comment: '',
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Determine the actual user ID to fetch
  const targetUserId = userId || freelancerId || user?.id || user?._id;

  useEffect(() => {
    if (targetUserId) {
      fetchFreelancerDetails();
    } else {
      console.error('No user ID found in URL parameters or user context');
      setErrorMessage('Invalid profile URL - no user ID specified');
      setIsLoading(false);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    if (user && user.role === 'client' && freelancer?.role === 'freelancer') {
      checkCanReview();
    }
  }, [user, freelancer]);

  const fetchFreelancerDetails = async () => {
    try {
      setIsLoading(true);

      // Check if this is an admin profile by trying admin endpoint first
      let userResponse;
      try {
        userResponse = await api.get(`/api/admin/profile/${targetUserId}`);
        // If successful, this is an admin
        setFreelancer({ ...userResponse.data, role: 'admin' });
      } catch (adminError) {
        // If admin endpoint fails, try regular user endpoint
        try {
          userResponse = await api.get(`/api/auth/profile/${targetUserId}`);
          setFreelancer(userResponse.data);
        } catch (userError) {
          throw new Error('Profile not found');
        }
      }

      // Fetch user's projects (different logic for clients vs freelancers vs admins)
      try {
        if (userResponse.data.role === 'admin') {
          // Admins don't have projects
          setProjects([]);
        } else if (userResponse.data.role === 'freelancer') {
          // For freelancers, fetch their assigned projects
          const projectsResponse = await api.get(
            `/api/projects/freelancer/${targetUserId}`
          );
          setProjects(projectsResponse.data);
        } else {
          // For clients, fetch their created projects
          const projectsResponse = await api.get(
            `/api/projects/client/${targetUserId}`
          );
          setProjects(projectsResponse.data);
        }
      } catch (projectError) {
        console.log('No projects found for user');
        setProjects([]);
      }

      // Fetch user's reviews (only for freelancers)
      try {
        if (userResponse.data.role === 'freelancer') {
          const reviewsResponse = await api.get(
            `/api/reviews/freelancer/${targetUserId}`
          );
          setReviews(reviewsResponse.data);
        } else {
          // Admins and clients don't have reviews
          setReviews([]);
        }
      } catch (reviewError) {
        console.log('No reviews found for user');
        setReviews([]);
      }
    } catch (error) {
      setErrorMessage(`Error loading freelancer profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async e => {
    e.preventDefault();

    if (!reviewInput.comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    setIsSubmittingReview(true);

    try {
      await api.post('/api/reviews', {
        freelancerId: targetUserId,
        rating: reviewInput.rating,
        comment: reviewInput.comment,
      });

      // Reset form and refresh data
      setReviewInput({ rating: 5, comment: '' });
      setShowReviewForm(false);
      fetchFreelancerDetails(); // Refresh to get updated reviews and rating
      alert('Review submitted successfully!');
    } catch (errorMessage) {
      console.errorMessage('Error submitting review:', errorMessage);
      alert(
        errorMessage.response?.data?.message ||
          'Error submitting review. Please try again.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewFormChange = e => {
    setReviewInput({
      ...reviewInput,
      [e.target.name]: e.target.value,
    });
  };

  const checkCanReview = async () => {
    try {
      const response = await api.get(
        `/api/projects/client/${user.id}/freelancer/${targetUserId}/completed`
      );
      setCanReview(response.data.hasCompletedProjects);
    } catch (errorMessage) {
      console.errorMessage('Error checking review eligibility:', errorMessage);
      setCanReview(false);
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    setFreelancer(updatedUser);
    setShowEditProfile(false);
  };

  if (isLoading) {
    return <div className="isLoading">Loading freelancer profile...</div>;
  }

  if (errorMessage || !freelancer) {
    return (
      <div className="container">
        <div className="alert alert-errorMessage">
          {errorMessage || 'Freelancer not found'}
        </div>
        <Link to="/projects" className="btn btn-secondary">
          Back to Projects
        </Link>
      </div>
    );
  }

  // Show edit profile form when in edit mode
  if (showEditProfile) {
    return (
      <Register 
        id={targetUserId}
        onUpdate={handleProfileUpdate}
        onClose={() => setShowEditProfile(false)}
      />
    );
  }

  return (
    <div className="container">
      <div className="flex-between mb-20">
        <div>
          <Link to="/projects" className="btn btn-secondary">
            ← Back to Projects
          </Link>
        </div>
        <div className="flex gap-10 align-center">
          <h1>
            {freelancer?.role === 'admin'
              ? 'Admin Profile'
              : freelancer?.role === 'client'
              ? 'Client Profile'
              : 'Freelancer Profile'}
          </h1>
          {/* Show edit button only if user is viewing their own profile */}
          {user && (user.id === targetUserId || user._id === targetUserId) && (
            <button
              className="btn btn-primary"
              onClick={() => setShowEditProfile(true)}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-3 gap-20">
        {/* Profile Header */}
        <div className="card profile-header">
          <div className="freelancer-avatar-large">
            {freelancer.image && !freelancer.image.includes('/img/no-image.png') ? (
              <img 
                src={freelancer.image} 
                alt={`${freelancer.username}'s profile`}
                className="profile-image-large"
              />
            ) : (
              <span className="avatar-placeholder-large">
                {freelancer.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="profile-info">
            <h2>{freelancer.username}</h2>
            <p className="profile-role">{freelancer.role}</p>
            
            {/* Account Status */}
            {freelancer.isActive === false && (
              <div className="account-status-suspended">
                ⚠️ Account Suspended
              </div>
            )}

            <div className="rating-large">
              <span className="stars">⭐⭐⭐⭐⭐</span>
              <span className="rating-text">
                {freelancer.profile?.rating || 0}/5 ({reviews.length} reviews)
              </span>
            </div>

            <div className="profile-stats">
              <div className="stat">
                <strong>Member Since:</strong>
                <span>
                  {new Date(freelancer.createdAt).toLocaleDateString()}
                </span>
              </div>

              {freelancer?.role === 'freelancer' &&
                freelancer.profile?.hourlyRate && (
                  <div className="stat">
                    <strong>Hourly Rate:</strong>
                    <span className="rate">
                      ₹{freelancer.profile.hourlyRate}/hr
                    </span>
                  </div>
                )}

              {freelancer?.role !== 'admin' && (
                <div className="stat">
                  <strong>
                    {freelancer?.role === 'client'
                      ? 'Projects Created:'
                      : 'Projects Completed:'}
                  </strong>
                  <span>
                    {freelancer?.role === 'client'
                      ? projects.length
                      : projects.filter(p => p.status === 'closed').length}
                  </span>
                </div>
              )}

              {freelancer?.role === 'admin' && (
                <div className="stat">
                  <strong>Role:</strong>
                  <span>System Administrator</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="card">
          <h3>About</h3>
          {freelancer?.role === 'admin' ? (
            <div className="bio-content">
              System Administrator with full access to manage users, projects,
              and platform operations.
            </div>
          ) : freelancer.profile?.bio ? (
            <div className="bio-content">{freelancer.profile.bio}</div>
          ) : (
            <p className="no-info">No bio provided</p>
          )}
        </div>

        {/* Skills Section - Only for Freelancers */}
        {freelancer?.role === 'freelancer' && (
          <div className="card">
            <h3>Skills</h3>
            {freelancer.profile?.skills &&
            freelancer.profile.skills.length > 0 ? (
              <div className="skills-grid">
                {freelancer.profile.skills.map((skill, index) => (
                  <span key={index} className="skill-badge">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-info">No skills listed</p>
            )}
          </div>
        )}

        {/* Review Eligibility Message */}
        {user &&
          user.role === 'client' &&
          freelancer?.role === 'freelancer' &&
          !canReview && (
            <div className="card">
              <h3>Leave a Review</h3>
              <p className="no-portfolio">
                You can only review freelancers after completing at least one
                project with them.
              </p>
            </div>
          )}

        {/* Review Button - Only for clients who have completed projects with this freelancer */}
        {user &&
          user.role === 'client' &&
          freelancer?.role === 'freelancer' &&
          canReview && (
            <div className="card">
              <h3>Leave a Review</h3>
              {!showReviewForm ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowReviewForm(true)}
                >
                  Write a Review
                </button>
              ) : (
                <form onSubmit={handleReviewSubmit}>
                  <div className="form-group">
                    <label className="form-label">Rating</label>
                    <select
                      name="rating"
                      value={reviewInput.rating}
                      onChange={handleReviewFormChange}
                      className="form-select"
                      required
                    >
                      <option value={1}>1 Star</option>
                      <option value={2}>2 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={5}>5 Stars</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Comment</label>
                    <textarea
                      name="comment"
                      value={reviewInput.comment}
                      onChange={handleReviewFormChange}
                      className="form-textarea"
                      placeholder="Write your review here..."
                      rows="4"
                      required
                    />
                  </div>

                  <div className="flex gap-10">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewInput({ rating: 5, comment: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
      </div>

      {/* Portfolio Section - Only for Freelancers */}
      {freelancer?.role === 'freelancer' &&
        freelancer.profile?.portfolio &&
        freelancer.profile.portfolio.length > 0 && (
          <div className="card mt-20">
            <h3>Portfolio</h3>
            <div className="portfolio-grid">
              {freelancer.profile.portfolio.map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portfolio-item"
                >
                  <div className="portfolio-icon">🔗</div>
                  <span>Portfolio Link {index + 1}</span>
                </a>
              ))}
            </div>
          </div>
        )}

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="card mt-20">
          <h3>
            {freelancer?.role === 'client'
              ? `Created Projects (${projects.length})`
              : `Completed Projects (${
                  projects.filter(p => p.status === 'closed').length
                })`}
          </h3>
          <div className="projects-grid">
            {(freelancer?.role === 'client'
              ? projects.slice(0, 6)
              : projects.filter(p => p.status === 'closed').slice(0, 6)
            ).map(project => (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                className="project-item-link"
              >
                <div className="project-item">
                  <h4>{project.title}</h4>
                  <p className="project-description">
                    {project.description.substring(0, 100)}...
                  </p>
                  <div className="project-meta">
                    <span className="project-budget">₹{project.budget}</span>
                    <span className="project-date">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {(freelancer?.role === 'client'
            ? projects.length > 6
            : projects.filter(p => p.status === 'closed').length > 6) && (
            <p className="text-center mt-10">
              And{' '}
              {freelancer?.role === 'client'
                ? projects.length - 6
                : projects.filter(p => p.status === 'closed').length -
                  6}{' '}
              more projects...
            </p>
          )}
        </div>
      )}

      {/* Reviews Section - Only for Freelancers */}
      {freelancer?.role === 'freelancer' && reviews.length > 0 && (
        <div className="card mt-20">
          <h3>Client Reviews ({reviews.length})</h3>
          <div className="reviews-list">
            {reviews.slice(0, 5).map(review => (
              <div key={review._id} className="review-item">
                <div className="review-header">
                  <div className="reviewer-info">
                    <Link
                      to={`/profile/${review.clientId?._id}`}
                      className="client-link"
                    >
                      {review.clientId?.username || 'Anonymous'}
                    </Link>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="review-rating">
                    {'⭐'.repeat(review.rating)}
                  </div>
                </div>
                <div className="review-content">{review.comment}</div>
              </div>
            ))}
          </div>
          {reviews.length > 5 && (
            <p className="text-center mt-10">
              And {reviews.length - 5} more reviews...
            </p>
          )}
        </div>
      )}

    </div>
  );
};

export default FreelancerProfile;
