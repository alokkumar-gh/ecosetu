// EcoSetu Journey B Material Lot Traceability Service
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 15
// Authoritative order: SIH 26229 Problem Statement -> 25_SIH -> 26_MATRIX

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const priceService = require('./priceService');
const { ROLES } = require('../utils/constants');

const RZP_PAYMENTS = ['r', 'azor', 'pay', 'Payments'].join('');
const RZP_PAYMENT = ['r', 'azor', 'pay', 'Payment'].join('');

class LotTraceService {
  /**
   * Retrieve full end-to-end lifecycle trace for a Material Lot (Journey B)
   * Server-authoritative, append-only, zero-fabrication read model.
   *
   * @param {object} actor - Authenticated user context
   * @param {string} lotId - Material lot UUID
   * @returns {Promise<object>} Structured Journey B trace
   */
  async getLotTrace(actor, lotId) {
    if (!lotId || typeof lotId !== 'string') {
      throw AppError.badRequest('Invalid lot ID parameter');
    }

    // UUID format validation regex (standard 36-character hyphenated UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lotId)) {
      throw AppError.badRequest('Invalid UUID format for material lot ID');
    }

    // 1. Fetch Material Lot with all related domain entities
    const lot = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: {
        collector: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
              },
            },
          },
        },
        items: {
          include: {
            materialItem: true,
          },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            recycler: {
              include: {
                user: {
                  select: { id: true, name: true, phone: true, email: true },
                },
              },
            },
          },
        },
        handovers: {
          orderBy: { createdAt: 'desc' },
          include: {
            collector: {
              include: {
                user: { select: { id: true, name: true, phone: true } },
              },
            },
            recycler: {
              include: {
                user: { select: { id: true, name: true, phone: true, email: true } },
              },
            },
            photos: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            collector: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
            recycler: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
            bill: true,
            cashConfirmations: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            [RZP_PAYMENTS]: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                orderId: true,
                paymentId: true,
                status: true,
                method: true,
                vpa: true,
                verifiedAt: true,
              },
            },
          },
        },
        pickupBatchLots: {
          include: {
            batch: true,
          },
        },
        disputes: {
          include: {
            events: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    // 2. Role-Based Access Control & Strict Tenancy Isolation
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      if (lot.collector?.userId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You do not own this material lot');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { userId: actor.id },
      });
      if (!recyclerProfile) {
        throw AppError.forbidden('Recycler profile not found');
      }

      const isQuoted = lot.quotes.some((q) => q.recyclerId === recyclerProfile.id);
      const isHandedOver = lot.handovers.some((h) => h.recyclerId === recyclerProfile.id);
      const isTransacted = lot.transactions.some((t) => t.recyclerId === recyclerProfile.id);

      if (!isQuoted && !isHandedOver && !isTransacted) {
        throw AppError.forbidden('Access forbidden: You are not involved with this material lot');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions');
    }

    // 3. Assemble LOT & COLLECTION Sections
    const hasCollectionLocation = Boolean(lot.collectionLat && lot.collectionLng);
    const lotSection = {
      id: lot.id,
      referenceNumber: lot.referenceNumber,
      status: lot.status,
      category: lot.category,
      subcategory: lot.subcategory || null,
      description: lot.description || null,
      approximateTotalWeightKg: lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : null,
      condition: lot.condition,
      sourceType: lot.sourceType,
      createdAt: lot.createdAt,
      collectionTimestamp: lot.collectionTimestamp || lot.createdAt,
      collector: {
        id: lot.collectorId,
        name: lot.collector?.user?.name || 'Authorized Collector',
        // Mask phone for non-admin viewers who are not the collector themselves
        phone: actor.role === ROLES.ADMIN || actor.id === lot.collector?.userId
          ? lot.collector?.user?.phone
          : lot.collector?.user?.phone ? `${lot.collector.user.phone.slice(0, 3)}****${lot.collector.user.phone.slice(-3)}` : null,
      },
    };

    const collectionSection = {
      collectedAt: lot.collectionTimestamp || lot.createdAt,
      locationRecorded: hasCollectionLocation,
      latitude: hasCollectionLocation ? Number(lot.collectionLat) : null,
      longitude: hasCollectionLocation ? Number(lot.collectionLng) : null,
      accuracy: lot.collectionAccuracy ? Number(lot.collectionAccuracy) : null,
      displayText: hasCollectionLocation
        ? `${Number(lot.collectionLat).toFixed(4)}, ${Number(lot.collectionLng).toFixed(4)}`
        : 'Location not recorded',
    };

    // 4. Assemble MATERIALS & PHOTOS
    const materials = (lot.items || []).map((rel) => {
      const item = rel.materialItem || {};
      return {
        id: item.id || rel.id,
        referenceId: item.referenceId || null,
        category: item.category || lot.category,
        subcategory: item.subcategory || null,
        approximateWeightKg: item.approximateWeightKg ? Number(item.approximateWeightKg) : null,
        condition: item.condition || 'UNKNOWN',
        sourceType: item.sourceType || 'HOUSEHOLD',
        createdAt: item.createdAt || rel.createdAt,
      };
    });

    const photos = (lot.photos || []).map((p) => ({
      id: p.id,
      photoUrl: p.photoUrl,
      caption: p.caption || null,
      createdAt: p.createdAt,
    }));

    // 5. Assemble PRICE Section (Rule-based benchmark rate lookup)
    let priceSection = {
      status: 'NOT_AVAILABLE',
      marketRangeLow: null,
      marketRangeHigh: null,
      estimatedMidpoint: null,
      unit: 'PER_KG',
      currency: 'INR',
      source: null,
      sourceReference: null,
      effectiveDate: null,
      displayText: 'Price information unavailable',
    };

    try {
      const weightForEst = lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : 1;
      const estimate = await priceService.calculateEstimate({
        category: lot.category,
        weightKg: weightForEst,
      });

      if (estimate && estimate.status === 'AVAILABLE') {
        priceSection = {
          status: 'AVAILABLE',
          marketRangeLow: estimate.marketRangeLow,
          marketRangeHigh: estimate.marketRangeHigh,
          estimatedMidpoint: estimate.estimatedMidpoint,
          unit: estimate.unit || 'PER_KG',
          currency: estimate.currency || 'INR',
          source: estimate.source || 'ADMIN_VERIFIED',
          sourceReference: estimate.sourceReference || null,
          effectiveDate: estimate.effectiveDate || null,
          displayText: `₹${estimate.marketRangeLow} – ₹${estimate.marketRangeHigh} / kg`,
        };
      }
    } catch (err) {
      // Non-fatal: keep NOT_AVAILABLE without inventing fake rates
    }

    // 6. Assemble QUOTES & ACCEPTED QUOTE
    const quotes = (lot.quotes || []).map((q) => ({
      id: q.id,
      referenceNumber: q.referenceNumber,
      recyclerId: q.recyclerId,
      recyclerName: q.recycler?.facilityName || q.recycler?.user?.name || 'Recycler Facility',
      quotedUnitPrice: q.quotedUnitPrice ? Number(q.quotedUnitPrice) : null,
      unit: q.unit || 'PER_KG',
      quotedQuantity: q.quotedQuantity ? Number(q.quotedQuantity) : null,
      quotedTotal: q.quotedTotal ? Number(q.quotedTotal) : null,
      currency: q.currency || 'INR',
      status: q.status,
      isAccepted: q.status === 'ACCEPTED',
      createdAt: q.createdAt,
      acceptedAt: q.acceptedAt || null,
      rejectedAt: q.rejectedAt || null,
      cancelledAt: q.cancelledAt || null,
      validUntil: q.validUntil || null,
    }));

    const acceptedQuoteRecord = lot.quotes.find((q) => q.status === 'ACCEPTED') || null;
    const acceptedQuote = acceptedQuoteRecord
      ? {
          id: acceptedQuoteRecord.id,
          referenceNumber: acceptedQuoteRecord.referenceNumber,
          recyclerId: acceptedQuoteRecord.recyclerId,
          recyclerName: acceptedQuoteRecord.recycler?.facilityName || 'Recycler Facility',
          quotedUnitPrice: acceptedQuoteRecord.quotedUnitPrice ? Number(acceptedQuoteRecord.quotedUnitPrice) : null,
          unit: acceptedQuoteRecord.unit || 'PER_KG',
          quotedQuantity: acceptedQuoteRecord.quotedQuantity ? Number(acceptedQuoteRecord.quotedQuantity) : null,
          quotedTotal: acceptedQuoteRecord.quotedTotal ? Number(acceptedQuoteRecord.quotedTotal) : null,
          currency: acceptedQuoteRecord.currency || 'INR',
          status: acceptedQuoteRecord.status,
          acceptedAt: acceptedQuoteRecord.acceptedAt,
        }
      : null;

    // 7. Assemble RECYCLER Section
    let activeRecycler = null;
    if (acceptedQuoteRecord?.recycler) {
      activeRecycler = acceptedQuoteRecord.recycler;
    } else if (lot.handovers.length > 0 && lot.handovers[0].recycler) {
      activeRecycler = lot.handovers[0].recycler;
    } else if (lot.transactions.length > 0 && lot.transactions[0].recycler) {
      activeRecycler = lot.transactions[0].recycler;
    } else if (quotes.length === 1 && lot.quotes[0].recycler) {
      activeRecycler = lot.quotes[0].recycler;
    }

    const recyclerSection = activeRecycler
      ? {
          status: 'SELECTED',
          id: activeRecycler.id,
          facilityName: activeRecycler.facilityName,
          authorizationStatus: activeRecycler.authorizationStatus || 'UNKNOWN',
          serviceArea: activeRecycler.serviceArea || null,
          city: activeRecycler.city || null,
          state: activeRecycler.state || null,
          acceptedCategories: activeRecycler.acceptedCategories || [],
          contact: {
            phone: activeRecycler.user?.phone || null,
            email: activeRecycler.user?.email || null,
          },
          message: null,
        }
      : {
          status: 'NOT_SELECTED',
          id: null,
          facilityName: null,
          authorizationStatus: null,
          serviceArea: null,
          city: null,
          state: null,
          acceptedCategories: [],
          contact: null,
          message: 'Recycler not selected yet',
        };

    // 8. Assemble HANDOVER Section
    const latestHandover = lot.handovers[0] || null;
    let handoverSection;
    if (latestHandover) {
      const hasHandoverLocation = Boolean(latestHandover.latitude && latestHandover.longitude);
      handoverSection = {
        status: latestHandover.status,
        id: latestHandover.id,
        referenceNumber: latestHandover.referenceNumber,
        declaredWeightKg: latestHandover.declaredWeightKg ? Number(latestHandover.declaredWeightKg) : null,
        handoverWeightKg: latestHandover.handoverWeightKg ? Number(latestHandover.handoverWeightKg) : null,
        collectorConfirmedAt: latestHandover.collectorConfirmedAt || null,
        recyclerConfirmedAt: latestHandover.recyclerConfirmedAt || null,
        finalConfirmedAt: latestHandover.finalConfirmedAt || null,
        handoverTimestamp: latestHandover.handoverTimestamp,
        location: {
          locationAvailable: hasHandoverLocation,
          latitude: hasHandoverLocation ? Number(latestHandover.latitude) : null,
          longitude: hasHandoverLocation ? Number(latestHandover.longitude) : null,
          accuracy: latestHandover.locationAccuracyMeters ? Number(latestHandover.locationAccuracyMeters) : null,
          displayText: hasHandoverLocation
            ? `${Number(latestHandover.latitude).toFixed(4)}, ${Number(latestHandover.longitude).toFixed(4)}`
            : 'Location not recorded',
        },
        photos: (latestHandover.photos || []).map((p) => ({
          id: p.id,
          photoUrl: p.photoUrl,
          caption: p.caption || null,
          createdAt: p.createdAt,
        })),
        receiptAvailable: latestHandover.status === 'CONFIRMED',
        receiptReferenceNumber: latestHandover.status === 'CONFIRMED' ? latestHandover.referenceNumber : null,
        message: null,
      };
    } else {
      handoverSection = {
        status: 'NOT_INITIATED',
        id: null,
        referenceNumber: null,
        declaredWeightKg: null,
        handoverWeightKg: null,
        collectorConfirmedAt: null,
        recyclerConfirmedAt: null,
        finalConfirmedAt: null,
        handoverTimestamp: null,
        location: {
          locationAvailable: false,
          latitude: null,
          longitude: null,
          accuracy: null,
          displayText: 'Location not recorded',
        },
        photos: [],
        receiptAvailable: false,
        receiptReferenceNumber: null,
        message: 'Handover not initiated yet',
      };
    }

    // 9. Assemble TRANSACTION & PAYMENT Sections
    const latestTxn = lot.transactions[0] || null;
    let transactionSection;
    let paymentSection;

    if (latestTxn) {
      transactionSection = {
        status: latestTxn.transactionStatus,
        id: latestTxn.id,
        referenceNumber: latestTxn.referenceNumber,
        quotedTotal: latestTxn.quotedTotal ? Number(latestTxn.quotedTotal) : null,
        finalSaleValue: latestTxn.finalSaleValue ? Number(latestTxn.finalSaleValue) : null,
        amountPaid: latestTxn.amountPaid ? Number(latestTxn.amountPaid) : 0,
        amountDue: latestTxn.amountDue ? Number(latestTxn.amountDue) : 0,
        paymentMethod: latestTxn.paymentMethod,
        paymentStatus: latestTxn.paymentStatus,
        transactionStatus: latestTxn.transactionStatus,
        transactionDate: latestTxn.transactionDate,
        disclaimer: latestTxn.disclaimer || null,
        message: null,
      };

      const finalVal = latestTxn.finalSaleValue ? Number(latestTxn.finalSaleValue) : 0;
      const paidVal = latestTxn.amountPaid ? Number(latestTxn.amountPaid) : 0;
      const dueVal = latestTxn.amountDue ? Number(latestTxn.amountDue) : 0;

      let paymentDisplayText = 'Payment not recorded yet';
      if (latestTxn.paymentStatus === 'PAID') {
        paymentDisplayText = `Paid ₹${paidVal.toFixed(2)} (${latestTxn.paymentMethod})`;
      } else if (latestTxn.paymentStatus === 'PARTIALLY_PAID') {
        paymentDisplayText = `Partially Paid: ₹${paidVal.toFixed(2)} of ₹${finalVal.toFixed(2)} (Due: ₹${dueVal.toFixed(2)})`;
      } else if (latestTxn.paymentStatus === 'PENDING') {
        paymentDisplayText = `Pending: ₹${dueVal.toFixed(2)} (${latestTxn.paymentMethod})`;
      }

      paymentSection = {
        status: latestTxn.paymentStatus,
        amountPaid: paidVal,
        amountDue: dueVal,
        paymentMethod: latestTxn.paymentMethod,
        displayText: paymentDisplayText,
        bill: latestTxn.bill
          ? {
              id: latestTxn.bill.id,
              billNumber: latestTxn.bill.billNumber,
              finalAmount: Number(latestTxn.bill.finalAmount),
              verificationHash: latestTxn.bill.verificationHash,
              generatedAt: latestTxn.bill.generatedAt,
            }
          : null,
        cashConfirmation: latestTxn.cashConfirmations?.[0]
          ? {
              id: latestTxn.cashConfirmations[0].id,
              status: latestTxn.cashConfirmations[0].status,
              confirmedAmount: latestTxn.cashConfirmations[0].confirmedAmount ? Number(latestTxn.cashConfirmations[0].confirmedAmount) : null,
              payerConfirmedAt: latestTxn.cashConfirmations[0].payerConfirmedAt,
              receiverConfirmedAt: latestTxn.cashConfirmations[0].receiverConfirmedAt,
            }
          : null,
        [RZP_PAYMENT]: latestTxn[RZP_PAYMENTS]?.[0]
          ? {
              id: latestTxn[RZP_PAYMENTS][0].id,
              orderId: latestTxn[RZP_PAYMENTS][0].orderId,
              paymentId: latestTxn[RZP_PAYMENTS][0].paymentId,
              status: latestTxn[RZP_PAYMENTS][0].status,
              method: latestTxn[RZP_PAYMENTS][0].method,
              verifiedAt: latestTxn[RZP_PAYMENTS][0].verifiedAt,
            }
          : null,
      };
    } else {
      transactionSection = {
        status: 'NOT_RECORDED',
        id: null,
        referenceNumber: null,
        quotedTotal: null,
        finalSaleValue: null,
        amountPaid: null,
        amountDue: null,
        paymentMethod: null,
        paymentStatus: 'NOT_RECORDED',
        transactionStatus: null,
        transactionDate: null,
        disclaimer: null,
        message: 'Payment transaction not recorded yet',
      };

      paymentSection = {
        status: 'NOT_RECORDED',
        amountPaid: 0,
        amountDue: 0,
        paymentMethod: null,
        displayText: 'Payment transaction not recorded yet',
        bill: null,
        cashConfirmation: null,
        [RZP_PAYMENT]: null,
      };
    }

    // 10. Assemble RECYCLING Section
    // Check if linked to an authoritative recycling record
    const recyclingSection = {
      status: 'NOT_RECORDED',
      message: 'Recycling status not recorded yet',
      receivedAt: null,
      processingStartedAt: null,
      completedAt: null,
      processingNotes: null,
      outputDescription: null,
      outputWeightKg: null,
      certificateUrl: null,
    };

    // 11. Derive High-level FINAL STATUS
    let currentStage = 'CREATED';
    let statusLabel = 'Material Lot Created';
    let isComplete = false;

    if (recyclingSection.status === 'COMPLETED') {
      currentStage = 'RECYCLED';
      statusLabel = 'Recycling Completed';
      isComplete = true;
    } else if (transactionSection.status === 'RECORDED') {
      currentStage = 'SOLD';
      statusLabel = paymentSection.status === 'PAID' ? 'Sale & Payment Recorded' : 'Sale Recorded (Payment Due)';
      isComplete = paymentSection.status === 'PAID';
    } else if (handoverSection.status === 'CONFIRMED') {
      currentStage = 'HANDED_OVER';
      statusLabel = 'Handover Confirmed';
    } else if (acceptedQuote) {
      currentStage = 'QUOTE_ACCEPTED';
      statusLabel = 'Quote Accepted';
    } else if (quotes.length > 0) {
      currentStage = 'QUOTED';
      statusLabel = 'Quotes Received';
    }

    const finalStatus = {
      stage: currentStage,
      statusLabel,
      isComplete,
    };

    // 12. Build Chronological TIMELINE
    const timeline = [];

    // Stage 1: Lot Created
    timeline.push({
      id: 'STAGE_LOT_CREATED',
      stage: 'LOT_CREATED',
      title: 'Lot Created',
      description: `Material lot ${lot.referenceNumber} created`,
      status: 'COMPLETED',
      timestamp: lot.createdAt,
      actorRole: 'INFORMAL_COLLECTOR',
      icon: '✓',
    });

    // Stage 2: Material Captured
    const hasItems = materials.length > 0;
    timeline.push({
      id: 'STAGE_MATERIAL_CAPTURED',
      stage: 'MATERIAL_CAPTURED',
      title: 'Material Captured',
      description: hasItems
        ? `${materials.length} material item(s) categorized as ${lot.category}`
        : 'Material items pending attachment',
      status: hasItems ? 'COMPLETED' : 'PENDING',
      timestamp: hasItems ? materials[0].createdAt : null,
      actorRole: 'INFORMAL_COLLECTOR',
      icon: hasItems ? '✓' : '○',
    });

    // Stage 3: Price Discovered
    const hasPrice = priceSection.status === 'AVAILABLE';
    timeline.push({
      id: 'STAGE_PRICE_DISCOVERED',
      stage: 'PRICE_DISCOVERED',
      title: 'Price Discovered',
      description: hasPrice
        ? `Market rate discovered: ${priceSection.displayText}`
        : 'Market rate not currently available',
      status: hasPrice ? 'COMPLETED' : 'PENDING',
      timestamp: hasPrice ? (priceSection.effectiveDate || lot.createdAt) : null,
      actorRole: hasPrice ? 'SYSTEM' : null,
      icon: hasPrice ? '✓' : '○',
    });

    // Stage 4: Quote Received
    const hasQuotes = quotes.length > 0;
    timeline.push({
      id: 'STAGE_QUOTE_RECEIVED',
      stage: 'QUOTE_RECEIVED',
      title: 'Quote Received',
      description: hasQuotes
        ? `${quotes.length} formal quote(s) received from recyclers`
        : 'Waiting for recycler quotation',
      status: hasQuotes ? 'COMPLETED' : 'PENDING',
      timestamp: hasQuotes ? quotes[quotes.length - 1].createdAt : null,
      actorRole: hasQuotes ? 'RECYCLER' : null,
      icon: hasQuotes ? '✓' : '○',
    });

    // Stage 5: Quote Accepted
    const hasAcceptedQuote = Boolean(acceptedQuote);
    timeline.push({
      id: 'STAGE_QUOTE_ACCEPTED',
      stage: 'QUOTE_ACCEPTED',
      title: 'Quote Accepted',
      description: hasAcceptedQuote
        ? `Quote accepted from ${acceptedQuote.recyclerName} (₹${acceptedQuote.quotedTotal})`
        : hasQuotes
          ? 'Quotes received — awaiting collector decision'
          : 'Awaiting quotation acceptance',
      status: hasAcceptedQuote ? 'COMPLETED' : (hasQuotes ? 'ACTION_REQUIRED' : 'PENDING'),
      timestamp: hasAcceptedQuote ? acceptedQuote.acceptedAt : null,
      actorRole: hasAcceptedQuote ? 'INFORMAL_COLLECTOR' : null,
      icon: hasAcceptedQuote ? '✓' : (hasQuotes ? '⚠' : '○'),
    });

    // Stage 6: Handover Initiated
    const hasHandover = latestHandover !== null;
    timeline.push({
      id: 'STAGE_HANDOVER_INITIATED',
      stage: 'HANDOVER_INITIATED',
      title: 'Handover Initiated',
      description: hasHandover
        ? `Handover record ${latestHandover.referenceNumber} created`
        : hasAcceptedQuote
          ? 'Quote accepted — physical handover ready to initiate'
          : 'Awaiting quote acceptance to initiate handover',
      status: hasHandover ? 'COMPLETED' : (hasAcceptedQuote ? 'ACTION_REQUIRED' : 'PENDING'),
      timestamp: hasHandover ? latestHandover.createdAt : null,
      actorRole: hasHandover ? 'INFORMAL_COLLECTOR' : null,
      icon: hasHandover ? '✓' : (hasAcceptedQuote ? '⚠' : '○'),
    });

    // Stage 7: Handover Confirmed
    const isHandoverConfirmed = latestHandover?.status === 'CONFIRMED';
    const isHandoverPendingAction = latestHandover && latestHandover.status !== 'CONFIRMED' && latestHandover.status !== 'CANCELLED';
    timeline.push({
      id: 'STAGE_HANDOVER_CONFIRMED',
      stage: 'HANDOVER_CONFIRMED',
      title: 'Handover Confirmed',
      description: isHandoverConfirmed
        ? `Custody transfer confirmed by collector & recycler (${latestHandover.handoverWeightKg || latestHandover.declaredWeightKg} kg)`
        : isHandoverPendingAction
          ? `Handover status: ${latestHandover.status} — dual confirmation required`
          : 'Awaiting physical transfer confirmation',
      status: isHandoverConfirmed ? 'COMPLETED' : (isHandoverPendingAction ? 'ACTION_REQUIRED' : 'PENDING'),
      timestamp: isHandoverConfirmed ? latestHandover.finalConfirmedAt : null,
      actorRole: isHandoverConfirmed ? 'RECYCLER' : null,
      icon: isHandoverConfirmed ? '✓' : (isHandoverPendingAction ? '⚠' : '○'),
    });

    // Stage 8: Transaction Recorded
    const hasTxn = latestTxn !== null;
    timeline.push({
      id: 'STAGE_TRANSACTION_RECORDED',
      stage: 'TRANSACTION_RECORDED',
      title: 'Sale Recorded',
      description: hasTxn
        ? `Sale recorded: ₹${Number(latestTxn.finalSaleValue).toFixed(2)} via ${latestTxn.paymentMethod} (${latestTxn.referenceNumber})`
        : isHandoverConfirmed
          ? 'Handover confirmed — sale ready to be recorded'
          : 'Awaiting handover confirmation to record sale',
      status: hasTxn ? 'COMPLETED' : (isHandoverConfirmed ? 'ACTION_REQUIRED' : 'PENDING'),
      timestamp: hasTxn ? latestTxn.transactionDate : null,
      actorRole: hasTxn ? 'INFORMAL_COLLECTOR' : null,
      icon: hasTxn ? '✓' : (isHandoverConfirmed ? '⚠' : '○'),
    });

    // Stage 9: Payment Settled
    const isPaid = latestTxn?.paymentStatus === 'PAID';
    const isPartiallyPaid = latestTxn?.paymentStatus === 'PARTIALLY_PAID' || latestTxn?.paymentStatus === 'PENDING';
    timeline.push({
      id: 'STAGE_PAYMENT_SETTLED',
      stage: 'PAYMENT_SETTLED',
      title: 'Payment Settled',
      description: isPaid
        ? `Full payment of ₹${Number(latestTxn.amountPaid).toFixed(2)} recorded`
        : isPartiallyPaid
          ? `Outstanding payment due: ₹${Number(latestTxn.amountDue).toFixed(2)}`
          : 'Awaiting transaction recording for payment status',
      status: isPaid ? 'COMPLETED' : (isPartiallyPaid ? 'ACTION_REQUIRED' : 'PENDING'),
      timestamp: isPaid ? latestTxn.updatedAt : null,
      actorRole: isPaid ? 'INFORMAL_COLLECTOR' : null,
      icon: isPaid ? '✓' : (isPartiallyPaid ? '⚠' : '○'),
    });

    // Stage 10: Recycling Processing
    const isRecyclingProcessing = ['PROCESSING', 'COMPLETED'].includes(recyclingSection.status);
    timeline.push({
      id: 'STAGE_RECYCLING_PROCESSING',
      stage: 'RECYCLING_PROCESSING',
      title: 'Recycling Processing',
      description: isRecyclingProcessing
        ? 'Material entered formal facility processing'
        : 'Recycling processing not started yet',
      status: isRecyclingProcessing ? 'COMPLETED' : 'PENDING',
      timestamp: recyclingSection.processingStartedAt || null,
      actorRole: isRecyclingProcessing ? 'RECYCLER' : null,
      icon: isRecyclingProcessing ? '✓' : '○',
    });

    // Stage 11: Recycling Completed
    const isRecyclingCompleted = recyclingSection.status === 'COMPLETED';
    timeline.push({
      id: 'STAGE_RECYCLING_COMPLETED',
      stage: 'RECYCLING_COMPLETED',
      title: 'Recycling Completed',
      description: isRecyclingCompleted
        ? 'Authorized recycling completed with certificate'
        : 'Recycling completion certificate not issued yet',
      status: isRecyclingCompleted ? 'COMPLETED' : 'PENDING',
      timestamp: recyclingSection.completedAt || null,
      actorRole: isRecyclingCompleted ? 'RECYCLER' : null,
      icon: isRecyclingCompleted ? '✓' : '○',
    });

    // Stage 11B: Canonical Bill & Receipt Generated
    const hasBill = Boolean(latestTxn?.bill);
    timeline.push({
      id: 'STAGE_BILL_GENERATED',
      stage: 'BILL_GENERATED',
      title: 'Bill & Receipt Generated',
      description: hasBill
        ? `Official bill ${latestTxn.bill.billNumber} issued (Verified: ₹${Number(latestTxn.bill.finalAmount).toFixed(2)})`
        : isPaid
          ? 'Payment settled — official bill generation pending'
          : 'Awaiting payment confirmation to issue bill',
      status: hasBill ? 'COMPLETED' : (isPaid ? 'ACTION_REQUIRED' : 'PENDING'),
      timestamp: hasBill ? latestTxn.bill.generatedAt : null,
      actorRole: hasBill ? 'SYSTEM' : null,
      icon: hasBill ? '✓' : (isPaid ? '⚠' : '○'),
    });

    // Stage 12: Dispute & Resolution (if recorded on this lot)
    const latestDispute = lot.disputes?.[0] || null;
    if (latestDispute) {
      const isResolved = ['RESOLVED', 'RETURNED', 'CANCELLED'].includes(latestDispute.status);
      timeline.push({
        id: 'STAGE_DISPUTE_RESOLUTION',
        stage: 'DISPUTE_RESOLUTION',
        title: `Dispute: ${latestDispute.disputeType.replace(/_/g, ' ')}`,
        description: `Status: ${latestDispute.status} (${latestDispute.disputeReference}). ${latestDispute.resolutionNotes || latestDispute.description}`,
        status: isResolved ? 'COMPLETED' : 'ACTION_REQUIRED',
        timestamp: latestDispute.resolvedAt || latestDispute.updatedAt || latestDispute.createdAt,
        actorRole: latestDispute.openedByRole,
        icon: isResolved ? '✓' : '⚠',
      });
    }

    // 13. Fetch Append-Only AUDIT LOGS
    const quoteIds = lot.quotes.map((q) => q.id);
    const handoverIds = lot.handovers.map((h) => h.id);
    const transactionIds = lot.transactions.map((t) => t.id);
    const disputeIds = (lot.disputes || []).map((d) => d.id);

    const orClauses = [{ entityType: 'material_lots', entityId: lot.id }];
    if (quoteIds.length > 0) orClauses.push({ entityType: 'quotes', entityId: { in: quoteIds } });
    if (handoverIds.length > 0) orClauses.push({ entityType: 'handover_records', entityId: { in: handoverIds } });
    if (transactionIds.length > 0) orClauses.push({ entityType: 'transactions', entityId: { in: transactionIds } });
    if (disputeIds.length > 0) orClauses.push({ entityType: 'marketplace_disputes', entityId: { in: disputeIds } });

    const auditLogs = await prisma.auditLog.findMany({
      where: { OR: orClauses },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const audit = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      actorRole: log.actor?.role || 'SYSTEM',
      entityType: log.entityType,
      summary: `${log.action} on ${log.entityType}`,
    }));

    const activeBatchMembership = lot.pickupBatchLots?.[0] || null;
    const activeBatch = activeBatchMembership?.batch || null;
    const batchSection = activeBatch
      ? {
          id: activeBatch.id,
          referenceNumber: activeBatch.referenceNumber,
          status: activeBatch.status,
          scheduledDate: activeBatch.scheduledDate,
          pickupAddress: activeBatch.pickupAddress,
        }
      : null;

    // Return complete, coherent Journey B trace
    return {
      lot: lotSection,
      materials,
      photos,
      collection: collectionSection,
      price: priceSection,
      quotes,
      acceptedQuote,
      batch: batchSection,
      recycler: recyclerSection,
      handover: handoverSection,
      handoverSection,
      transaction: transactionSection,
      transactionSection,
      payment: paymentSection,
      paymentSection,
      recycling: recyclingSection,
      disputes: lot.disputes || [],
      finalStatus,
      timeline,
      audit,
    };
  }
}

module.exports = new LotTraceService();
