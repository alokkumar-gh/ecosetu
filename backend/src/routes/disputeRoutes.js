// EcoSetu Dispute Routes (/api/v1/disputes)
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 7

const express = require('express');
const disputeController = require('../controllers/disputeController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const disputeValidators = require('../validators/disputeValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// 1. Open a new dispute
router.post(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(disputeValidators.openDisputeSchema),
  (req, res, next) => disputeController.openDispute(req, res, next)
);

// 2. List disputes (role-filtered)
router.get(
  '/',
  authenticate,
  validate(disputeValidators.listDisputesQuerySchema, 'query'),
  (req, res, next) => disputeController.getDisputes(req, res, next)
);

// 3. Get single dispute details
router.get(
  '/:id',
  authenticate,
  (req, res, next) => disputeController.getDisputeById(req, res, next)
);

// 4. Respond to dispute
router.post(
  '/:id/respond',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(disputeValidators.respondDisputeSchema),
  (req, res, next) => disputeController.respondToDispute(req, res, next)
);

// 5. Server-authoritative resolution
router.post(
  '/:id/resolve',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(disputeValidators.resolveDisputeSchema),
  (req, res, next) => disputeController.resolveDispute(req, res, next)
);

// 6. Cancel dispute
router.post(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(disputeValidators.cancelDisputeSchema),
  (req, res, next) => disputeController.cancelDispute(req, res, next)
);

// 7. Initiate return
router.post(
  '/:id/return',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(disputeValidators.returnDisputeSchema),
  (req, res, next) => disputeController.initiateReturn(req, res, next)
);

// 8. Complete return
router.post(
  '/:id/return/complete',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(disputeValidators.completeReturnSchema),
  (req, res, next) => disputeController.completeReturn(req, res, next)
);

module.exports = router;
