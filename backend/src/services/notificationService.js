// EcoSetu Notification Service
// Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md, docs/05_API_SPECIFICATION.md Section 13, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const fcmService = require('./fcmService');

class NotificationService {
  /**
   * Create a notification resiliently (docs/23_NOTIFICATION_SYSTEM.md Section 7)
   * Logs error and returns null on failure without aborting parent business operations.
   * @param {object} params - { userId, type, title, message, referenceType, referenceId, tx }
   * @returns {Promise<object|null>} Created notification record or null on error
   */
  async createNotification({ userId, type, title, message, referenceType = null, referenceId = null, tx = null }) {
    if (!userId || !type || !title || !message) {
      logger.warn('createNotification missing required fields');
      return null;
    }

    try {
      const client = tx || prisma;
      const notification = await client.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          isRead: false,
        },
      });

      // Deliver via FCM push adapter resiliently (Phase 18 Task 7: Firebase Integration)
      // PostgreSQL record is authoritative and committed; FCM delivery failure never aborts business logic.
      try {
        fcmService.sendToUser(userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          referenceType: notification.referenceType,
          referenceId: notification.referenceId,
        }).catch((err) => {
          logger.warn(`FCM delivery skipped or failed for user ${userId}: ${err.message}`);
        });
      } catch (fcmErr) {
        logger.warn(`FCM dispatch error: ${fcmErr.message}`);
      }

      return notification;
    } catch (err) {
      logger.warn(`Failed to create notification for user ${userId}: ${err.message}`);
      return null;
    }
  }

  /**
   * List notifications for a user with pagination and optional unreadOnly filter
   * GET /api/v1/notifications
   * @param {string} userId - Authenticated user UUID
   * @param {object} query - { unreadOnly, page, limit }
   * @returns {Promise<object>} Notifications list and pagination metadata
   */
  async listNotifications(userId, { unreadOnly, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { userId };
    if (unreadOnly === true || unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get count of unread notifications for a user
   * GET /api/v1/notifications/count
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<object>} { unreadCount }
   */
  async getUnreadCount(userId) {
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  /**
   * Mark a single notification as read
   * PATCH /api/v1/notifications/:id/read
   * @param {string} userId - Authenticated user UUID
   * @param {string} notificationId - Notification UUID
   * @returns {Promise<object>} Updated notification
   */
  async markAsRead(userId, notificationId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    if (notification.userId !== userId) {
      throw AppError.forbidden('Access forbidden: You can only view and update your own notifications');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  }

  /**
   * Mark all unread notifications as read for current user
   * PATCH /api/v1/notifications/read-all
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<object>} { count }
   */
  async markAllAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  /**
   * Register or activate an FCM device registration token for a user
   * POST /api/v1/notifications/device-token
   * @param {string} userId - Authenticated user UUID
   * @param {string} token - FCM registration token
   * @param {string} [platform='android'] - Device platform
   * @returns {Promise<{ registered: boolean }>}
   */
  async registerDeviceToken(userId, token, platform = 'android') {
    if (!token || typeof token !== 'string') {
      throw AppError.badRequest('Valid device token required');
    }

    try {
      const existing = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (existing) {
        await prisma.deviceToken.update({
          where: { id: existing.id },
          data: {
            userId,
            platform: platform || 'android',
            isActive: true,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.deviceToken.create({
          data: {
            userId,
            token,
            platform: platform || 'android',
            isActive: true,
          },
        });
      }

      logger.info(`FCM: Registered device token [${fcmService._maskToken(token)}] for user ${userId}`);
      return { registered: true };
    } catch (err) {
      logger.warn(`Failed to register device token for user ${userId}: ${err.message}`);
      throw AppError.internal('Failed to register device token');
    }
  }

  /**
   * Deactivate an FCM device registration token upon logout
   * DELETE /api/v1/notifications/device-token
   * @param {string} userId - Authenticated user UUID
   * @param {string} token - FCM registration token
   * @returns {Promise<{ unregistered: boolean }>}
   */
  async unregisterDeviceToken(userId, token) {
    if (!token || typeof token !== 'string') {
      throw AppError.badRequest('Valid device token required');
    }

    try {
      await prisma.deviceToken.updateMany({
        where: {
          userId,
          token,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`FCM: Deactivated device token [${fcmService._maskToken(token)}] for user ${userId}`);
      return { unregistered: true };
    } catch (err) {
      logger.warn(`Failed to unregister device token for user ${userId}: ${err.message}`);
      return { unregistered: false };
    }
  }
}

module.exports = new NotificationService();

