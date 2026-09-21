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

// Recycler creates a quote for a matched material lot
router.post(
  '/',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
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
  validate(quoteValidators.rejectQuote),
  (req, res, next) => quoteController.rejectQuote(req, res, next)
);

// Recycler cancels quote
router.post(
  '/:id/cancel',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  validate(quoteValidators.cancelQuote),
  (req, res, next) => quoteController.cancelQuote(req, res, next)
);

module.exports = router;
