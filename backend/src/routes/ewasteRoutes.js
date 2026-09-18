// EcoSetu E-Waste Item Routes (/api/v1/ewaste-items)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 6, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const ewasteController = require('../controllers/ewasteController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const ewasteValidators = require('../validators/ewasteValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Submit a new e-waste item (Citizen only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.CITIZEN),
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
