import QuotaService from '../services/quotaService.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const quotaService = new QuotaService();

/**
 * Express middleware to intercept incoming file uploads and verify if the user
 * has enough storage space left to accommodate the upload.
 */
export const validateUploadQuota = async (req, res, next) => {
  // Only evaluate quota during upload creation (POST)
  if (req.method === 'POST') {
    const uploadLengthStr = req.headers['upload-length'];
    
    if (!uploadLengthStr) {
      logger.warn('QuotaMiddleware: POST request received without Upload-Length header.');
      return next(new AppError('Upload-Length header is required on file creation.', 400, 'MISSING_UPLOAD_LENGTH'));
    }

    const uploadLength = parseInt(uploadLengthStr, 10);
    if (isNaN(uploadLength) || uploadLength <= 0) {
      return next(new AppError('Upload-Length header must be a positive integer.', 400, 'INVALID_UPLOAD_LENGTH'));
    }

    if (!req.user || !req.user.userId) {
      return next(new AppError('Authentication credentials required to verify quota.', 401, 'AUTH_UNAUTHORIZED'));
    }

    try {
      const hasQuotaSpace = await quotaService.checkQuota(req.user.userId, uploadLength);
      if (!hasQuotaSpace) {
        logger.warn(`QuotaMiddleware: Upload blocked. User ${req.user.userId} has insufficient storage for incoming ${uploadLength} bytes.`);
        return next(new AppError('Storage quota exceeded. Please upgrade your storage tier.', 403, 'QUOTA_EXCEEDED'));
      }
      logger.info(`QuotaMiddleware: Storage quota verified. User ${req.user.userId} has space for ${uploadLength} bytes.`);
    } catch (err) {
      return next(err);
    }
  }
  next();
};

export default validateUploadQuota;
