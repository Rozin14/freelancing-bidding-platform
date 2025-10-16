const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'freelancer'], required: true },
  profile: {
    name: String,
    company: String, // for clients
    skills: [String], // for freelancers
    hourlyRate: Number, // for freelancers
    portfolio: [String], // for freelancers
    rating: { type: Number, default: 0 },
    bio: String,
  },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('users', userSchema);
