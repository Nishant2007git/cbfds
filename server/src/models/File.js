import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  ownerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  sanitizedName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extension: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileHash: {
    type: String,
    default: null
  },
  totalChunks: {
    type: Number,
    default: null
  },
  chunkSize: {
    type: Number,
    required: true,
    default: 5242880 // 5 MB in bytes
  },
  status: {
    type: String,
    enum: ['UPLOADING', 'PROCESSING', 'ACTIVE', 'DELETED', 'PENDING_DELETION', 'ERROR'],
    default: 'UPLOADING'
  },
  statusMessage: {
    type: String,
    default: null
  },
  versionNumber: {
    type: Number,
    default: 1
  },
  previousVersionId: {
    type: String,
    ref: 'File',
    default: null
  },
  isLatestVersion: {
    type: Boolean,
    default: true
  },
  activeOperations: {
    type: Number,
    default: 0
  },
  storageProvider: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'files',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual Field: isTrash
fileSchema.virtual('isTrash').get(function() {
  return this.status === 'DELETED';
});

const File = mongoose.model('File', fileSchema);
export default File;
export { fileSchema };
