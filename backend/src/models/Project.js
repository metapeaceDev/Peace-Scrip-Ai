const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['feature', 'short', 'series', 'documentary', 'commercial'],
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    }
  }],
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  genre: String,
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed', 'archived'],
    default: 'draft'
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for faster queries
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ 'collaborators.user': 1 });

module.exports = mongoose.model('Project', projectSchema);
