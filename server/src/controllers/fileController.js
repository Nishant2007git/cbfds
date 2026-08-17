import FileRepository from '../repositories/fileRepository.js';
import QuotaService from '../services/quotaService.js';
import DownloadService from '../services/downloadService.js';
import { NotFoundError, AuthenticationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

class FileController {
  constructor(
    fileRepo = new FileRepository(),
    quotaService = new QuotaService(),
    downloadService = new DownloadService()
  ) {
    this.fileRepo = fileRepo;
    this.quotaService = quotaService;
    this.downloadService = downloadService;
  }

  // List all active files for the authenticated user
  listFiles = async (req, res, next) => {
    try {
      const ownerId = req.user.userId;
      const { page, limit } = req.query;

      // Auto-heal stuck PROCESSING files for this user
      try {
        const stuckFiles = await this.fileRepo.model.find({
          ownerId,
          status: 'PROCESSING'
        });

        if (stuckFiles.length > 0) {
          const ChunkModel = (await import('../models/Chunk.js')).default;
          const uploadDir = (await import('../providers/storage/tusServer.js')).uploadDir;
          const fs = (await import('fs')).default;
          const path = (await import('path')).default;

          for (const file of stuckFiles) {
            const chunkCount = await ChunkModel.countDocuments({ fileId: file.fileId });
            if (chunkCount > 0) {
              await this.fileRepo.model.findOneAndUpdate(
                { fileId: file.fileId },
                { $set: { status: 'ACTIVE', totalChunks: chunkCount } }
              );
            } else {
              // Check if temp file still exists on disk to trigger chunking
              const tempPath = path.resolve(uploadDir, file.fileId);
              if (fs.existsSync(tempPath)) {
                const ChunkingService = (await import('../services/chunkingService.js')).default;
                const chunkService = new ChunkingService();
                chunkService.chunkAndStore(file.fileId, tempPath, ownerId).catch(err => {
                  logger.warn(`Auto-heal chunking error for ${file.fileId}: ${err.message}`);
                });
              } else {
                // If created more than 20 seconds ago and no chunks & no temp file -> mark ERROR
                const ageMs = Date.now() - new Date(file.createdAt).getTime();
                if (ageMs > 20000) {
                  await this.fileRepo.model.findOneAndUpdate(
                    { fileId: file.fileId },
                    { $set: { status: 'ERROR', statusMessage: 'Upload incomplete. Please re-upload this file.' } }
                  );
                }
              }
            }
          }
        }
      } catch (healErr) {
        logger.warn(`Non-blocking file auto-heal warning: ${healErr.message}`);
      }

      const result = await this.fileRepo.listByOwner(ownerId, { page, limit });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  // Soft delete a file and free user storage quota
  deleteFile = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;

      const file = await this.fileRepo.findById(fileId);
      if (!file || file.status === 'DELETED') {
        throw new NotFoundError('File not found.');
      }

      // Ensure ownership check (only owner or admin can delete)
      if (file.ownerId !== userId && req.user.role !== 'admin') {
        throw new AuthenticationError('Unauthorized to delete this file.', 'AUTH_UNAUTHORIZED');
      }

      // Soft delete: update status to DELETED
      await this.fileRepo.updateStatus(fileId, 'DELETED');

      // Decrement storage quota
      await this.quotaService.decrementStorageUsed(file.ownerId, file.fileSize);

      // Hook async audit log
      const auditLogServiceModule = await import('../services/auditLogService.js');
      auditLogServiceModule.default.log(
        userId,
        'DELETE_FILE',
        fileId,
        { originalName: file.originalName, fileSize: file.fileSize },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      );

      logger.info(`FileController: Soft deleted file ${fileId} for user ${file.ownerId}`);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  };

  // Chunk-by-chunk download stream with range support
  downloadFile = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;

      const file = await this.fileRepo.findById(fileId);
      if (!file || file.status === 'DELETED') {
        throw new NotFoundError('File not found.');
      }

      // Ensure ownership check
      if (file.ownerId !== userId && req.user.role !== 'admin') {
        throw new AuthenticationError('Unauthorized to download this file.', 'AUTH_UNAUTHORIZED');
      }

      // Parse range headers
      let range = null;
      if (req.headers.range) {
        const parts = req.headers.range.replace(/bytes=/, "").split("-");
        range = {
          start: parseInt(parts[0], 10),
          end: parts[1] ? parseInt(parts[1], 10) : undefined
        };
      }

      // Hook async audit log only on initial download start to prevent chunk logging loops
      if (!req.headers.range || (range && range.start === 0)) {
        const auditLogServiceModule = await import('../services/auditLogService.js');
        auditLogServiceModule.default.log(
          userId,
          'DOWNLOAD_FILE',
          fileId,
          { originalName: file.originalName, fileSize: file.fileSize },
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || 'Unknown'
        );
      }

      const result = await this.downloadService.downloadFile(fileId, { range });

      // Write range response status or full response status
      res.writeHead(result.isPartial ? 206 : 200, result.headers);
      result.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  // Get all versions of a specific file
  getFileVersions = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;
      
      const file = await this.fileRepo.findById(fileId);
      if (!file) {
        throw new NotFoundError('File not found.');
      }
      
      if (file.ownerId !== userId && req.user.role !== 'admin') {
        throw new AuthenticationError('Unauthorized.', 'AUTH_UNAUTHORIZED');
      }
      
      const versions = await this.fileRepo.model.find({
        ownerId: file.ownerId,
        originalName: file.originalName,
        status: { $ne: 'DELETED' }
      }).sort({ versionNumber: -1 });
      
      res.status(200).json({
        success: true,
        data: versions
      });
    } catch (err) {
      next(err);
    }
  };

  // Restore a historical version to make it the latest active version
  restoreVersion = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;
      
      const fileToRestore = await this.fileRepo.findById(fileId);
      if (!fileToRestore || fileToRestore.status === 'DELETED') {
        throw new NotFoundError('File version not found.');
      }
      
      if (fileToRestore.ownerId !== userId && req.user.role !== 'admin') {
        throw new AuthenticationError('Unauthorized.', 'AUTH_UNAUTHORIZED');
      }
      
      // Set all matching name versions to isLatestVersion = false
      await this.fileRepo.model.updateMany(
        { ownerId: fileToRestore.ownerId, originalName: fileToRestore.originalName },
        { $set: { isLatestVersion: false } }
      );
      
      // Set this specific version to isLatestVersion = true
      fileToRestore.isLatestVersion = true;
      await fileToRestore.save();

      // Hook async audit log
      const auditLogServiceModule = await import('../services/auditLogService.js');
      auditLogServiceModule.default.log(
        userId,
        'RESTORE_FILE',
        fileId,
        { originalName: fileToRestore.originalName, fileSize: fileToRestore.fileSize, restoredVersion: fileToRestore.versionNumber },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      );
      
      logger.info(`FileController: Restored version ${fileToRestore.versionNumber} of file ${fileToRestore.originalName} (ID: ${fileId})`);
      
      res.status(200).json({
        success: true,
        message: 'File version restored successfully.',
        data: fileToRestore
      });
    } catch (err) {
      next(err);
    }
  };

  // List all soft-deleted files
  listTrashFiles = async (req, res, next) => {
    try {
      const ownerId = req.user.userId;
      const trashFiles = await this.fileRepo.model.find({
        ownerId,
        status: 'DELETED'
      }).sort({ deletedAt: -1 });
      
      res.status(200).json({
        success: true,
        data: trashFiles
      });
    } catch (err) {
      next(err);
    }
  };

  // Restore a soft-deleted file from the trash
  restoreFromTrash = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;
      
      const file = await this.fileRepo.findById(fileId);
      if (!file || file.status !== 'DELETED') {
        throw new NotFoundError('File not found in trash.');
      }
      
      if (file.ownerId !== userId && req.user.role !== 'admin') {
        throw new AuthenticationError('Unauthorized.', 'AUTH_UNAUTHORIZED');
      }
      
      // Update status back to ACTIVE
      await this.fileRepo.updateStatus(fileId, 'ACTIVE');
      
      // Mark this file as isLatestVersion = true, and ensure other versions with the same name are set to false
      await this.fileRepo.model.updateMany(
        { ownerId: file.ownerId, originalName: file.originalName, fileId: { $ne: fileId } },
        { $set: { isLatestVersion: false } }
      );
      
      file.isLatestVersion = true;
      await file.save();

      // Re-increment user storage used
      await this.quotaService.incrementStorageUsed(file.ownerId, file.fileSize);
      
      // Hook async audit log
      const auditLogServiceModule = await import('../services/auditLogService.js');
      auditLogServiceModule.default.log(
        userId,
        'RESTORE_FILE',
        fileId,
        { originalName: file.originalName, fileSize: file.fileSize, restoredFromTrash: true },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      );

      logger.info(`FileController: Restored file ${fileId} from trash for user ${file.ownerId}`);
      
      res.status(200).json({
        success: true,
        message: 'File restored from trash successfully.'
      });
    } catch (err) {
      next(err);
    }
  };

  // Permanently delete a file (hard delete metadata + chunks)
  deletePermanently = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;
      
      const file = await this.fileRepo.findById(fileId);
      if (!file) {
        throw new NotFoundError('File not found.');
      }
      
      if (file.ownerId !== userId && req.user.role !== 'admin') {
        throw new AuthenticationError('Unauthorized.', 'AUTH_UNAUTHORIZED');
      }
      
      // Delete chunks from storage provider
      const ChunkRepositoryModule = await import('../repositories/chunkRepository.js');
      const chunkRepo = new ChunkRepositoryModule.default();
      const chunks = await chunkRepo.model.find({ fileId });
      
      const StorageFactoryModule = await import('../providers/storage/storageFactory.js');
      const storageProvider = await StorageFactoryModule.default.create();
      const bucket = process.env.STORAGE_BUCKET || 'cbfds-chunks';
      
      for (const chunk of chunks) {
        try {
          await storageProvider.deleteObject(bucket, chunk.storageKey);
        } catch (err) {
          logger.error(`FileController: Failed to delete chunk object ${chunk.storageKey}:`, err);
        }
      }
      
      // Delete chunk documents from db
      await chunkRepo.model.deleteMany({ fileId });
      
      // Delete file document from db
      await this.fileRepo.deletePermanent(fileId);
      
      // Hook async audit log
      const auditLogServiceModule = await import('../services/auditLogService.js');
      auditLogServiceModule.default.log(
        userId,
        'PERMANENT_DELETE',
        fileId,
        { originalName: file.originalName, fileSize: file.fileSize },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      );

      logger.info(`FileController: Permanently deleted file ${fileId} from database and storage.`);
      
      res.status(200).json({
        success: true,
        message: 'File permanently deleted.'
      });
    } catch (err) {
      next(err);
    }
  };

  // Update tags on a file
  updateTags = async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const { tags } = req.body;
      const userId = req.user.userId;

      const file = await this.fileRepo.findById(fileId);
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found.' });
      }

      if (file.ownerId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized to modify this file.' });
      }

      const updatedFile = await this.fileRepo.model.findOneAndUpdate(
        { fileId },
        { $set: { tags: tags || [] } },
        { new: true }
      );

      res.status(200).json({
        success: true,
        data: updatedFile
      });
    } catch (err) {
      next(err);
    }
  };
}

export default FileController;
export { FileController };
