// EcoSetu Notification Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 13, docs/10_BACKEND_ARCHITECTURE.md

const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/responseHelper');

class NotificationController {
  /**
   * List current user's notifications
   * GET /api/v1/notifications
   */
  async getNotifications(req, res, next) {
    try {
      const data = await notificationService.listNotifications(req.user.id, req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get unread notification count
   * GET /api/v1/notifications/count
   */
  async getUnreadCount(req, res, next) {
    try {
      const data = await notificationService.getUnreadCount(req.user.id);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark a single notification as read
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.user.id, req.params.id);
      return sendSuccess(res, { notification }, 200, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const data = await notificationService.markAllAsRead(req.user.id);
      return sendSuccess(res, data, 200, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Register or activate an Android FCM registration token for authenticated user
   * POST /api/v1/notifications/device-token
   */
  async registerDeviceToken(req, res, next) {
    try {
      const { token, platform } = req.body;
      const data = await notificationService.registerDeviceToken(req.user.id, token, platform);
      return sendSuccess(res, data, 200, 'Device token registered successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unregister / deactivate an Android FCM registration token on user logout
   * DELETE /api/v1/notifications/device-token
   */
  async unregisterDeviceToken(req, res, next) {
    try {
      const { token } = req.body;
      const data = await notificationService.unregisterDeviceToken(req.user.id, token);
      return sendSuccess(res, data, 200, 'Device token unregistered successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
