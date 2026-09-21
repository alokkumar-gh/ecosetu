/**
 * priceRoutes.js
 * Collector Price Discovery & Valuation Endpoints (/api/v1/prices)
 */

const express = require('express');
const priceController = require('../controllers/priceController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { estimateQueryValidation, historicalPriceQueryValidation } = require('../validators/priceValidators');

const router = express.Router();

// Value estimation endpoint (must be before /:id style matchers if any)
router.get(
  '/estimate',
  authenticate,
  validate(estimateQueryValidation),
  (req, res, next) => priceController.getEstimate(req, res, next)
);

// Historical price records and trends endpoint (SIH-PRICE-010..014)
router.get(
  '/history',
  authenticate,
  validate(historicalPriceQueryValidation),
  (req, res, next) => priceController.getHistory(req, res, next)
);

// Current market price board
router.get(
  '/',
  authenticate,
  (req, res, next) => priceController.getPrices(req, res, next)
);

module.exports = router;
