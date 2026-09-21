// EcoSetu Handover Controller
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)

const handoverService = require('../services/handoverService');
const {
  createHandoverSchema,
  collectorConfirmSchema,
  recyclerConfirmSchema,
  addPhotoSchema,
  cancelHandoverSchema,
  queryHandoversSchema,
} = require('../validators/handoverValidators');
const AppError = require('../utils/AppError');

class HandoverController {
  /**
   * POST /api/v1/handovers
   * Initiate a new digital handover record
   */
  async createHandover(req, res, next) {
    try {
      const { error, value } = createHandoverSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const handover = await handoverService.createHandover(req.user, value, req.ip);
      return res.status(201).json({
        status: 'success',
        message: 'Digital handover initiated successfully',
        data: handover,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/handovers/:id/collector-confirm
   * Collector confirms material handover
   */
  async collectorConfirm(req, res, next) {
    try {
      const { error, value } = collectorConfirmSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const handover = await handoverService.collectorConfirm(req.user, req.params.id, value, req.ip);
      return res.status(200).json({
        status: 'success',
        message: 'Collector confirmed material handover',
        data: handover,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/handovers/:id/recycler-confirm
   * Recycler confirms receipt of material handover
   */
  async recyclerConfirm(req, res, next) {
    try {
      const { error, value } = recyclerConfirmSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const handover = await handoverService.recyclerConfirm(req.user, req.params.id, value, req.ip);
      return res.status(200).json({
        status: 'success',
        message: 'Recycler confirmed receipt of material handover',
        data: handover,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/handovers/:id/photos
   * Attach evidence photo to handover record
   */
  async addPhoto(req, res, next) {
    try {
      const { error, value } = addPhotoSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const photo = await handoverService.addHandoverPhoto(req.user, req.params.id, value, req.ip);
      return res.status(201).json({
        status: 'success',
        message: 'Photo attached to handover successfully',
        data: photo,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/handovers/:id
   * Get single handover record details
   */
  async getHandoverById(req, res, next) {
    try {
      const handover = await handoverService.getHandoverById(req.user, req.params.id);
      return res.status(200).json({
        status: 'success',
        data: handover,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/handovers/:id/receipt
   * Get verifiable digital handover receipt
   */
  async getHandoverReceipt(req, res, next) {
    try {
      const receipt = await handoverService.getHandoverReceipt(req.user, req.params.id);
      return res.status(200).json({
        status: 'success',
        data: receipt,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/material-lots/:id/handovers
   * Get handovers for a specific material lot
   */
  async getHandoversForLot(req, res, next) {
    try {
      const handovers = await handoverService.getHandoversForLot(req.user, req.params.id);
      return res.status(200).json({
        status: 'success',
        data: handovers,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/handovers/collector
   * Collector list own handovers
   */
  async getCollectorHandovers(req, res, next) {
    try {
      const { error, value } = queryHandoversSchema.validate(req.query, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const result = await handoverService.getCollectorHandovers(req.user, value);
      return res.status(200).json({
        status: 'success',
        data: result.handovers,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/handovers/recycler
   * Recycler list own handovers
   */
  async getRecyclerHandovers(req, res, next) {
    try {
      const { error, value } = queryHandoversSchema.validate(req.query, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const result = await handoverService.getRecyclerHandovers(req.user, value);
      return res.status(200).json({
        status: 'success',
        data: result.handovers,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/handovers/:id/cancel
   * Cancel an open handover
   */
  async cancelHandover(req, res, next) {
    try {
      const { error, value } = cancelHandoverSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return next(AppError.badRequest(error.details.map((d) => d.message).join('; ')));
      }

      const cancelled = await handoverService.cancelHandover(req.user, req.params.id, value.reason, req.ip);
      return res.status(200).json({
        status: 'success',
        message: 'Handover cancelled successfully',
        data: cancelled,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HandoverController();
