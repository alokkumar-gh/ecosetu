// EcoSetu Analytics Controller
// Canonical Reference: SIH 26229 Problem Statement - Prompt 17

const historicalAnalyticsService = require('../services/historicalAnalyticsService');
const { sendSuccess } = require('../utils/responseHelper');

class AnalyticsController {
  /**
   * GET /api/v1/admin/analytics/overview
   */
  async getOverview(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getOverview(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/analytics/prices
   */
  async getPriceAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getHistoricalPriceAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/analytics/materials
   */
  async getMaterialAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getMaterialActivityAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/analytics/transactions
   */
  async getTransactionAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getTransactionActivityAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/analytics/recyclers
   */
  async getRecyclerAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getRecyclerActivityAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/analytics/traceability
   */
  async getTraceabilityAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getTraceabilityLifecycleAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/analytics/data-quality
   */
  async getDataQualityAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getDatasetQualityAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/collectors/analytics
   */
  async getCollectorAnalytics(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getCollectorPersonalAnalytics(req.user, req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/recyclers/analytics
   */
  async getRecyclerAnalyticsSelf(req, res, next) {
    try {
      const data = await historicalAnalyticsService.getRecyclerOperationalAnalytics(req.user, req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
