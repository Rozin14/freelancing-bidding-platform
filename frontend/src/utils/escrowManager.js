// Escrow Management System
// Handles all escrow-related operations using localStorage

import axios from 'axios';

export const ESCROW_STATUS = {
  PENDING: 'pending',           // Client has sent funds to escrow
  IN_PROGRESS: 'in_progress',   // Freelancer is working
  READY_FOR_RELEASE: 'ready_for_release', // Client approved work, ready for admin release
  RELEASED: 'released',         // Admin has released funds to freelancer
  CANCELLED: 'cancelled'        // Escrow was cancelled
};

export const ESCROW_NOTIFICATION_TYPES = {
  FUNDS_RECEIVED: 'funds_received',
  FUNDS_SENT_TO_FREELANCER: 'funds_sent_to_freelancer',
  WORK_COMPLETED: 'work_completed',
  PAYMENT_APPROVED: 'payment_approved',
  CLIENT_APPROVED_WORK: 'client_approved_work',
  FUNDS_RELEASED: 'funds_released',
  ESCROW_CANCELLED: 'escrow_cancelled'
};

// Create a new escrow
export const createEscrow = (projectId, bidId, clientId, freelancerId, amount, projectTitle) => {
  const escrow = {
    id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    bidId,
    clientId,
    freelancerId,
    amount: parseFloat(amount),
    projectTitle,
    status: ESCROW_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientApprovedAt: null,
    adminReleasedAt: null,
    notes: '',
    // Additional metadata
    clientUsername: '',
    freelancerUsername: '',
    projectDescription: ''
  };

  // Save to localStorage
  const escrows = getAllEscrows();
  escrows.push(escrow);
  localStorage.setItem('escrows', JSON.stringify(escrows));

  // Create notification for admin
  createEscrowNotification(ESCROW_NOTIFICATION_TYPES.FUNDS_RECEIVED, escrow);
  
  // Note: Freelancer notification will be sent when funds are actually sent
  // createEscrowNotification(ESCROW_NOTIFICATION_TYPES.FUNDS_SENT_TO_FREELANCER, escrow);

  return escrow;
};

// Get all escrows
export const getAllEscrows = () => {
  const escrows = localStorage.getItem('escrows');
  return escrows ? JSON.parse(escrows) : [];
};

// Get escrow by ID
export const getEscrowById = (escrowId) => {
  const escrows = getAllEscrows();
  return escrows.find(escrow => escrow.id === escrowId);
};

// Get escrows by status
export const getEscrowsByStatus = (status) => {
  const escrows = getAllEscrows();
  return escrows.filter(escrow => escrow.status === status);
};

// Get escrows for specific user
export const getEscrowsForUser = (userId, role) => {
  const escrows = getAllEscrows();
  if (role === 'client') {
    return escrows.filter(escrow => escrow.clientId === userId);
  } else if (role === 'freelancer') {
    return escrows.filter(escrow => escrow.freelancerId === userId);
  }
  return escrows; // Admin sees all
};

