import SystemConfig from '../models/SystemConfig.js';

class SystemConfigRepository {
  constructor(configModel = SystemConfig) {
    this.model = configModel;
  }

  async findByKey(key) {
    return this.model.findOne({ key });
  }

  async setConfig(key, value, description = '', updatedBy = null) {
    return this.model.findOneAndUpdate(
      { key },
      { 
        $set: { 
          value, 
          description, 
          updatedBy 
        } 
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  async listAll() {
    return this.model.find();
  }
}

export default SystemConfigRepository;
export { SystemConfigRepository };
