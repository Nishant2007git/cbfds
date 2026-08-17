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

  /**
   * Fix files stuck in PROCESSING or ERROR status.
   * Optionally reassigns ownerId for files that were incorrectly set to 'anonymous'.
   */
  async fixStuckFiles(req, res, next) {
    try {
      const FileModel = (await import('../models/File.js')).default;
      const ChunkModel = (await import('../models/Chunk.js')).default;
      
      // Find all stuck files (PROCESSING or ERROR)
      const stuckFiles = await FileModel.find({
        status: { $in: ['PROCESSING', 'ERROR'] }
      });

      if (stuckFiles.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No stuck files found.',
          data: { fixed: 0 }
        });
      }

      const results = [];
      for (const file of stuckFiles) {
        // Check if chunks exist for this file
        const chunkCount = await ChunkModel.countDocuments({ fileId: file.fileId });
        
        let newOwnerId = file.ownerId;
        // Fix 'anonymous' owner — reassign to the requesting admin
        if (file.ownerId === 'anonymous') {
          newOwnerId = req.user.userId;
        }

        if (chunkCount > 0) {
          // File has chunks — mark as ACTIVE
          await FileModel.findOneAndUpdate(
            { fileId: file.fileId },
            { 
              $set: { 
                status: 'ACTIVE', 
                statusMessage: null,
                ownerId: newOwnerId,
                totalChunks: chunkCount
              } 
            }
          );
          results.push({ fileId: file.fileId, name: file.originalName, action: 'SET_ACTIVE', chunks: chunkCount, ownerId: newOwnerId });
        } else {
          // File has no chunks — mark as ERROR with clear message
          await FileModel.findOneAndUpdate(
            { fileId: file.fileId },
            { 
              $set: { 
                status: 'ERROR', 
                statusMessage: 'No chunks found. Please re-upload this file.',
                ownerId: newOwnerId
              } 
            }
          );
          results.push({ fileId: file.fileId, name: file.originalName, action: 'SET_ERROR_NO_CHUNKS', ownerId: newOwnerId });
        }
      }

      logger.info(`AdminController: Fixed ${results.length} stuck files. Admin: ${req.user.userId}`);
      
      return res.status(200).json({
        success: true,
        message: `Fixed ${results.length} stuck file(s).`,
        data: { fixed: results.length, details: results }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminController();
export { AdminController };
