// EcoSetu Collection Request Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 7, docs/10_BACKEND_ARCHITECTURE.md

const { body, query, param } = require('express-validator');
const { REQUEST_STATUS } = require('../utils/constants');

const VALID_STATUSES = Object.values(REQUEST_STATUS);

const PROTECTED_REQUEST_FIELDS = [
  'id',
  'citizenId',
  'status',
  'collectorId',
  'submittedAt',
  'acceptedAt',
  'completedAt',
  'cancelledAt',
  'cancellationReason',
  'createdAt',
  'updatedAt',
];

const createRequest = [
  body().custom((value, { req }) => {
    for (const field of PROTECTED_REQUEST_FIELDS) {
      if (req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly on request creation`);
      }
    }
    return true;
  }),

  body('itemIds')
    .isArray({ min: 1 })
    .withMessage('itemIds must be an array containing at least one item UUID')
    .custom((items) => {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      for (const id of items) {
        if (typeof id !== 'string' || !uuidRegex.test(id)) {
          throw new Error(`Invalid item UUID: ${id}`);
        }
      }
      return true;
    }),

  body('pickupAddress')
    .trim()
    .notEmpty()
    .withMessage('pickupAddress is required')
    .isLength({ max: 500 })
    .withMessage('pickupAddress must not exceed 500 characters'),

  body('pickupLat')
    .exists({ checkNull: true })
    .withMessage('pickupLat is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('pickupLat must be a valid latitude between -90 and 90'),

  body('pickupLng')
    .exists({ checkNull: true })
    .withMessage('pickupLng is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('pickupLng must be a valid longitude between -180 and 180'),

  body('preferredDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('preferredDate must be a valid ISO8601 date'),

  body('preferredTimeStart')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('preferredTimeStart must be in HH:mm format'),

  body('preferredTimeEnd')
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('preferredTimeEnd must be in HH:mm format'),

  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('notes must not exceed 500 characters'),
];

const listRequests = [
  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
];

const listAvailable = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be a valid latitude between -90 and 90'),

  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng must be a valid longitude between -180 and 180'),

  query('radiusKm')
    .optional()
    .isFloat({ min: 1, max: 50 })
    .withMessage('radiusKm must be between 1 and 50 km'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
];

const getRequest = [
  param('id')
    .isUUID()
    .withMessage('Request ID must be a valid UUID'),
];

const submitRequest = [
  param('id')
    .isUUID()
    .withMessage('Request ID must be a valid UUID'),
];

const cancelRequest = [
  param('id')
    .isUUID()
    .withMessage('Request ID must be a valid UUID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('cancellation reason is required')
    .isLength({ max: 500 })
    .withMessage('reason must not exceed 500 characters'),
];

const acceptRequest = [
  param('id')
    .isUUID()
    .withMessage('Request ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_REQUEST_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is protected and cannot be set directly on request acceptance`);
      }
    }
    return true;
  }),
];

module.exports = {
  createRequest,
  listRequests,
  listAvailable,
  getRequest,
  submitRequest,
  cancelRequest,
  acceptRequest,
};
