// EcoSetu Audit Logging Service
// Canonical Reference: docs/21_TRACEABILITY_AND_AUDIT.md Section 5, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const logger = require('../config/logger');

class AuditService {
  /**
   * Log an immutable audit action
   * @param {object} params - Audit action parameters
   * @param {string} params.actorId - User UUID who performed the action
   * @param {string} params.action - Canonical action name (e.g., RECYCLING_STARTED, RECYCLING_COMPLETED)
   * @param {string} params.entityType - Target entity type (e.g., recycling_records)
   * @param {string} params.entityId - Target entity UUID
   * @param {object} [params.details] - JSON metadata
   * @param {string} [params.ipAddress] - Client IP address
   * @param {object} [tx] - Optional Prisma transaction client
   * @returns {Promise<object|null>} Created audit log record
   */
  async logAction({ actorId, action, entityType, entityId, details, ipAddress }, tx = null) {
    try {
      const client = tx || prisma;
      const log = await client.auditLog.create({
        data: {
          actorId: actorId || null,
          action,
          entityType,
          entityId,
          details: details || null,
          ipAddress: ipAddress || null,
        },
      });
      return log;
    } catch (err) {
      // Non-blocking: log warning so primary workflows do not fail if audit logging encounters an issue
      logger.warn(`Failed to record audit log for action ${action}: ${err.message}`);
      return null;
    }
  }

  /**
   * List audit logs with filtering and pagination
   * Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/21_TRACEABILITY_AND_AUDIT.md
   * @param {object} params
   * @param {string} [params.action]
   * @param {string} [params.entityType]
   * @param {string} [params.actorId]
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @param {number|string} [params.page=1]
   * @param {number|string} [params.limit=20]
   * @returns {Promise<object>} { auditLogs, pagination }
   */
  async listAuditLogs({ action, entityType, actorId, startDate, endDate, page = 1, limit = 20 } = {}) {
    const where = {};

    if (action) {
      where.action = action;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (actorId) {
      where.actorId = actorId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      auditLogs: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

module.exports = new AuditService();
