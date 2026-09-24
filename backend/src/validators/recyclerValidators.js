// EcoSetu Recycler Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 5, docs/10_BACKEND_ARCHITECTURE.md

const { body, query, param } = require('express-validator');
const {
  EWASTE_CATEGORIES,
  MATERIAL_CATEGORIES,
  RECYCLER_AUTHORIZATION_STATUS,
  PICKUP_AVAILABILITY,
} = require('../utils/constants');

const VALID_CATEGORIES = Array.from(new Set([
  ...Object.values(EWASTE_CATEGORIES),
  ...Object.values(MATERIAL_CATEGORIES || {}),
]));
const VALID_AUTH_STATUSES = Object.values(RECYCLER_AUTHORIZATION_STATUS);
const VALID_PICKUP_STATUSES = Object.values(PICKUP_AVAILABILITY);

const PROTECTED_RECYCLER_FIELDS = [
  'id',
  'userId',
  'totalConsignments',
  'licenseDocumentUrl',
  'authorizationStatus',
  'authorizationNumber',
  'issuingAuthority',
  'authorizationValidFrom',
  'authorizationValidTill',
  'verifiedAt',
  'verifiedBy',
  'verificationNotes',
  'isActive',
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

  body('city')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('city must not exceed 100 characters'),

  body('district')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('district must not exceed 100 characters'),

  body('state')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('state must not exceed 100 characters'),

  body('pincode')
    .optional({ nullable: true })
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('pincode must be a valid 6-digit Indian postal PIN code'),

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

  body('acceptedSubcategories')
    .optional({ nullable: true })
    .isArray()
    .withMessage('acceptedSubcategories must be an array of strings'),

  body('pickupAvailable')
    .optional({ nullable: true })
    .isIn(VALID_PICKUP_STATUSES)
    .withMessage(`Invalid pickupAvailable value. Allowed: ${VALID_PICKUP_STATUSES.join(', ')}`),

  body('serviceArea')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('serviceArea must not exceed 255 characters'),

  body('serviceRadiusKm')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1000 })
    .withMessage('serviceRadiusKm must be a positive number up to 1000'),

  body('operationalPhone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('operationalPhone must not exceed 20 characters'),

  body('operationalEmail')
    .optional({ nullable: true })
    .trim()
    .isEmail()
    .withMessage('operationalEmail must be a valid email address'),
];

const listRecyclers = [
  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Invalid category filter. Allowed: ${VALID_CATEGORIES.join(', ')}`),

  query('authorizationStatus')
    .optional()
    .isIn(VALID_AUTH_STATUSES)
    .withMessage(`Invalid authorizationStatus filter. Allowed: ${VALID_AUTH_STATUSES.join(', ')}`),

  query('pickupAvailable')
    .optional()
    .isIn(VALID_PICKUP_STATUSES)
    .withMessage(`Invalid pickupAvailable filter. Allowed: ${VALID_PICKUP_STATUSES.join(', ')}`),

  query('hasRates')
    .optional()
    .isBoolean()
    .withMessage('hasRates must be a boolean (true or false)'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search term must not exceed 100 characters'),

  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be a valid latitude between -90 and 90'),

  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng must be a valid longitude between -180 and 180'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be an integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const getRecyclerById = [
  param('id')
    .isUUID()
    .withMessage('Valid recycler UUID is required'),

  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be a valid latitude between -90 and 90'),

  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng must be a valid longitude between -180 and 180'),

  query('lotId')
    .optional()
    .isUUID()
    .withMessage('lotId must be a valid UUID'),
];

module.exports = {
  PROTECTED_RECYCLER_FIELDS,
  upsertProfile,
  listRecyclers,
  getRecyclerById,
};
