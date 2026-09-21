/**
 * recyclerRateValidators.js
 * Express-validator schemas for Recycler Offered Rates and Matching
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 8 & 9
 */

const { body, query, param } = require('express-validator');
const {
  PRICE_UNITS,
  PRICE_SOURCES,
  PICKUP_AVAILABILITY,
  RECYCLER_RATE_STATUS,
} = require('../utils/constants');
const { isValidCategory } = require('../config/materialTaxonomy');

const createRecyclerRateValidation = [
  body('recyclerId')
    .optional()
    .isUUID().withMessage('Recycler ID must be a valid UUID'),

  body('category')
    .trim()
    .notEmpty().withMessage('Material category is required')
    .custom((val) => {
      if (!isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  body('subcategory')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Subcategory must not exceed 100 characters'),

  body('rate')
    .notEmpty().withMessage('Offered rate is required')
    .isFloat({ min: 0.01 }).withMessage('Offered rate must be a positive number greater than 0'),

  body('unit')
    .optional()
    .isIn(Object.values(PRICE_UNITS)).withMessage(`Unit must be one of: ${Object.values(PRICE_UNITS).join(', ')}`),

  body('currency')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Currency must not exceed 10 characters'),

  body('pickupAvailable')
    .optional()
    .isIn(Object.values(PICKUP_AVAILABILITY)).withMessage(`Pickup availability must be one of: ${Object.values(PICKUP_AVAILABILITY).join(', ')}`),

  body('serviceArea')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Service area must not exceed 255 characters'),

  body('source')
    .optional()
    .isIn(Object.values(PRICE_SOURCES)).withMessage(`Source must be one of: ${Object.values(PRICE_SOURCES).join(', ')}`),

  body('sourceReference')
    .trim()
    .notEmpty().withMessage('Source reference / provenance is required')
    .isLength({ max: 255 }).withMessage('Source reference must not exceed 255 characters'),

  body('status')
    .optional()
    .isIn(Object.values(RECYCLER_RATE_STATUS)).withMessage(`Status must be one of: ${Object.values(RECYCLER_RATE_STATUS).join(', ')}`),

  body('effectiveDate')
    .optional()
    .isISO8601().withMessage('Effective date must be a valid ISO 8601 string'),

  body('expiryDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Expiry date must be a valid ISO 8601 string'),
];

const updateRecyclerRateValidation = [
  param('id')
    .isUUID().withMessage('Rate ID must be a valid UUID'),

  body('rate')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Offered rate must be a positive number greater than 0'),

  body('unit')
    .optional()
    .isIn(Object.values(PRICE_UNITS)).withMessage(`Unit must be one of: ${Object.values(PRICE_UNITS).join(', ')}`),

  body('pickupAvailable')
    .optional()
    .isIn(Object.values(PICKUP_AVAILABILITY)).withMessage(`Pickup availability must be one of: ${Object.values(PICKUP_AVAILABILITY).join(', ')}`),

  body('serviceArea')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Service area must not exceed 255 characters'),

  body('status')
    .optional()
    .isIn(Object.values(RECYCLER_RATE_STATUS)).withMessage(`Status must be one of: ${Object.values(RECYCLER_RATE_STATUS).join(', ')}`),

  body('effectiveDate')
    .optional()
    .isISO8601().withMessage('Effective date must be a valid ISO 8601 string'),

  body('expiryDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Expiry date must be a valid ISO 8601 string'),

  body('sourceReference')
    .optional()
    .trim()
    .notEmpty().withMessage('Source reference cannot be empty')
    .isLength({ max: 255 }).withMessage('Source reference must not exceed 255 characters'),
];

const listRecyclerRatesValidation = [
  query('recyclerId')
    .optional()
    .isUUID().withMessage('Recycler ID must be a valid UUID'),

  query('category')
    .optional()
    .trim()
    .custom((val) => {
      if (val && !isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  query('status')
    .optional()
    .isIn(Object.values(RECYCLER_RATE_STATUS)).withMessage(`Status must be one of: ${Object.values(RECYCLER_RATE_STATUS).join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const matchLotValidation = [
  param('id')
    .isUUID().withMessage('Material Lot ID must be a valid UUID'),
];

module.exports = {
  createRecyclerRateValidation,
  updateRecyclerRateValidation,
  listRecyclerRatesValidation,
  matchLotValidation,
};
