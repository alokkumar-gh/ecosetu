// EcoSetu Quote Routes (/api/v1/quotes)
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10

const express = require('express');
const quoteController = require('../controllers/quoteController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const quoteValidators = require('../validators/quoteValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Recycler or Citizen creates a quote / purchase offer for a material lot
router.post(
  '/',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  validate(quoteValidators.createQuote),
  (req, res, next) => quoteController.createQuote(req, res, next)
);

// Recycler gets list of own quotes
router.get(
  '/recycler',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  validate(quoteValidators.listQuotesQuery, 'query'),
  (req, res, next) => quoteController.getRecyclerQuotes(req, res, next)
);

// Citizen gets list of own purchase offers
router.get(
  '/citizen',
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.ADMIN),
  validate(quoteValidators.listQuotesQuery, 'query'),
  (req, res, next) => quoteController.getCitizenQuotes(req, res, next)
);

// Get single quote by ID
router.get(
  '/:id',
  authenticate,
  (req, res, next) => quoteController.getQuoteById(req, res, next)
);

// Collector accepts quote (Online-only)
router.post(
  '/:id/accept',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  (req, res, next) => quoteController.acceptQuote(req, res, next)
);

// Collector rejects quote
router.post(
  '/:id/reject',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR),
  (req, res, next) => quoteController.rejectQuote(req, res, next)
);

// Collector, Recycler, or Citizen counter-offers / revises quote
router.post(
  '/:id/counter',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  validate(quoteValidators.counterQuote),
  (req, res, next) => quoteController.counterQuote(req, res, next)
);

// Recycler or Citizen cancels own quote
router.post(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.CITIZEN, ROLES.ADMIN),
  validate(quoteValidators.cancelQuote),
  (req, res, next) => quoteController.cancelQuote(req, res, next)
);

module.exports = router;
