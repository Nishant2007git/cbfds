import { Readable, Transform } from 'stream';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import StorageFactory from '../providers/storage/storageFactory.js';
import FileRepository from '../repositories/fileRepository.js';
import ChunkRepository from '../repositories/chunkRepository.js';

/**
 * Custom Throttle stream helper to enforce download rate limits (backpressure-based).
 */
class ThrottleStream extends Transform {
  /**
   * @param {number} rateLimitBps - Download speed limit in bytes per second.
   */
  constructor(rateLimitBps) {
    super();
    this.rateLimitBps = rateLimitBps;
    this.bytesSent = 0;
    this.startTime = Date.now();
  }

  _transform(chunk, encoding, callback) {
    if (!this.rateLimitBps || this.rateLimitBps <= 0) {
      this.push(chunk);
      return callback();
    }

    this.bytesSent += chunk.length;
    const elapsedMs = Date.now() - this.startTime;
    const expectedMs = (this.bytesSent / this.rateLimitBps) * 1000;
    const delayMs = expectedMs - elapsedMs;

    if (delayMs > 0) {
      setTimeout(() => {
        this.push(chunk);
        callback();
      }, delayMs);
    } else {
      this.push(chunk);
      callback();
    }
  }
}

class DownloadService {
  constructor(
    fileRepository = new FileRepository(),
    chunkRepository = new ChunkRepository()
  ) {
    this.fileRepo = fileRepository;
    this.chunkRepo = chunkRepository;
    this.storageProvider = null;
  }

  /**
   * Initializes the storage provider strategy lazily.
   */
  async _initStorage() {
    if (!this.storageProvider) {
      this.storageProvider = await StorageFactory.create();
    }
    return this.storageProvider;
  }

  /**
   * Create a sequential reconstruction stream for a file, supporting optional HTTP ranges & rate limits.
   * @param {string} fileId - Target file identifier.
   * @param {Object} [options] - Stream configuration configurations.
   * @param {Object} [options.range] - HTTP range parsed object containing { start, end }.
   * @param {number} [options.rateLimitBps] - Throttled speed limit in bytes per second.
   * @returns {Promise<{ stream: Readable, fileRecord: Object, isPartial: boolean, headers: Object }>}
   */
  async downloadFile(fileId, options = {}) {
    await this._initStorage();
    logger.info(`DownloadService: Fetching download stream for File: ${fileId}`);

    // 1. Fetch File record from DB
    const fileRecord = await this.fileRepo.findById(fileId);
    if (!fileRecord) {
      throw new Error('FILE_NOT_FOUND');
    }
    if (fileRecord.status !== 'ACTIVE') {
      throw new Error('FILE_NOT_READY');
    }

    // 2. Fetch all chunk metadata records ordered sequentially
    const chunks = await this.chunkRepo.findByFileId(fileId);
    if (!chunks || chunks.length === 0) {
      throw new Error('FILE_CHUNKS_MISSING');
    }

    let isPartial = false;
    let start = 0;
    let end = fileRecord.fileSize - 1;
    const responseHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Type': fileRecord.mimeType || 'application/octet-stream',
    };

    // 3. Process HTTP range requests if present
    if (options.range) {
      isPartial = true;
      start = options.range.start;
      end = options.range.end !== undefined ? options.range.end : fileRecord.fileSize - 1;

      if (start < 0 || end >= fileRecord.fileSize || start > end) {
        throw new Error('RANGE_NOT_SATISFIABLE');
      }

      responseHeaders['Content-Range'] = `bytes ${start}-${end}/${fileRecord.fileSize}`;
      responseHeaders['Content-Length'] = end - start + 1;
    } else {
      responseHeaders['Content-Length'] = fileRecord.fileSize;
    }

    // 4. Construct the Sequential Generator-based Stream
    const storage = this.storageProvider;
    const rangeStart = start;
    const rangeEnd = end;

    const streamGenerator = async function* () {
      let currentOffset = 0;

      for (const chunk of chunks) {
        const chunkStart = currentOffset;
        const chunkEnd = currentOffset + chunk.chunkSize - 1;

        // Check if this chunk overlaps with the target range
        if (chunkStart <= rangeEnd && chunkEnd >= rangeStart) {
          logger.debug(`DownloadService: Streaming chunk ${chunk.chunkNumber} for range: ${rangeStart}-${rangeEnd}`);

          // Fetch chunk payload stream from MinIO/S3
          const chunkStream = await storage.getObject(chunk.storageBucket, chunk.storageKey);

          // Buffer the chunk in memory (max 5MB) to execute integrity verification before yielding
          const chunkBuffers = [];
          for await (const data of chunkStream) {
            chunkBuffers.push(data);
          }
          const chunkBuffer = Buffer.concat(chunkBuffers);

          // Validate individual chunk checksum
          const checksum = crypto.createHash('sha256').update(chunkBuffer).digest('hex');
          if (checksum !== chunk.checksum) {
            logger.error(`DownloadService: Integrity validation failed for Chunk: ${chunk.chunkNumber} of File: ${fileId}`);
            throw new Error('CHUNK_INTEGRITY_FAILED');
          }

          // Slice buffer relative to range bounds
          const sliceStart = Math.max(0, rangeStart - chunkStart);
          const sliceEnd = Math.min(chunk.chunkSize, rangeEnd - chunkStart + 1);

          yield chunkBuffer.subarray(sliceStart, sliceEnd);
        }

        currentOffset += chunk.chunkSize;
      }
    };

    // 5. Wrap generator in a Readable stream
    let fileStream = Readable.from(streamGenerator());

    // 6. Apply rate limiting throttling transformer if requested
    if (options.rateLimitBps && options.rateLimitBps > 0) {
      logger.info(`DownloadService: Applying download throttle rate limit of ${options.rateLimitBps} Bps`);
      const throttle = new ThrottleStream(options.rateLimitBps);
      fileStream = fileStream.pipe(throttle);
    }

    return {
      stream: fileStream,
      fileRecord,
      isPartial,
      headers: responseHeaders,
    };
  }
}

export default DownloadService;
export { DownloadService, ThrottleStream };
