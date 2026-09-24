// EcoSetu Sourcing Request Controller
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6

const sourcingRequestService = require('../services/sourcingRequestService');

class SourcingRequestController {
  async createRequest(req, res, next) {
    try {
      const request = await sourcingRequestService.createRequest(req.user, req.body);
      res.status(201).json({
        success: true,
        message: 'Sourcing request created successfully',
        data: request,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRequests(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await sourcingRequestService.getRequests(req.user, filters, { page, limit });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req, res, next) {
    try {
      const request = await sourcingRequestService.getRequestById(req.user, req.params.id);
      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateRequest(req, res, next) {
    try {
      const request = await sourcingRequestService.updateRequest(req.user, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Sourcing request updated successfully',
        data: request,
      });
    } catch (err) {
      next(err);
    }
  }

  async respondToRequest(req, res, next) {
    try {
      const response = await sourcingRequestService.respondToRequest(req.user, req.params.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        data: response,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateResponse(req, res, next) {
    try {
      const response = await sourcingRequestService.updateResponse(req.user, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Response updated successfully',
        data: response,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SourcingRequestController();
