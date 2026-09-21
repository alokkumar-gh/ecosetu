// EcoSetu Admin Routes (/api/v1/admin)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const adminValidators = require('../validators/adminValidators');
const analyticsValidators = require('../validators/analyticsValidators');
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
  validate(adminValidators.getAnalytics),
  (req, res, next) => adminController.getAnalytics(req, res, next)
);

// SIH 26229 Historical Analytics & Dataset Insights (Prompt 17)
router.get(
  '/analytics/overview',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.generalAnalyticsQuery),
  (req, res, next) => analyticsController.getOverview(req, res, next)
);

router.get(
  '/analytics/prices',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.historicalPriceQuery),
  (req, res, next) => analyticsController.getPriceAnalytics(req, res, next)
);

router.get(
  '/analytics/materials',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.materialActivityQuery),
  (req, res, next) => analyticsController.getMaterialAnalytics(req, res, next)
);

router.get(
  '/analytics/transactions',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.transactionActivityQuery),
  (req, res, next) => analyticsController.getTransactionAnalytics(req, res, next)
);

router.get(
  '/analytics/recyclers',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.recyclerActivityQuery),
  (req, res, next) => analyticsController.getRecyclerAnalytics(req, res, next)
);

router.get(
  '/analytics/traceability',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.generalAnalyticsQuery),
  (req, res, next) => analyticsController.getTraceabilityAnalytics(req, res, next)
);

router.get(
  '/analytics/data-quality',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(analyticsValidators.generalAnalyticsQuery),
  (req, res, next) => analyticsController.getDataQualityAnalytics(req, res, next)
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

// Send custom administrative notification to specified audience (Admin only)
router.post(
  '/notifications/send',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.sendCustomNotification),
  (req, res, next) => adminController.sendNotification(req, res, next)
);

// Preview audience recipients count before sending (Admin only)
router.get(
  '/notifications/recipients-preview',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.previewRecipients),
  (req, res, next) => adminController.previewNotificationRecipients(req, res, next)
);

// List administrative broadcast campaign history (Admin only)
router.get(
  '/notifications/history',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => adminController.getNotificationHistory(req, res, next)
);

// Get notification analytics (Admin only)
router.get(
  '/notifications/analytics',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => adminController.getNotificationAnalytics(req, res, next)
);

// Search users for individual notification targeting (Admin only)
router.get(
  '/notifications/users/search',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => adminController.searchNotificationUsers(req, res, next)
);

// List recyclers for admin governance (Admin only)
router.get(
  '/recyclers',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.listAdminRecyclers),
  (req, res, next) => adminController.listRecyclers(req, res, next)
);

// Get single recycler facility details for review & audit (Admin only)
router.get(
  '/recyclers/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res, next) => adminController.getRecyclerById(req, res, next)
);

// Update recycler authorization status & lifecycle state (Admin only)
router.patch(
  '/recyclers/:id/authorization',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.updateRecyclerAuthorization),
  (req, res, next) => adminController.updateRecyclerAuthorization(req, res, next)
);

// Admin maintenance update of recycler operational profile (Admin only)
router.patch(
  '/recyclers/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(adminValidators.updateRecyclerProfile),
  (req, res, next) => adminController.updateRecyclerProfile(req, res, next)
);

module.exports = router;

