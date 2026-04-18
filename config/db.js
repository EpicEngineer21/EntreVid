const mongoose = require('mongoose');

/**
 * Connect to MongoDB. Call once before app.listen.
 * @param {string} uri
 */
async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: true,
  });
  console.log('  MongoDB connected');
}

module.exports = { connectDB };
