// EcoSetu Recycling Record Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 10, docs/10_BACKEND_ARCHITECTURE.md

const { body, query, param } = require('express-validator');
const { RECYCLING_STATUS } = require('../utils/constants');

const VALID_RECYCLING_STATUSES = Object.values(RECYCLING_STATUS);

const PROTECTED_RECYCLING_FIELDS = [
  'id',
  'consignmentId',
  'recyclerId',
  'status',
  'receivedAt',
  'processingStartedAt',
  'completedAt',
  'createdAt',
  'updatedAt',
];

const listRecords = [
  query('status')
    .optional()
    .isIn(VALID_RECYCLING_STATUSES)
    .withMessage(`status must be one of: ${VALID_RECYCLING_STATUSES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
];

const getRecord = [
  param('id')
    .isUUID()
    .withMessage('Recycling record ID must be a valid UUID'),
];

const startProcessing = [
  param('id')
    .isUUID()
    .withMessage('Recycling record ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_RECYCLING_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    return true;
  }),
];

const completeRecycling = [
  param('id')
    .isUUID()
    .withMessage('Recycling record ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_RECYCLING_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly`);
      }
    }
    return true;
  }),

  body('processingNotes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('processingNotes must not exceed 1000 characters'),

  body('outputDescription')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('outputDescription must not exceed 500 characters'),

  body('outputWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('outputWeightKg must be a non-negative number >= 0'),
];

module.exports = {
  listRecords,
  getRecord,
  startProcessing,
  completeRecycling,
};
