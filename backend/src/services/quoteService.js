// EcoSetu Quote Service
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10

const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const priceService = require('./priceService');
const { ROLES, QUOTE_STATUS } = require('../utils/constants');

class QuoteService {
  /**
   * Generate human-readable quote reference number (e.g., QTE-202609-A7B3X)
   * @returns {string}
   */
  generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `QTE-${year}${month}-${randomHex}`;
  }

  /**
   * Helper: Get recycler profile or throw
   * @param {string} userId - User UUID
   * @returns {Promise<object>}
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
   * Recycler creates a quote for a matched material lot
   * @param {object} user - Authenticated actor
   * @param {object} quoteData - Payload
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async createQuote(user, quoteData, ipAddress = null) {
    let recyclerProfile;

    if (user.role === ROLES.RECYCLER) {
      recyclerProfile = await this.getRecyclerProfileOrThrow(user.id);
      // Verify authorization status
      if (
        recyclerProfile.user?.status !== 'ACTIVE' ||
        recyclerProfile.isActive === false ||
        !['AUTHORIZED', 'PROVISIONAL'].includes(recyclerProfile.authorizationStatus)
      ) {
        throw AppError.forbidden('Only verified and authorized recyclers can issue quotes');
      }
    } else if (user.role === ROLES.ADMIN) {

      if (!quoteData.recyclerId) {
        throw AppError.badRequest('recyclerId is required when Admin creates a quote');
      }
      recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { id: quoteData.recyclerId },
        include: { user: true },
      });
      if (!recyclerProfile) {
        throw AppError.notFound('Target recycler profile not found');
      }
      if (
        recyclerProfile.user?.status !== 'ACTIVE' ||
        recyclerProfile.isActive === false ||
        !['AUTHORIZED', 'PROVISIONAL'].includes(recyclerProfile.authorizationStatus)
      ) {
        throw AppError.badRequest('Target recycler facility is not active and authorized');
      }
    } else {
      throw AppError.forbidden('Only authorized recyclers and administrators can create quotes');
    }

    // Retrieve material lot
    const lot = await prisma.materialLot.findUnique({
      where: { id: quoteData.materialLotId },
      include: {
        collector: { include: { user: true } },
      },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    // Lot status validation
    if (lot.status === 'DRAFT') {
      throw AppError.badRequest('Cannot create a quote for a draft material lot');
    }
    if (['ACCEPTED', 'HANDOVER_PENDING', 'COMPLETED'].includes(lot.status)) {
      throw AppError.badRequest(`Cannot create quote: Material lot is already in status ${lot.status}`);
    }

    // Material category compatibility check
    if (!recyclerProfile.acceptedCategories || !recyclerProfile.acceptedCategories.includes(lot.category)) {
      throw AppError.badRequest(`Recycler does not accept material category ${lot.category}`);
    }

    // Check if recycler already has an active quote for this lot
    const existingActiveQuote = await prisma.quote.findFirst({
      where: {
        materialLotId: lot.id,
        recyclerId: recyclerProfile.id,
        status: { in: [QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED] },
        validUntil: { gt: new Date() },
      },
    });

    if (existingActiveQuote) {
      throw AppError.badRequest('You already have an active quote for this material lot');
    }

    // Validate and compute quantities
    const unitPrice = Number(quoteData.quotedUnitPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw AppError.badRequest('Quoted unit price must be strictly positive');
    }

    let quantity = quoteData.quotedQuantity ? Number(quoteData.quotedQuantity) : null;
    if (!quantity && lot.approximateTotalWeightKg) {
      quantity = Number(lot.approximateTotalWeightKg);
    }
    if (!quantity || quantity <= 0) {
      quantity = 1;
    }

    const quotedTotal = Math.round(unitPrice * quantity * 100) / 100;
    const referenceNumber = this.generateReferenceNumber();

    // Atomic creation
    const createdQuote = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          referenceNumber,
          materialLotId: lot.id,
          recyclerId: recyclerProfile.id,
          category: lot.category,
          subcategory: lot.subcategory || null,
          quotedUnitPrice: unitPrice,
          unit: quoteData.unit || 'PER_KG',
          currency: quoteData.currency || 'INR',
          quotedQuantity: quantity,
          quotedTotal,
          status: QUOTE_STATUS.SENT,
          validFrom: new Date(),
          validUntil: quoteData.validUntil
            ? new Date(quoteData.validUntil)
            : new Date(Date.now() + (Number(quoteData.validDays) || 7) * 86400000),
          notes: quoteData.notes || null,
          createdById: user.id,
        },
        include: {
          materialLot: true,
          recycler: {
            select: {
              id: true,
              facilityName: true,
              authorizationStatus: true,
              city: true,
              state: true,
            },
          },
        },
      });

      // Update lot status to QUOTED if currently OPEN
      if (lot.status === 'OPEN') {
        await tx.materialLot.update({
          where: { id: lot.id },
          data: { status: 'QUOTED' },
        });
      }

      // Log audit
      await auditService.logAction(
        {
          actorId: user.id,
          action: 'QUOTE_CREATED',
          entityType: 'quotes',
          entityId: quote.id,
          details: {
            referenceNumber,
            lotId: lot.id,
            recyclerId: recyclerProfile.id,
            quotedUnitPrice: unitPrice,
            quotedTotal,
          },
          ipAddress,
        },
        tx
      );

      return quote;
    });

    // Send resilient notification to collector
    try {
      if (lot.collector?.userId) {
        await notificationService.createNotification({
          userId: lot.collector.userId,
          type: 'QUOTE_RECEIVED',
          title: 'New Recycler Quote Received',
          message: `Recycler ${recyclerProfile.facilityName} offered ₹${unitPrice}/${quoteData.unit || 'kg'} for lot ${lot.referenceNumber}`,
          referenceType: 'quotes',
          referenceId: createdQuote.id,
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch quote notification: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Quote ${referenceNumber} created for lot ${lot.referenceNumber} by recycler ${recyclerProfile.facilityName}`);
    return createdQuote;
  }

  /**
   * Get all quotes for a specific material lot (Collector or Admin)
   * @param {object} user - Authenticated actor
   * @param {string} lotId - Material lot UUID
   * @param {object} [query] - Filters and pagination
   * @returns {Promise<object>}
   */
  async getQuotesForLot(user, lotId, query = {}) {
    const lot = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: {
        collector: true,
      },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    // Role-based tenancy isolation
    if (user.role === ROLES.INFORMAL_COLLECTOR) {
      if (lot.collector.userId !== user.id) {
        throw AppError.forbidden('You can only view quotes for your own material lots');
      }
    } else if (user.role === ROLES.RECYCLER) {
      // Recyclers can only see their own quote for this lot
      const profile = await prisma.recyclerProfile.findUnique({ where: { userId: user.id } });
      if (!profile) throw AppError.forbidden('Recycler profile not found');
      query.recyclerId = profile.id;
    } else if (user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Unauthorized to view quotes');
    }

    const where = { materialLotId: lotId };
    if (query.recyclerId) {
      where.recyclerId = query.recyclerId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        recycler: {
          select: {
            id: true,
            facilityName: true,
            authorizationStatus: true,
            city: true,
            state: true,
            pickupAvailable: true,
            user: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    // Check expiry dynamically
    const now = new Date();
    const evaluatedQuotes = quotes.map((q) => {
      let currentStatus = q.status;
      if ([QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED].includes(q.status) && new Date(q.validUntil) < now) {
        currentStatus = QUOTE_STATUS.EXPIRED;
      }
      return {
        ...q,
        status: currentStatus,
        isExpired: new Date(q.validUntil) < now,
      };
    });

    // Fetch benchmark estimate for side-by-side comparison
    let benchmarkEstimate = null;
    try {
      if (lot.approximateTotalWeightKg) {
        benchmarkEstimate = await priceService.calculateEstimate({
          category: lot.category,
          subcategory: lot.subcategory,
          weightKg: Number(lot.approximateTotalWeightKg),
          location: lot.collector.city || 'ALL',
        });
      }
    } catch (estErr) {
      logger.warn(`Could not compute benchmark estimate for quote view: ${estErr.message}`);
    }

    return {
      lotId: lot.id,
      lotReference: lot.referenceNumber,
      lotStatus: lot.status,
      category: lot.category,
      subcategory: lot.subcategory,
      weightKg: lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : null,
      benchmarkEstimate,
      quotes: evaluatedQuotes,
      totalQuotes: evaluatedQuotes.length,
    };
  }

  /**
   * Get single quote details by ID
   * @param {object} user - Authenticated actor
   * @param {string} quoteId - Quote UUID
   * @returns {Promise<object>}
   */
  async getQuoteById(user, quoteId) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        materialLot: {
          include: {
            collector: { include: { user: true } },
          },
        },
        recycler: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!quote) {
      throw AppError.notFound('Quote not found');
    }

    // Authorization check
    const isCollectorOwner = quote.materialLot.collector.userId === user.id;
    const isRecyclerOwner = quote.recycler.userId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCollectorOwner && !isRecyclerOwner && !isAdmin) {
      throw AppError.forbidden('You do not have permission to view this quote');
    }

    // If collector opens quote for first time while SENT, mark as VIEWED
    if (isCollectorOwner && quote.status === QUOTE_STATUS.SENT) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: QUOTE_STATUS.VIEWED,
          viewedAt: new Date(),
        },
      });
      quote.status = QUOTE_STATUS.VIEWED;
      quote.viewedAt = new Date();

      auditService.logAction({
        actorId: user.id,
        action: 'QUOTE_VIEWED',
        entityType: 'quotes',
        entityId: quote.id,
        details: { referenceNumber: quote.referenceNumber },
      });
    }

    return quote;
  }

  /**
   * Collector accepts a quote
   * @param {object} user - Authenticated collector
   * @param {string} quoteId - Quote UUID
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async acceptQuote(user, quoteId, ipAddress = null) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        materialLot: {
          include: {
            collector: true,
          },
        },
        recycler: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!quote) {
      throw AppError.notFound('Quote not found');
    }

    // Collector ownership check
    if (quote.materialLot.collector.userId !== user.id) {
      throw AppError.forbidden('You can only accept quotes for your own material lots');
    }

    // Status pre-acceptance check
    if (![QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED].includes(quote.status)) {
      throw AppError.badRequest(`Cannot accept quote with status ${quote.status}`);
    }

    // Server-authoritative expiry check
    if (new Date() > new Date(quote.validUntil)) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: QUOTE_STATUS.EXPIRED },
      });
      throw AppError.badRequest('This quote has expired and can no longer be accepted');
    }

    // Verify recycler remains eligible
    if (
      quote.recycler.user?.status !== 'ACTIVE' ||
      quote.recycler.isActive === false ||
      !['AUTHORIZED', 'PROVISIONAL'].includes(quote.recycler.authorizationStatus)
    ) {
      throw AppError.badRequest('The quoting recycler is no longer authorized or verified');
    }


    // Execute atomic acceptance & competing quote cancellation
    const acceptedQuote = await prisma.$transaction(async (tx) => {
      // 1. Mark accepted quote
      const updated = await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: QUOTE_STATUS.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // 2. Automatically cancel all competing open quotes for this lot
      const competingCancel = await tx.quote.updateMany({
        where: {
          materialLotId: quote.materialLotId,
          id: { not: quote.id },
          status: { in: [QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED] },
        },
        data: {
          status: QUOTE_STATUS.CANCELLED,
          cancellationReason: 'COMPETING_QUOTE_ACCEPTED',
        },
      });

      // 3. Mark MaterialLot status as ACCEPTED
      await tx.materialLot.update({
        where: { id: quote.materialLotId },
        data: { status: 'ACCEPTED' },
      });

      // 4. Log audit records
      await auditService.logAction(
        {
          actorId: user.id,
          action: 'QUOTE_ACCEPTED',
          entityType: 'quotes',
          entityId: quote.id,
          details: {
            referenceNumber: quote.referenceNumber,
            materialLotId: quote.materialLotId,
            recyclerId: quote.recyclerId,
            quotedTotal: Number(quote.quotedTotal),
            competingCancelledCount: competingCancel.count,
          },
          ipAddress,
        },
        tx
      );

      return updated;
    });

    // Notify winning recycler
    try {
      await notificationService.createNotification({
        userId: quote.recycler.userId,
        type: 'QUOTE_ACCEPTED',
        title: 'Quote Accepted by Collector!',
        message: `Collector accepted your quote ${quote.referenceNumber} for lot ${quote.materialLot.referenceNumber}`,
        referenceType: 'quotes',
        referenceId: quote.id,
      });
    } catch (notifErr) {
      logger.warn(`Failed to notify recycler of quote acceptance: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Quote ${quote.referenceNumber} ACCEPTED by collector ${user.id}. Competing quotes cancelled.`);
    return acceptedQuote;
  }

  /**
   * Collector rejects a quote
   * @param {object} user - Authenticated collector
   * @param {string} quoteId - Quote UUID
   * @param {string} [reason] - Rejection reason
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async rejectQuote(user, quoteId, reason = null, ipAddress = null) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        materialLot: {
          include: {
            collector: true,
          },
        },
        recycler: true,
      },
    });

    if (!quote) {
      throw AppError.notFound('Quote not found');
    }

    if (quote.materialLot.collector.userId !== user.id) {
      throw AppError.forbidden('You can only reject quotes for your own material lots');
    }

    if (![QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED].includes(quote.status)) {
      throw AppError.badRequest(`Cannot reject quote with status ${quote.status}`);
    }

    const rejectionReasonText = reason || 'REJECTED_BY_COLLECTOR';

    const rejectedQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QUOTE_STATUS.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: rejectionReasonText,
      },
    });

    await auditService.logAction({
      actorId: user.id,
      action: 'QUOTE_REJECTED',
      entityType: 'quotes',
      entityId: quote.id,
      details: {
        referenceNumber: quote.referenceNumber,
        materialLotId: quote.materialLotId,
        rejectionReason: rejectionReasonText,
      },
      ipAddress,
    });

    try {
      await notificationService.createNotification({
        userId: quote.recycler.userId,
        type: 'QUOTE_REJECTED',
        title: 'Quote Declined',
        message: `Collector declined your quote ${quote.referenceNumber}`,
        referenceType: 'quotes',
        referenceId: quote.id,
      });
    } catch (notifErr) {
      logger.warn(`Failed to notify recycler of rejection: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Quote ${quote.referenceNumber} REJECTED by collector. Reason: ${rejectionReasonText}`);
    return rejectedQuote;
  }

  /**
   * Recycler cancels their own open quote
   * @param {object} user - Authenticated recycler
   * @param {string} quoteId - Quote UUID
   * @param {string} [reason]
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async cancelQuote(user, quoteId, reason = null, ipAddress = null) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { recycler: true },
    });

    if (!quote) {
      throw AppError.notFound('Quote not found');
    }

    if (user.role === ROLES.RECYCLER && quote.recycler.userId !== user.id) {
      throw AppError.forbidden('You can only cancel your own quotes');
    }

    if (![QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED].includes(quote.status)) {
      throw AppError.badRequest(`Cannot cancel quote with status ${quote.status}`);
    }

    const cancellationReasonText = reason || 'CANCELLED_BY_RECYCLER';

    const cancelledQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QUOTE_STATUS.CANCELLED,
        cancellationReason: cancellationReasonText,
      },
    });

    await auditService.logAction({
      actorId: user.id,
      action: 'QUOTE_CANCELLED',
      entityType: 'quotes',
      entityId: quote.id,
      details: {
        referenceNumber: quote.referenceNumber,
        cancellationReason: cancellationReasonText,
      },
      ipAddress,
    });

    return cancelledQuote;
  }

  /**
   * Recycler lists their own historical and active quotes
   * @param {object} user - Authenticated recycler
   * @param {object} [query] - Filters and pagination
   * @returns {Promise<object>}
   */
  async getRecyclerQuotes(user, query = {}) {
    const profile = await this.getRecyclerProfileOrThrow(user.id);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { recyclerId: profile.id };
    if (query.status) {
      where.status = query.status;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
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
              status: true,
            },
          },
        },
      }),
      prisma.quote.count({ where }),
    ]);

    return {
      quotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new QuoteService();
