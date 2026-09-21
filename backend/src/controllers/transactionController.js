// EcoSetu Transaction Controller
// Canonical Reference: SIH Problem Statement 26229 - Prompt 7

const transactionService = require('../services/transactionService');
const {
  createTransactionSchema,
  updatePaymentStatusSchema,
  cancelTransactionSchema,
  queryTransactionsSchema,
} = require('../validators/transactionValidators');
const AppError = require('../utils/AppError');

class TransactionController {
  /**
   * POST /api/v1/transactions
   * Create / Record a new Economic Transaction
   */
  async createTransaction(req, res, next) {
    try {
      const { error, value } = createTransactionSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const transaction = await transactionService.createTransaction(
        req.user,
        value,
        req.ip
      );

      return res.status(201).json({
        success: true,
        message: 'Transaction recorded successfully',
        data: { transaction },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/transactions/:id
   * Get Transaction details by ID
   */
  async getTransactionById(req, res, next) {
    try {
      const transaction = await transactionService.getTransactionById(
        req.user,
        req.params.id
      );

      return res.status(200).json({
        success: true,
        data: { transaction },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/handovers/:handoverId/transaction
   * Get Transaction for a specific Handover
   */
  async getTransactionByHandoverId(req, res, next) {
    try {
      const transaction = await transactionService.getTransactionByHandoverId(
        req.user,
        req.params.handoverId
      );

      return res.status(200).json({
        success: true,
        data: { transaction },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/transactions
   * List Transactions with tenancy isolation and pagination
   */
  async getTransactions(req, res, next) {
    try {
      const { error, value } = queryTransactionsSchema.validate(req.query, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const result = await transactionService.getTransactions(req.user, value);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/transactions/:id/payment-status
   * Update Payment Status of a Transaction
   */
  async updatePaymentStatus(req, res, next) {
    try {
      const { error, value } = updatePaymentStatusSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const transaction = await transactionService.updatePaymentStatus(
        req.user,
        req.params.id,
        value,
        req.ip
      );

      return res.status(200).json({
        success: true,
        message: 'Payment status updated successfully',
        data: { transaction },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/transactions/:id/cancel
   * Cancel a Transaction
   */
  async cancelTransaction(req, res, next) {
    try {
      const { error, value } = cancelTransactionSchema.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        throw AppError.validation(
          'Validation error',
          error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
        );
      }

      const transaction = await transactionService.cancelTransaction(
        req.user,
        req.params.id,
        value,
        req.ip
      );

      return res.status(200).json({
        success: true,
        message: 'Transaction cancelled successfully',
        data: { transaction },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TransactionController();
