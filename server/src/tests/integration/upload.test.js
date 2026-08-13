import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../../models/User.js';
import File from '../../models/File.js';

const uploadDir = path.resolve(process.cwd(), 'uploads_temp');

describe('Upload Pipeline Integration Tests', () => {
  let mongoServer;
  let app;
  let server;
  let token;
  let userId;
  const testFiles = [];

  // Helper to create mock local test files
  const createTestFile = (filename, contentBuffer) => {
    const filePath = path.resolve(process.cwd(), filename);
    fs.writeFileSync(filePath, contentBuffer);
    testFiles.push(filePath);
    return filePath;
  };

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'a_very_long_test_secret_key_at_least_32_characters';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-db';
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

    // Dynamically import createApp
    const appModule = await import('../../app.js');
    const createApp = appModule.default;

    // Dynamically import worker to wire mock queue execution
    await import('../../workers/fileWorker.js');
    await import('../../workers/notificationWorker.js');

    app = await createApp();
    server = app.listen(0);

    // Seed test user
    userId = uuidv4();
    const user = new User({
      userId,
      fullName: 'Tester Person',
      email: 'tester@example.com',
      passwordHash: 'hashed_password_dummy',
    });
    await user.save();

    // Create JWT Token
    token = jwt.sign(
      { sub: userId, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    // Stop server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Disconnect Mongoose
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    // Clean up created files
    for (const file of testFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (err) {
        // Ignore locking errors on Windows
      }
    }
    // Clean up temporary upload directory contents
    if (fs.existsSync(uploadDir)) {
      try {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      } catch (err) {
        // Ignore locking errors on Windows
      }
    }
  });

  describe('TUS Protocol Authentication', () => {
    it('should block upload initialization if Authorization header is missing', async () => {
      const metadata = Buffer.from('filename dGVzdC50eHQ=,filetype dGV4dC9wbGFpbg=='); // test.txt / text/plain
      
      const res = await request(app)
        .post('/api/v1/uploads')
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Length', '12')
        .set('Upload-Metadata', metadata.toString())
        .send();

      expect(res.status).to.equal(401);
    });
  });

  describe('Upload validation & Creation Flow', () => {
    it('should successfully initialize, patch, and complete a valid text file upload', async () => {
      const fileContent = Buffer.from('Hello World!');
      const filenameBase64 = Buffer.from('test_doc.txt').toString('base64');
      const filetypeBase64 = Buffer.from('text/plain').toString('base64');
      const metadataStr = `filename ${filenameBase64},filetype ${filetypeBase64}`;

      // Step 1: POST to create upload session
      const postRes = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Length', fileContent.length.toString())
        .set('Upload-Metadata', metadataStr)
        .send();

      expect(postRes.status).to.equal(201);
      expect(postRes.headers).to.have.property('location');

      const uploadUrl = postRes.headers.location;
      // Extract the path suffix starting with /api/v1/uploads
      const uploadPath = uploadUrl.substring(uploadUrl.indexOf('/api/v1/uploads'));

      // Step 2: PATCH to upload file content
      const patchRes = await request(app)
        .patch(uploadPath)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .send(fileContent);

      expect(patchRes.status).to.equal(204);

      // Step 3: Verify record is created inside MongoDB with status: PROCESSING
      const uploadId = uploadPath.split('/').pop();
      const fileRecord = await File.findOne({ fileId: uploadId });
      
      expect(fileRecord).to.exist;
      expect(fileRecord.originalName).to.equal('test_doc.txt');
      expect(fileRecord.status).to.equal('PROCESSING');
      expect(fileRecord.fileSize).to.equal(fileContent.length);
    });

    it('should fail upload and clean up file if extension is blocked (.exe)', async () => {
      const fileContent = Buffer.from('MZ_executable_dummy_payload');
      const filenameBase64 = Buffer.from('malicious.exe').toString('base64');
      const filetypeBase64 = Buffer.from('application/octet-stream').toString('base64');
      const metadataStr = `filename ${filenameBase64},filetype ${filetypeBase64}`;

      // POST to create
      const postRes = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Length', fileContent.length.toString())
        .set('Upload-Metadata', metadataStr)
        .send();

      expect(postRes.status).to.equal(201);
      const uploadPath = postRes.headers.location.substring(postRes.headers.location.indexOf('/api/v1/uploads'));

      // PATCH file content
      const patchRes = await request(app)
        .patch(uploadPath)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .send(fileContent);

      // Tus server intercepts, fails hook validation, and returns 400
      expect(patchRes.status).to.equal(400);

      // Confirm file is deleted from temp store
      const uploadId = uploadPath.split('/').pop();
      const tempFilePath = path.join(uploadDir, uploadId);
      expect(fs.existsSync(tempFilePath)).to.be.false;

      // Confirm no active metadata record in DB
      const fileRecord = await File.findOne({ fileId: uploadId });
      expect(fileRecord).to.be.null;
    });

    it('should fail upload and clean up if magic bytes contain PE header (MZ) even with a masked extension (.txt)', async () => {
      // Magic bytes for EXE: MZ (0x4d, 0x5a)
      const peBuffer = Buffer.alloc(100);
      peBuffer[0] = 0x4d;
      peBuffer[1] = 0x5a;
      
      const filenameBase64 = Buffer.from('masked_pe.txt').toString('base64');
      const filetypeBase64 = Buffer.from('text/plain').toString('base64');
      const metadataStr = `filename ${filenameBase64},filetype ${filetypeBase64}`;

      // POST to create
      const postRes = await request(app)
        .post('/api/v1/uploads')
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Length', peBuffer.length.toString())
        .set('Upload-Metadata', metadataStr)
        .send();

      expect(postRes.status).to.equal(201);
      const uploadPath = postRes.headers.location.substring(postRes.headers.location.indexOf('/api/v1/uploads'));

      // PATCH file content
      const patchRes = await request(app)
        .patch(uploadPath)
        .set('Authorization', `Bearer ${token}`)
        .set('Tus-Resumable', '1.0.0')
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .send(peBuffer);

      // Should fail due to magic bytes validation
      expect(patchRes.status).to.equal(400);

      // Confirm temporary file is removed
      const uploadId = uploadPath.split('/').pop();
      const tempFilePath = path.join(uploadDir, uploadId);
      expect(fs.existsSync(tempFilePath)).to.be.false;

      // Confirm no active metadata record in DB
      const fileRecord = await File.findOne({ fileId: uploadId });
      expect(fileRecord).to.be.null;
    });
  });
});
