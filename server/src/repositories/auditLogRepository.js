import AuditLog from '../models/AuditLog.js';

class AuditLogRepository {
  constructor(auditModel = AuditLog) {
    this.model = auditModel;
  }

  async create(logData) {
    const log = new this.model(logData);
    return log.save();
  }

  async findByUserId(userId) {
    return this.model.find({ userId }).sort({ createdAt: -1 });
  }

  async listAllLogs(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    return this.model.find(query).sort({ createdAt: -1 });
  }
}

export default AuditLogRepository;
export { AuditLogRepository };
