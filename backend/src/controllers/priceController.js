/**
 * priceController.js
 * Controller handling Admin price management and Collector price discovery / valuation
 */

const priceService = require('../services/priceService');
const { sendSuccess } = require('../utils/responseHelper');

class PriceController {
  // ── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

  async createPrice(req, res, next) {
    try {
      const price = await priceService.createPriceRecord(
        req.user,
        req.body,
        req.ip
      );
      return sendSuccess(res, { price }, 201);
    } catch (err) {
      next(err);
    }
  }

  async listAdminPrices(req, res, next) {
    try {
      const result = await priceService.listAdminPrices(req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async updatePrice(req, res, next) {
    try {
      const price = await priceService.updatePriceRecord(
        req.user,
        req.params.id,
        req.body,
        req.ip
      );
      return sendSuccess(res, { price }, 200);
    } catch (err) {
      next(err);
    }
  }

  async deletePrice(req, res, next) {
    try {
      await priceService.deletePriceRecord(req.user, req.params.id, req.ip);
      return sendSuccess(res, { message: 'Price record deleted successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }

  // ── COLLECTOR DISCOVERY & VALUATION ENDPOINTS ─────────────────────────────

  async getPrices(req, res, next) {
    try {
      const board = await priceService.getCurrentPrices(req.query);
      return sendSuccess(res, board, 200);
    } catch (err) {
      next(err);
    }
  }

  async getEstimate(req, res, next) {
    try {
      const weight = req.query.weight || req.query.weightKg;
      const result = await priceService.calculateEstimate({
        category: req.query.category,
        subcategory: req.query.subcategory,
        weightKg: weight,
        location: req.query.location,
      });
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const history = await priceService.getHistoricalPrices(req.query);
      return sendSuccess(res, history, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PriceController();
