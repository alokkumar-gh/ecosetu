// EcoSetu Historical Analytics Validators
// Canonical Reference: SIH 26229 Problem Statement - Prompt 17

const { query } = require('express-validator');
const {
  MATERIAL_CATEGORIES,
  PRICE_UNITS,
  PRICE_SOURCES,
  MATERIAL_LOT_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
} = require('../utils/constants');
const { isValidCategory } = require('../config/materialTaxonomy');

/**
 * Validate that startDate <= endDate if both are provided
 */
const validateDateRange = (startDateStr, { req }) => {
  if (!startDateStr) return true;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) {
    throw new Error('startDate must be a valid ISO 8601 date');
  }

  const endDateStr = req.query?.endDate;
  if (endDateStr) {
    const end = new Date(endDateStr);
    if (isNaN(end.getTime())) {
      throw new Error('endDate must be a valid ISO 8601 date');
    }
    if (start > end) {
      throw new Error('startDate cannot be after endDate');
    }
  }

  return true;
};

const historicalPriceQuery = [
  query('category')
    .optional()
    .custom((val) => {
      if (!isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  query('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('subcategory must not exceed 100 characters'),

  query('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('location must not exceed 100 characters'),

  query('unit')
    .optional()
    .isIn(Object.values(PRICE_UNITS))
    .withMessage(`Invalid unit. Allowed: ${Object.values(PRICE_UNITS).join(', ')}`),

  query('source')
    .optional()
    .isIn(Object.values(PRICE_SOURCES))
    .withMessage(`Invalid source. Allowed: ${Object.values(PRICE_SOURCES).join(', ')}`),

  query('period')
    .optional()
    .toUpperCase()
    .isIn(['WEEKLY', 'MONTHLY'])
    .withMessage('period must be either WEEKLY or MONTHLY'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .custom(validateDateRange),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

const materialActivityQuery = [
  query('category')
    .optional()
    .custom((val) => {
      if (!isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  query('status')
    .optional()
    .isIn(Object.values(MATERIAL_LOT_STATUS))
    .withMessage(`Invalid status filter. Allowed: ${Object.values(MATERIAL_LOT_STATUS).join(', ')}`),

  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'custom', 'all', '7D', '30D', '90D', '1Y', 'CUSTOM', 'ALL'])
    .withMessage('period must be one of: 7d, 30d, 90d, 1y, custom, all'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .custom(validateDateRange),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

const transactionActivityQuery = [
  query('category')
    .optional()
    .custom((val) => {
      if (!isValidCategory(val)) {
        throw new Error(`Invalid material category: ${val}`);
      }
      return true;
    }),

  query('paymentStatus')
    .optional()
    .isIn(Object.values(PAYMENT_STATUS))
    .withMessage(`Invalid paymentStatus filter. Allowed: ${Object.values(PAYMENT_STATUS).join(', ')}`),

  query('transactionStatus')
    .optional()
    .isIn(Object.values(TRANSACTION_STATUS))
    .withMessage(`Invalid transactionStatus filter. Allowed: ${Object.values(TRANSACTION_STATUS).join(', ')}`),

  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'custom', 'all', '7D', '30D', '90D', '1Y', 'CUSTOM', 'ALL'])
    .withMessage('period must be one of: 7d, 30d, 90d, 1y, custom, all'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .custom(validateDateRange),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

const recyclerActivityQuery = [
  query('authorizationStatus')
    .optional()
    .isIn(Object.values(RECYCLER_AUTHORIZATION_STATUS))
    .withMessage(`Invalid authorizationStatus filter. Allowed: ${Object.values(RECYCLER_AUTHORIZATION_STATUS).join(', ')}`),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'custom', 'all', '7D', '30D', '90D', '1Y', 'CUSTOM', 'ALL'])
    .withMessage('period must be one of: 7d, 30d, 90d, 1y, custom, all'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .custom(validateDateRange),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

const generalAnalyticsQuery = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'custom', 'all', '7D', '30D', '90D', '1Y', 'CUSTOM', 'ALL'])
    .withMessage('period must be one of: 7d, 30d, 90d, 1y, custom, all'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .custom(validateDateRange),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

/**
 * Programmatic validator for analytics filter queries
 */
function validateAnalyticsQuery(q = {}) {
  const errors = [];
  if (q.startDate && q.endDate) {
    const s = new Date(q.startDate);
    const e = new Date(q.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
      errors.push('startDate cannot be after endDate');
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateAnalyticsQuery,
  historicalPriceQuery,
  materialActivityQuery,
  transactionActivityQuery,
  recyclerActivityQuery,
  generalAnalyticsQuery,
};
