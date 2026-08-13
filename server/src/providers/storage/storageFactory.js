import env from '../../config/env.js';
import logger from '../../utils/logger.js';

let mockInstance = null;

class StorageFactory {
  /**
   * Instantiate concrete storage provider dynamically based on environment configuration.
   * Uses dynamic import to prevent static link crashes during compilation.
   * @returns {Promise<IStorageProvider>}
   */
  static async create() {
    if (process.env.NODE_ENV === 'test') {
      if (!mockInstance) {
        logger.info('StorageFactory: Initializing singleton MockStorageProvider.');
        const { default: MockStorageProvider } = await import('./MockStorageProvider.js');
        mockInstance = new MockStorageProvider();
      }
      return mockInstance;
    }
    const provider = env.STORAGE_PROVIDER;
    logger.info(`StorageFactory: Resolving provider strategy for: ${provider}`);

    switch (provider) {
      case 'minio':
        try {
          const { default: MinIOProvider } = await import('./MinIOProvider.js');
          return new MinIOProvider();
        } catch (err) {
          logger.error('Failed to import MinIOProvider strategy:', err);
          throw err;
        }
      case 's3':
        try {
          const { default: S3Provider } = await import('./S3Provider.js');
          return new S3Provider({
            region: process.env.AWS_REGION || 'eu-north-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          });
        } catch (err) {
          logger.error('Failed to import S3Provider strategy:', err);
          throw err;
        }
      default:
        throw new Error(`Unsupported storage provider configuration: ${provider}`);
    }
  }
}

export default StorageFactory;
export { StorageFactory };
