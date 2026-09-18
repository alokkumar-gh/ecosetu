// EcoSetu Pickup Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 8, docs/10_BACKEND_ARCHITECTURE.md

const pickupService = require('../services/pickupService');
const { sendSuccess } = require('../utils/responseHelper');

class PickupController {
  /**
   * List pickups for current collector
   * GET /api/v1/pickups
   */
  async listPickups(req, res, next) {
    try {
      const result = await pickupService.listPickups(req.user.id, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get pickup details
   * GET /api/v1/pickups/:id
   */
  async getPickupById(req, res, next) {
    try {
      const pickup = await pickupService.getPickupById(req.user, req.params.id);
      return sendSuccess(res, { pickup }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark pickup as in progress
   * PATCH /api/v1/pickups/:id/start
   */
  async startPickup(req, res, next) {
    try {
      const pickup = await pickupService.startPickup(req.user.id, req.params.id);
      return sendSuccess(res, { pickup }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark pickup as completed
   * PATCH /api/v1/pickups/:id/complete
   */
  async completePickup(req, res, next) {
    try {
      const pickup = await pickupService.completePickup(req.user.id, req.params.id, req.body);
      return sendSuccess(res, { pickup }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PickupController();
