/**
 * recyclerRateController.js
 * Controller for Recycler Offered Rates endpoints
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 8 (SIH-RATE-001..004)
 */

const recyclerRateService = require('../services/recyclerRateService');
const { sendSuccess } = require('../utils/responseHelper');

class RecyclerRateController {
  /**
   * Create an offered rate
   * POST /api/v1/recyclers/rates OR POST /api/v1/admin/recycler-rates
   */
  async createRate(req, res, next) {
    try {
      const rate = await recyclerRateService.createRate(req.body, req.user);
      return sendSuccess(res, { rate }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List offered rates with filters
   * GET /api/v1/recyclers/rates OR GET /api/v1/admin/recycler-rates
   */
  async listRates(req, res, next) {
    try {
      const query = { ...req.query };
      // If caller is RECYCLER, constrain to own profile rates
      if (req.user.role === 'RECYCLER') {
        const prisma = require('../config/database');
        const profile = await prisma.recyclerProfile.findUnique({
          where: { userId: req.user.id },
        });
        if (profile) {
          query.recyclerId = profile.id;
        }
      }
      const result = await recyclerRateService.listRates(query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get rate by ID
   * GET /api/v1/admin/recycler-rates/:id
   */
  async getRateById(req, res, next) {
    try {
      const rate = await recyclerRateService.getRateById(req.params.id);
      return sendSuccess(res, { rate }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update rate by ID
   * PATCH /api/v1/recyclers/rates/:id OR PATCH /api/v1/admin/recycler-rates/:id
   */
  async updateRate(req, res, next) {
    try {
      const rate = await recyclerRateService.updateRate(req.params.id, req.body, req.user);
      return sendSuccess(res, { rate }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete / deactivate rate by ID
   * DELETE /api/v1/recyclers/rates/:id OR DELETE /api/v1/admin/recycler-rates/:id
   */
  async deleteRate(req, res, next) {
    try {
      const rate = await recyclerRateService.deleteRate(req.params.id, req.user);
      return sendSuccess(res, { rate, message: 'Offered rate deactivated successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public active recycler rates for Price Board / directory
   * GET /api/v1/recycler-rates
   */
  async getPublicRates(req, res, next) {
    try {
      const rates = await recyclerRateService.getPublicRates(req.query);
      return sendSuccess(res, { rates }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecyclerRateController();
