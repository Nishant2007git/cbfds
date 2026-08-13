import * as Minio from 'minio';
import IStorageProvider from './IStorageProvider.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

class MinIOProvider extends IStorageProvider {
  constructor() {
    super();
    
    // Initialize MinIO client
    this.client = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }

  /**
   * Upload an object/stream to a MinIO bucket.
   */
  async putObject(bucket, key, data, metadata = {}) {
    try {
      logger.debug(`MinIO: Uploading object to bucket: ${bucket}, key: ${key}`);
      await this.client.putObject(bucket, key, data, null, metadata);
    } catch (err) {
      logger.error(`MinIO putObject Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Retrieve an object stream from a MinIO bucket.
   */
  async getObject(bucket, key) {
    try {
      logger.debug(`MinIO: Fetching object stream from bucket: ${bucket}, key: ${key}`);
      return await this.client.getObject(bucket, key);
    } catch (err) {
      logger.error(`MinIO getObject Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Delete an object from a MinIO bucket.
   */
  async deleteObject(bucket, key) {
    try {
      logger.debug(`MinIO: Deleting object from bucket: ${bucket}, key: ${key}`);
      await this.client.removeObject(bucket, key);
    } catch (err) {
      logger.error(`MinIO deleteObject Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Check if an object exists in a MinIO bucket.
   */
  async objectExists(bucket, key) {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch (err) {
      if (err.code === 'NotFound' || err.code === 'NoSuchKey') {
        return false;
      }
      logger.error(`MinIO objectExists check failed [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Retrieve metadata for a specific object.
   */
  async getObjectMetadata(bucket, key) {
    try {
      const stat = await this.client.statObject(bucket, key);
      return stat.metaData || {};
    } catch (err) {
      logger.error(`MinIO getObjectMetadata Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * List all objects inside a MinIO bucket matching a prefix.
   */
  async listObjects(bucket, prefix, options = {}) {
    return new Promise((resolve, reject) => {
      const objects = [];
      const stream = this.client.listObjectsV2(bucket, prefix, true);

      stream.on('data', (obj) => {
        objects.push(obj);
      });

      stream.on('error', (err) => {
        logger.error(`MinIO listObjects stream error [Bucket: ${bucket}, Prefix: ${prefix}]: ${err.message}`, err);
        reject(err);
      });

      stream.on('end', () => {
        resolve(objects);
      });
    });
  }

  /**
   * Verify if a bucket exists.
   */
  async bucketExists(bucket) {
    try {
      return await this.client.bucketExists(bucket);
    } catch (err) {
      logger.error(`MinIO bucketExists check failed for bucket: ${bucket}. Msg: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Create a new storage bucket.
   */
  async createBucket(bucket) {
    try {
      logger.info(`MinIO: Creating new bucket: ${bucket}`);
      await this.client.makeBucket(bucket);
    } catch (err) {
      logger.error(`MinIO createBucket failed for bucket: ${bucket}. Msg: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Execute connection ping to verify service health.
   */
  async healthCheck() {
    try {
      // List buckets as a connection ping check
      const list = await this.client.listBuckets();
      return {
        status: 'healthy',
        details: {
          bucketsCount: list.length
        }
      };
    } catch (err) {
      logger.error(`MinIO healthCheck ping failed. Msg: ${err.message}`, err);
      return {
        status: 'unhealthy',
        details: {
          error: err.message
        }
      };
    }
  }
}

export default MinIOProvider;
export { MinIOProvider };
