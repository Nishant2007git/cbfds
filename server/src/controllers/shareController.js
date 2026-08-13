import jwt from 'jsonwebtoken';
import ShareService from '../services/shareService.js';
import DownloadService from '../services/downloadService.js';
import env from '../config/env.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const shareService = new ShareService();
const downloadService = new DownloadService();

class ShareController {
  /**
   * Create a new file share link (Internal or External).
   */
  async createShare(req, res, next) {
    const { fileId, shareType, recipientEmail, password, expiresAt, downloadLimit, selfDestruct } = req.body;
    const userId = req.user.userId;

    if (!fileId || !shareType) {
      return next(new AppError('fileId and shareType are required fields.', 400, 'VALIDATION_FAILED'));
    }

    try {
      const share = await shareService.createShareLink({
        fileId,
        userId,
        type: shareType,
        password,
        expiresAt,
        downloadLimit,
        recipientEmail,
        selfDestruct
      });

      // Hook async audit log
      const auditLogServiceModule = await import('../services/auditLogService.js');
      auditLogServiceModule.default.log(
        userId,
        'CREATE_SHARE',
        fileId,
        { shareId: share.shareId, type: shareType, recipientEmail },
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      );

      // Construct a convenient download URL for response
      const downloadUrl = `${env.APP_URL}/api/${env.API_VERSION}/share/${share.shareId}/download`;

      return res.status(201).json({
        success: true,
        data: {
          shareId: share.shareId,
          fileId: share.fileId,
          type: share.type,
          recipientEmail: share.recipientEmail,
          expiresAt: share.expiresAt,
          downloadLimit: share.downloadLimit,
          downloadCount: share.downloadCount,
          isRevoked: share.isRevoked,
          selfDestruct: share.selfDestruct,
          downloadUrl
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all share links initiated by the current user.
   */
  async listOutgoingShares(req, res, next) {
    try {
      const shares = await shareService.getOutgoingShares(req.user.userId);
      return res.status(200).json({
        success: true,
        data: shares
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all files shared internally with the current user.
   */
  async listIncomingShares(req, res, next) {
    try {
      const shares = await shareService.getIncomingShares(req.user.email);
      return res.status(200).json({
        success: true,
        data: shares
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve specific share link details.
   */
  async getShare(req, res, next) {
    const { shareId } = req.params;
    try {
      const share = await shareService.getShareDetails(shareId, req.user.userId);
      return res.status(200).json({
        success: true,
        data: share
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Manually revoke a share link.
   */
  async revokeShare(req, res, next) {
    const { shareId } = req.params;
    try {
      const share = await shareService.shareRepo.findById(shareId);
      await shareService.revokeShare(shareId, req.user.userId);

      // Hook async audit log
      if (share) {
        const auditLogServiceModule = await import('../services/auditLogService.js');
        auditLogServiceModule.default.log(
          req.user.userId,
          'REVOKE_SHARE',
          share.fileId,
          { shareId },
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || 'Unknown'
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Share link successfully revoked.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Endpoint: Retrieve share details (Public Metadata Context).
   */
  async getPublicShareContext(req, res, next) {
    const { token } = req.params;
    try {
      const context = await shareService.getPublicShareContext(token);
      return res.status(200).json({
        success: true,
        data: context
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Endpoint: Verify access password for external shared links.
   * Returns a temporary session token.
   */
  async verifyPublicShare(req, res, next) {
    const { token } = req.params;
    const { password } = req.body;

    try {
      await shareService.verifySharePassword(token, password);

      // Generate a short-lived session token (expires in 1 hour)
      const sessionToken = jwt.sign(
        { shareId: token, verified: true },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        success: true,
        data: {
          sessionToken
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Endpoint: Reconstruct chunks sequentially and stream the file payload.
   */
  async downloadPublicShare(req, res, next) {
    const { token } = req.params;
    const { sessionToken } = req.query;

    try {
      // 1. Fetch public context & check password requirement
      const context = await shareService.getPublicShareContext(token);
      
      if (context.passwordRequired) {
        if (!sessionToken) {
          throw new AppError('Password verification session token is required.', 401, 'SESSION_TOKEN_REQUIRED');
        }

        try {
          const decoded = jwt.verify(sessionToken, env.JWT_SECRET);
          if (decoded.shareId !== token || !decoded.verified) {
            throw new AppError('Invalid verification session token.', 401, 'INVALID_SESSION_TOKEN');
          }
        } catch (jwtErr) {
          throw new AppError('Session token expired or invalid.', 401, 'INVALID_SESSION_TOKEN');
        }
      }

      // 2. Parse HTTP Range header if requested by client
      let range = null;
      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;
        range = { start, end };
      }

      // 3. Resolve share link document to obtain file ID
      const share = await shareService.shareRepo.findById(token);

      // 4. Retrieve streaming reconstructed pipeline
      const { stream, fileRecord, isPartial, headers } = await downloadService.downloadFile(share.fileId, { range });

      // Hook async audit log only on initial download start to prevent chunk loops
      if (!rangeHeader || (range && range.start === 0)) {
        const auditLogServiceModule = await import('../services/auditLogService.js');
        auditLogServiceModule.default.log(
          share.creatorId, // Log under the owner's event scope
          'DOWNLOAD_FILE',
          share.fileId,
          { originalName: fileRecord.originalName, fileSize: fileRecord.fileSize, sharedLinkDownload: true, shareId: token },
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || 'Unknown'
        );
      }

      // 5. Update download metrics
      await shareService.recordDownload(token);

      // 6. Pipe reconstructed stream to output response
      res.writeHead(isPartial ? 206 : 200, {
        ...headers,
        'Content-Disposition': `attachment; filename="${fileRecord.originalName}"`
      });

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export default new ShareController();
export { ShareController };
