import UserRepository from '../repositories/userRepository.js';
import QuotaService from '../services/quotaService.js';
import SystemConfigRepository from '../repositories/systemConfigRepository.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const userRepo = new UserRepository();
const quotaService = new QuotaService();
const configRepo = new SystemConfigRepository();

class AdminController {
  /**
   * List all users with pagination.
   */
  async listUsers(req, res, next) {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    try {
      const results = await userRepo.listAll(page, limit);
      return res.status(200).json({
        success: true,
        data: {
          items: results.items,
          pagination: {
            totalItems: results.totalItems,
            totalPages: results.totalPages,
            currentPage: page,
            limit
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update a user's storage quota allocation.
   */
  async updateUserQuota(req, res, next) {
    const { userId } = req.params;
    const { storageQuota } = req.body;

    if (storageQuota === undefined || typeof storageQuota !== 'number' || storageQuota <= 0) {
      return next(new AppError('storageQuota is required and must be a positive number.', 400, 'VALIDATION_FAILED'));
    }

    try {
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
      }

      const updatedUser = await userRepo.update(userId, { storageQuota });
      logger.info(`AdminController: User ${userId} storage quota updated to ${storageQuota} bytes by Admin ${req.user.userId}`);
      
      return res.status(200).json({
        success: true,
        data: {
          userId: updatedUser.userId,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          storageQuota: updatedUser.storageQuota,
          storageUsed: updatedUser.storageUsed
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Trigger manual quota storageUsed audit and recalculation.
   */
  async recalculateUserQuota(req, res, next) {
    const { userId } = req.params;
    try {
      const updatedUser = await quotaService.recalculateStorageUsed(userId);
      return res.status(200).json({
        success: true,
        data: {
          userId: updatedUser.userId,
          fullName: updatedUser.fullName,
          storageQuota: updatedUser.storageQuota,
          storageUsed: updatedUser.storageUsed
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update global system configurations.
   */
  async updateSystemConfig(req, res, next) {
    const configs = req.body; // Expecting an array of { key, value, description } or single object

    if (!configs || typeof configs !== 'object') {
      return next(new AppError('Invalid request body payload.', 400, 'VALIDATION_FAILED'));
    }

    try {
      const items = Array.isArray(configs) ? configs : [configs];
      
      for (const item of items) {
        const { key, value, description } = item;
        if (!key || value === undefined) {
          throw new AppError('Config key and value are required.', 400, 'VALIDATION_FAILED');
        }
        await configRepo.setConfig(key, value, description || '', req.user.userId);
      }

      logger.info(`AdminController: System configurations updated by User ${req.user.userId}`);
      return res.status(200).json({
        success: true,
        message: 'System configurations updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminController();
export { AdminController };
