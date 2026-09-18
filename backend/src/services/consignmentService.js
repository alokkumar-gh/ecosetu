// EcoSetu Consignment Service
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 9, docs/07_BUSINESS_WORKFLOWS.md Section 2.3, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');
const {
  ROLES,
  USER_STATUS,
  ITEM_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  NOTIFICATION_TYPES,
  ERROR_CODES,
} = require('../utils/constants');

const ACTIVE_CONSIGNMENT_STATUSES = [
  CONSIGNMENT_STATUS.CREATED,
  CONSIGNMENT_STATUS.IN_TRANSIT,
  CONSIGNMENT_STATUS.DELIVERED,
  CONSIGNMENT_STATUS.ACCEPTED,
];

class ConsignmentService {
  /**
   * Create a new consignment from a collector to a verified recycler
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {object} data - Consignment creation payload
   * @returns {Promise<object>} Created consignment
   */
  async createConsignment(collectorUserId, data) {
    const collectorProfile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUserId },
    });

    if (!collectorProfile) {
      throw AppError.forbidden('Collector profile not found or user is not an active collector');
    }

    // Verify target recycler profile exists
    const recyclerProfile = await prisma.recyclerProfile.findUnique({
      where: { id: data.recyclerId },
      include: { user: true },
    });

    if (!recyclerProfile) {
      throw AppError.notFound('Recycler profile not found');
    }

    // BR-CO-03: Consignment can only be created to a verified recycler
    if (!recyclerProfile.user || recyclerProfile.user.status !== USER_STATUS.ACTIVE) {
      throw AppError.badRequest('Consignment can only be created to a verified recycler');
    }

    // Deduplicate item IDs
    const uniqueItemIds = [...new Set(data.itemIds)];
    if (uniqueItemIds.length !== data.itemIds.length) {
      throw AppError.badRequest('Duplicate item IDs provided in consignment');
    }

    // Fetch items with existing consignment relationships and collection requests
    const items = await prisma.ewasteItem.findMany({
      where: { id: { in: uniqueItemIds } },
      include: {
        collectionRequest: true,
        consignmentItems: {
          include: {
            consignment: true,
          },
        },
      },
    });

    if (items.length !== uniqueItemIds.length) {
      throw AppError.notFound('One or more e-waste items not found');
    }

    // Verify collector ownership (collector can only consign items they collected)
    for (const item of items) {
      if (item.collectionRequest && item.collectionRequest.collectorId !== collectorProfile.id) {
        throw AppError.forbidden(`You can only consign items that you collected (item ${item.id})`);
      }
    }

    // BR-CO-01 & EC-CO-02: Only items in COLLECTED status can be added to a consignment
    const nonCollectedItems = items.filter((item) => item.status !== ITEM_STATUS.COLLECTED);
    if (nonCollectedItems.length > 0) {
      throw AppError.badRequest('Items must be in COLLECTED status');
    }

    // BR-CO-02: An item can only be in one active consignment
    for (const item of items) {
      const activeConsignment = item.consignmentItems?.find((ci) =>
        ci.consignment && ACTIVE_CONSIGNMENT_STATUSES.includes(ci.consignment.status)
      );
      if (activeConsignment) {
        throw AppError.badRequest(
          `Item ${item.id} is already in an active consignment (${activeConsignment.consignment.id})`
        );
      }
    }

    // Compute total weight if not explicitly provided
    let calculatedWeight = 0;
    for (const item of items) {
      const itemWeight = parseFloat(item.actualWeightKg || item.estimatedWeightKg || 0);
      calculatedWeight += itemWeight;
    }
    const totalWeight = data.totalWeightKg
      ? parseFloat(data.totalWeightKg)
      : calculatedWeight > 0
      ? calculatedWeight
      : null;

    // Create consignment and junction items in transaction
    const consignment = await prisma.$transaction(async (tx) => {
      return await tx.consignment.create({
        data: {
          collectorId: collectorProfile.id,
          recyclerId: recyclerProfile.id,
          status: CONSIGNMENT_STATUS.CREATED,
          totalWeightKg: totalWeight,
          totalItems: items.length,
          deliveryNotes: data.deliveryNotes ? data.deliveryNotes.trim() : null,
          consignmentItems: {
            create: items.map((item) => ({
              ewasteItemId: item.id,
            })),
          },
        },
        include: {
          consignmentItems: {
            include: {
              ewasteItem: true,
            },
          },
          recycler: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          collector: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
    });

    // Notify receiving recycler (docs/23 Section 2: CONSIGNMENT_INCOMING)
    await notificationService.createNotification({
      userId: recyclerProfile.userId,
      type: NOTIFICATION_TYPES.CONSIGNMENT_INCOMING,
      title: 'Incoming Consignment',
      message: `A new consignment of ${items.length} items (${totalWeight || 0}kg) is being delivered.`,
      referenceType: 'consignment',
      referenceId: consignment.id,
    });

    return consignment;
  }

  /**
   * List consignments with role-based scoping and pagination
   * @param {object} user - Authenticated user context
   * @param {object} query - Query parameters (status, page, limit)
   * @returns {Promise<object>} Paginated consignments
   */
  async listConsignments(user, { status, page = 1, limit = 20 }) {
    const where = {};

    if (user.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await prisma.collectorProfile.findUnique({
        where: { userId: user.id },
      });
      if (!collectorProfile) {
        throw AppError.forbidden('Collector profile not found');
      }
      where.collectorId = collectorProfile.id;
    } else if (user.role === ROLES.RECYCLER) {
      const recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!recyclerProfile) {
        throw AppError.forbidden('Recycler profile not found');
      }
      where.recyclerId = recyclerProfile.id;
    } else if (user.role === ROLES.ADMIN) {
      // Admins have platform-wide visibility
    } else {
      throw AppError.forbidden('Access forbidden: Insufficient permissions for consignments');
    }

    if (status) {
      where.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [consignments, total] = await Promise.all([
      prisma.consignment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          collector: {
            include: {
              user: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
          recycler: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
          consignmentItems: {
            include: {
              ewasteItem: {
                select: {
                  id: true,
                  category: true,
                  condition: true,
                  estimatedWeightKg: true,
                  actualWeightKg: true,
                  status: true,
                },
              },
            },
          },
          recyclingRecord: {
            select: {
              id: true,
              status: true,
              receivedAt: true,
            },
          },
        },
      }),
      prisma.consignment.count({ where }),
    ]);

    return {
      consignments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Mark a consignment as delivered
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {string} consignmentId - Consignment UUID
   * @returns {Promise<object>} Updated consignment
   */
  async deliverConsignment(collectorUserId, consignmentId) {
    const collectorProfile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUserId },
    });

    if (!collectorProfile) {
      throw AppError.forbidden('Collector profile not found');
    }

    const consignment = await prisma.consignment.findUnique({
      where: { id: consignmentId },
    });

    if (!consignment) {
      throw AppError.notFound('Consignment not found');
    }

    if (consignment.collectorId !== collectorProfile.id) {
      throw AppError.forbidden('You can only deliver your own consignments');
    }

    // Status must be CREATED or IN_TRANSIT
    if (
      consignment.status !== CONSIGNMENT_STATUS.CREATED &&
      consignment.status !== CONSIGNMENT_STATUS.IN_TRANSIT
    ) {
      throw AppError.badRequest(
        `Cannot mark consignment as delivered in status '${consignment.status}'. Status must be CREATED or IN_TRANSIT.`
      );
    }

    const updated = await prisma.consignment.update({
      where: { id: consignmentId },
      data: {
        status: CONSIGNMENT_STATUS.DELIVERED,
        deliveredAt: new Date(),
      },
      include: {
        consignmentItems: {
          include: {
            ewasteItem: true,
          },
        },
        recycler: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Recycler accepts delivered consignment
   * @param {string} recyclerUserId - Authenticated recycler user UUID
   * @param {string} consignmentId - Consignment UUID
   * @returns {Promise<object>} Updated consignment with auto-created recycling record
   */
  async acceptConsignment(recyclerUserId, consignmentId) {
    const recyclerProfile = await prisma.recyclerProfile.findUnique({
      where: { userId: recyclerUserId },
    });

    if (!recyclerProfile) {
      throw AppError.forbidden('Recycler profile not found');
    }

    const consignment = await prisma.consignment.findUnique({
      where: { id: consignmentId },
      include: {
        consignmentItems: true,
        collector: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!consignment) {
      throw AppError.notFound('Consignment not found');
    }

    // Only the receiving recycler can accept (BR-CO-04)
    if (consignment.recyclerId !== recyclerProfile.id) {
      throw AppError.forbidden('You can only accept consignments delivered to your facility');
    }

    // Validation: Status must be DELIVERED
    if (consignment.status !== CONSIGNMENT_STATUS.DELIVERED) {
      throw AppError.badRequest(
        `Cannot accept consignment in status '${consignment.status}'. Consignment must be in DELIVERED status.`
      );
    }

    const itemIds = consignment.consignmentItems.map((ci) => ci.ewasteItemId);

    // Atomic execution of consignment acceptance, item status update, and recycling record creation
    const { updatedConsignment, recyclingRecord } = await prisma.$transaction(async (tx) => {
      // 1. Update consignment status to ACCEPTED
      const updated = await tx.consignment.update({
        where: { id: consignmentId },
        data: {
          status: CONSIGNMENT_STATUS.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          consignmentItems: {
            include: {
              ewasteItem: true,
            },
          },
          recycler: true,
        },
      });

      // 2. Transition linked e-waste items to CONSIGNED (BR-CO-01 / line 101)
      if (itemIds.length > 0) {
        await tx.ewasteItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: ITEM_STATUS.CONSIGNED },
        });
      }

      // 3. BR-RR-01: Auto-create recycling record with status RECEIVED
      const record = await tx.recyclingRecord.create({
        data: {
          consignmentId: consignment.id,
          recyclerId: recyclerProfile.id,
          status: RECYCLING_STATUS.RECEIVED,
          receivedAt: new Date(),
        },
      });

      // 4. Increment recycler totalConsignments counter
      await tx.recyclerProfile.update({
        where: { id: recyclerProfile.id },
        data: {
          totalConsignments: { increment: 1 },
        },
      });

      return { updatedConsignment: updated, recyclingRecord: record };
    });

    // Notify delivering collector (docs/23 Section 2: CONSIGNMENT_ACCEPTED)
    if (consignment.collector && consignment.collector.userId) {
      await notificationService.createNotification({
        userId: consignment.collector.userId,
        type: NOTIFICATION_TYPES.CONSIGNMENT_ACCEPTED,
        title: 'Consignment Accepted',
        message: `Your consignment has been accepted by ${recyclerProfile.facilityName}.`,
        referenceType: 'consignment',
        referenceId: consignment.id,
      });
    }

    return {
      ...updatedConsignment,
      recyclingRecord,
    };
  }

  /**
   * Recycler rejects consignment with documented reason
   * @param {string} recyclerUserId - Authenticated recycler user UUID
   * @param {string} consignmentId - Consignment UUID
   * @param {object} param2 - Rejection payload containing reason
   * @returns {Promise<object>} Updated consignment
   */
  async rejectConsignment(recyclerUserId, consignmentId, { reason }) {
    const recyclerProfile = await prisma.recyclerProfile.findUnique({
      where: { userId: recyclerUserId },
    });

    if (!recyclerProfile) {
      throw AppError.forbidden('Recycler profile not found');
    }

    const consignment = await prisma.consignment.findUnique({
      where: { id: consignmentId },
      include: {
        collector: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!consignment) {
      throw AppError.notFound('Consignment not found');
    }

    // Only the receiving recycler can reject (BR-CO-04)
    if (consignment.recyclerId !== recyclerProfile.id) {
      throw AppError.forbidden('You can only reject consignments delivered to your facility');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw AppError.badRequest('Rejection reason is required');
    }

    // Cannot reject an already accepted consignment
    if (consignment.status === CONSIGNMENT_STATUS.ACCEPTED) {
      throw AppError.badRequest('Cannot reject an already accepted consignment');
    }

    if (consignment.status === CONSIGNMENT_STATUS.REJECTED) {
      throw AppError.badRequest('Consignment is already rejected');
    }

    // Update status to REJECTED. Linked items remain in COLLECTED status per EC-CO-01
    const updated = await prisma.consignment.update({
      where: { id: consignmentId },
      data: {
        status: CONSIGNMENT_STATUS.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
      },
      include: {
        consignmentItems: {
          include: {
            ewasteItem: true,
          },
        },
      },
    });

    // Notify delivering collector (docs/23 Section 2: CONSIGNMENT_REJECTED)
    if (consignment.collector && consignment.collector.userId) {
      await notificationService.createNotification({
        userId: consignment.collector.userId,
        type: NOTIFICATION_TYPES.CONSIGNMENT_REJECTED,
        title: 'Consignment Rejected',
        message: `Your consignment was rejected. Reason: ${reason.trim()}`,
        referenceType: 'consignment',
        referenceId: consignment.id,
      });
    }

    return updated;
  }

  /**
   * Internal/scoped helper to retrieve single consignment by ID
   * @param {object} user - Authenticated user context
   * @param {string} consignmentId - Consignment UUID
   * @returns {Promise<object>} Consignment details
   */
  async getConsignmentById(user, consignmentId) {
    const consignment = await prisma.consignment.findUnique({
      where: { id: consignmentId },
      include: {
        collector: {
          include: {
            user: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        recycler: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        consignmentItems: {
          include: {
            ewasteItem: true,
          },
        },
        recyclingRecord: true,
      },
    });

    if (!consignment) {
      throw AppError.notFound('Consignment not found');
    }

    // Role-based visibility check
    if (user.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await prisma.collectorProfile.findUnique({
        where: { userId: user.id },
      });
      if (!collectorProfile || consignment.collectorId !== collectorProfile.id) {
        throw AppError.forbidden('Access forbidden: You can only view your own consignments');
      }
    } else if (user.role === ROLES.RECYCLER) {
      const recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!recyclerProfile || consignment.recyclerId !== recyclerProfile.id) {
        throw AppError.forbidden('Access forbidden: You can only view consignments delivered to your facility');
      }
    } else if (user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions');
    }

    return consignment;
  }
}

module.exports = new ConsignmentService();
