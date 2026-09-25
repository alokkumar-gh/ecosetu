// EcoSetu Admin Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const { param, body, query } = require('express-validator');
const { ROLES, USER_STATUS, VERIFICATION_STATUS, RECYCLER_AUTHORIZATION_STATUS, PICKUP_AVAILABILITY } = require('../utils/constants');

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
    .isIn([...Object.values(VERIFICATION_STATUS), 'ALL', 'PENDING_ALL'])
    .withMessage(`Invalid status filter. Allowed: ${Object.values(VERIFICATION_STATUS).join(', ')}, ALL`),

  query('role')
    .optional()
    .isIn([...Object.values(ROLES), 'ALL'])
    .withMessage(`Invalid role filter. Allowed: ${Object.values(ROLES).join(', ')}, ALL`),

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
    .isIn([
      VERIFICATION_STATUS.APPROVED,
      VERIFICATION_STATUS.REJECTED,
      VERIFICATION_STATUS.CHANGES_REQUIRED,
      VERIFICATION_STATUS.UNDER_REVIEW,
    ])
    .withMessage('status must be one of: APPROVED, REJECTED, CHANGES_REQUIRED, UNDER_REVIEW'),

  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('reviewNotes must not exceed 1000 characters'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('rejectionReason must not exceed 1000 characters'),

  body('changeRequestReason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('changeRequestReason must not exceed 1000 characters'),

  body('changeRequestOptions')
    .optional()
    .isArray()
    .withMessage('changeRequestOptions must be an array of strings'),
];

const sendCustomNotification = [
  body('title')
    .exists({ checkNull: true })
    .withMessage('Title is required')
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('message')
    .exists({ checkNull: true })
    .withMessage('Message is required')
    .isString()
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Message must be between 5 and 1000 characters'),

  body('audience')
    .exists({ checkNull: true })
    .withMessage('Audience is required')
    .isString()
    .toUpperCase()
    .isIn([
      'ALL',
      'CITIZENS',
      'COLLECTORS',
      'RECYCLERS',
      'ADMINS',
      'VERIFIED',
      'PENDING_VERIFICATION',
      'SUSPENDED',
      'INDIVIDUAL',
    ])
    .withMessage('Invalid audience target'),

  body('targetUserId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('targetUserId must be a valid UUID'),

  body('type')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 }),

  body('actionUrl')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 500 }),

  body('confirmed')
    .optional()
    .isBoolean()
    .toBoolean(),
];

const previewRecipients = [
  query('audience')
    .exists({ checkNull: true })
    .withMessage('Audience is required')
    .isString()
    .toUpperCase()
    .isIn([
      'ALL',
      'CITIZENS',
      'COLLECTORS',
      'RECYCLERS',
      'ADMINS',
      'VERIFIED',
      'PENDING_VERIFICATION',
      'SUSPENDED',
      'INDIVIDUAL',
    ])
    .withMessage('Invalid audience target'),

  query('targetUserId')
    .optional()
    .isUUID()
    .withMessage('targetUserId must be a valid UUID'),
];

const getAnalytics = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y', 'custom', 'all', '7D', '30D', '90D', '1Y', 'CUSTOM', 'ALL'])
    .withMessage('period must be one of: 7d, 30d, 90d, 1y, custom, all'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
];

const listAdminRecyclers = [
  query('authorizationStatus')
    .optional()
    .isIn(Object.values(RECYCLER_AUTHORIZATION_STATUS))
    .withMessage(`Invalid authorizationStatus filter. Allowed: ${Object.values(RECYCLER_AUTHORIZATION_STATUS).join(', ')}`),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search must not exceed 100 characters'),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('city must not exceed 100 characters'),

  query('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('state must not exceed 100 characters'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be an integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const updateRecyclerAuthorization = [
  param('id')
    .isUUID()
    .withMessage('Valid recycler ID UUID is required'),

  body('status')
    .notEmpty()
    .withMessage('status is required')
    .isIn(Object.values(RECYCLER_AUTHORIZATION_STATUS))
    .withMessage(`Invalid status. Allowed: ${Object.values(RECYCLER_AUTHORIZATION_STATUS).join(', ')}`),

  body('reason')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Reason must not exceed 1000 characters'),

  body('authorizationNumber')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('authorizationNumber must not exceed 100 characters'),

  body('issuingAuthority')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('issuingAuthority must not exceed 200 characters'),

  body('validFrom')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('validFrom must be a valid ISO 8601 date'),

  body('validTill')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('validTill must be a valid ISO 8601 date')
    .custom((validTill, { req }) => {
      if (validTill && req.body.validFrom) {
        if (new Date(validTill) < new Date(req.body.validFrom)) {
          throw new Error('validTill must be greater than or equal to validFrom');
        }
      }
      return true;
    }),
];

const updateRecyclerProfile = [
  param('id')
    .isUUID()
    .withMessage('Valid recycler ID UUID is required'),

  body('facilityName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('facilityName cannot be empty')
    .isLength({ max: 200 })
    .withMessage('facilityName must not exceed 200 characters'),

  body('facilityAddress')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('facilityAddress cannot be empty'),

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

  body('serviceArea')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('serviceArea must not exceed 255 characters'),

  body('serviceRadiusKm')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1000 })
    .withMessage('serviceRadiusKm must be a positive number up to 1000'),

  body('pickupAvailable')
    .optional({ nullable: true })
    .isIn(Object.values(PICKUP_AVAILABILITY))
    .withMessage('Invalid pickupAvailable value'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

module.exports = {
  listUsers,
  updateUserStatus,
  listAuditLogs,
  listVerifications,
  updateVerification,
  sendCustomNotification,
  previewRecipients,
  getAnalytics,
  listAdminRecyclers,
  updateRecyclerAuthorization,
  updateRecyclerProfile,
};

