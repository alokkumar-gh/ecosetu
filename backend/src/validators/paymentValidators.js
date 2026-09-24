// EcoSetu Payment Validators
// Canonical Reference: SIH Problem Statement 26229 - Payment System

const Joi = require('joi');

const initiateCashSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
});

const confirmCashSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
  amountReported: Joi.number().positive().optional(),
  notes: Joi.string().max(500).allow(null, '').optional(),
  asPayer: Joi.boolean().optional(),
  asReceiver: Joi.boolean().optional(),
});

const createRazorpayOrderSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
});

const verifyRazorpayPaymentSchema = Joi.object({
  transactionId: Joi.string().uuid().required(),
  orderId: Joi.string().max(100).optional(),
  razorpayOrderId: Joi.string().max(100).optional(),
  paymentId: Joi.string().max(100).optional(),
  razorpayPaymentId: Joi.string().max(100).optional(),
  signature: Joi.string().max(255).optional(),
  razorpaySignature: Joi.string().max(255).optional(),
  method: Joi.string().valid('upi', 'card', 'netbanking').default('upi'),
}).or('orderId', 'razorpayOrderId').or('paymentId', 'razorpayPaymentId').or('signature', 'razorpaySignature');

const queryBillSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  paymentStatus: Joi.string().optional(),
  paymentMethod: Joi.string().optional(),
  materialCategory: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

module.exports = {
  initiateCashSchema,
  confirmCashSchema,
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  queryBillSchema,
};
