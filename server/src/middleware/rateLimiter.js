import rateLimit from 'express-rate-limit';
import { RateLimitError } from '../utils/errors.js';

const isProduction = process.env.NODE_ENV === 'production';

// Helper to create rate limiter configs
const createLimiter = (windowMs, max, message) => {
  const limiter = rateLimit({
    windowMs,
    max: isProduction ? max : Math.max(max * 20, 100),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new RateLimitError(message));
    },
  });

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    return limiter(req, res, next);
  };
};

export const loginLimiter = createLimiter(
  15 * 60 * 1000, // 15 mins
  20,
  'Too many login attempts. Please try again after 15 minutes.'
);

export const registerLimiter = createLimiter(
  15 * 60 * 1000, // 15 mins
  20,
  'Too many registration requests from this IP. Please try again after 15 minutes.'
);

export const forgotPasswordLimiter = createLimiter(
  15 * 60 * 1000, // 15 mins
  10,
  'Too many password reset requests. Please try again after 15 minutes.'
);

export const generalApiLimiter = createLimiter(
  60 * 1000, // 1 minute
  200,
  'Too many requests. Please slow down.'
);
