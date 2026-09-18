// EcoSetu E-Waste Item Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 6, docs/10_BACKEND_ARCHITECTURE.md

const ewasteService = require('../services/ewasteService');
const { sendSuccess } = require('../utils/responseHelper');

class EwasteController {
  /**
   * Submit a new e-waste item
   * POST /api/v1/ewaste-items
   */
  async createItem(req, res, next) {
    try {
      const result = await ewasteService.createItem(req.user.id, req.body);
      return sendSuccess(res, result, 201);
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
