// EcoSetu Material Lot Controller
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4

const materialLotService = require('../services/materialLotService');
const lotTraceService = require('../services/lotTraceService');
const mediaService = require('../services/mediaService');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');

class MaterialLotController {
  /**
   * Create a new Material Lot
   * POST /api/v1/material-lots
   */
  async createLot(req, res, next) {
    try {
      const lot = await materialLotService.createMaterialLot(
        req.user.id,
        req.body,
        req.ip
      );
      return sendSuccess(res, { lot }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List material lots
   * GET /api/v1/material-lots
   */
  async listLots(req, res, next) {
    try {
      const result = await materialLotService.listMaterialLots(req.user, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get material lot details by ID
   * GET /api/v1/material-lots/:id
   */
  async getLotById(req, res, next) {
    try {
      const lot = await materialLotService.getMaterialLotById(req.user, req.params.id);
      return sendSuccess(res, { lot }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update a material lot (draft edits and submit transition)
   * PATCH /api/v1/material-lots/:id
   */
  async updateLot(req, res, next) {
    try {
      const lot = await materialLotService.updateMaterialLot(
        req.user.id,
        req.params.id,
        req.body,
        req.ip
      );
      return sendSuccess(res, { lot }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Attach photos to an existing lot
   * POST /api/v1/material-lots/:id/photos
   */
  async addLotPhotos(req, res, next) {
    try {
      let photosToAdd = [];

      // If file uploaded via multipart
      if (req.file) {
        const savedMedia = await mediaService.saveImage(req.file, {
          prefix: 'lots',
          lotId: req.params.id,
        });
        photosToAdd.push({
          photoUrl: savedMedia.imageUrl,
          storagePath: savedMedia.fileKey,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        });
      }

      // If files uploaded via multi-part files array
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const savedMedia = await mediaService.saveImage(file, {
            prefix: 'lots',
            lotId: req.params.id,
          });
          photosToAdd.push({
            photoUrl: savedMedia.imageUrl,
            storagePath: savedMedia.fileKey,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
        }
      }

      // If photos array provided in JSON body
      if (req.body && Array.isArray(req.body.photos)) {
        photosToAdd = photosToAdd.concat(req.body.photos);
      }

      if (photosToAdd.length === 0) {
        throw AppError.badRequest('No photos provided via file upload or photos array');
      }

      const createdPhotos = await materialLotService.addLotPhotos(
        req.user.id,
        req.params.id,
        photosToAdd
      );

      return sendSuccess(res, { photos: createdPhotos }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a standalone material item
   * POST /api/v1/material-lots/items
   */
  async createItem(req, res, next) {
    try {
      const item = await materialLotService.createMaterialItem(req.user.id, req.body);
      return sendSuccess(res, { item }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve full lifecycle trace for a Material Lot (Journey B)
   * GET /api/v1/material-lots/:id/trace
   */
  async getLotTrace(req, res, next) {
    try {
      const trace = await lotTraceService.getLotTrace(req.user, req.params.id);
      return sendSuccess(res, { trace }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MaterialLotController();
