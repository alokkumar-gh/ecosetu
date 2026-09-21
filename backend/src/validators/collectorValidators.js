// EcoSetu Collector Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 4, docs/10_BACKEND_ARCHITECTURE.md

const { body } = require('express-validator');

const PROTECTED_COLLECTOR_FIELDS = [
  'id',
  'userId',
  'totalPickups',
  'idDocumentUrl',
  'createdAt',
  'updatedAt',
];

const upsertProfile = [
  body().custom((value, { req }) => {
    for (const field of PROTECTED_COLLECTOR_FIELDS) {
      if (req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be modified directly`);
      }
    }
    return true;
  }),

  body('serviceAreaLat')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('serviceAreaLat must be a valid latitude between -90 and 90'),

  body('serviceAreaLng')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('serviceAreaLng must be a valid longitude between -180 and 180'),

  body('serviceRadiusKm')
    .optional({ nullable: true })
    .isFloat({ min: 1, max: 50 })
    .withMessage('serviceRadiusKm must be between 1 and 50 kilometers'),

  body('serviceArea')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('serviceArea must not exceed 255 characters'),

  body('city')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('city must not exceed 100 characters'),

  body('state')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('state must not exceed 100 characters'),

  body('pincode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('pincode must be a valid 6-digit Indian postal PIN code'),

  body('preferredLanguage')
    .optional({ nullable: true })
    .isIn(['en', 'hi', 'mr', 'or'])
    .withMessage('preferredLanguage must be one of: en, hi, mr, or'),

  body('bio')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('bio must not exceed 500 characters'),
];

const toggleAvailability = [
  body('isAvailable')
    .exists({ checkNull: true })
    .withMessage('isAvailable field is required')
    .isBoolean()
    .withMessage('isAvailable must be a boolean value'),
];

const validateUpdateProfile = (data) => {
  const allowedLangs = ['en', 'hi', 'mr', 'or'];
  if (data.preferredLanguage !== undefined && data.preferredLanguage !== null) {
    if (!allowedLangs.includes(data.preferredLanguage)) {
      return { error: 'preferredLanguage must be one of: en, hi, mr, or' };
    }
  }
  return { error: undefined };
};

module.exports = {
  upsertProfile,
  toggleAvailability,
  validateUpdateProfile,
};
