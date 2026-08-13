import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const shareLinkSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  fileId: {
    type: String,
    required: true,
    ref: 'File'
  },
  creatorId: {
    type: String,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['INTERNAL', 'EXTERNAL'],
    required: true
  },
  recipientEmail: {
    type: String, // Required for INTERNAL shares to track target
    default: null,
    trim: true,
    lowercase: true
  },
  accessKeyHash: {
    type: String, // bcrypt hash of sharing password/OTP if external
    default: null
  },
  expiresAt: {
    type: Date,
    default: null // null represents infinite lifetime unless manually revoked
  },
  downloadLimit: {
    type: Number,
    default: null // null represents unlimited downloads
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  selfDestruct: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'shares'
});

// Virtual: Check if share is expired
shareLinkSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt.getTime();
});

// Virtual: Check if download limit is exceeded
shareLinkSchema.virtual('isLimitExceeded').get(function() {
  if (this.downloadLimit === null) return false;
  return this.downloadCount >= this.downloadLimit;
});

// Virtual: Check if share link is active (valid)
shareLinkSchema.virtual('isActive').get(function() {
  return !this.isRevoked && !this.isExpired && !this.isLimitExceeded;
});

const ShareLink = mongoose.model('ShareLink', shareLinkSchema);
export default ShareLink;
export { shareLinkSchema };
