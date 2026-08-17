import express from 'express';
import adminController from '../controllers/adminController.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';

const configureAdminRoutes = () => {
  const router = express.Router();

  // Enforce global authentication and rbac checks on all admin paths
  router.use(authenticate);
  router.use(rbac('admin'));

  // Admin user quota management
  router.get('/users', adminController.listUsers);
  router.put('/users/:userId/quota', adminController.updateUserQuota);
  router.post('/users/:userId/recalculate', adminController.recalculateUserQuota);

  // Admin system configurations
  router.post('/system/config', adminController.updateSystemConfig);

  // Fix stuck files (PROCESSING/ERROR)
  router.post('/fix-stuck-files', adminController.fixStuckFiles);

  return router;
};

export default configureAdminRoutes;
export { configureAdminRoutes };
