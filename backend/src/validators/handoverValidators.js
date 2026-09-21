// EcoSetu Handover Validators
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)

const Joi = require('joi');
const { HANDOVER_STATUS } = require('../utils/constants');

const photoItemSchema = Joi.alternatives().try(
  Joi.string().uri().max(500),
  Joi.object({
    photoUrl: Joi.string().uri().max(500).required(),
    storagePath: Joi.string().max(255).allow(null, '').optional(),
    fileSize: Joi.number().integer().positive().optional(),
    mimeType: Joi.string().max(50).optional(),
    caption: Joi.string().max(100).allow(null, '').optional(),
    capturedAt: Joi.date().iso().optional(),
  })
);

const createHandoverSchema = Joi.object({
  materialLotId: Joi.string().uuid().required().messages({
    'any.required': 'materialLotId is required',
    'string.guid': 'materialLotId must be a valid UUID',
  }),
  quoteId: Joi.string().uuid().required().messages({
    'any.required': 'quoteId is required',
    'string.guid': 'quoteId must be a valid UUID',
  }),
  handoverWeightKg: Joi.number().positive().precision(2).max(100000).allow(null).optional().messages({
    'number.positive': 'handoverWeightKg must be a positive number',
  }),
  latitude: Joi.number().min(-90).max(90).allow(null).optional().messages({
    'number.min': 'latitude must be >= -90',
    'number.max': 'latitude must be <= 90',
  }),
  longitude: Joi.number().min(-180).max(180).allow(null).optional().messages({
    'number.min': 'longitude must be >= -180',
    'number.max': 'longitude must be <= 180',
  }),
  locationAccuracyMeters: Joi.number().positive().max(50000).allow(null).optional(),
  locationAvailable: Joi.boolean().optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
  photos: Joi.array().items(photoItemSchema).max(10).optional(),
});

const collectorConfirmSchema = Joi.object({
  handoverWeightKg: Joi.number().positive().precision(2).max(100000).optional().messages({
    'number.positive': 'handoverWeightKg must be a positive number',
  }),
  latitude: Joi.number().min(-90).max(90).allow(null).optional(),
  longitude: Joi.number().min(-180).max(180).allow(null).optional(),
  locationAccuracyMeters: Joi.number().positive().max(50000).allow(null).optional(),
  locationAvailable: Joi.boolean().optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
  photos: Joi.array().items(photoItemSchema).max(10).optional(),
});

const recyclerConfirmSchema = Joi.object({
  handoverWeightKg: Joi.number().positive().precision(2).max(100000).optional().messages({
    'number.positive': 'handoverWeightKg must be a positive number',
  }),
  notes: Joi.string().max(1000).allow(null, '').optional(),
});

const addPhotoSchema = Joi.object({
  photoUrl: Joi.string().uri().max(500).required().messages({
    'any.required': 'photoUrl is required',
    'string.uri': 'photoUrl must be a valid URI',
  }),
  storagePath: Joi.string().max(255).allow(null, '').optional(),
  fileSize: Joi.number().integer().positive().optional(),
  mimeType: Joi.string().max(50).optional(),
  caption: Joi.string().max(100).allow(null, '').optional(),
});

const cancelHandoverSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(255).required().messages({
    'any.required': 'Cancellation reason is required',
    'string.empty': 'Cancellation reason cannot be empty',
  }),
});

const queryHandoversSchema = Joi.object({
  status: Joi.string().valid(...Object.values(HANDOVER_STATUS)).optional(),
  materialLotId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createHandoverSchema,
  collectorConfirmSchema,
  recyclerConfirmSchema,
  addPhotoSchema,
  cancelHandoverSchema,
  queryHandoversSchema,
};
