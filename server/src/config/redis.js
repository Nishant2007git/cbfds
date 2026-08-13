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
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };

  if (env.REDIS_PASSWORD) {
    config.password = env.REDIS_PASSWORD;
  }

  redisClient = new Redis(config);

  redisClient.on('connect', () => {
    logger.info('Connected to Redis successfully.');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  return redisClient;
};

export const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

export default getRedisClient;
