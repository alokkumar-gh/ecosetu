// EcoSetu Payment Controller
// Canonical Reference: SIH Problem Statement 26229 - Payment System

const paymentService = require('../services/paymentService');
const AppError = require('../utils/AppError');
const {
  initiateCashSchema,
  confirmCashSchema,
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
} = require('../validators/paymentValidators');

class PaymentController {
  /**
   * Initiate / Retrieve Cash Confirmation
   */
  async initiateCashConfirmation(req, res, next) {
    try {
      const { error, value } = initiateCashSchema.validate(req.body);
      if (error) {
        throw AppError.badRequest(error.details[0].message);
      }
      const result = await paymentService.initiateCashConfirmation(req.user, value.transactionId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Confirm Cash Handover or Receipt
   */
  async confirmCashPayment(req, res, next) {
    try {
      const { error, value } = confirmCashSchema.validate(req.body);
      if (error) {
        throw AppError.badRequest(error.details[0].message);
      }
      const result = await paymentService.confirmCashPayment(
        req.user,
        value.transactionId,
        value,
        req.ip
      );
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Cash Confirmation status by Transaction ID
   */
  async getCashConfirmation(req, res, next) {
    try {
      const { transactionId } = req.params;
      const result = await paymentService.getCashConfirmationByTransactionId(req.user, transactionId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create Razorpay Order
   */
  async createRazorpayOrder(req, res, next) {
    try {
      const { error, value } = createRazorpayOrderSchema.validate(req.body);
      if (error) {
        throw AppError.badRequest(error.details[0].message);
      }
      const result = await paymentService.createRazorpayOrder(req.user, value.transactionId);
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Verify Razorpay Payment Signature
   */
  async verifyRazorpayPayment(req, res, next) {
    try {
      const { error, value } = verifyRazorpayPaymentSchema.validate(req.body);
      if (error) {
        throw AppError.badRequest(error.details[0].message);
      }
      const result = await paymentService.verifyRazorpayPayment(req.user, value, req.ip);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Inbound Razorpay Webhook Handler
   */
  async handleRazorpayWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'] || '';
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature, req.body);
      res.status(200).json({ status: 'ok', data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reconcile Payment state
   */
  async reconcilePayment(req, res, next) {
    try {
      const { transactionId } = req.params;
      const result = await paymentService.reconcilePayment(req.user, transactionId);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
