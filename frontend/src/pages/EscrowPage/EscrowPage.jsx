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
  const [escrows, setEscrows] = useState([]);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    readyForRelease: 0,
    released: 0,
    cancelled: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [notificationUpdate, setNotificationUpdate] = useState(0);

  // Load escrows and stats
  useEffect(() => {
    loadEscrows();
    loadStats();
  }, []);

  // Listen for notification updates
  useEffect(() => {
    const handleStorageChange = () => {
      setNotificationUpdate(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes (in case of same-tab updates)
    const interval = setInterval(() => {
      setNotificationUpdate(prev => prev + 1);
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const loadEscrows = () => {
    const allEscrows = getAllEscrows();
    setEscrows(allEscrows);
  };

  const loadStats = () => {
    const statistics = getEscrowStatistics();
    setStats(statistics);
  };

  const handleEscrowSelect = (escrow) => {
    setSelectedEscrow(escrow);
    // Mark notifications as read for this escrow
    markEscrowNotificationsAsReadForEscrow(escrow.id);
  };

  const handleStatusUpdate = async (escrowId, newStatus, notes = '') => {
    setLoading(true);
    setMessage('');
    
    try {
      await updateEscrowStatus(escrowId, newStatus, notes);
      loadEscrows();
      loadStats();
      
      // Update selected escrow if it's the one being updated
      if (selectedEscrow && selectedEscrow.id === escrowId) {
        const updatedEscrow = getAllEscrows().find(e => e.id === escrowId);
        setSelectedEscrow(updatedEscrow);
      }
      
      setMessage(`Escrow status updated to ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error updating escrow: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case ESCROW_STATUS.PENDING:
        return 'status-badge';
      case ESCROW_STATUS.IN_PROGRESS:
        return 'status-badge';
      case ESCROW_STATUS.READY_FOR_RELEASE:
        return 'status-badge';
      case ESCROW_STATUS.RELEASED:
        return 'status-badge';
      case ESCROW_STATUS.CANCELLED:
        return 'status-badge';
      default:
        return 'status-badge';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case ESCROW_STATUS.PENDING:
        return { backgroundColor: '#ffc107', color: '#000' };
      case ESCROW_STATUS.IN_PROGRESS:
        return { backgroundColor: '#17a2b8', color: '#fff' };
      case ESCROW_STATUS.READY_FOR_RELEASE:
        return { backgroundColor: '#28a745', color: '#fff' };
      case ESCROW_STATUS.RELEASED:
        return { backgroundColor: '#6c757d', color: '#fff' };
      case ESCROW_STATUS.CANCELLED:
        return { backgroundColor: '#dc3545', color: '#fff' };
      default:
        return { backgroundColor: '#6c757d', color: '#fff' };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const filteredEscrows = filter === 'all' 
    ? escrows 
    : escrows.filter(escrow => escrow.status === filter);

  const getAvailableActions = (escrow) => {
    const actions = [];
    
    switch (escrow.status) {
      case ESCROW_STATUS.PENDING:
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
        break;
      case ESCROW_STATUS.IN_PROGRESS:
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
        break;
      case ESCROW_STATUS.READY_FOR_RELEASE:
        actions.push({
          label: 'Release Funds',
          status: ESCROW_STATUS.RELEASED,
          className: 'btn-success'
        });
        break;
      case ESCROW_STATUS.RELEASED:
      case ESCROW_STATUS.CANCELLED:
        // No actions available for completed/cancelled escrows
        break;
    }
    
    return actions;
  };

  return (
    <div className="container">
      <div className="escrow-page">
        <h1 className="text-center mb-30">Escrow Management</h1>
        
        {/* Statistics */}
        <div className="escrow-stats">
          <div className="stat-card">
            <h3>{stats.total}</h3>
            <p>Total Escrows</p>
          </div>
          <div className="stat-card">
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
          <div className="stat-card">
            <h3>{stats.inProgress}</h3>
            <p>In Progress</p>
          </div>
          <div className="stat-card">
            <h3>{stats.readyForRelease}</h3>
            <p>Ready for Release</p>
          </div>
          <div className="stat-card">
            <h3>{stats.released}</h3>
            <p>Released</p>
          </div>
          <div className="stat-card">
            <h3>{formatCurrency(stats.totalAmount)}</h3>
            <p>Total Amount</p>
          </div>
          <div className="stat-card">
            <h3>{formatCurrency(stats.pendingAmount)}</h3>
            <p>Pending Amount</p>
          </div>
        </div>

        {/* Filters */}
        <div className="escrow-filters">
          <h3>Filter Escrows</h3>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({stats.total})
            </button>
            <button
              className={`filter-btn ${filter === ESCROW_STATUS.PENDING ? 'active' : ''}`}
              onClick={() => setFilter(ESCROW_STATUS.PENDING)}
            >
              Pending ({stats.pending})
            </button>
            <button
              className={`filter-btn ${filter === ESCROW_STATUS.IN_PROGRESS ? 'active' : ''}`}
              onClick={() => setFilter(ESCROW_STATUS.IN_PROGRESS)}
            >
              In Progress ({stats.inProgress})
            </button>
            <button
              className={`filter-btn ${filter === ESCROW_STATUS.READY_FOR_RELEASE ? 'active' : ''}`}
              onClick={() => setFilter(ESCROW_STATUS.READY_FOR_RELEASE)}
            >
              Ready for Release ({stats.readyForRelease})
            </button>
            <button
              className={`filter-btn ${filter === ESCROW_STATUS.RELEASED ? 'active' : ''}`}
              onClick={() => setFilter(ESCROW_STATUS.RELEASED)}
            >
              Released ({stats.released})
            </button>
            <button
              className={`filter-btn ${filter === ESCROW_STATUS.CANCELLED ? 'active' : ''}`}
              onClick={() => setFilter(ESCROW_STATUS.CANCELLED)}
            >
              Cancelled ({stats.cancelled})
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {message}
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
                    className={`escrow-item ${selectedEscrow?.id === escrow.id ? 'selected' : ''}`}
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
                        className={`${getStatusBadgeClass(escrow.status)} status-badge-dynamic`}
                        style={getStatusBadgeStyle(escrow.status)}
                      >
                        {escrow.status.replace('_', ' ')}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Escrow Details Panel */}
          <div className="escrow-details-panel">
            {selectedEscrow ? (
              <>
                <div className="escrow-details-header">
                  <h3>Escrow Details</h3>
                  <button
                    className="close-btn"
                    onClick={() => setSelectedEscrow(null)}
                  >
                    ×
                  </button>
                </div>

                <div className="escrow-info">
                  <div className="info-section">
                    <h4>Project Information</h4>
                    <p><strong>Title:</strong> {selectedEscrow.projectTitle}</p>
                    <p><strong>Project ID:</strong> {selectedEscrow.projectId}</p>
                    <p><strong>Bid ID:</strong> {selectedEscrow.bidId}</p>
                    <p><strong>Amount:</strong> {formatCurrency(selectedEscrow.amount)}</p>
                  </div>

                  <div className="info-section">
                    <h4>Parties</h4>
                    <p><strong>Client:</strong> {selectedEscrow.clientUsername || 'Unknown'}</p>
                    <p><strong>Client ID:</strong> {selectedEscrow.clientId}</p>
                    <p><strong>Freelancer:</strong> {selectedEscrow.freelancerUsername || 'Unknown'}</p>
                    <p><strong>Freelancer ID:</strong> {selectedEscrow.freelancerId}</p>
                  </div>

                  <div className="info-section">
                    <h4>Status & Timeline</h4>
                    <p><strong>Status:</strong> <span className="status-text">{selectedEscrow.status.replace('_', ' ')}</span></p>
                    <p><strong>Created:</strong> {formatDate(selectedEscrow.createdAt)}</p>
                    <p><strong>Last Updated:</strong> {formatDate(selectedEscrow.updatedAt)}</p>
                    {selectedEscrow.clientApprovedAt && (
                      <p><strong>Client Approved:</strong> {formatDate(selectedEscrow.clientApprovedAt)}</p>
                    )}
                    {selectedEscrow.adminReleasedAt && (
                      <p><strong>Funds Released:</strong> {formatDate(selectedEscrow.adminReleasedAt)}</p>
                    )}
                  </div>

                  {selectedEscrow.notes && (
                    <div className="info-section">
                      <h4>Notes</h4>
                      <p>{selectedEscrow.notes}</p>
                    </div>
                  )}
                </div>

                <div className="escrow-actions">
                  <h4>Actions</h4>
                  {getAvailableActions(selectedEscrow).length > 0 ? (
                    <div className="action-buttons">
                      {getAvailableActions(selectedEscrow).map((action, index) => (
                        <button
                          key={index}
                          className={`btn ${action.className}`}
                          onClick={() => handleStatusUpdate(selectedEscrow.id, action.status)}
                          disabled={loading}
                        >
                          {loading ? 'Processing...' : action.label}
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