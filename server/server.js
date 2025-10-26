const express = require('express');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const uniqid = require('uniqid');

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
app.use(express.static('public'));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/reviews', reviewRoutes);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/img');
  },
  filename: (req, file, cb) => {
    cb(null, `${uniqid()}-${file.originalname}`);
  },
});

const upload = multer({ storage });



app.post('/image', upload.single('image'), (req, res) => {
  try {
    const { file } = req;

    return res.status(201).json({
      message: 'Image uploaded successfully',
      url: `http://localhost:${process.env.PORT || 5000}/img/${file.filename}`,
    });
  } catch (error) {
    console.error('Error handling image upload:', error);
    return res.status(500).json({
      message: 'An internal server error occurred while uploading the image.',
    });
  }
});

// Note: Bids routes are handled at /api/bids

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});