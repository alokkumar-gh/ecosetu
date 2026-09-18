// EcoSetu E-Waste Item Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 6, docs/10_BACKEND_ARCHITECTURE.md

const { body, query, param } = require('express-validator');
const { EWASTE_CATEGORIES, ITEM_CONDITIONS, ITEM_STATUS } = require('../utils/constants');

const VALID_CATEGORIES = Object.values(EWASTE_CATEGORIES);
const VALID_CONDITIONS = Object.values(ITEM_CONDITIONS);
const VALID_STATUSES = Object.values(ITEM_STATUS);

const PROTECTED_ITEM_FIELDS = [
  'id',
  'citizenId',
  'collectionRequestId',
  'actualWeightKg',
  'status',
  'createdAt',
  'updatedAt',
];

const createItem = [
  body().custom((value, { req }) => {
    for (const field of PROTECTED_ITEM_FIELDS) {
      if (req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly on creation`);
      }
    }
    return true;
  }),

  body('category')
    .exists({ checkNull: true })
    .withMessage('category is required')
    .isIn(VALID_CATEGORIES)
    .withMessage(`Invalid e-waste category. Allowed categories: ${VALID_CATEGORIES.join(', ')}`),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('description must not exceed 500 characters'),

  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('quantity must be an integer between 1 and 100'),

  body('condition')
    .optional()
    .isIn(VALID_CONDITIONS)
    .withMessage(`condition must be one of: ${VALID_CONDITIONS.join(', ')}`),

  body('estimatedWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01, max: 500 })
    .withMessage('estimatedWeightKg must be a positive number between 0.01 and 500 kg'),

  body('imageUrl')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('imageUrl must not exceed 500 characters'),

  body('requestAiPrediction')
    .optional()
    .isBoolean()
    .withMessage('requestAiPrediction must be a boolean value'),
];

const listItems = [
  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
];

const getItem = [
  param('id')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
];

module.exports = {
  createItem,
  listItems,
  getItem,
};
