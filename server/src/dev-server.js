import dns from 'dns';
// Set DNS servers to resolve MongoDB Atlas SRV records correctly on local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import { MongoMemoryServer } from 'mongodb-memory-server';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a_very_long_test_secret_key_at_least_32_characters';
process.env.PORT = '3500';

async function startDevServer() {
  let uri = process.env.MONGODB_URI;
  
  if (!uri || uri.startsWith('mongodb://localhost')) {
    logger.info('Starting Standalone Development Memory Server...');
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    logger.info(`MongoMemoryServer started at: ${uri}`);
  } else {
    logger.info(`Connecting to configured cloud MongoDB URI: ${uri.replace(/:[^@]+@/, ':****@')}`);
  }

  // Import workers to hook mock background listeners
  await import('./workers/fileWorker.js');
  await import('./workers/notificationWorker.js');
  await import('./workers/maintenanceWorker.js');

  // Import database connection and initialize
  const { connectDatabase } = await import('./config/database.js');
  await connectDatabase();

  // Seed default development users if they don't exist
  // NOTE: Pass plain password — the User model's pre-save hook hashes it automatically
  const User = (await import('./models/User.js')).default;

  const adminExists = await User.findOne({ email: 'admin@library.com' });
  if (!adminExists) {
    await User.create({
      userId: uuidv4(),
      fullName: 'System Admin',
      email: 'admin@library.com',
      passwordHash: 'Password123!',
      role: 'admin',
      storageQuota: 107374182400, // 100 GB
      storageUsed: 0
    });
    logger.info('Seeded System Admin account.');
  }

  const userExists = await User.findOne({ email: 'user@example.com' });
  if (!userExists) {
    await User.create({
      userId: uuidv4(),
      fullName: 'Standard User',
      email: 'user@example.com',
      passwordHash: 'Password123!',
      role: 'user',
      storageQuota: 10737418240, // 10 GB
      storageUsed: 0
    });
    logger.info('Seeded Standard User account.');
  }

  logger.info('-------------------------------------------------------');
  logger.info('Default Dev Accounts Seeded:');
  logger.info(' - Admin: admin@library.com / Password123!');
  logger.info(' - User:  user@example.com  / Password123!');
  logger.info('-------------------------------------------------------');

  // Import App and start HTTP listener
  const createApp = (await import('./app.js')).default;
  const app = await createApp();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`=======================================================`);
    logger.info(`🚀 CBFDS Backend Dev Server running on http://localhost:${PORT}`);
    logger.info(`=======================================================`);
  });
}

startDevServer().catch((err) => {
  logger.error('Failed to start dev server:', err);
});
