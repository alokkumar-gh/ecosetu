// EcoSetu Recycler Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 5, docs/10_BACKEND_ARCHITECTURE.md

const recyclerService = require('../services/recyclerService');
const { sendSuccess } = require('../utils/responseHelper');

class RecyclerController {
  /**
   * Get current recycler's profile
   * GET /api/v1/recyclers/profile
   */
  async getProfile(req, res, next) {
    try {
      const profile = await recyclerService.getProfile(req.user.id);
      return sendSuccess(res, { profile }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create or update recycler profile
   * PUT /api/v1/recyclers/profile
   */
  async upsertProfile(req, res, next) {
    try {
      const profile = await recyclerService.upsertProfile(req.user.id, req.body);
      return sendSuccess(res, { profile }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all verified recyclers
   * GET /api/v1/recyclers
   */
  async listRecyclers(req, res, next) {
    try {
      const recyclers = await recyclerService.listVerifiedRecyclers(req.query.category);
      return sendSuccess(res, { recyclers }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecyclerController();
