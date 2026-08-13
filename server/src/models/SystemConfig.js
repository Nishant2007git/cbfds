import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  collection: 'systemConfig'
});

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
export default SystemConfig;
export { systemConfigSchema };
