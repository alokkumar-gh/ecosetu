// EcoSetu Pickup Batch Validators
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 5: Advanced Logistics

const Joi = require('joi');
const { BATCH_STATUS } = require('../utils/constants');

const createBatch = Joi.object({
  recyclerId: Joi.string().uuid().optional(),
  collectorId: Joi.string().uuid().optional(),
  lotIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one material lot ID is required to create a batch',
    'any.required': 'lotIds array is required',
  }),
  scheduledDate: Joi.date().iso().optional().allow(null),
  pickupAddress: Joi.string().max(255).optional().allow('', null),
  latitude: Joi.number().min(-90).max(90).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow('', null),
});

const updateBatchStatus = Joi.object({
  status: Joi.string().valid(...Object.values(BATCH_STATUS)).required().messages({
    'any.only': `status must be one of ${Object.values(BATCH_STATUS).join(', ')}`,
    'any.required': 'status is required',
  }),
  cancellationReason: Joi.string().max(255).optional().allow('', null),
  scheduledDate: Joi.date().iso().optional().allow(null),
  pickupAddress: Joi.string().max(255).optional().allow('', null),
  notes: Joi.string().max(1000).optional().allow('', null),
});

const addLotsToBatch = Joi.object({
  lotIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one material lot ID is required',
    'any.required': 'lotIds array is required',
  }),
});

const listBatchesQuery = Joi.object({
  status: Joi.string().valid(...Object.values(BATCH_STATUS)).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const scheduleBatch = Joi.object({
  scheduledDate: Joi.date().iso().required().messages({
    'any.required': 'scheduledDate is required',
  }),
  pickupAddress: Joi.string().max(255).optional().allow('', null),
  notes: Joi.string().max(1000).optional().allow('', null),
});

module.exports = {
  createBatch,
  updateBatchStatus,
  addLotsToBatch,
  listBatchesQuery,
  scheduleBatch,
};
