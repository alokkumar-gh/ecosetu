// EcoSetu E-Waste Item Routes (/api/v1/ewaste-items)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 6, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const ewasteController = require('../controllers/ewasteController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const ewasteValidators = require('../validators/ewasteValidators');
const { handleImageUpload } = require('../middleware/uploadMiddleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Upload an e-waste photo (Citizen only)
router.post(
  '/upload',
  authenticate,
  authorize(ROLES.CITIZEN),
  handleImageUpload,
  (req, res, next) => ewasteController.uploadImage(req, res, next)
);

// Stream authorized e-waste photo by fileKey (supports hierarchical keys like ewaste/itemId/uuid.jpg)
router.get(
  '/media/:fileKey(*)',
  authenticate,
  (req, res, next) => ewasteController.getItemImage(req, res, next)
);

// Stream authorized e-waste photo by itemId
router.get(
  '/:id/image',
  authenticate,
  validate(ewasteValidators.getItem),
  (req, res, next) => ewasteController.getItemImage(req, res, next)
);

// Submit a new e-waste item (Citizen only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.CITIZEN),
  handleImageUpload,
  validate(ewasteValidators.createItem),
  (req, res, next) => ewasteController.createItem(req, res, next)
);

// List current citizen's submitted items
router.get(
  '/',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(ewasteValidators.listItems),
  (req, res, next) => ewasteController.listItems(req, res, next)
);

// Get specific item details (Citizen owner, assigned collector, recycler, admin)
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(ewasteValidators.getItem),
  (req, res, next) => ewasteController.getItemById(req, res, next)
);

// Get item lifecycle traceability (Citizen owner, admin)
router.get(
  '/:id/traceability',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  validate(ewasteValidators.getItem),
  (req, res, next) => ewasteController.getItemTraceability(req, res, next)
);

module.exports = router;
