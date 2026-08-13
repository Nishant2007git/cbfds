import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const chunkSchema = new mongoose.Schema({
  chunkId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  fileId: {
    type: String,
    required: true,
    ref: 'File'
  },
  chunkNumber: {
    type: Number,
    required: true,
    min: 0
  },
  chunkSize: {
    type: Number,
    required: true
  },
  checksum: {
    type: String,
    required: true
  },
  storageKey: {
    type: String,
    required: true // Format: {userId}/{fileId}/chunks/{chunkNumber_zero_padded}
  },
  storageBucket: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['STORED', 'VERIFIED', 'CORRUPTED', 'DELETED'],
    default: 'STORED'
  }
}, {
  timestamps: true,
  collection: 'chunks'
});

const Chunk = mongoose.model('Chunk', chunkSchema);
export default Chunk;
export { chunkSchema };
