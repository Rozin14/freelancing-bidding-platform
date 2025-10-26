// Escrow Management System
// This file handles all escrow-related operations using localStorage

import api from './axiosConfig';

// Different statuses an escrow can have
export const ESCROW_STATUS = {
  PENDING: 'pending',           // Client has sent funds to escrow
  IN_PROGRESS: 'in_progress',   // Freelancer is working
  READY_FOR_RELEASE: 'ready_for_release', // Client approved work, ready for admin release
  RELEASED: 'released',         // Admin has released funds to freelancer
  CANCELLED: 'cancelled'        // Escrow was cancelled
};

// Different types of notifications we can send
export const ESCROW_NOTIFICATION_TYPES = {
  FUNDS_RECEIVED: 'funds_received',
  FUNDS_SENT_TO_FREELANCER: 'funds_sent_to_freelancer',
  WORK_COMPLETED: 'work_completed',
  PAYMENT_APPROVED: 'payment_approved',
  CLIENT_APPROVED_WORK: 'client_approved_work',
  FUNDS_RELEASED: 'funds_released',
  ESCROW_CANCELLED: 'escrow_cancelled'
};

// Create a new escrow transaction
export const createEscrow = (projectId, bidId, clientId, freelancerId, amount, projectTitle) => {
  // Create a new escrow object with all the necessary information
  const newEscrow = {
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

  // Get all existing escrows and add the new one
  const allEscrows = getAllEscrows();
  allEscrows.push(newEscrow);
  localStorage.setItem('escrows', JSON.stringify(allEscrows));

  // Send notification to admin about new escrow
  createEscrowNotification(ESCROW_NOTIFICATION_TYPES.FUNDS_RECEIVED, newEscrow);

  return newEscrow;
};

// Get all escrows from storage
export const getAllEscrows = () => {
  const savedEscrows = localStorage.getItem('escrows');
  return savedEscrows ? JSON.parse(savedEscrows) : [];
};

// Find a specific escrow by its ID
export const getEscrowById = (escrowId) => {
  const allEscrows = getAllEscrows();
  return allEscrows.find(escrow => escrow.id === escrowId);
};

// Get escrows that have a specific status
export const getEscrowsByStatus = (status) => {
  const allEscrows = getAllEscrows();
  return allEscrows.filter(escrow => escrow.status === status);
};

// Get escrows for a specific user based on their role
export const getEscrowsForUser = (userId, role) => {
  const allEscrows = getAllEscrows();
  if (role === 'client') {
    return allEscrows.filter(escrow => escrow.clientId === userId);
  } else if (role === 'freelancer') {
    return allEscrows.filter(escrow => escrow.freelancerId === userId);
  }
  return allEscrows; // Admin sees all escrows
};

// Update the status of an escrow
export const updateEscrowStatus = async (escrowId, newStatus, notes = '') => {
  const allEscrows = getAllEscrows();
  const escrowIndex = allEscrows.findIndex(escrow => escrow.id === escrowId);
  
  if (escrowIndex === -1) {
    throw new Error('Escrow not found');
  }

  const escrowToUpdate = allEscrows[escrowIndex];
  
  // Update the escrow with new information
  escrowToUpdate.status = newStatus;
  escrowToUpdate.updatedAt = new Date().toISOString();
  escrowToUpdate.notes = notes;

  // Set specific timestamps for important status changes
  if (newStatus === ESCROW_STATUS.READY_FOR_RELEASE) {
    escrowToUpdate.clientApprovedAt = new Date().toISOString();
  } else if (newStatus === ESCROW_STATUS.RELEASED) {
    escrowToUpdate.adminReleasedAt = new Date().toISOString();
  }

  // Save the updated escrow back to storage
  allEscrows[escrowIndex] = escrowToUpdate;
  localStorage.setItem('escrows', JSON.stringify(allEscrows));

  // Send appropriate notification based on the new status
  let notificationType;
  if (newStatus === ESCROW_STATUS.IN_PROGRESS) {
    notificationType = ESCROW_NOTIFICATION_TYPES.WORK_COMPLETED;
  } else if (newStatus === ESCROW_STATUS.READY_FOR_RELEASE) {
    notificationType = ESCROW_NOTIFICATION_TYPES.CLIENT_APPROVED_WORK;
  } else if (newStatus === ESCROW_STATUS.RELEASED) {
    notificationType = ESCROW_NOTIFICATION_TYPES.FUNDS_RELEASED;
  } else if (newStatus === ESCROW_STATUS.CANCELLED) {
    notificationType = ESCROW_NOTIFICATION_TYPES.ESCROW_CANCELLED;
  }

  if (notificationType) {
    createEscrowNotification(notificationType, escrowToUpdate);
  }

  // If funds are released, mark the project as completed
  if (newStatus === ESCROW_STATUS.RELEASED) {
    try {
      await api.put(`/api/projects/${escrowToUpdate.projectId}/admin-close`);
    } catch (error) {
      console.error('Error closing project after fund release:', error);
    }
  }

  return escrowToUpdate;
};

// Create a notification for escrow events
export const createEscrowNotification = (type, escrow) => {
  const allNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  
  let newNotification;
  const currentTime = new Date().toISOString();

  // Create different notifications based on the type
  if (type === ESCROW_NOTIFICATION_TYPES.FUNDS_RECEIVED) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_funds_received',
      content: `Client has sent ₹${escrow.amount} to escrow for project "${escrow.projectTitle}".`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: 'admin', // Admin notification
      timestamp: currentTime,
      isRead: false,
      priority: 'high'
    };
  } else if (type === ESCROW_NOTIFICATION_TYPES.FUNDS_SENT_TO_FREELANCER) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_funds_sent',
      content: `🎉 Great news! Client has sent ₹${escrow.amount} to escrow for project "${escrow.projectTitle}". Your payment is now secured!`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: escrow.freelancerId, // Freelancer notification
      timestamp: currentTime,
      isRead: false,
      priority: 'high'
    };
  } else if (type === ESCROW_NOTIFICATION_TYPES.WORK_COMPLETED) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_work_completed',
      content: `Freelancer has marked work as completed for project "${escrow.projectTitle}".`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: escrow.clientId,
      timestamp: currentTime,
      isRead: false,
      priority: 'medium'
    };
  } else if (type === ESCROW_NOTIFICATION_TYPES.PAYMENT_APPROVED) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_payment_approved',
      content: `Client has approved payment for project "${escrow.projectTitle}". Funds ready for release.`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: 'admin', // Admin notification
      timestamp: currentTime,
      isRead: false,
      priority: 'high'
    };
  } else if (type === ESCROW_NOTIFICATION_TYPES.CLIENT_APPROVED_WORK) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_client_approved_work',
      content: `Client has approved work as completed for project "${escrow.projectTitle}". Ready to release funds.`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: 'admin', // Admin notification
      timestamp: currentTime,
      isRead: false,
      priority: 'high'
    };
  } else if (type === ESCROW_NOTIFICATION_TYPES.FUNDS_RELEASED) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_funds_released',
      content: `🎊🎉 AMAZING NEWS! 🎉🎊\n\n💰 Your payment of ₹${escrow.amount} has been successfully released!\n\n📋 Project: "${escrow.projectTitle}"\n✅ Status: Payment Completed\n🏦 Funds are now available in your account`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: escrow.freelancerId,
      timestamp: currentTime,
      isRead: false,
      priority: 'high'
    };
  } else if (type === ESCROW_NOTIFICATION_TYPES.ESCROW_CANCELLED) {
    newNotification = {
      id: `escrow_notif_${Date.now()}`,
      type: 'escrow_cancelled',
      content: `Escrow for project "${escrow.projectTitle}" has been cancelled.`,
      projectId: escrow.projectId,
      escrowId: escrow.id,
      toUserId: escrow.clientId,
      timestamp: currentTime,
      isRead: false,
      priority: 'medium'
    };
  }

  // If we created a notification, save it
  if (newNotification) {
    allNotifications.push(newNotification);
    localStorage.setItem('platformNotifications', JSON.stringify(allNotifications));
    
    // Tell other parts of the app that notifications changed
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'platformNotifications',
      newValue: localStorage.getItem('platformNotifications'),
      storageArea: localStorage
    }));
  }
};

