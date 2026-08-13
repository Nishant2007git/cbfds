import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

export const connectDatabase = async () => {
  try {
    const options = {
      dbName: env.MONGODB_DB_NAME,
      autoIndex: env.NODE_ENV === 'development', // Disable auto-indexing in production
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

    await mongoose.connect(process.env.MONGODB_URI || env.MONGODB_URI, options);
  } catch (err) {
    logger.error('Failed to initialize MongoDB connection:', err);
    throw err;
  }
};

export default connectDatabase;
