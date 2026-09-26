// EcoSetu Collection Request Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 7, docs/10_BACKEND_ARCHITECTURE.md

const requestService = require('../services/requestService');
const { sendSuccess } = require('../utils/responseHelper');

class RequestController {
  /**
   * Create a new collection request
   * POST /api/v1/collection-requests
   */
  async createRequest(req, res, next) {
    try {
      const request = await requestService.createRequest(req.user.id, req.body);
      return sendSuccess(res, { request }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List collection requests for citizen or admin
   * GET /api/v1/collection-requests
   */
  async listRequests(req, res, next) {
    try {
      const result = await requestService.listRequests(req.user, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List available collection requests for verified collectors
   * GET /api/v1/collection-requests/available
   */
  async listAvailableRequests(req, res, next) {
    try {
      const result = await requestService.listAvailableRequests(req.user, req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get specific collection request details
   * GET /api/v1/collection-requests/:id
   */
  async getRequestById(req, res, next) {
    try {
      const request = await requestService.getRequestById(req.user, req.params.id);
      return sendSuccess(res, { request }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Move request from DRAFT to SUBMITTED
   * POST /api/v1/collection-requests/:id/submit
   */
  async submitRequest(req, res, next) {
    try {
      const request = await requestService.submitRequest(req.user.id, req.params.id);
      return sendSuccess(res, { request }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Collector submits or updates an offer on a collection request
   * POST /api/v1/collection-requests/:id/offers
   */
  async submitOffer(req, res, next) {
    try {
      const offer = await requestService.submitOffer(req.user.id, req.params.id, req.body);
      return sendSuccess(res, { offer }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List offers on a collection request
   * GET /api/v1/collection-requests/:id/offers
   */
  async listOffers(req, res, next) {
    try {
      const result = await requestService.listOffers(req.user, req.params.id);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Citizen accepts a collector offer
   * POST /api/v1/collection-requests/:id/offers/:offerId/accept
   */
  async acceptOffer(req, res, next) {
    try {
      const offerId = req.params.offerId || req.body.offerId;
      const result = await requestService.acceptOffer(req.user.id, req.params.id, offerId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Collector accepts a request
   * POST /api/v1/collection-requests/:id/accept
   */
  async acceptRequest(req, res, next) {
    try {
      const result = await requestService.acceptRequest(req.user.id, req.params.id);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Cancel collection request
   * POST /api/v1/collection-requests/:id/cancel
   */
  async cancelRequest(req, res, next) {
    try {
      const request = await requestService.cancelRequest(req.user, req.params.id, req.body.reason);
      return sendSuccess(res, { request }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RequestController();
