import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllEscrows,
  updateEscrowStatus,
  getEscrowStatistics,
  ESCROW_STATUS,
  markEscrowNotificationsAsReadForEscrow,
  hasUnreadEscrowNotifications
} from '../../utils/escrowManager';
import './EscrowPage.css';

const EscrowPage = () => {
  const { user } = useAuth();
  
  // Basic state for managing escrows
  const [escrows, setEscrows] = useState([]);
  const [currentEscrow, setCurrentEscrow] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Statistics data
  const [escrowStats, setEscrowStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    readyForRelease: 0,
    released: 0,
    cancelled: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [notificationCounter, setNotificationCounter] = useState(0);

  // Load data when component mounts
  useEffect(() => {
    fetchEscrowData();
    fetchStatistics();
  }, []);

  // Keep notifications updated
  useEffect(() => {
    const updateNotifications = () => {
      setNotificationCounter(prev => prev + 1);
    };
    
    window.addEventListener('storage', updateNotifications);
    
    // Check for updates every second
    const timer = setInterval(() => {
      setNotificationCounter(prev => prev + 1);
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', updateNotifications);
      clearInterval(timer);
    };
  }, []);

  // Get all escrows from storage
  const fetchEscrowData = () => {
    const allEscrows = getAllEscrows();
    setEscrows(allEscrows);
  };

  // Get statistics
  const fetchStatistics = () => {
    const statistics = getEscrowStatistics();
    setEscrowStats(statistics);
  };

  // When user clicks on an escrow
  const handleEscrowSelect = (escrow) => {
    setCurrentEscrow(escrow);
    // Clear notifications for this escrow
    markEscrowNotificationsAsReadForEscrow(escrow.id);
  };

  // Update escrow status
  const handleStatusUpdate = async (escrowId, newStatus, notes = '') => {
    setIsLoading(true);
    setStatusMessage('');
    
    try {
      await updateEscrowStatus(escrowId, newStatus, notes);
      
      // Refresh the data
      fetchEscrowData();
      fetchStatistics();
      
      // Update the selected escrow if it's the one we just updated
      if (currentEscrow && currentEscrow.id === escrowId) {
        const updatedEscrow = getAllEscrows().find(e => e.id === escrowId);
        setCurrentEscrow(updatedEscrow);
      }
      
      setStatusMessage(`Status changed to ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Get CSS class for status badge
  const getStatusBadgeClass = (status) => {
    return 'status-badge';
  };

  // Get colors for different statuses
  const getStatusBadgeStyle = (status) => {
    if (status === ESCROW_STATUS.PENDING) {
      return { backgroundColor: '#ffc107', color: '#000' };
    }
    if (status === ESCROW_STATUS.IN_PROGRESS) {
      return { backgroundColor: '#17a2b8', color: '#fff' };
    }
    if (status === ESCROW_STATUS.READY_FOR_RELEASE) {
      return { backgroundColor: '#28a745', color: '#fff' };
    }
    if (status === ESCROW_STATUS.RELEASED) {
      return { 
        backgroundColor: '#6c757d', 
        color: '#fff',
        border: '2px solid #28a745'
      };
    }
    if (status === ESCROW_STATUS.CANCELLED) {
      return { backgroundColor: '#dc3545', color: '#fff' };
    }
    // Default color
    return { backgroundColor: '#6c757d', color: '#fff' };
  };

  // Format date nicely
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format money in Indian Rupees
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Filter escrows based on selected filter
  const filteredEscrows = activeFilter === 'all' 
    ? escrows 
    : escrows.filter(escrow => escrow.status === activeFilter);

  // Get what actions are available for an escrow
  const getAvailableActions = (escrow) => {
    const actions = [];
    
    if (escrow.status === ESCROW_STATUS.PENDING) {
      actions.push({
        label: 'Mark In Progress',
        status: ESCROW_STATUS.IN_PROGRESS,
        className: 'btn-primary'
      });
      actions.push({
        label: 'Cancel',
        status: ESCROW_STATUS.CANCELLED,
        className: 'btn-danger'
      });
    }
    
    if (escrow.status === ESCROW_STATUS.IN_PROGRESS) {
      actions.push({
        label: 'Mark Ready for Release',
        status: ESCROW_STATUS.READY_FOR_RELEASE,
        className: 'btn-success'
      });
      actions.push({
        label: 'Cancel',
        status: ESCROW_STATUS.CANCELLED,
        className: 'btn-danger'
      });
    }
    
    if (escrow.status === ESCROW_STATUS.READY_FOR_RELEASE) {
      actions.push({
        label: 'Release Funds',
        status: ESCROW_STATUS.RELEASED,
        className: 'btn-success'
      });
    }
    
    // No actions for completed or cancelled escrows
    return actions;
  };

  return (
    <div className="container">
      <div className="escrow-page">
        <h1 className="text-center mb-30">Escrow Management</h1>
        
        {/* Statistics Cards */}
        <div className="escrow-stats">
          <div className="stat-card">
            <h3>{escrowStats.total}</h3>
            <p>Total Escrows</p>
          </div>
          <div className="stat-card">
            <h3>{escrowStats.pending}</h3>
            <p>Pending</p>
          </div>
          <div className="stat-card">
            <h3>{escrowStats.inProgress}</h3>
            <p>In Progress</p>
          </div>
          <div className="stat-card">
            <h3>{escrowStats.readyForRelease}</h3>
            <p>Ready for Release</p>
          </div>
          <div className="stat-card">
            <h3>{escrowStats.released}</h3>
            <p>Released</p>
          </div>
          <div className="stat-card">
            <h3>{formatCurrency(escrowStats.totalAmount)}</h3>
            <p>Total Amount</p>
          </div>
          <div className="stat-card">
            <h3>{formatCurrency(escrowStats.pendingAmount)}</h3>
            <p>Pending Amount</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="escrow-filters">
          <h3>Filter Escrows</h3>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All ({escrowStats.total})
            </button>
            <button
              className={`filter-btn ${activeFilter === ESCROW_STATUS.PENDING ? 'active' : ''}`}
              onClick={() => setActiveFilter(ESCROW_STATUS.PENDING)}
            >
              Pending ({escrowStats.pending})
            </button>
            <button
              className={`filter-btn ${activeFilter === ESCROW_STATUS.IN_PROGRESS ? 'active' : ''}`}
              onClick={() => setActiveFilter(ESCROW_STATUS.IN_PROGRESS)}
            >
              In Progress ({escrowStats.inProgress})
            </button>
            <button
              className={`filter-btn ${activeFilter === ESCROW_STATUS.READY_FOR_RELEASE ? 'active' : ''}`}
              onClick={() => setActiveFilter(ESCROW_STATUS.READY_FOR_RELEASE)}
            >
              Ready for Release ({escrowStats.readyForRelease})
            </button>
            <button
              className={`filter-btn ${activeFilter === ESCROW_STATUS.RELEASED ? 'active' : ''}`}
              onClick={() => setActiveFilter(ESCROW_STATUS.RELEASED)}
            >
              Released ({escrowStats.released})
            </button>
            <button
              className={`filter-btn ${activeFilter === ESCROW_STATUS.CANCELLED ? 'active' : ''}`}
              onClick={() => setActiveFilter(ESCROW_STATUS.CANCELLED)}
            >
              Cancelled ({escrowStats.cancelled})
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className={`alert ${statusMessage.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {statusMessage}
          </div>
        )}

        {/* Main Layout */}
        <div className="escrow-layout">
          {/* Escrow List */}
          <div className="escrow-list">
            <h3>Escrow Transactions</h3>
            {filteredEscrows.length === 0 ? (
              <div className="no-escrows">
                <p>No escrows found for the selected filter.</p>
              </div>
            ) : (
              <div className="escrow-items">
                {filteredEscrows.map((escrow) => (
                  <div
                    key={escrow.id}
                    className={`escrow-item ${currentEscrow?.id === escrow.id ? 'selected' : ''}`}
                    onClick={() => handleEscrowSelect(escrow)}
                  >
                    <div className="escrow-header">
                      <div className="flex gap-10 align-center">
                        <h4>{escrow.projectTitle}</h4>
                        {/* Show notification badge if escrow has unread notifications */}
                        {hasUnreadEscrowNotifications(escrow.id) && (
                          <span className="escrow-notification-badge">
                            New
                          </span>
                        )}
                      </div>
                      <span
                        className={`${getStatusBadgeClass(escrow.status)} status-badge-dynamic ${
                          escrow.status === ESCROW_STATUS.RELEASED ? 'status-released' : ''
                        }`}
                        style={getStatusBadgeStyle(escrow.status)}
                      >
                        {escrow.status === ESCROW_STATUS.RELEASED ? '✅ RELEASED' : escrow.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="escrow-details">
                      <p><strong>Amount:</strong> {formatCurrency(escrow.amount)}</p>
                      <p><strong>Client:</strong> {escrow.clientUsername || 'Unknown'}</p>
                      <p><strong>Freelancer:</strong> {escrow.freelancerUsername || 'Unknown'}</p>
                      <p><strong>Created:</strong> {formatDate(escrow.createdAt)}</p>
                      {escrow.status === ESCROW_STATUS.READY_FOR_RELEASE && (
                        <div className="notification-indicator">
                          Ready for Admin Release
                        </div>
                      )}
                      {escrow.status === ESCROW_STATUS.RELEASED && (
                        <div className="released-indicator">
                          🎉 Funds Successfully Released! 🎉
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Escrow Details Panel */}
          <div className="escrow-details-panel">
            {currentEscrow ? (
              <>
                <div className="escrow-details-header">
                  <h3>Escrow Details</h3>
                  <button
                    className="close-btn"
                    onClick={() => setCurrentEscrow(null)}
                  >
                    ×
                  </button>
                </div>

                <div className="escrow-info">
                  <div className="info-section">
                    <h4>Project Information</h4>
                    <p><strong>Title:</strong> {currentEscrow.projectTitle}</p>
                    <p><strong>Project ID:</strong> {currentEscrow.projectId}</p>
                    <p><strong>Bid ID:</strong> {currentEscrow.bidId}</p>
                    <p><strong>Amount:</strong> {formatCurrency(currentEscrow.amount)}</p>
                  </div>

                  <div className="info-section">
                    <h4>Parties</h4>
                    <p><strong>Client:</strong> {currentEscrow.clientUsername || 'Unknown'}</p>
                    <p><strong>Client ID:</strong> {currentEscrow.clientId}</p>
                    <p><strong>Freelancer:</strong> {currentEscrow.freelancerUsername || 'Unknown'}</p>
                    <p><strong>Freelancer ID:</strong> {currentEscrow.freelancerId}</p>
                  </div>

                  <div className="info-section">
                    <h4>Status & Timeline</h4>
                    <p><strong>Status:</strong> 
                      <span className={`status-text ${
                        currentEscrow.status === ESCROW_STATUS.RELEASED ? 'status-released-text' : ''
                      }`}>
                        {currentEscrow.status === ESCROW_STATUS.RELEASED ? '✅ RELEASED' : currentEscrow.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p><strong>Created:</strong> {formatDate(currentEscrow.createdAt)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(currentEscrow.updatedAt)}</p>
                    {currentEscrow.clientApprovedAt && (
                      <p><strong>Client Approved:</strong> {formatDate(currentEscrow.clientApprovedAt)}</p>
                    )}
                    {currentEscrow.adminReleasedAt && (
                      <div className="released-timeline">
                        <p><strong>🎉 Funds Released:</strong> {formatDate(currentEscrow.adminReleasedAt)}</p>
                        <div className="released-success-message">
                          ✅ Transaction completed successfully! Funds have been transferred to the freelancer.
                        </div>
                      </div>
                    )}
                  </div>

                  {currentEscrow.notes && (
                    <div className="info-section">
                      <h4>Notes</h4>
                      <p>{currentEscrow.notes}</p>
                    </div>
                  )}
                </div>

                <div className="escrow-actions">
                  <h4>Actions</h4>
                  {getAvailableActions(currentEscrow).length > 0 ? (
                    <div className="action-buttons">
                      {getAvailableActions(currentEscrow).map((action, index) => (
                        <button
                          key={index}
                          className={`btn ${action.className}`}
                          onClick={() => handleStatusUpdate(currentEscrow.id, action.status)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Processing...' : action.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="action-info">
                      <p>No actions available for this escrow status.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="no-escrows">
                <p>Select an escrow to view details and actions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowPage;