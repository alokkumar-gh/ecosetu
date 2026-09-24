// EcoSetu Recurring Trade Controller
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6

const recurringTradeService = require('../services/recurringTradeService');

class RecurringTradeController {
  async getTradingRelationship(req, res, next) {
    try {
      const result = await recurringTradeService.getTradingRelationship(req.user, req.params.partyId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSellAgainTemplate(req, res, next) {
    try {
      const result = await recurringTradeService.getSellAgainTemplate(req.user, req.params.lotId);
      res.status(200).json({
        success: true,
        message: 'Sell Again template generated',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSourceAgainTemplate(req, res, next) {
    try {
      const result = await recurringTradeService.getSourceAgainTemplate(req.user, req.params.requestId);
      res.status(200).json({
        success: true,
        message: 'Source Again template generated',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecurringTradeController();
