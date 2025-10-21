const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const User = require('../db/models/User-schema');

const router = express.Router();

// User Routes
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 2);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      profile,
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res
      .status(201)
      .json({
        message: 'User created successfully',
        token,
        user: { id: user._id, username: user.username, role: user.role },
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error creating user', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is suspended' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// User Dashboard Routes
// Get user profile by ID (for freelancer profiles)
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
});

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let dashboard = {};

    if (role === 'client') {
      const Project = require('../db/models/Project-schema');
      const Bid = require('../db/models/Bid-schema');

      const projects = await Project.find({ clientId: userId }).populate(
        'freelancerId',
        'username profile'
      );
      const bids = await Bid.find({
        projectId: { $in: projects.map(p => p._id) },
      }).populate('freelancerId', 'username profile');

      // Count bids per project and check if any bid is accepted
      const projectsWithBidCounts = projects.map(project => {
        const projectBids = bids.filter(bid => bid.projectId.toString() === project._id.toString());
        const pendingBids = projectBids.filter(bid => bid.status === 'pending');
        const hasAcceptedBid = projectBids.some(bid => bid.status === 'accepted');
        
        return {
          ...project.toObject(),
          bidCount: pendingBids.length,
          hasAcceptedBid: hasAcceptedBid,
          totalBids: projectBids.length
        };
      });

      dashboard = {
        projects: projectsWithBidCounts,
        bids,
        stats: {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'in_progress')
            .length,
          completedProjects: projects.filter(p => p.status === 'completed')
            .length,
        },
      };
    } else if (role === 'freelancer') {
      const Bid = require('../db/models/Bid-schema');
      const Project = require('../db/models/Project-schema');
      const Review = require('../db/models/Review-schema');

      const bids = await Bid.find({ freelancerId: userId }).populate(
        'projectId'
      );
      const projects = await Project.find({ freelancerId: userId }).populate(
        'clientId',
        'username profile'
      );
      const reviews = await Review.find({ freelancerId: userId }).populate(
        'clientId',
        'username'
      );

      dashboard = {
        bids,
        projects,
        reviews,
        stats: {
          totalBids: bids.length,
          acceptedBids: bids.filter(b => b.status === 'accepted').length,
          activeProjects: projects.filter(p => p.status === 'in_progress')
            .length,
          projectsDone: projects.filter(p => p.status === 'closed').length,
        },
      };
    }

    res.json(dashboard);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching dashboard', error: error.message });
  }
});

module.exports = router;
