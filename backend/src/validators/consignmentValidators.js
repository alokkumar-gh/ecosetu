// EcoSetu Consignment Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 9, docs/10_BACKEND_ARCHITECTURE.md

const { body, query, param } = require('express-validator');
const { CONSIGNMENT_STATUS } = require('../utils/constants');

const VALID_CONSIGNMENT_STATUSES = Object.values(CONSIGNMENT_STATUS);

const PROTECTED_CONSIGNMENT_FIELDS = [
  'id',
  'collectorId',
  'status',
  'totalItems',
  'deliveredAt',
  'acceptedAt',
  'rejectedAt',
  'rejectionReason',
  'createdAt',
  'updatedAt',
];

const createConsignment = [
  body().custom((value, { req }) => {
    for (const field of PROTECTED_CONSIGNMENT_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    return true;
  }),

  body('recyclerId')
    .exists({ checkNull: true })
    .withMessage('recyclerId is required')
    .isUUID()
    .withMessage('recyclerId must be a valid UUID'),

  body('itemIds')
    .exists({ checkNull: true })
    .withMessage('itemIds array is required')
    .custom((itemIds) => {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error('itemIds must be a non-empty array of item UUIDs');
      }
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      const seen = new Set();
      for (const id of itemIds) {
        if (typeof id !== 'string' || !uuidRegex.test(id)) {
          throw new Error(`Invalid item UUID in itemIds: ${id}`);
        }
        if (seen.has(id)) {
          throw new Error(`Duplicate item ID in itemIds: ${id}`);
        }
        seen.add(id);
      }
      return true;
    }),

  body('totalWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage('totalWeightKg must be a positive number of at least 0.01'),

  body('deliveryNotes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('deliveryNotes must not exceed 500 characters'),
];

const listConsignments = [
  query('status')
    .optional()
    .isIn(VALID_CONSIGNMENT_STATUSES)
    .withMessage(`status must be one of: ${VALID_CONSIGNMENT_STATUSES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
];

const deliverConsignment = [
  param('id')
    .isUUID()
    .withMessage('Consignment ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_CONSIGNMENT_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    return true;
  }),
];

const acceptConsignment = [
  param('id')
    .isUUID()
    .withMessage('Consignment ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_CONSIGNMENT_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    return true;
  }),
];

const rejectConsignment = [
  param('id')
    .isUUID()
    .withMessage('Consignment ID must be a valid UUID'),

  body('reason')
    .exists({ checkNull: true })
    .withMessage('Rejection reason is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Rejection reason must be between 1 and 500 characters'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_CONSIGNMENT_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    return true;
  }),
];

module.exports = {
  createConsignment,
  listConsignments,
  deliverConsignment,
  acceptConsignment,
  rejectConsignment,
};
