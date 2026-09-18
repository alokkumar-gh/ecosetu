// EcoSetu Notification Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 13, docs/10_BACKEND_ARCHITECTURE.md

const { query, param } = require('express-validator');

const listNotifications = [
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean')
    .toBoolean(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be an integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

const markAsRead = [
  param('id')
    .isUUID()
    .withMessage('Notification ID must be a valid UUID'),
];

const registerDeviceToken = [
  query().custom((value, { req }) => true),
  param().custom((value, { req }) => true),
  require('express-validator').body('token')
    .isString()
    .trim()
    .isLength({ min: 32, max: 500 })
    .withMessage('Device token must be a string between 32 and 500 characters'),
  require('express-validator').body('platform')
    .optional()
    .isIn(['android', 'ios', 'web'])
    .withMessage('platform must be one of: android, ios, web'),
];

const unregisterDeviceToken = [
  require('express-validator').body('token')
    .isString()
    .trim()
    .isLength({ min: 32, max: 500 })
    .withMessage('Device token must be a string between 32 and 500 characters'),
];

module.exports = {
  listNotifications,
  markAsRead,
  registerDeviceToken,
  unregisterDeviceToken,
};
