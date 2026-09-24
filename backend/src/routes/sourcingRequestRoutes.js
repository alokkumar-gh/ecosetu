// EcoSetu Sourcing Request Routes (/api/v1/sourcing-requests and /api/v1/sourcing-responses)
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6

const express = require('express');
const sourcingRequestController = require('../controllers/sourcingRequestController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const sourcingRequestValidators = require('../validators/sourcingRequestValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Create a new sourcing request
router.post(
  '/',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  validate(sourcingRequestValidators.createSourcingRequest),
  (req, res, next) => sourcingRequestController.createRequest(req, res, next)
);

// Get list of sourcing requests (Demand feed for collectors, management for recyclers)
router.get(
  '/',
  authenticate,
  validate(sourcingRequestValidators.listRequestsQuery, 'query'),
  (req, res, next) => sourcingRequestController.getRequests(req, res, next)
);

// Get single sourcing request by ID
router.get(
  '/:id',
  authenticate,
  (req, res, next) => sourcingRequestController.getRequestById(req, res, next)
);

// Update sourcing request (e.g., status: PAUSED, OPEN, CANCELLED, FULFILLED)
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  validate(sourcingRequestValidators.updateSourcingRequest),
  (req, res, next) => sourcingRequestController.updateRequest(req, res, next)
);

// Respond to a sourcing request (Collector)
router.post(
  '/:id/respond',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  validate(sourcingRequestValidators.createSourcingResponse),
  (req, res, next) => sourcingRequestController.respondToRequest(req, res, next)
);

module.exports = router;
