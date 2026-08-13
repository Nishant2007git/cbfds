import { Readable } from 'stream';
import IStorageProvider from './IStorageProvider.js';

class MockStorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.storage = new Map(); // key format: "bucket/key" -> { data: Buffer, metadata: Object }
    this.buckets = new Set();
  }

  async putObject(bucket, key, data, metadata = {}) {
    let buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data instanceof Readable) {
      const chunks = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } else {
      buffer = Buffer.from(data);
    }
    
    this.storage.set(`${bucket}/${key}`, { data: buffer, metadata });
  }

  async getObject(bucket, key) {
    const item = this.storage.get(`${bucket}/${key}`);
    if (!item) {
      const err = new Error(`Object not found: ${bucket}/${key}`);
      err.code = 'NoSuchKey';
      throw err;
    }
    return Readable.from(item.data);
  }

  async deleteObject(bucket, key) {
    this.storage.delete(`${bucket}/${key}`);
  }

  async objectExists(bucket, key) {
    return this.storage.has(`${bucket}/${key}`);
  }

  async getObjectMetadata(bucket, key) {
    const item = this.storage.get(`${bucket}/${key}`);
    return item ? item.metadata : {};
  }

  async listObjects(bucket, prefix, options = {}) {
    const list = [];
    const prefixKey = `${bucket}/${prefix}`;
    for (const fullKey of this.storage.keys()) {
      if (fullKey.startsWith(prefixKey)) {
        list.push({
          name: fullKey.substring(bucket.length + 1),
          size: this.storage.get(fullKey).data.length
        });
      }
    }
    return list;
  }

  async bucketExists(bucket) {
    return this.buckets.has(bucket);
  }

  async createBucket(bucket) {
    this.buckets.add(bucket);
  }

  async healthCheck() {
    return {
      status: 'healthy',
      details: { mock: true, objectsCount: this.storage.size }
    };
  }
}

export default MockStorageProvider;
export { MockStorageProvider };
