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

  // Demo accounts are helpful locally but must never be created by a deployed
  // instance. Make them explicitly opt-in.
  if (env.NODE_ENV === 'development' && process.env.SEED_DEMO_ACCOUNTS === 'true') {
    try {
    const User = (await import('./models/User.js')).default;
    const { v4: uuidv4 } = await import('uuid');

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
      logger.info('Seeded System Admin account: admin@library.com');
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
      logger.info('Seeded Standard User account: user@example.com');
    }
    } catch (seedErr) {
      logger.warn(`Default accounts seed check warning: ${seedErr.message}`);
    }
  }

  // Global Middleware Stack
  app.use(helmet());
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || env.FRONTEND_URL)
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean)
  );
  app.use(cors({
    origin: (origin, callback) => {
      // Non-browser clients authenticate with bearer tokens and do not need a
      // CORS header. Browser origins must be explicitly allow-listed.
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/$/, '');
      return callback(null, allowedOrigins.has(cleanOrigin));
    },
    credentials: false
  }));

  // Route resumable upload requests to Tus server directly (handles raw stream)
  app.all(`/api/${env.API_VERSION}/uploads*`, generalApiLimiter, authenticate, validateUploadQuota, (req, res) => {
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
