/**
 * adminRecyclerRateRoutes.js
 * Admin routes for managing recycler offered rates (/api/v1/admin/recycler-rates)
 */

const express = require('express');
const recyclerRateController = require('../controllers/recyclerRateController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createRecyclerRateValidation,
  updateRecyclerRateValidation,
  listRecyclerRatesValidation,
} = require('../validators/recyclerRateValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(createRecyclerRateValidation),
  (req, res, next) => recyclerRateController.createRate(req, res, next)
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(listRecyclerRatesValidation),
  (req, res, next) => recyclerRateController.listRates(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => recyclerRateController.getRateById(req, res, next)
);

router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(updateRecyclerRateValidation),
  (req, res, next) => recyclerRateController.updateRate(req, res, next)
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => recyclerRateController.deleteRate(req, res, next)
);

module.exports = router;
