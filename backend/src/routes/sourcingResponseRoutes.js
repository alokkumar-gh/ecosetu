// EcoSetu Sourcing Response Routes (/api/v1/sourcing-responses)
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6

const express = require('express');
const sourcingRequestController = require('../controllers/sourcingRequestController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const sourcingRequestValidators = require('../validators/sourcingRequestValidators');

const router = express.Router();

// Update a sourcing response (Collector edit or Recycler review/decline)
router.patch(
  '/:id',
  authenticate,
  validate(sourcingRequestValidators.updateSourcingResponse),
  (req, res, next) => sourcingRequestController.updateResponse(req, res, next)
);

module.exports = router;
