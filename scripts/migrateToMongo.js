require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import Config & Models
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Video = require('../src/models/Video');
const Application = require('../src/models/Application');
const OTP = require('../src/models/OTP');
const Audit = require('../src/models/Audit');

// Data file paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE   = path.join(DATA_DIR, 'users.json');
const VIDEOS_FILE  = path.join(DATA_DIR, 'videos.json');
const APPS_FILE    = path.join(DATA_DIR, 'applications.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending-verifications.json');
const AUDIT_FILE   = path.join(DATA_DIR, 'audit.json');

// Helpers
function readJson(file, defaultReturn = []) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } 
  catch { return defaultReturn; }
}

const migrate = async () => {
  await connectDB();
  console.log('Starting Migration from JSON to MongoDB...');

  try {
    // 1. Users
    const users = readJson(USERS_FILE, []);
    if (users.length > 0) {
      // Clear existing safely
      await User.deleteMany({});
      await User.insertMany(users);
      console.log(`✅ Migrated ${users.length} Users.`);
    }

    // 2. Videos
    let videos = readJson(VIDEOS_FILE, []);
    videos = videos.map(v => ({
      ...v,
      submittedBy: v.submittedBy || 'System Admin',
      ownerUserId: v.ownerUserId || 'system'
    }));

    if (videos.length > 0) {
      await Video.deleteMany({});
      await Video.insertMany(videos);
      console.log(`✅ Migrated ${videos.length} Videos.`);
    }

    // 3. Applications
    const apps = readJson(APPS_FILE, []);
    if (apps.length > 0) {
      await Application.deleteMany({});
      await Application.insertMany(apps);
      console.log(`✅ Migrated ${apps.length} Applications.`);
    }

    // 4. Pending (OTP data)
    const pendingJson = readJson(PENDING_FILE, {});
    const pendingKeys = Object.keys(pendingJson);
    if (pendingKeys.length > 0) {
      const otpsArray = pendingKeys.map(key => ({
        key: key,
        otpHash: pendingJson[key].otpHash,
        expiresAt: new Date(pendingJson[key].expiresAt),
        attempts: pendingJson[key].attempts || 0,
        lastSentAt: new Date(pendingJson[key].lastSentAt || pendingJson[key].createdAt),
        createdAt: new Date(pendingJson[key].createdAt)
      }));
      await OTP.deleteMany({});
      await OTP.insertMany(otpsArray);
      console.log(`✅ Migrated ${otpsArray.length} OTPs/Pending Requests.`);
    }

    // 5. Audits
    const audits = readJson(AUDIT_FILE, []);
    if (audits.length > 0) {
      await Audit.deleteMany({});
      await Audit.insertMany(audits);
      console.log(`✅ Migrated ${audits.length} Audit logs.`);
    }

    console.log('🎉 Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

migrate();