// Count how many escrow notifications the admin has
export const getEscrowNotificationsCount = () => {
  const allNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const adminEscrowNotifications = allNotifications.filter(notif => 
    notif.toUserId === 'admin' && 
    notif.type.startsWith('escrow_') && 
    !notif.isRead
  );
  return adminEscrowNotifications.length;
};

// Mark a specific notification as read
export const markEscrowNotificationAsRead = (notificationId) => {
  const allNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const updatedNotifications = allNotifications.map(notif => 
    notif.id === notificationId ? { ...notif, isRead: true } : notif
  );
  localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
  
  // Tell other parts of the app that notifications changed
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'platformNotifications',
    newValue: localStorage.getItem('platformNotifications'),
    storageArea: localStorage
  }));
};

// Mark all escrow notifications as read for admin
export const markAllEscrowNotificationsAsRead = () => {
  const allNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const updatedNotifications = allNotifications.map(notif => 
    (notif.toUserId === 'admin' && notif.type.startsWith('escrow_')) 
      ? { ...notif, isRead: true } 
      : notif
  );
  localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
  
  // Tell other parts of the app that notifications changed
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'platformNotifications',
    newValue: localStorage.getItem('platformNotifications'),
    storageArea: localStorage
  }));
};

// Mark notifications as read for a specific escrow
export const markEscrowNotificationsAsReadForEscrow = (escrowId) => {
  const allNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const updatedNotifications = allNotifications.map(notif => 
    (notif.toUserId === 'admin' && notif.type.startsWith('escrow_') && notif.escrowId === escrowId) 
      ? { ...notif, isRead: true } 
      : notif
  );
  localStorage.setItem('platformNotifications', JSON.stringify(updatedNotifications));
  
  // Tell other parts of the app that notifications changed
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'platformNotifications',
    newValue: localStorage.getItem('platformNotifications'),
    storageArea: localStorage
  }));
};

