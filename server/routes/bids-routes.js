const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Bid = require('../db/models/Bid-schema');
const Project = require('../db/models/Project-schema');

const router = express.Router();

// Bid Routes
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can place bids' });
    }

    // Check if freelancer has already placed a bid on this project
    // Validate bid amount
    const bidAmount = parseFloat(req.body.amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ 
        message: 'Bid amount must be greater than 0' 
      });
    }

    // Get project to validate budget
    const project = await Project.findById(req.body.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (bidAmount > project.budget) {
      return res.status(400).json({ 
        message: `Bid amount cannot exceed the project budget of ₹${project.budget}` 
      });
    }

    const existingBid = await Bid.findOne({
      projectId: req.body.projectId,
      freelancerId: req.user.id
    });

    if (existingBid) {
      return res.status(400).json({ 
        message: 'You have already placed a bid on this project' 
      });
    }

    const bid = new Bid({
      ...req.body,
      freelancerId: req.user.id
    });
    await bid.save();
    await bid.populate('freelancerId', 'username profile');

    res.status(201).json(bid);
  } catch (error) {
    res.status(500).json({ message: 'Error creating bid', error: error.message });
  }
});

router.get('/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner can see all bids, freelancers can only see their own bid
    if (project.clientId.toString() !== req.user.id) {
      // If freelancer, only return their own bid
      if (req.user.role === 'freelancer') {
        const myBid = await Bid.findOne({ 
          projectId: req.params.projectId,
          freelancerId: req.user.id 
        }).populate('freelancerId', 'username profile');
        
        res.json(myBid ? [myBid] : []);
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      // Project owner can see all bids
      const bids = await Bid.find({ projectId: req.params.projectId })
        .populate('freelancerId', 'username profile')
        .sort({ createdAt: -1 });

      res.json(bids);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bids', error: error.message });
  }
});

// Get individual bid details
router.get('/detail/:bidId', authenticateToken, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId)
      .populate('freelancerId', 'username profile')
      .populate({
        path: 'projectId',
        select: 'title description budget clientId freelancerId status',
        populate: [
          { path: 'clientId', select: 'username profile isActive' },
          { path: 'freelancerId', select: 'username profile isActive' }
        ]
      });
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Check if user is project owner or bid owner
    if (bid.projectId.clientId._id.toString() !== req.user.id && 
        bid.freelancerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(bid);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bid', error: error.message });
  }
});

// Edit bid (only freelancer who placed the bid can edit)
router.put('/:bidId', authenticateToken, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('projectId');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Only the freelancer who placed the bid can edit it
    if (bid.freelancerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the bid owner can edit this bid' });
    }

    // Only allow editing pending bids
    if (bid.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bids can be edited' });
    }

    // Validate bid amount
    const bidAmount = parseFloat(req.body.amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ 
        message: 'Bid amount must be greater than 0' 
      });
    }

    if (bidAmount > bid.projectId.budget) {
      return res.status(400).json({ 
        message: `Bid amount cannot exceed the project budget of ₹${bid.projectId.budget}` 
      });
    }

    // Update bid with new data
    const updatedBid = await Bid.findByIdAndUpdate(
      req.params.bidId,
      { 
        amount: req.body.amount,
        timeline: req.body.timeline,
        proposal: req.body.proposal
      },
      { new: true }
    ).populate('freelancerId', 'username profile');

    res.json({ message: 'Bid updated successfully', bid: updatedBid });
  } catch (error) {
    res.status(500).json({ message: 'Error updating bid', error: error.message });
  }
});

router.put('/:bidId/accept', authenticateToken, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('projectId');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Only project owner can accept bids
    if (bid.projectId.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update bid status
    bid.status = 'accepted';
    await bid.save();

    // Update project
    bid.projectId.status = 'in_progress';
    bid.projectId.freelancerId = bid.freelancerId;
    await bid.projectId.save();

    // Reject all other bids for this project
    await Bid.updateMany(
      { projectId: bid.projectId._id, _id: { $ne: bid._id } },
      { status: 'rejected' }
    );

    res.json({ 
      message: 'Bid accepted successfully',
      notification: {
        type: 'bid_accepted',
        clientName: req.user.username,
        freelancerId: bid.freelancerId,
        projectId: bid.projectId._id,
        projectTitle: bid.projectId.title
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting bid', error: error.message });
  }
});

// Cancel/Delete a bid (only by the freelancer who placed it and only if pending)
router.delete('/:bidId', authenticateToken, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.bidId).populate('projectId');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Only the freelancer who placed the bid can cancel it
    if (bid.freelancerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own bids' });
    }

    // Only pending and accepted bids can be canceled
    if (bid.status !== 'pending' && bid.status !== 'accepted') {
      return res.status(400).json({ message: 'Only pending and accepted bids can be canceled' });
    }

    // Prepare response data
    const responseData = {
      message: 'Bid canceled successfully'
    };

    // If it's an accepted bid, we need to update the project and notify the client
    if (bid.status === 'accepted') {
      // Update project status back to open and remove freelancer
      bid.projectId.status = 'open';
      bid.projectId.freelancerId = null;
      bid.projectId.completedAt = null;
      await bid.projectId.save();

      // Reject all other bids for this project to make them available again
      await Bid.updateMany(
        { projectId: bid.projectId._id, _id: { $ne: bid._id } },
        { status: 'pending' }
      );

      // Check if there's an active conversation between client and freelancer
      // We'll check this by looking for any messages between them for this project
      // Since we don't have a direct way to check localStorage from backend,
      // we'll always include the notification and let the frontend decide
      // based on whether there are existing messages in localStorage
      responseData.notification = {
        type: 'bid_cancelled',
        freelancerName: req.user.username,
        clientId: bid.projectId.clientId,
        projectId: bid.projectId._id,
        projectTitle: bid.projectId.title,
        freelancerId: bid.freelancerId
      };
    }

    // Delete the bid
    await Bid.findByIdAndDelete(req.params.bidId);
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: 'Error canceling bid', error: error.message });
  }
});

module.exports = router;
