// EcoSetu Eco-Saathi Controller
// Handles chat requests, action confirmations, and context queries
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md

const orchestrator = require('../services/ecoSaathi/EcoSaathiOrchestrator');
const contextBuilder = require('../services/ecoSaathi/contextBuilder');
const AppError = require('../utils/AppError');

class EcoSaathiController {
  /**
   * Process natural language query / conversation message
   * POST /api/v1/eco-saathi/message
   */
  async handleMessage(req, res, next) {
    try {
      const { message, language, context, conversationHistory } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        throw AppError.badRequest('Message content is required');
      }

      const response = await orchestrator.processMessage(req.user, {
        message: message.trim(),
        language: language || 'en',
        context: context || {},
        conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      });

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute an explicit confirmed write action
   * POST /api/v1/eco-saathi/confirm-action
   */
  async handleConfirmAction(req, res, next) {
    try {
      const { action } = req.body;

      if (!action || !action.type) {
        throw AppError.badRequest('Action object with type is required');
      }

      const result = await orchestrator.executeConfirmedAction(req.user, action);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get active user context for Eco-Saathi assistant
   * GET /api/v1/eco-saathi/context
   */
  async getContext(req, res, next) {
    try {
      const activeContext = await contextBuilder.build(req.user, {
        language: req.query.language || 'en',
        currentPage: req.query.currentPage || null,
      });

      res.status(200).json({
        success: true,
        data: activeContext,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EcoSaathiController();
