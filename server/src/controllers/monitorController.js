import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis.js';
import env from '../config/env.js';

class MonitorController {
  health = async (req, res) => {
    const memory = process.memoryUsage();
    
    // Check MongoDB
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    // Check Redis
    const redis = getRedisClient();
    const isRedisConnected = redis && redis.status === 'ready';

    const healthStatus = isMongoConnected && isRedisConnected ? 'healthy' : 'degraded';

    return res.status(healthStatus === 'healthy' ? 200 : 200).json({
      status: healthStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {
        api: 'healthy',
        database: isMongoConnected ? 'healthy' : 'unhealthy',
        redis: isRedisConnected ? 'healthy' : 'unhealthy',
        memory: {
          used: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        }
      }
    });
  };

  readiness = async (req, res) => {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const redis = getRedisClient();
    const isRedisConnected = redis && redis.status === 'ready';

    const isReady = isMongoConnected && isRedisConnected;

    return res.status(isReady ? 200 : 503).json({
      ready: isReady,
      checks: {
        mongodb: isMongoConnected ? 'connected' : 'disconnected',
        redis: isRedisConnected ? 'connected' : 'disconnected',
        queue: isRedisConnected ? 'active' : 'inactive' // BullMQ bound to Redis status
      }
    });
  };
}

export default MonitorController;
export { MonitorController };
