// EcoSetu Recycling Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 10, docs/10_BACKEND_ARCHITECTURE.md

const recyclingService = require('../services/recyclingService');
const { sendSuccess } = require('../utils/responseHelper');

class RecyclingController {
  /**
   * List recycling records
   * GET /api/v1/recycling-records
   */
  async listRecyclingRecords(req, res, next) {
    try {
      const result = await recyclingService.listRecyclingRecords(req.user, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Start processing recycling record
   * PATCH /api/v1/recycling-records/:id/start-processing
   */
  async startProcessing(req, res, next) {
    try {
      const recyclingRecord = await recyclingService.startProcessing(
        req.user.id,
        req.params.id,
        req.ip
      );
      return sendSuccess(res, { recyclingRecord }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark recycling as completed
   * PATCH /api/v1/recycling-records/:id/complete
   */
  async completeRecycling(req, res, next) {
    try {
      const recyclingRecord = await recyclingService.completeRecycling(
        req.user.id,
        req.params.id,
        req.body,
        req.file || null,
        req.ip
      );
      return sendSuccess(res, { recyclingRecord }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecyclingController();
