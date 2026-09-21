// EcoSetu Quote Validators
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10

const Joi = require('joi');
const { PRICE_UNITS, QUOTE_STATUS } = require('../utils/constants');

const createQuote = Joi.object({
  materialLotId: Joi.string().uuid().required().messages({
    'string.guid': 'materialLotId must be a valid UUID',
    'any.required': 'materialLotId is required',
  }),
  quotedUnitPrice: Joi.number().positive().required().messages({
    'number.base': 'quotedUnitPrice must be a number',
    'number.positive': 'quotedUnitPrice must be strictly positive',
    'any.required': 'quotedUnitPrice is required',
  }),
  unit: Joi.string()
    .valid(...Object.values(PRICE_UNITS))
    .default(PRICE_UNITS.PER_KG),
  currency: Joi.string().max(10).default('INR'),
  quotedQuantity: Joi.number().positive().optional().messages({
    'number.positive': 'quotedQuantity must be strictly positive',
  }),
  validUntil: Joi.date().iso().greater('now').required().messages({
    'date.format': 'validUntil must be an ISO date format',
    'date.greater': 'validUntil must be in the future',
    'any.required': 'validUntil date is required',
  }),
  notes: Joi.string().max(1000).allow('', null).optional(),
});

const rejectQuote = Joi.object({
  reason: Joi.string().max(255).allow('', null).optional(),
});

const cancelQuote = Joi.object({
  reason: Joi.string().max(255).allow('', null).optional(),
});

const listQuotesQuery = Joi.object({
  status: Joi.string().valid(...Object.values(QUOTE_STATUS)).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const lotQuotesQuery = Joi.object({
  status: Joi.string().valid(...Object.values(QUOTE_STATUS)).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createQuote,
  rejectQuote,
  cancelQuote,
  listQuotesQuery,
  lotQuotesQuery,
};
