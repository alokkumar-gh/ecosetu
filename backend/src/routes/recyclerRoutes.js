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

// List all verified recyclers (verified collector or admin)
router.get(
  '/',
  authenticate,
  authorize(ROLES.INFORMAL_COLLECTOR, ROLES.ADMIN),
  checkVerified,
  validate(recyclerValidators.listRecyclers),
  (req, res, next) => recyclerController.listRecyclers(req, res, next)
);

module.exports = router;
