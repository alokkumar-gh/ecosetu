// EcoSetu Pickup Service
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 8, docs/07_BUSINESS_WORKFLOWS.md Section 2.2, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');
const { ROLES, PICKUP_STATUS, REQUEST_STATUS, ITEM_STATUS, NOTIFICATION_TYPES } = require('../utils/constants');

class PickupService {
  /**
   * List assigned pickups for authenticated collector (Citizen Pickups + Recycler Transfers)
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

    // 1. Citizen Pickups Query
    const pickupWhere = { collectorId: profile.id };
    let queryCitizen = true;
    let queryRecycler = true;

    if (status) {
      const s = String(status).toUpperCase();
      if (['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(s)) {
        pickupWhere.status = s;
      } else if (s === 'PENDING') {
        pickupWhere.status = { in: [PICKUP_STATUS.SCHEDULED, PICKUP_STATUS.IN_PROGRESS] };
      } else {
        queryCitizen = false;
      }
    }

    const citizenPickupsPromise = queryCitizen
      ? prisma.pickup.findMany({
          where: pickupWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            collectionRequest: {
              include: {
                ewasteItems: true,
                pickupOffers: {
                  where: { collectorId: profile.id },
                },
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
        })
      : Promise.resolve([]);

    // 2. Recycler Transfers (HandoverRecord) Query
    const handoverWhere = { collectorId: profile.id };
    if (status) {
      const s = String(status).toUpperCase();
      if (s === 'SCHEDULED' || s === 'PENDING') {
        handoverWhere.status = 'PENDING_COLLECTOR';
      } else if (s === 'IN_PROGRESS') {
        handoverWhere.status = { in: ['COLLECTOR_CONFIRMED', 'RECYCLER_CONFIRMED'] };
      } else if (s === 'COMPLETED') {
        handoverWhere.status = 'CONFIRMED';
      } else if (['PENDING_COLLECTOR', 'COLLECTOR_CONFIRMED', 'RECYCLER_CONFIRMED', 'CONFIRMED', 'CANCELLED', 'DISPUTED', 'REJECTED'].includes(s)) {
        handoverWhere.status = s;
      } else {
        queryRecycler = false;
      }
    } else {
      // By default, exclude cancelled or rejected handovers if status is not specified, or include all active handovers
      handoverWhere.status = { in: ['PENDING_COLLECTOR', 'COLLECTOR_CONFIRMED', 'RECYCLER_CONFIRMED', 'CONFIRMED', 'DISPUTED'] };
    }

    const handoverRecordsPromise = queryRecycler
      ? prisma.handoverRecord.findMany({
          where: handoverWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            materialLot: {
              include: {
                photos: true,
              },
            },
            quote: true,
            recycler: {
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
            photos: true,
            batch: true,
          },
        })
      : Promise.resolve([]);

    const [rawCitizenPickups, rawHandoverRecords] = await Promise.all([
      citizenPickupsPromise,
      handoverRecordsPromise,
    ]);

    // 3. Format Citizen Pickups
    const formattedCitizenPickups = rawCitizenPickups.map((p) => {
      const citizenName = p.collectionRequest?.citizen?.name || 'Citizen Requester';
      return {
        ...p,
        type: 'CITIZEN_PICKUP',
        primaryName: citizenName,
        citizenName,
        pickupAddress: p.collectionRequest?.pickupAddress || 'Address on file',
      };
    });

    // 4. Format Recycler Transfers
    const formattedHandovers = rawHandoverRecords.map((hdo) => {
      const recyclerName = hdo.recycler?.user?.name || hdo.recycler?.companyName || 'Authorized Recycler';
      const lotCategory = hdo.materialLot?.category ? String(hdo.materialLot.category).replace(/_/g, ' ') : 'E-Waste Material';
      const lotSubcategory = hdo.materialLot?.subcategory || null;
      const weight = hdo.declaredWeightKg ? Number(hdo.declaredWeightKg) : (hdo.materialLot?.approximateTotalWeightKg ? Number(hdo.materialLot.approximateTotalWeightKg) : 0);
      const amount = hdo.quote?.quotedTotal ? Number(hdo.quote.quotedTotal) : (hdo.quote?.offeredPrice ? Number(hdo.quote.offeredPrice) : 0);
      const photoUrl = hdo.materialLot?.photos?.[0]?.photoUrl || hdo.photos?.[0]?.photoUrl || hdo.materialLot?.photoUrl || null;
      const scheduledDate = hdo.handoverTimestamp || hdo.createdAt;

      return {
        id: hdo.id,
        type: 'RECYCLER_TRANSFER',
        handoverId: hdo.id,
        referenceNumber: hdo.referenceNumber,
        materialLotId: hdo.materialLotId,
        quoteId: hdo.quoteId,
        batchId: hdo.batchId || null,
        collectorId: hdo.collectorId,
        recyclerId: hdo.recyclerId,
        status: hdo.status,
        recyclerName,
        primaryName: recyclerName, // PRIMARY: Recycler Name
        category: lotCategory,
        subcategory: lotSubcategory,
        secondaryText: `${lotCategory}${lotSubcategory ? ` (${lotSubcategory})` : ''} • ${weight} kg`, // SECONDARY: Material Category & Weight
        totalWeightKg: weight,
        declaredWeightKg: weight,
        totalAmount: amount,
        agreedPrice: amount,
        pickupAddress: hdo.recycler?.facilityAddress || hdo.recycler?.city || 'Recycler Facility',
        scheduledDate,
        createdAt: hdo.createdAt,
        updatedAt: hdo.updatedAt,
        photoUrl,
        imageUrl: photoUrl,
        materialLot: hdo.materialLot,
        quote: hdo.quote,
        recycler: hdo.recycler,
        photos: hdo.photos,
        batch: hdo.batch,
        items: hdo.materialLot
          ? [
              {
                id: hdo.materialLot.id,
                category: lotCategory,
                subcategory: lotSubcategory,
                estimatedWeightKg: weight,
                actualWeightKg: weight,
                imageUrl: photoUrl,
              },
            ]
          : [],
      };
    });

    // 5. Combine & Deduplicate deterministically by ID
    const seenIds = new Set();
    const combined = [];

    for (const item of [...formattedCitizenPickups, ...formattedHandovers]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }

    // 6. Sort deterministically by scheduledDate / createdAt desc
    combined.sort((a, b) => {
      const tA = new Date(a.scheduledDate || a.createdAt || 0).getTime();
      const tB = new Date(b.scheduledDate || b.createdAt || 0).getTime();
      return tB - tA;
    });

    // 7. Paginate
    const total = combined.length;
    const paginated = combined.slice(skip, skip + limitNum);

    return {
      pickups: paginated,
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
            pickupOffers: true,
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

    if (pickup) {
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

      return {
        ...pickup,
        type: 'CITIZEN_PICKUP',
        primaryName: pickup.collectionRequest?.citizen?.name || 'Citizen Requester',
        pickupAddress: pickup.collectionRequest?.pickupAddress || 'Address on file',
      };
    }

    // Check if pickupId refers to a HandoverRecord
    const handover = await prisma.handoverRecord.findUnique({
      where: { id: pickupId },
      include: {
        materialLot: {
          include: { photos: true },
        },
        quote: true,
        collector: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        recycler: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        photos: true,
        batch: true,
      },
    });

    if (!handover) {
      throw AppError.notFound('Pickup not found');
    }

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      if (handover.collector?.userId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view your own assigned pickups');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      if (handover.recycler?.userId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view handovers for your own facility');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions for this pickup');
    }

    const recyclerName = handover.recycler?.user?.name || handover.recycler?.companyName || 'Authorized Recycler';
    const lotCategory = handover.materialLot?.category ? String(handover.materialLot.category).replace(/_/g, ' ') : 'E-Waste Material';
    const lotSubcategory = handover.materialLot?.subcategory || null;
    const weight = handover.declaredWeightKg ? Number(handover.declaredWeightKg) : (handover.materialLot?.approximateTotalWeightKg ? Number(handover.materialLot.approximateTotalWeightKg) : 0);
    const amount = handover.quote?.quotedTotal ? Number(handover.quote.quotedTotal) : (handover.quote?.offeredPrice ? Number(handover.quote.offeredPrice) : 0);
    const photoUrl = handover.materialLot?.photos?.[0]?.photoUrl || handover.photos?.[0]?.photoUrl || handover.materialLot?.photoUrl || null;

    return {
      id: handover.id,
      type: 'RECYCLER_TRANSFER',
      handoverId: handover.id,
      referenceNumber: handover.referenceNumber,
      materialLotId: handover.materialLotId,
      quoteId: handover.quoteId,
      batchId: handover.batchId || null,
      collectorId: handover.collectorId,
      recyclerId: handover.recyclerId,
      status: handover.status,
      recyclerName,
      primaryName: recyclerName,
      category: lotCategory,
      subcategory: lotSubcategory,
      secondaryText: `${lotCategory}${lotSubcategory ? ` (${lotSubcategory})` : ''} • ${weight} kg`,
      totalWeightKg: weight,
      declaredWeightKg: weight,
      totalAmount: amount,
      agreedPrice: amount,
      pickupAddress: handover.recycler?.facilityAddress || handover.recycler?.city || 'Recycler Facility',
      scheduledDate: handover.handoverTimestamp || handover.createdAt,
      createdAt: handover.createdAt,
      updatedAt: handover.updatedAt,
      photoUrl,
      imageUrl: photoUrl,
      materialLot: handover.materialLot,
      quote: handover.quote,
      recycler: handover.recycler,
      photos: handover.photos,
      batch: handover.batch,
      items: handover.materialLot
        ? [
            {
              id: handover.materialLot.id,
              category: lotCategory,
              subcategory: lotSubcategory,
              estimatedWeightKg: weight,
              actualWeightKg: weight,
              imageUrl: photoUrl,
            },
          ]
        : [],
    };
  }

  /**
   * Mark pickup as in progress (SCHEDULED -> IN_PROGRESS for Citizen pickups; PENDING_COLLECTOR -> COLLECTOR_CONFIRMED for Recycler transfers)
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {string} pickupId - Pickup or HandoverRecord UUID
   * @returns {Promise<object>} Updated pickup or handover
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
      // Check if pickupId refers to a HandoverRecord
      const handover = await prisma.handoverRecord.findUnique({
        where: { id: pickupId },
        include: { collector: true, recycler: { include: { user: true } }, materialLot: true },
      });

      if (!handover) {
        throw AppError.notFound('Pickup not found');
      }

      if (!handover.collector || handover.collector.userId !== collectorUserId) {
        throw AppError.forbidden('Access forbidden: You can only start pickups assigned to you');
      }

      const updatedHdo = await prisma.handoverRecord.update({
        where: { id: pickupId },
        data: {
          status: 'COLLECTOR_CONFIRMED',
          collectorConfirmedAt: new Date(),
        },
        include: {
          materialLot: true,
          quote: true,
          recycler: { include: { user: true } },
          photos: true,
        },
      });

      return {
        id: updatedHdo.id,
        type: 'RECYCLER_TRANSFER',
        handoverId: updatedHdo.id,
        status: updatedHdo.status,
        recyclerName: updatedHdo.recycler?.user?.name || 'Authorized Recycler',
        primaryName: updatedHdo.recycler?.user?.name || 'Authorized Recycler',
        totalWeightKg: updatedHdo.declaredWeightKg ? Number(updatedHdo.declaredWeightKg) : 0,
      };
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
    });

    // Emit realtime event
    const eventBus = require('./eventBus');
    eventBus.emit('PICKUP_STARTED', { pickup: updated });

    // Notify citizen that collector is on the way
    if (pickup.collectionRequest && pickup.collectionRequest.citizenId) {
      await notificationService.createNotification({
        userId: pickup.collectionRequest.citizenId,
        type: NOTIFICATION_TYPES.PICKUP_SCHEDULED,
        title: 'Pickup In Progress',
        message: 'Your collector is now heading to your location to collect the e-waste.',
        referenceType: 'pickup',
        referenceId: pickupId,
      }).catch((err) => console.warn('[PickupService] Start pickup citizen notification error:', err?.message));
    }

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

    const safeItems = Array.isArray(items) && items.length > 0
      ? items
      : (pickup.collectionRequest.ewasteItems || []).map((it) => ({
          itemId: it.id,
          actualWeightKg: it.estimatedWeightKg || 1.0,
        }));

    for (const it of safeItems) {
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
          totalWeightKg: parseFloat(totalWeightKg) || 1.0,
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
      for (const it of safeItems) {
        await tx.ewasteItem.update({
          where: { id: it.itemId },
          data: {
            status: ITEM_STATUS.COLLECTED,
            actualWeightKg: parseFloat(it.actualWeightKg) || 1.0,
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

    // Emit realtime event
    const eventBus = require('./eventBus');
    eventBus.emit('PICKUP_COMPLETED', { pickup: result, items: safeItems });

    // Notify citizen that pickup was completed (docs/23_NOTIFICATION_SYSTEM.md Section 2)
    if (pickup.collectionRequest && pickup.collectionRequest.citizenId) {
      const itemCount = (safeItems && safeItems.length) || 0;
      const weight = parseFloat(totalWeightKg) || 0;
      await notificationService.createNotification({
        userId: pickup.collectionRequest.citizenId,
        type: NOTIFICATION_TYPES.PICKUP_COMPLETED,
        title: 'Pickup Completed',
        message: `Your e-waste has been collected. ${itemCount} items, ${weight}kg total.`,
        referenceType: 'pickup',
        referenceId: pickupId,
      }).catch((err) => console.warn('[PickupService] Citizen notification error:', err?.message));
    }

    // Notify collector as well
    await notificationService.createNotification({
      userId: collectorUserId,
      type: NOTIFICATION_TYPES.PICKUP_COMPLETED,
      title: 'Pickup Completed Successfully',
      message: `Pickup #${pickupId.slice(0, 8).toUpperCase()} completed. E-waste is now in your collected inventory.`,
      referenceType: 'pickup',
      referenceId: pickupId,
    }).catch((err) => console.warn('[PickupService] Collector notification error:', err?.message));

    return result;
  }
}

module.exports = new PickupService();
