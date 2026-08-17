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
    this.baseDir = path.resolve(process.cwd(), 'uploads_temp', 'chunks_store');
    
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      logger.warn(`MockStorageProvider: Failed to create baseDir ${this.baseDir}: ${err.message}`);
    }
  }

  _getDiskPath(bucket, key) {
    // Sanitize key path for local filesystem storage
    const safeKey = key.replace(/[^a-zA-Z0-9.\-_/]/g, '_');
    return path.join(this.baseDir, bucket, safeKey);
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
    
    this.buckets.add(bucket);
    this.storage.set(`${bucket}/${key}`, { data: buffer, metadata });

    // Also persist to disk so chunks survive server reboots
    try {
      const filePath = this._getDiskPath(bucket, key);
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
    const item = this.storage.get(`${bucket}/${key}`);
    if (item && item.data) {
      return Readable.from(item.data);
    }

    // Try reading from disk fallback
    const filePath = this._getDiskPath(bucket, key);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      this.storage.set(`${bucket}/${key}`, { data, metadata: {} });
      return Readable.from(data);
    }

    const err = new Error(`Object not found: ${bucket}/${key}`);
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

