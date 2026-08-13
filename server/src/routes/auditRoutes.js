import express from 'express';
import auditLogService from '../services/auditLogService.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';

const configureAuditRoutes = () => {
  const router = express.Router();

  // Enforce authentication on all audit endpoints
  router.use(authenticate);

  // User-facing trail retrieval
  router.get('/', async (req, res, next) => {
    try {
      const logs = await auditLogService.getUserLogs(req.user.userId);
      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  });

  // Admin-facing full dashboard trail retrieval
  router.get('/admin', rbac('admin'), async (req, res, next) => {
    try {
      const filters = {};
      if (req.query.userId) {
        filters.userId = req.query.userId;
      }
      if (req.query.action) {
        filters.action = req.query.action;
      }
      const logs = await auditLogService.getAllLogs(filters);
      res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};

export default configureAuditRoutes;
export { configureAuditRoutes };
