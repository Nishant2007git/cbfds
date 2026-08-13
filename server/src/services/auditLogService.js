import AuditLogRepository from '../repositories/auditLogRepository.js';
import UserRepository from '../repositories/userRepository.js';
import FileRepository from '../repositories/fileRepository.js';
import logger from '../utils/logger.js';

class AuditLogService {
  constructor(
    auditRepo = new AuditLogRepository(),
    userRepo = new UserRepository(),
    fileRepo = new FileRepository()
  ) {
    this.auditRepo = auditRepo;
    this.userRepo = userRepo;
    this.fileRepo = fileRepo;
  }

  /**
   * Log an audit event asynchronously.
   */
  async log(userId, action, fileId = null, details = {}, ipAddress = '127.0.0.1', userAgent = 'Unknown') {
    try {
      // Clean up IP addresses from local network or proxy layers
      let ip = ipAddress;
      if (ip.startsWith('::ffff:')) {
        ip = ip.replace('::ffff:', '');
      } else if (ip === '::1') {
        ip = '127.0.0.1';
      }

      const logEntry = await this.auditRepo.create({
        userId,
        action,
        fileId,
        ipAddress: ip,
        userAgent,
        details
      });

      logger.info(`AuditLogService: Logged ${action} action for User ${userId}`);
      return logEntry;
    } catch (err) {
      logger.error('AuditLogService: Failed to record audit log:', err);
    }
  }

  /**
   * Fetch logs for a specific user.
   */
  async getUserLogs(userId) {
    const logs = await this.auditRepo.findByUserId(userId);
    const populated = [];

    for (const log of logs) {
      let fileObj = null;
      if (log.fileId) {
        const file = await this.fileRepo.findById(log.fileId);
        if (file) {
          fileObj = {
            originalName: file.originalName,
            fileSize: file.fileSize
          };
        }
      }

      populated.push({
        ...log.toObject(),
        file: fileObj
      });
    }

    return populated;
  }

  /**
   * Fetch all logs (Admin use) with user email and names.
   */
  async getAllLogs(filters = {}) {
    const logs = await this.auditRepo.listAllLogs(filters);
    const populated = [];

    for (const log of logs) {
      const user = await this.userRepo.findById(log.userId);
      let fileObj = null;
      if (log.fileId) {
        const file = await this.fileRepo.findById(log.fileId);
        if (file) {
          fileObj = {
            originalName: file.originalName,
            fileSize: file.fileSize
          };
        }
      }

      populated.push({
        ...log.toObject(),
        user: user ? {
          email: user.email,
          fullName: user.fullName
        } : null,
        file: fileObj
      });
    }

    return populated;
  }
}

// Export singleton instance for app-wide import consistency
const auditLogServiceInstance = new AuditLogService();
export default auditLogServiceInstance;
export { AuditLogService };
