// EcoSetu Material Lot Validators
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4

const { body, query, param } = require('express-validator');
const {
  MATERIAL_CATEGORIES,
  ITEM_CONDITIONS,
  MATERIAL_SOURCE_TYPES,
  MATERIAL_LOT_STATUS,
  LISTING_PURPOSE,
  PRICE_UNITS,
} = require('../utils/constants');

const VALID_CATEGORIES = Object.values(MATERIAL_CATEGORIES);
const VALID_CONDITIONS = Object.values(ITEM_CONDITIONS);
const VALID_SOURCE_TYPES = Object.values(MATERIAL_SOURCE_TYPES);
const VALID_LOT_STATUSES = Object.values(MATERIAL_LOT_STATUS);
const VALID_LISTING_PURPOSES = Object.values(LISTING_PURPOSE);
const VALID_PRICE_UNITS = Object.values(PRICE_UNITS);

const PROTECTED_LOT_FIELDS = [
  'id',
  'referenceNumber',
  'collectorId',
  'createdAt',
  'updatedAt',
];

const createMaterialLot = [
  body().custom((value, { req }) => {
    for (const field of PROTECTED_LOT_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is server-generated and cannot be set directly by client`);
      }
    }
    return true;
  }),

  body('category')
    .exists({ checkNull: true })
    .withMessage('category is required')
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('subcategory')
    .optional({ nullable: true })
    .isString()
    .withMessage('subcategory must be a string')
    .isLength({ max: 100 })
    .withMessage('subcategory max length is 100 characters'),

  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('description must be a string')
    .isLength({ max: 2000 })
    .withMessage('description max length is 2000 characters'),

  body('approximateTotalWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage('approximateTotalWeightKg must be a positive number greater than 0'),

  body('approximateWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage('approximateWeightKg must be a positive number greater than 0'),

  body('condition')
    .optional({ nullable: true })
    .isIn(VALID_CONDITIONS)
    .withMessage(`condition must be one of: ${VALID_CONDITIONS.join(', ')}`),

  body('sourceType')
    .optional({ nullable: true })
    .isIn(VALID_SOURCE_TYPES)
    .withMessage(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}`),

  body('status')
    .optional({ nullable: true })
    .isIn([MATERIAL_LOT_STATUS.DRAFT, MATERIAL_LOT_STATUS.OPEN])
    .withMessage('Initial status must be DRAFT or OPEN'),

  body('collectionLat')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('collectionLat must be between -90 and 90 degrees'),

  body('collectionLng')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('collectionLng must be between -180 and 180 degrees'),

  body('collectionAccuracy')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('collectionAccuracy must be a non-negative number'),

  body('collectionTimestamp')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('collectionTimestamp must be a valid ISO8601 date'),

  body('clientReferenceId')
    .optional({ nullable: true })
    .isString()
    .withMessage('clientReferenceId must be a string')
    .isLength({ max: 100 }),
  body('listingPurpose')
    .optional({ nullable: true })
    .isIn(Object.values(LISTING_PURPOSE))
    .withMessage(`listingPurpose must be one of: ${Object.values(LISTING_PURPOSE).join(', ')}`),

  body('askingPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('askingPrice must be a non-negative number'),

  body('priceUnit')
    .optional({ nullable: true })
    .isIn(Object.values(PRICE_UNITS))
    .withMessage(`priceUnit must be one of: ${Object.values(PRICE_UNITS).join(', ')}`),

  body('photos')
    .optional({ nullable: true })
    .isArray()
    .withMessage('photos must be an array'),

  body('itemIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('itemIds must be an array of UUIDs'),
];

const updateMaterialLot = [
  param('id')
    .exists({ checkNull: true })
    .isUUID()
    .withMessage('Lot ID must be a valid UUID'),

  body().custom((value, { req }) => {
    for (const field of PROTECTED_LOT_FIELDS) {
      if (req.body && req.body[field] !== undefined) {
        throw new Error(`Field '${field}' is server-generated and cannot be modified`);
      }
    }
    return true;
  }),

  body('category')
    .optional({ nullable: true })
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('approximateTotalWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage('approximateTotalWeightKg must be a positive number greater than 0'),

  body('approximateWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage('approximateWeightKg must be a positive number greater than 0'),

  body('condition')
    .optional({ nullable: true })
    .isIn(VALID_CONDITIONS)
    .withMessage(`condition must be one of: ${VALID_CONDITIONS.join(', ')}`),

  body('sourceType')
    .optional({ nullable: true })
    .isIn(VALID_SOURCE_TYPES)
    .withMessage(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}`),

  body('status')
    .optional({ nullable: true })
    .isIn(VALID_LOT_STATUSES)
    .withMessage(`status must be one of: ${VALID_LOT_STATUSES.join(', ')}`),

  body('listingPurpose')
    .optional({ nullable: true })
    .isIn(VALID_LISTING_PURPOSES)
    .withMessage(`listingPurpose must be one of: ${VALID_LISTING_PURPOSES.join(', ')}`),

  body('askingPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('askingPrice must be a non-negative number'),

  body('priceUnit')
    .optional({ nullable: true })
    .isIn(VALID_PRICE_UNITS)
    .withMessage(`priceUnit must be one of: ${VALID_PRICE_UNITS.join(', ')}`),

  body('collectionLat')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('collectionLat must be between -90 and 90 degrees'),

  body('collectionLng')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('collectionLng must be between -180 and 180 degrees'),
];

const getMaterialLotById = [
  param('id')
    .exists({ checkNull: true })
    .isUUID()
    .withMessage('Lot ID must be a valid UUID'),
];

const listMaterialLots = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(VALID_LOT_STATUSES)
    .withMessage(`Status filter must be one of: ${VALID_LOT_STATUSES.join(', ')}`),

  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category filter must be one of: ${VALID_CATEGORIES.join(', ')}`),

  query('listingPurpose')
    .optional()
    .isIn(VALID_LISTING_PURPOSES)
    .withMessage(`listingPurpose must be one of: ${VALID_LISTING_PURPOSES.join(', ')}`),

  query('condition')
    .optional()
    .isIn(VALID_CONDITIONS)
    .withMessage(`condition must be one of: ${VALID_CONDITIONS.join(', ')}`),

  query('search')
    .optional()
    .isString()
    .withMessage('search must be a string'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be non-negative'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be non-negative'),
];

const addLotPhotos = [
  param('id')
    .exists({ checkNull: true })
    .isUUID()
    .withMessage('Lot ID must be a valid UUID'),

  body('photos')
    .optional()
    .isArray({ min: 1 })
    .withMessage('photos must be a non-empty array of photo objects or URLs'),
];

const createMaterialItem = [
  body('category')
    .exists({ checkNull: true })
    .withMessage('category is required')
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),

  body('approximateWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage('approximateWeightKg must be a positive number greater than 0'),

  body('condition')
    .optional({ nullable: true })
    .isIn(VALID_CONDITIONS)
    .withMessage(`condition must be one of: ${VALID_CONDITIONS.join(', ')}`),

  body('sourceType')
    .optional({ nullable: true })
    .isIn(VALID_SOURCE_TYPES)
    .withMessage(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}`),
];

module.exports = {
  createMaterialLot,
  updateMaterialLot,
  getMaterialLotById,
  listMaterialLots,
  addLotPhotos,
  createMaterialItem,
};
