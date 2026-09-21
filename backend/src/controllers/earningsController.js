// EcoSetu Earnings Controller
// Canonical Reference: SIH Problem Statement 26229 - Prompt 8: Collector Earnings Ledger + Pending Dues

const earningsService = require('../services/earningsService');
const {
  earningsQuerySchema,
  pendingDuesQuerySchema,
  monthlyEarningsQuerySchema,
} = require('../validators/earningsValidators');
const AppError = require('../utils/AppError');

class EarningsController {
  /**
   * GET /api/v1/earnings/summary
   * Get collector's aggregated earnings summary
   */
  async getSummary(req, res, next) {
    try {
      const { error, value } = earningsQuerySchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const summary = await earningsService.getEarningsSummary(req.user, value);

      return res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/earnings/transactions
   * Get contributing transactions with pagination and filters
   */
  async getTransactions(req, res, next) {
    try {
      const { error, value } = earningsQuerySchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const result = await earningsService.getEarningsTransactions(req.user, value);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/earnings/pending-dues
   * Get dedicated outstanding dues list (oldest-first by default)
   */
  async getPendingDues(req, res, next) {
    try {
      const { error, value } = pendingDuesQuerySchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const result = await earningsService.getPendingDues(req.user, value);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/earnings/monthly
   * Get monthly historical earnings breakdown
   */
  async getMonthly(req, res, next) {
    try {
      const { error, value } = monthlyEarningsQuerySchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const result = await earningsService.getMonthlyEarnings(req.user, value);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/earnings/speech-text
   * Generate localized speech summary for TTS
   */
  async getSpeechText(req, res, next) {
    try {
      const { error, value } = earningsQuerySchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const language = req.query.language || 'en';
      const summary = await earningsService.getEarningsSummary(req.user, value);
      const speechText = earningsService.generateSpeechText(summary, language);

      return res.status(200).json({
        success: true,
        data: {
          speechText,
          language,
          summary,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EarningsController();
