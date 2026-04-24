const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'verified_entrepreneur', 'admin'], 
    default: 'user' 
  },
  verified: { type: Boolean, default: false },
  profileImageUrl: { type: String, default: '' },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  emailVerifiedAt: { type: Date, default: null },
  verifiedEntrepreneurAt: { type: Date, default: null }
}, { 
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Create an index for quick lock lookups
userSchema.index({ lockUntil: 1 });

module.exports = mongoose.model('User', userSchema);
