import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../utils/errors.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';

class AuthService {
  constructor(userRepository, refreshTokenRepository, otpRepository) {
    this.userRepo = userRepository;
    this.tokenRepo = refreshTokenRepository;
    this.otpRepo = otpRepository;
  }

  // Generate SHA-256 hash of a string
  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Generate JWT Access Token
  _generateAccessToken(userId, role) {
    return jwt.sign(
      { sub: userId, role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );
  }

  // Generate Opaque Refresh Token
  _generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // User Registration
  async register(fullName, email, password, confirmPassword) {
    if (password !== confirmPassword) {
      throw new ValidationError('Passwords do not match.');
    }

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email is already registered.', 'AUTH_EMAIL_EXISTS');
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new ValidationError(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.'
      );
    }

    // Default quota assigned at database schema layer
    const newUser = await this.userRepo.create({
      fullName,
      email,
      passwordHash: password, // will be hashed automatically by user pre-save hook
    });

    logger.info(`User registered successfully: ${newUser.email}`);
    
    // Asynchronous welcome email
    emailService.sendWelcome(newUser.email, newUser.fullName).catch((err) => {
      logger.error(`Failed to send welcome email to: ${newUser.email}`, err);
    });

    return {
      userId: newUser.userId,
      email: newUser.email,
      fullName: newUser.fullName,
    };
  }

  // User Login
  async login(email, password, deviceInfo = {}, ipAddress = '') {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password.');
    }

    // Lockout verification — admin and superadmin roles are exempt
    const isPrivilegedRole = user.role === 'admin' || user.role === 'superadmin';
    if (!isPrivilegedRole && user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
      throw new AuthenticationError(
        `Account is locked. Please try again in ${remainingTime} minutes.`,
        'AUTH_ACCOUNT_LOCKED'
      );
    }

    // If a privileged account was previously locked, clear the lock immediately
    if (isPrivilegedRole && user.lockUntil) {
      await this.userRepo.resetFailedAttempts(user.userId);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Handle lockout calculations — only lock non-privileged users
      if (!isPrivilegedRole) {
        const attempts = user.failedLoginAttempts + 1;
        let lockUntil = null;
        if (attempts >= 5) {
          lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
          logger.warn(`Account locked due to excessive failed logins: ${user.email}`);
        }
        await this.userRepo.incrementFailedAttempts(user.userId, lockUntil);
      }
      throw new AuthenticationError('Invalid email or password.');
    }

