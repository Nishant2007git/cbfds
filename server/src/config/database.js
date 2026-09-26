import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

export const connectDatabase = async (retries = 5, delayMs = 3000) => {
  const options = {
    dbName: env.MONGODB_DB_NAME,
    autoIndex: env.NODE_ENV === 'development',
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  };

  mongoose.connection.on('connected', () => {
    logger.info('Connected to MongoDB successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected.');
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI, options);
      return;
    } catch (err) {
      logger.error(`Failed to initialize MongoDB connection (attempt ${attempt}/${retries}):`, err.message);
      if (attempt === retries) {
        throw err;
      }
      logger.info(`Retrying MongoDB connection in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export default connectDatabase;
