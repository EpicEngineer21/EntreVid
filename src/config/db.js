const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`  🍃  MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`  ❌  Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
