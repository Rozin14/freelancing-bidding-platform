import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllEscrows, updateEscrowStatus } from '../../utils/escrowManager';
import axios from 'axios';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidForm, setBidForm] = useState({
    amount: '',
    timeline: '',
    proposal: '',
  });
  const [showBidForm, setShowBidForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBid, setEditingBid] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [projectEscrow, setProjectEscrow] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
  }, [id, user]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const projectResponse = await axios.get(`/api/projects/${id}`);
      console.log('Project data:', projectResponse.data);
      console.log('Client data:', projectResponse.data.clientId);
      console.log('Client isActive:', projectResponse.data.clientId?.isActive);
      setProject(projectResponse.data);

      // Check for escrow
      const escrows = getAllEscrows();
      const escrow = escrows.find(e => e.projectId === id);
      console.log('ProjectDetail - Found escrow for project:', id, escrow);
      setProjectEscrow(escrow);

      // Fetch bids if user is the project owner (client) or a freelancer (to check if they've already bid)
      if (
        (user &&
          user.role === 'client' &&
          projectResponse.data.clientId._id === user.id) ||
        (user && user.role === 'freelancer')
      ) {
        try {
          const bidsResponse = await axios.get(`/api/bids/projects/${id}`);
          setBids(bidsResponse.data);
        } catch (bidError) {
          console.error('Error fetching bids:', bidError);
          setBids([]);
        }
      } else {
        setBids([]);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      if (error.response?.status === 404) {
        setProject(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if freelancer has already placed a bid on this project
  const hasUserAlreadyBid = () => {
    if (!user || user.role !== 'freelancer' || !bids.length) return false;
    return bids.some(bid => {
      // Handle both populated and non-populated freelancerId
      const freelancerId = bid.freelancerId._id || bid.freelancerId;
      return freelancerId === user.id;
    });
  };

  const handleBidSubmit = async e => {
    e.preventDefault();

    // Check if client is suspended
    if (
      project?.clientId &&
      typeof project.clientId === 'object' &&
      project.clientId.isActive === false
    ) {
      alert(
        'Cannot place bid: The client who posted this project has been suspended by administration.'
      );
      return;
    }

    // Client-side validation
    const bidAmount = parseFloat(bidForm.amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      alert('Bid amount must be greater than ₹0');
      return;
    }
    if (bidAmount > project.budget) {
      alert(
        `Bid amount cannot exceed the project budget of ₹${project.budget}`
      );
      return;
    }

    setSubmitting(true);

    try {
      await axios.post('/api/bids', {
        projectId: id,
        ...bidForm,
      });

      setBidForm({ amount: '', timeline: '', proposal: '' });
      setShowBidForm(false);
      fetchProjectDetails(); // Refresh data
      alert('Bid submitted successfully!');
    } catch (error) {
      console.error('Error submitting bid:', error);
      const errorMessage =
        error.response?.data?.message ||
        'Error submitting bid. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptBid = async bidId => {
    if (window.confirm('Are you sure you want to accept this bid?')) {
      try {
        const response = await axios.put(`/api/bids/${bidId}/accept`);
        fetchProjectDetails(); // Refresh data

        // Handle platform notification if present
        if (response.data.notification) {
          const notification = response.data.notification;
          const platformNotification = {
            id: Date.now(),
            from: 'platform',
            to: notification.freelancerId,
            content: `${notification.clientName} accepted your bid`,
            timestamp: new Date().toISOString(),
            fromUsername: 'FreelanceHub Platform',
            toUsername: 'Freelancer',
            projectId: notification.projectId,
            type: 'platform_notification',
          };

          // Get existing notifications and add new one
          const existingNotifications = JSON.parse(
            localStorage.getItem('platformNotifications') || '[]'
          );
          const updatedNotifications = [
            ...existingNotifications,
            platformNotification,
          ];
          localStorage.setItem(
            'platformNotifications',
            JSON.stringify(updatedNotifications)
          );
        }

        alert('Bid accepted and freelancer assigned successfully!');
      } catch (error) {
        console.error('Error accepting bid:', error);
        alert('Error accepting bid. Please try again.');
      }
    }
  };

  const handleEditBid = bid => {
    setEditingBid(bid);
    setBidForm({
      amount: bid.amount.toString(),
      timeline: bid.timeline,
      proposal: bid.proposal,
    });
    setShowEditForm(true);
  };

  const handleCancelBid = async bidId => {
    if (
      window.confirm(
        'Are you sure you want to cancel this bid? This action cannot be undone.'
      )
    ) {
      try {
        const response = await axios.delete(`/api/bids/${bidId}`);

        // Handle platform notification if present (for accepted bids)
        if (response.data.notification) {
          const notification = response.data.notification;

          // Check if there's an active conversation between client and freelancer for this project
          const existingMessages = JSON.parse(
            localStorage.getItem('messages') || '[]'
          );
          const hasActiveConversation = existingMessages.some(
            msg =>
              (msg.from === notification.clientId &&
                msg.to === notification.freelancerId) ||
              (msg.from === notification.freelancerId &&
                msg.to === notification.clientId)
          );

          // Only create notification if there's an active conversation
          if (hasActiveConversation) {
            const platformNotification = {
              id: Date.now(),
              from: 'platform',
              to: notification.clientId,
              content: `${notification.freelancerName} has cancelled their accepted bid for project "${notification.projectTitle}"`,
              timestamp: new Date().toISOString(),
              fromUsername: 'FreelanceHub Platform',
              toUsername: 'Client',
              projectId: notification.projectId,
              type: 'platform_notification',
              isRead: false,
            };

            // Get existing notifications and add new one
            const existingNotifications = JSON.parse(
              localStorage.getItem('platformNotifications') || '[]'
            );
            const updatedNotifications = [
              ...existingNotifications,
              platformNotification,
            ];
            localStorage.setItem(
              'platformNotifications',
              JSON.stringify(updatedNotifications)
            );
          }
        }

        alert('Bid canceled successfully');
        fetchProjectDetails(); // Refresh to update bids list
      } catch (error) {
        console.error('Error canceling bid:', error);
        const errorMessage =
          error.response?.data?.message ||
          'Error canceling bid. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleEditBidSubmit = async e => {
    e.preventDefault();

    // Client-side validation
    const bidAmount = parseFloat(bidForm.amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      alert('Bid amount must be greater than ₹0');
      return;
    }
    if (bidAmount > project.budget) {
      alert(
        `Bid amount cannot exceed the project budget of ₹${project.budget}`
      );
      return;
    }

    setSubmitting(true);

    try {
      await axios.put(`/api/bids/${editingBid._id}`, {
        amount: bidForm.amount,
        timeline: bidForm.timeline,
        proposal: bidForm.proposal,
      });

      setBidForm({ amount: '', timeline: '', proposal: '' });
      setShowEditForm(false);
      setEditingBid(null);
      fetchProjectDetails(); // Refresh data
      alert('Bid updated successfully!');
    } catch (error) {
      console.error('Error updating bid:', error);
      const errorMessage =
        error.response?.data?.message ||
        'Error updating bid. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingBid(null);
    setBidForm({ amount: '', timeline: '', proposal: '' });
  };

  const handleMarkCompleted = async () => {
    // Check if there's an escrow for this project
    const escrows = getAllEscrows();
    const projectEscrow = escrows.find(e => e.projectId === id);
    
    let confirmMessage = 'Are you sure you want to mark this project as completed?';
    
    // If no escrow exists, warn the freelancer
    if (!projectEscrow) {
      confirmMessage = '⚠️ WARNING: The client hasn\'t sent funds to escrow yet.\n\n' +
                      'This means:\n' +
                      '• Your payment is not secured\n' +
                      '• The client could potentially not pay you\n' +
                      '• You won\'t have escrow protection\n\n' +
                      'Still mark as completed?';
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        const response = await axios.put(`/api/projects/${id}/complete`);
        fetchProjectDetails(); // Refresh data

        // Check if there's an escrow for this project and update its status
        const escrows = getAllEscrows();
        const projectEscrow = escrows.find(e => e.projectId === id);
        
        if (projectEscrow && projectEscrow.status === 'pending') {
          // Update escrow status to in_progress when freelancer marks work as completed
          await updateEscrowStatus(projectEscrow.id, 'in_progress', 'Freelancer marked work as completed');
        }

        // Handle platform notification if present
        if (response.data.notification) {
          const notification = response.data.notification;
          const platformNotification = {
            id: Date.now(),
            from: 'platform',
            to: notification.clientId,
            content: `${notification.freelancerName} claims project completed`,
            timestamp: new Date().toISOString(),
            fromUsername: 'FreelanceHub Platform',
            toUsername: project.clientId?.username || 'Client',
            projectId: notification.projectId,
            type: 'platform_notification',
            isRead: false,
          };

          // Get existing notifications and add new one
          const existingNotifications = JSON.parse(
            localStorage.getItem('platformNotifications') || '[]'
          );
          const updatedNotifications = [
            ...existingNotifications,
            platformNotification,
          ];
          localStorage.setItem(
            'platformNotifications',
            JSON.stringify(updatedNotifications)
          );
        }

        alert('Project marked as completed successfully!');
      } catch (error) {
        console.error('Error marking project as completed:', error);
        const errorMessage =
          error.response?.data?.message ||
          'Error marking project as completed. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleUnmarkCompleted = async () => {
    if (
      window.confirm(
        'Are you sure you want to unmark this project as completed? This will change the status back to in progress.'
      )
    ) {
      try {
        const response = await axios.put(
          `/api/projects/${id}/unmark-completed`
        );
        fetchProjectDetails(); // Refresh data

        // Handle platform notification if present
        if (response.data.notification) {
          const notification = response.data.notification;
          const platformNotification = {
            id: Date.now(),
            from: 'platform',
            to: notification.clientId,
            content: `${notification.freelancerName} has unmarked the project as completed and reverted it to in progress`,
            timestamp: new Date().toISOString(),
            fromUsername: 'FreelanceHub Platform',
            toUsername: project.clientId?.username || 'Client',
            projectId: notification.projectId,
            type: 'platform_notification',
            isRead: false,
          };

          // Get existing notifications and add new one
          const existingNotifications = JSON.parse(
            localStorage.getItem('platformNotifications') || '[]'
          );
          const updatedNotifications = [
            ...existingNotifications,
            platformNotification,
          ];
          localStorage.setItem(
            'platformNotifications',
            JSON.stringify(updatedNotifications)
          );
        }

        alert('Project unmarked as completed successfully!');
      } catch (error) {
        console.error('Error unmarking project as completed:', error);
        const errorMessage =
          error.response?.data?.message ||
          'Error unmarking project as completed. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleCancelProject = async () => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this project? This action cannot be undone and the freelancer will be notified if they are working on it.'
      )
    ) {
      return;
    }

    try {
      const response = await axios.put(`/api/projects/${id}/cancel`);
      fetchProjectDetails(); // Refresh data

      // Handle platform notification if present
      if (response.data.notification) {
        const notification = response.data.notification;
        const platformNotification = {
          id: Date.now(),
          from: 'platform',
          to: notification.freelancerId,
          content: `${notification.clientName} has cancelled the project "${notification.projectTitle}"`,
          timestamp: new Date().toISOString(),
          fromUsername: 'FreelanceHub Platform',
          toUsername: 'Freelancer',
          projectId: notification.projectId,
          type: 'platform_notification',
          isRead: false,
        };

        // Get existing notifications and add new one
        const existingNotifications = JSON.parse(
          localStorage.getItem('platformNotifications') || '[]'
        );
        const updatedNotifications = [
          ...existingNotifications,
          platformNotification,
        ];
        localStorage.setItem(
          'platformNotifications',
          JSON.stringify(updatedNotifications)
        );
      }

      alert('Project cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling project:', error);
      const errorMessage =
        error.response?.data?.message ||
        'Error cancelling project. Please try again.';
      alert(errorMessage);
    }
  };

  const handleReopenProject = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reopen this project? It will be available for freelancers to bid on again.'
      )
    ) {
      return;
    }

    try {
      await axios.put(`/api/projects/${id}/reopen`);
      fetchProjectDetails(); // Refresh data
      alert('Project reopened successfully!');
    } catch (error) {
      console.error('Error reopening project:', error);
      const errorMessage =
        error.response?.data?.message ||
        'Error reopening project. Please try again.';
      alert(errorMessage);
    }
  };

  if (loading) {
    return <div className="loading">Loading project details...</div>;
  }

  if (!project) {
    return <div className="container">Project not found</div>;
  }

  const canBid =
    user && user.role === 'freelancer' && project.status === 'open';

  // Check if user can manage bids (either client viewing all bids or freelancer viewing their own bid)
  const canManageBids =
    (user && user.role === 'client' && project.clientId._id === user.id) ||
    (user && user.role === 'freelancer' && hasUserAlreadyBid());

  // Check if user can view all bids (only project owner)
  const canViewAllBids =
    user && user.role === 'client' && project.clientId._id === user.id;

  return (
    <div className="container">
      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between mb-20">
            <h1>{project.title}</h1>
            <div className="flex gap-10 align-center">
              <span className={`status-badge status-${project.status}`}>
                {project.status === 'closed'
                  ? 'completed and closed'
                  : project.status === 'cancelled'
                  ? 'cancelled'
                  : project.status.replace('_', ' ')}
              </span>
              {/* Edit Project Button - Only for project owner (client) */}
              {user &&
                user.role === 'client' &&
                project.clientId._id === user.id &&
                project.status !== 'closed' &&
                project.status !== 'cancelled' && (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    title="Edit Project"
                  >
                    ✏️ Edit
                  </button>
                )}
            </div>
          </div>

          <div className="mb-20">
            <h3>Description</h3>
            <p>{project.description}</p>
          </div>

          <div className="mb-20">
            <h3>Project Details</h3>
            <div className="grid grid-2">
              <div>
                <strong>Budget:</strong> ₹{project.budget}
              </div>
              <div>
                <strong>Client:</strong>
                <Link
                  to={`/profile/${project.clientId._id}`}
                  style={{
                    marginLeft: '5px',
                    color: '#007bff',
                    textDecoration: 'none',
                  }}
                >
                  {project.clientId.username}
                </Link>
                {user &&
                  user.role === 'client' &&
                  project.clientId._id === user.id && (
                    <span
                      style={{
                        marginLeft: '5px',
                        color: '#28a745',
                        fontWeight: 'bold',
                      }}
                    >
                      (You)
                    </span>
                  )}
              </div>
              {project.deadline && (
                <div>
                  <strong>Deadline:</strong>{' '}
                  {new Date(project.deadline).toLocaleDateString()}
                </div>
              )}
              <div>
                <strong>Posted:</strong>{' '}
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
              {project.completedAt && (
                <div>
                  <strong>Completed:</strong>{' '}
                  {new Date(project.completedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {project.requiredSkills && project.requiredSkills.length > 0 && (
            <div className="mb-20">
              <h3>Required Skills</h3>
              <div className="flex flex-wrap gap-10">
                {project.requiredSkills.map((skill, index) => (
                  <span key={index} className="status-badge status-open">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warning if client is suspended */}
          {project?.clientId &&
            typeof project.clientId === 'object' &&
            project.clientId.isActive === false && (
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#856404',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  ⚠️ The client who posted this project has been suspended by
                  administration
                </p>
              </div>
            )}

          {project.freelancerId && (
            <div className="mb-20">
              <h3>Assigned Freelancer</h3>
              <p>
                <Link
                  to={`/profile/${project.freelancerId._id}`}
                  style={{
                    color: '#007bff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  {project.freelancerId.username}
                </Link>
                {user &&
                  user.role === 'freelancer' &&
                  project.freelancerId._id === user.id && (
                    <span
                      style={{
                        color: '#6c757d',
                        fontWeight: 'normal',
                        marginLeft: '8px',
                      }}
                    >
                      (You)
                    </span>
                  )}
              </p>

              {/* Escrow Status for Freelancer */}
              {user &&
                user.role === 'freelancer' &&
                project.freelancerId._id === user.id &&
                project.status === 'in_progress' && (
                  <div className="mt-20">
                    {(() => {
                      console.log('ProjectDetail - Escrow check:', {
                        projectEscrow,
                        hasEscrow: !!projectEscrow,
                        status: projectEscrow?.status,
                        amount: projectEscrow?.amount,
                        projectId: id
                      });
                      return projectEscrow && projectEscrow.status && projectEscrow.status !== 'cancelled' && projectEscrow.amount > 0;
                    })() ? (
                      <div className="alert alert-success">
                        <strong>✅ Escrow Protected:</strong> Client has sent ₹{projectEscrow.amount} to escrow. Your payment is secured.
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        <strong>⚠️ No Escrow:</strong> Client hasn't sent funds to escrow yet. Your payment is not secured.
                      </div>
                    )}
                  </div>
                )}

              {/* Show "Mark as Completed" button for the assigned freelancer */}
              {user &&
                user.role === 'freelancer' &&
                project.freelancerId._id === user.id &&
                project.status === 'in_progress' && (
                  <div className="mt-20">
                    <button
                      className="btn btn-success"
                      onClick={handleMarkCompleted}
                    >
                      Mark Project as Completed
                    </button>
                  </div>
                )}

              {/* Show "Unmark as Completed" button for the assigned freelancer */}
              {user &&
                user.role === 'freelancer' &&
                project.freelancerId._id === user.id &&
                project.status === 'completed' && (
                  <div className="mt-20">
                    <button
                      className="btn btn-warning"
                      onClick={handleUnmarkCompleted}
                      style={{
                        backgroundColor: '#ffc107',
                        borderColor: '#ffc107',
                        color: '#212529',
                      }}
                    >
                      Unmark as Completed
                    </button>
                  </div>
                )}
            </div>
          )}

          {canBid && (
            <div>
              {hasUserAlreadyBid() ? (
                <div className="alert alert-info">
                  <p>You have already placed a bid on this project.</p>
                </div>
              ) : !showBidForm ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowBidForm(true)}
                >
                  Place Bid
                </button>
              ) : (
                <div className="card">
                  <h3>Place Your Bid</h3>
                  <form onSubmit={handleBidSubmit}>
                    <div className="form-group">
                      <label className="form-label">Bid Amount (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={bidForm.amount}
                        onChange={e =>
                          setBidForm({ ...bidForm, amount: e.target.value })
                        }
                        required
                        min="0"
                        max={project.budget}
                        step="0.01"
                        placeholder={`Maximum: ₹${project.budget}`}
                      />
                      <small className="form-text">
                        Bid amount must be between ₹0 and ₹{project.budget}{' '}
                        (project budget)
                      </small>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Timeline</label>
                      <input
                        type="text"
                        className="form-input"
                        value={bidForm.timeline}
                        onChange={e =>
                          setBidForm({ ...bidForm, timeline: e.target.value })
                        }
                        placeholder="e.g., 2 weeks, 1 month"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Proposal</label>
                      <textarea
                        className="form-textarea"
                        value={bidForm.proposal}
                        onChange={e =>
                          setBidForm({ ...bidForm, proposal: e.target.value })
                        }
                        placeholder="Describe your approach and why you're the best fit for this project..."
                        required
                      />
                    </div>

                    <div className="flex gap-10">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting...' : 'Submit Bid'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowBidForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Edit Bid Form */}
          {showEditForm && editingBid && (
            <div className="card">
              <h3>Edit Your Bid</h3>
              <form onSubmit={handleEditBidSubmit}>
                <div className="form-group">
                  <label className="form-label">Bid Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={bidForm.amount}
                    onChange={e =>
                      setBidForm({ ...bidForm, amount: e.target.value })
                    }
                    required
                    min="0"
                    max={project.budget}
                    step="0.01"
                    placeholder={`Maximum: ₹${project.budget}`}
                  />
                  <small className="form-text">
                    Bid amount must be between ₹0 and ₹{project.budget} (project
                    budget)
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Timeline</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bidForm.timeline}
                    onChange={e =>
                      setBidForm({ ...bidForm, timeline: e.target.value })
                    }
                    placeholder="e.g., 2 weeks, 1 month"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Proposal</label>
                  <textarea
                    className="form-textarea"
                    value={bidForm.proposal}
                    onChange={e =>
                      setBidForm({ ...bidForm, proposal: e.target.value })
                    }
                    placeholder="Describe your approach and why you're the best fit for this project..."
                    required
                  />
                </div>

                <div className="flex gap-10">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Updating...' : 'Update Bid'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Re-open Project Button - Only for cancelled projects */}
          {user &&
            user.role === 'client' &&
            project.clientId._id === user.id &&
            project.status === 'cancelled' && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '15px',
                  border: '1px solid #28a745',
                  borderRadius: '8px',
                  backgroundColor: '#f8fff8',
                  textAlign: 'center',
                }}
              >
                <h4
                  style={{
                    color: '#28a745',
                    marginBottom: '10px',
                    fontSize: '16px',
                  }}
                >
                  🔄 Re-open Project
                </h4>
                <p
                  style={{
                    color: '#666',
                    marginBottom: '15px',
                    fontSize: '14px',
                  }}
                >
                  This project is currently cancelled. You can reopen it to make
                  it available for freelancers to bid on again.
                </p>
                <button
                  onClick={handleReopenProject}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseEnter={e => {
                    e.target.style.backgroundColor = '#218838';
                  }}
                  onMouseLeave={e => {
                    e.target.style.backgroundColor = '#28a745';
                  }}
                >
                  Re-open Project
                </button>
              </div>
            )}

          {/* Separator line */}
          {user &&
            user.role === 'client' &&
            project.clientId._id === user.id &&
            project.status !== 'closed' &&
            project.status !== 'cancelled' && (
              <hr
                style={{
                  margin: '20px 0',
                  border: 'none',
                  borderTop: '1px solid #e9ecef',
                }}
              />
            )}

          {/* Cancel Project Button - Only for project owner (client) */}
          {user &&
            user.role === 'client' &&
            project.clientId._id === user.id &&
            project.status !== 'closed' &&
            project.status !== 'cancelled' && (
              <div
                style={{
                  marginTop: '20px',
                  textAlign: 'center',
                }}
              >
                <h4 style={{ color: '#dc3545', marginBottom: '15px' }}>
                  ⚠️ Cancel Project
                </h4>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  If a freelancer is working on this project, they will be
                  notified.
                </p>
                <button
                  onClick={handleCancelProject}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                  }}
                  onMouseEnter={e => {
                    e.target.style.backgroundColor = '#c82333';
                  }}
                  onMouseLeave={e => {
                    e.target.style.backgroundColor = '#dc3545';
                  }}
                >
                  Cancel Project
                </button>
              </div>
            )}
        </div>

        {canManageBids && (
          <div className="card">
            <h3>{canViewAllBids ? `Bids (${bids.length})` : 'My Bid'}</h3>

            {bids.length > 0 ? (
              <div>
                {bids.map(bid => (
                  <div
                    key={bid._id}
                    className="mb-20 bid-card"
                    style={{
                      padding: '15px',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onClick={e => {
                      // Only navigate if clicking on the card itself, not on buttons
                      if (e.target.tagName !== 'BUTTON') {
                        navigate(`/projects/${id}/bids/${bid._id}`);
                      }
                    }}
                  >
                    <div className="flex-between mb-10">
                      <div className="flex gap-10">
                        {canViewAllBids ? (
                          <strong
                            className="freelancer-link"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/freelancer/${bid.freelancerId._id}`);
                            }}
                            style={{
                              color: '#007bff',
                              textDecoration: 'underline',
                            }}
                          >
                            {bid.freelancerId.username}
                          </strong>
                        ) : (
                          <strong>Your Bid</strong>
                        )}
                      </div>
                      <span className={`status-badge status-${bid.status}`}>
                        {bid.status === 'accepted' ? 'Assigned' : bid.status}
                      </span>
                    </div>

                    <div className="mb-10">
                      <strong>Amount:</strong> ₹{bid.amount}
                    </div>

                    <div className="mb-10">
                      <strong>Timeline:</strong> {bid.timeline}
                    </div>

                    <div className="mb-10">
                      <strong>Proposal:</strong>
                      <p style={{ margin: '5px 0', color: '#666' }}>
                        {bid.proposal.length > 100
                          ? `${bid.proposal.substring(0, 100)}...`
                          : bid.proposal}
                      </p>
                    </div>

                    <div className="flex-between">
                      <div style={{ fontSize: '14px', color: '#888' }}>
                        {new Date(bid.createdAt).toLocaleDateString()} at {new Date(bid.createdAt).toLocaleTimeString()}
                      </div>

                      <div className="flex gap-10">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/projects/${id}/bids/${bid._id}`);
                          }}
                        >
                          View Full Bid
                        </button>

                        {canViewAllBids && bid.status === 'pending' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleAcceptBid(bid._id);
                            }}
                          >
                            Accept Bid
                          </button>
                        )}

                        {/* Edit Bid button - show for freelancers on their own pending bids */}
                        {!canViewAllBids &&
                          bid.status === 'pending' &&
                          user &&
                          user.role === 'freelancer' &&
                          (bid.freelancerId._id || bid.freelancerId) ===
                            user.id && (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditBid(bid);
                              }}
                              type="button"
                            >
                              Edit Bid
                            </button>
                          )}

                        {/* Cancel Bid button - show for freelancers on their own pending and accepted bids */}
                        {!canViewAllBids &&
                          (bid.status === 'pending' ||
                            bid.status === 'accepted') &&
                          user &&
                          user.role === 'freelancer' &&
                          (bid.freelancerId._id || bid.freelancerId) ===
                            user.id && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleCancelBid(bid._id);
                              }}
                              type="button"
                            >
                              Cancel Bid
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : canViewAllBids ? (
              <p>No bids yet.</p>
            ) : (
              <p>You haven't placed a bid yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
