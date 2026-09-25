// EcoSetu AI Routes (/api/v1/ai)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 11, docs/10_BACKEND_ARCHITECTURE.md, docs/11_AI_EWASTE_DETECTION.md

const express = require('express');
const aiController = require('../controllers/aiController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const aiValidators = require('../validators/aiValidators');
const { handleImageUpload } = require('../middleware/uploadMiddleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Classify an e-waste image (Citizen and Informal Collector, multipart/form-data)
router.post(
  '/predict',
  handleImageUpload,
  authenticate,
  authorize(ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR),
  (req, res, next) => aiController.predict(req, res, next)
);

// Submit user feedback on an AI prediction (Citizen only, JSON body)
router.post(
  '/feedback',
  authenticate,
  authorize(ROLES.CITIZEN),
  validate(aiValidators.feedback),
  (req, res, next) => aiController.feedback(req, res, next)
);

module.exports = router;
