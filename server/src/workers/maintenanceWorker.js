import { Worker } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { connectionOpts, registerMockWorker } from '../config/queue.js';
import ShareRepository from '../repositories/shareRepository.js';
import FileRepository from '../repositories/fileRepository.js';
import ChunkRepository from '../repositories/chunkRepository.js';
import StorageFactory from '../providers/storage/storageFactory.js';
import { uploadDir } from '../providers/storage/tusServer.js';
import logger from '../utils/logger.js';

const shareRepo = new ShareRepository();
const fileRepo = new FileRepository();
const chunkRepo = new ChunkRepository();
let storageProvider = null;

const initStorage = async () => {
  if (!storageProvider) {
    storageProvider = await StorageFactory.create();
  }
  return storageProvider;
};

/**
 * Sweeps and revokes all expired or download-count exceeded share links.
 */
const cleanExpiredShares = async () => {
  logger.info('MaintenanceWorker: Scanning for expired or exceeded share links...');
  const revokedCount = await shareRepo.revokeExpiredAndExceeded();
  logger.info(`MaintenanceWorker: Successfully revoked ${revokedCount} expired/exceeded share links.`);
  return revokedCount;
};

/**
 * Sweeps files pending deletion, unlinks chunks from storage, and deletes chunk DB records.
 */
const sweepPendingDeletions = async () => {
  logger.info('MaintenanceWorker: Scanning for files with status PENDING_DELETION...');
  await initStorage();

  // Find files with PENDING_DELETION
  const filesPending = await fileRepo.model.find({ status: 'PENDING_DELETION' });
  logger.info(`MaintenanceWorker: Found ${filesPending.length} files pending deletion.`);

  for (const file of filesPending) {
    const { fileId } = file;
    logger.info(`MaintenanceWorker: Processing deletion sweep for File: ${fileId}`);

    try {
      // Find all chunk records associated with this file
      const chunks = await chunkRepo.findByFileId(fileId);
      logger.debug(`MaintenanceWorker: Found ${chunks.length} chunks to delete physically for File: ${fileId}`);

      // Delete each chunk physically from S3/MinIO
      for (const chunk of chunks) {
        try {
          const exists = await storageProvider.objectExists(chunk.storageBucket, chunk.storageKey);
          if (exists) {
            await storageProvider.deleteObject(chunk.storageBucket, chunk.storageKey);
            logger.debug(`MaintenanceWorker: Deleted chunk physically. Key: ${chunk.storageKey}`);
          }
        } catch (storageErr) {
          logger.error(`MaintenanceWorker: Failed to delete chunk physically [Key: ${chunk.storageKey}]: ${storageErr.message}`);
        }
      }

      // Delete Chunk documents from MongoDB
      await chunkRepo.deleteByFileId(fileId);
      logger.debug(`MaintenanceWorker: Deleted chunk DB records for File: ${fileId}`);

      // Update File metadata to status: DELETED and record deleted time
      await fileRepo.model.findOneAndUpdate(
        { fileId },
        { 
          $set: { 
            status: 'DELETED',
            deletedAt: new Date()
          } 
        }
      );
      logger.info(`MaintenanceWorker: File metadata status successfully updated to DELETED for File: ${fileId}`);
    } catch (err) {
      logger.error(`MaintenanceWorker: Failed to execute deletion sweep for File: ${fileId}. Msg: ${err.message}`, err);
    }
  }
};

/**
 * Sweeps and unlinks incomplete or abandoned Tus upload sessions older than 24 hours.
 */
const sweepTemporaryUploads = async () => {
  logger.info(`MaintenanceWorker: Scanning local cache folder "${uploadDir}" for abandoned uploads...`);
  
  if (!fs.existsSync(uploadDir)) {
    logger.debug('MaintenanceWorker: Local temp upload folder does not exist. Skipping sweep.');
    return 0;
  }

  const files = fs.readdirSync(uploadDir);
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
  let count = 0;

  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    try {
      const stats = fs.statSync(filePath);
      const ageMs = now - stats.mtimeMs;
      
      if (ageMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        count++;
        logger.info(`MaintenanceWorker: Cleaned up abandoned temp upload file: ${file} (Age: ${Math.round(ageMs / 3600000)} hours)`);
      }
    } catch (err) {
      logger.error(`MaintenanceWorker: Failed to check/delete temporary file ${file}. Msg: ${err.message}`);
    }
  }

  logger.info(`MaintenanceWorker: Cleanup completed. Removed ${count} abandoned uploads.`);
  return count;
};

/**
 * Combined processor dispatcher.
 */
const processMaintenanceJob = async (job) => {
  logger.info(`MaintenanceWorker: Executing job "${job.name}"`);
  
  switch (job.name) {
    case 'clean-shares':
      await cleanExpiredShares();
      break;
    case 'sweep-deletions':
      await sweepPendingDeletions();
      break;
    case 'sweep-temp':
      await sweepTemporaryUploads();
      break;
    case 'all':
    default:
      await cleanExpiredShares();
      await sweepPendingDeletions();
      await sweepTemporaryUploads();
      break;
  }
};

// Always register mock worker fallback for environments where Redis is in mock mode (e.g. localhost/free hosting)
registerMockWorker('maintenance', processMaintenanceJob);

let worker = null;

if (process.env.NODE_ENV !== 'test' && env.REDIS_HOST && env.REDIS_HOST.trim() !== 'localhost') {
  try {
    // Start active BullMQ worker processor
    worker = new Worker('maintenance', processMaintenanceJob, {
      connection: connectionOpts,
      concurrency: 1 // Single concurrency for maintenance sweeps
    });

    worker.on('completed', (job) => {
      logger.info(`MaintenanceWorker: Job ${job.id} completed successfully.`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`MaintenanceWorker: Job ${job.id} failed. Error: ${err.message}`, err);
    });

    logger.info('MaintenanceWorker: Active BullMQ worker initialized.');
  } catch (err) {
    logger.warn(`MaintenanceWorker: Could not initialize BullMQ worker, using mock worker fallback: ${err.message}`);
  }
}

export default worker;
export { cleanExpiredShares, sweepPendingDeletions, sweepTemporaryUploads };
