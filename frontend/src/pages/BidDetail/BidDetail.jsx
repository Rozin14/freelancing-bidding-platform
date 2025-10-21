import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createEscrow, getAllEscrows, updateEscrowStatus, createEscrowNotification, ESCROW_NOTIFICATION_TYPES } from '../../utils/escrowManager';
import axios from 'axios';
import './BidDetail.css';

const BidDetail = () => {
  const { projectId, bidId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bid, setBid] = useState(null);
  const [project, setProject] = useState(null);
  const [freelancer, setFreelancer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [existingEscrow, setExistingEscrow] = useState(null);

  useEffect(() => {
    fetchBidDetails();
  }, [projectId, bidId]);

  const fetchBidDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await axios.get(`/api/projects/${projectId}`);
      setProject(projectResponse.data);

      // Fetch bid details
      const bidResponse = await axios.get(`/api/bids/detail/${bidId}`);
      setBid(bidResponse.data);

      // Fetch freelancer details
      if (bidResponse.data.freelancerId) {
        const freelancerId = bidResponse.data.freelancerId._id || bidResponse.data.freelancerId;
        const freelancerResponse = await axios.get(`/api/auth/profile/${freelancerId}`);
        setFreelancer(freelancerResponse.data);
      }

      // Check for existing escrow
      const escrows = getAllEscrows();
      const escrow = escrows.find(e => e.projectId === projectId && e.bidId === bidId);
      setExistingEscrow(escrow);

    } catch (error) {
      console.error('Error fetching bid details:', error);
      console.error('Error response:', error.response?.data);
      setError(`Error loading bid details: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async () => {
    if (window.confirm('Are you sure you want to accept this bid?')) {
      try {
        const response = await axios.put(`/api/bids/${bidId}/accept`);
        
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
            type: 'platform_notification'
          };

          // Get existing notifications and add new one
          const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
          const updatedNotifications = [...existingNotifications, platformNotification];
          localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
        }
        
        alert('Bid accepted and freelancer assigned successfully!');
        // Don't redirect - stay on page so client can send funds to escrow
        fetchBidDetails(); // Refresh the page data to show updated bid status
      } catch (error) {
        console.error('Error accepting bid:', error);
        alert('Error accepting bid');
      }
    }
  };

  const handleSettlePayment = async () => {
      // Check if there's already a pending payment settlement request for this project
      const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
      const existingSettlementRequest = existingNotifications.find(notif => 
        notif.projectId === projectId && 
        notif.bidId === bidId &&
        notif.actionType === 'redirect_to_bid_details' &&
        notif.hasAction === true
      );

      if (existingSettlementRequest) {
        alert('Payment settlement request has already been sent to the freelancer. Please wait for them to accept the payment.');
        return;
      }

    if (window.confirm('Are you sure you want to settle the payment? This will send a payment request to the freelancer.')) {
      try {
        const response = await axios.put(`/api/projects/${projectId}/settle`);
        
        // Handle platform notification if present
        if (response.data.notification) {
          const notification = response.data.notification;
          const platformNotification = {
            id: Date.now(),
            from: 'platform',
            to: notification.freelancerId,
            content: `${notification.clientName} wants to settle payment for your completed work`,
            timestamp: new Date().toISOString(),
            fromUsername: 'FreelanceHub Platform',
            toUsername: 'Freelancer',
            projectId: notification.projectId,
            bidId: notification.bidId,
            type: 'platform_notification',
            hasAction: true,
            actionType: 'redirect_to_bid_details',
            actionText: 'Click Here',
            isRead: false
          };

          // Get existing notifications and add new one
          const updatedNotifications = [...existingNotifications, platformNotification];
          localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
        }
        
        alert('Payment settlement request sent to freelancer! They will need to accept the payment to complete the transaction.');
        navigate(`/projects/${projectId}`);
      } catch (error) {
        console.error('Error settling payment:', error);
        const errorMessage = error.response?.data?.message || 'Error settling payment. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleAcceptPayment = async (projectId, notificationId) => {
    if (window.confirm('Are you sure you want to accept the payment? This will mark the project as closed and complete the transaction.')) {
      try {
        await axios.put(`/api/projects/${projectId}/accept-payment`);
        
        // Remove the notification from localStorage
        const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
        const updatedNotifications = existingNotifications.filter(notif => notif.id !== notificationId);
        localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
        
        alert('Payment accepted successfully! The project has been marked as closed.');
        navigate(`/projects/${projectId}`);
      } catch (error) {
        console.error('Error accepting payment:', error);
        const errorMessage = error.response?.data?.message || 'Error accepting payment. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleFundEscrow = async () => {
    if (!bid || !project || !freelancer) {
      alert('Unable to create escrow. Missing required information.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send ₹${bid.amount} to escrow for this project?\n\n` +
      `This will:\n` +
      `- Secure the funds until work is completed\n` +
      `- Notify the freelancer that they can start working\n` +
      `- Allow admin to release funds after work approval\n\n` +
      `Project: ${project.title}\n` +
      `Freelancer: ${freelancer.username}\n` +
      `Amount: ₹${bid.amount}`
    );

    if (confirmed) {
      try {
        const escrow = createEscrow(
          projectId,
          bidId,
          user.id,
          freelancer._id || freelancer.id,
          bid.amount,
          project.title
        );

        // Update escrow with usernames
        escrow.clientUsername = user.username;
        escrow.freelancerUsername = freelancer.username;
        escrow.projectDescription = project.description;

        // Update the escrow in localStorage
        const escrows = getAllEscrows();
        const escrowIndex = escrows.findIndex(e => e.id === escrow.id);
        if (escrowIndex !== -1) {
          escrows[escrowIndex] = escrow;
          localStorage.setItem('escrows', JSON.stringify(escrows));
        }

        setExistingEscrow(escrow);
        
        // Send notification to freelancer that funds have been sent to escrow
        createEscrowNotification(ESCROW_NOTIFICATION_TYPES.FUNDS_SENT_TO_FREELANCER, escrow);
        
        alert(
          `✅ Funds sent to escrow successfully!\n\n` +
          `₹${bid.amount} has been secured for project "${project.title}".\n` +
          `The freelancer has been notified and can now start working.\n` +
          `Admin will be able to release funds after you approve the completed work.`
        );
        
        // Refresh the page to show updated state
        window.location.reload();
      } catch (error) {
        console.error('Error creating escrow:', error);
        alert('Error creating escrow. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading bid details...</div>;
  }

  if (error || !bid || !project) {
    return (
      <div className="container">
        <div className="alert alert-error">
          {error || 'Bid not found'}
        </div>
        <Link to={`/projects/${projectId}`} className="btn btn-secondary">
          Back to Project
        </Link>
      </div>
    );
  }

  // Check if user is the project owner
  const isProjectOwner = user && user.role === 'client' && project.clientId._id === user.id;
  
  // Check if user is the assigned freelancer
  const isAssignedFreelancer = user && user.role === 'freelancer' && project.freelancerId && project.freelancerId._id === user.id;
  
  // Check if there's a pending payment settlement request for this project
  const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const pendingPaymentRequest = existingNotifications.find(notif => 
    notif.projectId === projectId && 
    notif.bidId === bidId &&
    notif.actionType === 'redirect_to_bid_details' &&
    notif.hasAction === true
  );

  return (
    <div className="container">
      <div className="flex-between mb-20">
        <div>
          <Link to={`/projects/${projectId}`} className="btn btn-secondary">
            ← Back to Project
          </Link>
        </div>
        <h1>Bid Details</h1>
      </div>

      <div className="grid grid-2 gap-20">
        {/* Bid Information */}
        <div className="card">
          <h2>Bid Information</h2>
          
          <div className="mb-20">
            <div className="flex-between mb-10">
              <h3>Project: <Link to={`/projects/${projectId}`} className="project-link">{project.title}</Link></h3>
              <span className={`status-badge status-${bid.status}`}>
                {bid.status === 'accepted' ? 'Assigned' : bid.status}
              </span>
            </div>
            <p className="project-description">{project.description.substring(0, 200)}...</p>
          </div>

          <div className="bid-details">
            <div className="detail-row">
              <strong>Bid Amount:</strong>
              <span className="amount">₹{bid.amount}</span>
            </div>
            
            <div className="detail-row">
              <strong>Timeline:</strong>
              <span>{bid.timeline}</span>
            </div>
            
            <div className="detail-row">
              <strong>Submitted:</strong>
              <span>{new Date(bid.createdAt).toLocaleDateString()} at {new Date(bid.createdAt).toLocaleTimeString()}</span>
            </div>
            
            <div className="detail-row">
              <strong>Status:</strong>
              <span className={`status-badge status-${bid.status}`}>
                {bid.status === 'accepted' ? 'Assigned' : bid.status}
              </span>
            </div>
          </div>

          <div className="proposal-section">
            <h4>Proposal Details</h4>
            <div className="proposal-content">
              {bid.proposal}
            </div>
          </div>

          {isProjectOwner && bid.status === 'pending' && (
            <div className="bid-actions">
              <button
                className="btn btn-success btn-large"
                onClick={handleAcceptBid}
              >
                Accept This Bid
              </button>
            </div>
          )}

          {/* Fund Escrow Button - Only show for project owner after bid is accepted and no escrow exists */}
          {isProjectOwner && bid.status === 'accepted' && !existingEscrow && (
            <div className="bid-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={handleFundEscrow}
                style={{
                  backgroundColor: '#17a2b8',
                  borderColor: '#17a2b8',
                  fontSize: '16px',
                  padding: '12px 24px'
                }}
              >
                💰 Send Funds to Escrow
              </button>
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#1976d2'
              }}>
                💡 <strong>Escrow Protection:</strong> Secure your payment until work is completed and approved.
              </div>
            </div>
          )}

          {/* Escrow Status Display */}
          {existingEscrow && (
            <div className="bid-actions">
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '10px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>💰 Escrow Status</h4>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>Amount:</strong> ₹{existingEscrow.amount}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>Status:</strong> 
                  <span style={{ 
                    color: existingEscrow.status === 'pending' ? '#ffc107' : 
                           existingEscrow.status === 'in_progress' ? '#17a2b8' :
                           existingEscrow.status === 'ready_for_release' ? '#28a745' :
                           existingEscrow.status === 'released' ? '#6c757d' : '#dc3545',
                    fontWeight: 'bold',
                    marginLeft: '5px'
                  }}>
                    {existingEscrow.status === 'pending' ? 'Pending Release' :
                     existingEscrow.status === 'in_progress' ? 'Work In Progress' :
                     existingEscrow.status === 'ready_for_release' ? 'Ready for Release' :
                     existingEscrow.status === 'released' ? 'Funds Released' : 'Cancelled'}
                  </span>
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>Created:</strong> {new Date(existingEscrow.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Approve Work for Escrow Release - Only show for project owner when project is completed and escrow exists */}
          {isProjectOwner && bid.status === 'accepted' && project?.status === 'completed' && existingEscrow && existingEscrow.status === 'in_progress' && (
            <div className="bid-actions">
              <button
                className="btn btn-success btn-large"
                onClick={async () => {
                  const confirmed = window.confirm(
                    `Are you satisfied with the completed work?\n\n` +
                    `This will notify the admin that funds are ready to be released to the freelancer.\n\n` +
                    `Amount to be released: ₹${existingEscrow.amount}`
                  );
                  
                  if (confirmed) {
                    try {
                      // Update escrow status to ready for release
                      await updateEscrowStatus(existingEscrow.id, 'ready_for_release', 'Client approved completed work');
                      
                      alert('✅ Work approved! Admin has been notified to release funds to the freelancer.');
                      window.location.reload();
                    } catch (error) {
                      console.error('Error updating escrow status:', error);
                      alert('Error approving work. Please try again.');
                    }
                  }
                }}
                style={{
                  backgroundColor: '#28a745',
                  borderColor: '#28a745',
                  fontSize: '16px',
                  padding: '12px 24px'
                }}
              >
                ✅ Approve Work & Release Funds
              </button>
              {/* Only show "Work Approved" message if escrow status is ready_for_release */}
              {existingEscrow.status === 'ready_for_release' && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#155724'
                }}>
                  💡 <strong>Work Approved:</strong> Admin will release ₹{existingEscrow.amount} to the freelancer.
                </div>
              )}
            </div>
          )}

          {/* Settle Payment Button - Only show for project owner when project is completed and no escrow exists */}
          {isProjectOwner && bid.status === 'accepted' && project?.status === 'completed' && !pendingPaymentRequest && !existingEscrow && (
            <div className="bid-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={handleSettlePayment}
                style={{
                  backgroundColor: '#28a745',
                  borderColor: '#28a745',
                  fontSize: '16px',
                  padding: '12px 24px'
                }}
              >
                💰 Settle Payment
              </button>
            </div>
          )}

          {/* Show message if payment settlement request is already pending */}
          {isProjectOwner && bid.status === 'accepted' && project?.status === 'completed' && pendingPaymentRequest && (
            <div className="bid-actions">
              <div style={{
                padding: '12px 24px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                color: '#856404',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                ⏳ Payment settlement request sent. Waiting for freelancer to accept.
              </div>
            </div>
          )}

          {/* Accept Payment Button - Only show for assigned freelancer when payment settlement request is pending */}
          {isAssignedFreelancer && bid.status === 'accepted' && project?.status === 'completed' && pendingPaymentRequest && (
            <div className="bid-actions">
              <button
                className="btn btn-success btn-large"
                onClick={() => handleAcceptPayment(projectId, pendingPaymentRequest.id)}
                style={{
                  backgroundColor: '#28a745',
                  borderColor: '#28a745',
                  fontSize: '16px',
                  padding: '12px 24px'
                }}
              >
                💰 Accept Payment
              </button>
            </div>
          )}
        </div>

        {/* Freelancer Information */}
        <div className="card">
          <h2>Freelancer Profile</h2>
          
          {freelancer ? (
            <div className="freelancer-details">
              <div className="freelancer-header">
                <div className="freelancer-avatar">
                  <span className="avatar-placeholder">
                    {freelancer.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="freelancer-info">
                  <h3>{freelancer.username}</h3>
                  <p className="freelancer-role">{freelancer.role}</p>
                  <div className="rating">
                    ⭐ {freelancer.profile?.rating || 0}/5
                  </div>
                </div>
              </div>

              <div className="freelancer-stats">
                <div className="stat">
                  <strong>Member Since:</strong>
                  <span>{new Date(freelancer.createdAt).toLocaleDateString()}</span>
                </div>
                
                {freelancer.profile?.hourlyRate && (
                  <div className="stat">
                    <strong>Hourly Rate:</strong>
                    <span>₹{freelancer.profile.hourlyRate}/hr</span>
                  </div>
                )}
                
                {freelancer.profile?.name && (
                  <div className="stat">
                    <strong>Full Name:</strong>
                    <span>{freelancer.profile.name}</span>
                  </div>
                )}
              </div>

              {freelancer.profile?.skills && freelancer.profile.skills.length > 0 && (
                <div className="skills-section">
                  <h4>Skills</h4>
                  <div className="skills-list">
                    {freelancer.profile.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {freelancer.profile?.bio && (
                <div className="bio-section">
                  <h4>About</h4>
                  <p className="bio-content">{freelancer.profile.bio}</p>
                </div>
              )}

              {freelancer.profile?.portfolio && freelancer.profile.portfolio.length > 0 && (
                <div className="portfolio-section">
                  <h4>Portfolio</h4>
                  <div className="portfolio-links">
                    {freelancer.profile.portfolio.map((link, index) => (
                      <a 
                        key={index} 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portfolio-link"
                      >
                        Portfolio Link {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="freelancer-actions">
                <Link 
                  to={`/freelancer/${freelancer._id}`} 
                  className="btn btn-primary"
                >
                  View Full Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="loading">Loading freelancer details...</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BidDetail;
