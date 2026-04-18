const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  entrepreneur: { type: String, required: true },
  description: { type: String, required: true },
  youtubeUrl: { type: String, required: true },
  youtubeId: { type: String, required: true },
  category: { type: String, required: true, index: true },
  tags: [{ type: String }],
  featured: { type: Boolean, default: false },
  submittedBy: { type: String, required: true },
  ownerUserId: { type: String, required: true, index: true },
  status: { type: String, enum: ['published', 'archived'], default: 'published' }
}, {
  timestamps: true
});

// Full-text search index for exploring videos
videoSchema.index({ title: 'text', entrepreneur: 'text' });

module.exports = mongoose.model('Video', videoSchema);
