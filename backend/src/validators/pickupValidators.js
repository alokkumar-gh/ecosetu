// EcoSetu Pickup Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 8, docs/10_BACKEND_ARCHITECTURE.md

const { body, query, param } = require('express-validator');
const { PICKUP_STATUS } = require('../utils/constants');

const VALID_PICKUP_STATUSES = Object.values(PICKUP_STATUS);

const PROTECTED_PICKUP_FIELDS = [
  'id',
  'collectionRequestId',
  'collectorId',
  'status',
  'startedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
];

const listPickups = [
  query('status')
    .optional()
    .isIn(VALID_PICKUP_STATUSES)
    .withMessage(`status must be one of: ${VALID_PICKUP_STATUSES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
];

const getPickup = [
  param('id')
    .isUUID()
    .withMessage('Pickup ID must be a valid UUID'),
];

const startPickup = [
  param('id')
    .isUUID()
    .withMessage('Pickup ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_PICKUP_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be modified`);
      }
    }
    return true;
  }),
];

const completePickup = [
  param('id')
    .isUUID()
    .withMessage('Pickup ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_PICKUP_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    // If items was sent as a JSON string (e.g. from multipart form), parse it
    if (typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (e) {
        throw new Error('items must be valid JSON');
      }
    }
    return true;
  }),

  body('totalWeightKg')
    .exists({ checkNull: true })
    .withMessage('totalWeightKg is required')
    .isFloat({ min: 0.01 })
    .withMessage('totalWeightKg must be a positive number of at least 0.01'),

  body('collectorNotes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('collectorNotes must not exceed 500 characters'),

  body('items')
    .exists({ checkNull: true })
    .withMessage('items array is required')
    .custom((items) => {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('items must be a non-empty array of collected items');
      }
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          throw new Error('Each item must be an object with itemId and actualWeightKg');
        }
        if (!item.itemId || typeof item.itemId !== 'string' || !uuidRegex.test(item.itemId)) {
          throw new Error(`Invalid or missing itemId UUID in items: ${item.itemId}`);
        }
        const weight = parseFloat(item.actualWeightKg);
        if (isNaN(weight) || weight <= 0) {
          throw new Error(`actualWeightKg for item ${item.itemId} must be a number greater than 0`);
        }
      }
      return true;
    }),
];

module.exports = {
  listPickups,
  getPickup,
  startPickup,
  completePickup,
};
