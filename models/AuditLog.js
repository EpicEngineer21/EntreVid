const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    ts: { type: Date, default: Date.now, index: true },
    event: { type: String, required: true, index: true },
    userId: { type: String, default: null },
    email: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { versionKey: false }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
