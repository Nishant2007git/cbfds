import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  ListBucketsCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import IStorageProvider from './IStorageProvider.js';
import logger from '../../utils/logger.js';

/**
 * AWS S3 Storage Provider implementing IStorageProvider contract.
 * Uses the AWS SDK v3 modular client.
 */
class S3Provider extends IStorageProvider {
  /**
   * @param {Object} options - S3 configuration.
   * @param {string} options.region - AWS region (e.g. 'eu-north-1').
   * @param {string} [options.accessKeyId] - AWS access key ID (falls back to env/IAM role).
   * @param {string} [options.secretAccessKey] - AWS secret access key.
   */
  constructor(options = {}) {
    super();

    const clientConfig = {
      region: options.region || process.env.AWS_REGION || 'eu-north-1',
    };

    // Only set explicit credentials if provided; otherwise the SDK
    // will use the default credential chain (env vars, IAM role, etc.)
    if (options.accessKeyId && options.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
    this.region = clientConfig.region;
    logger.info(`S3Provider: Initialized for region ${this.region}`);
  }

  /**
   * Upload an object to the target S3 bucket.
   */
  async putObject(bucket, key, data, metadata = {}) {
    try {
      logger.debug(`S3: Uploading object to bucket: ${bucket}, key: ${key}`);

      const body = typeof data === 'string' ? Buffer.from(data) : data;

      await this.client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        Metadata: metadata,
      }));
    } catch (err) {
      logger.error(`S3 putObject Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Retrieve an object stream from the target S3 bucket.
   * Returns a Node.js Readable stream.
   */
  async getObject(bucket, key) {
    try {
      logger.debug(`S3: Fetching object stream from bucket: ${bucket}, key: ${key}`);

      const response = await this.client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      // response.Body is a web ReadableStream in SDK v3; convert to Node stream
      if (response.Body instanceof Readable) {
        return response.Body;
      }

      // For environments where Body is a web stream, wrap it
      return Readable.from(response.Body);
    } catch (err) {
      logger.error(`S3 getObject Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Delete an object from the S3 bucket.
   */
  async deleteObject(bucket, key) {
    try {
      logger.debug(`S3: Deleting object from bucket: ${bucket}, key: ${key}`);
      await this.client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
    } catch (err) {
      logger.error(`S3 deleteObject Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Check if an object exists in the S3 bucket.
   */
  async objectExists(bucket, key) {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error(`S3 objectExists check failed [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Retrieve metadata for a specific object.
   */
  async getObjectMetadata(bucket, key) {
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
      return response.Metadata || {};
    } catch (err) {
      logger.error(`S3 getObjectMetadata Error [Bucket: ${bucket}, Key: ${key}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * List all objects inside a bucket matching a prefix.
   */
  async listObjects(bucket, prefix, options = {}) {
    try {
      const objects = [];
      let continuationToken = undefined;

      do {
        const response = await this.client.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: options.maxKeys || 1000,
          ContinuationToken: continuationToken,
        }));

        if (response.Contents) {
          for (const obj of response.Contents) {
            objects.push({
              name: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified,
              etag: obj.ETag,
            });
          }
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      return objects;
    } catch (err) {
      logger.error(`S3 listObjects Error [Bucket: ${bucket}, Prefix: ${prefix}]: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Verify if a bucket exists.
   */
  async bucketExists(bucket) {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      return true;
    } catch (err) {
      if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') {
        return false;
      }
      logger.error(`S3 bucketExists check failed for bucket: ${bucket}. Msg: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Create a new S3 bucket.
   */
  async createBucket(bucket) {
    try {
      logger.info(`S3: Creating new bucket: ${bucket}`);
      await this.client.send(new CreateBucketCommand({
        Bucket: bucket,
        CreateBucketConfiguration: {
          LocationConstraint: this.region,
        },
      }));
    } catch (err) {
      // Ignore if already exists
      if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
        logger.info(`S3: Bucket ${bucket} already exists, skipping creation.`);
        return;
      }
      logger.error(`S3 createBucket failed for bucket: ${bucket}. Msg: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Execute a connection health check by listing buckets.
   */
  async healthCheck() {
    try {
      const response = await this.client.send(new ListBucketsCommand({}));
      return {
        status: 'healthy',
        details: {
          bucketsCount: response.Buckets?.length || 0,
        },
      };
    } catch (err) {
      logger.error(`S3 healthCheck ping failed. Msg: ${err.message}`, err);
      return {
        status: 'unhealthy',
        details: {
          error: err.message,
        },
      };
    }
  }
}

export default S3Provider;
export { S3Provider };
