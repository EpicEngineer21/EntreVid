const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    entrepreneur: { type: String, required: true },
    description: { type: String, required: true },
    youtubeUrl: { type: String, required: true },
    youtubeId: { type: String, required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    featured: { type: Boolean, default: false },
    submittedBy: { type: String },
    ownerUserId: { type: String, index: true },
    status: { type: String, default: 'published', index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Video', videoSchema);
