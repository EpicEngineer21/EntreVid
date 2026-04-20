const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Application = require('./src/models/Application');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/entrev');
  
  const pw = await bcrypt.hash('password123', 10);
  let admin = await User.findOne({ email: 'admin@test.com' });
  if (!admin) {
    admin = await User.create({ id: 'admin_test_123', email: 'admin@test.com', password: pw, role: 'admin', isEmailVerified: true, fullName: 'Admin' });
  }

  await Application.deleteMany({});
  await Application.create({
    id: 'app_1', userId: admin.id, userEmail: 'pandaop038@gmail.com', userName: 'Prasun Raj',
    startupName: 'PrasunPanda', bio: 'I am Prasun, a B.tech 2nd Year Student at LPU.',
    linkedinUrl: 'https://linkedin.com', websiteUrl: 'https://google.com', notes: 'Hi! I am a Entrepreneur',
    status: 'pending', appliedAt: new Date('2026-04-18T12:00:00Z')
  });

  await Application.create({
    id: 'app_2', userId: 'user_2', userEmail: 'aadharsinghaniya@gmail.com', userName: 'Aadhar',
    startupName: 'PlayNSport', bio: 'This is a website platform where people who are intrested...',
    linkedinUrl: 'https://linkedin.com', websiteUrl: 'https://google.com', notes: 'I want to scale it over the world.',
    status: 'approved', appliedAt: new Date('2026-04-19T12:00:00Z'), reviewedAt: new Date('2026-04-19T12:00:00Z')
  });

  console.log("Seeding complete. Admin login: admin@test.com / password123");
  process.exit(0);
})();
