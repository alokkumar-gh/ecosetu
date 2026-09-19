// EcoSetu Admin Notification Service
// Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md, docs/05_API_SPECIFICATION.md Section 13 & 14, docs/21_TRACEABILITY_AND_AUDIT.md

const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const fcmService = require('./fcmService');
const { ROLES, USER_STATUS, NOTIFICATION_TYPES } = require('../utils/constants');

// In-memory sliding rate limit tracker: adminId -> Array of timestamps (ms)
const broadcastRateLimits = new Map();
const MAX_BROADCASTS_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

class AdminNotificationService {
  /**
   * Enforce rate limit for custom admin notifications
   * @param {string} adminId
   */
  _checkRateLimit(adminId) {
    const now = Date.now();
    const history = broadcastRateLimits.get(adminId) || [];
    const recent = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= MAX_BROADCASTS_PER_HOUR) {
      throw AppError.rateLimited('Rate limit exceeded: Maximum 20 notification broadcasts per hour per administrator.');
    }

    recent.push(now);
    broadcastRateLimits.set(adminId, recent);
  }

  /**
   * Resolve recipient users according to audience specification
   * STRICT: Deactivated users are NEVER included in operational broadcasts.
   *
   * @param {string} audience - 'ALL', 'CITIZENS', 'COLLECTORS', 'RECYCLERS', 'ADMINS', 'VERIFIED', 'PENDING_VERIFICATION', 'SUSPENDED', 'INDIVIDUAL'
   * @param {string} [targetUserId] - Required if audience is 'INDIVIDUAL'
   * @returns {Promise<Array<{ id: string, name: string, role: string, status: string }>>}
   */
  async resolveRecipients(audience, targetUserId = null) {
    const cleanAudience = String(audience || '').toUpperCase();

    if (cleanAudience === 'INDIVIDUAL') {
      if (!targetUserId) {
        throw AppError.badRequest('Target user ID is required for INDIVIDUAL audience');
      }
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, role: true, status: true },
      });
      if (!user) {
        throw AppError.notFound('Target user not found');
      }
      if (user.status === USER_STATUS.DEACTIVATED) {
        throw AppError.badRequest('Deactivated users cannot receive notifications');
      }
      return [user];
    }

    // Build base where clause strictly excluding DEACTIVATED
    const where = {
      status: { not: USER_STATUS.DEACTIVATED },
    };

    switch (cleanAudience) {
      case 'CITIZENS':
        where.role = ROLES.CITIZEN;
        break;
      case 'COLLECTORS':
        where.role = ROLES.INFORMAL_COLLECTOR;
        break;
      case 'RECYCLERS':
        where.role = ROLES.RECYCLER;
        break;
      case 'ADMINS':
        where.role = ROLES.ADMIN;
        break;
      case 'VERIFIED':
        where.status = USER_STATUS.ACTIVE;
        break;
      case 'PENDING_VERIFICATION':
        where.status = USER_STATUS.PENDING_VERIFICATION;
        break;
      case 'SUSPENDED':
        where.status = USER_STATUS.SUSPENDED;
        break;
      case 'ALL':
      default:
        // Already excludes DEACTIVATED
        break;
    }

    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    return recipients;
  }

  /**
   * Preview audience recipients and count before sending
   * @param {object} params - { audience, targetUserId }
   * @returns {Promise<{ audience: string, count: number, sample: Array, requiresConfirmation: boolean }>}
   */
  async previewAudience({ audience, targetUserId = null }) {
    const recipients = await this.resolveRecipients(audience, targetUserId);
    const count = recipients.length;
    const sample = recipients.slice(0, 5).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      status: u.status,
    }));

    return {
      audience: audience.toUpperCase(),
      count,
      sample,
      requiresConfirmation: count > 50,
    };
  }

  /**
   * Search users for individual notification targeting
   * Privacy-safe: returns only id, name, role, status
   * @param {string} query - Name, role, or partial ID
   * @returns {Promise<Array<{ id: string, name: string, role: string, status: string }>>}
   */
  async searchUsersForNotification(query = '') {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const cleanQuery = query.trim();
    const users = await prisma.user.findMany({
      where: {
        status: { not: USER_STATUS.DEACTIVATED },
        OR: [
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      take: 15,
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }

  /**
   * Dispatch custom administrative notification to specified audience
   * @param {object} params
   * @param {string} params.adminId - Authenticated admin ID
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {string} [params.type='ADMIN_MESSAGE'] - Notification type
   * @param {string} params.audience - Target audience
   * @param {string} [params.targetUserId] - Required if audience is INDIVIDUAL
   * @param {string} [params.actionUrl] - Optional action deep link
   * @param {boolean} [params.confirmed=false] - Explicit confirmation for large broadcasts
   * @param {string} [params.ipAddress] - Request IP
   * @returns {Promise<object>} Broadcast dispatch result
   */
  async sendCustomNotification({
    adminId,
    title,
    message,
    type = NOTIFICATION_TYPES.ADMIN_MESSAGE,
    audience = 'ALL',
    targetUserId = null,
    actionUrl = null,
    confirmed = false,
    ipAddress = null,
  }) {
    if (!title || !title.trim()) {
      throw AppError.badRequest('Notification title is required');
    }
    if (!message || !message.trim()) {
      throw AppError.badRequest('Notification message is required');
    }

    // Rate limiting per administrator
    this._checkRateLimit(adminId);

    // Resolve recipients
    const recipients = await this.resolveRecipients(audience, targetUserId);
    const count = recipients.length;

    if (count === 0) {
      throw AppError.badRequest('No eligible active recipients found for the selected audience');
    }

    // Confirmation threshold check for large audiences
    if (count > 50 && !confirmed) {
      return {
        confirmed: false,
        requiresConfirmation: true,
        recipientCount: count,
        message: `You are about to send this notification to ${count} users. Explicit confirmation required.`,
      };
    }

    const broadcastId = uuidv4();
    const canonicalType = NOTIFICATION_TYPES.ADMIN_MESSAGE;

    // 1. Authoritative PostgreSQL Notification records creation
    // Batch create for optimal DB performance
    const notificationData = recipients.map((r) => ({
      userId: r.id,
      type: canonicalType,
      title: title.trim(),
      message: message.trim(),
      isRead: false,
      referenceType: 'ADMIN_BROADCAST',
      referenceId: broadcastId,
    }));

    await prisma.notification.createMany({
      data: notificationData,
    });

    logger.info(`Admin notification broadcast created: ${broadcastId} for ${count} users by Admin ${adminId}`);

    // 2. Secondary FCM Push Delivery (Async & Non-blocking)
    // Runs in background: PostgreSQL records are authoritative and committed
    let pushAttemptedCount = 0;
    (async () => {
      try {
        const batchSize = 25;
        for (let i = 0; i < recipients.length; i += batchSize) {
          const chunk = recipients.slice(i, i + batchSize);
          await Promise.all(
            chunk.map(async (recipient) => {
              try {
                pushAttemptedCount++;
                await fcmService.sendToUser(recipient.id, {
                  type: canonicalType,
                  title: title.trim(),
                  message: message.trim(),
                  referenceType: 'ADMIN_BROADCAST',
                  referenceId: broadcastId,
                });
              } catch (fcmErr) {
                logger.warn(`Push delivery skipped for user ${recipient.id}: ${fcmErr.message}`);
              }
            })
          );
        }
      } catch (err) {
        logger.warn(`Background FCM batch dispatch error: ${err.message}`);
      }
    })().catch((err) => logger.warn(`Unhandled FCM dispatch error: ${err.message}`));

    // 3. Authoritative Audit Logging
    await auditService.logAction({
      actorId: adminId,
      action: 'ADMIN_NOTIFICATION_SENT',
      entityType: 'notifications',
      entityId: broadcastId,
      details: {
        broadcastId,
        audience: audience.toUpperCase(),
        recipientCount: count,
        title: title.trim(),
        notificationType: canonicalType,
        hasActionUrl: Boolean(actionUrl),
      },
      ipAddress,
    });

    return {
      success: true,
      broadcastId,
      title: title.trim(),
      audience: audience.toUpperCase(),
      recipientCount: count,
      pushDeliveryInitiated: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * List administrative notification broadcast campaigns
   * @param {object} params - { page, limit }
   * @returns {Promise<object>} Broadcast history and summary stats
   */
  async getNotificationHistory({ page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fetch administrative broadcast audit logs
    const [total, broadcastLogs] = await Promise.all([
      prisma.auditLog.count({
        where: { action: 'ADMIN_NOTIFICATION_SENT' },
      }),
      prisma.auditLog.findMany({
        where: { action: 'ADMIN_NOTIFICATION_SENT' },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      }),
    ]);

    // For each broadcast, calculate read counts from authoritative notification table
    const broadcasts = await Promise.all(
      broadcastLogs.map(async (log) => {
        const details = log.details || {};
        const broadcastId = log.entityId || details.broadcastId;

        let readCount = 0;
        let totalCount = details.recipientCount || 0;

        if (broadcastId) {
          try {
            readCount = await prisma.notification.count({
              where: {
                referenceId: broadcastId,
                isRead: true,
              },
            });
            if (!totalCount) {
              totalCount = await prisma.notification.count({
                where: { referenceId: broadcastId },
              });
            }
          } catch {
            readCount = 0;
          }
        }

        return {
          id: broadcastId || log.id,
          title: details.title || 'Platform Announcement',
          audience: details.audience || 'ALL',
          type: details.notificationType || 'ADMIN_MESSAGE',
          createdBy: log.actor?.name || 'Administrator',
          createdAt: log.createdAt,
          recipientCount: totalCount,
          readCount,
          readRate: totalCount > 0 ? parseFloat(((readCount / totalCount) * 100).toFixed(1)) : 0,
        };
      })
    );

    return {
      broadcasts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Aggregate notification analytics for admin dashboard
   * @returns {Promise<object>}
   */
  async getNotificationAnalytics() {
    const [
      totalSent,
      readCount,
      adminMessagesSent,
      unreadAdminMessages,
    ] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: true } }),
      prisma.notification.count({ where: { type: NOTIFICATION_TYPES.ADMIN_MESSAGE } }),
      prisma.notification.count({
        where: {
          type: NOTIFICATION_TYPES.ADMIN_MESSAGE,
          isRead: false,
        },
      }),
    ]);

    const readRate = totalSent > 0 ? parseFloat(((readCount / totalSent) * 100).toFixed(1)) : 0;
    const adminReadRate = adminMessagesSent > 0
      ? parseFloat((((adminMessagesSent - unreadAdminMessages) / adminMessagesSent) * 100).toFixed(1))
      : 0;

    return {
      totalNotifications: totalSent,
      readCount,
      readRate,
      adminBroadcasts: {
        totalSent: adminMessagesSent,
        unread: unreadAdminMessages,
        read: adminMessagesSent - unreadAdminMessages,
        readRate: adminReadRate,
      },
    };
  }
}

module.exports = new AdminNotificationService();
