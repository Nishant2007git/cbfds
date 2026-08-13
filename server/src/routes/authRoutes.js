import express from 'express';
import authenticate from '../middleware/auth.js';
import validate from '../middleware/validator.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../utils/validators.js';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter
} from '../middleware/rateLimiter.js';

const configureAuthRoutes = (authController) => {
  const router = express.Router();

  router.post('/register', registerLimiter, validate(registerSchema), authController.register);
  router.post('/login', loginLimiter, validate(loginSchema), authController.login);
  router.post('/refresh', validate(refreshSchema), authController.refresh);
  router.post('/logout', validate(logoutSchema), authController.logout);

  router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
  router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

  // Protected routes
  router.post('/logout-all', authenticate, authController.logoutAll);
  router.get('/profile', authenticate, authController.getProfile);
  router.get('/me', authenticate, authController.getProfile);
  router.put('/profile', authenticate, authController.getProfile); // fallback or extend in future
  router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

  return router;
};

export default configureAuthRoutes;
