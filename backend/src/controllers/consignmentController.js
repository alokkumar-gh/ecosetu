// EcoSetu Consignment Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 9, docs/10_BACKEND_ARCHITECTURE.md

const consignmentService = require('../services/consignmentService');
const { sendSuccess } = require('../utils/responseHelper');

class ConsignmentController {
  /**
   * Create a consignment to a recycler
   * POST /api/v1/consignments
   */
  async createConsignment(req, res, next) {
    try {
      const consignment = await consignmentService.createConsignment(req.user.id, req.body);
      return sendSuccess(res, { consignment }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List consignments (Collector own, Recycler received, Admin all)
   * GET /api/v1/consignments
   */
  async listConsignments(req, res, next) {
    try {
      const result = await consignmentService.listConsignments(req.user, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark consignment as delivered
   * PATCH /api/v1/consignments/:id/deliver
   */
  async deliverConsignment(req, res, next) {
    try {
      const consignment = await consignmentService.deliverConsignment(req.user.id, req.params.id);
      return sendSuccess(res, { consignment }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Recycler accepts delivered consignment
   * PATCH /api/v1/consignments/:id/accept
   */
  async acceptConsignment(req, res, next) {
    try {
      const consignment = await consignmentService.acceptConsignment(req.user.id, req.params.id);
      return sendSuccess(res, { consignment }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Recycler rejects consignment
   * PATCH /api/v1/consignments/:id/reject
   */
  async rejectConsignment(req, res, next) {
    try {
      const consignment = await consignmentService.rejectConsignment(req.user.id, req.params.id, req.body);
      return sendSuccess(res, { consignment }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConsignmentController();
