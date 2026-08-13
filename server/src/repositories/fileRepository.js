import File from '../models/File.js';

class FileRepository {
  constructor(fileModel = File) {
    this.model = fileModel;
  }

  async create(fileData) {
    const file = new this.model(fileData);
    return file.save();
  }

  async findById(fileId) {
    return this.model.findOne({ fileId });
  }

  async updateStatus(fileId, status, statusMessage = null) {
    const update = { status };
    if (statusMessage) {
      update.statusMessage = statusMessage;
    }
    if (status === 'DELETED') {
      update.deletedAt = new Date();
    } else {
      update.deletedAt = null;
    }
    return this.model.findOneAndUpdate(
      { fileId },
      { $set: update },
      { new: true }
    );
  }

  async deletePermanent(fileId) {
    return this.model.deleteOne({ fileId });
  }

  async listByOwner(ownerId, options = {}) {
    const filter = { ownerId, status: { $ne: 'DELETED' }, isLatestVersion: true };
    const limit = parseInt(options.limit, 10) || 50;
    const page = parseInt(options.page, 10) || 1;
    const skip = (page - 1) * limit;

    const items = await this.model.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.model.countDocuments(filter);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export default FileRepository;
export { FileRepository };
