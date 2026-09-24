// EcoSetu Dispute Request Validation Schemas
// Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows

const Joi = require('joi');
const { DISPUTE_TYPES, DISPUTE_RESOLUTION_TYPE } = require('../utils/constants');

const openDisputeSchema = Joi.object({
  materialLotId: Joi.string().uuid().required().messages({
    'string.guid': 'materialLotId must be a valid UUID',
    'any.required': 'materialLotId is required',
  }),
  quoteId: Joi.string().uuid().optional().allow(null, ''),
  handoverId: Joi.string().uuid().optional().allow(null, ''),
  transactionId: Joi.string().uuid().optional().allow(null, ''),
  pickupBatchId: Joi.string().uuid().optional().allow(null, ''),
  disputeType: Joi.string()
    .valid(...Object.values(DISPUTE_TYPES))
    .required()
    .messages({
      'any.only': `disputeType must be one of: ${Object.values(DISPUTE_TYPES).join(', ')}`,
      'any.required': 'disputeType is required',
    }),
  description: Joi.string().trim().min(5).max(2000).required().messages({
    'string.min': 'Description must be at least 5 characters long',
    'string.max': 'Description cannot exceed 2000 characters',
    'any.required': 'Description is required',
  }),
  evidenceUrls: Joi.array().items(Joi.string().uri()).max(10).optional().default([]),
  disputedEstimatedWeightKg: Joi.number().positive().max(100000).optional().allow(null),
  disputedFinalWeightKg: Joi.number().min(0).max(100000).optional().allow(null),
  disputedQuantityKg: Joi.number().positive().max(100000).optional().allow(null),
  disputedAmount: Joi.number().min(0).max(100000000).optional().allow(null),
});

const respondDisputeSchema = Joi.object({
  note: Joi.string().trim().min(2).max(2000).required().messages({
    'string.min': 'Response note must be at least 2 characters long',
    'any.required': 'Response note is required',
  }),
  proposedWeightKg: Joi.number().positive().max(100000).optional().allow(null),
  proposedAmount: Joi.number().min(0).max(100000000).optional().allow(null),
  proposedAction: Joi.string().trim().max(100).optional().allow(null, ''),
  acceptedQuantityKg: Joi.number().positive().max(100000).optional().allow(null),
  rejectedQuantityKg: Joi.number().min(0).max(100000).optional().allow(null),
  evidenceUrls: Joi.array().items(Joi.string().uri()).max(10).optional().default([]),
});

const resolveDisputeSchema = Joi.object({
  resolutionType: Joi.string()
    .valid(...Object.values(DISPUTE_RESOLUTION_TYPE))
    .required()
    .messages({
      'any.only': `resolutionType must be one of: ${Object.values(DISPUTE_RESOLUTION_TYPE).join(', ')}`,
      'any.required': 'resolutionType is required',
    }),
  resolutionNotes: Joi.string().trim().min(5).max(2000).required().messages({
    'string.min': 'Resolution notes must be at least 5 characters long',
    'any.required': 'Resolution notes are required',
  }),
  resolvedWeightKg: Joi.number().positive().max(100000).optional().allow(null),
  resolvedAmount: Joi.number().min(0).max(100000000).optional().allow(null),
  acceptedQuantityKg: Joi.number().positive().max(100000).optional().allow(null),
  rejectedQuantityKg: Joi.number().min(0).max(100000).optional().allow(null),
});

const cancelDisputeSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required().messages({
    'string.min': 'Cancellation reason must be at least 3 characters long',
    'any.required': 'Cancellation reason is required',
  }),
});

const returnDisputeSchema = Joi.object({
  returnTrackingNotes: Joi.string().trim().max(1000).optional().allow(null, ''),
  quantityKg: Joi.number().positive().max(100000).optional().allow(null),
});

const completeReturnSchema = Joi.object({
  completionNotes: Joi.string().trim().max(1000).optional().allow(null, ''),
});

const listDisputesQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(require('../utils/constants').DISPUTE_STATUS)).optional(),
  disputeType: Joi.string().valid(...Object.values(require('../utils/constants').DISPUTE_TYPES)).optional(),
  materialLotId: Joi.string().uuid().optional(),
  search: Joi.string().trim().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

module.exports = {
  openDisputeSchema,
  respondDisputeSchema,
  resolveDisputeSchema,
  cancelDisputeSchema,
  returnDisputeSchema,
  completeReturnSchema,
  listDisputesQuerySchema,
};
