const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  startupName: { type: String, required: true },
  bio: { type: String, required: true },
  linkedinUrl: { type: String, default: null },
  websiteUrl: { type: String, default: null },
  notes: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true
  },
  appliedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: null },
  rejectionReason: { type: String, default: null }
}, {
  timestamps: false // we use our own appliedAt and reviewedAt explicitly
});

module.exports = mongoose.model('Application', applicationSchema);
