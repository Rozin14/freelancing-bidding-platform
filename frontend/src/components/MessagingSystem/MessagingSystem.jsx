import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './MessagingSystem.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MessagingSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [conversations, setConversations] = useState([]);
  const [acceptedProjects, setAcceptedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputes, setDisputes] = useState([]);
  const [platformNotifications, setPlatformNotifications] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);

  const loadDisputes = () => {
    const storedDisputes = localStorage.getItem('disputes');
    if (storedDisputes) {
      setDisputes(JSON.parse(storedDisputes));
    }
  };

  const loadPlatformNotifications = () => {
    const storedNotifications = localStorage.getItem('platformNotifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      // Filter notifications for current user (both read and unread for display)
      const userNotifications = notifications.filter(notification => 
        notification.to === user.id
      );
      setPlatformNotifications(userNotifications);
    }
  };

  // Count unread notifications for a specific project
  const getUnreadNotificationCount = (projectId) => {
    const storedNotifications = localStorage.getItem('platformNotifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      return notifications.filter(notification => 
        notification.to === user.id && 
        notification.projectId === projectId &&
        !notification.isRead
      ).length;
    }
    return 0;
  };

  useEffect(() => {
    loadAcceptedProjects();
  }, []);

  useEffect(() => {
    if (acceptedProjects.length > 0) {
      loadMessages();
    }
  }, [acceptedProjects]);

  useEffect(() => {
    loadDisputes();
    loadPlatformNotifications();
  }, []);

  const loadAcceptedProjects = async () => {
    try {
      setLoading(true);
      let projects = [];
      
      if (user.role === 'client') {
        // Get projects where this client has accepted bids
        const response = await axios.get('/api/projects');
        
        // Filter for projects with accepted bids (either in_progress or with accepted bids)
        projects = response.data.filter(project => {
          const isClientOwner = project.clientId._id === user.id;
          const hasFreelancer = project.freelancerId;
          const isInProgress = project.status === 'in_progress';
          
          return isClientOwner && hasFreelancer && (isInProgress || project.status === 'completed');
        });
        
        // Alternative: Check bids collection directly for accepted bids
        if (projects.length === 0) {
          try {
            // Get all projects for this client
            const clientProjects = response.data.filter(project => project.clientId._id === user.id);
            
            // For each project, check if there are accepted bids
            for (const project of clientProjects) {
              try {
                const bidsResponse = await axios.get(`/api/bids/projects/${project._id}`);
                
                const acceptedBid = bidsResponse.data.find(bid => bid.status === 'accepted');
                if (acceptedBid) {
                  projects.push({
                    ...project,
                    freelancerId: acceptedBid.freelancerId // This should be populated from the bid
                  });
                }
              } catch (bidError) {
                // Silently handle bid fetch errors
              }
            }
          } catch (error) {
            // Silently handle collection check errors
          }
        }
      } else if (user.role === 'freelancer') {
        // Get projects where this freelancer has accepted bids
        const response = await axios.get('/api/projects');
        
        // Filter for projects with accepted bids (either in_progress or with accepted bids)
        projects = response.data.filter(project => {
          const isFreelancerAssigned = project.freelancerId && project.freelancerId._id === user.id;
          const isInProgress = project.status === 'in_progress';
          
          return isFreelancerAssigned && (isInProgress || project.status === 'completed');
        });
        
        // Alternative: Check bids collection directly for accepted bids
        if (projects.length === 0) {
          try {
            // Get all projects
            const allProjects = response.data;
            
            // For each project, check if this freelancer has an accepted bid
            for (const project of allProjects) {
              try {
                const bidsResponse = await axios.get(`/api/bids/projects/${project._id}`);
                
                const acceptedBid = bidsResponse.data.find(bid => 
                  bid.status === 'accepted' && 
                  (bid.freelancerId._id === user.id || bid.freelancerId === user.id)
                );
                if (acceptedBid) {
                  projects.push({
                    ...project,
                    freelancerId: acceptedBid.freelancerId // This should be populated from the bid
                  });
                }
              } catch (bidError) {
                // Silently handle bid fetch errors
              }
            }
          } catch (error) {
            // Silently handle collection check errors
          }
        }
      } else if (user.role === 'admin') {
        // For admins, load projects from disputes
        const storedDisputes = localStorage.getItem('disputes');
        console.log('Admin - Stored disputes:', storedDisputes);
        if (storedDisputes) {
          const disputesList = JSON.parse(storedDisputes);
          console.log('Admin - Disputes list:', disputesList);
          const response = await axios.get('/api/projects');
          console.log('Admin - All projects:', response.data);
          
          // Get unique project IDs from disputes
          const disputeProjectIds = [...new Set(disputesList.map(d => d.projectId))];
          console.log('Admin - Dispute project IDs:', disputeProjectIds);
          
          // Find projects that have disputes
          projects = response.data.filter(project => 
            disputeProjectIds.includes(project._id)
          );
          console.log('Admin - Filtered dispute projects:', projects);
        }
      }
      
      setAcceptedProjects(projects);
    } catch (error) {
      console.error('Error loading accepted projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = () => {
    const storedMessages = localStorage.getItem('messages');
    if (storedMessages) {
      const allMessages = JSON.parse(storedMessages);
      
      // Fix messages with missing usernames
      const fixedMessages = allMessages.map(message => {
        if (!message.fromUsername || !message.toUsername) {
          // Get the missing username from project data
          const fromUsername = message.fromUsername || getUsernameFromProjects(message.from);
          const toUsername = message.toUsername || getUsernameFromProjects(message.to);
          
          return {
            ...message,
            fromUsername,
            toUsername
          };
        }
        return message;
      });
      
      setMessages(fixedMessages);
      
      // Save the fixed messages back to localStorage
      if (JSON.stringify(fixedMessages) !== JSON.stringify(allMessages)) {
        localStorage.setItem('messages', JSON.stringify(fixedMessages));
      }
    } else {
      setMessages([]);
    }
    
    // Get conversation partners from accepted projects
    const partners = new Set();
    
    // Add partners from accepted projects (even if no messages exist yet)
    acceptedProjects.forEach(project => {
      const clientId = project.clientId._id || project.clientId;
      const freelancerId = project.freelancerId._id || project.freelancerId;
      
      if (user.role === 'admin') {
        // For admins, add both client and freelancer as potential conversation partners
        partners.add(clientId);
        partners.add(freelancerId);
      } else if (user.id === clientId) {
        partners.add(freelancerId);
      } else if (user.id === freelancerId) {
        partners.add(clientId);
      }
    });
    
    // Also add partners from existing messages (if any)
    if (storedMessages) {
      const allMessages = JSON.parse(storedMessages);
      allMessages.forEach(msg => {
        // Check if this message is between users who have accepted projects
        const hasAcceptedProject = acceptedProjects.some(project => {
          const clientId = project.clientId._id || project.clientId;
          const freelancerId = project.freelancerId._id || project.freelancerId;
          return (msg.from === clientId && msg.to === freelancerId) ||
                 (msg.from === freelancerId && msg.to === clientId);
        });
        
        if (hasAcceptedProject) {
          if (msg.from === user.id) {
            partners.add(msg.to);
          } else if (msg.to === user.id) {
            partners.add(msg.from);
          }
        }
      });
    }
    
    setConversations(Array.from(partners));
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;

    // Check if user can send message to selected user (they must have accepted projects)
    const canSendMessage = user.role === 'admin' || acceptedProjects.some(project => {
      const clientId = project.clientId._id || project.clientId;
      const freelancerId = project.freelancerId._id || project.freelancerId;
      return (user.id === clientId && selectedUser === freelancerId) ||
             (user.id === freelancerId && selectedUser === clientId);
    });

    if (!canSendMessage) {
      alert('You can only message users you have active projects with.');
      return;
    }

    const message = {
      id: Date.now(),
      from: user.id,
      to: selectedUser,
      content: newMessage,
      timestamp: new Date().toISOString(),
      fromUsername: user.username,
      toUsername: getPartnerUsername(selectedUser),
      projectId: getProjectIdForConversation(selectedUser)
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    localStorage.setItem('messages', JSON.stringify(updatedMessages));
    setNewMessage('');
  };

  const getProjectIdForConversation = (partnerId) => {
    const project = acceptedProjects.find(project => {
      const clientId = project.clientId._id || project.clientId;
      const freelancerId = project.freelancerId._id || project.freelancerId;
      return (user.id === clientId && partnerId === freelancerId) ||
             (user.id === freelancerId && partnerId === clientId);
    });
    return project ? project._id : null;
  };

  const getConversationMessages = (partnerId) => {
    if (user.role === 'admin') {
      // For admins, show all messages in the conversation between client and freelancer
      const project = acceptedProjects.find(p => {
        const clientId = p.clientId._id || p.clientId;
        const freelancerId = p.freelancerId._id || p.freelancerId;
        return clientId === partnerId || freelancerId === partnerId;
      });
      
      if (project) {
        const clientId = project.clientId._id || project.clientId;
        const freelancerId = project.freelancerId._id || project.freelancerId;
        
        // Return all messages between client, freelancer, and admin
    return messages.filter(msg => 
          // Messages between client and freelancer
          (msg.from === clientId && msg.to === freelancerId) ||
          (msg.from === freelancerId && msg.to === clientId) ||
          // Admin messages to either party
          (msg.from === user.id && (msg.to === clientId || msg.to === freelancerId)) ||
          // Messages to admin from either party
          ((msg.from === clientId || msg.from === freelancerId) && msg.to === user.id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    }
    
    // For regular users (client/freelancer), show their messages with partner + admin messages
    return messages.filter(msg => {
      // Direct messages between user and partner
      const isDirectMessage = (msg.from === user.id && msg.to === partnerId) ||
                              (msg.from === partnerId && msg.to === user.id);
      
      // Admin messages in this conversation
      const isAdminMessage = (msg.from === partnerId || msg.to === partnerId || 
                             msg.from === user.id || msg.to === user.id);
      
      return isDirectMessage || (isAdminMessage && (msg.fromUsername === 'FreelanceHub Platform' || 
                                                     msg.fromUsername?.includes('admin')));
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const getUsernameFromProjects = (partnerId) => {
    const project = acceptedProjects.find(project => {
      const clientId = project.clientId._id || project.clientId;
      const freelancerId = project.freelancerId._id || project.freelancerId;
      return clientId === partnerId || freelancerId === partnerId;
    });
    
    if (project) {
      if (project.clientId._id === partnerId || project.clientId === partnerId) {
        return project.clientId.username || project.clientId.name || 'Client';
      } else if (project.freelancerId._id === partnerId || project.freelancerId === partnerId) {
        return project.freelancerId.username || project.freelancerId.name || 'Freelancer';
      }
    }
    
    return 'Unknown User';
  };

  const getPartnerUsername = (partnerId) => {
    // First try to get username from existing messages
    const message = messages.find(msg => 
      msg.from === partnerId || msg.to === partnerId
    );
    
    if (message) {
      const username = message.from === partnerId ? message.fromUsername : message.toUsername;
      if (username && username !== 'Unknown User') {
        return username;
      }
    }
    
    // If no message found or username is missing, try to get from accepted projects
    return getUsernameFromProjects(partnerId);
  };

  const getProjectForConversation = (partnerId) => {
    if (user.role === 'admin') {
      // For admin, find the project where partnerId is either client or freelancer
      return acceptedProjects.find(project => {
        const clientId = project.clientId._id || project.clientId;
        const freelancerId = project.freelancerId._id || project.freelancerId;
        return clientId === partnerId || freelancerId === partnerId;
      });
    }
    
    return acceptedProjects.find(project => {
      const clientId = project.clientId._id || project.clientId;
      const freelancerId = project.freelancerId._id || project.freelancerId;
      return (user.id === clientId && partnerId === freelancerId) ||
             (user.id === freelancerId && partnerId === clientId);
    });
  };

  if (loading) {
    return (
      <div className="container">
        <h1>Messages</h1>
        <div className="loading">Loading conversations...</div>
      </div>
    );
  }

  const handleRaiseDispute = () => {
    setShowDisputeForm(true);
  };

  const handleDisputeSubmit = () => {
    if (!disputeDescription.trim()) {
      alert('Please enter a dispute description');
      return;
    }

    const project = getProjectForConversation(selectedUser);
    const otherPartyId = selectedUser;
    const otherPartyUsername = getPartnerUsername(selectedUser);

    const dispute = {
      id: Date.now(),
      projectId: project._id,
      projectTitle: project.title,
      disputeRaiserId: user.id,
      disputeRaiserUsername: user.username,
      disputeRaiserRole: user.role,
      otherPartyId: otherPartyId,
      otherPartyUsername: otherPartyUsername,
      otherPartyRole: user.role === 'client' ? 'freelancer' : 'client',
      description: disputeDescription,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isReadByAdmin: false
    };

    const updatedDisputes = [...disputes, dispute];
    setDisputes(updatedDisputes);
    localStorage.setItem('disputes', JSON.stringify(updatedDisputes));

    // Reset form
    setDisputeDescription('');
    setShowDisputeForm(false);
    
    alert('Dispute raised successfully! Admins will review it shortly.');
  };

  const handleDisputeCancel = () => {
    setDisputeDescription('');
    setShowDisputeForm(false);
  };

  const handleRedirectToBidDetails = (notification) => {
    // Navigate to bid details page using the correct route format
    const { projectId, bidId } = notification;
    if (projectId && bidId) {
      navigate(`/projects/${projectId}/bids/${bidId}`);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    // Get existing notifications
    const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
    
    // Mark the specific notification as read
    const updatedNotifications = existingNotifications.map(notif => 
      notif.id === notificationId 
        ? { ...notif, isRead: true }
        : notif
    );
    
    // Save updated notifications
    localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
    
    // Reload notifications to update the display
    loadPlatformNotifications();
    
    // Force re-render to update badge counts
    setConversations([...conversations]);
  };

  const handleMarkDisputeAsRead = (disputeId) => {
    // Mark the specific dispute as read by admin
    const updatedDisputes = disputes.map(dispute => 
      dispute.id === disputeId 
        ? { ...dispute, isReadByAdmin: true }
        : dispute
    );
    
    // Save updated disputes
    setDisputes(updatedDisputes);
    localStorage.setItem('disputes', JSON.stringify(updatedDisputes));
  };

  const handleCloseDispute = (dispute) => {
    if (!window.confirm('Are you sure you want to close this dispute? Both participants will be notified.')) {
      return;
    }

    // Update dispute status to closed
    const updatedDisputes = disputes.map(d => 
      d.id === dispute.id 
        ? { ...d, status: 'closed', closedAt: new Date().toISOString(), closedBy: user.username }
        : d
    );
    
    setDisputes(updatedDisputes);
    localStorage.setItem('disputes', JSON.stringify(updatedDisputes));

    // Create platform notifications for both participants
    const existingNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
    
    const notificationForRaiser = {
      id: Date.now(),
      type: 'dispute_closed',
      content: `Admin ${user.username} has closed your dispute regarding project "${dispute.projectTitle}".`,
      projectId: dispute.projectId,
      toUserId: dispute.disputeRaiserId,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    const notificationForOtherParty = {
      id: Date.now() + 1,
      type: 'dispute_closed',
      content: `Admin ${user.username} has closed the dispute raised against you regarding project "${dispute.projectTitle}".`,
      projectId: dispute.projectId,
      toUserId: dispute.otherPartyId,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    const updatedNotifications = [...existingNotifications, notificationForRaiser, notificationForOtherParty];
    localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));

    alert('Dispute closed successfully. Both participants have been notified.');
    
    // Clear selected dispute if it was the one closed
    if (selectedDispute && selectedDispute.id === dispute.id) {
      setSelectedDispute(null);
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
        
        // Reload notifications to update the display
        loadPlatformNotifications();
        
        alert('Payment accepted successfully! The project has been marked as closed.');
      } catch (error) {
        console.error('Error accepting payment:', error);
        const errorMessage = error.response?.data?.message || 'Error accepting payment. Please try again.';
        alert(errorMessage);
      }
    }
  };

  return (
    <div className="container">
      <h1>Messages and Disputes</h1>
      
      {/* Dispute Form Modal */}
      {showDisputeForm && (
        <div className="dispute-modal-overlay">
          <div className="dispute-modal">
            <h3>🚨 Raise Dispute</h3>
            
            <div className="dispute-info">
              <p><strong>Project:</strong> {getProjectForConversation(selectedUser)?.title}</p>
              <p><strong>Disputing with:</strong> {getPartnerUsername(selectedUser)}</p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Dispute Description *</label>
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                className="form-textarea dispute-textarea"
                placeholder="Please describe the issue in detail. Include any relevant information that will help admins understand and resolve the dispute."
                rows="6"
              />
            </div>
            
            <div className="dispute-actions">
              <button
                onClick={handleDisputeCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDisputeSubmit}
                className="btn btn-danger"
                disabled={!disputeDescription.trim()}
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Admin Disputes View */}
      {user.role === 'admin' ? (
        <div className="card">
          <h3>Disputes Management</h3>
          {disputes.length > 0 ? (
            <div>
              {disputes.map(dispute => (
                <div key={dispute.id} style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '15px',
                  backgroundColor: dispute.status === 'pending' ? '#fff3cd' : '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Admin clicked dispute:', dispute);
                  setSelectedDispute(dispute);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#dc3545' }}>🚨 Dispute #{dispute.id}</h4>
                      <p style={{ margin: '0', color: '#666' }}>
                        <strong>Project:</strong> {dispute.projectTitle}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: dispute.status === 'closed' ? '#6c757d' : '#ffc107',
                      color: dispute.status === 'closed' ? '#fff' : '#856404'
                    }}>
                      {dispute.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Raised by:</strong> {dispute.disputeRaiserUsername} ({dispute.disputeRaiserRole})
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Against:</strong> {dispute.otherPartyUsername} ({dispute.otherPartyRole})
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Date:</strong> {new Date(dispute.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '6px',
                    borderLeft: '4px solid #dc3545'
                  }}>
                    <strong>Description:</strong>
                    <p style={{ margin: '10px 0 0 0', lineHeight: '1.5' }}>
                      {dispute.description}
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    {!dispute.isReadByAdmin && (
                      <button
                        onClick={() => handleMarkDisputeAsRead(dispute.id)}
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Read
                      </button>
                    )}
                    {dispute.status !== 'closed' && (
                      <button
                        onClick={() => handleCloseDispute(dispute)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as Closed
                      </button>
                    )}
                    {dispute.status === 'closed' && (
                      <span style={{
                        color: '#28a745',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        padding: '8px 0'
                      }}>
                        ✓ Closed by {dispute.closedBy} on {new Date(dispute.closedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No disputes have been raised yet.</p>
            </div>
          )}
          
          {/* Admin Message Box for Selected Dispute */}
          {selectedDispute && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>Dispute Conversation - {selectedDispute.projectTitle}</h3>
                <button 
                  onClick={() => setSelectedDispute(null)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
              
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>Raised by:</strong> {selectedDispute.disputeRaiserUsername} ({selectedDispute.disputeRaiserRole})
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Against:</strong> {selectedDispute.otherPartyUsername} ({selectedDispute.otherPartyRole})
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Issue:</strong> {selectedDispute.description}
                </p>
              </div>
              
              {/* Messages Display */}
              <div style={{ 
                height: '300px', 
                overflowY: 'auto', 
                border: '1px solid #eee', 
                padding: '10px', 
                marginBottom: '10px',
                backgroundColor: '#fff'
              }}>
                {(() => {
                  // Get all messages for this project
                  const storedMessages = localStorage.getItem('messages');
                  if (!storedMessages) return <p style={{ textAlign: 'center', color: '#666' }}>No messages yet</p>;
                  
                  const allMessages = JSON.parse(storedMessages);
                  const projectMessages = allMessages.filter(msg => {
                    // Messages between client and freelancer for this project
                    const isClientFreelancerMsg = (msg.from === selectedDispute.disputeRaiserId && msg.to === selectedDispute.otherPartyId) ||
                                                  (msg.from === selectedDispute.otherPartyId && msg.to === selectedDispute.disputeRaiserId);
                    // Admin messages - check if message involves this project's parties
                    const isAdminMsg = msg.isAdminMessage && (
                      msg.clientId === selectedDispute.disputeRaiserId || 
                      msg.clientId === selectedDispute.otherPartyId ||
                      msg.freelancerId === selectedDispute.disputeRaiserId || 
                      msg.freelancerId === selectedDispute.otherPartyId
                    );
                    return isClientFreelancerMsg || isAdminMsg;
                  }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                  
                  if (projectMessages.length === 0) {
                    return <p style={{ textAlign: 'center', color: '#666' }}>No messages yet in this conversation</p>;
                  }
                  
                  return projectMessages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        marginBottom: '10px',
                        textAlign: msg.from === user.id ? 'right' : 'left'
                      }}
                    >
                      {msg.from !== user.id && (
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                          {msg.fromUsername || 'User'}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: msg.from === user.id ? '#007bff' : '#f8f9fa',
                          color: msg.from === user.id ? 'white' : 'black',
                          maxWidth: '70%'
                        }}
                      >
                        <div>{msg.content}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                          {new Date(msg.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              
              {/* Message Input */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message as admin..."
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    resize: 'none',
                    minHeight: '60px'
                  }}
                />
                <button
                  onClick={() => {
                    if (!newMessage.trim()) return;
                    
                    // Create one admin message that both parties can see
                    const adminMessage = {
                      id: Date.now(),
                      from: user.id,
                      to: selectedDispute.disputeRaiserId, // Store primary recipient
                      content: newMessage,
                      timestamp: new Date().toISOString(),
                      fromUsername: user.username,
                      toUsername: selectedDispute.disputeRaiserUsername,
                      isAdminMessage: true,
                      isReadByClient: false,
                      isReadByFreelancer: false,
                      projectId: selectedDispute.projectId,
                      // Store both party IDs so we know who's involved
                      clientId: selectedDispute.disputeRaiserRole === 'client' ? selectedDispute.disputeRaiserId : selectedDispute.otherPartyId,
                      freelancerId: selectedDispute.disputeRaiserRole === 'freelancer' ? selectedDispute.disputeRaiserId : selectedDispute.otherPartyId
                    };
                    
                    const storedMessages = localStorage.getItem('messages');
                    const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
                    allMessages.push(adminMessage);
                    localStorage.setItem('messages', JSON.stringify(allMessages));
                    setMessages(allMessages);
                    setNewMessage('');
                    
                    // Trigger re-render
                    setSelectedDispute({...selectedDispute});
                  }}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-end' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (acceptedProjects.length === 0 && user.role !== 'admin') ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3>No Active Projects</h3>
            <p>You need to have accepted bids on projects to start messaging.</p>
            <p>Once a bid is accepted, you can communicate with your client/freelancer here.</p>
            
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4>Current Status:</h4>
              <p><strong>Your Role:</strong> {user?.role === 'client' ? 'Client' : 'Freelancer'}</p>
              <p><strong>Active Projects:</strong> {acceptedProjects.length}</p>
              <p><strong>Status:</strong> {loading ? 'Loading...' : 'Ready'}</p>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <h4>How to enable messaging:</h4>
              <ol style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>Create a project (if you're a client)</li>
                <li>Place a bid on a project (if you're a freelancer)</li>
                <li>Accept the bid (if you're the client)</li>
                <li>Come back to messages - you'll see the conversation!</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="grid grid-2">
            <div>
              <h3>Active Project Conversations</h3>
              {(() => {
                console.log('Rendering conversations - Role:', user.role, 'Conversations:', conversations.length, 'Accepted Projects:', acceptedProjects.length);
                return (conversations.length > 0 || (user.role === 'admin' && acceptedProjects.length > 0));
              })() ? (
                <div>
                  {user.role === 'admin' && acceptedProjects.length > 0 ? (
                    // For admins, show all dispute projects
                    acceptedProjects.map(project => {
                      const clientId = project.clientId._id || project.clientId;
                      const freelancerId = project.freelancerId._id || project.freelancerId;
                      const isSelected = selectedUser === clientId || selectedUser === freelancerId;
                      const displayPartnerId = clientId; // Default to showing client
                      
                      return (
                        <div
                          key={project._id}
                          className={`mb-10 p-10 ${isSelected ? 'bg-light' : ''}`}
                          style={{
                            padding: '15px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#f8f9fa' : 'white',
                            position: 'relative'
                          }}
                          onClick={() => setSelectedUser(clientId)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <strong>{project.clientId.username || 'Client'} ↔️ {project.freelancerId?.username || 'Freelancer'}</strong>
                              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                                <strong>Project:</strong> {project.title}
                              </div>
                              <div style={{ fontSize: '14px', color: '#666' }}>
                                {getConversationMessages(clientId).length} messages
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // For regular users, show conversation partners
                    conversations.map(partnerId => {
                    const project = getProjectForConversation(partnerId);
                      const unreadCount = project?._id ? getUnreadNotificationCount(project._id) : 0;
                    return (
                      <div
                        key={partnerId}
                        className={`mb-10 p-10 ${selectedUser === partnerId ? 'bg-light' : ''}`}
                        style={{
                          padding: '15px',
                          border: '1px solid #eee',
                          borderRadius: '8px',
                          cursor: 'pointer',
                            backgroundColor: selectedUser === partnerId ? '#f8f9fa' : 'white',
                            position: 'relative'
                        }}
                        onClick={() => setSelectedUser(partnerId)}
                      >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                        <strong>{getPartnerUsername(partnerId)}</strong>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                          <strong>Project:</strong> {project?.title}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {getConversationMessages(partnerId).length} messages
                              </div>
                            </div>
                            {unreadCount > 0 && (
                              <div style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                flexShrink: 0,
                                marginLeft: '10px'
                              }}>
                                {unreadCount}
                              </div>
                            )}
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <p>No messages yet for your active projects.</p>
                  <p>Start a conversation with your client/freelancer!</p>
                </div>
              )}
            </div>

          <div>
            <h3>Messages</h3>
            {selectedUser ? (
              <div>
                {(() => {
                  const project = getProjectForConversation(selectedUser);
                  return (
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px', 
                      marginBottom: '10px',
                      fontSize: '14px'
                    }}>
                      <strong>Project:</strong> {project?.title}<br/>
                      <strong>Budget:</strong> ₹{project?.budget}<br/>
                      <strong>Status:</strong> {project?.status === 'closed' ? 'completed and closed' : project?.status?.replace('_', ' ')}
                    </div>
                  );
                })()}
                
                <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
                  {(() => {
                    const conversationMessages = getConversationMessages(selectedUser);
                    const projectNotifications = platformNotifications.filter(notification => 
                      notification.projectId === getProjectForConversation(selectedUser)?._id
                    );
                    
                    // Combine messages and notifications, sort by timestamp
                    const allItems = [
                      ...conversationMessages.map(msg => ({ ...msg, type: 'message' })),
                      ...projectNotifications.map(notif => ({ ...notif, type: 'notification' }))
                    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    return allItems.map(item => {
                      if (item.type === 'notification') {
                        // Platform notification - centered
                        return (
                          <div key={item.id} style={{ textAlign: 'center', margin: '10px 0' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                backgroundColor: '#e3f2fd',
                                border: '1px solid #2196f3',
                                color: '#1976d2',
                                fontSize: '14px',
                                fontWeight: '500',
                                maxWidth: '80%'
                              }}
                            >
                              🔔 {item.content}
                              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                                {new Date(item.timestamp).toLocaleString()}
                              </div>
                              
                              {/* Action buttons */}
                              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {/* Action button for redirecting to bid details */}
                                {item.hasAction && item.actionType === 'redirect_to_bid_details' && (
                                  <button
                                    onClick={() => handleRedirectToBidDetails(item)}
                                    style={{
                                      backgroundColor: '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '15px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {item.actionText}
                                  </button>
                                )}
                                
                                {/* Mark as read button */}
                                {!item.isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(item.id)}
                                    style={{
                                      backgroundColor: '#6c757d',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '15px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Mark as Read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Regular message - left/right aligned
                        return (
                          <div
                            key={item.id}
                            className={`mb-10 ${item.from === user.id ? 'text-right' : 'text-left'}`}
                          >
                            {/* Sender name above message - only for other person's messages */}
                            {item.from !== user.id && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#666', 
                                marginBottom: '2px',
                                fontWeight: '500'
                              }}>
                                {getPartnerUsername(item.from)}
                              </div>
                            )}
                            
                      <div>
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '8px 12px',
                          borderRadius: '8px',
                            backgroundColor: item.from === user.id ? '#007bff' : (item.isAdminMessage ? '#ffcdd2' : '#f8f9fa'),
                            color: item.from === user.id ? 'white' : (item.isAdminMessage ? '#c62828' : 'black'),
                          maxWidth: '70%'
                        }}
                      >
                          <div>{item.content}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        {/* Mark as Read button for admin messages */}
                        {item.isAdminMessage && item.from !== user.id && (
                          (user.role === 'client' && !item.isReadByClient) || 
                          (user.role === 'freelancer' && !item.isReadByFreelancer)
                        ) && (
                          <div style={{ marginTop: '5px' }}>
                            <button
                              onClick={() => {
                                const storedMessages = localStorage.getItem('messages');
                                const allMessages = JSON.parse(storedMessages || '[]');
                                const updatedMessages = allMessages.map(msg => {
                                  if (msg.id === item.id) {
                                    if (user.role === 'client') {
                                      return { ...msg, isReadByClient: true };
                                    } else if (user.role === 'freelancer') {
                                      return { ...msg, isReadByFreelancer: true };
                                    }
                                  }
                                  return msg;
                                });
                                localStorage.setItem('messages', JSON.stringify(updatedMessages));
                                setMessages(updatedMessages);
                              }}
                              style={{
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Mark as Read
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                        );
                      }
                    });
                  })()}
                </div>

                <div className="flex gap-10">
                  <input
                    type="text"
                    className="form-input"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <p>Select a conversation to view messages.</p>
            )}

            {/* Raise Dispute Button - Only show when conversation is selected and user is not admin */}
            {acceptedProjects.length > 0 && selectedUser && user.role !== 'admin' && (
              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <button
                  onClick={handleRaiseDispute}
                  className="btn btn-danger"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(220, 53, 69, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                  }}
                >
                  🚨 Raise Dispute
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      
    </div>
  );
};

export default MessagingSystem;
