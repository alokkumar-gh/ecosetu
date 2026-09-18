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

module.exports = {
  upsertProfile,
  toggleAvailability,
};
