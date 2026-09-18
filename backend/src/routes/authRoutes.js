// EcoSetu Authentication Routes (/api/v1/auth)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 2

const express = require('express');
const authController = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../config/rateLimit');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, validate(registerValidator), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', authLimiter, validate(loginValidator), (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next)
);

// Protected routes
router.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

module.exports = router;
