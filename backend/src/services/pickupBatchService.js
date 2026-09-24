// EcoSetu Pickup Batch / Multi-Lot Logistics Service
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 5: Advanced Logistics & Multi-Lot Consolidation

const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const { ROLES, BATCH_STATUS, AUDIT_ACTIONS, MATERIAL_LOT_STATUS, QUOTE_STATUS, HANDOVER_STATUS } = require('../utils/constants');

class PickupBatchService {
  /**
   * Generate unique, human-readable batch reference number (BAT-YYYYMM-XXXXX)
   * @returns {string}
   */
  generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `BAT-${year}${month}-${randomHex}`;
  }

  /**
   * Helper: Resolve Actor to full user record
   */
  async resolveActor(actor) {
    if (!actor) {
      throw AppError.unauthorized('Authentication required');
    }
    if (typeof actor === 'string') {
      const user = await prisma.user.findUnique({ where: { id: actor } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      return user;
    }
    if (!actor.role && actor.id) {
      const user = await prisma.user.findUnique({ where: { id: actor.id } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      return user;
    }
    return actor;
  }

  /**
   * Helper: Get Collector Profile by User ID
   */
  async getCollectorProfileOrThrow(userId) {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) {
      throw AppError.forbidden('Collector profile not found for this account');
    }
    return profile;
  }

  /**
   * Helper: Get Recycler Profile by User ID
   */
  async getRecyclerProfileOrThrow(userId) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) {
      throw AppError.forbidden('Recycler profile not found for this account');
    }
    return profile;
  }

  /**
   * Create a new Pickup Batch (Multi-Lot Consolidation)
   * @param {object|string} actor
   * @param {object} data
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async createBatch(actor, data, ipAddress = null) {
    actor = await this.resolveActor(actor);

    if (actor.role !== ROLES.RECYCLER && actor.role !== ROLES.INFORMAL_COLLECTOR && actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Only authorized recyclers, collectors, or administrators can create pickup batches');
    }

    let recyclerId = data.recyclerId;
    let collectorId = data.collectorId || null;

    if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      recyclerId = recyclerProfile.id;
    } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      collectorId = collectorProfile.id;
    }

    if (!recyclerId) {
      throw AppError.badRequest('Target recyclerId is required to create a pickup batch');
    }

    const lotIds = Array.isArray(data.lotIds) ? [...new Set(data.lotIds)] : [];

    // Validate lot memberships if lotIds provided
    const validatedLots = [];
    if (lotIds.length > 0) {
      for (const lotId of lotIds) {
        const lot = await prisma.materialLot.findUnique({
          where: { id: lotId },
          include: {
            quotes: {
              where: { status: QUOTE_STATUS.ACCEPTED },
              include: { recycler: true },
            },
            pickupBatchLots: {
              include: { batch: true },
            },
          },
        });

        if (!lot) {
          throw AppError.notFound(`Material lot ${lotId} not found`);
        }

        // Lot must not be already completed
        if (lot.status === MATERIAL_LOT_STATUS.COMPLETED) {
          throw AppError.badRequest(`Lot ${lot.referenceNumber} is already completed and cannot be batched`);
        }

        // Lot must have an accepted quote
        const acceptedQuote = lot.quotes[0];
        if (!acceptedQuote) {
          throw AppError.badRequest(`Lot ${lot.referenceNumber} has no accepted quote for logistics batching`);
        }

        // Lot must belong to the same buyer/recycler
        if (acceptedQuote.recyclerId !== recyclerId) {
          throw AppError.badRequest(
            `Lot ${lot.referenceNumber} was accepted by a different recycler (${acceptedQuote.recycler.facilityName}) and cannot be added to this batch`
          );
        }

        // If collector is creating, lot must belong to that collector
        if (actor.role === ROLES.INFORMAL_COLLECTOR && lot.collectorId !== collectorId) {
          throw AppError.forbidden(`Lot ${lot.referenceNumber} does not belong to your collector profile`);
        }

        // Lot cannot belong to another active batch
        const activeBatch = lot.pickupBatchLots.find(
          (b) => b.batch.status !== BATCH_STATUS.COMPLETED && b.batch.status !== BATCH_STATUS.CANCELLED && b.status === 'ACTIVE'
        );
        if (activeBatch) {
          throw AppError.badRequest(`Lot ${lot.referenceNumber} is already part of active batch ${activeBatch.batch.referenceNumber}`);
        }

        // Set collectorId from lot if not set
        if (!collectorId) {
          collectorId = lot.collectorId;
        }

        validatedLots.push(lot);
      }
    }

    const referenceNumber = this.generateReferenceNumber();
    const initialStatus = data.scheduledDate ? BATCH_STATUS.SCHEDULED : BATCH_STATUS.PLANNED;

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.pickupBatch.create({
        data: {
          referenceNumber,
          recyclerId,
          collectorId,
          status: initialStatus,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
          pickupAddress: data.pickupAddress || null,
          latitude: data.latitude !== undefined && data.latitude !== null ? data.latitude : null,
          longitude: data.longitude !== undefined && data.longitude !== null ? data.longitude : null,
          locationAvailable: data.latitude !== null && data.longitude !== null && data.latitude !== undefined && data.longitude !== undefined,
          notes: data.notes || null,
          createdById: actor.id,
        },
      });

      if (validatedLots.length > 0) {
        await tx.pickupBatchLot.createMany({
          data: validatedLots.map((lot) => ({
            batchId: created.id,
            materialLotId: lot.id,
            addedById: actor.id,
            status: 'ACTIVE',
          })),
        });
      }

      return created;
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.BATCH_CREATED,
      entityType: 'pickup_batches',
      entityId: batch.id,
      details: {
        referenceNumber: batch.referenceNumber,
        recyclerId: batch.recyclerId,
        collectorId: batch.collectorId,
        lotsCount: validatedLots.length,
        status: batch.status,
      },
      ipAddress,
    });

    logger.info(`[PickupBatchService] PickupBatch ${batch.referenceNumber} created with ${validatedLots.length} lots`, {
      service: 'ecosetu-backend',
    });

    return this.getBatchById(actor, batch.id);
  }

  /**
   * Retrieve list of pickup batches with filtering & tenancy
   */
  async getBatches(actor, query = {}) {
    actor = await this.resolveActor(actor);

    const where = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.scheduledDate = {};
      if (query.dateFrom) where.scheduledDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.scheduledDate.lte = new Date(query.dateTo);
    }

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      where.collectorId = collectorProfile.id;
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      where.recyclerId = recyclerProfile.id;
    }

    const limit = parseInt(query.limit, 10) || 20;
    const offset = parseInt(query.offset, 10) || 0;

    const [batches, total] = await Promise.all([
      prisma.pickupBatch.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          recycler: { include: { user: true } },
          collector: { include: { user: true } },
          lots: {
            include: {
              materialLot: {
                include: {
                  quotes: { where: { status: QUOTE_STATUS.ACCEPTED } },
                  handovers: { include: { transaction: true } },
                },
              },
            },
          },
        },
      }),
      prisma.pickupBatch.count({ where }),
    ]);

    return {
      batches: batches.map((batch) => this.formatBatchSummary(batch, actor.role)),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get single Pickup Batch by ID with comprehensive lot-by-lot inspection
   */
  async getBatchById(actor, batchId) {
    actor = await this.resolveActor(actor);

    const batch = await prisma.pickupBatch.findUnique({
      where: { id: batchId },
      include: {
        recycler: { include: { user: true } },
        collector: { include: { user: true } },
        lots: {
          include: {
            materialLot: {
              include: {
                quotes: { where: { status: QUOTE_STATUS.ACCEPTED } },
                handovers: {
                  include: {
                    photos: true,
                    transaction: true,
                  },
                },
              },
            },
          },
        },
        handovers: {
          include: {
            photos: true,
            transaction: true,
          },
        },
      },
    });

    if (!batch) {
      throw AppError.notFound('Pickup batch not found');
    }

    // Tenancy check
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      if (batch.collectorId && batch.collectorId !== collectorProfile.id) {
        throw AppError.forbidden('You do not have permission to view this pickup batch');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      if (batch.recyclerId !== recyclerProfile.id) {
        throw AppError.forbidden('You do not have permission to view this pickup batch');
      }
    }

    return this.formatBatchDetail(batch, actor.role);
  }

  /**
   * Add additional eligible lots to an existing batch
   */
  async addLotsToBatch(actor, batchId, lotIds, ipAddress = null) {
    actor = await this.resolveActor(actor);

    const batch = await prisma.pickupBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw AppError.notFound('Pickup batch not found');
    }

    if (batch.status === BATCH_STATUS.COMPLETED || batch.status === BATCH_STATUS.CANCELLED) {
      throw AppError.badRequest(`Cannot add lots to a batch in ${batch.status} status`);
    }

    // Tenancy check
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      if (batch.collectorId && batch.collectorId !== collectorProfile.id) {
        throw AppError.forbidden('You do not have permission to modify this batch');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      if (batch.recyclerId !== recyclerProfile.id) {
        throw AppError.forbidden('You do not have permission to modify this batch');
      }
    }

    const uniqueLotIds = [...new Set(lotIds)];
    for (const lotId of uniqueLotIds) {
      const lot = await prisma.materialLot.findUnique({
        where: { id: lotId },
        include: {
          quotes: { where: { status: QUOTE_STATUS.ACCEPTED } },
          pickupBatchLots: { include: { batch: true } },
        },
      });

      if (!lot) {
        throw AppError.notFound(`Material lot ${lotId} not found`);
      }

      if (lot.status === MATERIAL_LOT_STATUS.COMPLETED) {
        throw AppError.badRequest(`Lot ${lot.referenceNumber} is already completed`);
      }

      const acceptedQuote = lot.quotes[0];
      if (!acceptedQuote) {
        throw AppError.badRequest(`Lot ${lot.referenceNumber} has no accepted quote`);
      }

      if (acceptedQuote.recyclerId !== batch.recyclerId) {
        throw AppError.badRequest(`Lot ${lot.referenceNumber} was accepted by a different buyer`);
      }

      const activeBatch = lot.pickupBatchLots.find(
        (b) => b.batch.status !== BATCH_STATUS.COMPLETED && b.batch.status !== BATCH_STATUS.CANCELLED && b.status === 'ACTIVE'
      );
      if (activeBatch && activeBatch.batchId !== batch.id) {
        throw AppError.badRequest(`Lot ${lot.referenceNumber} is already in active batch ${activeBatch.batch.referenceNumber}`);
      }

      await prisma.pickupBatchLot.upsert({
        where: {
          batchId_materialLotId: {
            batchId: batch.id,
            materialLotId: lot.id,
          },
        },
        create: {
          batchId: batch.id,
          materialLotId: lot.id,
          addedById: actor.id,
          status: 'ACTIVE',
        },
        update: {
          status: 'ACTIVE',
        },
      });
    }

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.BATCH_LOT_ADDED,
      entityType: 'pickup_batches',
      entityId: batch.id,
      details: {
        addedLotIds: uniqueLotIds,
      },
      ipAddress,
    });

    return this.getBatchById(actor, batch.id);
  }

  /**
   * Remove a lot from a batch without deleting the underlying material lot
   */
  async removeLotFromBatch(actor, batchId, lotId, ipAddress = null) {
    actor = await this.resolveActor(actor);

    const batch = await prisma.pickupBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw AppError.notFound('Pickup batch not found');
    }

    if (batch.status === BATCH_STATUS.COMPLETED) {
      throw AppError.badRequest('Cannot remove lots from a completed batch');
    }

    // Tenancy check
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      if (batch.collectorId && batch.collectorId !== collectorProfile.id) {
        throw AppError.forbidden('You do not have permission to modify this batch');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      if (batch.recyclerId !== recyclerProfile.id) {
        throw AppError.forbidden('You do not have permission to modify this batch');
      }
    }

    await prisma.pickupBatchLot.deleteMany({
      where: {
        batchId: batch.id,
        materialLotId: lotId,
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.BATCH_LOT_REMOVED,
      entityType: 'pickup_batches',
      entityId: batch.id,
      details: {
        removedLotId: lotId,
      },
      ipAddress,
    });

    return this.getBatchById(actor, batch.id);
  }

  /**
   * Transition batch status along valid lifecycle
   */
  async updateBatchStatus(actor, batchId, data, ipAddress = null) {
    actor = await this.resolveActor(actor);

    const batch = await prisma.pickupBatch.findUnique({
      where: { id: batchId },
      include: {
        lots: {
          include: {
            materialLot: {
              include: {
                handovers: { include: { transaction: true } },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw AppError.notFound('Pickup batch not found');
    }

    // Authorization
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      if (batch.collectorId && batch.collectorId !== collectorProfile.id) {
        throw AppError.forbidden('You do not have permission to transition this batch');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      if (batch.recyclerId !== recyclerProfile.id) {
        throw AppError.forbidden('You do not have permission to transition this batch');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Unauthorized role');
    }

    const currentStatus = batch.status;
    const targetStatus = data.status;

    if (!targetStatus || !Object.values(BATCH_STATUS).includes(targetStatus)) {
      throw AppError.badRequest(`Invalid target status: ${targetStatus}`);
    }

    const validTransitions = {
      [BATCH_STATUS.PLANNED]: [BATCH_STATUS.SCHEDULED, BATCH_STATUS.IN_PROGRESS, BATCH_STATUS.CANCELLED],
      [BATCH_STATUS.SCHEDULED]: [BATCH_STATUS.IN_PROGRESS, BATCH_STATUS.CANCELLED],
      [BATCH_STATUS.IN_PROGRESS]: [BATCH_STATUS.ARRIVED, BATCH_STATUS.CANCELLED],
      [BATCH_STATUS.ARRIVED]: [BATCH_STATUS.COLLECTING, BATCH_STATUS.CANCELLED],
      [BATCH_STATUS.COLLECTING]: [BATCH_STATUS.COMPLETED, BATCH_STATUS.CANCELLED],
      [BATCH_STATUS.COMPLETED]: [],
      [BATCH_STATUS.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(targetStatus)) {
      throw AppError.badRequest(`Cannot transition batch from ${currentStatus} to ${targetStatus}`);
    }

    const updatePayload = {
      status: targetStatus,
    };

    if (targetStatus === BATCH_STATUS.COMPLETED) {
      updatePayload.completedAt = new Date();
    } else if (targetStatus === BATCH_STATUS.CANCELLED) {
      updatePayload.cancelledAt = new Date();
      updatePayload.cancellationReason = data.cancellationReason || 'Batch cancelled by user';
    }

    if (data.scheduledDate) {
      updatePayload.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.pickupAddress) {
      updatePayload.pickupAddress = data.pickupAddress;
    }
    if (data.notes) {
      updatePayload.notes = data.notes;
    }

    const updated = await prisma.pickupBatch.update({
      where: { id: batch.id },
      data: updatePayload,
    });

    await auditService.logAction({
      actorId: actor.id,
      action: targetStatus === BATCH_STATUS.COMPLETED ? AUDIT_ACTIONS.BATCH_COMPLETED : targetStatus === BATCH_STATUS.CANCELLED ? AUDIT_ACTIONS.BATCH_CANCELLED : AUDIT_ACTIONS.BATCH_STATUS_UPDATED,
      entityType: 'pickup_batches',
      entityId: batch.id,
      details: {
        previousStatus: currentStatus,
        newStatus: targetStatus,
        cancellationReason: updatePayload.cancellationReason,
      },
      ipAddress,
    });

    return this.getBatchById(actor, updated.id);
  }

  /**
   * Query eligible lots available for batching
   */
  async getEligibleLotsForBatch(actor, params = {}) {
    actor = await this.resolveActor(actor);

    const where = {
      status: { in: [MATERIAL_LOT_STATUS.ACCEPTED, MATERIAL_LOT_STATUS.HANDOVER_PENDING] },
    };

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(actor.id);
      where.collectorId = collectorProfile.id;
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await this.getRecyclerProfileOrThrow(actor.id);
      where.quotes = {
        some: {
          recyclerId: recyclerProfile.id,
          status: QUOTE_STATUS.ACCEPTED,
        },
      };
    }

    if (params.recyclerId) {
      where.quotes = {
        some: {
          recyclerId: params.recyclerId,
          status: QUOTE_STATUS.ACCEPTED,
        },
      };
    }

    const lots = await prisma.materialLot.findMany({
      where,
      include: {
        collector: { include: { user: true } },
        quotes: {
          where: { status: QUOTE_STATUS.ACCEPTED },
          include: { recycler: true },
        },
        pickupBatchLots: {
          include: { batch: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out lots that are currently in an active batch
    const eligible = lots.filter((lot) => {
      const activeBatch = lot.pickupBatchLots.find(
        (b) => b.batch.status !== BATCH_STATUS.COMPLETED && b.batch.status !== BATCH_STATUS.CANCELLED && b.status === 'ACTIVE'
      );
      return !activeBatch;
    });

    return eligible.map((lot) => {
      const acceptedQuote = lot.quotes[0] || null;
      return {
        id: lot.id,
        referenceNumber: lot.referenceNumber,
        category: lot.category,
        subcategory: lot.subcategory,
        description: lot.description,
        approximateTotalWeightKg: lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : null,
        condition: lot.condition,
        status: lot.status,
        acceptedQuote: acceptedQuote
          ? {
              id: acceptedQuote.id,
              referenceNumber: acceptedQuote.referenceNumber,
              quotedUnitPrice: Number(acceptedQuote.quotedUnitPrice),
              quotedTotal: acceptedQuote.quotedTotal ? Number(acceptedQuote.quotedTotal) : null,
              recyclerId: acceptedQuote.recyclerId,
              recyclerName: acceptedQuote.recycler.facilityName,
            }
          : null,
      };
    });
  }

  /**
   * Format batch summary for list views
   */
  formatBatchSummary(batch, viewerRole) {
    const lots = batch.lots || [];
    const totalLotsCount = lots.length;
    let totalEstimatedWeightKg = 0;
    let completedLotsCount = 0;
    const categories = new Set();

    for (const membership of lots) {
      const lot = membership.materialLot;
      if (lot) {
        if (lot.approximateTotalWeightKg) {
          totalEstimatedWeightKg += Number(lot.approximateTotalWeightKg);
        }
        if (lot.category) {
          categories.add(lot.category);
        }
        const hasCompletedTransaction = lot.handovers?.some((h) => h.status === HANDOVER_STATUS.CONFIRMED && h.transaction);
        if (hasCompletedTransaction || lot.status === MATERIAL_LOT_STATUS.COMPLETED) {
          completedLotsCount++;
        }
      }
    }

    return {
      id: batch.id,
      referenceNumber: batch.referenceNumber,
      status: batch.status,
      scheduledDate: batch.scheduledDate,
      pickupAddress: batch.pickupAddress,
      totalLotsCount,
      completedLotsCount,
      totalEstimatedWeightKg: Math.round(totalEstimatedWeightKg * 100) / 100,
      categories: Array.from(categories),
      recyclerName: batch.recycler?.facilityName || 'Authorized Recycler',
      collectorName: batch.collector?.user?.name || 'Authorized Collector',
      createdAt: batch.createdAt,
    };
  }

  /**
   * Format comprehensive batch details with lot-by-lot inspection
   */
  formatBatchDetail(batch, viewerRole) {
    const lots = batch.lots || [];
    let totalEstimatedWeightKg = 0;
    let totalVerifiedWeightKg = 0;
    let totalFinalPayableAmount = 0;
    let completedLotsCount = 0;

    const formattedLots = lots.map((membership) => {
      const lot = membership.materialLot;
      const acceptedQuote = lot.quotes?.[0] || null;
      const handover = lot.handovers?.[0] || null;
      const transaction = handover?.transaction || null;

      const estimatedWeight = lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : 0;
      const agreedRate = acceptedQuote ? Number(acceptedQuote.quotedUnitPrice) : 0;
      const verifiedWeight = handover?.handoverWeightKg ? Number(handover.handoverWeightKg) : null;
      const finalPayable = transaction?.finalSaleValue ? Number(transaction.finalSaleValue) : verifiedWeight !== null ? Math.round(verifiedWeight * agreedRate * 100) / 100 : null;

      totalEstimatedWeightKg += estimatedWeight;
      if (verifiedWeight !== null) {
        totalVerifiedWeightKg += verifiedWeight;
      }
      if (finalPayable !== null) {
        totalFinalPayableAmount += finalPayable;
      }
      if (lot.status === MATERIAL_LOT_STATUS.COMPLETED || transaction) {
        completedLotsCount++;
      }

      return {
        id: lot.id,
        referenceNumber: lot.referenceNumber,
        category: lot.category,
        subcategory: lot.subcategory,
        condition: lot.condition,
        lotStatus: lot.status,
        membershipStatus: membership.status,
        estimatedWeightKg: estimatedWeight,
        agreedRate: agreedRate,
        quoteReference: acceptedQuote?.referenceNumber || null,
        handoverId: handover?.id || null,
        handoverReference: handover?.referenceNumber || null,
        handoverStatus: handover?.status || 'NOT_INITIATED',
        finalVerifiedWeightKg: verifiedWeight,
        finalPayableAmount: finalPayable,
        transactionReference: transaction?.referenceNumber || null,
        paymentStatus: transaction?.paymentStatus || null,
        paymentMethod: transaction?.paymentMethod || null,
      };
    });

    const isRecycler = viewerRole === ROLES.RECYCLER;
    const collectorUser = batch.collector?.user;

    return {
      id: batch.id,
      referenceNumber: batch.referenceNumber,
      status: batch.status,
      scheduledDate: batch.scheduledDate,
      pickupAddress: batch.pickupAddress,
      latitude: batch.latitude ? Number(batch.latitude) : null,
      longitude: batch.longitude ? Number(batch.longitude) : null,
      locationAvailable: batch.locationAvailable,
      notes: batch.notes,
      cancellationReason: batch.cancellationReason,
      completedAt: batch.completedAt,
      createdAt: batch.createdAt,
      recycler: {
        id: batch.recycler?.id,
        facilityName: batch.recycler?.facilityName,
        facilityAddress: batch.recycler?.facilityAddress,
        city: batch.recycler?.city,
        state: batch.recycler?.state,
      },
      collector: {
        id: batch.collector?.id,
        name: collectorUser?.name || 'Collector',
        phone: isRecycler ? 'Contact hidden per privacy policy' : collectorUser?.phone || null,
        city: batch.collector?.city,
        state: batch.collector?.state,
      },
      lots: formattedLots,
      consolidatedSummary: {
        totalLotsCount: formattedLots.length,
        completedLotsCount,
        totalEstimatedWeightKg: Math.round(totalEstimatedWeightKg * 100) / 100,
        totalVerifiedWeightKg: Math.round(totalVerifiedWeightKg * 100) / 100,
        totalFinalPayableAmount: Math.round(totalFinalPayableAmount * 100) / 100,
        disclaimer: 'Consolidated summary represents the arithmetic sum of independent lot transactions. Each lot maintains its own immutable agreed rate and settlement record.',
      },
    };
  }
}

module.exports = new PickupBatchService();