// Update escrow status
export const updateEscrowStatus = async (escrowId, newStatus, notes = '') => {
  const escrows = getAllEscrows();
  const escrowIndex = escrows.findIndex(escrow => escrow.id === escrowId);
  
  if (escrowIndex === -1) {
    throw new Error('Escrow not found');
  }

  const escrow = escrows[escrowIndex];
  const oldStatus = escrow.status;
  
  escrow.status = newStatus;
  escrow.updatedAt = new Date().toISOString();
  escrow.notes = notes;

  // Set specific timestamps
  if (newStatus === ESCROW_STATUS.READY_FOR_RELEASE) {
    escrow.clientApprovedAt = new Date().toISOString();
  } else if (newStatus === ESCROW_STATUS.RELEASED) {
    escrow.adminReleasedAt = new Date().toISOString();
  }

  // Save updated escrow
  escrows[escrowIndex] = escrow;
  localStorage.setItem('escrows', JSON.stringify(escrows));

  // Create appropriate notification
  let notificationType;
  switch (newStatus) {
    case ESCROW_STATUS.IN_PROGRESS:
      notificationType = ESCROW_NOTIFICATION_TYPES.WORK_COMPLETED;
      break;
    case ESCROW_STATUS.READY_FOR_RELEASE:
      notificationType = ESCROW_NOTIFICATION_TYPES.CLIENT_APPROVED_WORK;
      console.log('Creating CLIENT_APPROVED_WORK notification for escrow:', escrowId);
      break;
    case ESCROW_STATUS.RELEASED:
      notificationType = ESCROW_NOTIFICATION_TYPES.FUNDS_RELEASED;
      break;
    case ESCROW_STATUS.CANCELLED:
      notificationType = ESCROW_NOTIFICATION_TYPES.ESCROW_CANCELLED;
      break;
  }

  if (notificationType) {
    console.log('Creating notification:', notificationType, 'for escrow:', escrowId);
    createEscrowNotification(notificationType, escrow);
  } else {
    console.log('No notification type for status:', newStatus);
  }

  // If funds are released, mark the corresponding project as completed and closed
  if (newStatus === ESCROW_STATUS.RELEASED) {
    try {
      console.log('Funds released, closing project:', escrow.projectId);
      await axios.put(`/api/projects/${escrow.projectId}/admin-close`);
      console.log('Project marked as completed and closed successfully');
    } catch (error) {
      console.error('Error closing project after fund release:', error);
      // Don't throw error here to avoid breaking the escrow update
    }
  }

  return escrow;
};

// Create escrow notification
export const createEscrowNotification = (type, escrow) => {
  const notifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  
  let notification;
  const timestamp = new Date().toISOString();

  switch (type) {
    case ESCROW_NOTIFICATION_TYPES.FUNDS_RECEIVED:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_funds_received',
        content: `Client has sent ₹${escrow.amount} to escrow for project "${escrow.projectTitle}".`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: 'admin', // Admin notification
        timestamp,
        isRead: false,
        priority: 'high'
      };
      break;

    case ESCROW_NOTIFICATION_TYPES.FUNDS_SENT_TO_FREELANCER:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_funds_sent',
        content: `🎉 Great news! Client has sent ₹${escrow.amount} to escrow for project "${escrow.projectTitle}". Your payment is now secured!`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: escrow.freelancerId, // Freelancer notification
        timestamp,
        isRead: false,
        priority: 'high'
      };
      break;

    case ESCROW_NOTIFICATION_TYPES.WORK_COMPLETED:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_work_completed',
        content: `Freelancer has marked work as completed for project "${escrow.projectTitle}".`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: escrow.clientId,
        timestamp,
        isRead: false,
        priority: 'medium'
      };
      break;

    case ESCROW_NOTIFICATION_TYPES.PAYMENT_APPROVED:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_payment_approved',
        content: `Client has approved payment for project "${escrow.projectTitle}". Funds ready for release.`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: 'admin', // Admin notification
        timestamp,
        isRead: false,
        priority: 'high'
      };
      break;

    case ESCROW_NOTIFICATION_TYPES.CLIENT_APPROVED_WORK:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_client_approved_work',
        content: `Client has approved work as completed for project "${escrow.projectTitle}". Ready to release funds.`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: 'admin', // Admin notification
        timestamp,
        isRead: false,
        priority: 'high'
      };
      break;

    case ESCROW_NOTIFICATION_TYPES.FUNDS_RELEASED:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_funds_released',
        content: `🎊🎉 AMAZING NEWS! 🎉🎊\n\n💰 Your payment of ₹${escrow.amount} has been successfully released!\n\n📋 Project: "${escrow.projectTitle}"\n✅ Status: Payment Completed\n🏦 Funds are now available in your account`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: escrow.freelancerId,
        timestamp,
        isRead: false,
        priority: 'high'
      };
      break;

    case ESCROW_NOTIFICATION_TYPES.ESCROW_CANCELLED:
      notification = {
        id: `escrow_notif_${Date.now()}`,
        type: 'escrow_cancelled',
        content: `Escrow for project "${escrow.projectTitle}" has been cancelled.`,
        projectId: escrow.projectId,
        escrowId: escrow.id,
        toUserId: escrow.clientId,
        timestamp,
        isRead: false,
        priority: 'medium'
      };
      break;
  }

  if (notification) {
    console.log('createEscrowNotification - Creating notification:', notification);
    notifications.push(notification);
    localStorage.setItem('platformNotifications', JSON.stringify(notifications));
    console.log('createEscrowNotification - Updated notifications:', JSON.parse(localStorage.getItem('platformNotifications')));
    
    // Trigger a storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'platformNotifications',
      newValue: localStorage.getItem('platformNotifications'),
      storageArea: localStorage
    }));
  } else {
    console.log('createEscrowNotification - No notification created for type:', type);
  }
};

