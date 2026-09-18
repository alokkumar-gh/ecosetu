// EcoSetu Recycler Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 5, docs/10_BACKEND_ARCHITECTURE.md

const { body, query } = require('express-validator');
const { EWASTE_CATEGORIES } = require('../utils/constants');

const VALID_CATEGORIES = Object.values(EWASTE_CATEGORIES);

const PROTECTED_RECYCLER_FIELDS = [
  'id',
  'userId',
  'totalConsignments',
  'licenseDocumentUrl',
  'createdAt',
  'updatedAt',
];

const upsertProfile = [
  body().custom((value, { req }) => {
    for (const field of PROTECTED_RECYCLER_FIELDS) {
      if (req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be modified directly`);
      }
    }
    return true;
  }),

  body('facilityName')
    .trim()
    .notEmpty()
    .withMessage('facilityName is required')
    .isLength({ max: 200 })
    .withMessage('facilityName must not exceed 200 characters'),

  body('facilityAddress')
    .trim()
    .notEmpty()
    .withMessage('facilityAddress is required'),

  body('facilityLat')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('facilityLat must be a valid latitude between -90 and 90'),

  body('facilityLng')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('facilityLng must be a valid longitude between -180 and 180'),

  body('licenseNumber')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('licenseNumber must not exceed 100 characters'),

  body('acceptedCategories')
    .isArray()
    .withMessage('acceptedCategories must be an array of category IDs')
    .custom((categories) => {
      for (const cat of categories) {
        if (!VALID_CATEGORIES.includes(cat)) {
          throw new Error(`Invalid category '${cat}'. Allowed categories: ${VALID_CATEGORIES.join(', ')}`);
        }
      }
      return true;
    }),
];

const listRecyclers = [
  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Invalid category filter. Allowed: ${VALID_CATEGORIES.join(', ')}`),
];

module.exports = {
  upsertProfile,
  listRecyclers,
};
