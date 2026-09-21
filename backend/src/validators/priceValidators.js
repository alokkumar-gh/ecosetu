/**
 * priceValidators.js
 * Express-validator schemas for Price Ingestion and Valuation endpoints
 */

const { body, query, param } = require('express-validator');
const { PRICE_UNITS, PRICE_SOURCES, PRICE_STATUSES } = require('../utils/constants');
const { isValidCategory } = require('../config/materialTaxonomy');

const createPriceValidation = [
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

  body('buyingPrice')
    .notEmpty().withMessage('Buying price is required')
    .isFloat({ min: 0.01 }).withMessage('Buying price must be a positive number greater than 0'),

  body('quotedPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 }).withMessage('Quoted price must be a positive number greater than 0'),

  body('unit')
    .optional()
    .isIn(Object.values(PRICE_UNITS)).withMessage(`Unit must be one of: ${Object.values(PRICE_UNITS).join(', ')}`),

  body('source')
    .optional()
    .isIn(Object.values(PRICE_SOURCES)).withMessage(`Source must be one of: ${Object.values(PRICE_SOURCES).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(PRICE_STATUSES)).withMessage(`Status must be one of: ${Object.values(PRICE_STATUSES).join(', ')}`),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must not exceed 100 characters'),

  body('effectiveDate')
    .optional()
    .isISO8601().withMessage('Effective date must be a valid ISO 8601 string'),

  body('expiryDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Expiry date must be a valid ISO 8601 string'),
];

const updatePriceValidation = [
  param('id')
    .isUUID().withMessage('Price ID must be a valid UUID'),

  body('buyingPrice')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Buying price must be a positive number greater than 0'),

  body('quotedPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 }).withMessage('Quoted price must be a positive number greater than 0'),

  body('unit')
    .optional()
    .isIn(Object.values(PRICE_UNITS)).withMessage(`Unit must be one of: ${Object.values(PRICE_UNITS).join(', ')}`),

  body('status')
    .optional()
    .isIn(Object.values(PRICE_STATUSES)).withMessage(`Status must be one of: ${Object.values(PRICE_STATUSES).join(', ')}`),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must not exceed 100 characters'),
];

const estimateQueryValidation = [
  query('category')
    .trim()
    .notEmpty().withMessage('Category is required for valuation')
    .custom((val) => {
      if (!isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  query('weight')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Weight must be a positive number greater than 0'),

  query('weightKg')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('WeightKg must be a positive number greater than 0'),

  query('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must not exceed 100 characters'),
];

const historicalPriceQueryValidation = [
  query('category')
    .optional()
    .trim()
    .custom((val) => {
      if (val && !isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  query('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Subcategory must not exceed 100 characters'),

  query('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must not exceed 100 characters'),

  query('unit')
    .optional()
    .isIn(Object.values(PRICE_UNITS)).withMessage(`Unit must be one of: ${Object.values(PRICE_UNITS).join(', ')}`),

  query('source')
    .optional()
    .isIn(Object.values(PRICE_SOURCES)).withMessage(`Source must be one of: ${Object.values(PRICE_SOURCES).join(', ')}`),

  query('status')
    .optional()
    .isIn(Object.values(PRICE_STATUSES)).withMessage(`Status must be one of: ${Object.values(PRICE_STATUSES).join(', ')}`),

  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate must be a valid ISO 8601 string'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate must be a valid ISO 8601 string'),

  query('period')
    .optional()
    .isIn(['WEEKLY', 'MONTHLY', 'weekly', 'monthly']).withMessage('period must be either WEEKLY or MONTHLY'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be an integer between 1 and 100'),
];

module.exports = {
  createPriceValidation,
  updatePriceValidation,
  estimateQueryValidation,
  historicalPriceQueryValidation,
};

