import Chunk from '../models/Chunk.js';

class ChunkRepository {
  constructor(chunkModel = Chunk) {
    this.model = chunkModel;
  }

  async create(chunkData) {
    const chunk = new this.model(chunkData);
    return chunk.save();
  }

  async findByFileId(fileId) {
    return this.model.find({ fileId }).sort({ chunkNumber: 1 });
  }

  async deleteByFileId(fileId) {
    return this.model.deleteMany({ fileId });
  }
}

export default ChunkRepository;
export { ChunkRepository };
