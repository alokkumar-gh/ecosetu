// EcoSetu Recurring Trade Routes (/api/v1/recurring-trade)
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6

const express = require('express');
const recurringTradeController = require('../controllers/recurringTradeController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Get trading relationship history with a specific party
router.get(
  '/relationship/:partyId',
  authenticate,
  (req, res, next) => recurringTradeController.getTradingRelationship(req, res, next)
);

// Get "Sell Again" template from a previous lot
router.get(
  '/sell-again/:lotId',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  (req, res, next) => recurringTradeController.getSellAgainTemplate(req, res, next)
);

// Get "Source Again" template from a previous sourcing request
router.get(
  '/source-again/:requestId',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  (req, res, next) => recurringTradeController.getSourceAgainTemplate(req, res, next)
);

module.exports = router;
