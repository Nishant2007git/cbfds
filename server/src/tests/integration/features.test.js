import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Environment parameters setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a_very_long_test_secret_key_at_least_32_characters';

// Models
import User from '../../models/User.js';
import File from '../../models/File.js';
import Chunk from '../../models/Chunk.js';
import ShareLink from '../../models/ShareLink.js';

describe('Admin, Quota, & Sharing Integration Tests', () => {
  let mongoServer;
  let app;
  let server;
  
  let userToken, adminToken;
  let userId, adminId;
  let fileRepo, chunkRepo, shareRepo, userRepo;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // Dynamically load database connection
    const { connectDatabase } = await import('../../config/database.js');
    await connectDatabase();

    // Dynamically load repositories
    const FileRepositoryModule = await import('../../repositories/fileRepository.js');
    const ChunkRepositoryModule = await import('../../repositories/chunkRepository.js');
    const ShareRepositoryModule = await import('../../repositories/shareRepository.js');
    const UserRepositoryModule = await import('../../repositories/userRepository.js');

    fileRepo = new FileRepositoryModule.default();
    chunkRepo = new ChunkRepositoryModule.default();
    shareRepo = new ShareRepositoryModule.default();
    userRepo = new UserRepositoryModule.default();

    // Dynamically load app
    const appModule = await import('../../app.js');
    const createApp = appModule.default;

    // Dynamically import workers to register mocks
    await import('../../workers/fileWorker.js');
    await import('../../workers/notificationWorker.js');
    await import('../../workers/maintenanceWorker.js');

    app = await createApp();
    server = app.listen(0);

    // Seed Standard User
    userId = uuidv4();
    const user = new User({
      userId,
      fullName: 'Standard User',
      email: 'user@example.com',
      passwordHash: 'dummy_hash',
      role: 'user',
      storageQuota: 1000, // 1000 bytes limit
      storageUsed: 0
    });
    await user.save();

    // Seed Admin User
    adminId = uuidv4();
    const admin = new User({
      userId: adminId,
      fullName: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'dummy_hash',
      role: 'admin',
      storageQuota: 1000000,
      storageUsed: 0
    });
    await admin.save();

    // Create Tokens
    userToken = jwt.sign({ sub: userId, email: user.email, role: 'user' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ sub: adminId, email: admin.email, role: 'admin' }, process.env.JWT_SECRET);
  });

  after(async () => {
    await server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Quota Enforcement Middleware', () => {
    it('should block upload initialization (POST) if the file size exceeds quota', async () => {
      const res = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Length', '2000') // Exceeds 1000 bytes limit!
        .set('Upload-Metadata', 'filename dGVzdC50eHQ=')
        .send();

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error.code).to.equal('QUOTA_EXCEEDED');
    });

    it('should allow upload initialization if file size fits within quota space', async () => {
      const res = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Length', '500') // Fits within limit
        .set('Upload-Metadata', 'filename dGVzdC50eHQ=')
        .send();

      // Tus-server returns 201 Created on success
      expect(res.status).to.equal(201);
    });
  });

  describe('RBAC Authorization Middleware', () => {
    it('should reject access to admin routes for standard users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(res.status).to.equal(403);
      expect(res.body.error.code).to.equal('AUTH_UNAUTHORIZED');
    });

    it('should allow access to admin routes for admin users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.items).to.be.an('array');
    });

    it('should allow admin to update user quota limits', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/users/${userId}/quota`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ storageQuota: 50000 });

      expect(res.status).to.equal(200);
      expect(res.body.data.storageQuota).to.equal(50000);

      // Verify DB change
      const updatedUser = await userRepo.findById(userId);
      expect(updatedUser.storageQuota).to.equal(50000);
    });
  });

  describe('Shared Link Workflow Lifecycles', () => {
    let fileId;
    let shareId;
    const testContent = Buffer.from('hello shared file contents');

    before(async () => {
      fileId = uuidv4();
      // Seed file
      await fileRepo.create({
        fileId,
        ownerId: userId,
        originalName: 'shared_document.txt',
        sanitizedName: 'shared_document.txt',
        mimeType: 'text/plain',
        extension: '.txt',
        fileSize: testContent.length,
        status: 'ACTIVE',
        storageProvider: 'MOCK'
      });

      // Seed chunks in DB and Storage
      const checksumVal = crypto.createHash('sha256').update(testContent).digest('hex');
      await chunkRepo.create({
        chunkId: uuidv4(),
        fileId,
        chunkNumber: 0,
        chunkSize: testContent.length,
        checksum: checksumVal,
        storageBucket: 'cbfds-chunks',
        storageKey: `${userId}/${fileId}/chunks/_chunk_0000`
      });

      const StorageFactory = (await import('../../providers/storage/storageFactory.js')).default;
      const storage = await StorageFactory.create();
      await storage.putObject('cbfds-chunks', `${userId}/${fileId}/chunks/_chunk_0000`, testContent);
    });

    it('should create an external shared link with password protection', async () => {
      const res = await request(app)
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fileId,
          shareType: 'EXTERNAL',
          password: 'secure_password123',
          downloadLimit: 3
        });

      expect(res.status).to.equal(201);
      expect(res.body.data.shareId).to.exist;
      expect(res.body.data.downloadUrl).to.exist;
      shareId = res.body.data.shareId;
    });

    it('should retrieve public metadata context of the link without requiring auth', async () => {
      const res = await request(app)
        .get(`/api/v1/share/${shareId}`)
        .send();

      expect(res.status).to.equal(200);
      expect(res.body.data.fileName).to.equal('shared_document.txt');
      expect(res.body.data.passwordRequired).to.be.true;
    });

    it('should reject public download attempts on password protected links without verification tokens', async () => {
      const res = await request(app)
        .get(`/api/v1/share/${shareId}/download`)
        .send();

      expect(res.status).to.equal(401);
      expect(res.body.error.code).to.equal('SESSION_TOKEN_REQUIRED');
    });

    it('should issue a verification session token on correct password submission', async () => {
      // Try wrong password
      let res = await request(app)
        .post(`/api/v1/share/${shareId}/verify`)
        .send({ password: 'wrong_password' });

      expect(res.status).to.equal(401);
      expect(res.body.error.code).to.equal('INVALID_PASSWORD');

      // Try correct password
      res = await request(app)
        .post(`/api/v1/share/${shareId}/verify`)
        .send({ password: 'secure_password123' });

      expect(res.status).to.equal(200);
      expect(res.body.data.sessionToken).to.exist;

      // Download using verification sessionToken
      const downloadRes = await request(app)
        .get(`/api/v1/share/${shareId}/download`)
        .query({ sessionToken: res.body.data.sessionToken })
        .send();

      expect(downloadRes.status).to.equal(200);
      expect(downloadRes.text).to.equal('hello shared file contents');

      // Verify downloadCount incremented in DB
      const shareDoc = await shareRepo.findById(shareId);
      expect(shareDoc.downloadCount).to.equal(1);
    });
  });
});
