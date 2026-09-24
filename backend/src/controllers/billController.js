// EcoSetu Bill Controller
// Canonical Reference: SIH Problem Statement 26229 - Billing & Invoicing System

const billService = require('../services/billService');
const AppError = require('../utils/AppError');
const { queryBillSchema } = require('../validators/paymentValidators');

class BillController {
  /**
   * List bills with role-scoped tenancy isolation
   */
  async listBills(req, res, next) {
    try {
      const { error, value } = queryBillSchema.validate(req.query);
      if (error) {
        throw AppError.badRequest(error.details[0].message);
      }
      const result = await billService.listBills(req.user, value);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single bill by ID
   */
  async getBillById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await billService.getBillById(req.user, id);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get bill by transaction ID
   */
  async getBillByTransactionId(req, res, next) {
    try {
      const { transactionId } = req.params;
      const result = await billService.getBillByTransactionId(req.user, transactionId);
      if (!result) {
        return res.status(404).json({ status: 'fail', message: 'No bill generated for this transaction yet' });
      }
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BillController();
