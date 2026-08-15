import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import logger from './utils/logger.js';
import requestId from './middleware/requestId.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

// Configuration Connections
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';

// Repositories
import UserRepository from './repositories/userRepository.js';
import RefreshTokenRepository from './repositories/refreshTokenRepository.js';
import OtpRepository from './repositories/otpRepository.js';

// Services
import AuthService from './services/authService.js';

// Controllers
import AuthController from './controllers/authController.js';

// Routing
import configureRoutes from './routes/index.js';

// Providers
import tusServer from './providers/storage/tusServer.js';

// Middleware
import authenticate from './middleware/auth.js';
import validateUploadQuota from './middleware/quota.js';

const createApp = async () => {
  const app = express();
  app.set('trust proxy', 1);

  // Initialize Database Connections
  await connectDatabase();
  connectRedis();

  // Seed default admin account if missing
  try {
    const User = (await import('./models/User.js')).default;
    const adminExists = await User.findOne({ email: 'admin@library.com' });
    if (!adminExists) {
      const { v4: uuidv4 } = await import('uuid');
      await User.create({
        userId: uuidv4(),
        fullName: 'System Admin',
        email: 'admin@library.com',
        passwordHash: 'Password123!',
        role: 'admin',
        storageQuota: 107374182400, // 100 GB
        storageUsed: 0
      });
      logger.info('Seeded System Admin account: admin@library.com');
    }
  } catch (seedErr) {
    logger.warn(`Admin seed check warning: ${seedErr.message}`);
  }

  // Global Middleware Stack
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/[\r\n]/g, '');
      return callback(null, cleanOrigin);
    },
    credentials: true
  }));

  // Route resumable upload requests to Tus server directly (handles raw stream)
  app.all(`/api/${env.API_VERSION}/uploads*`, authenticate, validateUploadQuota, (req, res) => {
    tusServer.handle(req, res);
  });

  app.use(express.json());
  app.use(requestId);
  app.use(generalApiLimiter);

  // Request logger middleware
  app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url} [ReqId: ${req.id}] - IP: ${req.ip}`);
    next();
  });

  // Manual Dependency Injection Setup
  const userRepo = new UserRepository();
  const tokenRepo = new RefreshTokenRepository();
  const otpRepo = new OtpRepository();

  const authService = new AuthService(userRepo, tokenRepo, otpRepo);
  const authController = new AuthController(authService);

  // Configure and mount Routes
  const routes = configureRoutes(authController);
  app.use(`/api/${env.API_VERSION}`, routes);

  // Fallback 404 Route
  app.use((req, res, next) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.url} does not exist.`
      }
    });
  });

  // Centralized Error Catcher
  app.use(errorHandler);

  return app;
};

export default createApp;
