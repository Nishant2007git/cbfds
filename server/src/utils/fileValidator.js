import fs from 'fs';
import path from 'path';
import logger from './logger.js';

const BLOCKED_EXTENSIONS = ['.exe', '.msi', '.dll', '.bat', '.cmd', '.sh', '.dmg', '.bin', '.elf', '.scr'];
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msi',
  'application/x-dosexec',
  'application/x-sh',
  'application/x-apple-diskimage',
  'application/octet-stream' // checked strictly via magic bytes
];

/**
 * 3-Layer File Validation Utility
 * @param {string} filePath - Absolute path to temporary uploaded file.
 * @param {string} originalName - User's original filename.
 * @param {string} mimeType - Declared request MIME type.
 * @returns {Promise<{valid: boolean, reason: string|null}>}
 */
export const validateFile = async (filePath, originalName, mimeType) => {
  try {
    // Layer 1: Extension Check
    const ext = path.extname(originalName).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      logger.warn(`File Validation Failure: Blocked extension [${ext}] for file: ${originalName}`);
      return { valid: false, reason: 'FILE_EXTENSION_BLOCKED' };
    }

    // Layer 2: MIME Type Check
    if (BLOCKED_MIME_TYPES.includes(mimeType.toLowerCase()) && mimeType.toLowerCase() !== 'application/octet-stream') {
      logger.warn(`File Validation Failure: Blocked MIME type [${mimeType}] for file: ${originalName}`);
      return { valid: false, reason: 'FILE_MIME_BLOCKED' };
    }

    // Layer 3: Magic Bytes Check (File Signature Verification)
    if (!fs.existsSync(filePath)) {
      return { valid: false, reason: 'FILE_NOT_FOUND' };
    }

    const fd = await fs.promises.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(8);
      await fd.read(buffer, 0, 8, 0);

      // PE Executable (EXE/DLL): "MZ" (0x4d, 0x5a) at offset 0
      if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
        logger.warn(`File Validation Failure: PE Executable magic bytes detected for: ${originalName}`);
        return { valid: false, reason: 'FILE_SIGNATURE_PE' };
      }

      // ELF Executable: 0x7f 0x45 0x4c 0x46 ("\x7fELF")
      if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
        logger.warn(`File Validation Failure: ELF Executable magic bytes detected for: ${originalName}`);
        return { valid: false, reason: 'FILE_SIGNATURE_ELF' };
      }

      // MSI / Compound File Binary: D0 CF 11 E0 A1 B1 1A E1
      if (
        buffer[0] === 0xd0 && buffer[1] === 0xcf &&
        buffer[2] === 0x11 && buffer[3] === 0xe0 &&
        buffer[4] === 0xa1 && buffer[5] === 0xb1 &&
        buffer[6] === 0x1a && buffer[7] === 0xe1
      ) {
        logger.warn(`File Validation Failure: MSI Compound magic bytes detected for: ${originalName}`);
        return { valid: false, reason: 'FILE_SIGNATURE_MSI' };
      }

      // Script files starting with shebang: "#!" (0x23, 0x21)
      if (buffer[0] === 0x23 && buffer[1] === 0x21) {
        logger.warn(`File Validation Failure: Shebang script header detected for: ${originalName}`);
        return { valid: false, reason: 'FILE_SIGNATURE_SCRIPT' };
      }
    } finally {
      await fd.close();
    }

    return { valid: true, reason: null };
  } catch (err) {
    logger.error(`Error executing 3-layer file validation for ${originalName}:`, err);
    return { valid: false, reason: 'VALIDATION_EXECUTION_ERROR' };
  }
};

export default validateFile;
