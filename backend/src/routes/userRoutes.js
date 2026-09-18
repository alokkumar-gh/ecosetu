// EcoSetu User Routes (/api/v1/users)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 3, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const userValidators = require('../validators/userValidators');

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, (req, res, next) =>
  userController.getMe(req, res, next)
);

// Update current user profile
router.patch(
  '/me',
  authenticate,
  validate(userValidators.updateProfile),
  (req, res, next) => userController.updateMe(req, res, next)
);

module.exports = router;
