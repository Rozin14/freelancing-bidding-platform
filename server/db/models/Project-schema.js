const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  budget: { type: Number, required: true },
  requiredSkills: [String],
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'closed', 'cancelled'],
    default: 'open',
  },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  deadline: Date,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('projects', projectSchema);
