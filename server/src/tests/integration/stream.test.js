import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import User from '../../models/User.js';
import File from '../../models/File.js';
import Chunk from '../../models/Chunk.js';

describe('Download & Streaming Engine Integration Tests', () => {
  let mongoServer;
  let userId;
  let fileRepo, chunkRepo;
  let chunkingService, downloadService;
  let mockFileContent;
  let tempFilePath;

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

    // Start memory server
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    // Dynamically import worker to wire mock queue execution
    await import('../../workers/fileWorker.js');
    await import('../../workers/notificationWorker.js');

    // Dynamically load database connection
    const { connectDatabase } = await import('../../config/database.js');
    await connectDatabase();

    // Dynamically load Repositories and Services
    const { default: FileRepository } = await import('../../repositories/fileRepository.js');
    const { default: ChunkRepository } = await import('../../repositories/chunkRepository.js');
    const { default: ChunkingService } = await import('../../services/chunkingService.js');
    const { default: DownloadService } = await import('../../services/downloadService.js');

    fileRepo = new FileRepository();
    chunkRepo = new ChunkRepository();
    chunkingService = new ChunkingService(fileRepo, chunkRepo);
    downloadService = new DownloadService(fileRepo, chunkRepo);

    // Create seed user
    userId = uuidv4();
    const user = new User({
      userId,
      fullName: 'Streaming Tester',
      email: 'stream@example.com',
      passwordHash: 'hashed',
    });
    await user.save();

    // Create 12 MB of mock content (to span chunk 0, chunk 1, and chunk 2)
    // 5MB chunk size * 2 + 2MB extra = 12 MB
    mockFileContent = crypto.randomBytes(12 * 1024 * 1024);

    // Write to a temporary file
    tempFilePath = path.resolve(process.cwd(), 'temp_stream_test_file.bin');
    fs.writeFileSync(tempFilePath, mockFileContent);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  describe('Chunking & Storage Pipeline', () => {
    it('should split 12 MB file into three chunks, write metadata and clean up temp file', async () => {
      const fileId = uuidv4();
      
      // Seed initial metadata record
      await fileRepo.create({
        fileId,
        ownerId: userId,
        originalName: 'large_data.bin',
        sanitizedName: 'large_data.bin',
        mimeType: 'application/octet-stream',
        extension: '.bin',
        fileSize: mockFileContent.length,
        status: 'PROCESSING',
        storageProvider: 'minio'
      });

      // Execute Chunking & Upload
      const updatedFile = await chunkingService.chunkAndStore(fileId, tempFilePath, userId);

      expect(updatedFile.status).to.equal('ACTIVE');
      expect(updatedFile.totalChunks).to.equal(3); // 5MB + 5MB + 2MB = 3 chunks
      expect(updatedFile.fileHash).to.exist;

      // Verify chunks exists in DB
      const chunks = await chunkRepo.findByFileId(fileId);
      expect(chunks).to.have.lengthOf(3);
      expect(chunks[0].chunkNumber).to.equal(0);
      expect(chunks[0].chunkSize).to.equal(5 * 1024 * 1024);
      expect(chunks[1].chunkNumber).to.equal(1);
      expect(chunks[1].chunkSize).to.equal(5 * 1024 * 1024);
      expect(chunks[2].chunkNumber).to.equal(2);
      expect(chunks[2].chunkSize).to.equal(2 * 1024 * 1024);

      // Verify local file cleanup occurred
      expect(fs.existsSync(tempFilePath)).to.be.false;
    });
  });

  describe('File Reconstruction & Sequential Streaming', () => {
    let activeFileId;

    before(async () => {
      // Re-create the mock file on disk to seed another chunking run
      fs.writeFileSync(tempFilePath, mockFileContent);
      activeFileId = uuidv4();
      await fileRepo.create({
        fileId: activeFileId,
        ownerId: userId,
        originalName: 'active_movie.mp4',
        sanitizedName: 'active_movie.mp4',
        mimeType: 'video/mp4',
        extension: '.mp4',
        fileSize: mockFileContent.length,
        status: 'PROCESSING',
        storageProvider: 'minio'
      });
      await chunkingService.chunkAndStore(activeFileId, tempFilePath, userId);
    });

    it('should successfully download/reconstruct entire 12 MB file matching checksum', async () => {
      const { stream, fileRecord } = await downloadService.downloadFile(activeFileId);
      expect(fileRecord.originalName).to.equal('active_movie.mp4');

      const buffers = [];
      for await (const data of stream) {
        buffers.push(data);
      }
      const downloadedContent = Buffer.concat(buffers);

      expect(downloadedContent.length).to.equal(mockFileContent.length);
      expect(downloadedContent.equals(mockFileContent)).to.be.true;
    });

    it('should successfully handle partial download ranges (e.g. range 1000 - 5000)', async () => {
      const range = { start: 1000, end: 5000 };
      const { stream, isPartial, headers } = await downloadService.downloadFile(activeFileId, { range });

      expect(isPartial).to.be.true;
      expect(headers['Content-Range']).to.equal(`bytes 1000-5000/${mockFileContent.length}`);
      expect(headers['Content-Length']).to.equal(4001);

      const buffers = [];
      for await (const data of stream) {
        buffers.push(data);
      }
      const downloadedContent = Buffer.concat(buffers);

      const originalSlice = mockFileContent.subarray(1000, 5001);
      expect(downloadedContent.equals(originalSlice)).to.be.true;
    });

    it('should successfully stream range straddling chunk boundaries (5 MB chunk boundary)', async () => {
      // 5 MB = 5,242,880 bytes. Let's request range 5,242,870 to 5,242,890 (21 bytes)
      const start = 5242870;
      const end = 5242890;
      const range = { start, end };
      const { stream } = await downloadService.downloadFile(activeFileId, { range });

      const buffers = [];
      for await (const data of stream) {
        buffers.push(data);
      }
      const downloadedContent = Buffer.concat(buffers);

      const originalSlice = mockFileContent.subarray(start, end + 1);
      expect(downloadedContent.length).to.equal(21);
      expect(downloadedContent.equals(originalSlice)).to.be.true;
    });

    it('should throttle streaming transfer speeds when rate limit is requested', async () => {
      // Set a rate limit of 1 MB/s (1024 * 1024 Bps)
      const rateLimitBps = 2 * 1024 * 1024; // 2 MB/s
      // Download first 1 MB
      const range = { start: 0, end: 1024 * 1024 - 1 };
      
      const startTime = Date.now();
      const { stream } = await downloadService.downloadFile(activeFileId, { range, rateLimitBps });

      const buffers = [];
      for await (const data of stream) {
        buffers.push(data);
      }
      const elapsedTime = Date.now() - startTime;

      // Expect download of 1 MB at 2 MB/s to take around 500ms
      // We expect it to take at least 300ms (due to throttling overhead)
      expect(elapsedTime).to.be.at.least(250);
      
      const downloadedContent = Buffer.concat(buffers);
      expect(downloadedContent.length).to.equal(1024 * 1024);
    });

    it('should fail download and throw error if a chunk in database is corrupted', async () => {
      // Corrupt chunk 1 checksum in DB
      const result = await Chunk.findOneAndUpdate(
        { fileId: activeFileId, chunkNumber: 1 },
        { $set: { checksum: 'corrupted_checksum_hash_value' } }
      );

      try {
        const { stream } = await downloadService.downloadFile(activeFileId);
        // Force evaluation of the stream to trigger validation check
        for await (const chunk of stream) {
          // Consume stream
        }
        throw new Error('Test did not throw expected integrity exception');
      } catch (err) {
        expect(err.message).to.equal('CHUNK_INTEGRITY_FAILED');
      }
    });
  });
});
