const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
require('./db');

// Import routes
const adminRoutes = require('./routes/admin-routes');
const authRoutes = require('./routes/auth-routes');
const projectRoutes = require('./routes/projects-routes');
const bidRoutes = require('./routes/bids-routes');
const reviewRoutes = require('./routes/reviews-routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/reviews', reviewRoutes);

// Note: Bids routes are handled at /api/bids

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});