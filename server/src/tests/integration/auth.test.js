import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../models/User.js';
import RefreshToken from '../../models/RefreshToken.js';
import Otp from '../../models/Otp.js';

describe('Authentication Integration Tests', () => {
  let mongoServer;
  let app;
  let server;

  // Global Setup before all tests
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'a_very_long_test_secret_key_at_least_32_characters';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-db'; // overridden by memory server
    process.env.APP_URL = 'http://localhost:3000';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    process.env.MINIO_ACCESS_KEY = 'test';
    process.env.MINIO_SECRET_KEY = 'test';
    process.env.SMTP_USER = 'test';
    process.env.SMTP_PASS = 'test';

    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;

    // Dynamically import createApp so env.js reads the updated process.env.MONGODB_URI
    const appModule = await import('../../app.js');
    const createApp = appModule.default;

    // Dynamically import worker to wire mock queue execution
    await import('../../workers/notificationWorker.js');

    // Build Express Application Instance
    app = await createApp();
    server = app.listen(0); // Random free port
  });

  // Global Teardown after all tests
  after(async () => {
    await server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear database collections between test cases
  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully with valid inputs', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('userId');
      expect(res.body.data.email).to.equal('john@example.com');

      // Verify DB persistence
      const user = await User.findOne({ email: 'john@example.com' });
      expect(user).to.exist;
      expect(user.fullName).to.equal('John Doe');
      expect(user.passwordHash).to.not.equal('Password123!'); // Verify bcrypt hashing
    });

    it('should fail registration if passwords mismatch', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Mismatch123!'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should fail registration if password violates complexity rules', async () => {
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'plain',
          confirmPassword: 'plain'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should prevent registering duplicate email addresses', async () => {
      // Setup existing user
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      // Try duplicate registration
      const res = await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate User',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).to.equal(409);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.equal('AUTH_EMAIL_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register standard user
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });
    });

    it('should login successfully and return access and refresh tokens', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!',
          deviceInfo: { browser: 'Chrome', os: 'Windows' }
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('accessToken');
      expect(res.body.data).to.have.property('refreshToken');
      expect(res.body.data.user.email).to.equal('john@example.com');

      // Verify session token hash stored in DB
      const tokensCount = await RefreshToken.countDocuments();
      expect(tokensCount).to.equal(1);
    });

    it('should fail login if password is incorrect', async () => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword!'
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });

    it('should lock user out temporarily after 5 consecutive failures', async () => {
      const loginPayload = {
        email: 'john@example.com',
        password: 'WrongPassword!'
      };

      // Execute 5 consecutive failed logins
      for (let i = 0; i < 5; i++) {
        await request(server).post('/api/v1/auth/login').send(loginPayload);
      }

      // Check account lockout status in DB
      const user = await User.findOne({ email: 'john@example.com' });
      expect(user.lockUntil).to.exist;
      expect(user.lockUntil).to.be.greaterThan(new Date());

      // Attempt 6th login
      const res = await request(server).post('/api/v1/auth/login').send(loginPayload);
      expect(res.status).to.equal(401); // Authentication locks yield standard 401
      expect(res.body.error.code).to.equal('AUTH_ACCOUNT_LOCKED');
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!'
        });
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should rotate access and refresh tokens successfully', async () => {
      const res = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('accessToken');
      expect(res.body.data).to.have.property('refreshToken');
      expect(res.body.data.refreshToken).to.not.equal(refreshToken); // Rotation check
    });

    it('should revoke all user sessions if an invalidated token is reused (theft detection)', async () => {
      // Perform initial refresh
      const firstRefresh = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      
      const newRefreshToken = firstRefresh.body.data.refreshToken;

      // Attempt second refresh using the now-revoked original token
      const res = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).to.equal(401);
      expect(res.body.error.code).to.equal('AUTH_REFRESH_REVOKED');

      // Verify that all active tokens for this user are now revoked/cleaned up
      const activeSessionsCount = await RefreshToken.countDocuments({ isRevoked: false });
      expect(activeSessionsCount).to.equal(0);
    });
  });

  describe('POST /auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!'
        });
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should invalidate refresh token upon logout', async () => {
      const res = await request(server)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(res.status).to.equal(200);

      // Verify refresh is invalid
      const refreshRes = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshRes.status).to.equal(401);
    });
  });

  describe('Password Reset OTP Flow', () => {
    beforeEach(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });
    });

    it('should process forgot-password trigger, verify OTP, and reset password', async () => {
      // 1. Trigger forgot password
      await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'john@example.com' });

      // 2. Fetch generated OTP from memory DB
      const otpDoc = await Otp.findOne({ email: 'john@example.com' });
      expect(otpDoc).to.exist;

      // In tests, we cheat to bypass hashing to verify OTP validation logic
      // Since it's stored hashed, we simulate the verify request:
      // Note: Since OTP is generated randomly in the service, we can stub Math.random or just verify OTP record created.
      // Let's create an OTP manually in DB for exact matching tests:
      const testOtp = '123456';
      const crypto = await import('crypto');
      const testOtpHash = crypto.createHash('sha256').update(testOtp).digest('hex');
      otpDoc.otpHash = testOtpHash;
      await otpDoc.save();

      // 3. Reset Password
      const resetRes = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'john@example.com',
          otp: testOtp,
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!'
        });

      expect(resetRes.status).to.equal(200);

      // 4. Try logging in with new credentials
      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'john@example.com',
          password: 'NewPassword123!'
        });
      expect(loginRes.status).to.equal(200);
      expect(loginRes.body.data).to.have.property('accessToken');
    });
  });
});
