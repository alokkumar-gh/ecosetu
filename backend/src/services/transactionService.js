// EcoSetu Transaction Service
// Canonical Reference: SIH Problem Statement 26229 - Prompt 7: Payment Recording + Transaction Dataset

const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  ROLES,
  HANDOVER_STATUS,
  TRANSACTION_TYPE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require('../utils/constants');

class TransactionService {
  /**
   * Generate unique human-readable transaction reference (TXN-YYYYMM-XXXXX)
   * @returns {Promise<string>}
   */
  async generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `TXN-${year}${month}-`;

    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const count = await prisma.transactionRecord.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    let sequence = count + 1;
    let referenceNumber = `${prefix}${String(sequence).padStart(5, '0')}`;

    // Verify uniqueness
    let existing = await prisma.transactionRecord.findUnique({
      where: { referenceNumber },
    });
    while (existing) {
      sequence += 1;
      referenceNumber = `${prefix}${String(sequence).padStart(5, '0')}`;
      existing = await prisma.transactionRecord.findUnique({
        where: { referenceNumber },
      });
    }

    return referenceNumber;
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
   * Generate explicit non-movement disclaimer based on payment method
   * @param {string} paymentMethod
   * @returns {string}
   */
  getDisclaimerForPaymentMethod(paymentMethod) {
    if (paymentMethod === PAYMENT_METHOD.CASH) {
      return 'Recording only — ECOSETU does not transfer money. Cash payment recorded by user.';
    }
    if (
      paymentMethod === PAYMENT_METHOD.UPI_RECORDED ||
      paymentMethod === PAYMENT_METHOD.BANK_TRANSFER_RECORDED
    ) {
      return 'Recording only — ECOSETU does not transfer money. Payment method recorded by user; payment is not processed or verified by ECOSETU.';
    }
    return 'Recording only — ECOSETU does not transfer money.';
  }

