// EcoSetu Verification Routes (/api/v1/verifications)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14

const express = require('express');
const verificationController = require('../controllers/verificationController');
const authenticate = require('../middleware/authenticate');
const { handleImageUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// User verification endpoints
router.post('/submit', authenticate, handleImageUpload, (req, res, next) =>
  verificationController.submit(req, res, next)
);

router.get('/status', authenticate, (req, res, next) =>
  verificationController.getStatus(req, res, next)
);

router.post('/resubmit', authenticate, handleImageUpload, (req, res, next) =>
  verificationController.resubmit(req, res, next)
);

// Secure authenticated document viewer (Admin or document owner)
router.get('/document/:key', authenticate, (req, res, next) =>
  verificationController.serveDocument(req, res, next)
);

module.exports = router;
