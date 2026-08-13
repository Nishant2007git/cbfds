import { Queue } from 'bullmq';
import env from './env.js';
import logger from '../utils/logger.js';

export const connectionOpts = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {})
};

// In-memory worker registry to support mock synchronous workers during test executions
const mockWorkerRegistry = new Map();

/**
 * BaseQueue Wrapper Class
 * Delegates to BullMQ in development/production, or mocks operations in test mode.
 */
class BaseQueue {
  constructor(name) {
    this.name = name;
    if (process.env.NODE_ENV === 'test') {
      this.isMock = true;
      this.jobs = [];
      logger.info(`BaseQueue: Initialized mock queue wrapper for "${name}"`);
    } else {
      this.bullQueue = new Queue(name, { connection: connectionOpts });
      logger.info(`BaseQueue: Initialized BullMQ queue for "${name}"`);
    }
  }

  /**
   * Enqueue a background job task.
   * @param {string} jobName - Unique identifier for the action.
   * @param {Object} data - Payload data.
   * @param {Object} [opts] - BullMQ configuration configurations.
   * @returns {Promise<Object>} Job descriptor containing { id, name, data }.
   */
  async add(jobName, data, opts = {}) {
    if (this.isMock) {
      const mockJob = {
        id: `mock-job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: jobName,
        data,
        opts,
        updateProgress: async (progress) => {
          logger.debug(`MockJob Progress [Queue: ${this.name}, Job: ${jobName}]: ${progress}%`);
        }
      };
      
      this.jobs.push(mockJob);
      logger.debug(`MockQueue [${this.name}]: Enqueued job "${jobName}". Payload:`, data);

      // Trigger companion mock worker asynchronously in the next event loop tick
      const workerFn = mockWorkerRegistry.get(this.name);
      if (workerFn) {
        setImmediate(async () => {
          try {
            logger.debug(`MockQueue [${this.name}]: Executing mock worker for job "${jobName}"`);
            await workerFn(mockJob);
          } catch (err) {
            logger.error(`MockQueue [${this.name}] Worker Crash for job "${jobName}": ${err.message}`, err);
          }
        });
      }
      return mockJob;
    }
    
    return this.bullQueue.add(jobName, data, opts);
  }

  async close() {
    if (!this.isMock) {
      await this.bullQueue.close();
    }
  }
}

/**
 * Helper to register a mock worker processor during tests.
 * @param {string} queueName - Target queue name.
 * @param {Function} processorFn - Async function executing the job logic.
 */
export const registerMockWorker = (queueName, processorFn) => {
  mockWorkerRegistry.set(queueName, processorFn);
  logger.info(`MockQueueRegistry: Registered processor hook for queue: "${queueName}"`);
};

// Initialize the 3 main system queues
export const fileProcessingQueue = new BaseQueue('file-processing');
export const maintenanceQueue = new BaseQueue('maintenance');
export const notificationsQueue = new BaseQueue('notifications');

export default {
  fileProcessingQueue,
  maintenanceQueue,
  notificationsQueue,
  registerMockWorker,
  connectionOpts
};
