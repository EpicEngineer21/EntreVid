const mongoose = require('mongoose');

/** key = email lowercased OR keyPrefix + email (e.g. __reset__user@x.com) */
const otpTokenSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastSentAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('OtpToken', otpTokenSchema);
