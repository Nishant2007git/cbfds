import dns from 'dns';
// Set DNS servers to resolve MongoDB Atlas SRV records correctly on local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

import createApp from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import mongoose from 'mongoose';
import { getRedisClient } from './config/redis.js';
import { startWorkers, closeWorkers } from './workers/index.js';

const startServer = async () => {
  try {
    const app = await createApp();
    
    // Start background workers
    startWorkers();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
      logger.info(`API base URL: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal) => {
      logger.warn(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          // Close background workers
          await closeWorkers();

          // Close MongoDB connection
          await mongoose.connection.close();
          logger.info('MongoDB connection closed.');

          // Close Redis connection
          const redis = getRedisClient();
          if (redis) {
            await redis.quit();
            logger.info('Redis connection closed.');
          }
          
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force close after 10s
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Fatal crash during server initialization:', err);
    process.exit(1);
  }
};

// Process-level uncaught exception handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection detected:', reason);
  process.exit(1);
});

startServer();
