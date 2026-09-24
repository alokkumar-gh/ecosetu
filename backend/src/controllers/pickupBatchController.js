// EcoSetu Pickup Batch Controller
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 5: Advanced Logistics

const pickupBatchService = require('../services/pickupBatchService');

class PickupBatchController {
  async createBatch(req, res, next) {
    try {
      const batch = await pickupBatchService.createBatch(req.user, req.body, req.ip);
      res.status(201).json({
        success: true,
        message: 'Pickup batch created successfully',
        data: batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async getBatches(req, res, next) {
    try {
      const result = await pickupBatchService.getBatches(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getBatchById(req, res, next) {
    try {
      const batch = await pickupBatchService.getBatchById(req.user, req.params.id);
      res.status(200).json({
        success: true,
        data: batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateBatchStatus(req, res, next) {
    try {
      const batch = await pickupBatchService.updateBatchStatus(req.user, req.params.id, req.body, req.ip);
      res.status(200).json({
        success: true,
        message: `Batch status updated to ${batch.status}`,
        data: batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async addLotsToBatch(req, res, next) {
    try {
      const batch = await pickupBatchService.addLotsToBatch(req.user, req.params.id, req.body.lotIds, req.ip);
      res.status(200).json({
        success: true,
        message: 'Lots added to batch successfully',
        data: batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async removeLotFromBatch(req, res, next) {
    try {
      const batch = await pickupBatchService.removeLotFromBatch(req.user, req.params.id, req.params.lotId, req.ip);
      res.status(200).json({
        success: true,
        message: 'Lot removed from batch successfully',
        data: batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async getEligibleLots(req, res, next) {
    try {
      const lots = await pickupBatchService.getEligibleLotsForBatch(req.user, req.query);
      res.status(200).json({
        success: true,
        data: lots,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PickupBatchController();
