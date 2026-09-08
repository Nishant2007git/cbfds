import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import IStorageProvider from './IStorageProvider.js';
import logger from '../../utils/logger.js';

class MockStorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.storage = new Map(); // key format: "bucket/key" -> { data: Buffer, metadata: Object }
    this.buckets = new Set(['cbfds-chunks']);
    this.baseDir = path.resolve(process.cwd(), 'persistent_storage', 'chunks_store');
    
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      logger.warn(`MockStorageProvider: Failed to create baseDir ${this.baseDir}: ${err.message}`);
    }
  }

  _getDiskPath(bucket, key) {
    // Sanitize bucket & key path for safe local filesystem storage
    const cleanBucket = (bucket || 'cbfds-chunks').trim().replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_/]/g, '_');
    return path.join(this.baseDir, cleanBucket, safeKey);
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
    
    const cleanBucket = (bucket || 'cbfds-chunks').trim();
    this.buckets.add(cleanBucket);
    this.storage.set(`${cleanBucket}/${key}`, { data: buffer, metadata });

    // Also persist to disk so chunks survive server reboots
    try {
      const filePath = this._getDiskPath(cleanBucket, key);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
    } catch (diskErr) {
      logger.warn(`MockStorageProvider: Disk persistence warning for ${key}: ${diskErr.message}`);
    }
  }

  async getObject(bucket, key) {
    const cleanBucket = (bucket || 'cbfds-chunks').trim();
    const item = this.storage.get(`${cleanBucket}/${key}`) || this.storage.get(`${bucket}/${key}`);
    if (item && item.data) {
      return Readable.from(item.data);
    }

    // Try reading from primary persistent disk path
    const filePath = this._getDiskPath(cleanBucket, key);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      this.storage.set(`${cleanBucket}/${key}`, { data, metadata: {} });
      return Readable.from(data);
    }

    // Check legacy chunk store locations (in case uploads were made in different CWD or previous versions)
    const sanitizedBucket = cleanBucket.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_/]/g, '_');
    const legacyPaths = [
      path.resolve(process.cwd(), 'uploads_temp', 'chunks_store', sanitizedBucket, safeKey),
      path.resolve(process.cwd(), 'server', 'uploads_temp', 'chunks_store', sanitizedBucket, safeKey),
      path.resolve(process.cwd(), '..', 'uploads_temp', 'chunks_store', sanitizedBucket, safeKey),
      path.resolve(process.cwd(), '..', 'server', 'uploads_temp', 'chunks_store', sanitizedBucket, safeKey)
    ];

    for (const legPath of legacyPaths) {
      if (fs.existsSync(legPath)) {
        const data = fs.readFileSync(legPath);
        this.storage.set(`${cleanBucket}/${key}`, { data, metadata: {} });
        return Readable.from(data);
      }
    }

    const err = new Error(`Object not found: ${cleanBucket}/${key}`);
    err.code = 'NoSuchKey';
    throw err;
  }

  async deleteObject(bucket, key) {
    this.storage.delete(`${bucket}/${key}`);
    try {
      const filePath = this._getDiskPath(bucket, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      // ignore
    }
  }

  async objectExists(bucket, key) {
    if (this.storage.has(`${bucket}/${key}`)) return true;
    const filePath = this._getDiskPath(bucket, key);
    return fs.existsSync(filePath);
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
    return true;
  }

  async createBucket(bucket) {
    this.buckets.add(bucket);
    try {
      const bucketDir = path.join(this.baseDir, bucket);
      if (!fs.existsSync(bucketDir)) {
        fs.mkdirSync(bucketDir, { recursive: true });
      }
    } catch (err) {
      // ignore
    }
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

