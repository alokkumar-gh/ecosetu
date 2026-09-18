// EcoSetu Admin Routes (/api/v1/admin)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const adminValidators = require('../validators/adminValidators');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// List all users with filtering, search, and pagination
router.get(
  '/users',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.listUsers),
  (req, res, next) => adminController.getUsers(req, res, next)
);

// Update user account status
router.patch(
  '/users/:id/status',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.updateUserStatus),
  (req, res, next) => adminController.updateUserStatus(req, res, next)
);

// Get platform analytics (Admin only)
router.get(
  '/analytics',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => adminController.getAnalytics(req, res, next)
);

// View audit trail with filtering and pagination (Admin only)
router.get(
  '/audit-logs',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.listAuditLogs),
  (req, res, next) => adminController.getAuditLogs(req, res, next)
);

// List pending/filtered verification requests (Admin only)
router.get(
  '/verifications',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.listVerifications),
  (req, res, next) => adminController.getVerifications(req, res, next)
);

// Approve or reject user verification (Admin only)
router.patch(
  '/verifications/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.updateVerification),
  (req, res, next) => adminController.updateVerification(req, res, next)
);

module.exports = router;
