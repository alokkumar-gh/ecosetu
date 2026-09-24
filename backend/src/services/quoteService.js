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
   * Helper: Parse structured negotiation timeline from quote notes and lifecycle timestamps
   * @param {object} quote
   * @returns {Array<object>}
   */
  parseNegotiationTimeline(quote) {
    const events = [];
    if (!quote) return events;

    const unit = quote.unit === 'PER_KG' ? 'kg' : (quote.unit || 'item');

    let initialEventAdded = false;
    if (quote.notes) {
      const lines = quote.notes.split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^\[(Collector|Recycler|Citizen|Admin)\s+(?:Offer|Counter)\s+@\s+₹([\d.]+)\/([a-zA-Z_]+)(?::\s*([^()]*?))?\s*(?:\(([^)]+)\))?\]$/);
        if (match) {
          const actor = match[1];
          const rate = parseFloat(match[2]);
          const matchedUnit = match[3] === 'PER_KG' ? 'kg' : match[3];
          const noteText = match[4] ? match[4].trim() : null;
          const timeStr = match[5] ? match[5].trim() : quote.createdAt;

          const isInitial = index === 0 && (line.includes('Offer') || actor === 'Recycler' || actor === 'Citizen');
          if (isInitial && !initialEventAdded) {
            initialEventAdded = true;
            events.push({
              id: `${quote.id}-initial`,
              actor: actor === 'Citizen' ? 'Citizen' : 'Recycler',
              actorName: actor === 'Citizen' ? (quote.buyerUser?.name || 'Citizen') : (quote.recycler?.facilityName || 'Recycler'),
              actionType: 'INITIAL_OFFER',
              rate,
              unit: matchedUnit,
              quantity: quote.quotedQuantity ? Number(quote.quotedQuantity) : null,
              total: quote.quotedQuantity ? Math.round(rate * Number(quote.quotedQuantity) * 100) / 100 : null,
              timestamp: timeStr,
              notes: noteText,
              status: quote.status,
            });
          } else {
            events.push({
              id: `${quote.id}-counter-${index}`,
              actor,
              actorName: actor === 'Collector' ? 'Collector' : (actor === 'Citizen' ? (quote.buyerUser?.name || 'Citizen') : (quote.recycler?.facilityName || 'Recycler')),
              actionType: actor === 'Collector' ? 'COLLECTOR_COUNTER' : (actor === 'Citizen' ? 'CITIZEN_REVISION' : 'RECYCLER_REVISION'),
              rate,
              unit: matchedUnit,
              quantity: quote.quotedQuantity ? Number(quote.quotedQuantity) : null,
              total: quote.quotedQuantity ? Math.round(rate * Number(quote.quotedQuantity) * 100) / 100 : null,
              timestamp: timeStr,
              notes: noteText,
              status: 'SENT',
            });
          }
        }
      });
    }

    if (!initialEventAdded) {
      const initialActor = quote.isConsumerOffer ? 'Citizen' : 'Recycler';
      const initialActorName = quote.isConsumerOffer ? (quote.buyerUser?.name || 'Citizen') : (quote.recycler?.facilityName || 'Recycler');
      events.unshift({
        id: `${quote.id}-initial`,
        actor: initialActor,
        actorName: initialActorName,
        actionType: 'INITIAL_OFFER',
        rate: Number(quote.quotedUnitPrice),
        unit,
        quantity: quote.quotedQuantity ? Number(quote.quotedQuantity) : null,
        total: quote.quotedTotal ? Number(quote.quotedTotal) : null,
        timestamp: quote.createdAt,
        notes: quote.notes ? quote.notes.split('\n')[0] : null,
        status: quote.status,
      });
    }

    // 3. Final outcome event if decided
    if (quote.status === 'ACCEPTED') {
      events.push({
        id: `${quote.id}-accepted`,
        actor: 'Collector',
        actorName: 'Collector',
        actionType: 'ACCEPTED',
        rate: Number(quote.quotedUnitPrice),
        unit,
        total: quote.quotedTotal ? Number(quote.quotedTotal) : null,
        timestamp: quote.acceptedAt || quote.updatedAt,
        status: 'ACCEPTED',
      });
    } else if (quote.status === 'REJECTED') {
      events.push({
        id: `${quote.id}-rejected`,
        actor: 'Collector',
        actorName: 'Collector',
        actionType: 'REJECTED',
        notes: quote.rejectionReason,
        timestamp: quote.rejectedAt || quote.updatedAt,
        status: 'REJECTED',
      });
    } else if (quote.status === 'CANCELLED') {
      events.push({
        id: `${quote.id}-cancelled`,
        actor: 'System',
        actorName: 'Platform',
        actionType: 'CANCELLED',
        notes: quote.cancellationReason === 'COMPETING_QUOTE_ACCEPTED' ? 'Another competing quote was accepted' : quote.cancellationReason,
        timestamp: quote.updatedAt,
        status: 'CANCELLED',
      });
    }

    return events;
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
    let recyclerProfile = null;
    const isCitizen = user.role === ROLES.CITIZEN;

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
    } else if (user.role === ROLES.CITIZEN) {
      // Citizens are direct consumers placing purchase offers
    } else if (user.role === ROLES.ADMIN) {
      if (quoteData.recyclerId) {
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
      }
    } else {
      throw AppError.forbidden('Only authorized recyclers, citizens, and administrators can create quotes');
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

    // Role-specific lot listing purpose validation
    if (isCitizen) {
      if (!['REUSE', 'REPAIR_REUSE'].includes(lot.listingPurpose)) {
        throw AppError.badRequest('Citizens can only make purchase offers on items listed for reuse or repair');
      }
      // Check if citizen already has an active quote for this lot
      const existingCitizenQuote = await prisma.quote.findFirst({
        where: {
          materialLotId: lot.id,
          buyerUserId: user.id,
          status: { in: [QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED] },
          validUntil: { gt: new Date() },
        },
      });
      if (existingCitizenQuote) {
        throw AppError.badRequest('You already have an active purchase offer for this item');
      }
    } else if (user.role === ROLES.RECYCLER) {
      // Material category compatibility check for recyclers
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

    const unitLabel = isCitizen ? (quoteData.unit || 'item') : ((quoteData.unit || 'PER_KG') === 'PER_KG' ? 'kg' : (quoteData.unit || 'kg'));
    const actorName = isCitizen ? 'Citizen' : 'Recycler';
    const formattedInitialNotes = `[${actorName} Offer @ ₹${unitPrice}/${unitLabel}${quoteData.notes ? `: ${quoteData.notes}` : ''} (${new Date().toISOString()})]`;

    // Atomic creation
    const createdQuote = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          referenceNumber,
          materialLotId: lot.id,
          recyclerId: recyclerProfile ? recyclerProfile.id : null,
          buyerUserId: isCitizen ? user.id : null,
          buyerRole: isCitizen ? ROLES.CITIZEN : (user.role === ROLES.RECYCLER ? ROLES.RECYCLER : null),
          isConsumerOffer: isCitizen,
          category: lot.category,
          subcategory: lot.subcategory || null,
          quotedUnitPrice: unitPrice,
          unit: ['PER_UNIT', 'item', 'ITEM'].includes(quoteData.unit)
            ? 'PER_UNIT'
            : ['PER_LOT', 'TOTAL', 'total'].includes(quoteData.unit)
            ? 'PER_LOT'
            : isCitizen
            ? 'PER_LOT'
            : 'PER_KG',
          currency: quoteData.currency || 'INR',
          quotedQuantity: quantity,
          quotedTotal,
          status: QUOTE_STATUS.SENT,
          validFrom: new Date(),
          validUntil: quoteData.validUntil
            ? new Date(quoteData.validUntil)
            : new Date(Date.now() + (Number(quoteData.validDays) || 7) * 86400000),
          notes: formattedInitialNotes,
          createdById: user.id,
        },
        include: {
          materialLot: true,
          buyerUser: {
            select: {
              id: true,
              name: true,
            },
          },
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
          action: isCitizen ? 'CITIZEN_PURCHASE_OFFER_CREATED' : 'QUOTE_CREATED',
          entityType: 'quotes',
          entityId: quote.id,
          details: {
            referenceNumber,
            lotId: lot.id,
            buyerUserId: isCitizen ? user.id : null,
            recyclerId: recyclerProfile ? recyclerProfile.id : null,
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
        const notifTitle = isCitizen ? 'New Citizen Purchase Offer Received' : 'New Recycler Quote Received';
        const senderName = isCitizen ? (user.name || 'A Citizen') : (recyclerProfile?.facilityName || 'Recycler');
        const notifMessage = `${senderName} offered ₹${unitPrice}/${unitLabel} for ${lot.subcategory || lot.category} (${lot.referenceNumber})`;

        await notificationService.createNotification({
          userId: lot.collector.userId,
          type: isCitizen ? 'CITIZEN_OFFER_RECEIVED' : 'QUOTE_RECEIVED',
          title: notifTitle,
          message: notifMessage,
          referenceType: 'quotes',
          referenceId: createdQuote.id,
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch quote notification: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Offer ${referenceNumber} created for lot ${lot.referenceNumber} by ${isCitizen ? 'citizen ' + user.id : 'recycler ' + recyclerProfile?.facilityName}`);
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
        buyerUser: {
          select: {
            id: true,
            name: true,
          },
        },
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
        negotiationTimeline: this.parseNegotiationTimeline(q),
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
            photos: true,
          },
        },
        buyerUser: {
          select: {
            id: true,
            name: true,
            phone: true,
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
    const isRecyclerOwner = quote.recycler && quote.recycler.userId === user.id;
    const isCitizenOwner = quote.buyerUserId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCollectorOwner && !isRecyclerOwner && !isCitizenOwner && !isAdmin) {
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

    return {
      ...quote,
      negotiationTimeline: this.parseNegotiationTimeline(quote),
    };
  }

  /**
   * Collector accepts a quote or citizen purchase offer
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
        buyerUser: true,
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

    // Authorization check: Collector or Citizen Buyer (for consumer offer)
    const isCollectorOwner = quote.materialLot?.collector?.userId === user.id;
    const isCitizenBuyer = quote.isConsumerOffer && quote.buyerUserId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCollectorOwner && !isCitizenBuyer && !isAdmin) {
      throw AppError.forbidden('You are not authorized to accept this quote / offer');
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

    // Verify recycler remains eligible (if recycler quote)
    if (!quote.isConsumerOffer && quote.recycler) {
      if (
        quote.recycler.user?.status !== 'ACTIVE' ||
        quote.recycler.isActive === false ||
        !['AUTHORIZED', 'PROVISIONAL'].includes(quote.recycler.authorizationStatus)
      ) {
        throw AppError.badRequest('The quoting recycler is no longer authorized or verified');
      }
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
          action: quote.isConsumerOffer ? 'CITIZEN_PURCHASE_OFFER_ACCEPTED' : 'QUOTE_ACCEPTED',
          entityType: 'quotes',
          entityId: quote.id,
          details: {
            referenceNumber: quote.referenceNumber,
            materialLotId: quote.materialLotId,
            buyerUserId: quote.buyerUserId,
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

    // Notify winning buyer (Citizen or Recycler)
    try {
      const winnerUserId = quote.isConsumerOffer ? quote.buyerUserId : quote.recycler?.userId;
      if (winnerUserId) {
        await notificationService.createNotification({
          userId: winnerUserId,
          type: 'QUOTE_ACCEPTED',
          title: quote.isConsumerOffer ? 'Purchase Offer Accepted by Collector!' : 'Quote Accepted by Collector!',
          message: `Collector accepted your offer ${quote.referenceNumber} for ${quote.materialLot.referenceNumber}`,
          referenceType: 'quotes',
          referenceId: quote.id,
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to notify winner of quote acceptance: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Quote ${quote.referenceNumber} ACCEPTED by collector ${user.id}. Competing quotes cancelled.`);
    return acceptedQuote;
  }

  /**
   * Collector rejects a quote or citizen purchase offer
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
        buyerUser: true,
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
      const recipientUserId = quote.isConsumerOffer ? quote.buyerUserId : quote.recycler?.userId;
      if (recipientUserId) {
        await notificationService.createNotification({
          userId: recipientUserId,
          type: 'QUOTE_REJECTED',
          title: 'Offer Declined',
          message: `Collector declined your offer ${quote.referenceNumber}`,
          referenceType: 'quotes',
          referenceId: quote.id,
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to notify recipient of rejection: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Quote ${quote.referenceNumber} REJECTED by collector. Reason: ${rejectionReasonText}`);
    return rejectedQuote;
  }

  /**
   * Propose a counter-offer or revision on an active quote (Collector, Recycler, or Citizen)
   * @param {object} user - Authenticated actor (Collector, Recycler, or Citizen)
   * @param {string} quoteId - Quote UUID
   * @param {object} counterData - { counterUnitPrice, notes }
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async counterQuote(user, quoteId, counterData, ipAddress = null) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        materialLot: {
          include: {
            collector: { include: { user: true } },
          },
        },
        buyerUser: true,
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

    const isCollector = quote.materialLot.collector.userId === user.id;
    const isRecycler = quote.recycler && quote.recycler.userId === user.id;
    const isCitizen = quote.buyerUserId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isCitizen && !isAdmin) {
      throw AppError.forbidden('You do not have permission to negotiate this quote');
    }

    if (![QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED].includes(quote.status)) {
      throw AppError.badRequest(`Cannot counter-offer a quote with status ${quote.status}`);
    }

    if (new Date() > new Date(quote.validUntil)) {
      throw AppError.badRequest('Cannot counter-offer an expired quote');
    }

    const newUnitPrice = Number(counterData.counterUnitPrice);
    if (isNaN(newUnitPrice) || newUnitPrice <= 0) {
      throw AppError.badRequest('Counter unit price must be strictly positive');
    }

    const quantity = Number(quote.quotedQuantity) || 1;
    const newTotal = Math.round(newUnitPrice * quantity * 100) / 100;
    const actorLabel = isCollector ? 'Collector' : (isCitizen ? 'Citizen' : (isRecycler ? 'Recycler' : 'Admin'));
    const unitLabel = quote.unit === 'PER_KG' ? 'kg' : (quote.unit || 'item');
    const noteEntry = `[${actorLabel} Counter @ ₹${newUnitPrice}/${unitLabel}${counterData.notes ? `: ${counterData.notes}` : ''} (${new Date().toISOString()})]`;
    const updatedNotes = quote.notes ? `${quote.notes}\n${noteEntry}` : noteEntry;

    const updatedQuote = await prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id: quote.id },
        data: {
          quotedUnitPrice: newUnitPrice,
          quotedTotal: newTotal,
          notes: updatedNotes,
          status: QUOTE_STATUS.SENT,
          viewedAt: null, // Reset viewed status for new counter
        },
        include: {
          materialLot: true,
          buyerUser: {
            select: {
              id: true,
              name: true,
            },
          },
          recycler: {
            select: {
              id: true,
              facilityName: true,
              authorizationStatus: true,
              city: true,
              state: true,
              pickupAvailable: true,
            },
          },
        },
      });

      await auditService.logAction(
        {
          actorId: user.id,
          action: 'QUOTE_COUNTERED',
          entityType: 'quotes',
          entityId: quote.id,
          details: {
            referenceNumber: quote.referenceNumber,
            actor: actorLabel,
            oldUnitPrice: quote.quotedUnitPrice,
            newUnitPrice,
            oldTotal: quote.quotedTotal,
            newTotal,
          },
          ipAddress,
        },
        tx
      );

      return q;
    });

    // Notify opposite party
    try {
      let recipientUserId = null;
      if (isCollector) {
        recipientUserId = quote.isConsumerOffer ? quote.buyerUserId : quote.recycler?.userId;
      } else {
        recipientUserId = quote.materialLot.collector.userId;
      }

      if (recipientUserId) {
        await notificationService.createNotification({
          userId: recipientUserId,
          type: 'QUOTE_COUNTERED',
          title: `Counter-Offer Received (${actorLabel})`,
          message: `${actorLabel} proposed ₹${newUnitPrice}/${unitLabel} for lot ${quote.materialLot.referenceNumber}`,
          referenceType: 'quotes',
          referenceId: quote.id,
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to dispatch counter-offer notification: ${notifErr.message}`);
    }

    logger.info(`[QuoteService] Quote ${quote.referenceNumber} countered by ${actorLabel} to ₹${newUnitPrice}`);
    return updatedQuote;
  }

  /**
   * Recycler or Citizen cancels their own open quote
   * @param {object} user - Authenticated recycler or citizen
   * @param {string} quoteId - Quote UUID
   * @param {string} [reason]
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async cancelQuote(user, quoteId, reason = null, ipAddress = null) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { recycler: true, buyerUser: true },
    });

    if (!quote) {
      throw AppError.notFound('Quote not found');
    }

    if (user.role === ROLES.RECYCLER && quote.recycler?.userId !== user.id) {
      throw AppError.forbidden('You can only cancel your own quotes');
    }
    if (user.role === ROLES.CITIZEN && quote.buyerUserId !== user.id) {
      throw AppError.forbidden('You can only cancel your own purchase offers');
    }

    if (![QUOTE_STATUS.SENT, QUOTE_STATUS.VIEWED].includes(quote.status)) {
      throw AppError.badRequest(`Cannot cancel quote with status ${quote.status}`);
    }

    const cancellationReasonText = reason || (user.role === ROLES.CITIZEN ? 'CANCELLED_BY_CITIZEN' : 'CANCELLED_BY_RECYCLER');

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

  /**
   * Citizen lists their own purchase offers (active and past)
   * @param {object} user - Authenticated citizen
   * @param {object} [query] - Filters and pagination
   * @returns {Promise<object>}
   */
  async getCitizenQuotes(user, query = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = { buyerUserId: user.id };
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
            include: {
              photos: true,
              collector: {
                select: {
                  id: true,
                  city: true,
                  serviceArea: true,
                  state: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
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
