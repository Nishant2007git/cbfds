import express from 'express';
import shareController from '../controllers/shareController.js';
import authenticate from '../middleware/auth.js';
import { generalApiLimiter } from '../middleware/rateLimiter.js';

const configureShareRoutes = () => {
  const router = express.Router();

  // Private Authenticated Routes
  router.post('/shares', authenticate, shareController.createShare);
  router.get('/shares', authenticate, shareController.listOutgoingShares);
  router.get('/shares/shared-with-me', authenticate, shareController.listIncomingShares);
  router.get('/shares/:shareId', authenticate, shareController.getShare);
  router.delete('/shares/:shareId', authenticate, shareController.revokeShare);

  // Public Sharing Context Routes
  router.get('/share/:token', generalApiLimiter, shareController.getPublicShareContext);
  router.post('/share/:token/verify', generalApiLimiter, shareController.verifyPublicShare);
  router.get('/share/:token/download', shareController.downloadPublicShare);

  return router;
};

export default configureShareRoutes;
export { configureShareRoutes };
