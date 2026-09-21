/**
 * adminPriceRoutes.js
 * Admin Price Ingestion & Management Endpoints (/api/v1/admin/prices)
 */

const express = require('express');
const priceController = require('../controllers/priceController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createPriceValidation, updatePriceValidation } = require('../validators/priceValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// All routes here require ADMIN role
router.use(authenticate, authorize(ROLES.ADMIN));

router.post(
  '/',
  validate(createPriceValidation),
  (req, res, next) => priceController.createPrice(req, res, next)
);

router.get(
  '/',
  (req, res, next) => priceController.listAdminPrices(req, res, next)
);

router.patch(
  '/:id',
  validate(updatePriceValidation),
  (req, res, next) => priceController.updatePrice(req, res, next)
);

router.delete(
  '/:id',
  (req, res, next) => priceController.deletePrice(req, res, next)
);

module.exports = router;
