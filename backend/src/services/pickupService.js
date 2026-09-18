// EcoSetu Pickup Service
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 8, docs/07_BUSINESS_WORKFLOWS.md Section 2.2, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');
const { ROLES, PICKUP_STATUS, REQUEST_STATUS, ITEM_STATUS, NOTIFICATION_TYPES } = require('../utils/constants');

class PickupService {
  /**
   * List assigned pickups for authenticated collector
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {object} query - Filtering & pagination
   * @returns {Promise<object>} Paginated pickups list
   */
  async listPickups(collectorUserId, { status, page = 1, limit = 20 }) {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUserId },
    });

    if (!profile) {
      throw AppError.forbidden('Collector profile not found or user is not an active collector');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      collectorId: profile.id,
    };

    if (status) {
      where.status = status;
    }

    const [pickups, total] = await Promise.all([
      prisma.pickup.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          collectionRequest: {
            include: {
              ewasteItems: true,
              citizen: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.pickup.count({ where }),
    ]);

    return {
      pickups,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get pickup details by ID with role-based authorization
   * @param {object} actor - Authenticated user context
   * @param {string} pickupId - Pickup UUID
   * @returns {Promise<object>} Pickup details
   */
  async getPickupById(actor, pickupId) {
    const pickup = await prisma.pickup.findUnique({
      where: { id: pickupId },
      include: {
        collectionRequest: {
          include: {
            ewasteItems: true,
            citizen: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        collector: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!pickup) {
      throw AppError.notFound('Pickup not found');
    }

    // Role-based authorization per docs/05_API_SPECIFICATION.md Section 8:
    // Roles: INFORMAL_COLLECTOR (own), CITIZEN (own request), ADMIN
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const isAssigned = pickup.collector && pickup.collector.userId === actor.id;
      if (!isAssigned) {
        throw AppError.forbidden('Access forbidden: You can only view your own assigned pickups');
      }
    } else if (actor.role === ROLES.CITIZEN) {
      const isOwner = pickup.collectionRequest && pickup.collectionRequest.citizenId === actor.id;
      if (!isOwner) {
        throw AppError.forbidden('Access forbidden: You can only view pickups for your own requests');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions for this pickup');
    }

    return pickup;
  }

  /**
   * Mark pickup as in progress (SCHEDULED -> IN_PROGRESS)
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {string} pickupId - Pickup UUID
   * @returns {Promise<object>} Updated pickup
   */
  async startPickup(collectorUserId, pickupId) {
    const pickup = await prisma.pickup.findUnique({
      where: { id: pickupId },
      include: {
        collector: true,
        collectionRequest: true,
      },
    });

    if (!pickup) {
      throw AppError.notFound('Pickup not found');
    }

    if (!pickup.collector || pickup.collector.userId !== collectorUserId) {
      throw AppError.forbidden('Access forbidden: You can only start pickups assigned to you');
    }

    if (pickup.status !== PICKUP_STATUS.SCHEDULED) {
      throw AppError.badRequest(
        `Cannot start pickup in status '${pickup.status}'. Pickup must be in SCHEDULED status.`
      );
    }

    const updated = await prisma.pickup.update({
      where: { id: pickupId },
      data: {
        status: PICKUP_STATUS.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        collectionRequest: {
          include: {
            ewasteItems: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Complete pickup and update linked request, items, and collector stats
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {string} pickupId - Pickup UUID
   * @param {object} payload - { totalWeightKg, collectorNotes, items }
   * @returns {Promise<object>} Completed pickup
   */
  async completePickup(collectorUserId, pickupId, { totalWeightKg, collectorNotes, items }) {
    const pickup = await prisma.pickup.findUnique({
      where: { id: pickupId },
      include: {
        collectionRequest: {
          include: { ewasteItems: true },
        },
        collector: true,
      },
    });

    if (!pickup) {
      throw AppError.notFound('Pickup not found');
    }

    if (!pickup.collector || pickup.collector.userId !== collectorUserId) {
      throw AppError.forbidden('Access forbidden: You can only complete pickups assigned to you');
    }

    if (pickup.status !== PICKUP_STATUS.IN_PROGRESS) {
      throw AppError.badRequest(
        `Cannot complete pickup in status '${pickup.status}'. Pickup must be in IN_PROGRESS status.`
      );
    }

    // Validate that all submitted items belong to this pickup's collection request
    const requestItemMap = new Map(
      (pickup.collectionRequest.ewasteItems || []).map((item) => [item.id, item])
    );

    for (const it of items) {
      if (!requestItemMap.has(it.itemId)) {
        throw AppError.badRequest(`Item with ID ${it.itemId} does not belong to this collection request`);
      }
    }

    // Execute atomic completion transaction
    const executeTransaction = async (tx) => {
      // 1. Update Pickup
      const completedPickup = await tx.pickup.update({
        where: { id: pickupId },
        data: {
          status: PICKUP_STATUS.COMPLETED,
          completedAt: new Date(),
          totalWeightKg: parseFloat(totalWeightKg),
          collectorNotes: collectorNotes ? collectorNotes.trim() : null,
        },
        include: {
          collectionRequest: {
            include: { ewasteItems: true },
          },
        },
      });

      // 2. Update CollectionRequest status to PICKED_UP
      await tx.collectionRequest.update({
        where: { id: pickup.collectionRequestId },
        data: {
          status: REQUEST_STATUS.PICKED_UP,
          completedAt: new Date(),
        },
      });

      // 3. Update all collected EwasteItems to COLLECTED and record actualWeightKg
      for (const it of items) {
        await tx.ewasteItem.update({
          where: { id: it.itemId },
          data: {
            status: ITEM_STATUS.COLLECTED,
            actualWeightKg: parseFloat(it.actualWeightKg),
          },
        });
      }

      // 4. Increment collector's totalPickups counter
      await tx.collectorProfile.update({
        where: { id: pickup.collectorId },
        data: {
          totalPickups: { increment: 1 },
        },
      });

      return completedPickup;
    };

    const result = typeof prisma.$transaction === 'function'
      ? await prisma.$transaction(executeTransaction)
      : await executeTransaction(prisma);

    // Notify citizen that pickup was completed (docs/23_NOTIFICATION_SYSTEM.md Section 2)
    if (pickup.collectionRequest && pickup.collectionRequest.citizenId) {
      const itemCount = (items && items.length) || 0;
      const weight = parseFloat(totalWeightKg);
      await notificationService.createNotification({
        userId: pickup.collectionRequest.citizenId,
        type: NOTIFICATION_TYPES.PICKUP_COMPLETED,
        title: 'Pickup Completed',
        message: `Your e-waste has been collected. ${itemCount} items, ${weight}kg total.`,
        referenceType: 'pickup',
        referenceId: pickupId,
      });
    }

    return result;
  }
}

module.exports = new PickupService();
