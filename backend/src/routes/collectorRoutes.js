// EcoSetu Collector Routes (/api/v1/collectors)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 4, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const collectorController = require('../controllers/collectorController');
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkVerified = require('../middleware/checkVerified');
const validate = require('../middleware/validate');
const collectorValidators = require('../validators/collectorValidators');
const analyticsValidators = require('../validators/analyticsValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Get current collector profile
router.get(
  '/profile',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  (req, res, next) => collectorController.getProfile(req, res, next)
);

// Create or update collector profile (supports PUT and PATCH)
router.put(
  '/profile',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  validate(collectorValidators.upsertProfile),
  (req, res, next) => collectorController.upsertProfile(req, res, next)
);

router.patch(
  '/profile',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  validate(collectorValidators.upsertProfile),
  (req, res, next) => collectorController.upsertProfile(req, res, next)
);

// Toggle availability (verified collectors only)
router.patch(
  '/availability',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  checkVerified,
  validate(collectorValidators.toggleAvailability),
  (req, res, next) => collectorController.toggleAvailability(req, res, next)
);

// Get collector statistics
router.get(
  '/stats',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  (req, res, next) => collectorController.getStats(req, res, next)
);

// Get collector's own submitted offers on collection requests
router.get(
  '/my-offers',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  (req, res, next) => collectorController.getMyOffers(req, res, next)
);

// Get collector personal historical analytics (JWT tenancy isolated)
router.get(
  '/analytics',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  validate(analyticsValidators.generalAnalyticsQuery),
  (req, res, next) => analyticsController.getCollectorAnalytics(req, res, next)
);

module.exports = router;

