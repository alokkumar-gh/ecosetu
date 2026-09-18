// EcoSetu Pickup Routes (/api/v1/pickups)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 8, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const pickupController = require('../controllers/pickupController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkVerified = require('../middleware/checkVerified');
const validate = require('../middleware/validate');
const pickupValidators = require('../validators/pickupValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// List pickups for current collector
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(pickupValidators.listPickups),
  (req, res, next) => pickupController.listPickups(req, res, next)
);

// Get pickup details (own collector, request citizen, admin)
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.CITIZEN, ROLES.ADMIN),
  validate(pickupValidators.getPickup),
  (req, res, next) => pickupController.getPickupById(req, res, next)
);

// Mark pickup as in progress (Assigned collector only)
router.patch(
  '/:id/start',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(pickupValidators.startPickup),
  (req, res, next) => pickupController.startPickup(req, res, next)
);

// Mark pickup as completed (Assigned collector only)
router.patch(
  '/:id/complete',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(pickupValidators.completePickup),
  (req, res, next) => pickupController.completePickup(req, res, next)
);

module.exports = router;
