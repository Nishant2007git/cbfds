import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  deviceInfo: {
    userAgent: { type: String },
    os: { type: String },
    browser: { type: String }
  },
  ipAddress: {
    type: String
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true,
  collection: 'refreshTokens'
});

// Configure TTL index on expiresAt field
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