    // Reset attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.userRepo.resetFailedAttempts(user.userId);
    }

    // Generate tokens
    const accessToken = this._generateAccessToken(user.userId, user.role);
    const rawRefreshToken = this._generateRefreshToken();
    const tokenHash = this._hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.tokenRepo.create({
      tokenHash,
      userId: user.userId,
      deviceInfo,
      ipAddress,
      expiresAt,
    });

    // Device tracking and notification triggers
    const deviceRegistered = user.knownDevices.some(
      (d) => d.userAgent === deviceInfo.userAgent && d.ipAddress === ipAddress
    );

    if (!deviceRegistered && user.knownDevices.length > 0) {
      // Trigger new device notification
      if (user.notificationPrefs.emailOnNewDevice) {
        emailService.sendNewDeviceLogin(user.email, deviceInfo, ipAddress).catch((err) => {
          logger.error(`Failed to send new device notification to: ${user.email}`, err);
        });
      }
    }

    // Update user's known devices list
    const updatedDevices = [...user.knownDevices];
    if (!deviceRegistered) {
      updatedDevices.push({
        userAgent: deviceInfo.userAgent,
        ipAddress,
        lastLoginAt: new Date(),
      });
      await this.userRepo.update(user.userId, { knownDevices: updatedDevices });
    }

    logger.info(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 mins
      user: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        storageUsed: user.storageUsed,
        storageQuota: user.storageQuota,
      },
    };
  }

  // Refresh Token Rotation
  async refresh(refreshToken, deviceInfo = {}, ipAddress = '') {
    const tokenHash = this._hashToken(refreshToken);
    const tokenDoc = await this.tokenRepo.findByHash(tokenHash);

    if (!tokenDoc) {
      throw new AuthenticationError('Refresh token is invalid or expired.', 'AUTH_REFRESH_INVALID');
    }

    // Theft detection: reuse of a revoked token
    if (tokenDoc.isRevoked) {
      logger.warn(`Revoked refresh token reuse detected! Revoking all sessions for user: ${tokenDoc.userId}`);
      await this.tokenRepo.revokeAllByUserId(tokenDoc.userId);
      throw new AuthenticationError('Session hijacked. Please log in again.', 'AUTH_REFRESH_REVOKED');
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new AuthenticationError('Refresh token has expired. Please log in again.', 'AUTH_REFRESH_EXPIRED');
    }

    // Look up user
    const user = await this.userRepo.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User account is suspended or deleted.', 'AUTH_UNAUTHORIZED');
    }

    // Rotate tokens
    const newAccessToken = this._generateAccessToken(user.userId, user.role);
    const newRawRefreshToken = this._generateRefreshToken();
    const newHash = this._hashToken(newRawRefreshToken);

    // Invalidate old token and write new token
    await this.tokenRepo.revokeByHash(tokenHash);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.tokenRepo.create({
      tokenHash: newHash,
      userId: user.userId,
      deviceInfo,
      ipAddress,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 900,
    };
  }

  // User Logout
  async logout(refreshToken) {
    const tokenHash = this._hashToken(refreshToken);
    const tokenDoc = await this.tokenRepo.findByHash(tokenHash);
    if (tokenDoc) {
      await this.tokenRepo.revokeByHash(tokenHash);
      logger.info(`User session logged out: ${tokenDoc.userId}`);
    }
    return true;
  }

  // Logout All Devices
  async logoutAll(userId) {
    await this.tokenRepo.revokeAllByUserId(userId);
    logger.info(`All user sessions logged out for user: ${userId}`);
    return true;
  }

  // Forgot Password (OTP trigger)
  async forgotPassword(email) {
    const user = await this.userRepo.findByEmail(email);
    // Generic response returned regardless of user existence to prevent email discovery attacks
    if (!user) {
      logger.info(`Forgot password request for unregistered email: ${email}`);
      return true;
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this._hashToken(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.otpRepo.upsertOtp(user.email, otpHash, expiresAt);

    logger.info(`OTP generated for user: ${user.email}`);

    emailService.sendOtp(user.email, otp).catch((err) => {
      logger.error(`Failed to send OTP email to: ${user.email}`, err);
    });

    return true;
  }

  // Reset Password using OTP
  async resetPassword(email, otp, newPassword, confirmNewPassword) {
    if (newPassword !== confirmNewPassword) {
      throw new ValidationError('Passwords do not match.');
    }

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const otpDoc = await this.otpRepo.findByEmail(email);
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      throw new ValidationError('OTP has expired or is invalid.', 'AUTH_OTP_EXPIRED');
    }

    // Verify OTP attempts
    if (otpDoc.attempts >= 5) {
      await this.otpRepo.deleteByEmail(email);
      throw new ValidationError('Too many incorrect attempts. Please request a new OTP.', 'AUTH_OTP_INVALID');
    }

    const otpHash = this._hashToken(otp);
    if (otpDoc.otpHash !== otpHash) {
      await this.otpRepo.incrementAttempts(email);
      throw new ValidationError('Invalid OTP code.', 'AUTH_OTP_INVALID');
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new ValidationError(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.'
      );
    }

    // Password history check
    for (const historicHash of user.passwordHistory) {
      const isDuplicate = await bcrypt.compare(newPassword, historicHash);
      if (isDuplicate) {
        throw new ValidationError(
          'Password cannot match any of your last 3 passwords.',
          'AUTH_WEAK_PASSWORD'
        );
      }
    }

    // Update password (hashes automatically via pre-save hook)
    user.passwordHash = newPassword;
    await user.save();

    // Revoke active login sessions
    await this.tokenRepo.revokeAllByUserId(user.userId);
    // Remove OTP record
    await this.otpRepo.deleteByEmail(email);

    logger.info(`Password reset completed successfully for user: ${user.email}`);
    return true;
  }

  // Retrieve own user details
  async getProfile(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      storageUsed: user.storageUsed,
      storageQuota: user.storageQuota,
    };
  }

  // Authenticated Change Password
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ValidationError('Current password is incorrect.', 'AUTH_INVALID_CREDENTIALS');
    }

    // Password history validation
    for (const historicHash of user.passwordHistory) {
      const isDuplicate = await bcrypt.compare(newPassword, historicHash);
      if (isDuplicate) {
        throw new ValidationError(
          'Password cannot match any of your last 3 passwords.',
          'AUTH_WEAK_PASSWORD'
        );
      }
    }

    user.passwordHash = newPassword; // handles hashing & history append via pre-save hook
    await user.save();

    // Revoke other device sessions
    await this.tokenRepo.revokeAllByUserId(userId);
    return true;
  }
}

export default AuthService;
export { AuthService };
