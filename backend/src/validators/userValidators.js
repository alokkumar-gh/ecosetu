// EcoSetu User Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 3, docs/10_BACKEND_ARCHITECTURE.md

const { body } = require('express-validator');

const PROTECTED_USER_FIELDS = [
  'role',
  'status',
  'email',
  'password',
  'passwordHash',
  'id',
  'createdAt',
  'updatedAt',
  'avatarUrl',
];

const updateProfile = [
  body().custom((value, { req }) => {
    // 1. Guard against attempting to modify protected fields
    for (const field of PROTECTED_USER_FIELDS) {
      if (req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be modified via profile update`);
      }
    }

    // 2. Ensure at least one valid field is provided
    const hasName = req.body.name !== undefined;
    const hasPhone = req.body.phone !== undefined;

    if (!hasName && !hasPhone) {
      throw new Error('At least one field (name, phone) must be provided for update');
    }

    return true;
  }),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long'),

  body('phone')
    .optional({ nullable: true })
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/)
    .withMessage('Invalid phone number format'),
];

module.exports = {
  updateProfile,
};
