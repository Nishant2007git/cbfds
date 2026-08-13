import fileWorker from './fileWorker.js';
import maintenanceWorker from './maintenanceWorker.js';
import notificationWorker from './notificationWorker.js';
import logger from '../utils/logger.js';

/**
 * Trigger module load to start all active workers listening for jobs.
 */
export const startWorkers = () => {
  logger.info('BackgroundWorkers: Initialized job event loops.');
};

/**
 * Cleanly close all active workers during process shutdown.
 */
export const closeWorkers = async () => {
  logger.info('BackgroundWorkers: Closing all active job listeners...');
  
  if (fileWorker && typeof fileWorker.close === 'function') {
    await fileWorker.close();
    logger.info('BackgroundWorkers: Closed fileWorker listener.');
  }

  if (maintenanceWorker && typeof maintenanceWorker.close === 'function') {
    await maintenanceWorker.close();
    logger.info('BackgroundWorkers: Closed maintenanceWorker listener.');
  }

  if (notificationWorker && typeof notificationWorker.close === 'function') {
    await notificationWorker.close();
    logger.info('BackgroundWorkers: Closed notificationWorker listener.');
  }
};

export default {
  startWorkers,
  closeWorkers
};
