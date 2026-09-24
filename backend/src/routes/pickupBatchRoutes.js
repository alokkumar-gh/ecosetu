// EcoSetu Pickup Batch Routes (/api/v1/pickup-batches)
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 5: Advanced Logistics

const express = require('express');
const pickupBatchController = require('../controllers/pickupBatchController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const pickupBatchValidators = require('../validators/pickupBatchValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Get eligible lots for batch creation
router.get(
  '/eligible-lots',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => pickupBatchController.getEligibleLots(req, res, next)
);

// Create a new pickup batch
router.post(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(pickupBatchValidators.createBatch),
  (req, res, next) => pickupBatchController.createBatch(req, res, next)
);

// Get list of batches
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(pickupBatchValidators.listBatchesQuery, 'query'),
  (req, res, next) => pickupBatchController.getBatches(req, res, next)
);

// Get single batch by ID
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => pickupBatchController.getBatchById(req, res, next)
);

// Update batch status (e.g. SCHEDULED, IN_PROGRESS, ARRIVED, COLLECTING, COMPLETED, CANCELLED)
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(pickupBatchValidators.updateBatchStatus),
  (req, res, next) => pickupBatchController.updateBatchStatus(req, res, next)
);

// Add lots to existing batch
router.post(
  '/:id/lots',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(pickupBatchValidators.addLotsToBatch),
  (req, res, next) => pickupBatchController.addLotsToBatch(req, res, next)
);

// Remove lot from batch
router.delete(
  '/:id/lots/:lotId',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => pickupBatchController.removeLotFromBatch(req, res, next)
);

module.exports = router;
