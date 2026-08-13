/**
 * IStorageProvider Abstract Class / Interface
 * Defines the contract that all concrete storage strategies (MinIO, S3, etc.) must implement.
 */
class IStorageProvider {
  constructor() {
    if (this.constructor === IStorageProvider) {
      throw new Error("Cannot instantiate abstract class IStorageProvider directly.");
    }
  }

  /**
   * Upload an object to the target storage bucket.
   * @param {string} bucket - Target bucket name.
   * @param {string} key - Object key/path.
   * @param {Buffer|ReadableStream} data - Binary stream or buffer payload.
   * @param {Object} [metadata] - Optional metadata descriptors.
   * @returns {Promise<void>}
   */
  async putObject(bucket, key, data, metadata = {}) {
    throw new Error("Method 'putObject()' must be implemented by subclass.");
  }

  /**
   * Retrieve an object stream from the target storage bucket.
   * @param {string} bucket - Target bucket name.
   * @param {string} key - Object key/path.
   * @returns {Promise<ReadableStream>}
   */
  async getObject(bucket, key) {
    throw new Error("Method 'getObject()' must be implemented by subclass.");
  }

  /**
   * Delete an object from the storage bucket.
   * @param {string} bucket - Target bucket name.
   * @param {string} key - Object key/path.
   * @returns {Promise<void>}
   */
  async deleteObject(bucket, key) {
    throw new Error("Method 'deleteObject()' must be implemented by subclass.");
  }

  /**
   * Check if an object exists in the storage bucket.
   * @param {string} bucket - Target bucket name.
   * @param {string} key - Object key/path.
   * @returns {Promise<boolean>}
   */
  async objectExists(bucket, key) {
    throw new Error("Method 'objectExists()' must be implemented by subclass.");
  }

  /**
   * Fetch object metadata descriptors.
   * @param {string} bucket - Target bucket name.
   * @param {string} key - Object key/path.
   * @returns {Promise<Object>}
   */
  async getObjectMetadata(bucket, key) {
    throw new Error("Method 'getObjectMetadata()' must be implemented by subclass.");
  }

  /**
   * List all objects inside a bucket matching a specific prefix path.
   * @param {string} bucket - Target bucket name.
   * @param {string} prefix - Key prefix to filter listing.
   * @param {Object} [options] - Pagination or list parameters.
   * @returns {Promise<Array<Object>>}
   */
  async listObjects(bucket, prefix, options = {}) {
    throw new Error("Method 'listObjects()' must be implemented by subclass.");
  }

  /**
   * Verify if the target bucket exists.
   * @param {string} bucket - Target bucket name.
   * @returns {Promise<boolean>}
   */
  async bucketExists(bucket) {
    throw new Error("Method 'bucketExists()' must be implemented by subclass.");
  }

  /**
   * Create a new storage bucket.
   * @param {string} bucket - Target bucket name.
   * @returns {Promise<void>}
   */
  async createBucket(bucket) {
    throw new Error("Method 'createBucket()' must be implemented by subclass.");
  }

  /**
   * Verify target storage provider connection connectivity.
   * @returns {Promise<Object>} Status object containing { status: 'healthy'|'unhealthy', details: Object }
   */
  async healthCheck() {
    throw new Error("Method 'healthCheck()' must be implemented by subclass.");
  }
}

export default IStorageProvider;
export { IStorageProvider };
