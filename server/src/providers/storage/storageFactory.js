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
          logger.warn('Failed to initialize MinIOProvider strategy, falling back to MockStorageProvider:', err);
          if (!mockInstance) {
            const { default: MockStorageProvider } = await import('./MockStorageProvider.js');
            mockInstance = new MockStorageProvider();
          }
          return mockInstance;
        }
      case 's3':
        try {
          // If demo AWS credentials are set (e.g. on free hosting), use MockStorageProvider fallback
          const awsKey = process.env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
          if (!awsKey || awsKey.startsWith('demo_')) {
            logger.info('StorageFactory: Demo AWS keys detected. Using MockStorageProvider for free hosting.');
            if (!mockInstance) {
              const { default: MockStorageProvider } = await import('./MockStorageProvider.js');
              mockInstance = new MockStorageProvider();
            }
            return mockInstance;
          }
          const { default: S3Provider } = await import('./S3Provider.js');
          return new S3Provider({
            region: process.env.AWS_REGION || 'us-east-1',
            accessKeyId: awsKey,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY,
          });
        } catch (err) {
          logger.warn('Failed to initialize S3Provider strategy, falling back to MockStorageProvider:', err);
          if (!mockInstance) {
            const { default: MockStorageProvider } = await import('./MockStorageProvider.js');
            mockInstance = new MockStorageProvider();
          }
          return mockInstance;
        }
      case 'mock':
      default:
        if (!mockInstance) {
          logger.info('StorageFactory: Initializing singleton MockStorageProvider.');
          const { default: MockStorageProvider } = await import('./MockStorageProvider.js');
          mockInstance = new MockStorageProvider();
        }
        return mockInstance;
    }
  }
}

export default StorageFactory;
export { StorageFactory };
