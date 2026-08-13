import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a_very_long_test_secret_key_at_least_32_characters';

// Import Mongoose schemas
import User from '../../models/User.js';
import File from '../../models/File.js';
import Chunk from '../../models/Chunk.js';
import ShareLink from '../../models/ShareLink.js';

describe('Background Workers & Jobs Integration Tests', () => {
  let mongoServer;
  let fileRepo, chunkRepo, shareRepo;
  let userId;
  let cleanExpiredShares, sweepPendingDeletions, sweepTemporaryUploads;
  let fileProcessingQueue, notificationsQueue;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    const { connectDatabase } = await import('../../config/database.js');
    await connectDatabase();

    // Dynamically import workers to register mock listeners
    await import('../../workers/fileWorker.js');
    await import('../../workers/notificationWorker.js');
    const maintenanceModule = await import('../../workers/maintenanceWorker.js');

    cleanExpiredShares = maintenanceModule.cleanExpiredShares;
    sweepPendingDeletions = maintenanceModule.sweepPendingDeletions;
    sweepTemporaryUploads = maintenanceModule.sweepTemporaryUploads;

    // Dynamically import queues and repos after setting process.env
    const queueModule = await import('../../config/queue.js');
    fileProcessingQueue = queueModule.fileProcessingQueue;
    notificationsQueue = queueModule.notificationsQueue;

    const FileRepositoryModule = await import('../../repositories/fileRepository.js');
    const ChunkRepositoryModule = await import('../../repositories/chunkRepository.js');
    const ShareRepositoryModule = await import('../../repositories/shareRepository.js');

    fileRepo = new FileRepositoryModule.default();
    chunkRepo = new ChunkRepositoryModule.default();
    shareRepo = new ShareRepositoryModule.default();

    userId = uuidv4();
    const user = new User({
      userId,
      fullName: 'Jobs Tester',
      email: 'jobtester@example.com',
      passwordHash: 'dummy_hash'
    });
    await user.save();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('File Processing Queue', () => {
    it('should enqueue and asynchronously process file chunking jobs', async () => {
      // Create a dummy temp file to chunk
      const tempPath = path.resolve(process.cwd(), 'temp_jobs_test.bin');
      fs.writeFileSync(tempPath, Buffer.alloc(1024 * 1024 * 6)); // 6 MB file (2 chunks)

      const fileId = uuidv4();
      await fileRepo.create({
        fileId,
        ownerId: userId,
        originalName: 'temp_jobs_test.bin',
        sanitizedName: 'temp_jobs_test.bin',
        mimeType: 'application/octet-stream',
        extension: '.bin',
        fileSize: 1024 * 1024 * 6,
        status: 'PROCESSING',
        storageProvider: 'MOCK'
      });

      // Enqueue job
      await fileProcessingQueue.add('chunk-file', {
        fileId,
        tempFilePath: tempPath,
        userId
      });

      // Poll until file status is ACTIVE
      let updatedFile = null;
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        updatedFile = await fileRepo.findById(fileId);
        if (updatedFile && updatedFile.status === 'ACTIVE') {
          break;
        }
      }

      expect(updatedFile).to.not.be.null;
      expect(updatedFile.status).to.equal('ACTIVE');

      // Assert chunks are recorded in DB
      const chunks = await chunkRepo.findByFileId(fileId);
      expect(chunks).to.have.lengthOf(2);
      expect(chunks[0].chunkNumber).to.equal(0);
      expect(chunks[1].chunkNumber).to.equal(1);

      // Clean up temp file (should already be deleted by ChunkingService, but check exists first)
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {
          // Swallow EBUSY locks on Windows
        }
      }
    });
  });

  describe('Maintenance Queue', () => {
    it('should revoke expired share links and limit exceeded links', async () => {
      const fileId = uuidv4();
      
      // Share 1: Expired
      const expiredShare = await shareRepo.create({
        shareId: uuidv4(),
        fileId,
        creatorId: userId,
        type: 'INTERNAL',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        isRevoked: false
      });

      // Share 2: Exceeded limit
      const exceededShare = await shareRepo.create({
        shareId: uuidv4(),
        fileId,
        creatorId: userId,
        type: 'INTERNAL',
        downloadLimit: 5,
        downloadCount: 5,
        isRevoked: false
      });

      // Share 3: Active
      const activeShare = await shareRepo.create({
        shareId: uuidv4(),
        fileId,
        creatorId: userId,
        type: 'INTERNAL',
        downloadLimit: 5,
        downloadCount: 2,
        isRevoked: false
      });

      // Trigger cleanup
      await cleanExpiredShares();

      const updatedExpired = await shareRepo.findById(expiredShare.shareId);
      const updatedExceeded = await shareRepo.findById(exceededShare.shareId);
      const updatedActive = await shareRepo.findById(activeShare.shareId);

      expect(updatedExpired.isRevoked).to.be.true;
      expect(updatedExceeded.isRevoked).to.be.true;
      expect(updatedActive.isRevoked).to.be.false;
    });

    it('should sweep pending deletions, physically deleting segments', async () => {
      const fileId = uuidv4();
      
      // Create active chunks
      await fileRepo.create({
        fileId,
        ownerId: userId,
        originalName: 'delete_test.bin',
        sanitizedName: 'delete_test.bin',
        mimeType: 'application/octet-stream',
        extension: '.bin',
        fileSize: 1024,
        status: 'PENDING_DELETION',
        storageProvider: 'MOCK'
      });

      await chunkRepo.create({
        chunkId: uuidv4(),
        fileId,
        chunkNumber: 0,
        chunkSize: 1024,
        checksum: 'dummy_sig',
        storageBucket: 'cbfds-chunks',
        storageKey: `${fileId}_chunk_0000`
      });

      // Mock chunk exists in MockStorageProvider
      const StorageFactory = (await import('../../providers/storage/storageFactory.js')).default;
      const storage = await StorageFactory.create();
      await storage.putObject('cbfds-chunks', `${fileId}_chunk_0000`, Buffer.from('hello'));

      // Run deletion sweep
      await sweepPendingDeletions();

      // Check DB
      const updatedFile = await fileRepo.findById(fileId);
      expect(updatedFile.status).to.equal('DELETED');

      const chunkDocs = await chunkRepo.findByFileId(fileId);
      expect(chunkDocs).to.have.lengthOf(0);

      // Check physical storage
      const exists = await storage.objectExists('cbfds-chunks', `${fileId}_chunk_0000`);
      expect(exists).to.be.false;
    });
  });

  describe('Notifications Queue', () => {
    it('should process notification delivery jobs', async () => {
      // Add job
      await notificationsQueue.add('send-email', {
        to: 'hello@example.com',
        subject: 'Notification Job Test',
        htmlBody: '<p>Test email body</p>'
      });

      // Wait a tick for mock queue processing to complete
      await new Promise(resolve => setImmediate(resolve));
      // Passed if worker runs without throwing errors
    });
  });
});
