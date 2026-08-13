import { Worker } from 'bullmq';
import ChunkingService from '../services/chunkingService.js';
import { connectionOpts, registerMockWorker } from '../config/queue.js';
import logger from '../utils/logger.js';

const chunkingService = new ChunkingService();

/**
 * Job processor function.
 */
const processFileJob = async (job) => {
  const { fileId, tempFilePath, userId } = job.data;
  logger.info(`fileWorker: Processing job ${job.id} for File: ${fileId}`);
  
  // Trigger file split and upload processing
  await chunkingService.chunkAndStore(fileId, tempFilePath, userId);
};

let worker = null;

if (process.env.NODE_ENV === 'test') {
  // Register with mock test environment queue runner
  registerMockWorker('file-processing', processFileJob);
} else {
  // Start active BullMQ worker processor
  worker = new Worker('file-processing', processFileJob, {
    connection: connectionOpts,
    concurrency: 2 // Max 2 files chunked in parallel (SAD limit)
  });

  worker.on('completed', (job) => {
    logger.info(`fileWorker: Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`fileWorker: Job ${job.id} failed. Error: ${err.message}`, err);
  });
  
  logger.info('fileWorker: Active BullMQ worker initialized.');
}

export default worker;