// Check if an escrow has any unread notifications
export const hasUnreadEscrowNotifications = (escrowId) => {
  const allNotifications = JSON.parse(localStorage.getItem('platformNotifications') || '[]');
  const unreadNotifications = allNotifications.filter(notif => 
    notif.toUserId === 'admin' && 
    notif.type.startsWith('escrow_') && 
    notif.escrowId === escrowId && 
    !notif.isRead
  );
  return unreadNotifications.length > 0;
};

// Get statistics about all escrows
export const getEscrowStatistics = () => {
  const allEscrows = getAllEscrows();
  
  return {
    total: allEscrows.length,
    pending: allEscrows.filter(escrow => escrow.status === ESCROW_STATUS.PENDING).length,
    inProgress: allEscrows.filter(escrow => escrow.status === ESCROW_STATUS.IN_PROGRESS).length,
    readyForRelease: allEscrows.filter(escrow => escrow.status === ESCROW_STATUS.READY_FOR_RELEASE).length,
    released: allEscrows.filter(escrow => escrow.status === ESCROW_STATUS.RELEASED).length,
    cancelled: allEscrows.filter(escrow => escrow.status === ESCROW_STATUS.CANCELLED).length,
    totalAmount: allEscrows.reduce((sum, escrow) => sum + escrow.amount, 0),
    pendingAmount: allEscrows
      .filter(escrow => escrow.status === ESCROW_STATUS.PENDING || escrow.status === ESCROW_STATUS.IN_PROGRESS || escrow.status === ESCROW_STATUS.READY_FOR_RELEASE)
      .reduce((sum, escrow) => sum + escrow.amount, 0)
  };
};

// Delete an escrow (for cleanup)
export const deleteEscrow = (escrowId) => {
  const allEscrows = getAllEscrows();
  const remainingEscrows = allEscrows.filter(escrow => escrow.id !== escrowId);
  localStorage.setItem('escrows', JSON.stringify(remainingEscrows));
  return true;
};
