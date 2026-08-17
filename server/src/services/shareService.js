import bcrypt from 'bcryptjs';
import ShareRepository from '../repositories/shareRepository.js';
import FileRepository from '../repositories/fileRepository.js';
import UserRepository from '../repositories/userRepository.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

class ShareService {
  constructor(
    shareRepo = new ShareRepository(),
    fileRepo = new FileRepository(),
    userRepo = new UserRepository()
  ) {
    this.shareRepo = shareRepo;
    this.fileRepo = fileRepo;
    this.userRepo = userRepo;
  }

  /**
   * Create a new shared link allocation for a file.
   */
  async createShareLink({ fileId, userId, userRole, type, password, expiresAt, downloadLimit, recipientEmail, selfDestruct }) {
    logger.info(`ShareService: Creating share link for File ${fileId} by User ${userId} (Role: ${userRole})`);

    // 1. Verify file existence and ownership
    let file = await this.fileRepo.findById(fileId);
    if (!file && fileId.match(/^[0-9a-fA-F]{24}$/)) {
      file = await this.fileRepo.model.findById(fileId);
    }
    if (!file || file.status === 'DELETED' || file.status === 'PENDING_DELETION') {
      throw new AppError('File not found.', 404, 'FILE_NOT_FOUND');
    }

    if (file.ownerId !== userId && userRole !== 'admin' && userRole !== 'superadmin') {
      throw new AppError('You do not own this file.', 403, 'ACCESS_DENIED');
    }

    // Auto-activate file if chunks or raw file exist
    if (file.status !== 'ACTIVE') {
      const ChunkModel = (await import('../models/Chunk.js')).default;
      const chunkCount = await ChunkModel.countDocuments({ fileId: file.fileId });
      if (chunkCount > 0) {
        await this.fileRepo.model.findOneAndUpdate({ fileId: file.fileId }, { $set: { status: 'ACTIVE', totalChunks: chunkCount } });
        file.status = 'ACTIVE';
      }
    }

    const shareData = {
      fileId: file.fileId,
      creatorId: userId,
      type,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      downloadLimit: downloadLimit || null,
      recipientEmail: null,
      accessKeyHash: null,
      selfDestruct: !!selfDestruct
    };

    // 2. Validate internal share requirements
    if (type === 'INTERNAL') {
      if (!recipientEmail) {
        throw new AppError('Recipient email is required for internal shares.', 400, 'MISSING_RECIPIENT_EMAIL');
      }
      const recipient = await this.userRepo.findByEmail(recipientEmail);
      if (!recipient) {
        throw new AppError('Recipient user not found.', 404, 'RECIPIENT_NOT_FOUND');
      }
      shareData.recipientEmail = recipient.email;
    }

    // 3. Hash external password if provided
    if (type === 'EXTERNAL' && password) {
      const salt = await bcrypt.genSalt(12);
      shareData.accessKeyHash = await bcrypt.hash(password, salt);
    }

    const newShare = await this.shareRepo.create(shareData);
    logger.info(`ShareService: Created share link: ${newShare.shareId} (Type: ${type})`);
    return newShare;
  }

  /**
   * Retrieves user's outgoing shares.
   */
  async getOutgoingShares(userId) {
    const shares = await this.shareRepo.findByCreatorId(userId);
    const sharesWithFiles = [];
    for (const share of shares) {
      const file = await this.fileRepo.findById(share.fileId);
      sharesWithFiles.push({
        ...share.toObject(),
        file: file ? {
          originalName: file.originalName,
          fileSize: file.fileSize,
          status: file.status
        } : null
      });
    }
    return sharesWithFiles;
  }

  /**
   * Retrieves user's incoming shares (internal).
   */
  async getIncomingShares(email) {
    return this.shareRepo.findByRecipientEmail(email);
  }

  /**
   * Retrieves active share details by its ID (internal route).
   */
  async getShareDetails(shareId, userId) {
    const share = await this.shareRepo.findById(shareId);
    if (!share) {
      throw new AppError('Share link not found.', 404, 'SHARE_NOT_FOUND');
    }

    if (share.creatorId !== userId && share.recipientEmail !== userId) {
      // Check file ownership
      const file = await this.fileRepo.findById(share.fileId);
      if (!file || file.ownerId !== userId) {
        throw new AppError('Access denied.', 403, 'ACCESS_DENIED');
      }
    }

    return share;
  }

  /**
   * Public metadata context lookup.
   */
  async getPublicShareContext(shareId) {
    const share = await this.shareRepo.findById(shareId);
    if (!share || share.isRevoked) {
      throw new AppError('Share link not found or revoked.', 404, 'SHARE_NOT_FOUND');
    }

    // Check expiration
    if (share.expiresAt && Date.now() > share.expiresAt.getTime()) {
      await this.shareRepo.update(shareId, { isRevoked: true });
      throw new AppError('This share link has expired.', 410, 'LINK_EXPIRED');
    }

    // Check limits
    if (share.downloadLimit !== null && share.downloadCount >= share.downloadLimit) {
      await this.shareRepo.update(shareId, { isRevoked: true });
      throw new AppError('This share link has met its download limit.', 410, 'DOWNLOAD_LIMIT_EXCEEDED');
    }

    const file = await this.fileRepo.findById(share.fileId);
    if (!file || file.status !== 'ACTIVE') {
      throw new AppError('File not found or inactive.', 404, 'FILE_NOT_FOUND');
    }

    const owner = await this.userRepo.findById(share.creatorId);

    return {
      shareId: share.shareId,
      fileName: file.originalName,
      fileSize: file.fileSize,
      ownerName: owner ? owner.fullName : 'System Owner',
      passwordRequired: !!share.accessKeyHash,
      expiresAt: share.expiresAt
    };
  }

  /**
   * Verifies external link access password.
   * Returns a Boolean indicating success.
   */
  async verifySharePassword(shareId, password) {
    const share = await this.shareRepo.findById(shareId);
    if (!share || share.isRevoked) {
      throw new AppError('Share link not found or revoked.', 404, 'SHARE_NOT_FOUND');
    }

    if (!share.accessKeyHash) {
      return true; // No password protection active
    }

    if (!password) {
      throw new AppError('Password is required.', 400, 'PASSWORD_REQUIRED');
    }

    const isMatch = await bcrypt.compare(password, share.accessKeyHash);
    if (!isMatch) {
      throw new AppError('Incorrect password.', 401, 'INVALID_PASSWORD');
    }

    return true;
  }

  /**
   * Atomically records a download and revokes the link if it exceeds limits.
   */
  async recordDownload(shareId) {
    const updated = await this.shareRepo.model.findOneAndUpdate(
      { shareId },
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (updated) {
      if (updated.selfDestruct || (updated.downloadLimit !== null && updated.downloadCount >= updated.downloadLimit)) {
        await this.shareRepo.update(shareId, { isRevoked: true });
        logger.info(`ShareService: Share link ${shareId} self-destruct or download limit hit. Marked as revoked.`);
      }
    }
  }

  /**
   * Revoke sharing access.
   */
  async revokeShare(shareId, userId) {
    const share = await this.shareRepo.findById(shareId);
    if (!share) {
      throw new AppError('Share link not found.', 404, 'SHARE_NOT_FOUND');
    }

    if (share.creatorId !== userId) {
      throw new AppError('You do not own this share link.', 403, 'ACCESS_DENIED');
    }

    await this.shareRepo.update(shareId, { isRevoked: true });
    logger.info(`ShareService: Share link ${shareId} manually revoked by owner.`);
  }
}

export default ShareService;
export { ShareService };
