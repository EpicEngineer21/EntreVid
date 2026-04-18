const User = require('../models/User');
const Video = require('../models/Video');
const OtpToken = require('../models/OtpToken');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');

const AUDIT_CAP = 5000;

function iso(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

/** Plain object compatible with existing app logic (ISO date strings). */
function userPlain(doc) {
  if (!doc) return null;
  const u = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    password: u.password,
    role: u.role || 'user',
    /** Matches legacy: session uses user.verified !== false */
    verified: u.verified !== false,
    failedLoginAttempts: u.failedLoginAttempts || 0,
    lockUntil: u.lockUntil ? iso(u.lockUntil) : null,
    emailVerifiedAt: u.emailVerifiedAt ? iso(u.emailVerifiedAt) : null,
    verifiedEntrepreneurAt: u.verifiedEntrepreneurAt ? iso(u.verifiedEntrepreneurAt) : null,
    createdAt: u.createdAt ? iso(u.createdAt) : undefined,
  };
}

function videoPlain(doc) {
  if (!doc) return null;
  const v = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: v.id,
    title: v.title,
    entrepreneur: v.entrepreneur,
    description: v.description,
    youtubeUrl: v.youtubeUrl,
    youtubeId: v.youtubeId,
    category: v.category,
    tags: v.tags || [],
    featured: !!v.featured,
    submittedBy: v.submittedBy,
    ownerUserId: v.ownerUserId,
    status: v.status || 'published',
    createdAt: v.createdAt ? iso(v.createdAt) : undefined,
    updatedAt: v.updatedAt ? iso(v.updatedAt) : undefined,
  };
}

function applicationPlain(doc) {
  if (!doc) return null;
  const a = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: a.id,
    userId: a.userId,
    userEmail: a.userEmail,
    userName: a.userName,
    startupName: a.startupName,
    bio: a.bio,
    linkedinUrl: a.linkedinUrl,
    websiteUrl: a.websiteUrl,
    notes: a.notes,
    status: a.status,
    appliedAt: a.appliedAt ? iso(a.appliedAt) : undefined,
    reviewedAt: a.reviewedAt ? iso(a.reviewedAt) : null,
    reviewedBy: a.reviewedBy,
    rejectionReason: a.rejectionReason,
  };
}

async function findAllUsersLean() {
  const rows = await User.find().lean();
  return rows.map(userPlain);
}

async function findUserByEmail(email) {
  const u = await User.findOne({ email: (email || '').toLowerCase() }).lean();
  return userPlain(u);
}

async function findUserById(id) {
  const u = await User.findOne({ id }).lean();
  return userPlain(u);
}

async function createUser(payload) {
  await User.create(payload);
}

async function updateUserById(id, $set) {
  await User.updateOne({ id }, { $set });
}

async function findAllVideosLean() {
  const rows = await Video.find().lean();
  return rows.map(videoPlain);
}

async function findVideoById(vid) {
  const v = await Video.findOne({ id: vid }).lean();
  return videoPlain(v);
}

async function createVideo(payload) {
  await Video.create(payload);
}

async function updateVideoById(vid, $set) {
  await Video.updateOne({ id: vid }, { $set });
}

async function deleteVideoById(vid) {
  await Video.deleteOne({ id: vid });
}

async function getOtpRecord(key) {
  return OtpToken.findOne({ key }).lean();
}

async function upsertOtp(key, data) {
  await OtpToken.findOneAndUpdate(
    { key },
    {
      otpHash: data.otpHash,
      expiresAt: data.expiresAt,
      attempts: data.attempts ?? 0,
      createdAt: data.createdAt || new Date(),
      lastSentAt: data.lastSentAt || new Date(),
    },
    { upsert: true, new: true }
  );
}

async function setOtpAttempts(key, attempts) {
  await OtpToken.updateOne({ key }, { $set: { attempts } });
}

async function deleteOtp(key) {
  await OtpToken.deleteOne({ key });
}

async function findAllApplicationsLean() {
  const rows = await Application.find().lean();
  return rows.map(applicationPlain);
}

async function findApplicationByUserId(userId) {
  const a = await Application.findOne({ userId }).sort({ appliedAt: -1 }).lean();
  return applicationPlain(a);
}

async function upsertApplication(doc) {
  await Application.replaceOne({ userId: doc.userId }, doc, { upsert: true });
}

async function updateApplicationByUserId(userId, $set) {
  await Application.updateOne({ userId }, { $set });
}

async function findApplicationPendingByUserId(userId) {
  const a = await Application.findOne({ userId, status: 'pending' }).lean();
  return applicationPlain(a);
}

async function appendAudit(entry) {
  await AuditLog.create(entry);
  const count = await AuditLog.countDocuments();
  if (count > AUDIT_CAP) {
    const toRemove = count - AUDIT_CAP;
    const old = await AuditLog.find().sort({ ts: 1 }).limit(toRemove).select('_id').lean();
    const ids = old.map((x) => x._id);
    if (ids.length) await AuditLog.deleteMany({ _id: { $in: ids } });
  }
}

module.exports = {
  userPlain,
  videoPlain,
  applicationPlain,
  findAllUsersLean,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserById,
  findAllVideosLean,
  findVideoById,
  createVideo,
  updateVideoById,
  deleteVideoById,
  getOtpRecord,
  upsertOtp,
  setOtpAttempts,
  deleteOtp,
  findAllApplicationsLean,
  findApplicationByUserId,
  upsertApplication,
  updateApplicationByUserId,
  findApplicationPendingByUserId,
  appendAudit,
};
