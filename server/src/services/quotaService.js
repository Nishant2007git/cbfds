import UserRepository from '../repositories/userRepository.js';
import FileRepository from '../repositories/fileRepository.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

class QuotaService {
  constructor(userRepo = new UserRepository(), fileRepo = new FileRepository()) {
    this.userRepo = userRepo;
    this.fileRepo = fileRepo;
  }

  /**
   * Verifies if adding the incoming file size keeps the user within their quota limit.
   * @param {string} userId Unique User identifier.
   * @param {number} incomingSize Size of the incoming file in bytes.
   * @returns {Promise<boolean>} True if quota check passes, false otherwise.
   */
  async checkQuota(userId, incomingSize) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const availableSpace = user.storageQuota - user.storageUsed;
    const isWithinQuota = incomingSize <= availableSpace;

    logger.debug(`QuotaService: User: ${userId}, Quota: ${user.storageQuota}, Used: ${user.storageUsed}, Incoming: ${incomingSize}, Valid: ${isWithinQuota}`);
    return isWithinQuota;
  }

  /**
   * Atomically increments the storage used by a user.
   */
  async incrementStorageUsed(userId, bytes) {
    logger.info(`QuotaService: Incrementing storageUsed for User ${userId} by ${bytes} bytes.`);
    const updated = await this.userRepo.incrementStorageUsed(userId, bytes);
    if (!updated) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return updated;
  }

  /**
   * Atomically decrements the storage used by a user.
   */
  async decrementStorageUsed(userId, bytes) {
    logger.info(`QuotaService: Decrementing storageUsed for User ${userId} by ${bytes} bytes.`);
    const updated = await this.userRepo.incrementStorageUsed(userId, -bytes);
    if (!updated) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return updated;
  }

  /**
   * Scans all ACTIVE files owned by the user, sums their sizes, and synchronizes the user's storageUsed.
   */
  async recalculateStorageUsed(userId) {
    logger.info(`QuotaService: Initiating storage audit and recalculation for User ${userId}`);
    
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Find all ACTIVE files for the user
    const activeFiles = await this.fileRepo.model.find({
      ownerId: userId,
      status: 'ACTIVE'
    });

    const calculatedSum = activeFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    logger.info(`QuotaService: Recalculation complete. User ${userId} active storage count: ${calculatedSum} bytes (Previous recorded: ${user.storageUsed} bytes).`);

    // Save recalculated value
    const updatedUser = await this.userRepo.update(userId, { storageUsed: calculatedSum });
    return updatedUser;
  }
}

export default QuotaService;
export { QuotaService };
