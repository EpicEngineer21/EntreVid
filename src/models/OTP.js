const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// TTL Index: This will automatically delete the OTP document slightly after it expires
// We add a short buffer (e.g., 60 seconds) or just rely on expiresAt exact match
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
