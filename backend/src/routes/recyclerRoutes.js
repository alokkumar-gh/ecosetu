// EcoSetu Recycler Routes (/api/v1/recyclers)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 5, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const recyclerController = require('../controllers/recyclerController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkVerified = require('../middleware/checkVerified');
const validate = require('../middleware/validate');
const recyclerValidators = require('../validators/recyclerValidators');
const { ROLES } = require('../utils/constants');

const recyclerRateController = require('../controllers/recyclerRateController');
const analyticsController = require('../controllers/analyticsController');
const analyticsValidators = require('../validators/analyticsValidators');
const {
  createRecyclerRateValidation,
  updateRecyclerRateValidation,
  listRecyclerRatesValidation,
} = require('../validators/recyclerRateValidators');

const router = express.Router();

// Get current recycler profile
router.get(
  '/profile',
  authenticate,
  authorize(ROLES.RECYCLER),
  (req, res, next) => recyclerController.getProfile(req, res, next)
);

// Create or update recycler profile
router.put(
  '/profile',
  authenticate,
  authorize(ROLES.RECYCLER),
  validate(recyclerValidators.upsertProfile),
  (req, res, next) => recyclerController.upsertProfile(req, res, next)
);

// Recycler self-service offered rate management
router.post(
  '/rates',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(createRecyclerRateValidation),
  (req, res, next) => recyclerRateController.createRate(req, res, next)
);

router.get(
  '/rates',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(listRecyclerRatesValidation),
  (req, res, next) => recyclerRateController.listRates(req, res, next)
);

router.patch(
  '/rates/:id',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(updateRecyclerRateValidation),
  (req, res, next) => recyclerRateController.updateRate(req, res, next)
);

router.delete(
  '/rates/:id',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  (req, res, next) => recyclerRateController.deleteRate(req, res, next)
);

// Get recycler operational analytics (JWT tenancy isolated)
router.get(
  '/analytics',
  authenticate,
  authorize(ROLES.RECYCLER),
  validate(analyticsValidators.generalAnalyticsQuery),
  (req, res, next) => analyticsController.getRecyclerAnalyticsSelf(req, res, next)
);

// List all verified recyclers (verified collector or admin)
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  checkVerified,
  validate(recyclerValidators.listRecyclers),
  (req, res, next) => recyclerController.listRecyclers(req, res, next)
);

// Get single recycler detail (verified collector, recycler, or admin)
router.get(
  '/:id',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN, ROLES.RECYCLER),
  checkVerified,
  validate(recyclerValidators.getRecyclerById),
  (req, res, next) => recyclerController.getRecyclerById(req, res, next)
);

module.exports = router;

