// EcoSetu Earnings Validators (Joi Schemas)
// Canonical Reference: SIH Problem Statement 26229 - Prompt 8

const Joi = require('joi');
const {
  EWASTE_CATEGORIES,
  PAYMENT_STATUS,
  EARNINGS_PERIOD,
} = require('../utils/constants');

const periodValues = Object.values(EARNINGS_PERIOD);
const paymentStatusValues = Object.values(PAYMENT_STATUS);
const categoryValues = Object.values(EWASTE_CATEGORIES);

const earningsQuerySchema = Joi.object({
  period: Joi.string()
    .valid(...periodValues)
    .optional()
    .default(EARNINGS_PERIOD.ALL_TIME),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  category: Joi.string()
    .valid(...categoryValues)
    .optional(),
  subcategory: Joi.string().max(100).optional().allow('', null),
  paymentStatus: Joi.string()
    .valid(...paymentStatusValues)
    .optional(),
  recyclerId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const pendingDuesQuerySchema = Joi.object({
  category: Joi.string()
    .valid(...categoryValues)
    .optional(),
  subcategory: Joi.string().max(100).optional().allow('', null),
  paymentStatus: Joi.string()
    .valid(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIALLY_PAID)
    .optional(),
  recyclerId: Joi.string().uuid().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const monthlyEarningsQuerySchema = Joi.object({
  year: Joi.number().integer().min(2020).max(2100).optional(),
  category: Joi.string()
    .valid(...categoryValues)
    .optional(),
  recyclerId: Joi.string().uuid().optional(),
});

module.exports = {
  earningsQuerySchema,
  pendingDuesQuerySchema,
  monthlyEarningsQuerySchema,
};
