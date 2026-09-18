// EcoSetu Collector Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 4, docs/10_BACKEND_ARCHITECTURE.md

const collectorService = require('../services/collectorService');
const { sendSuccess } = require('../utils/responseHelper');

class CollectorController {
  /**
   * Get current collector's profile
   * GET /api/v1/collectors/profile
   */
  async getProfile(req, res, next) {
    try {
      const profile = await collectorService.getProfile(req.user.id);
      return sendSuccess(res, { profile }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create or update collector profile
   * PUT /api/v1/collectors/profile
   */
  async upsertProfile(req, res, next) {
    try {
      const profile = await collectorService.upsertProfile(req.user.id, req.body);
      return sendSuccess(res, { profile }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggle collector availability
   * PATCH /api/v1/collectors/availability
   */
  async toggleAvailability(req, res, next) {
    try {
      const profile = await collectorService.toggleAvailability(req.user.id, req.body.isAvailable);
      return sendSuccess(res, { profile }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get collector statistics
   * GET /api/v1/collectors/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await collectorService.getCollectorStats(req.user.id);
      return sendSuccess(res, stats, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CollectorController();
