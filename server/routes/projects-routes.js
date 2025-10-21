const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Project = require('../db/models/Project-schema');

const router = express.Router();

// Project Routes
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res
        .status(403)
        .json({ message: 'Only clients can create projects' });
    }

    const project = new Project({
      ...req.body,
      clientId: req.user.id,
    });
    await project.save();
    await project.populate('clientId', 'username profile isActive');

    res.status(201).json(project);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error creating project', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, skills, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (skills) query.requiredSkills = { $in: skills.split(',') };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Project.find(query)
      .populate('clientId', 'username profile isActive')
      .populate('freelancerId', 'username profile isActive')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching projects', error: error.message });
  }
});

// Settle payment and mark project as closed (only by project owner/client)
router.put('/:id/settle', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner (client) can settle payment
    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the project owner can settle payment'
      });
    }

    // Only allow settling completed projects
    if (project.status !== 'completed') {
      return res.status(400).json({
        message: 'Only completed projects can have payment settled'
      });
    }

    // Find the accepted bid for this project
    const Bid = require('../db/models/Bid-schema');
    const acceptedBid = await Bid.findOne({ 
      projectId: project._id, 
      status: 'accepted' 
    });

    if (!acceptedBid) {
      return res.status(400).json({
        message: 'No accepted bid found for this project'
      });
    }

    res.json({ 
      message: 'Payment settlement request sent to freelancer', 
      project,
      notification: {
        type: 'payment_settlement_request',
        clientName: req.user.username,
        freelancerId: project.freelancerId,
        projectId: project._id,
        projectTitle: project.title,
        bidId: acceptedBid._id
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error settling payment',
      error: error.message,
    });
  }
});

// Accept payment settlement (only by assigned freelancer)
router.put('/:id/accept-payment', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only assigned freelancer can accept payment
    if (!project.freelancerId || project.freelancerId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the assigned freelancer can accept payment'
      });
    }

    // Only allow accepting payment for completed projects
    if (project.status !== 'completed') {
      return res.status(400).json({
        message: 'Only completed projects can have payment accepted'
      });
    }

    // Update project status to closed
    project.status = 'closed';
    await project.save();

    res.json({ 
      message: 'Payment accepted successfully', 
      project 
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error accepting payment',
      error: error.message,
    });
  }
});

// Unmark project as completed (only by assigned freelancer)
router.put('/:id/unmark-completed', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      'freelancerId',
      'username profile'
    );
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only the assigned freelancer can unmark project as completed
    if (
      !project.freelancerId ||
      project.freelancerId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message:
          'Only the assigned freelancer can unmark this project as completed',
      });
    }

    // Only allow unmarking completed projects
    if (project.status !== 'completed') {
      return res.status(400).json({
        message: 'Only completed projects can be unmarked as completed',
      });
    }

    // Update project status back to in_progress
    project.status = 'in_progress';
    project.completedAt = null;
    await project.save();

    // Prepare notification data for client
    const notification = {
      clientId: project.clientId,
      freelancerName: project.freelancerId.username || 'Freelancer',
      projectId: project._id,
      projectTitle: project.title
    };

    res.json({ 
      message: 'Project unmarked as completed successfully', 
      project,
      notification 
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error unmarking project as completed',
      error: error.message,
    });
  }
});

// Mark project as completed (only by assigned freelancer) - MUST come before /:id route
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      'freelancerId',
      'username profile'
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only the assigned freelancer can mark the project as completed
    if (
      !project.freelancerId ||
      project.freelancerId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message:
          'Only the assigned freelancer can mark this project as completed',
      });
    }

    // Only allow marking in-progress projects as completed
    if (project.status !== 'in_progress') {
      return res.status(400).json({
        message: 'Only in-progress projects can be marked as completed',
      });
    }

    // Update project status to completed
    project.status = 'completed';
    project.completedAt = new Date();
    await project.save();

    res.json({ 
      message: 'Project marked as completed successfully', 
      project,
      notification: {
        type: 'project_completed',
        freelancerName: project.freelancerId.username,
        clientId: project.clientId._id,
        projectId: project._id
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error marking project as completed',
      error: error.message,
    });
  }
});

// Get projects by freelancer ID
router.get('/freelancer/:freelancerId', async (req, res) => {
  try {
    const projects = await Project.find({ freelancerId: req.params.freelancerId })
      .populate('clientId', 'username profile isActive')
      .populate('freelancerId', 'username profile isActive')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching freelancer projects', error: error.message });
  }
});

