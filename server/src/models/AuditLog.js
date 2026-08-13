import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'UPLOAD_FILE',
      'DOWNLOAD_FILE',
      'DELETE_FILE',
      'RESTORE_FILE',
      'PERMANENT_DELETE',
      'CREATE_SHARE',
      'REVOKE_SHARE'
    ]
  },
  fileId: {
    type: String,
    default: null,
    ref: 'File'
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'audit_logs'
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
export { auditLogSchema };
