/**
 * recyclerMatchingController.js
 * Controller for Recycler Matching endpoints
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 9 (SIH-MATCH-001..006)
 */

const recyclerMatchingService = require('../services/recyclerMatchingService');
const { sendSuccess } = require('../utils/responseHelper');

class RecyclerMatchingController {
  /**
   * Get deterministic economic matches for a collector's Material Lot
   * GET /api/v1/material-lots/:id/matches
   */
  async getMatchesForLot(req, res, next) {
    try {
      const result = await recyclerMatchingService.getMatchesForLot(req.params.id, req.user);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecyclerMatchingController();
