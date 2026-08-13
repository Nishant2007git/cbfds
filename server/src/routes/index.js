import express from 'express';
import configureAuthRoutes from './authRoutes.js';
import configureShareRoutes from './shareRoutes.js';
import configureAdminRoutes from './adminRoutes.js';
import configureFileRoutes from './fileRoutes.js';
import configureAuditRoutes from './auditRoutes.js';
import MonitorController from '../controllers/monitorController.js';

const configureRoutes = (authController) => {
  const router = express.Router();
  const monitorController = new MonitorController();

  // Monitoring endpoints
  router.get('/health', monitorController.health);
  router.get('/readiness', monitorController.readiness);

  // Authenticated modules
  router.use('/auth', configureAuthRoutes(authController));
  router.use('/admin', configureAdminRoutes());
  router.use('/files', configureFileRoutes());
  router.use('/audit-logs', configureAuditRoutes());
  router.use('/', configureShareRoutes());

  return router;
};

export default configureRoutes;
