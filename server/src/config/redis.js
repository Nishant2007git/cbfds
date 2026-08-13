import Redis from 'ioredis';
import env from './env.js';
import logger from '../utils/logger.js';

let redisClient = null;

export const connectRedis = () => {
  if (redisClient) return redisClient;

  if (process.env.NODE_ENV === 'test') {
    logger.info('Test environment detected. Initializing Mock Redis Client.');
    redisClient = {
      on: () => {},
      status: 'ready',
      quit: async () => {},
      // Mock basic methods if needed
      set: async () => 'OK',
      get: async () => null,
      del: async () => 1
    };
    return redisClient;
  }

  const config = {
    host: (env.REDIS_HOST || 'localhost').trim(),
    port: env.REDIS_PORT,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis connection retry limit reached. Redis will remain offline until reconnected.');
        return null;
      }
      return Math.min(times * 300, 1500);
    },
  };

  if (env.REDIS_PASSWORD) {
    config.password = env.REDIS_PASSWORD.trim();
  }

  try {
    redisClient = new Redis(config);

    redisClient.on('connect', () => {
      logger.info('Connected to Redis successfully.');
    });

    redisClient.on('error', (err) => {
      logger.warn(`Redis connection issue: ${err.message}`);
    });
  } catch (err) {
    logger.warn(`Failed to initialize Redis client: ${err.message}`);
  }

  return redisClient;
};

export const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

export default getRedisClient;
