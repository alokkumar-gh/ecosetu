// EcoSetu Earnings Routes (/api/v1/earnings)
// Canonical Reference: SIH Problem Statement 26229 - Prompt 8: Collector Earnings Ledger + Pending Dues

const express = require('express');
const earningsController = require('../controllers/earningsController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// All earnings routes require authentication
router.use(authenticate);

// GET /api/v1/earnings/summary
router.get(
  '/summary',
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => earningsController.getSummary(req, res, next)
);

// GET /api/v1/earnings/transactions
router.get(
  '/transactions',
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => earningsController.getTransactions(req, res, next)
);

// GET /api/v1/earnings/pending-dues
router.get(
  '/pending-dues',
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => earningsController.getPendingDues(req, res, next)
);

// GET /api/v1/earnings/monthly
router.get(
  '/monthly',
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => earningsController.getMonthly(req, res, next)
);

// GET /api/v1/earnings/speech-text
router.get(
  '/speech-text',
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => earningsController.getSpeechText(req, res, next)
);

module.exports = router;
