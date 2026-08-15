import { Server, EVENTS } from '@tus/server';
import { FileStore } from '@tus/file-store';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import validateFile from '../../utils/fileValidator.js';
import FileRepository from '../../repositories/fileRepository.js';
import { fileProcessingQueue } from '../../config/queue.js';

// Define the temporary uploads directory absolute path
const uploadDir = path.resolve(process.cwd(), 'uploads_temp');

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`TusServer: Created temporary uploads folder at ${uploadDir}`);
}

const fileRepo = new FileRepository();

// Helper to sanitize filenames (keeps alphanumeric, dots, dashes, underscores)
const sanitizeFilename = (name) => {
  return name.replace(/[^a-zA-Z0-9.\-_ ]/g, '_');
};

const tusServer = new Server({
  path: `/api/${env.API_VERSION}/uploads`,
  relativeLocation: true,
  datastore: new FileStore({
    directory: uploadDir,
  }),
  maxSize: env.MAX_FILE_SIZE,

  // Hook triggered when upload completes
  async onUploadFinish(req, upload) {
    const filePath = path.resolve(uploadDir, upload.id);
    const decodedMetadata = upload.metadata || {};
    
    const filename = decodedMetadata.filename || 'untitled';
    const mimeType = decodedMetadata.filetype || 'application/octet-stream';
    
    let userId = req.user?.userId;
    logger.info(`TusServer debug: has get method = ${typeof req.headers?.get === 'function'}`);
    if (!userId) {
      const authHeader = typeof req.headers?.get === 'function' 
        ? req.headers.get('authorization') 
        : (req.headers?.authorization || req.headers?.Authorization);
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const payload = jwt.verify(token, env.JWT_SECRET);
          userId = payload.sub;
        } catch (err) {
          logger.warn(`TusServer: Token verification failed in hook fallback: ${err.message}`);
        }
      }
    }
    if (!userId) {
      userId = 'anonymous';
    }

    logger.info(`TusServer: Upload finished. ID: ${upload.id}, Name: ${filename}, Size: ${upload.size} bytes, Owner: ${userId}`);

    // 1. Execute 3-layer file validation
    const validation = await validateFile(filePath, filename, mimeType);
    if (!validation.valid) {
      logger.warn(`TusServer: File validation failed for session ${upload.id}. Reason: ${validation.reason}`);
      
      // Delete temporary file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`TusServer: Cleaned up invalid upload file at ${filePath}`);
      }
      
      throw {
        status_code: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_VALIDATION_FAILED',
            message: `File validation failed: ${validation.reason}`
          }
        })
      };
    }

    // 2. Persist File Metadata inside MongoDB (status: PROCESSING)
    try {
      let ext = path.extname(filename).toLowerCase();
      // Fallback: derive extension from mimeType if filename has none
      if (!ext && mimeType) {
        const mimeExtMap = {
          'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg',
          'image/gif': '.gif', 'text/plain': '.txt', 'application/zip': '.zip',
          'application/msword': '.doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
          'application/vnd.ms-excel': '.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
          'video/mp4': '.mp4', 'audio/mpeg': '.mp3'
        };
        ext = mimeExtMap[mimeType] || '.bin';
      }
      const sanitized = sanitizeFilename(filename);

      // Check if a file with the same name and owner already exists and is active
      const existingFile = await fileRepo.model.findOne({
        ownerId: userId,
        originalName: filename,
        status: 'ACTIVE',
        isLatestVersion: true
      });

      let versionNumber = 1;
      let previousVersionId = null;

      if (existingFile) {
        versionNumber = (existingFile.versionNumber || 1) + 1;
        previousVersionId = existingFile.fileId;
        // Mark existing file as not latest version
        await fileRepo.model.findOneAndUpdate(
          { fileId: existingFile.fileId },
          { $set: { isLatestVersion: false } }
        );
      }

      const fileRecord = await fileRepo.create({
        fileId: upload.id, // Using Tus Upload ID as the unique File ID
        ownerId: userId,
        originalName: filename,
        sanitizedName: sanitized,
        mimeType: mimeType,
        extension: ext,
        fileSize: upload.size,
        status: 'PROCESSING',
        versionNumber,
        previousVersionId,
        storageProvider: env.STORAGE_PROVIDER
      });

      // Hook async audit log
      try {
        const auditLogServiceModule = await import('../../services/auditLogService.js');
        auditLogServiceModule.default.log(
          userId,
          'UPLOAD_FILE',
          fileRecord.fileId,
          { originalName: filename, fileSize: upload.size, versionNumber },
          '127.0.0.1',
          'Tus Ingestion Engine'
        );
      } catch (err) {
        logger.error('Failed to log audit event:', err);
      }

      logger.info(`TusServer: File metadata record created in DB. ID: ${fileRecord.fileId}, Status: PROCESSING`);

      // 3. Enqueue background chunking and storage job
      await fileProcessingQueue.add('chunk-file', {
        fileId: upload.id,
        tempFilePath: filePath,
        userId
      });
      logger.info(`TusServer: Enqueued file-processing job for File: ${upload.id}`);
    } catch (err) {
      logger.error(`TusServer: Failed to write file metadata for session ${upload.id}:`, err);
      // Clean up local temp file on database write failure
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw {
        status_code: 500,
        body: 'Failed to persist upload metadata.'
      };
    }
  }
});

// Configure base event logging triggers
tusServer.on(EVENTS.POST_CREATE, (req, upload, url) => {
  logger.info(`TusServer: Upload session created. ID: ${upload.id}, Length: ${upload.size} bytes`);
});

tusServer.on(EVENTS.POST_RECEIVE, (req, upload) => {
  logger.debug(`TusServer: Chunk received for session: ${upload.id}. Offset: ${upload.offset} bytes`);
});

tusServer.on(EVENTS.POST_TERMINATE, (req, res, id) => {
  logger.info(`TusServer: Upload session terminated by client. ID: ${id}`);
});

export default tusServer;
export { tusServer, uploadDir };
