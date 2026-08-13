import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import StorageFactory from '../providers/storage/storageFactory.js';
import FileRepository from '../repositories/fileRepository.js';
import ChunkRepository from '../repositories/chunkRepository.js';

class ChunkingService {
  constructor(
    fileRepository = new FileRepository(),
    chunkRepository = new ChunkRepository()
  ) {
    this.fileRepo = fileRepository;
    this.chunkRepo = chunkRepository;
    this.storageProvider = null;
  }

  /**
   * Initializes the storage provider strategy lazily.
   */
  async _initStorage() {
    if (!this.storageProvider) {
      this.storageProvider = await StorageFactory.create();
    }
    return this.storageProvider;
  }

  /**
   * Split an uploaded temporary file into sequential zero-padded chunks,
   * upload them to storage, write metadata records, and clean up local cache.
   * @param {string} fileId - File unique identifier.
   * @param {string} tempFilePath - Absolute path to local temporary file.
   * @param {string} userId - User identifier (owner).
   * @returns {Promise<Object>} The finalized active File record.
   */
  async chunkAndStore(fileId, tempFilePath, userId) {
    await this._initStorage();
    logger.info(`ChunkingService: Starting chunking processing for File: ${fileId}, path: ${tempFilePath}`);

    const bucket = env.STORAGE_BUCKET;
    const chunkSize = env.DEFAULT_CHUNK_SIZE; // Default 5 MB

    // 1. Ensure target storage bucket exists
    try {
      const exists = await this.storageProvider.bucketExists(bucket);
      if (!exists) {
        logger.info(`ChunkingService: Creating storage bucket "${bucket}"`);
        await this.storageProvider.createBucket(bucket);
      }
    } catch (err) {
      logger.error(`ChunkingService: Failed to verify/create storage bucket "${bucket}":`, err);
      throw err;
    }

    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Temporary file not found at ${tempFilePath}`);
    }

    const fd = await fs.promises.open(tempFilePath, 'r');
    const stat = await fd.stat();
    const fileSize = stat.size;

    logger.debug(`ChunkingService: File size: ${fileSize} bytes. Target chunk size: ${chunkSize} bytes.`);

    let offset = 0;
    let chunkNumber = 0;
    const fileHashObj = crypto.createHash('sha256');

    try {
      // 2. Loop through file in 5MB slices
      while (offset < fileSize) {
        const bytesToRead = Math.min(chunkSize, fileSize - offset);
        const buffer = Buffer.alloc(bytesToRead);
        
        await fd.read(buffer, 0, bytesToRead, offset);

        // Update global file hash
        fileHashObj.update(buffer);

        // Compute individual chunk checksum
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

        // Formulate zero-padded index naming schema (e.g. user1/fileId/chunks/_chunk_0000)
        const zeroPaddedNumber = String(chunkNumber).padStart(4, '0');
        const storageKey = `${userId}/${fileId}/chunks/_chunk_${zeroPaddedNumber}`;

        logger.debug(`ChunkingService: Uploading chunk ${chunkNumber} (size: ${bytesToRead} bytes) to storage key: ${storageKey}`);

        // Upload chunk block to MinIO/S3
        await this.storageProvider.putObject(bucket, storageKey, buffer, {
          'Content-Type': 'application/octet-stream',
          'checksum-sha256': checksum,
        });

        // Write Chunk metadata details to MongoDB
        await this.chunkRepo.create({
          fileId,
          chunkNumber,
          chunkSize: bytesToRead,
          checksum,
          storageKey,
          storageBucket: bucket,
          status: 'STORED',
        });

        offset += bytesToRead;
        chunkNumber++;
      }

      const fileHash = fileHashObj.digest('hex');
      logger.info(`ChunkingService: Chunking completed. Total chunks: ${chunkNumber}. Entire File Hash: ${fileHash}`);

      // 3. Close file handle
      await fd.close();

      // 4. Update File Metadata in MongoDB: Status ACTIVE, count, hash
      const updatedFile = await this.fileRepo.model.findOneAndUpdate(
        { fileId },
        {
          $set: {
            status: 'ACTIVE',
            fileHash,
            totalChunks: chunkNumber,
            chunkSize,
          },
        },
        { new: true }
      );

      // Increment user storage used
      const QuotaServiceModule = await import('./quotaService.js');
      const quotaService = new QuotaServiceModule.default();
      await quotaService.incrementStorageUsed(userId, updatedFile.fileSize);

      // 5. Clean up temporary source file on disk
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          logger.info(`ChunkingService: Successfully cleaned up temporary file: ${tempFilePath}`);
        }
      } catch (unlinkErr) {
        logger.error(`ChunkingService: Non-blocking warning: Failed to clean up temp file: ${tempFilePath}`, unlinkErr);
      }

      // Also clean up the companion .json metadata file created by tus if it exists
      const metaJsonPath = `${tempFilePath}.json`;
      try {
        if (fs.existsSync(metaJsonPath)) {
          fs.unlinkSync(metaJsonPath);
          logger.debug(`ChunkingService: Cleaned up companion tus metadata file: ${metaJsonPath}`);
        }
      } catch (err) {
        // Suppress companion deletion warnings
      }

      return updatedFile;
    } catch (error) {
      logger.error(`ChunkingService: Process failure during chunking for File: ${fileId}:`, error);
      
      // Ensure file handle gets closed on errors
      try {
        await fd.close();
      } catch (err) {
        // ignore close failures on errors
      }

      // Mark File metadata record as ERROR in MongoDB
      await this.fileRepo.updateStatus(fileId, 'ERROR', error.message);
      
      throw error;
    }
  }
}

export default ChunkingService;
export { ChunkingService };
