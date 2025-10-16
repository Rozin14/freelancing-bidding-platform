const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Review = require('../db/models/Review-schema');
const User = require('../db/models/User-schema');

const router = express.Router();

// Review Routes
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can leave reviews' });
    }

    // Validate required fields
    if (!req.body.freelancerId || !req.body.rating || !req.body.comment) {
      return res.status(400).json({ message: 'Missing required fields: freelancerId, rating, and comment are required' });
    }

    // Validate rating
    if (req.body.rating < 1 || req.body.rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = new Review({
      ...req.body,
      clientId: req.user.id
    });
    await review.save();

    // Update freelancer rating
    const reviews = await Review.find({ freelancerId: req.body.freelancerId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await User.findByIdAndUpdate(req.body.freelancerId, { 'profile.rating': avgRating });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
});

// Get reviews by freelancer ID
router.get('/freelancer/:freelancerId', async (req, res) => {
  try {
    const reviews = await Review.find({ freelancerId: req.params.freelancerId })
      .populate('clientId', 'username profile')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

module.exports = router;
