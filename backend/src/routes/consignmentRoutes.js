// EcoSetu Consignment Routes (/api/v1/consignments)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 9, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const consignmentController = require('../controllers/consignmentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkVerified = require('../middleware/checkVerified');
const validate = require('../middleware/validate');
const consignmentValidators = require('../validators/consignmentValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Create a consignment to a recycler (Verified informal collectors only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(consignmentValidators.createConsignment),
  (req, res, next) => consignmentController.createConsignment(req, res, next)
);

// List consignments (Collector own, Recycler received, Admin all)
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(consignmentValidators.listConsignments),
  (req, res, next) => consignmentController.listConsignments(req, res, next)
);

// Mark consignment as delivered (Delivering collector or assigned receiving recycler)
router.patch(
  '/:id/deliver',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER),
  checkVerified,
  validate(consignmentValidators.deliverConsignment),
  (req, res, next) => consignmentController.deliverConsignment(req, res, next)
);

// Recycler accepts delivered consignment (Assigned verified recycler only)
router.patch(
  '/:id/accept',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(consignmentValidators.acceptConsignment),
  (req, res, next) => consignmentController.acceptConsignment(req, res, next)
);

// Recycler rejects consignment with reason (Assigned verified recycler only)
router.patch(
  '/:id/reject',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(consignmentValidators.rejectConsignment),
  (req, res, next) => consignmentController.rejectConsignment(req, res, next)
);

module.exports = router;
