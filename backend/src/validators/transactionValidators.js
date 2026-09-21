// EcoSetu Transaction Validators (Joi Schemas)
// Canonical Reference: SIH Problem Statement 26229 - Prompt 7

const Joi = require('joi');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
} = require('../utils/constants');

const paymentMethodValues = Object.values(PAYMENT_METHOD);
const paymentStatusValues = Object.values(PAYMENT_STATUS);
const transactionStatusValues = Object.values(TRANSACTION_STATUS);

const createTransactionSchema = Joi.object({
  handoverId: Joi.string().uuid().required().messages({
    'string.uuid': 'handoverId must be a valid UUID',
    'any.required': 'handoverId is required',
  }),
  finalSaleValue: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'finalSaleValue must be a positive number',
    'any.required': 'finalSaleValue is required',
  }),
  finalUnitPrice: Joi.number().positive().precision(2).optional().allow(null),
  paymentMethod: Joi.string()
    .valid(...paymentMethodValues)
    .default(PAYMENT_METHOD.CASH)
    .messages({
      'any.only': `paymentMethod must be one of: ${paymentMethodValues.join(', ')}`,
    }),
  paymentStatus: Joi.string()
    .valid(...paymentStatusValues)
    .default(PAYMENT_STATUS.PENDING)
    .messages({
      'any.only': `paymentStatus must be one of: ${paymentStatusValues.join(', ')}`,
    }),
  amountPaid: Joi.number().min(0).precision(2).optional().default(0),
  notes: Joi.string().max(1000).optional().allow('', null),
});

const updatePaymentStatusSchema = Joi.object({
  paymentStatus: Joi.string()
    .valid(...paymentStatusValues)
    .required()
    .messages({
      'any.only': `paymentStatus must be one of: ${paymentStatusValues.join(', ')}`,
      'any.required': 'paymentStatus is required',
    }),
  amountPaid: Joi.number().min(0).precision(2).optional(),
  paymentMethod: Joi.string()
    .valid(...paymentMethodValues)
    .optional(),
  notes: Joi.string().max(1000).optional().allow('', null),
});

const cancelTransactionSchema = Joi.object({
  reason: Joi.string().min(3).max(255).required().messages({
    'string.min': 'Cancellation reason must be at least 3 characters',
    'string.max': 'Cancellation reason must not exceed 255 characters',
    'any.required': 'Cancellation reason is required',
  }),
});

const queryTransactionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  paymentStatus: Joi.string().valid(...paymentStatusValues).optional(),
  paymentMethod: Joi.string().valid(...paymentMethodValues).optional(),
  transactionStatus: Joi.string().valid(...transactionStatusValues).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

module.exports = {
  createTransactionSchema,
  updatePaymentStatusSchema,
  cancelTransactionSchema,
  queryTransactionsSchema,
};
