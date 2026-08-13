import ShareLink from '../models/ShareLink.js';

class ShareRepository {
  constructor(shareModel = ShareLink) {
    this.model = shareModel;
  }

  async create(shareData) {
    const share = new this.model(shareData);
    return share.save();
  }

  async findById(shareId) {
    return this.model.findOne({ shareId });
  }

  async findActiveByFileId(fileId) {
    return this.model.find({
      fileId,
      isRevoked: false,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  }

  /**
   * Revoke expired share links or links exceeding download limits.
   * Updates isRevoked to true.
   * @returns {Promise<number>} Number of links updated.
   */
  async revokeExpiredAndExceeded() {
    const now = new Date();
    
    // Find shares that are expired or exceed download counts but are not marked revoked yet
    const result = await this.model.updateMany(
      {
        isRevoked: false,
        $or: [
          { expiresAt: { $lt: now } },
          { 
            $and: [
              { downloadLimit: { $ne: null } },
              { $expr: { $gte: ["$downloadCount", "$downloadLimit"] } }
            ]
          }
        ]
      },
      { $set: { isRevoked: true } }
    );
    
    return result.modifiedCount;
  }

  async deletePermanent(shareId) {
    return this.model.deleteOne({ shareId });
  }

  async findByRecipientEmail(email) {
    return this.model.find({ recipientEmail: email.toLowerCase() });
  }

  async findByCreatorId(userId) {
    return this.model.find({ creatorId: userId });
  }

  async update(shareId, updateData) {
    return this.model.findOneAndUpdate(
      { shareId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }
}

export default ShareRepository;
export { ShareRepository };
