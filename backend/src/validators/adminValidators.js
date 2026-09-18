// EcoSetu Admin Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const { param, body, query } = require('express-validator');
const { ROLES, USER_STATUS, VERIFICATION_STATUS } = require('../utils/constants');

const ALLOWED_ADMIN_STATUS_UPDATES = [
  USER_STATUS.ACTIVE,
  USER_STATUS.SUSPENDED,
  USER_STATUS.DEACTIVATED,
];

const listUsers = [
  query('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage(`Invalid role filter. Allowed: ${Object.values(ROLES).join(', ')}`),

  query('status')
    .optional()
    .isIn(Object.values(USER_STATUS))
    .withMessage(`Invalid status filter. Allowed: ${Object.values(USER_STATUS).join(', ')}`),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const updateUserStatus = [
  param('id')
    .isUUID()
    .withMessage('Target user ID must be a valid UUID'),

  body('status')
    .exists({ checkNull: true })
    .withMessage('status is required')
    .isIn(ALLOWED_ADMIN_STATUS_UPDATES)
    .withMessage(`status must be one of: ${ALLOWED_ADMIN_STATUS_UPDATES.join(', ')}`),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('reason must not exceed 500 characters'),
];

const listAuditLogs = [
  query('action')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Action must not exceed 100 characters'),

  query('entityType')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('entityType must not exceed 50 characters'),

  query('actorId')
    .optional()
    .isUUID()
    .withMessage('actorId must be a valid UUID'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query && req.query.startDate) {
        if (new Date(req.query.startDate) > new Date(endDate)) {
          throw new Error('startDate cannot be after endDate');
        }
      }
      return true;
    }),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const listVerifications = [
  query('status')
    .optional()
    .isIn([...Object.values(VERIFICATION_STATUS), 'ALL'])
    .withMessage(`Invalid status filter. Allowed: ${Object.values(VERIFICATION_STATUS).join(', ')}, ALL`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const updateVerification = [
  param('id')
    .isUUID()
    .withMessage('Target verification ID must be a valid UUID'),

  body('status')
    .exists({ checkNull: true })
    .withMessage('status is required')
    .isIn([VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED])
    .withMessage(`status must be one of: ${VERIFICATION_STATUS.APPROVED}, ${VERIFICATION_STATUS.REJECTED}`),

  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('reviewNotes must not exceed 500 characters'),
];

module.exports = {
  listUsers,
  updateUserStatus,
  listAuditLogs,
  listVerifications,
  updateVerification,
};
