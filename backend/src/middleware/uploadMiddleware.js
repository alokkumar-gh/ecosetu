// EcoSetu File Upload & Multipart Middleware
// Canonical Reference: docs/13_SECURITY_PRIVACY.md Section 6, docs/05_API_SPECIFICATION.md Section 11

const AppError = require('../utils/AppError');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const WEBP_RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]); // 'RIFF'
const WEBP_TAG = Buffer.from([0x57, 0x45, 0x42, 0x50]);  // 'WEBP'

/**
 * Parses raw multipart/form-data stream to extract image file without external dependencies
 */
function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let currentPos = 0;
  let file = null;
  const fields = {};

  while (currentPos < buffer.length) {
    const start = buffer.indexOf(boundaryBuffer, currentPos);
    if (start === -1) break;

    const afterBoundary = start + boundaryBuffer.length;
    if (buffer.slice(afterBoundary, afterBoundary + 2).toString() === '--') {
      break;
    }

    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), afterBoundary);
    if (headerEnd === -1) break;

    const headerStr = buffer.slice(afterBoundary, headerEnd).toString('latin1');
    const nameMatch = headerStr.match(/name="([^"]+)"/i);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
    const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

    const contentStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(Buffer.from(`\r\n--${boundary}`), contentStart);
    if (nextBoundary === -1) break;

    if (filenameMatch && filenameMatch[1]) {
      const filename = filenameMatch[1];
      const mimetype = typeMatch ? typeMatch[1].trim().toLowerCase() : 'image/jpeg';
      const fileBuffer = buffer.slice(contentStart, nextBoundary);
      file = { filename, mimetype, buffer: fileBuffer };
    } else if (nameMatch && nameMatch[1]) {
      const fieldName = nameMatch[1];
      const fieldValue = buffer.slice(contentStart, nextBoundary).toString('utf8');
      fields[fieldName] = fieldValue;
    }

    currentPos = nextBoundary;
  }

  return { file, fields };
}

/**
 * Express middleware to capture and validate uploaded image files up to 10MB
 */
function handleImageUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';

  // Only run for multipart or raw image
  if (!contentType.includes('multipart/form-data') && !contentType.startsWith('image/')) {
    return next();
  }

  const chunks = [];
  let totalLength = 0;

  req.on('data', (chunk) => {
    totalLength += chunk.length;
    if (totalLength > MAX_FILE_SIZE) {
      req.pause();
      return next(AppError.badRequest('File size must be under 10MB'));
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (chunks.length === 0) {
      return next();
    }

    const fullBuffer = Buffer.concat(chunks);

    if (contentType.includes('multipart/form-data')) {
      const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = match ? (match[1] || match[2]) : null;

      if (!boundary) {
        return next(AppError.badRequest('Invalid multipart boundary'));
      }

      const { file, fields } = parseMultipart(fullBuffer, boundary);
      if (file) {
        req.file = file;
      }
      if (fields && Object.keys(fields).length > 0) {
        req.body = { ...req.body, ...fields };
      }
    } else {
      // Raw image payload
      req.file = {
        filename: 'upload.jpg',
        mimetype: contentType.toLowerCase(),
        buffer: fullBuffer,
      };
    }

    next();
  });

  req.on('error', (err) => {
    next(err);
  });
}

/**
 * Validates req.file according to docs/13_SECURITY_PRIVACY.md Section 6
 */
function validateImageFile(file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw AppError.badRequest('Image file is required');
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    throw AppError.badRequest('File size must be under 10MB');
  }

  const filename = file.filename || '';
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

  if (ext && !allowedExts.includes(ext)) {
    throw AppError.badRequest('Only JPEG, PNG, and WebP images are accepted');
  }

  const mimetype = (file.mimetype || '').toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedMimes.includes(mimetype)) {
    throw AppError.badRequest('Only JPEG, PNG, and WebP images are accepted');
  }

  // Magic bytes verification
  const isJpeg = file.buffer.length >= 3 && file.buffer.slice(0, 3).equals(JPEG_MAGIC);
  const isPng = file.buffer.length >= 4 && file.buffer.slice(0, 4).equals(PNG_MAGIC);
  const isWebp =
    file.buffer.length >= 12 &&
    file.buffer.slice(0, 4).equals(WEBP_RIFF) &&
    file.buffer.slice(8, 12).equals(WEBP_TAG);

  if (!isJpeg && !isPng && !isWebp) {
    throw AppError.badRequest('Corrupted or invalid image file signature');
  }

  if ((mimetype.includes('jpeg') || ext === 'jpg' || ext === 'jpeg') && !isJpeg) {
    throw AppError.badRequest('File content does not match JPEG format');
  }

  if ((mimetype.includes('png') || ext === 'png') && !isPng) {
    throw AppError.badRequest('File content does not match PNG format');
  }

  if ((mimetype.includes('webp') || ext === 'webp') && !isWebp) {
    throw AppError.badRequest('File content does not match WebP format');
  }

  return true;
}

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // '%PDF-'

/**
 * Validates req.file for identity/verification documents (PDF, JPG, PNG, WebP)
 */
function validateDocumentFile(file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw AppError.badRequest('Document file is required');
  }

  if (file.buffer.length > MAX_FILE_SIZE) {
    throw AppError.badRequest('File size must be under 10MB');
  }

  const filename = file.filename || '';
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

  if (ext && !allowedExts.includes(ext)) {
    throw AppError.badRequest('Only JPG, PNG, WebP, and PDF documents are accepted');
  }

  const mimetype = (file.mimetype || '').toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

  if (!allowedMimes.includes(mimetype)) {
    throw AppError.badRequest('Only JPG, PNG, WebP, and PDF documents are accepted');
  }

  const isJpeg = file.buffer.length >= 3 && file.buffer.slice(0, 3).equals(JPEG_MAGIC);
  const isPng = file.buffer.length >= 4 && file.buffer.slice(0, 4).equals(PNG_MAGIC);
  const isWebp =
    file.buffer.length >= 12 &&
    file.buffer.slice(0, 4).equals(WEBP_RIFF) &&
    file.buffer.slice(8, 12).equals(WEBP_TAG);
  const isPdf = file.buffer.length >= 5 && file.buffer.slice(0, 5).equals(PDF_MAGIC);

  if (!isJpeg && !isPng && !isWebp && !isPdf) {
    throw AppError.badRequest('Corrupted or invalid document file signature');
  }

  return true;
}

module.exports = {
  handleImageUpload,
  validateImageFile,
  validateDocumentFile,
  MAX_FILE_SIZE,
};