  /**
   * Create / Record a new Economic Transaction
   * @param {object|string} actor - Authenticated user or UUID
   * @param {object} data - Transaction payload
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async createTransaction(actor, data, ipAddress = null) {
    actor = await this.resolveActor(actor);

    // 1. Fetch Handover with lot, quote, collector, recycler
    const handover = await prisma.handoverRecord.findUnique({
      where: { id: data.handoverId },
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
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
        transaction: true,
      },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    // 2. Strict Requirement: Handover MUST be in CONFIRMED status
    if (handover.status !== HANDOVER_STATUS.CONFIRMED) {
      throw AppError.badRequest(
        `Cannot create transaction: Handover must be in CONFIRMED status (current status: ${handover.status})`
      );
    }

    // 3. Duplicate Protection: Check if transaction already exists for this handover
    if (handover.transaction) {
      throw AppError.conflict(
        `A transaction record (${handover.transaction.referenceNumber}) already exists for this confirmed handover`
      );
    }

    // 4. Ownership Verification:
    // Actor must be the collector, recycler, or admin
    const isCollector = handover.collector.userId === actor.id;
    const isRecycler = handover.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden(
        'You are not authorized to record a transaction for this handover'
      );
    }

    // 5. Verify payload relationship IDs if supplied by client (prevent tampering)
    if (data.materialLotId && data.materialLotId !== handover.materialLotId) {
      throw AppError.badRequest('materialLotId does not match confirmed handover');
    }
    if (data.quoteId && data.quoteId !== handover.quoteId) {
      throw AppError.badRequest('quoteId does not match confirmed handover');
    }
    if (data.collectorProfileId && data.collectorProfileId !== handover.collectorId) {
      throw AppError.badRequest('collectorProfileId does not match confirmed handover');
    }
    if (data.recyclerProfileId && data.recyclerProfileId !== handover.recyclerId) {
      throw AppError.badRequest('recyclerProfileId does not match confirmed handover');
    }

    // 6. Decimal-safe monetary and weight derivations
    const finalSaleValue = new Prisma.Decimal(Number(data.finalSaleValue).toFixed(2));
    if (finalSaleValue.lte(0)) {
      throw AppError.badRequest('Final sale value must be greater than zero');
    }

    const quantityNum =
      Number(handover.handoverWeightKg) ||
      Number(handover.declaredWeightKg) ||
      Number(handover.materialLot.approximateTotalWeightKg) ||
      1;
    const quantity = new Prisma.Decimal(quantityNum.toFixed(2));

    const finalUnitPrice = data.finalUnitPrice
      ? new Prisma.Decimal(Number(data.finalUnitPrice).toFixed(2))
      : new Prisma.Decimal((Number(finalSaleValue) / quantityNum).toFixed(2));

    const quotedUnitPrice = new Prisma.Decimal(
      Number(handover.quote.quotedUnitPrice ?? handover.quote.unitPrice ?? 0).toFixed(2)
    );
    const quotedTotal = new Prisma.Decimal(
      Number(handover.quote.quotedTotal ?? 0).toFixed(2)
    );

    // 7. Calculate amountPaid and amountDue according to paymentStatus
    const paymentStatus = data.paymentStatus || PAYMENT_STATUS.PENDING;
    const paymentMethod = data.paymentMethod || PAYMENT_METHOD.CASH;
    let amountPaid;
    let amountDue;

    if (paymentStatus === PAYMENT_STATUS.PAID) {
      amountPaid = finalSaleValue;
      amountDue = new Prisma.Decimal('0.00');
    } else if (paymentStatus === PAYMENT_STATUS.PENDING) {
      amountPaid = new Prisma.Decimal('0.00');
      amountDue = finalSaleValue;
    } else if (paymentStatus === PAYMENT_STATUS.PARTIALLY_PAID) {
      const inputAmountPaid = Number(data.amountPaid) || 0;
      if (inputAmountPaid < 0) {
        throw AppError.badRequest('Amount paid cannot be negative');
      }
      if (inputAmountPaid > Number(finalSaleValue)) {
        throw AppError.badRequest(
          `Amount paid (₹${inputAmountPaid}) cannot exceed final sale value (₹${finalSaleValue})`
        );
      }
      amountPaid = new Prisma.Decimal(inputAmountPaid.toFixed(2));
      amountDue = new Prisma.Decimal((Number(finalSaleValue) - inputAmountPaid).toFixed(2));
    } else {
      // FAILED / NOT_APPLICABLE
      amountPaid = new Prisma.Decimal('0.00');
      amountDue = finalSaleValue;
    }

    // 8. Generate unique reference
    const referenceNumber = await this.generateReferenceNumber();

    // 9. Zero-fabrication location inheritance from confirmed handover
    const latitude = handover.latitude;
    const longitude = handover.longitude;
    const locationAccuracyMeters = handover.locationAccuracyMeters;
    const locationName =
      handover.locationName ||
      handover.materialLot.collectionArea ||
      handover.materialLot.collectionAddress ||
      null;

    // 10. Non-movement statutory disclaimer
    const disclaimer = this.getDisclaimerForPaymentMethod(paymentMethod);

    // 11. Transactional creation in database
    const transaction = await prisma.transactionRecord.create({
      data: {
        referenceNumber,
        materialLotId: handover.materialLotId,
        quoteId: handover.quoteId,
        handoverId: handover.id,
        collectorId: handover.collectorId,
        recyclerId: handover.recyclerId,
        category: handover.materialLot.category,
        subcategory: handover.materialLot.subcategory || null,
        quantity,
        unit: handover.quote.unit,
        quotedUnitPrice,
        quotedTotal,
        finalUnitPrice,
        finalSaleValue,
        amountPaid,
        amountDue,
        currency: 'INR',
        transactionType: TRANSACTION_TYPE.MATERIAL_SALE,
        paymentMethod,
        paymentStatus,
        transactionStatus: TRANSACTION_STATUS.RECORDED,
        transactionDate: new Date(),
        locationName,
        latitude,
        longitude,
        locationAccuracyMeters,
        notes: data.notes || null,
        disclaimer,
        createdById: actor.id,
      },
      include: {
        materialLot: true,
        quote: true,
        handover: true,
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
      },
    });

    // 12. Audit Logging
    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.TRANSACTION_RECORDED,
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      metadata: {
        referenceNumber: transaction.referenceNumber,
        handoverReference: handover.referenceNumber,
        paymentMethod,
        paymentStatus,
        finalSaleValue: Number(finalSaleValue),
        quotedTotal: Number(quotedTotal),
        difference: Number(finalSaleValue) - Number(quotedTotal),
      },
      ipAddress,
    });

    // 13. Resilient Notifications (Non-blocking)
    const notifyRecipientId = isCollector
      ? handover.recycler.userId
      : handover.collector.userId;

    if (notifyRecipientId) {
      notificationService
        .createNotification({
          userId: notifyRecipientId,
          type: NOTIFICATION_TYPES.TRANSACTION_RECORDED,
          title: 'Payment & Sale Recorded',
          message: `Sale transaction ${transaction.referenceNumber} recorded for handover ${handover.referenceNumber} (₹${Number(finalSaleValue)} via ${paymentMethod}). Note: Recording only; ECOSETU does not transfer money.`,
          data: {
            transactionId: transaction.id,
            referenceNumber: transaction.referenceNumber,
            handoverId: handover.id,
          },
        })
        .catch((err) => {
          logger.warn(`[TransactionService] Notification failed: ${err.message}`);
        });
    }

    logger.info(
      `[TransactionService] Transaction ${transaction.referenceNumber} recorded for handover ${handover.referenceNumber}`
    );

    return this.formatTransactionResponse(transaction);
  }

  /**
   * Format transaction object with variance and computed fields
   */
  formatTransactionResponse(tx) {
    const quotedTotalNum = Number(tx.quotedTotal);
    const finalSaleValueNum = Number(tx.finalSaleValue);
    const differenceFromQuote = Number((finalSaleValueNum - quotedTotalNum).toFixed(2));
    const variancePercent =
      quotedTotalNum > 0
        ? Number(((differenceFromQuote / quotedTotalNum) * 100).toFixed(2))
        : 0;

    return {
      ...tx,
      collectorProfileId: tx.collectorId,
      recyclerProfileId: tx.recyclerId,
      differenceFromQuote,
      variancePercent,
      isPriceAdjusted: differenceFromQuote !== 0,
    };
  }

