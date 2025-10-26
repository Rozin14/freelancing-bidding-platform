import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './MessagingSystem.css';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axiosConfig';

const MessagingSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for messages
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [conversations, setConversations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [acceptedProjects, setAcceptedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for disputes
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [disputeList, setDisputeList] = useState([]);
  const [currentDispute, setCurrentDispute] = useState(null);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [selectedDispute, setSelectedDispute] = useState(null);
  
  // State for messaging
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  
  // State for notifications
  const [notifications, setNotifications] = useState([]);
  const [platformNotifications, setPlatformNotifications] = useState([]);

  // Load disputes from storage
  const loadDisputes = () => {
    const savedDisputes = localStorage.getItem('disputes');
    if (savedDisputes) {
      setDisputeList(JSON.parse(savedDisputes));
    }
  };

  // Load notifications for the current user
  const loadPlatformNotifications = () => {
    const savedNotifications = localStorage.getItem('platformNotifications');
    if (savedNotifications) {
      const allNotifications = JSON.parse(savedNotifications);
      // Get notifications for this user
      const userNotifications = allNotifications.filter(
        notification =>
          notification.to === user.id || notification.toUserId === user.id
      );
      setNotifications(userNotifications);
      setPlatformNotifications(userNotifications);
    }
  };

  // Count unread notifications for a specific project
  const getUnreadNotificationCount = projectId => {
    const storedNotifications = localStorage.getItem('platformNotifications');
    if (storedNotifications) {
      const notifications = JSON.parse(storedNotifications);
      return notifications.filter(
        notification =>
          (notification.to === user.id || notification.toUserId === user.id) &&
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
      setIsLoading(true);
      let projects = [];

      if (!user || !user.id) {
        console.error('User not properly loaded:', user);
        setIsLoading(false);
        return;
      }

      if (user.role === 'client') {
        // Get projects where this client has accepted bids
        const response = await api.get('/api/projects');

        // Filter for projects with accepted bids (either in_progress or with accepted bids)
        projects = response.data.filter(project => {
          const isClientOwner = project.clientId?._id === user.id;
          const hasFreelancer = project.freelancerId;
          const isInProgress = project.status === 'in_progress';

          return (
            isClientOwner &&
            hasFreelancer &&
            (isInProgress || project.status === 'completed')
          );
        });

        // Alternative: Check bids collection directly for accepted bids
        if (projects.length === 0) {
          try {
            // Get all projects for this client
            const clientProjects = response.data.filter(
              project => project.clientId?._id === user.id
            );

            // For each project, check if there are accepted bids
            for (const project of clientProjects) {
              try {
                const bidsResponse = await api.get(
                  `/api/bids/projects/${project._id}`
                );

                const acceptedBid = bidsResponse.data.find(
                  bid => bid.status === 'accepted'
                );
                if (acceptedBid) {
                  projects.push({
                    ...project,
                    freelancerId: acceptedBid.freelancerId, // This should be populated from the bid
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
        const response = await api.get('/api/projects');

        // Filter for projects with accepted bids (either in_progress or with accepted bids)
        projects = response.data.filter(project => {
          const isFreelancerAssigned =
            project.freelancerId && project.freelancerId?._id === user.id;
          const isInProgress = project.status === 'in_progress';

          return (
            isFreelancerAssigned &&
            (isInProgress || project.status === 'completed')
          );
        });

        // Alternative: Check bids collection directly for accepted bids
        if (projects.length === 0) {
          try {
            // Get all projects
            const allProjects = response.data;

            // For each project, check if this freelancer has an accepted bid
            for (const project of allProjects) {
              try {
                const bidsResponse = await api.get(
                  `/api/bids/projects/${project._id}`
                );

                const acceptedBid = bidsResponse.data.find(
                  bid =>
                    bid.status === 'accepted' &&
                    (bid.freelancerId?._id === user.id ||
                      bid.freelancerId === user.id)
                );
                if (acceptedBid) {
                  projects.push({
                    ...project,
                    freelancerId: acceptedBid.freelancerId, // This should be populated from the bid
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
          const response = await api.get('/api/projects');
          console.log('Admin - All projects:', response.data);

          // Get unique project IDs from disputes
          const disputeProjectIds = [
            ...new Set(disputesList.map(d => d.projectId)),
          ];
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
      setIsLoading(false);
    }
  };

  const loadMessages = () => {
    if (!user || !user.id) {
      console.error('User not properly loaded in loadMessages:', user);
      return;
    }

    const storedMessages = localStorage.getItem('messages');
    if (storedMessages) {
      const allMessages = JSON.parse(storedMessages);

      // Fix messages with missing usernames
      const fixedMessages = allMessages.map(message => {
        if (!message.fromUsername || !message.toUsername) {
          // Get the missing username from project data
          const fromUsername =
            message.fromUsername || getUsernameFromProjects(message.from);
          const toUsername =
            message.toUsername || getUsernameFromProjects(message.to);

          return {
            ...message,
            fromUsername,
            toUsername,
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
      const clientId = project.clientId?._id || project.clientId;
      const freelancerId = project.freelancerId?._id || project.freelancerId;

      if (user.role === 'admin') {
        // For admins, add both client and freelancer as potential conversation partners
        if (clientId) partners.add(clientId);
        if (freelancerId) partners.add(freelancerId);
      } else if (user.id === clientId) {
        if (freelancerId) partners.add(freelancerId);
      } else if (user.id === freelancerId) {
        if (clientId) partners.add(clientId);
      }
    });

    // Also add partners from existing messages (if any)
    if (storedMessages) {
      const allMessages = JSON.parse(storedMessages);
      allMessages.forEach(msg => {
        // Check if this message is between users who have accepted projects
        const hasAcceptedProject = acceptedProjects.some(project => {
          const clientId = project.clientId?._id || project.clientId;
          const freelancerId =
            project.freelancerId?._id || project.freelancerId;
          return (
            (msg.from === clientId && msg.to === freelancerId) ||
            (msg.from === freelancerId && msg.to === clientId)
          );
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
    const canSendMessage =
      user.role === 'admin' ||
      acceptedProjects.some(project => {
        const clientId = project.clientId?._id || project.clientId;
        const freelancerId = project.freelancerId?._id || project.freelancerId;
        return (
          (user.id === clientId && selectedUser === freelancerId) ||
          (user.id === freelancerId && selectedUser === clientId)
        );
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
      projectId: getProjectIdForConversation(selectedUser),
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    localStorage.setItem('messages', JSON.stringify(updatedMessages));
    setNewMessage('');
  };

  const getProjectIdForConversation = partnerId => {
    const project = acceptedProjects.find(project => {
      const clientId = project.clientId?._id || project.clientId;
      const freelancerId = project.freelancerId?._id || project.freelancerId;
      return (
        (user.id === clientId && partnerId === freelancerId) ||
        (user.id === freelancerId && partnerId === clientId)
      );
    });
    return project ? project._id : null;
  };

  const getConversationMessages = partnerId => {
    if (user.role === 'admin') {
      // For admins, show all messages in the conversation between client and freelancer
      const project = acceptedProjects.find(p => {
        const clientId = p.clientId?._id || p.clientId;
        const freelancerId = p.freelancerId?._id || p.freelancerId;
        return clientId === partnerId || freelancerId === partnerId;
      });

      if (project) {
        const clientId = project.clientId?._id || project.clientId;
        const freelancerId = project.freelancerId?._id || project.freelancerId;

        // Return all messages between client, freelancer, and admin
        return messages
          .filter(
            msg =>
              // Messages between client and freelancer
              (msg.from === clientId && msg.to === freelancerId) ||
              (msg.from === freelancerId && msg.to === clientId) ||
              // Admin messages to either party
              (msg.from === user.id &&
                (msg.to === clientId || msg.to === freelancerId)) ||
              // Messages to admin from either party
              ((msg.from === clientId || msg.from === freelancerId) &&
                msg.to === user.id)
          )
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    }

    // For regular users (client/freelancer), show their messages with partner + admin messages
    return messages
      .filter(msg => {
        // Direct messages between user and partner
        const isDirectMessage =
          (msg.from === user.id && msg.to === partnerId) ||
          (msg.from === partnerId && msg.to === user.id);

        // Admin messages in this conversation
        const isAdminMessage =
          msg.from === partnerId ||
          msg.to === partnerId ||
          msg.from === user.id ||
          msg.to === user.id;

        return (
          isDirectMessage ||
          (isAdminMessage &&
            (msg.fromUsername === 'FreelanceHub Platform' ||
              msg.fromUsername?.includes('admin')))
        );
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const getUsernameFromProjects = partnerId => {
    const project = acceptedProjects.find(project => {
      const clientId = project.clientId?._id || project.clientId;
      const freelancerId = project.freelancerId?._id || project.freelancerId;
      return clientId === partnerId || freelancerId === partnerId;
    });

    if (project) {
      if (
        project.clientId?._id === partnerId ||
        project.clientId === partnerId
      ) {
        return project.clientId?.username || project.clientId?.name || 'Client';
      } else if (
        project.freelancerId?._id === partnerId ||
        project.freelancerId === partnerId
      ) {
        return (
          project.freelancerId?.username ||
          project.freelancerId?.name ||
          'Freelancer'
        );
      }
    }

    return 'Unknown User';
  };

  const getPartnerUsername = partnerId => {
    // First try to get username from existing messages
    const message = messages.find(
      msg => msg.from === partnerId || msg.to === partnerId
    );

    if (message) {
      const username =
        message.from === partnerId ? message.fromUsername : message.toUsername;
      if (username && username !== 'Unknown User') {
        return username;
      }
    }

    // If no message found or username is missing, try to get from accepted projects
    return getUsernameFromProjects(partnerId);
  };

  const getProjectForConversation = partnerId => {
    if (user.role === 'admin') {
      // For admin, find the project where partnerId is either client or freelancer
      return acceptedProjects.find(project => {
        const clientId = project.clientId?._id || project.clientId;
        const freelancerId = project.freelancerId?._id || project.freelancerId;
        return clientId === partnerId || freelancerId === partnerId;
      });
    }

    return acceptedProjects.find(project => {
      const clientId = project.clientId?._id || project.clientId;
      const freelancerId = project.freelancerId?._id || project.freelancerId;
      return (
        (user.id === clientId && partnerId === freelancerId) ||
        (user.id === freelancerId && partnerId === clientId)
      );
    });
  };

  if (isLoading) {
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
      isReadByAdmin: false,
    };

    const updatedDisputes = [...disputeList, dispute];
    setDisputeList(updatedDisputes);
    localStorage.setItem('disputes', JSON.stringify(updatedDisputes));

    // Create platform notifications for both parties about the dispute
    const existingNotifications = JSON.parse(
      localStorage.getItem('platformNotifications') || '[]'
    );

    // Notification for the dispute raiser (confirmation)
    const notificationForRaiser = {
      id: Date.now(),
      type: 'dispute_raised',
      content: `🚨 You have raised a dispute regarding project "${project.title}" against ${otherPartyUsername}. Admins will review your dispute shortly.`,
      projectId: project._id,
      toUserId: user.id,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    // Notification for the other party (alert about dispute)
    const notificationForOtherParty = {
      id: Date.now() + 1,
      type: 'dispute_raised_against',
      content: `🚨 A dispute has been raised against you regarding project "${project.title}" by ${user.username}. Please check the dispute details and respond appropriately.`,
      projectId: project._id,
      toUserId: otherPartyId,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    // Add both notifications to the existing notifications
    const updatedNotifications = [
      ...existingNotifications,
      notificationForRaiser,
      notificationForOtherParty,
    ];

    localStorage.setItem(
      'platformNotifications',
      JSON.stringify(updatedNotifications)
    );

    // Reload notifications to update the display
    loadPlatformNotifications();

    // Reset form
    setDisputeDescription('');
    setShowDisputeForm(false);

    alert('Dispute raised successfully! Both parties have been notified and admins will review it shortly.');
  };

  const handleDisputeCancel = () => {
    setDisputeDescription('');
    setShowDisputeForm(false);
  };

  const handleRedirectToBidDetails = notification => {
    // Navigate to bid details page using the correct route format
    const { projectId, bidId } = notification;
    if (projectId && bidId) {
      navigate(`/projects/${projectId}/bids/${bidId}`);
    }
  };

  const handleMarkAsRead = notificationId => {
    // Get existing notifications
    const existingNotifications = JSON.parse(
      localStorage.getItem('platformNotifications') || '[]'
    );

    // Mark the specific notification as read
    const updatedNotifications = existingNotifications.map(notif =>
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    );

    // Save updated notifications
    localStorage.setItem(
      'platformNotifications',
      JSON.stringify(updatedNotifications)
    );

    // Reload notifications to update the display
    loadPlatformNotifications();

    // Force re-render to update badge counts
    setConversations([...conversations]);
  };

  const handleMarkDisputeAsRead = disputeId => {
    // Mark the specific dispute as read by admin
    const updatedDisputes = disputeList.map(dispute =>
      dispute.id === disputeId ? { ...dispute, isReadByAdmin: true } : dispute
    );

    // Save updated disputes
    setDisputeList(updatedDisputes);
    localStorage.setItem('disputes', JSON.stringify(updatedDisputes));
  };

  const handleCloseDispute = dispute => {
    if (
      !window.confirm(
        'Are you sure you want to close this dispute? Both participants will be notified.'
      )
    ) {
      return;
    }

    // Update dispute status to closed
    const updatedDisputes = disputeList.map(d =>
      d.id === dispute.id
        ? {
            ...d,
            status: 'closed',
            closedAt: new Date().toISOString(),
            closedBy: user.username,
          }
        : d
    );

    setDisputeList(updatedDisputes);
    localStorage.setItem('disputes', JSON.stringify(updatedDisputes));

    // Create platform notifications for both participants
    const existingNotifications = JSON.parse(
      localStorage.getItem('platformNotifications') || '[]'
    );

    const notificationForRaiser = {
      id: Date.now(),
      type: 'dispute_closed',
      content: `Admin ${user.username} has closed your dispute regarding project "${dispute.projectTitle}".`,
      projectId: dispute.projectId,
      toUserId: dispute.disputeRaiserId,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    const notificationForOtherParty = {
      id: Date.now() + 1,
      type: 'dispute_closed',
      content: `Admin ${user.username} has closed the dispute raised against you regarding project "${dispute.projectTitle}".`,
      projectId: dispute.projectId,
      toUserId: dispute.otherPartyId,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    const updatedNotifications = [
      ...existingNotifications,
      notificationForRaiser,
      notificationForOtherParty,
    ];
    localStorage.setItem(
      'platformNotifications',
      JSON.stringify(updatedNotifications)
    );

    alert('Dispute closed successfully. Both participants have been notified.');

    // Clear selected dispute if it was the one closed
    if (selectedDispute && selectedDispute.id === dispute.id) {
      setSelectedDispute(null);
    }
  };

  const handleAcceptPayment = async (projectId, notificationId) => {
    if (
      window.confirm(
        'Are you sure you want to accept the payment? This will mark the project as closed and complete the transaction.'
      )
    ) {
      try {
        await api.put(`/api/projects/${projectId}/accept-payment`);

        // Remove the notification from localStorage
        const existingNotifications = JSON.parse(
          localStorage.getItem('platformNotifications') || '[]'
        );
        const updatedNotifications = existingNotifications.filter(
          notif => notif.id !== notificationId
        );
        localStorage.setItem(
          'platformNotifications',
          JSON.stringify(updatedNotifications)
        );

        // Reload notifications to update the display
        loadPlatformNotifications();

        alert(
          'Payment accepted successfully! The project has been marked as closed.'
        );
      } catch (error) {
        console.error('Error accepting payment:', error);
        const errorMessage =
          error.response?.data?.message ||
          'Error accepting payment. Please try again.';
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
              <p>
                <strong>Project:</strong>{' '}
                {getProjectForConversation(selectedUser)?.title}
              </p>
              <p>
                <strong>Disputing with:</strong>{' '}
                {getPartnerUsername(selectedUser)}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Dispute Description *</label>
              <textarea
                value={disputeDescription}
                onChange={e => setDisputeDescription(e.target.value)}
                className="form-textarea dispute-textarea"
                placeholder="Please describe the issue in detail. Include any relevant information that will help admins understand and resolve the dispute."
                rows="6"
              />
            </div>

            <div className="dispute-actions">
              <button
                onClick={handleDisputeCancel}
                className="btn btn-danger"
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
          {disputeList.length > 0 ? (
            <div>
              {disputeList.map(dispute => (
                <div
                  key={dispute.id}
                  className={`dispute-card ${dispute.status}`}
                  onClick={e => {
                    e.stopPropagation();
                    console.log('Admin clicked dispute:', dispute);
                    setSelectedDispute(dispute);
                  }}
                >
                  <div className="dispute-header">
                    <div>
                      <h4 className="dispute-title">
                        🚨 Dispute #{dispute.id}
                      </h4>
                      <p className="dispute-project">
                        <strong>Project:</strong> {dispute.projectTitle}
                      </p>
                    </div>
                    <span className={`dispute-status ${dispute.status}`}>
                      {dispute.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="dispute-details">
                    <p className="dispute-detail-item">
                      <strong>Raised by:</strong>{' '}
                      {dispute.disputeRaiserUsername} (
                      {dispute.disputeRaiserRole})
                    </p>
                    <p className="dispute-detail-item">
                      <strong>Against:</strong> {dispute.otherPartyUsername} (
                      {dispute.otherPartyRole})
                    </p>
                    <p className="dispute-detail-item">
                      <strong>Date:</strong>{' '}
                      {new Date(dispute.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="dispute-description">
                    <strong>Description:</strong>
                    <p>{dispute.description}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="dispute-actions-container">
                    {!dispute.isReadByAdmin && (
                      <button
                        onClick={() => handleMarkDisputeAsRead(dispute.id)}
                        className="btn-mark-read"
                      >
                        Mark as Read
                      </button>
                    )}
                    {dispute.status !== 'closed' && (
                      <button
                        onClick={() => handleCloseDispute(dispute)}
                        className="btn-close-dispute"
                      >
                        Mark as Closed
                      </button>
                    )}
                    {dispute.status === 'closed' && (
                      <span className="dispute-closed-status">
                        ✓ Closed by {dispute.closedBy} on{' '}
                        {new Date(dispute.closedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-disputes-message">
              <p>No disputes have been raised yet.</p>
            </div>
          )}

          {/* Admin Message Box for Selected Dispute */}
          {selectedDispute && (
            <div className="card dispute-form-card">
              <div className="dispute-form-header">
                <h3>Dispute Conversation - {selectedDispute.projectTitle}</h3>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="btn btn-danger"
                >
                  Close
                </button>
              </div>

              <div className="dispute-form-content">
                <p className="dispute-form-text">
                  <strong>Raised by:</strong>{' '}
                  {selectedDispute.disputeRaiserUsername} (
                  {selectedDispute.disputeRaiserRole})
                </p>
                <p className="dispute-form-text">
                  <strong>Against:</strong> {selectedDispute.otherPartyUsername}{' '}
                  ({selectedDispute.otherPartyRole})
                </p>
                <p className="dispute-form-text">
                  <strong>Issue:</strong> {selectedDispute.description}
                </p>
              </div>

              {/* Messages Display */}
              <div className="admin-messages-container">
                {(() => {
                  // Get all messages for this project
                  const storedMessages = localStorage.getItem('messages');
                  if (!storedMessages)
                    return <p className="no-messages">No messages yet</p>;

                  const allMessages = JSON.parse(storedMessages);
                  const projectMessages = allMessages
                    .filter(msg => {
                      // Messages between client and freelancer for this project
                      const isClientFreelancerMsg =
                        (msg.from === selectedDispute.disputeRaiserId &&
                          msg.to === selectedDispute.otherPartyId) ||
                        (msg.from === selectedDispute.otherPartyId &&
                          msg.to === selectedDispute.disputeRaiserId);
                      // Admin messages - check if message involves this project's parties
                      const isAdminMsg =
                        msg.isAdminMessage &&
                        (msg.clientId === selectedDispute.disputeRaiserId ||
                          msg.clientId === selectedDispute.otherPartyId ||
                          msg.freelancerId ===
                            selectedDispute.disputeRaiserId ||
                          msg.freelancerId === selectedDispute.otherPartyId);
                      return isClientFreelancerMsg || isAdminMsg;
                    })
                    .sort(
                      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
                    );

                  if (projectMessages.length === 0) {
                    return (
                      <p className="no-messages">
                        No messages yet in this conversation
                      </p>
                    );
                  }

                  return projectMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`message-item ${msg.from === user.id ? 'message-right' : 'message-left'}`}
                    >
                      {msg.from !== user.id && (
                        <div className="message-sender-name">
                          {msg.fromUsername || 'User'}
                        </div>
                      )}
                      <div className={`message-bubble ${msg.from === user.id ? 'message-own' : 'message-other'}`}>
                        <div>{msg.content}</div>
                        <div className="message-timestamp">
                          {new Date(msg.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Message Input */}
              <div className="message-input-wrapper">
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message as admin..."
                  className="message-textarea"
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
                      clientId:
                        selectedDispute.disputeRaiserRole === 'client'
                          ? selectedDispute.disputeRaiserId
                          : selectedDispute.otherPartyId,
                      freelancerId:
                        selectedDispute.disputeRaiserRole === 'freelancer'
                          ? selectedDispute.disputeRaiserId
                          : selectedDispute.otherPartyId,
                    };

                    const storedMessages = localStorage.getItem('messages');
                    const allMessages = storedMessages
                      ? JSON.parse(storedMessages)
                      : [];
                    allMessages.push(adminMessage);
                    localStorage.setItem(
                      'messages',
                      JSON.stringify(allMessages)
                    );
                    setMessages(allMessages);
                    setNewMessage('');

                    // Trigger re-render
                    setSelectedDispute({ ...selectedDispute });
                  }}
                  className="btn btn-primary btn-send-message"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      ) : acceptedProjects.length === 0 && user.role !== 'admin' ? (
        <div className="card">
          <div className="no-projects-message">
            <h3>No Active Projects</h3>
            <p>
              You need to have accepted bids on projects to start messaging.
            </p>
            <p>
              Once a bid is accepted, you can communicate with your
              client/freelancer here.
            </p>

            <div className="platform-notifications-container">
              <h4>Current Status:</h4>
              <p>
                <strong>Your Role:</strong>{' '}
                {user?.role === 'client' ? 'Client' : 'Freelancer'}
              </p>
              <p>
                <strong>Active Projects:</strong> {acceptedProjects.length}
              </p>
              <p>
                <strong>Status:</strong> {isLoading ? 'Loading...' : 'Ready'}
              </p>
            </div>

            
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="grid grid-2">
            <div>
              <h3>Active Project Conversations</h3>
              {(() => {
                console.log(
                  'Rendering conversations - Role:',
                  user.role,
                  'Conversations:',
                  conversations.length,
                  'Accepted Projects:',
                  acceptedProjects.length
                );
                return (
                  conversations.length > 0 ||
                  (user.role === 'admin' && acceptedProjects.length > 0)
                );
              })() ? (
                <div>
                  {user.role === 'admin' && acceptedProjects.length > 0
                    ? // For admins, show all dispute projects
                      acceptedProjects.map(project => {
                        const clientId =
                          project.clientId?._id || project.clientId;
                        const freelancerId =
                          project.freelancerId?._id || project.freelancerId;
                        const isSelected =
                          selectedUser === clientId ||
                          selectedUser === freelancerId;
                        const displayPartnerId = clientId; // Default to showing client

                        return (
                          <div
                            key={project._id}
                            className={`conversation-item ${isSelected ? 'conversation-selected' : ''}`}
                            onClick={() => setSelectedUser(clientId)}
                          >
                            <div className="conversation-item-content">
                              <div className="conversation-item-main">
                                <strong>
                                  {project.clientId.username || 'Client'} ↔️{' '}
                                  {project.freelancerId?.username ||
                                    'Freelancer'}
                                </strong>
                                <div className="conversation-item-project">
                                  <strong>Project:</strong> {project.title}
                                </div>
                                <div className="conversation-item-status">
                                  {getConversationMessages(clientId).length}{' '}
                                  messages
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    : // For regular users, show conversation partners
                      conversations.map(partnerId => {
                        const project = getProjectForConversation(partnerId);
                        const unreadCount = project?._id
                          ? getUnreadNotificationCount(project._id)
                          : 0;
                        return (
                          <div
                            key={partnerId}
                            className={`conversation-item ${selectedUser === partnerId ? 'conversation-selected' : ''}`}
                            onClick={() => setSelectedUser(partnerId)}
                          >
                            <div className="conversation-item-content">
                              <div className="conversation-item-main">
                                <strong>{getPartnerUsername(partnerId)}</strong>
                                <div className="conversation-item-project">
                                  <strong>Project:</strong>
                                  <span
                                    className="project-link-clickable"
                                    onClick={e => {
                                      e.stopPropagation(); // Prevent conversation selection
                                      if (project?._id) {
                                        navigate(`/projects/${project._id}`);
                                      }
                                    }}
                                  >
                                    {project?.title}
                                  </span>
                                </div>
                                <div className="conversation-item-status">
                                  {getConversationMessages(partnerId).length}{' '}
                                  messages
                                </div>
                              </div>
                              {unreadCount > 0 && (
                                <div className="unread-count-badge">
                                  {unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                </div>
              ) : (
                <div className="no-conversations">
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
                      <div className="project-info-container">
                        <strong>Project:</strong> {project?.title}
                        <br />
                        <strong>Budget:</strong> ₹{project?.budget}
                        <br />
                        <strong>Status:</strong>{' '}
                        {project?.status === 'closed'
                          ? 'completed and closed'
                          : project?.status?.replace('_', ' ')}
                      </div>
                    );
                  })()}

                  <div className="notifications-scroll-container">
                    {(() => {
                      const conversationMessages =
                        getConversationMessages(selectedUser);
                      const projectNotifications = platformNotifications.filter(
                        notification =>
                          notification.projectId ===
                          getProjectForConversation(selectedUser)?._id
                      );

                      // Combine messages and notifications, sort by timestamp
                      const allItems = [
                        ...conversationMessages.map(msg => ({
                          ...msg,
                          type: 'message',
                        })),
                        ...projectNotifications.map(notif => ({
                          ...notif,
                          type: 'notification',
                        })),
                      ].sort(
                        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
                      );

                      return allItems.map(item => {
                        if (item.type === 'notification') {
                          // Check if this is a fund release notification (only final release after client approval)
                          const isFundRelease =
                            item.type === 'escrow_funds_released' &&
                            item.content.includes('Congratulations') &&
                            item.content.includes('has been released');

                          // Platform notification - centered
                          return (
                            <div key={item.id} className="notification-item">
                              <div
                                className={`notification-content ${
                                  isFundRelease
                                    ? 'fund-release fund-release-notification'
                                    : item.type === 'dispute_raised'
                                    ? 'dispute-raised'
                                    : item.type === 'dispute_raised_against'
                                    ? 'dispute-raised-against'
                                    : ''
                                }`}
                              >
                                {isFundRelease ? (
                                  <>
                                    <div className="notification-celebration">
                                      🎊🎉💰🎉🎊
                                    </div>
                                    <div className="notification-title">
                                      Great NEWS!
                                    </div>
                                    <div className="notification-text">
                                      {item.content}
                                    </div>
                                    <div className="notification-footer">
                                      🏆 You've earned this success! 🏆
                                    </div>
                                  </>
                                ) : item.type === 'dispute_raised' ? (
                                  <>
                                    <div className="notification-celebration">
                                      ⚠️🚨⚠️
                                    </div>
                                    <div className="notification-title">
                                      Dispute Raised
                                    </div>
                                    <div className="notification-text">
                                      {item.content}
                                    </div>
                                    <div className="notification-footer">
                                      📋 Admins will review your dispute
                                    </div>
                                  </>
                                ) : item.type === 'dispute_raised_against' ? (
                                  <>
                                    <div className="notification-celebration">
                                      🚨⚠️🚨
                                    </div>
                                    <div className="notification-title">
                                      Dispute Alert!
                                    </div>
                                    <div className="notification-text">
                                      {item.content}
                                    </div>
                                    <div className="notification-footer">
                                      ⚡ Please respond to this dispute
                                    </div>
                                  </>
                                ) : (
                                  <>🔔 {item.content}</>
                                )}
                                <div className="notification-timestamp">
                                  {new Date(item.timestamp).toLocaleString()}
                                </div>

                                {/* Action buttons */}
                                <div className="notification-actions">
                                  {/* Action button for redirecting to bid details */}
                                  {item.hasAction &&
                                    item.actionType ===
                                      'redirect_to_bid_details' && (
                                      <button
                                        onClick={() =>
                                          handleRedirectToBidDetails(item)
                                        }
                                        className="btn-notification-action"
                                      >
                                        {item.actionText}
                                      </button>
                                    )}

                                  {/* Mark as read button */}
                                  {!item.isRead && (
                                    <button
                                      onClick={() => handleMarkAsRead(item.id)}
                                      className="btn-mark-read"
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
                              className={`mb-10 ${
                                item.from === user.id
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            >
                              {/* Sender name above message - only for other person's messages */}
                              {item.from !== user.id && (
                              <div className="message-sender-info">
                                  {getPartnerUsername(item.from)}
                                </div>
                              )}

                              <div>
                                <div className={`message-bubble ${item.from === user.id ? 'message-own' : item.isAdminMessage ? 'message-admin' : 'message-other'}`}>
                                  <div>{item.content}</div>
                                  <div className="notification-dispute-text">
                                    {new Date(item.timestamp).toLocaleString()}
                                  </div>
                                </div>

                                {/* Mark as Read button for admin messages */}
                                {item.isAdminMessage &&
                                  item.from !== user.id &&
                                  ((user.role === 'client' &&
                                    !item.isReadByClient) ||
                                    (user.role === 'freelancer' &&
                                      !item.isReadByFreelancer)) && (
                                    <div className="admin-message-actions">
                                      <button
                                        onClick={() => {
                                          const storedMessages =
                                            localStorage.getItem('messages');
                                          const allMessages = JSON.parse(
                                            storedMessages || '[]'
                                          );
                                          const updatedMessages =
                                            allMessages.map(msg => {
                                              if (msg.id === item.id) {
                                                if (user.role === 'client') {
                                                  return {
                                                    ...msg,
                                                    isReadByClient: true,
                                                  };
                                                } else if (
                                                  user.role === 'freelancer'
                                                ) {
                                                  return {
                                                    ...msg,
                                                    isReadByFreelancer: true,
                                                  };
                                                }
                                              }
                                              return msg;
                                            });
                                          localStorage.setItem(
                                            'messages',
                                            JSON.stringify(updatedMessages)
                                          );
                                          setMessages(updatedMessages);
                                        }}
                                        className="btn-mark-read-notification"
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
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={e => e.key === 'Enter' && sendMessage()}
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
              {acceptedProjects.length > 0 &&
                selectedUser &&
                user.role !== 'admin' && (
                  <div className="dispute-form-section">
                    <button
                      onClick={handleRaiseDispute}
                      className="btn-raise-dispute"
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
