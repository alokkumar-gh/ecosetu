// EcoSetu Dispute Controller
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 7

const disputeService = require('../services/disputeService');

class DisputeController {
  async openDispute(req, res, next) {
    try {
      const dispute = await disputeService.openDispute(req.user, req.body, req.ip);
      res.status(201).json({
        success: true,
        message: 'Dispute opened successfully',
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDisputes(req, res, next) {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await disputeService.listDisputes(req.user, filters, { page, limit });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDisputeById(req, res, next) {
    try {
      const dispute = await disputeService.getDisputeById(req.user, req.params.id);
      res.status(200).json({
        success: true,
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }

  async respondToDispute(req, res, next) {
    try {
      const dispute = await disputeService.respondToDispute(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: 'Response recorded successfully',
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }

  async resolveDispute(req, res, next) {
    try {
      const dispute = await disputeService.resolveDispute(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: 'Dispute resolved successfully',
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelDispute(req, res, next) {
    try {
      const dispute = await disputeService.cancelDispute(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: 'Dispute cancelled successfully',
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }

  async initiateReturn(req, res, next) {
    try {
      const dispute = await disputeService.initiateReturn(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: 'Return initiated successfully',
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeReturn(req, res, next) {
    try {
      const dispute = await disputeService.completeReturn(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: 'Return completed successfully',
        data: dispute,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DisputeController();
