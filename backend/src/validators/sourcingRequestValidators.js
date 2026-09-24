// EcoSetu Sourcing Request & Response Validators
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6

const Joi = require('joi');
const {
  MATERIAL_CATEGORIES,
  ITEM_CONDITIONS,
  PRICE_UNITS,
  SOURCING_REQUEST_STATUS,
  SOURCING_RESPONSE_STATUS,
} = require('../utils/constants');

const createSourcingRequest = Joi.object({
  recyclerId: Joi.string().uuid().optional(),
  materialCategory: Joi.string()
    .valid(...Object.values(MATERIAL_CATEGORIES))
    .required()
    .messages({
      'any.only': `materialCategory must be one of: ${Object.values(MATERIAL_CATEGORIES).join(', ')}`,
      'any.required': 'materialCategory is required',
    }),
  materialSubcategory: Joi.string().max(100).optional().allow('', null),
  condition: Joi.string()
    .valid(...Object.values(ITEM_CONDITIONS))
    .default(ITEM_CONDITIONS.UNKNOWN),
  minimumWeightKg: Joi.number().positive().required().messages({
    'number.positive': 'minimumWeightKg must be a positive number',
    'any.required': 'minimumWeightKg is required',
  }),
  targetWeightKg: Joi.number().positive().optional().allow(null),
  maximumWeightKg: Joi.number().positive().optional().allow(null),
  requestedByDate: Joi.date().iso().optional().allow(null),
  pickupRequired: Joi.boolean().default(false),
  pickupArea: Joi.string().max(255).optional().allow('', null),
  offeredRatePerKg: Joi.number().positive().optional().allow(null),
  rateUnit: Joi.string()
    .valid(...Object.values(PRICE_UNITS))
    .default(PRICE_UNITS.PER_KG),
  notes: Joi.string().max(2000).optional().allow('', null),
  status: Joi.string()
    .valid(...Object.values(SOURCING_REQUEST_STATUS))
    .optional(),
  isDraft: Joi.boolean().optional(),
});

const updateSourcingRequest = Joi.object({
  status: Joi.string()
    .valid(...Object.values(SOURCING_REQUEST_STATUS))
    .optional(),
  cancellationReason: Joi.string().max(255).optional().allow('', null),
  requestedByDate: Joi.date().iso().optional().allow(null),
  pickupArea: Joi.string().max(255).optional().allow('', null),
  offeredRatePerKg: Joi.number().positive().optional().allow(null),
  notes: Joi.string().max(2000).optional().allow('', null),
});

const createSourcingResponse = Joi.object({
  availableWeightKg: Joi.number().positive().required().messages({
    'number.positive': 'availableWeightKg must be a positive number',
    'any.required': 'availableWeightKg is required',
  }),
  condition: Joi.string()
    .valid(...Object.values(ITEM_CONDITIONS))
    .optional(),
  pickupAddress: Joi.string().max(255).optional().allow('', null),
  latitude: Joi.number().min(-90).max(90).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).optional().allow(null),
  availableDate: Joi.date().iso().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow('', null),
  materialLotId: Joi.string().uuid().optional().allow(null),
});

const updateSourcingResponse = Joi.object({
  availableWeightKg: Joi.number().positive().optional(),
  condition: Joi.string()
    .valid(...Object.values(ITEM_CONDITIONS))
    .optional(),
  pickupAddress: Joi.string().max(255).optional().allow('', null),
  availableDate: Joi.date().iso().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow('', null),
  status: Joi.string()
    .valid(...Object.values(SOURCING_RESPONSE_STATUS))
    .optional(),
  materialLotId: Joi.string().uuid().optional().allow(null),
});

const listRequestsQuery = Joi.object({
  category: Joi.string().valid(...Object.values(MATERIAL_CATEGORIES)).optional(),
  condition: Joi.string().valid(...Object.values(ITEM_CONDITIONS)).optional(),
  status: Joi.string().valid(...Object.values(SOURCING_REQUEST_STATUS)).optional(),
  minWeight: Joi.number().positive().optional(),
  pickupRequired: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
  myRequests: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createSourcingRequest,
  updateSourcingRequest,
  createSourcingResponse,
  updateSourcingResponse,
  listRequestsQuery,
};
