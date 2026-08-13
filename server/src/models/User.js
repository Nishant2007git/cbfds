import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  passwordHash: {
    type: String,
    required: true
  },
  passwordHistory: {
    type: [String],
    default: []
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  storageQuota: {
    type: Number,
    required: true,
    default: 10737418240 // 10 GB in bytes
  },
  storageUsed: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  knownDevices: [{
    userAgent: { type: String },
    ipAddress: { type: String },
    lastLoginAt: { type: Date, default: Date.now }
  }],
  notificationPrefs: {
    emailOnShare: { type: Boolean, default: true },
    emailOnQuotaWarning: { type: Boolean, default: true },
    emailOnNewDevice: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  collection: 'users',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Field: storagePercentage
userSchema.virtual('storagePercentage').get(function() {
  return parseFloat(((this.storageUsed / this.storageQuota) * 100).toFixed(2));
});

// Pre-Save Hashing Hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    
    // Add to history
    if (this.passwordHistory.length >= 3) {
      this.passwordHistory.shift();
    }
    this.passwordHistory.push(this.passwordHash);
    
    next();
  } catch (err) {
    next(err);
  }
});

// Instance Method: comparePassword
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static Method: findActiveByEmail
userSchema.statics.findActiveByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

const User = mongoose.model('User', userSchema);
export default User;
export { userSchema };
