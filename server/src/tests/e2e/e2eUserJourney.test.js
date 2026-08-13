process.env.NODE_ENV = 'test';

import { expect } from 'chai';
import supertest from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import createApp from '../../app.js';
import { connectDatabase } from '../../config/database.js';
import env from '../../config/env.js';
import User from '../../models/User.js';
import File from '../../models/File.js';
import Chunk from '../../models/Chunk.js';

describe('Sprint 6: Full System End-to-End (E2E) User Journey Suite', function () {
  this.timeout(30000);

  let mongoServer;
  let app;
  let request;

  let userAccessToken;
  let userRefreshToken;
  let userId;

  let adminAccessToken;

  let testFileId;
  let testShareId;
  let testSessionToken;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    await connectDatabase();
    app = await createApp();
    request = supertest(app);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('1. User Registration & Security Audit', () => {
    it('should reject registration if password fails complexity rules', async () => {
      const res = await request
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Weak Password User',
          email: 'weak@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should successfully register a standard user with valid credentials', async () => {
      const res = await request
        .post('/api/v1/auth/register')
        .send({
          fullName: 'E2E User',
          email: 'e2e_user@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('email', 'e2e_user@example.com');
      expect(res.body.data).to.not.have.property('passwordHash');

      userId = res.body.data.userId;
    });

    it('should reject registration if email is already taken', async () => {
      const res = await request
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate User',
          email: 'e2e_user@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).to.equal(409);
      expect(res.body.error.code).to.equal('AUTH_EMAIL_EXISTS');
    });
  });

  describe('2. Authentication, Login & Refresh Token Rotations', () => {
    it('should fail login with wrong password', async () => {
      const res = await request
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e_user@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).to.equal(401);
      expect(res.body.error.code).to.equal('AUTH_INVALID_CREDENTIALS');
    });

    it('should successfully log in and return accessToken and refreshToken', async () => {
      const res = await request
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e_user@example.com',
          password: 'Password123!'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.user).to.have.property('email', 'e2e_user@example.com');

      userAccessToken = res.body.data.accessToken;
      userRefreshToken = res.body.data.refreshToken;
      expect(userAccessToken).to.exist;
      expect(userRefreshToken).to.exist;
    });

    it('should fetch profile details via /auth/profile with Bearer token', async () => {
      const res = await request
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.email).to.equal('e2e_user@example.com');
    });

    it('should fetch profile details via /auth/me alias route', async () => {
      const res = await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.email).to.equal('e2e_user@example.com');
    });

    it('should rotate tokens via /auth/refresh', async () => {
      const res = await request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: userRefreshToken });

      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.property('accessToken');
      userAccessToken = res.body.data.accessToken;
    });
  });

  describe('3. File Storage & Metadata Management', () => {
    it('should register a completed file and chunk in DB matching schema', async () => {
      const fileData = 'Hello E2E Integration Test Content!';
      const checksum = crypto.createHash('sha256').update(fileData).digest('hex');

      const fileDoc = await File.create({
        fileId: `file-e2e-${Date.now()}`,
        ownerId: userId,
        originalName: 'test_document.txt',
        sanitizedName: 'test_document.txt',
        mimeType: 'text/plain',
        extension: 'txt',
        fileSize: Buffer.byteLength(fileData),
        fileHash: checksum,
        totalChunks: 1,
        chunkSize: 5242880,
        status: 'ACTIVE',
        storageProvider: 'local'
      });

      testFileId = fileDoc.fileId;

      await Chunk.create({
        chunkId: `chunk-e2e-${Date.now()}`,
        fileId: testFileId,
        chunkNumber: 0,
        chunkSize: Buffer.byteLength(fileData),
        checksum: checksum,
        storageKey: `${userId}/${testFileId}/chunks/00000000`,
        storageBucket: 'cbfds-chunks',
        status: 'STORED'
      });

      // Write mock chunk content to MockStorageProvider so download test resolves successfully
      const StorageFactory = (await import('../../providers/storage/storageFactory.js')).default;
      const storageProvider = await StorageFactory.create();
      await storageProvider.putObject('cbfds-chunks', `${userId}/${testFileId}/chunks/00000000`, fileData);

      await User.updateOne(
        { userId: userId },
        { $inc: { storageUsed: Buffer.byteLength(fileData) } }
      );
    });

    it('should verify file document exists in database', async () => {
      const file = await File.findOne({ fileId: testFileId });
      expect(file).to.exist;
      expect(file.originalName).to.equal('test_document.txt');
    });

    it('should list files via GET /files', async () => {
      const res = await request
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.items).to.be.an('array');
      expect(res.body.data.items[0].fileId).to.equal(testFileId);
    });

    it('should download file via GET /files/:fileId/download', async () => {
      const res = await request
        .get(`/api/v1/files/${testFileId}/download`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).to.equal(200);
      expect(res.text).to.equal('Hello E2E Integration Test Content!');
    });

    it('should delete a file via DELETE /files/:fileId', async () => {
      // Create a temporary file to delete so we do not affect subsequent share tests on testFileId
      const tempFileId = `temp-file-e2e-${Date.now()}`;
      await File.create({
        fileId: tempFileId,
        ownerId: userId,
        originalName: 'temp.txt',
        sanitizedName: 'temp.txt',
        mimeType: 'text/plain',
        extension: 'txt',
        fileSize: 10,
        status: 'ACTIVE',
        storageProvider: 'local'
      });

      const deleteRes = await request
        .delete(`/api/v1/files/${tempFileId}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(deleteRes.status).to.equal(200);
      expect(deleteRes.body.success).to.be.true;

      const file = await File.findOne({ fileId: tempFileId });
      expect(file.status).to.equal('DELETED');
    });
  });

  describe('4. Link Sharing & Public Download Verification', () => {
    it('should create a password-protected share link for the file', async () => {
      const res = await request
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          fileId: testFileId,
          shareType: 'EXTERNAL',
          password: 'SharePassword123!',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('shareId');
      expect(res.body.data).to.have.property('downloadUrl');

      testShareId = res.body.data.shareId;
    });

    it('should require password verification for public share context', async () => {
      const res = await request
        .get(`/api/v1/share/${testShareId}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.passwordRequired).to.be.true;
    });

    it('should resolve public link with valid password and return session token', async () => {
      const res = await request
        .post(`/api/v1/share/${testShareId}/verify`)
        .send({
          password: 'SharePassword123!'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.property('sessionToken');

      testSessionToken = res.body.data.sessionToken;
    });
  });

  describe('5. Admin Operations & RBAC Protection Audit', () => {
    it('should reject non-admin user accessing /admin endpoints', async () => {
      const res = await request
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).to.equal(403);
      expect(res.body.error.code).to.equal('AUTH_UNAUTHORIZED');
    });

    it('should allow admin user with admin JWT to access admin endpoints', async () => {
      const adminId = `admin-e2e-${Date.now()}`;
      await User.create({
        userId: adminId,
        fullName: 'E2E Admin User',
        email: `admin_${Date.now()}@example.com`,
        passwordHash: 'hashed_password_val',
        role: 'admin'
      });

      adminAccessToken = jwt.sign(
        { sub: adminId, role: 'admin' },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const adminListRes = await request
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(adminListRes.status).to.equal(200);
      expect(adminListRes.body.data.items).to.be.an('array');
      expect(adminListRes.body.data.items.length).to.be.at.least(2);
    });

    it('should allow admin to override standard user storage quota', async () => {
      const newQuota = 53687091200; // 50 GB
      const res = await request
        .put(`/api/v1/admin/users/${userId}/quota`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          storageQuota: newQuota
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.storageQuota).to.equal(newQuota);
    });
  });
});