// Get escrow notifications count for admin
export const getEscrowNotificationsCount = () => {
  const notifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const escrowNotifications = notifications.filter(notif => 
    notif.toUserId === 'admin' && 
    notif.type.startsWith('escrow_') && 
    !notif.isRead
  );
  console.log('getEscrowNotificationsCount - All notifications:', notifications);
  console.log('getEscrowNotificationsCount - Escrow notifications for admin:', escrowNotifications);
  console.log('getEscrowNotificationsCount - Count:', escrowNotifications.length);
  return escrowNotifications.length;
};

// Mark escrow notification as read
export const markEscrowNotificationAsRead = (notificationId) => {
  const notifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const updatedNotifications = notifications.map(notif => 
    notif.id === notificationId ? { ...notif, isRead: true } : notif
  );
  localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
  
  // Trigger a storage event to notify other components
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'platformNotifications',
    newValue: localStorage.getItem('platformNotifications'),
    storageArea: localStorage
  }));
};

// Mark all escrow notifications as read for admin
export const markAllEscrowNotificationsAsRead = () => {
  const notifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const updatedNotifications = notifications.map(notif => 
    (notif.toUserId === 'admin' && notif.type.startsWith('escrow_')) 
      ? { ...notif, isRead: true } 
      : notif
  );
  localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
  
  // Trigger a storage event to notify other components
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'platformNotifications',
    newValue: localStorage.getItem('platformNotifications'),
    storageArea: localStorage
  }));
};

// Mark escrow notifications as read for a specific escrow
export const markEscrowNotificationsAsReadForEscrow = (escrowId) => {
  const notifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const updatedNotifications = notifications.map(notif => 
    (notif.toUserId === 'admin' && notif.type.startsWith('escrow_') && notif.escrowId === escrowId) 
      ? { ...notif, isRead: true } 
      : notif
  );
  localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
  
  // Trigger a storage event to notify other components
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'platformNotifications',
    newValue: localStorage.getItem('platformNotifications'),
    storageArea: localStorage
  }));
};

// Check if a specific escrow has unread notifications
export const hasUnreadEscrowNotifications = (escrowId) => {
  const notifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const unreadNotifications = notifications.filter(notif => 
    notif.toUserId === 'admin' && 
    notif.type.startsWith('escrow_') && 
    notif.escrowId === escrowId && 
    !notif.isRead
  );
  return unreadNotifications.length > 0;
};

// Get escrow statistics
export const getEscrowStatistics = () => {
  const escrows = getAllEscrows();
  
  return {
    total: escrows.length,
    pending: escrows.filter(e => e.status === ESCROW_STATUS.PENDING).length,
    inProgress: escrows.filter(e => e.status === ESCROW_STATUS.IN_PROGRESS).length,
    readyForRelease: escrows.filter(e => e.status === ESCROW_STATUS.READY_FOR_RELEASE).length,
    released: escrows.filter(e => e.status === ESCROW_STATUS.RELEASED).length,
    cancelled: escrows.filter(e => e.status === ESCROW_STATUS.CANCELLED).length,
    totalAmount: escrows.reduce((sum, e) => sum + e.amount, 0),
    pendingAmount: escrows
      .filter(e => e.status === ESCROW_STATUS.PENDING || e.status === ESCROW_STATUS.IN_PROGRESS || e.status === ESCROW_STATUS.READY_FOR_RELEASE)
      .reduce((sum, e) => sum + e.amount, 0)
  };
};

// Delete escrow (for cleanup)
export const deleteEscrow = (escrowId) => {
  const escrows = getAllEscrows();
  const filteredEscrows = escrows.filter(escrow => escrow.id !== escrowId);
  localStorage.setItem('escrows', JSON.stringify(filteredEscrows));
  return true;
};
