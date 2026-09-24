// EcoSetu Handover Routes (/api/v1/handovers)
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)

const express = require('express');
const handoverController = require('../controllers/handoverController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Initiate digital handover
router.post(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => handoverController.createHandover(req, res, next)
);

// Collector list own handovers
router.get(
  '/collector',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  (req, res, next) => handoverController.getCollectorHandovers(req, res, next)
);

// Recycler list own handovers
router.get(
  '/recycler',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => handoverController.getRecyclerHandovers(req, res, next)
);

// Citizen list own purchase handovers
router.get(
  '/citizen',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => handoverController.getCitizenHandovers(req, res, next)
);

// Get single handover details
router.get(
  '/:id',
  authenticate,
  (req, res, next) => handoverController.getHandoverById(req, res, next)
);

// Get verifiable digital handover receipt
router.get(
  '/:id/receipt',
  authenticate,
  (req, res, next) => handoverController.getHandoverReceipt(req, res, next)
);

// Collector confirms material handover
router.post(
  '/:id/collector-confirm',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  (req, res, next) => handoverController.collectorConfirm(req, res, next)
);

// Recycler confirms receipt of material handover
router.post(
  '/:id/recycler-confirm',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => handoverController.recyclerConfirm(req, res, next)
);

// Citizen buyer confirms receipt of material handover
router.post(
  '/:id/buyer-confirm',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => handoverController.buyerConfirm(req, res, next)
);

// Attach evidence photo
router.post(
  '/:id/photos',
  authenticate,
  (req, res, next) => handoverController.addPhoto(req, res, next)
);

// Cancel an open handover
router.post(
  '/:id/cancel',
  authenticate,
  (req, res, next) => handoverController.cancelHandover(req, res, next)
);

// Get transaction for a specific handover
const transactionController = require('../controllers/transactionController');
router.get(
  '/:id/transaction',
  authenticate,
  (req, res, next) => {
    req.params.handoverId = req.params.id;
    return transactionController.getTransactionByHandoverId(req, res, next);
  }
);

module.exports = router;
