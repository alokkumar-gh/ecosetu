// EcoSetu Verification Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/13_SECURITY_PRIVACY.md

const verificationService = require('../services/verificationService');
const { validateDocumentFile } = require('../middleware/uploadMiddleware');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');
const environment = require('../config/environment');

const SECURE_DOCS_DIR = path.resolve(process.cwd(), environment.uploadDir || './uploads', 'verification_docs');

// Ensure secure docs directory exists with restricted permissions
if (!fs.existsSync(SECURE_DOCS_DIR)) {
  fs.mkdirSync(SECURE_DOCS_DIR, { recursive: true });
}

class VerificationController {
  /**
   * User: Submit identity document for verification (Collector / Recycler)
   * POST /api/v1/verifications/submit
   */
  async submit(req, res, next) {
    try {
      let documentUrl = req.body.documentUrl;
      let storageKey = req.body.storageKey;
      let mimeType = req.body.mimeType;
      let fileSize = req.body.fileSize;

      // If file was uploaded via multipart/form-data
      if (req.file) {
        validateDocumentFile(req.file);
        const ext = req.file.filename.includes('.') ? req.file.filename.split('.').pop().toLowerCase() : 'jpg';
        const safeName = `doc_${req.user.id}_${Date.now()}.${ext}`;
        const filePath = path.join(SECURE_DOCS_DIR, safeName);

        fs.writeFileSync(filePath, req.file.buffer);
        storageKey = safeName;
        mimeType = req.file.mimetype;
        fileSize = req.file.buffer.length;
        documentUrl = `/api/v1/verifications/document/${safeName}`;
      } else if (req.body.fileBase64) {
        // Base64 direct upload from mobile
        const base64Data = req.body.fileBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = (req.body.fileExtension || 'jpg').toLowerCase().replace('.', '');
        const dummyFile = {
          filename: `upload.${ext}`,
          mimetype: req.body.mimeType || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          buffer,
        };
        validateDocumentFile(dummyFile);

        const safeName = `doc_${req.user.id}_${Date.now()}.${ext}`;
        const filePath = path.join(SECURE_DOCS_DIR, safeName);
        fs.writeFileSync(filePath, buffer);
        storageKey = safeName;
        mimeType = dummyFile.mimetype;
        fileSize = buffer.length;
        documentUrl = `/api/v1/verifications/document/${safeName}`;
      }

      const result = await verificationService.submitVerification(req.user.id, {
        documentType: req.body.documentType,
        documentNumberMasked: req.body.documentNumberMasked,
        documentUrl,
        storageKey,
        mimeType,
        fileSize,
        reviewNotes: req.body.reviewNotes,
      });

      return sendSuccess(res, { verification: result }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * User: Get active verification status
   * GET /api/v1/verifications/status
   */
  async getStatus(req, res, next) {
    try {
      const status = await verificationService.getUserVerificationStatus(req.user.id);
      return sendSuccess(res, status, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * User: Resubmit verification after rejection or change request
   * POST /api/v1/verifications/resubmit
   */
  async resubmit(req, res, next) {
    try {
      return this.submit(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List verifications with tab and role filters
   * GET /api/v1/admin/verifications
   */
  async listAdminVerifications(req, res, next) {
    try {
      const data = await verificationService.listVerifications(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Get verification details by ID
   * GET /api/v1/admin/verifications/:id
   */
  async getAdminVerificationById(req, res, next) {
    try {
      const data = await verificationService.getVerificationById(req.params.id);
      return sendSuccess(res, { verification: data }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update verification status (Approve, Reject, Request Changes)
   * PATCH /api/v1/admin/verifications/:id
   * POST /api/v1/admin/verifications/:id/approve
   * POST /api/v1/admin/verifications/:id/reject
   * POST /api/v1/admin/verifications/:id/request-changes
   */
  async updateAdminVerification(req, res, next) {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || null;
      let status = req.body.status;

      // If calling semantic endpoints (/approve, /reject, /request-changes)
      if (req.path.endsWith('/approve')) status = 'APPROVED';
      else if (req.path.endsWith('/reject')) status = 'REJECTED';
      else if (req.path.endsWith('/request-changes')) status = 'CHANGES_REQUIRED';

      const data = await verificationService.updateVerification(
        req.user.id,
        req.params.id,
        status,
        {
          reviewNotes: req.body.reviewNotes,
          rejectionReason: req.body.rejectionReason,
          changeRequestReason: req.body.changeRequestReason,
          changeRequestOptions: req.body.changeRequestOptions,
        },
        clientIp
      );

      return sendSuccess(res, { verification: data }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Secure document retrieval — authorization required (Admin or document owner only)
   * GET /api/v1/verifications/document/:key
   */
  async serveDocument(req, res, next) {
    try {
      const { key } = req.params;
      const safeKey = path.basename(key);
      const filePath = path.join(SECURE_DOCS_DIR, safeKey);

      if (!fs.existsSync(filePath)) {
        throw AppError.notFound('Document not found');
      }

      // Authorization guard: Only Admin or the owner can view
      if (req.user.role !== 'ADMIN') {
        if (!safeKey.includes(`_${req.user.id}_`)) {
          throw AppError.forbidden('Unauthorized access to document');
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.pdf') contentType = 'application/pdf';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VerificationController();
