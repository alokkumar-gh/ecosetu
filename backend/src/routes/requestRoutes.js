// EcoSetu Collection Request Routes (/api/v1/collection-requests)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 7, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const requestController = require('../controllers/requestController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkVerified = require('../middleware/checkVerified');
const validate = require('../middleware/validate');
const requestValidators = require('../validators/requestValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Create a new collection request (Citizen only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(requestValidators.createRequest),
  (req, res, next) => requestController.createRequest(req, res, next)
);

// List requests (Citizen sees own, Admin sees all)
router.get(
  '/',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  validate(requestValidators.listRequests),
  (req, res, next) => requestController.listRequests(req, res, next)
);

// List available requests for verified collectors
router.get(
  '/available',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(requestValidators.listAvailable),
  (req, res, next) => requestController.listAvailableRequests(req, res, next)
);

// Get specific request details
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  validate(requestValidators.getRequest),
  (req, res, next) => requestController.getRequestById(req, res, next)
);

// Move request from DRAFT to SUBMITTED (Citizen owner only)
router.post(
  '/:id/submit',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(requestValidators.submitRequest),
  (req, res, next) => requestController.submitRequest(req, res, next)
);

// Collector submits or updates an offer for a collection request
router.post(
  '/:id/offers',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(requestValidators.submitOffer),
  (req, res, next) => requestController.submitOffer(req, res, next)
);

// List offers for a collection request (Citizen owner, Collector self, Admin)
router.get(
  '/:id/offers',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  validate(requestValidators.listOffers),
  (req, res, next) => requestController.listOffers(req, res, next)
);

// Citizen accepts a specific collector offer (Transactional)
router.post(
  '/:id/offers/:offerId/accept',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(requestValidators.acceptOffer),
  (req, res, next) => requestController.acceptOffer(req, res, next)
);

// Citizen counter-offers / negotiates a specific collector offer
router.post(
  '/:id/offers/:offerId/counter',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(requestValidators.counterOffer),
  (req, res, next) => requestController.counterOffer(req, res, next)
);

// Citizen rejects a specific collector offer
router.post(
  '/:id/offers/:offerId/reject',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(requestValidators.rejectOffer),
  (req, res, next) => requestController.rejectOffer(req, res, next)
);

// Cancel collection request (Citizen owner or Admin)
router.post(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  validate(requestValidators.cancelRequest),
  (req, res, next) => requestController.cancelRequest(req, res, next)
);

// Collector accepts a request directly (Legacy fallback)
router.post(
  '/:id/accept',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(requestValidators.acceptRequest),
  (req, res, next) => requestController.acceptRequest(req, res, next)
);

module.exports = router;
