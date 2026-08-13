import RefreshToken from '../models/RefreshToken.js';

class RefreshTokenRepository {
  constructor(tokenModel = RefreshToken) {
    this.model = tokenModel;
  }

  async findByHash(tokenHash) {
    return this.model.findOne({ tokenHash });
  }

  async create(tokenData) {
    const token = new this.model(tokenData);
    return token.save();
  }

  async revokeByHash(tokenHash) {
    return this.model.findOneAndUpdate(
      { tokenHash },
      { $set: { isRevoked: true } },
      { new: true }
    );
  }

  async revokeAllByUserId(userId) {
    return this.model.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    );
  }

  async findActiveByUserId(userId) {
    return this.model.find({ userId, isRevoked: false, expiresAt: { $gt: new Date() } });
  }
}

export default RefreshTokenRepository;
