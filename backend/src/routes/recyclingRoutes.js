// EcoSetu Recycling Record Routes (/api/v1/recycling-records)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 10, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const recyclingController = require('../controllers/recyclingController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const checkVerified = require('../middleware/checkVerified');
const validate = require('../middleware/validate');
const recyclingValidators = require('../validators/recyclingValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// List recycling records (Recycler own, Admin all)
router.get(
  '/',
  authenticate,
  authorize(ROLES.RECYCLER, ROLES.ADMIN),
  validate(recyclingValidators.listRecords),
  (req, res, next) => recyclingController.listRecyclingRecords(req, res, next)
);

// Start processing materials (Assigned verified recycler only)
router.patch(
  '/:id/start-processing',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(recyclingValidators.startProcessing),
  (req, res, next) => recyclingController.startProcessing(req, res, next)
);

// Complete recycling (Assigned verified recycler only)
router.patch(
  '/:id/complete',
  authenticate,
  authorize(ROLES.RECYCLER),
  checkVerified,
  validate(recyclingValidators.completeRecycling),
  (req, res, next) => recyclingController.completeRecycling(req, res, next)
);

module.exports = router;
