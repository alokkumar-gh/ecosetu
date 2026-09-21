const fs = require('fs');
const ewasteService = require('../services/ewasteService');
const mediaService = require('../services/mediaService');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/responseHelper');

class EwasteController {
  /**
   * Upload an e-waste photo
   * POST /api/v1/ewaste-items/upload
   */
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        throw AppError.badRequest('Image file is required');
      }

      const savedMedia = await mediaService.saveImage(req.file, {
        prefix: 'ewaste',
        itemId: req.body?.itemId || null,
      });
      return sendSuccess(res, {
        fileKey: savedMedia.fileKey,
        imageUrl: savedMedia.imageUrl,
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Submit a new e-waste item
   * POST /api/v1/ewaste-items
   */
  async createItem(req, res, next) {
    try {
      const result = await ewasteService.createItem(req.user.id, req.body, req.file);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Stream authorized e-waste item photo
   * GET /api/v1/ewaste-items/:id/image or GET /api/v1/ewaste-items/media/:fileKey
   */
  async getItemImage(req, res, next) {
    try {
      const identifier = req.params.id || req.params.fileKey;
      const { filePath, fileKey, mimeType } = await ewasteService.authorizeItemImageAccess(req.user, identifier);

      if (fileKey) {
        return await mediaService.streamMedia(fileKey, res);
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => next(err));
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List current citizen's e-waste items
   * GET /api/v1/ewaste-items
   */
  async listItems(req, res, next) {
    try {
      const result = await ewasteService.listItems(req.user.id, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get specific e-waste item details
   * GET /api/v1/ewaste-items/:id
   */
  async getItemById(req, res, next) {
    try {
      const item = await ewasteService.getItemById(req.user, req.params.id);
      return sendSuccess(res, { item }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get full lifecycle traceability for an e-waste item
   * GET /api/v1/ewaste-items/:id/traceability
   */
  async getItemTraceability(req, res, next) {
    try {
      const result = await ewasteService.getItemTraceability(req.user, req.params.id);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EwasteController();
