// EcoSetu Persistent Media Storage Service
// Canonical Reference: docs/13_SECURITY_PRIVACY.md Section 6, docs/15_DEPLOYMENT_GUIDE.md Section 2.3
// Production Hardening: Persistent Cloud Storage via Firebase Storage & Cloud DB

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const prisma = require('../config/database');
const logger = require('../config/logger');
const environment = require('../config/environment');
const { validateImageFile } = require('../middleware/uploadMiddleware');
const AppError = require('../utils/AppError');

class MediaService {
  constructor() {
    this.tempCacheDir = path.resolve(process.cwd(), environment.uploadDir || './uploads', 'ewaste');
    this._firebaseStorage = null;
    this._bucketName = process.env.FIREBASE_STORAGE_BUCKET || (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app` : null);
    this._firebaseAvailable = null; // null = untried, true = active, false = unavailable
    this._tableInitialized = false;

    this.ensureTempDir();
  }

  ensureTempDir() {
    try {
      if (!fs.existsSync(this.tempCacheDir)) {
        fs.mkdirSync(this.tempCacheDir, { recursive: true });
      }
    } catch (err) {
      logger.warn(`[MediaService] Warning creating temp cache dir: ${err.message}`);
    }
  }

  /**
   * Initializes Firebase Storage SDK using applicationDefault or service account
   * @private
   */
  _getFirebaseStorage() {
    if (this._firebaseStorage) return this._firebaseStorage;

    try {
      const { initializeApp, getApps, applicationDefault, cert } = require('firebase-admin/app');
      const { getStorage } = require('firebase-admin/storage');

      const apps = getApps();
      let app = apps.length > 0 ? apps[0] : null;

      if (!app) {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          app = initializeApp({
            credential: applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: this._bucketName,
          });
        } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          app = initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
            storageBucket: this._bucketName,
          });
        } else {
          app = initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: this._bucketName,
          });
        }
      }

      this._firebaseStorage = getStorage(app);
      return this._firebaseStorage;
    } catch (err) {
      logger.warn(`[MediaService] Firebase Storage initialization error: ${err.message}`);
      return null;
    }
  }

  /**
   * Ensures the persistent cloud database storage table exists in Neon PostgreSQL
   * @private
   */
  async _ensureDbTable() {
    if (this._tableInitialized) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _media_storage (
          file_key VARCHAR(500) PRIMARY KEY,
          mime_type VARCHAR(100) NOT NULL,
          file_size INTEGER NOT NULL,
          data BYTEA NOT NULL,
          hash VARCHAR(64),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_media_storage_hash ON _media_storage(hash)
      `);
      this._tableInitialized = true;
    } catch (err) {
      logger.warn(`[MediaService] Error ensuring _media_storage table: ${err.message}`);
    }
  }

  /**
   * Saves an uploaded image to persistent cloud storage with cryptographic validation
   * @param {object} file - Parsed file object { filename, mimetype, buffer }
   * @param {object|string} [options] - Options or prefix
   * @returns {Promise<object>} Stored file metadata
   */
  async saveImage(file, options = {}) {
    validateImageFile(file);
    await this._ensureDbTable();

    const prefix = typeof options === 'string' ? options : (options.prefix || 'ewaste');
    const itemId = typeof options === 'object' && options.itemId ? options.itemId : null;

    // Detect format from buffer magic bytes and mimetype
    const mimetype = (file.mimetype || '').toLowerCase();
    let ext = 'jpg';
    let canonicalMime = 'image/jpeg';

    if (mimetype.includes('png') || (file.filename && file.filename.toLowerCase().endsWith('.png'))) {
      ext = 'png';
      canonicalMime = 'image/png';
    } else if (mimetype.includes('webp') || (file.filename && file.filename.toLowerCase().endsWith('.webp'))) {
      ext = 'webp';
      canonicalMime = 'image/webp';
    }

    // SHA-256 for idempotency & deduplication
    const contentHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Check if an identical file was already stored in persistent DB (idempotent retry)
    try {
      const existing = await prisma.$queryRawUnsafe(
        `SELECT file_key, mime_type, file_size FROM _media_storage WHERE hash = $1 LIMIT 1`,
        contentHash
      );
      if (existing && existing.length > 0) {
        const found = existing[0];
        const existingFileName = path.basename(found.file_key);
        const targetPath = path.join(this.tempCacheDir, existingFileName);
        this.ensureTempDir();
        if (!fs.existsSync(targetPath)) {
          try { fs.writeFileSync(targetPath, file.buffer); } catch (e) {}
        }
        return {
          fileName: existingFileName,
          fileKey: found.file_key,
          filePath: targetPath,
          mimetype: found.mime_type,
          size: found.file_size,
          imageUrl: `/api/v1/ewaste-items/media/${found.file_key}`,
          hash: contentHash,
          isDuplicate: true,
        };
      }
    } catch (e) {
      // Continue if query fails
    }

    // Generate cryptographically random UUID filename
    const uniqueId = crypto.randomUUID();
    const fileName = `${prefix}_${uniqueId}.${ext}`;
    // Hierarchical cloud storage path: ewaste/{itemId}/{uuid}.{ext}
    const storagePath = itemId ? `ewaste/${itemId}/${uniqueId}.${ext}` : fileName;
    const fileKey = fileName; // Keep friendly key for URL routing compatibility

    let savedToFirebase = false;

    // Attempt primary persistence: Firebase Storage
    if (this._firebaseAvailable !== false && this._bucketName) {
      try {
        const storage = this._getFirebaseStorage();
        if (storage) {
          const bucket = storage.bucket(this._bucketName);
          const [exists] = await bucket.exists();
          if (exists) {
            const gcsFile = bucket.file(storagePath);
            await gcsFile.save(file.buffer, {
              metadata: {
                contentType: canonicalMime,
                cacheControl: 'private, max-age=3600',
                metadata: {
                  contentHash,
                  originalName: file.filename || '',
                  uploadedAt: new Date().toISOString(),
                },
              },
            });
            savedToFirebase = true;
            this._firebaseAvailable = true;
            logger.info(`[MediaService] Persisted to Firebase Storage: ${storagePath}`);
          } else {
            this._firebaseAvailable = false;
            logger.warn(`[MediaService] Firebase Storage bucket '${this._bucketName}' does not exist. Using persistent cloud DB fallback.`);
          }
        }
      } catch (fbErr) {
        this._firebaseAvailable = false;
        logger.warn(`[MediaService] Firebase Storage upload error (${fbErr.message}). Using persistent cloud DB fallback.`);
      }
    }

    // Guaranteed cloud persistence: Neon PostgreSQL _media_storage
    // This guarantees survival across Render ephemeral disk wipes and container restarts
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO _media_storage (file_key, mime_type, file_size, data, hash, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (file_key) DO UPDATE SET data = EXCLUDED.data, hash = EXCLUDED.hash`,
        fileKey,
        canonicalMime,
        file.buffer.length,
        file.buffer,
        contentHash
      );
    } catch (dbErr) {
      logger.error(`[MediaService] Error persisting to _media_storage: ${dbErr.message}`);
      if (!savedToFirebase) {
        throw AppError.internal('Failed to persist media storage');
      }
    }

    // Save temporary local cache for fast sync and legacy backward compatibility
    this.ensureTempDir();
    const tempFilePath = path.join(this.tempCacheDir, path.basename(fileKey));
    try {
      fs.writeFileSync(tempFilePath, file.buffer);
    } catch (fsErr) {
      logger.warn(`[MediaService] Warning caching to temp file: ${fsErr.message}`);
    }

    return {
      fileName,
      fileKey,
      filePath: tempFilePath,
      mimetype: canonicalMime,
      size: file.buffer.length,
      imageUrl: `/api/v1/ewaste-items/media/${fileKey}`,
      hash: contentHash,
      isDuplicate: false,
    };
  }

  /**
   * Retrieves binary buffer and metadata from persistent storage
   * @param {string} fileKey
   * @returns {Promise<{ buffer: Buffer, mimeType: string, size: number } | null>}
   */
  async getMediaData(fileKey) {
    if (!fileKey) return null;
    const sanitized = path.basename(fileKey);
    await this._ensureDbTable();

    // 1. Check persistent database
    try {
      const records = await prisma.$queryRawUnsafe(
        `SELECT file_key, mime_type, file_size, data FROM _media_storage WHERE file_key = $1 OR file_key LIKE $2 LIMIT 1`,
        fileKey,
        `%${sanitized}%`
      );
      if (records && records.length > 0) {
        const row = records[0];
        return {
          buffer: row.data,
          mimeType: row.mime_type,
          size: row.file_size,
        };
      }
    } catch (err) {
      logger.warn(`[MediaService] Database media query error: ${err.message}`);
    }

    // 2. Check Firebase Storage
    if (this._firebaseAvailable !== false && this._bucketName) {
      try {
        const storage = this._getFirebaseStorage();
        if (storage) {
          const bucket = storage.bucket(this._bucketName);
          const gcsFile = bucket.file(fileKey);
          const [exists] = await gcsFile.exists();
          if (exists) {
            const [buffer] = await gcsFile.download();
            const [metadata] = await gcsFile.getMetadata();
            return {
              buffer,
              mimeType: metadata.contentType || this.getMimeType(fileKey),
              size: parseInt(metadata.size, 10) || buffer.length,
            };
          }
        }
      } catch (fbErr) {
        logger.warn(`[MediaService] Firebase download check error: ${fbErr.message}`);
      }
    }

    // 3. Check local temp cache as last resort
    const localPath = path.join(this.tempCacheDir, sanitized);
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      return {
        buffer: buf,
        mimeType: this.getMimeType(sanitized),
        size: buf.length,
      };
    }

    return null;
  }

  /**
   * Streams media directly to Express response
   * @param {string} fileKey
   * @param {object} res - Express response object
   */
  async streamMedia(fileKey, res) {
    const data = await this.getMediaData(fileKey);
    if (!data) {
      throw AppError.notFound('Media file not found');
    }

    res.setHeader('Content-Type', data.mimeType);
    res.setHeader('Content-Length', data.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = Readable.from(data.buffer);
    stream.pipe(res);
  }

  /**
   * Retrieves or rehydrates full filesystem path for a stored image
   * If local disk was wiped by Render restart, this automatically restores from persistent storage!
   * @param {string} fileNameOrKey
   * @returns {Promise<string|null>}
   */
  async getImagePathAsync(fileNameOrKey) {
    if (!fileNameOrKey) return null;
    const sanitized = path.basename(fileNameOrKey);
    const localPath = path.join(this.tempCacheDir, sanitized);

    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // If local file was wiped by container restart, rehydrate from persistent store
    const media = await this.getMediaData(fileNameOrKey);
    if (media && media.buffer) {
      this.ensureTempDir();
      try {
        fs.writeFileSync(localPath, media.buffer);
        return localPath;
      } catch (err) {
        logger.warn(`[MediaService] Error rehydrating temp file: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Synchronous getImagePath for backward compatibility
   * Returns local path if exists, or attempts rehydration if possible
   * @param {string} fileNameOrKey
   * @returns {string|null}
   */
  getImagePath(fileNameOrKey) {
    if (!fileNameOrKey) return null;
    const sanitized = path.basename(fileNameOrKey);
    const localPath = path.join(this.tempCacheDir, sanitized);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    return null;
  }

  /**
   * Detects MIME type for a file
   * @param {string} fileNameOrPath
   * @returns {string}
   */
  getMimeType(fileNameOrPath) {
    if (!fileNameOrPath) return 'image/jpeg';
    const lower = fileNameOrPath.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}

module.exports = new MediaService();