// Get projects by client ID
router.get('/client/:clientId', async (req, res) => {
  try {
    const projects = await Project.find({ clientId: req.params.clientId })
      .populate('clientId', 'username profile isActive')
      .populate('freelancerId', 'username profile isActive')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching client projects', error: error.message });
  }
});

// Check if client has closed projects with freelancer
router.get('/client/:clientId/freelancer/:freelancerId/completed', async (req, res) => {
  try {
    const closedProjects = await Project.find({
      clientId: req.params.clientId,
      freelancerId: req.params.freelancerId,
      status: 'closed'
    });

    res.json({ 
      hasCompletedProjects: closedProjects.length > 0,
      completedCount: closedProjects.length 
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error checking completed projects', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('clientId', 'username profile isActive')
      .populate('freelancerId', 'username profile isActive');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching project', error: error.message });
  }
});

// Update project (only by project owner/client)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner (client) can update project
    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the project owner can update the project'
      });
    }

    // Check if project can be updated (not closed or cancelled)
    if (project.status === 'closed' || project.status === 'cancelled') {
      return res.status(400).json({
        message: 'Project cannot be updated as it is closed or cancelled'
      });
    }

    // Update project fields
    const allowedUpdates = ['title', 'description', 'budget', 'requiredSkills', 'deadline'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    project.updatedAt = new Date();
    await project.save();
    await project.populate('clientId', 'username profile isActive');
    await project.populate('freelancerId', 'username profile isActive');

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating project', error: error.message });
  }
});

// Cancel project (only by project owner/client)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner (client) can cancel project
    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the project owner can cancel the project'
      });
    }

    // Check if project can be cancelled (not already closed or cancelled)
    if (project.status === 'closed' || project.status === 'cancelled') {
      return res.status(400).json({
        message: 'Project cannot be cancelled as it is already closed or cancelled'
      });
    }

    // Store freelancer ID for notification before clearing it
    const freelancerIdForNotification = project.freelancerId;

    // Update project status to cancelled and clear freelancer-related fields
    project.status = 'cancelled';
    project.freelancerId = null;
    project.completedAt = null;
    project.updatedAt = new Date();
    await project.save();

    // Prepare response data
    const responseData = {
      message: 'Project cancelled successfully',
      project
    };

    // If project was in progress, prepare notification for freelancer
    if (freelancerIdForNotification) {
      responseData.notification = {
        type: 'project_cancelled',
        clientName: req.user.username,
        freelancerId: freelancerIdForNotification,
        projectId: project._id,
        projectTitle: project.title
      };
    }

    res.json(responseData);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error cancelling project', error: error.message });
  }
});

// Reopen cancelled project (only by project owner/client)
router.put('/:id/reopen', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner (client) can reopen project
    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the project owner can reopen the project'
      });
    }

    // Check if project can be reopened (must be cancelled)
    if (project.status !== 'cancelled') {
      return res.status(400).json({
        message: 'Only cancelled projects can be reopened'
      });
    }

    // Update project status to open
    project.status = 'open';
    project.updatedAt = new Date();
    await project.save();

    res.json({
      message: 'Project reopened successfully',
      project
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error reopening project', error: error.message });
  }
});

// Delete project (only by project owner/client)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner (client) can delete project
    if (project.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Only the project owner can delete the project'
      });
    }

    // Check if project can be deleted (not in progress or completed)
    if (project.status === 'in_progress' || project.status === 'completed' || project.status === 'closed') {
      return res.status(400).json({
        message: 'Cannot delete projects that are in progress, completed, or closed'
      });
    }

    // Delete the project
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting project', error: error.message });
  }
});

// Admin endpoint to close project (when escrow funds are released)
router.put('/:id/admin-close', authenticateToken, async (req, res) => {
  try {
    // Only admins can use this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can close projects via this endpoint' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only allow closing completed or in_progress projects
    if (project.status !== 'completed' && project.status !== 'in_progress') {
      return res.status(400).json({
        message: 'Only completed or in-progress projects can be closed',
      });
    }

    // Update project status to closed
    project.status = 'closed';
    project.completedAt = new Date();
    await project.save();

    res.json({ 
      message: 'Project marked as completed and closed successfully', 
      project
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error closing project',
      error: error.message,
    });
  }
});

module.exports = router;
