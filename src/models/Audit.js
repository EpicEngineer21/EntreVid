const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now, index: true },
  event: { type: String, required: true, index: true },
  userId: { type: String, default: null, index: true },
  email: { type: String, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
});

module.exports = mongoose.model('Audit', auditSchema);
