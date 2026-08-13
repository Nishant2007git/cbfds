import User from '../models/User.js';

class UserRepository {
  constructor(userModel = User) {
    this.model = userModel;
  }

  async findById(userId) {
    return this.model.findOne({ userId });
  }

  async findByEmail(email) {
    return this.model.findOne({ email: email.toLowerCase() });
  }

  async findActiveByEmail(email) {
    return this.model.findActiveByEmail(email);
  }

  async create(userData) {
    const user = new this.model(userData);
    return user.save();
  }

  async update(userId, updateData) {
    return this.model.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async incrementFailedAttempts(userId, lockUntil) {
    const update = {
      $inc: { failedLoginAttempts: 1 }
    };
    if (lockUntil) {
      update.$set = { lockUntil };
    }
    return this.model.findOneAndUpdate({ userId }, update, { new: true });
  }

  async resetFailedAttempts(userId) {
    return this.model.findOneAndUpdate(
      { userId },
      { $set: { failedLoginAttempts: 0, lockUntil: null } },
      { new: true }
    );
  }

  async incrementStorageUsed(userId, bytes) {
    return this.model.findOneAndUpdate(
      { userId },
      { $inc: { storageUsed: bytes } },
      { new: true }
    );
  }

  async listAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const items = await this.model.find().skip(skip).limit(limit).sort({ createdAt: -1 });
    const totalItems = await this.model.countDocuments();
    return {
      items,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }
}

export default UserRepository;