  /**
   * Get Transaction by ID with tenancy isolation
   */
  async getTransactionById(actor, id) {
    actor = await this.resolveActor(actor);

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id },
      include: {
        materialLot: {
          include: {
            items: { include: { materialItem: true } },
          },
        },
        quote: true,
        handover: {
          include: {
            photos: true,
          },
        },
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    const isCollector = transaction.collector.userId === actor.id;
    const isRecycler = transaction.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You are not authorized to view this transaction');
    }

    return this.formatTransactionResponse(transaction);
  }

  /**
   * Get Transaction by Handover ID
   */
  async getTransactionByHandoverId(actor, handoverId) {
    actor = await this.resolveActor(actor);

    const handover = await prisma.handoverRecord.findUnique({
      where: { id: handoverId },
      include: {
        collector: true,
        recycler: true,
      },
    });

    if (!handover) {
      throw AppError.notFound('Handover record not found');
    }

    const isCollector = handover.collector.userId === actor.id;
    const isRecycler = handover.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You are not authorized to view transactions for this handover');
    }

    const transaction = await prisma.transactionRecord.findUnique({
      where: { handoverId },
      include: {
        materialLot: true,
        quote: true,
        handover: true,
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
      },
    });

    if (!transaction) {
      return null;
    }

    return this.formatTransactionResponse(transaction);
  }

  /**
   * List Transactions with tenancy isolation and pagination
   */
  async getTransactions(actor, query = {}) {
    actor = await this.resolveActor(actor);

    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(parseInt(query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const where = {};

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const collector = await prisma.collectorProfile.findUnique({
        where: { userId: actor.id },
      });
      if (!collector) return { transactions: [], total: 0, page, limit, totalPages: 0 };
      where.collectorId = collector.id;
    } else if (actor.role === ROLES.RECYCLER) {
      const recycler = await prisma.recyclerProfile.findUnique({
        where: { userId: actor.id },
      });
      if (!recycler) return { transactions: [], total: 0, page, limit, totalPages: 0 };
      where.recyclerId = recycler.id;
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Unauthorized role for transactions');
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }
    if (query.transactionStatus) {
      where.transactionStatus = query.transactionStatus;
    }
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
      if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transactionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          materialLot: true,
          quote: true,
          handover: true,
          collector: { include: { user: true } },
          recycler: { include: { user: true } },
        },
      }),
      prisma.transactionRecord.count({ where }),
    ]);

    return {
      transactions: transactions.map((tx) => this.formatTransactionResponse(tx)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update Payment Status of a Transaction
   */
  async updatePaymentStatus(actor, id, data, ipAddress = null) {
    actor = await this.resolveActor(actor);

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id },
      include: {
        collector: true,
        recycler: true,
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    if (transaction.transactionStatus === TRANSACTION_STATUS.CANCELLED) {
      throw AppError.badRequest('Cannot update payment status of a cancelled transaction');
    }

    const isCollector = transaction.collector.userId === actor.id;
    const isRecycler = transaction.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You are not authorized to update this transaction');
    }

    const finalSaleValueNum = Number(transaction.finalSaleValue);
    const newStatus = data.paymentStatus;
    let newAmountPaid;
    let newAmountDue;

    if (newStatus === PAYMENT_STATUS.PAID) {
      newAmountPaid = transaction.finalSaleValue;
      newAmountDue = new Prisma.Decimal('0.00');
    } else if (newStatus === PAYMENT_STATUS.PENDING) {
      newAmountPaid = new Prisma.Decimal('0.00');
      newAmountDue = transaction.finalSaleValue;
    } else if (newStatus === PAYMENT_STATUS.PARTIALLY_PAID) {
      const inputPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : Number(transaction.amountPaid);
      if (inputPaid < 0) {
        throw AppError.badRequest('Amount paid cannot be negative');
      }
      if (inputPaid > finalSaleValueNum) {
        throw AppError.badRequest(
          `Amount paid (₹${inputPaid}) cannot exceed final sale value (₹${finalSaleValueNum})`
        );
      }
      newAmountPaid = new Prisma.Decimal(inputPaid.toFixed(2));
      newAmountDue = new Prisma.Decimal((finalSaleValueNum - inputPaid).toFixed(2));
    } else {
      newAmountPaid = new Prisma.Decimal('0.00');
      newAmountDue = transaction.finalSaleValue;
    }

    const updateData = {
      paymentStatus: newStatus,
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
    };

    if (data.paymentMethod) {
      updateData.paymentMethod = data.paymentMethod;
      updateData.disclaimer = this.getDisclaimerForPaymentMethod(data.paymentMethod);
    }
    if (data.notes) {
      updateData.notes = data.notes;
    }

    const updatedTx = await prisma.transactionRecord.update({
      where: { id },
      data: updateData,
      include: {
        materialLot: true,
        quote: true,
        handover: true,
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.TRANSACTION_PAYMENT_UPDATED,
      entityType: 'TRANSACTION',
      entityId: updatedTx.id,
      metadata: {
        referenceNumber: updatedTx.referenceNumber,
        oldStatus: transaction.paymentStatus,
        newStatus,
        amountPaid: Number(newAmountPaid),
        amountDue: Number(newAmountDue),
      },
      ipAddress,
    });

    return this.formatTransactionResponse(updatedTx);
  }

  /**
   * Explicitly cancel a transaction with reason and audit log
   */
  async cancelTransaction(actor, id, data, ipAddress = null) {
    actor = await this.resolveActor(actor);

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id },
      include: {
        collector: true,
        recycler: true,
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    if (transaction.transactionStatus === TRANSACTION_STATUS.CANCELLED) {
      throw AppError.badRequest('Transaction is already cancelled');
    }

    const isCollector = transaction.collector.userId === actor.id;
    const isRecycler = transaction.recycler.userId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCollector && !isRecycler && !isAdmin) {
      throw AppError.forbidden('You are not authorized to cancel this transaction');
    }

    const updatedTx = await prisma.transactionRecord.update({
      where: { id },
      data: {
        transactionStatus: TRANSACTION_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: data.reason,
      },
      include: {
        materialLot: true,
        quote: true,
        handover: true,
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.TRANSACTION_CANCELLED,
      entityType: 'TRANSACTION',
      entityId: updatedTx.id,
      metadata: {
        referenceNumber: updatedTx.referenceNumber,
        reason: data.reason,
      },
      ipAddress,
    });

    return this.formatTransactionResponse(updatedTx);
  }

  /**
   * Generate multilingual speech summary for low-literacy / audio users
   */
  generateTransactionSpeechText(tx, language = 'en') {
    const ref = tx.referenceNumber || 'Transaction';
    const amount = Number(tx.finalSaleValue) || 0;
    const status = tx.paymentStatus || 'PENDING';
    const method = tx.paymentMethod || 'CASH';
    const recycler = tx.recycler?.facilityName || 'Recycler';

    if (language === 'hi') {
      const statusHi =
        status === 'PAID'
          ? 'भुगतान पूर्ण'
          : status === 'PARTIALLY_PAID'
          ? 'आंशिक भुगतान'
          : 'लंबित';
      const methodHi = method === 'CASH' ? 'नकद' : 'यूपीआई या बैंक';
      return `लेन-देन संदर्भ ${ref}। कुल मूल्य ₹${amount}, ${methodHi} द्वारा। स्थिति: ${statusHi}। क्रेता: ${recycler}। ध्यान दें: यह केवल रिकॉर्ड है, पैसे का लेन-देन ऐप द्वारा नहीं किया गया है।`;
    }

    if (language === 'mr') {
      const statusMr =
        status === 'PAID'
          ? 'पूर्ण भरले'
          : status === 'PARTIALLY_PAID'
          ? 'अंशतः भरले'
          : 'प्रलंबित';
      const methodMr = method === 'CASH' ? 'रोख' : 'यूपीआय किंवा बँक';
      return `व्यवहार संदर्भ ${ref}। एकूण रक्कम ₹${amount}, ${methodMr} द्वारे। स्थिती: ${statusMr}। खरेदीदार: ${recycler}। टीप: ही केवळ नोंद आहे, पैशांचे हस्तांतरण अॅपद्वारे केलेले नाही.`;
    }

    if (language === 'or') {
      const statusOr =
        status === 'PAID'
          ? 'ପରିଶୋଧିତ'
          : status === 'PARTIALLY_PAID'
          ? 'ଆଂଶିକ ପରିଶୋଧିତ'
          : 'ବାକି';
      const methodOr = method === 'CASH' ? 'ନଗଦ' : 'ୟୁପିଆଇ କିମ୍ବା ବ୍ୟାଙ୍କ';
      return `କାରବାର ରେଫରେନ୍ସ ${ref}। ମୋଟ ମୂଲ୍ୟ ₹${amount}, ${methodOr} ଦ୍ୱାରା। ସ୍ଥିତି: ${statusOr}। କ୍ରେତା: ${recycler}। ସୂଚନା: ଏହା କେବଳ ରେକର୍ଡ, ଟଙ୍କା ସ୍ଥାନାନ୍ତର ହୋଇନାହିଁ।`;
    }

    // Default English
    return `Transaction reference ${ref}. Final sale value ${amount} rupees via ${method}. Payment status: ${status}. Buyer: ${recycler}. Note: Recording only; ECOSETU does not transfer money.`;
  }
}

module.exports = new TransactionService();
