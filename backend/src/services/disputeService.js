// EcoSetu Marketplace Dispute Resolution & Return Service
// Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)

const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  ROLES,
  DISPUTE_TYPES,
  DISPUTE_STATUS,
  DISPUTE_RESOLUTION_TYPE,
  MATERIAL_LOT_STATUS,
  HANDOVER_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  QUOTE_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require('../utils/constants');

class DisputeService {
  /**
   * Generate human-readable dispute reference number (DSP-YYYYMM-XXXXX)
   * @returns {string}
   */
  generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `DSP-${year}${month}-${randomHex}`;
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
      if (!user) throw AppError.unauthorized('User not found');
      return user;
    }
    if (!actor.role && actor.id) {
      const user = await prisma.user.findUnique({ where: { id: actor.id } });
      if (!user) throw AppError.unauthorized('User not found');
      return user;
    }
    return actor;
  }

  /**
   * Open a new Marketplace Dispute
   * Server-authoritative ownership derivation & deduplication
   *
   * @param {object|string} actor - Authenticated participant
   * @param {object} data - Dispute payload
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async openDispute(actor, data, ipAddress = null) {
    actor = await this.resolveActor(actor);

    // 1. Fetch Material Lot with related records
    const lot = await prisma.materialLot.findUnique({
      where: { id: data.materialLotId },
      include: {
        collector: { include: { user: true } },
        quotes: {
          where: { status: QUOTE_STATUS.ACCEPTED },
          include: { recycler: { include: { user: true } } },
        },
        handovers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { recycler: { include: { user: true } } },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { recycler: { include: { user: true } } },
        },
      },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    // 2. Identify Counterparties
    const collectorUserId = lot.collector?.userId;
    const acceptedQuote = lot.quotes[0] || null;
    const latestHandover = lot.handovers[0] || null;
    const latestTransaction = lot.transactions[0] || null;

    let recyclerUserId = null;
    if (latestTransaction?.recycler?.userId) {
      recyclerUserId = latestTransaction.recycler.userId;
    } else if (latestHandover?.recycler?.userId) {
      recyclerUserId = latestHandover.recycler.userId;
    } else if (acceptedQuote?.recycler?.userId) {
      recyclerUserId = acceptedQuote.recycler.userId;
    }

    // 3. Strict Authorization & Tenancy Verification
    const isCollector = collectorUserId === actor.id;
    const isRecycler = recyclerUserId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You are not authorized to open a dispute for this material lot');
    }

    // 4. Duplicate active dispute prevention
    const existingActiveDispute = await prisma.marketplaceDispute.findFirst({
      where: {
        materialLotId: lot.id,
        status: {
          in: [
            DISPUTE_STATUS.OPEN,
            DISPUTE_STATUS.UNDER_REVIEW,
            DISPUTE_STATUS.PARTIALLY_RESOLVED,
            DISPUTE_STATUS.RETURN_PENDING,
          ],
        },
      },
    });

    if (existingActiveDispute) {
      throw AppError.badRequest(
        `An active dispute (${existingActiveDispute.disputeReference}) already exists for this lot`
      );
    }

    // 5. Irreversible state check for cancellation requests
    if (data.disputeType === DISPUTE_TYPES.CANCELLATION_REQUEST) {
      if (latestTransaction && latestTransaction.paymentStatus === PAYMENT_STATUS.PAID) {
        throw AppError.badRequest(
          'Cannot casually cancel deal after payment has been recorded as paid. Please submit a PAYMENT_DISPUTE or RETURN_REQUEST.'
        );
      }
    }

    // 6. Server-derive baseline values
    const quoteId = data.quoteId || acceptedQuote?.id || null;
    const handoverId = data.handoverId || latestHandover?.id || null;
    const transactionId = data.transactionId || latestTransaction?.id || null;
    const pickupBatchId = data.pickupBatchId || latestHandover?.batchId || null;

    const estimatedWeightKg = lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : null;
    const finalWeightKg = latestHandover?.handoverWeightKg ? Number(latestHandover.handoverWeightKg) : null;
    const transactionAmount = latestTransaction?.finalSaleValue ? Number(latestTransaction.finalSaleValue) : null;

    const disputeReference = this.generateReferenceNumber();

    // 7. Atomic creation in Database Transaction
    const dispute = await prisma.$transaction(async (tx) => {
      // Create Dispute record
      const created = await tx.marketplaceDispute.create({
        data: {
          disputeReference,
          materialLotId: lot.id,
          quoteId,
          handoverId,
          transactionId,
          pickupBatchId,
          openedByUserId: actor.id,
          openedByRole: actor.role,
          disputeType: data.disputeType,
          description: data.description,
          evidenceUrls: Array.isArray(data.evidenceUrls) ? data.evidenceUrls : [],
          disputedEstimatedWeightKg: data.disputedEstimatedWeightKg != null ? data.disputedEstimatedWeightKg : estimatedWeightKg,
          disputedFinalWeightKg: data.disputedFinalWeightKg != null ? data.disputedFinalWeightKg : finalWeightKg,
          disputedQuantityKg: data.disputedQuantityKg != null ? data.disputedQuantityKg : null,
          disputedAmount: data.disputedAmount != null ? data.disputedAmount : transactionAmount,
          status: DISPUTE_STATUS.OPEN,
        },
      });

      // Append immutable Dispute Event
      await tx.marketplaceDisputeEvent.create({
        data: {
          disputeId: created.id,
          actorUserId: actor.id,
          actorRole: actor.role,
          eventType: 'DISPUTE_OPENED',
          previousStatus: DISPUTE_STATUS.OPEN,
          newStatus: DISPUTE_STATUS.OPEN,
          note: `Dispute opened (${data.disputeType}): ${data.description.substring(0, 150)}`,
          metadata: {
            disputeType: data.disputeType,
            disputedEstimatedWeightKg: created.disputedEstimatedWeightKg,
            disputedFinalWeightKg: created.disputedFinalWeightKg,
            disputedAmount: created.disputedAmount,
          },
        },
      });

      // Update lot status to DISPUTED if not already completed/disputed
      await tx.materialLot.update({
        where: { id: lot.id },
        data: { status: MATERIAL_LOT_STATUS.DISPUTED },
      });

      // If disputeType is HANDOVER_REJECTION and handover exists, mark handover REJECTED
      if (data.disputeType === DISPUTE_TYPES.HANDOVER_REJECTION && handoverId) {
        await tx.handoverRecord.update({
          where: { id: handoverId },
          data: {
            status: HANDOVER_STATUS.REJECTED,
            notes: `Rejected by recycler at handover: ${data.description}`,
          },
        });
      } else if (handoverId && (data.disputeType === DISPUTE_TYPES.WEIGHT_MISMATCH || data.disputeType === DISPUTE_TYPES.HANDOVER_DISPUTE)) {
        await tx.handoverRecord.update({
          where: { id: handoverId },
          data: { status: HANDOVER_STATUS.DISPUTED },
        });
      }

      return created;
    });

    // 8. Audit Log
    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.DISPUTE_OPENED,
      entityType: 'marketplace_disputes',
      entityId: dispute.id,
      details: {
        disputeReference: dispute.disputeReference,
        lotReference: lot.referenceNumber,
        disputeType: dispute.disputeType,
      },
      ipAddress,
    });

    // 9. Send Notification to Counterparty
    const targetUserId = isCollector ? recyclerUserId : collectorUserId;
    if (targetUserId) {
      try {
        await notificationService.createNotification({
          userId: targetUserId,
          type: NOTIFICATION_TYPES.DISPUTE_OPENED,
          title: `Dispute Opened: ${dispute.disputeReference}`,
          message: `${actor.name || 'Counterparty'} reported an issue (${dispute.disputeType.replace('_', ' ')}) on lot ${lot.referenceNumber}.`,
          referenceType: 'marketplace_disputes',
          referenceId: dispute.id,
        });
      } catch (err) {
        logger.warn(`Failed to send dispute notification: ${err.message}`);
      }
    }

    logger.info(`[DisputeService] Dispute ${dispute.disputeReference} opened for lot ${lot.referenceNumber} by user ${actor.id}`);
    return dispute;
  }

  /**
   * Helper: Mask user contact information for counterparty privacy
   */
  maskContactInfo(user) {
    if (!user) return user;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    };
  }

  /**
   * List disputes with strict role-aware tenancy isolation
   *
   * @param {object} actor - Authenticated user
   * @param {object} [filters]
   * @returns {Promise<object>}
   */
  async listDisputes(actor, filters = {}) {
    actor = await this.resolveActor(actor);

    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.disputeType) {
      where.disputeType = filters.disputeType;
    }
    if (filters.lotId) {
      where.materialLotId = filters.lotId;
    }

    // Role-Scoped Tenancy Isolation
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      where.materialLot = {
        collector: { userId: actor.id },
      };
    } else if (actor.role === ROLES.RECYCLER) {
      where.OR = [
        { quote: { recycler: { userId: actor.id } } },
        { handover: { recycler: { userId: actor.id } } },
        { transaction: { recycler: { userId: actor.id } } },
        { pickupBatch: { recycler: { userId: actor.id } } },
      ];
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Unauthorized to list marketplace disputes');
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      prisma.marketplaceDispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materialLot: {
            select: {
              id: true,
              referenceNumber: true,
              category: true,
              subcategory: true,
              approximateTotalWeightKg: true,
              collector: {
                select: {
                  id: true,
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
          quote: {
            select: {
              id: true,
              referenceNumber: true,
              quotedUnitPrice: true,
              quotedTotal: true,
              recycler: {
                select: {
                  id: true,
                  facilityName: true,
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
          handover: {
            select: {
              id: true,
              referenceNumber: true,
              declaredWeightKg: true,
              handoverWeightKg: true,
              status: true,
            },
          },
          transaction: {
            select: {
              id: true,
              referenceNumber: true,
              quantity: true,
              finalSaleValue: true,
              paymentStatus: true,
            },
          },
          openedByUser: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.marketplaceDispute.count({ where }),
    ]);

    return {
      disputes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single dispute details by ID with timeline and privacy masking
   *
   * @param {object} actor - Authenticated participant
   * @param {string} id - Dispute UUID
   * @returns {Promise<object>}
   */
  async getDisputeById(actor, id) {
    actor = await this.resolveActor(actor);

    const dispute = await prisma.marketplaceDispute.findUnique({
      where: { id },
      include: {
        materialLot: {
          include: {
            collector: { include: { user: true } },
          },
        },
        quote: {
          include: {
            recycler: { include: { user: true } },
          },
        },
        handover: {
          include: {
            photos: true,
            recycler: { include: { user: true } },
          },
        },
        transaction: {
          include: {
            recycler: { include: { user: true } },
          },
        },
        pickupBatch: true,
        openedByUser: true,
        resolvedByUser: true,
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            actorUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw AppError.notFound('Dispute record not found');
    }

    // Role-based authorization & tenancy check
    const collectorUserId = dispute.materialLot?.collector?.userId;
    const recyclerUserId =
      dispute.transaction?.recycler?.userId ||
      dispute.handover?.recycler?.userId ||
      dispute.quote?.recycler?.userId ||
      dispute.pickupBatch?.recycler?.userId;

    const isCollector = collectorUserId === actor.id;
    const isRecycler = recyclerUserId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You are not authorized to view this dispute');
    }

    // Scrub contact privacy for counterparty
    if (dispute.materialLot?.collector?.user) {
      dispute.materialLot.collector.user = this.maskContactInfo(dispute.materialLot.collector.user);
    }
    if (dispute.openedByUser) {
      dispute.openedByUser = this.maskContactInfo(dispute.openedByUser);
    }
    if (dispute.resolvedByUser) {
      dispute.resolvedByUser = this.maskContactInfo(dispute.resolvedByUser);
    }

    return dispute;
  }

  /**
   * Respond to dispute / propose counter-solution
   *
   * @param {object} actor - Authenticated user
   * @param {string} disputeId - Dispute UUID
   * @param {object} data - Response payload
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async respondToDispute(actor, disputeId, data, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const dispute = await this.getDisputeById(actor, disputeId);

    if (
      dispute.status === DISPUTE_STATUS.RESOLVED ||
      dispute.status === DISPUTE_STATUS.CANCELLED ||
      dispute.status === DISPUTE_STATUS.RETURNED
    ) {
      throw AppError.badRequest(`Cannot respond to a dispute in status ${dispute.status}`);
    }

    const previousStatus = dispute.status;
    const newStatus = previousStatus === DISPUTE_STATUS.OPEN ? DISPUTE_STATUS.UNDER_REVIEW : previousStatus;

    const updated = await prisma.$transaction(async (tx) => {
      // Update dispute status
      const d = await tx.marketplaceDispute.update({
        where: { id: dispute.id },
        data: {
          status: newStatus,
        },
      });

      // Append dispute event
      await tx.marketplaceDisputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: actor.id,
          actorRole: actor.role,
          eventType: 'DISPUTE_RESPONDED',
          previousStatus,
          newStatus,
          note: data.note,
          metadata: {
            proposedWeightKg: data.proposedWeightKg || null,
            proposedAmount: data.proposedAmount || null,
            proposedAction: data.proposedAction || null,
            acceptedQuantityKg: data.acceptedQuantityKg || null,
            rejectedQuantityKg: data.rejectedQuantityKg || null,
            evidenceUrls: Array.isArray(data.evidenceUrls) ? data.evidenceUrls : [],
          },
        },
      });

      return d;
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.DISPUTE_RESPONDED,
      entityType: 'marketplace_disputes',
      entityId: dispute.id,
      details: {
        disputeReference: dispute.disputeReference,
        note: data.note,
        proposedAction: data.proposedAction,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Resolve a dispute server-authoritatively
   * Recalculates payable amounts using canonical formula: final payable = resolved weight × agreed rate
   *
   * @param {object} actor - Authenticated user
   * @param {string} disputeId - Dispute UUID
   * @param {object} data - Resolution payload
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async resolveDispute(actor, disputeId, data, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const dispute = await this.getDisputeById(actor, disputeId);

    if (dispute.status === DISPUTE_STATUS.RESOLVED || dispute.status === DISPUTE_STATUS.CANCELLED) {
      throw AppError.badRequest('This dispute has already been concluded');
    }

    const { resolutionType, resolutionNotes } = data;
    const agreedRate = Number(
      dispute.transaction?.quotedUnitPrice ||
      dispute.quote?.quotedUnitPrice ||
      0
    );

    let resolvedWeightKg = data.resolvedWeightKg != null ? Number(data.resolvedWeightKg) : null;
    let resolvedAmount = data.resolvedAmount != null ? Number(data.resolvedAmount) : null;
    let acceptedQuantityKg = data.acceptedQuantityKg != null ? Number(data.acceptedQuantityKg) : null;
    let rejectedQuantityKg = data.rejectedQuantityKg != null ? Number(data.rejectedQuantityKg) : null;
    let nextDisputeStatus = DISPUTE_STATUS.RESOLVED;

    // Apply Server-Authoritative Logic per Resolution Type
    if (resolutionType === DISPUTE_RESOLUTION_TYPE.WEIGHT_CORRECTION) {
      if (!resolvedWeightKg || resolvedWeightKg <= 0) {
        throw AppError.badRequest('A positive resolvedWeightKg is required for WEIGHT_CORRECTION');
      }
      // Server-authoritative payable calculation: weight × agreed rate
      resolvedAmount = Number((resolvedWeightKg * agreedRate).toFixed(2));
    } else if (resolutionType === DISPUTE_RESOLUTION_TYPE.PARTIAL_ACCEPTANCE) {
      if (!acceptedQuantityKg || acceptedQuantityKg <= 0) {
        throw AppError.badRequest('acceptedQuantityKg > 0 is required for PARTIAL_ACCEPTANCE');
      }
      resolvedWeightKg = acceptedQuantityKg;
      // Only the accepted portion enters final settlement
      resolvedAmount = Number((acceptedQuantityKg * agreedRate).toFixed(2));

      if (rejectedQuantityKg && rejectedQuantityKg > 0) {
        nextDisputeStatus = DISPUTE_STATUS.PARTIALLY_RESOLVED;
      }
    } else if (resolutionType === DISPUTE_RESOLUTION_TYPE.RETURN_ACCEPTED) {
      nextDisputeStatus = DISPUTE_STATUS.RETURN_PENDING;
    } else if (resolutionType === DISPUTE_RESOLUTION_TYPE.DEAL_CANCELLED) {
      // Check if transaction has already been completed & paid
      if (dispute.transaction?.paymentStatus === PAYMENT_STATUS.PAID) {
        throw AppError.badRequest('Cannot cancel deal after payment has been completed. Use PRICE_ADJUSTMENT or return workflow.');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Dispute record
      const resolved = await tx.marketplaceDispute.update({
        where: { id: dispute.id },
        data: {
          status: nextDisputeStatus,
          resolutionType,
          resolutionNotes,
          resolvedWeightKg,
          resolvedAmount,
          acceptedQuantityKg,
          rejectedQuantityKg,
          resolvedByUserId: actor.id,
          resolvedAt: new Date(),
        },
      });

      // 2. Append Dispute Event
      await tx.marketplaceDisputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: actor.id,
          actorRole: actor.role,
          eventType: 'DISPUTE_RESOLVED',
          previousStatus: dispute.status,
          newStatus: nextDisputeStatus,
          note: `Resolved (${resolutionType}): ${resolutionNotes}`,
          metadata: {
            resolutionType,
            resolvedWeightKg,
            resolvedAmount,
            acceptedQuantityKg,
            rejectedQuantityKg,
          },
        },
      });

      // 3. Update TransactionRecord if Weight/Price corrected
      if (
        (resolutionType === DISPUTE_RESOLUTION_TYPE.WEIGHT_CORRECTION ||
          resolutionType === DISPUTE_RESOLUTION_TYPE.PRICE_ADJUSTMENT ||
          resolutionType === DISPUTE_RESOLUTION_TYPE.PARTIAL_ACCEPTANCE) &&
        dispute.transactionId &&
        resolvedAmount != null
      ) {
        const currentTxn = await tx.transactionRecord.findUnique({
          where: { id: dispute.transactionId },
        });

        if (currentTxn) {
          const oldSaleValue = Number(currentTxn.finalSaleValue);
          const newAmountDue = Math.max(0, Number((resolvedAmount - Number(currentTxn.amountPaid)).toFixed(2)));
          const newPaymentStatus =
            newAmountDue === 0 && Number(currentTxn.amountPaid) >= resolvedAmount
              ? PAYMENT_STATUS.PAID
              : Number(currentTxn.amountPaid) > 0
              ? PAYMENT_STATUS.PARTIALLY_PAID
              : PAYMENT_STATUS.PENDING;

          await tx.transactionRecord.update({
            where: { id: dispute.transactionId },
            data: {
              quantity: resolvedWeightKg != null ? resolvedWeightKg : currentTxn.quantity,
              finalSaleValue: resolvedAmount,
              amountDue: newAmountDue,
              paymentStatus: newPaymentStatus,
              notes: currentTxn.notes
                ? `${currentTxn.notes}\n[Dispute ${dispute.disputeReference} resolved: adjusted from ₹${oldSaleValue} to ₹${resolvedAmount}]`
                : `[Dispute ${dispute.disputeReference} resolved: adjusted from ₹${oldSaleValue} to ₹${resolvedAmount}]`,
            },
          });
        }
      }

      // 4. Update Handover if weight corrected
      if (dispute.handoverId && resolvedWeightKg != null) {
        await tx.handoverRecord.update({
          where: { id: dispute.handoverId },
          data: {
            handoverWeightKg: resolvedWeightKg,
            status: HANDOVER_STATUS.CONFIRMED,
          },
        });
      }

      // 5. Update MaterialLot Status
      let finalLotStatus = MATERIAL_LOT_STATUS.COMPLETED;
      if (resolutionType === DISPUTE_RESOLUTION_TYPE.DEAL_CANCELLED) {
        finalLotStatus = MATERIAL_LOT_STATUS.OPEN;
      } else if (nextDisputeStatus === DISPUTE_STATUS.RETURN_PENDING) {
        finalLotStatus = MATERIAL_LOT_STATUS.DISPUTED;
      }

      await tx.materialLot.update({
        where: { id: dispute.materialLotId },
        data: { status: finalLotStatus },
      });

      return resolved;
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.DISPUTE_RESOLVED,
      entityType: 'marketplace_disputes',
      entityId: dispute.id,
      details: {
        disputeReference: dispute.disputeReference,
        resolutionType,
        resolvedWeightKg,
        resolvedAmount,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Cancel dispute or pre-handover deal
   *
   * @param {object} actor - Authenticated user
   * @param {string} disputeId - Dispute UUID
   * @param {string} reason - Cancellation reason
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async cancelDispute(actor, disputeId, reason, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const dispute = await this.getDisputeById(actor, disputeId);

    if (dispute.status === DISPUTE_STATUS.RESOLVED || dispute.status === DISPUTE_STATUS.CANCELLED) {
      throw AppError.badRequest('Dispute is already closed');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.marketplaceDispute.update({
        where: { id: dispute.id },
        data: {
          status: DISPUTE_STATUS.CANCELLED,
          resolutionNotes: `Cancelled by user: ${reason}`,
          resolvedAt: new Date(),
          resolvedByUserId: actor.id,
        },
      });

      await tx.marketplaceDisputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: actor.id,
          actorRole: actor.role,
          eventType: 'DISPUTE_CANCELLED',
          previousStatus: dispute.status,
          newStatus: DISPUTE_STATUS.CANCELLED,
          note: `Dispute cancelled: ${reason}`,
        },
      });

      // Restore lot status based on whether a transaction exists
      const lotStatus = dispute.transactionId ? MATERIAL_LOT_STATUS.COMPLETED : MATERIAL_LOT_STATUS.ACCEPTED;
      await tx.materialLot.update({
        where: { id: dispute.materialLotId },
        data: { status: lotStatus },
      });

      return d;
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.DISPUTE_CANCELLED,
      entityType: 'marketplace_disputes',
      entityId: dispute.id,
      details: { disputeReference: dispute.disputeReference, reason },
      ipAddress,
    });

    return updated;
  }

  /**
   * Initiate physical return workflow
   *
   * @param {object} actor - Authenticated user
   * @param {string} disputeId - Dispute UUID
   * @param {object} data - Return metadata
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async initiateReturn(actor, disputeId, data, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const dispute = await this.getDisputeById(actor, disputeId);

    if (dispute.status === DISPUTE_STATUS.RETURNED || dispute.status === DISPUTE_STATUS.CANCELLED) {
      throw AppError.badRequest(`Cannot initiate return on dispute in status ${dispute.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.marketplaceDispute.update({
        where: { id: dispute.id },
        data: {
          status: DISPUTE_STATUS.RETURN_PENDING,
          returnTrackingNotes: data.returnTrackingNotes || 'Return initiated by participant',
          rejectedQuantityKg: data.quantityKg != null ? data.quantityKg : dispute.rejectedQuantityKg,
        },
      });

      await tx.marketplaceDisputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: actor.id,
          actorRole: actor.role,
          eventType: 'RETURN_REQUESTED',
          previousStatus: dispute.status,
          newStatus: DISPUTE_STATUS.RETURN_PENDING,
          note: data.returnTrackingNotes || 'Return requested for rejected material',
          metadata: { quantityKg: data.quantityKg },
        },
      });

      await tx.materialLot.update({
        where: { id: dispute.materialLotId },
        data: { status: MATERIAL_LOT_STATUS.DISPUTED },
      });

      return d;
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.RETURN_REQUESTED,
      entityType: 'marketplace_disputes',
      entityId: dispute.id,
      details: { disputeReference: dispute.disputeReference },
      ipAddress,
    });

    return updated;
  }

  /**
   * Record return as completed
   * Server confirmation of physical return
   *
   * @param {object} actor - Authenticated user
   * @param {string} disputeId - Dispute UUID
   * @param {object} data - Completion notes
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async completeReturn(actor, disputeId, data, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const dispute = await this.getDisputeById(actor, disputeId);

    if (dispute.status === DISPUTE_STATUS.RETURNED) {
      throw AppError.badRequest('Return has already been recorded as completed');
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.marketplaceDispute.update({
        where: { id: dispute.id },
        data: {
          status: DISPUTE_STATUS.RETURNED,
          returnedAt: now,
          returnTrackingNotes: data.completionNotes
            ? `${dispute.returnTrackingNotes || ''}\nReturn completed: ${data.completionNotes}`
            : dispute.returnTrackingNotes,
        },
      });

      await tx.marketplaceDisputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorUserId: actor.id,
          actorRole: actor.role,
          eventType: 'RETURN_COMPLETED',
          previousStatus: dispute.status,
          newStatus: DISPUTE_STATUS.RETURNED,
          note: data.completionNotes || 'Return recorded as completed',
          metadata: { returnedAt: now },
        },
      });

      // Update lot status to RETURNED
      await tx.materialLot.update({
        where: { id: dispute.materialLotId },
        data: { status: MATERIAL_LOT_STATUS.RETURNED },
      });

      return d;
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.RETURN_COMPLETED,
      entityType: 'marketplace_disputes',
      entityId: dispute.id,
      details: { disputeReference: dispute.disputeReference, returnedAt: now },
      ipAddress,
    });

    return updated;
  }
}

module.exports = new DisputeService();
