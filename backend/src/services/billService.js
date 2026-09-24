// EcoSetu Canonical Transaction Billing & Invoicing Engine
// Canonical Reference: SIH Problem Statement 26229 - Billing & Invoicing System

const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  ROLES,
  PAYMENT_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require('../utils/constants');

class BillService {
  /**
   * Generate server-authoritative unique bill reference number (BILL-YYYYMM-XXXXX)
   * @returns {string}
   */
  generateBillNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `BILL-${year}${month}-${randomHex}`;
  }

  /**
   * Generate SHA-256 verification hash for safe public / QR verification
   * @param {object} payload
   * @returns {string}
   */
  generateVerificationHash(payload) {
    const dataString = `${payload.billNumber}|${payload.transactionId}|${payload.finalAmount}|${payload.generatedAt}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
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
   * Helper: Mask user contact details for counterparty privacy
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
   * Authoritatively generate a TransactionBill for a completed/verified transaction
   * Idempotent: returns existing bill if one already exists for this transaction.
   *
   * @param {string|object} arg1 - Transaction UUID or Actor object
   * @param {string|object} [arg2] - Options object or Transaction UUID
   * @param {object|string} [arg3] - IP address or options object
   * @returns {Promise<object>}
   */
  async generateBill(arg1, arg2 = {}, arg3 = null) {
    let transactionId;
    let options = {};
    let ipAddress = null;

    if (typeof arg1 === 'string') {
      transactionId = arg1;
      options = typeof arg2 === 'object' && arg2 !== null ? arg2 : {};
      ipAddress = typeof arg3 === 'string' ? arg3 : null;
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      // Called as (actor, transactionId, options)
      transactionId = arg2;
      options = typeof arg3 === 'object' && arg3 !== null ? arg3 : {};
    }

    if (!transactionId) {
      throw AppError.badRequest('Transaction ID is required to generate bill');
    }

    // 1. Check if bill already exists (Idempotent)
    const existingBill = await prisma.transactionBill.findUnique({
      where: { transactionId },
      include: {
        buyerUser: true,
        sellerUser: true,
        materialLot: true,
        quote: true,
        handover: true,
        transaction: true,
      },
    });

    if (existingBill) {
      logger.info(`[BillService] Existing bill ${existingBill.billNumber} returned for transaction ${transactionId}`);
      return existingBill;
    }

    // 2. Fetch authoritative Transaction with related domain records
    const transaction = await prisma.transactionRecord.findUnique({
      where: { id: transactionId },
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
        handover: true,
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
        disputes: {
          where: { status: { in: ['RESOLVED', 'PARTIALLY_RESOLVED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    // 3. Rule: Bill can only be generated once transaction is in PAID status (or verified cash/digital)
    if (transaction.paymentStatus !== PAYMENT_STATUS.PAID) {
      throw AppError.badRequest(
        `Cannot generate finalized bill: Transaction payment status is ${transaction.paymentStatus}. Payment must be verified/confirmed.`
      );
    }

    // 4. Derive Buyer and Seller
    // In Journey B: Recycler is Buyer, Collector is Seller. In Journey A: Citizen is Buyer, Collector is Seller.
    const buyerUserId = transaction.buyerUserId || transaction.recycler?.userId || transaction.quote?.recycler?.userId;
    const buyerRole = transaction.buyerRole || (transaction.buyerUserId ? ROLES.CITIZEN : ROLES.RECYCLER);

    const sellerUserId = transaction.collector?.userId || transaction.materialLot?.collector?.userId;
    const sellerRole = ROLES.INFORMAL_COLLECTOR;

    if (!buyerUserId || !sellerUserId) {
      throw AppError.badRequest('Cannot generate bill: Counterparty users cannot be resolved from transaction');
    }

    // 5. Financial fields derivation
    const subtotal = transaction.quotedTotal ? Number(transaction.quotedTotal) : Number(transaction.finalSaleValue);
    const finalAmount = Number(transaction.finalSaleValue);
    const adjustments = Number((finalAmount - subtotal).toFixed(2));
    const agreedRate = Number(transaction.quotedUnitPrice || transaction.finalUnitPrice);
    const quantity = Number(transaction.quantity);

    const disputeRef = options.disputeReference || transaction.disputes?.[0]?.disputeReference || null;
    const providerRef = options.providerReference || null;

    const now = new Date();
    const billNumber = this.generateBillNumber();
    const verificationHash = this.generateVerificationHash({
      billNumber,
      transactionId,
      finalAmount,
      generatedAt: now.toISOString(),
    });

    // 6. Create Bill atomically in DB
    const bill = await prisma.transactionBill.create({
      data: {
        billNumber,
        transactionId,
        materialLotId: transaction.materialLotId,
        quoteId: transaction.quoteId,
        handoverId: transaction.handoverId,
        buyerUserId,
        buyerRole,
        sellerUserId,
        sellerRole,
        materialCategory: transaction.category,
        materialSubcategory: transaction.subcategory || null,
        quantity: new Prisma.Decimal(quantity.toFixed(2)),
        unit: transaction.unit,
        agreedRate: new Prisma.Decimal(agreedRate.toFixed(2)),
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        adjustments: new Prisma.Decimal(adjustments.toFixed(2)),
        finalAmount: new Prisma.Decimal(finalAmount.toFixed(2)),
        paymentMethod: transaction.paymentMethod,
        paymentStatus: transaction.paymentStatus,
        transactionDate: transaction.transactionDate,
        generatedAt: now,
        currency: transaction.currency || 'INR',
        providerReference: providerRef,
        disputeReference: disputeRef,
        verificationHash,
        notes: options.notes || transaction.notes || null,
      },
      include: {
        buyerUser: true,
        sellerUser: true,
        materialLot: true,
        quote: true,
        handover: true,
        transaction: true,
      },
    });

    // 7. Audit log & Notifications
    await auditService.logAction({
      actorId: sellerUserId,
      action: AUDIT_ACTIONS.BILL_GENERATED,
      entityType: 'transaction_bills',
      entityId: bill.id,
      metadata: {
        billNumber: bill.billNumber,
        transactionReference: transaction.referenceNumber,
        finalAmount,
        paymentMethod: transaction.paymentMethod,
      },
      ipAddress,
    });

    // Notify both Buyer and Seller
    const notificationPayload = {
      type: NOTIFICATION_TYPES.BILL_GENERATED,
      title: `Bill Generated: ${bill.billNumber}`,
      message: `Commercial bill generated for transaction ${transaction.referenceNumber} (₹${finalAmount}).`,
      data: {
        billId: bill.id,
        billNumber: bill.billNumber,
        transactionId: transaction.id,
      },
    };

    notificationService.createNotification({ userId: buyerUserId, ...notificationPayload }).catch(() => {});
    notificationService.createNotification({ userId: sellerUserId, ...notificationPayload }).catch(() => {});

    logger.info(`[BillService] Generated bill ${bill.billNumber} for transaction ${transaction.referenceNumber}`);
    return bill;
  }

  /**
   * Get single bill by ID with strict tenancy isolation & privacy masking
   *
   * @param {object|string} actor
   * @param {string} billId
   * @returns {Promise<object>}
   */
  async getBillById(actor, billId) {
    actor = await this.resolveActor(actor);

    const bill = await prisma.transactionBill.findUnique({
      where: { id: billId },
      include: {
        buyerUser: true,
        sellerUser: true,
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
        handover: true,
        transaction: true,
      },
    });

    if (!bill) {
      throw AppError.notFound('Bill record not found');
    }

    // Role-Scoped Tenancy Verification
    const isBuyer = bill.buyerUserId === actor.id;
    const isSeller = bill.sellerUserId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw AppError.forbidden('You are not authorized to view this bill');
    }

    // Contact Privacy Masking: Scrub phone & email of counterparty
    if (bill.buyerUser && !isAdmin && isSeller) {
      bill.buyerUser = this.maskContactInfo(bill.buyerUser);
    }
    if (bill.sellerUser && !isAdmin && isBuyer) {
      bill.sellerUser = this.maskContactInfo(bill.sellerUser);
    }

    return bill;
  }

  /**
   * Get bill by Transaction ID
   *
   * @param {object|string} actor
   * @param {string} transactionId
   * @returns {Promise<object|null>}
   */
  async getBillByTransactionId(actor, transactionId) {
    actor = await this.resolveActor(actor);

    const bill = await prisma.transactionBill.findUnique({
      where: { transactionId },
      include: {
        buyerUser: true,
        sellerUser: true,
        materialLot: true,
        quote: true,
        handover: true,
        transaction: true,
      },
    });

    if (!bill) {
      return null;
    }

    const isBuyer = bill.buyerUserId === actor.id;
    const isSeller = bill.sellerUserId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw AppError.forbidden('You are not authorized to view this bill');
    }

    if (bill.buyerUser && !isAdmin && isSeller) {
      bill.buyerUser = this.maskContactInfo(bill.buyerUser);
    }
    if (bill.sellerUser && !isAdmin && isBuyer) {
      bill.sellerUser = this.maskContactInfo(bill.sellerUser);
    }

    return bill;
  }

  /**
   * List bills with role-scoped tenancy isolation and pagination
   *
   * @param {object|string} actor
   * @param {object} [filters]
   * @returns {Promise<object>}
   */
  async listBills(actor, filters = {}) {
    actor = await this.resolveActor(actor);

    const where = {};

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      where.sellerUserId = actor.id;
    } else if (actor.role === ROLES.RECYCLER) {
      where.buyerUserId = actor.id;
    } else if (actor.role === ROLES.CITIZEN) {
      where.OR = [
        { sellerUserId: actor.id },
        { buyerUserId: actor.id },
      ];
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Unauthorized role for bills');
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }
    if (filters.materialCategory) {
      where.materialCategory = filters.materialCategory;
    }
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = Math.min(parseInt(filters.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      prisma.transactionBill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: 'desc' },
        include: {
          buyerUser: { select: { id: true, name: true, role: true } },
          sellerUser: { select: { id: true, name: true, role: true } },
          materialLot: { select: { id: true, referenceNumber: true, category: true } },
          transaction: { select: { id: true, referenceNumber: true } },
        },
      }),
      prisma.transactionBill.count({ where }),
    ]);

    return {
      bills,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Record a financial correction/adjustment to an existing bill (e.g. from Phase 7 Dispute resolution)
   * Ensures non-destructive adjustment with updated verification hash and audit trail.
   *
   * @param {object|string} actor
   * @param {object} params - { billId, adjustmentAmount, adjustmentReason, disputeId }
   * @returns {Promise<object>}
   */
  async recordBillAdjustment(actor, { billId, adjustmentAmount, adjustmentReason, disputeId = null }) {
    const user = await this.resolveActor(actor);
    if (!user) throw AppError.unauthorized('User not found');

    const bill = await prisma.transactionBill.findUnique({
      where: { id: billId },
      include: { transaction: true },
    });

    if (!bill) {
      throw AppError.notFound('Bill not found');
    }

    // Tenancy check: Only admin or counterparties can adjust, typically admin in dispute resolution
    const isAdmin = user.role === ROLES.ADMIN;
    const isBuyer = bill.buyerUserId === user.id;
    const isSeller = bill.sellerUserId === user.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      throw AppError.forbidden('Access denied to adjust this bill');
    }

    const currentSubtotal = Number(bill.subtotal);
    const numericAdjustment = Number(adjustmentAmount);
    const newFinalAmount = Number((currentSubtotal + numericAdjustment).toFixed(2));

    if (newFinalAmount < 0) {
      throw AppError.badRequest('Adjustment cannot result in negative final payable amount');
    }

    const updatedVerificationHash = this.generateVerificationHash({
      billNumber: bill.billNumber,
      transactionId: bill.transactionId,
      finalAmount: newFinalAmount,
      generatedAt: bill.generatedAt.toISOString(),
    });

    const updatedBill = await prisma.$transaction(async (tx) => {
      // 1. Update bill
      const b = await tx.transactionBill.update({
        where: { id: billId },
        data: {
          adjustments: new Prisma.Decimal(numericAdjustment.toFixed(2)),
          finalAmount: new Prisma.Decimal(newFinalAmount.toFixed(2)),
          paymentStatus: 'ADJUSTED',
          notes: adjustmentReason ? `${bill.notes ? bill.notes + ' | ' : ''}Adjustment: ${adjustmentReason}` : bill.notes,
          disputeReference: disputeId || bill.disputeReference,
          verificationHash: updatedVerificationHash,
        },
      });

      // 2. Update canonical TransactionRecord
      await tx.transactionRecord.update({
        where: { id: bill.transactionId },
        data: {
          finalSaleValue: new Prisma.Decimal(newFinalAmount.toFixed(2)),
          amountPaid: new Prisma.Decimal(newFinalAmount.toFixed(2)),
        },
      });

      return b;
    });

    logger.info(`[BillService] Bill ${bill.billNumber} adjusted by ${numericAdjustment} to ${newFinalAmount}`);
    return updatedBill;
  }
}

module.exports = new BillService();
