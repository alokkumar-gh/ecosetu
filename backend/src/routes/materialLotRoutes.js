// EcoSetu Material Lot Routes (/api/v1/material-lots)
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4

const express = require('express');
const materialLotController = require('../controllers/materialLotController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { handleImageUpload } = require('../middleware/uploadMiddleware');
const materialLotValidators = require('../validators/materialLotValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Create a standalone material item (Collector only)
router.post(
  '/items',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  validate(materialLotValidators.createMaterialItem),
  (req, res, next) => materialLotController.createItem(req, res, next)
);

// Create a new Material Lot (Collector only)
router.post(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  validate(materialLotValidators.createMaterialLot),
  (req, res, next) => materialLotController.createLot(req, res, next)
);

// List material lots (Collector own, Recycler marketplace, Citizen reuse marketplace, Admin all)
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  validate(materialLotValidators.listMaterialLots),
  (req, res, next) => materialLotController.listLots(req, res, next)
);

// Get marketplace dashboard overview metrics (Collector or Recycler)
router.get(
  '/marketplace/overview',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => materialLotController.getMarketplaceOverview(req, res, next)
);

// Get factual market statistics for material category
router.get(
  '/marketplace/market-stats',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  (req, res, next) => materialLotController.getMarketStats(req, res, next)
);

// Get single material lot by ID (Collector own, Recycler marketplace, Citizen reuse item, Admin all)
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  validate(materialLotValidators.getMaterialLotById),
  (req, res, next) => materialLotController.getLotById(req, res, next)
);

// Update material lot / draft or submit (Collector own)
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  validate(materialLotValidators.updateMaterialLot),
  (req, res, next) => materialLotController.updateLot(req, res, next)
);

const recyclerMatchingController = require('../controllers/recyclerMatchingController');
const { matchLotValidation } = require('../validators/recyclerRateValidators');

// Attach photos to existing lot (Collector own)
router.post(
  '/:id/photos',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  handleImageUpload,
  validate(materialLotValidators.addLotPhotos),
  (req, res, next) => materialLotController.addLotPhotos(req, res, next)
);

// Get eligible recycler matches for a Material Lot (Collector own, Admin all)
router.get(
  '/:id/matches',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  validate(matchLotValidation),
  (req, res, next) => recyclerMatchingController.getMatchesForLot(req, res, next)
);

const quoteController = require('../controllers/quoteController');
const { lotQuotesQuery } = require('../validators/quoteValidators');

// Get quotes for a Material Lot (Collector own, Recycler own, Admin all)
router.get(
  '/:id/quotes',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(lotQuotesQuery, 'query'),
  (req, res, next) => quoteController.getQuotesForLot(req, res, next)
);

const handoverController = require('../controllers/handoverController');

// Get handovers for a Material Lot (Collector own, Recycler own, Admin all)
router.get(
  '/:id/handovers',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => handoverController.getHandoversForLot(req, res, next)
);

// Get full Journey B lifecycle trace for a Material Lot (Collector own, Recycler involved, Admin all)
router.get(
  '/:id/trace',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  validate(materialLotValidators.getMaterialLotById),
  (req, res, next) => materialLotController.getLotTrace(req, res, next)
);

module.exports = router;


