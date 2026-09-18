// EcoSetu Notification Routes (/api/v1/notifications)
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 13, docs/10_BACKEND_ARCHITECTURE.md

const express = require('express');
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const notificationValidators = require('../validators/notificationValidators');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// Get unread notification count (registered before /:id)
router.get(
  '/count',
  (req, res, next) => notificationController.getUnreadCount(req, res, next)
);

// List current user's notifications (paginated, unread filter)
router.get(
  '/',
  validate(notificationValidators.listNotifications),
  (req, res, next) => notificationController.getNotifications(req, res, next)
);

// Mark all notifications as read (registered before /:id/read)
router.patch(
  '/read-all',
  (req, res, next) => notificationController.markAllAsRead(req, res, next)
);

// Mark a single notification as read
router.patch(
  '/:id/read',
  validate(notificationValidators.markAsRead),
  (req, res, next) => notificationController.markAsRead(req, res, next)
);

// Register or refresh Android FCM device token for authenticated user
router.post(
  '/device-token',
  validate(notificationValidators.registerDeviceToken),
  (req, res, next) => notificationController.registerDeviceToken(req, res, next)
);

// Unregister / deactivate Android FCM device token on logout
router.delete(
  '/device-token',
  validate(notificationValidators.unregisterDeviceToken),
  (req, res, next) => notificationController.unregisterDeviceToken(req, res, next)
);

module.exports = router;

