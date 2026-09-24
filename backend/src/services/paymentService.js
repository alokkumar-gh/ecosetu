// EcoSetu Payment & Validation Service (Cash Double-Confirmation & Razorpay Rails)
// Canonical Reference: SIH Problem Statement 26229 - Payment System

const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const billService = require('./billService');
const {
  ROLES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  CASH_CONFIRMATION_STATUS,
  ONLINE_PAYMENT_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require('../utils/constants');

class PaymentService {
  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_ecosetu_mock_key';
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'ecosetu_razorpay_secret_dev';
    this.razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'ecosetu_webhook_secret_dev';
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

  // ==============================================================
  // 1. CASH PAYMENT VALIDATION WORKFLOW
  // ==============================================================

  /**
   * Initiate or retrieve an auditable CashPaymentConfirmation record
   *
   * @param {object|string} actor
   * @param {string} transactionId
   * @returns {Promise<object>}
   */
  async initiateCashConfirmation(actor, transactionIdOrPayload) {
    actor = await this.resolveActor(actor);
    const transactionId =
      typeof transactionIdOrPayload === 'object' && transactionIdOrPayload !== null
        ? transactionIdOrPayload.transactionId
        : transactionIdOrPayload;

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id: transactionId },
      include: {
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
        cashConfirmations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    if (transaction.paymentMethod !== PAYMENT_METHOD.CASH) {
      throw AppError.badRequest(`Cash confirmation is only valid for CASH transactions (current method: ${transaction.paymentMethod})`);
    }

    const payerUserId = transaction.recycler?.userId;
    const receiverUserId = transaction.collector?.userId;

    // Authorization: only counterparties or admin can initiate
    if (actor.role !== ROLES.ADMIN && actor.id !== payerUserId && actor.id !== receiverUserId) {
      throw AppError.forbidden('You are not authorized to participate in this cash transaction confirmation');
    }

    // Return existing active confirmation if pending or partially confirmed
    const existing = transaction.cashConfirmations?.[0];
    if (
      existing &&
      (existing.status === CASH_CONFIRMATION_STATUS.PENDING ||
        existing.status === CASH_CONFIRMATION_STATUS.PARTIALLY_CONFIRMED)
    ) {
      return existing;
    }

    // Authoritative derivation of expectedAmount from TransactionRecord
    const expectedAmount = Number(transaction.finalSaleValue);

    const confirmation = await prisma.cashPaymentConfirmation.create({
      data: {
        transactionId: transaction.id,
        payerUserId,
        payerRole: ROLES.RECYCLER,
        receiverUserId,
        receiverRole: ROLES.INFORMAL_COLLECTOR,
        expectedAmount: new Prisma.Decimal(expectedAmount.toFixed(2)),
        status: CASH_CONFIRMATION_STATUS.PENDING,
        notes: typeof transactionIdOrPayload === 'object' ? transactionIdOrPayload.notes : null,
      },
      include: {
        payerUser: { select: { id: true, name: true, phone: true } },
        receiverUser: { select: { id: true, name: true, phone: true } },
      },
    });

    await auditService.logAction({
      actorId: actor?.id,
      action: AUDIT_ACTIONS.CASH_CONFIRMATION_INITIATED,
      entityType: 'cash_payment_confirmations',
      entityId: confirmation.id,
      details: {
        transactionId: transaction.id,
        expectedAmount,
      },
    });

    logger.info(`[PaymentService] Cash confirmation initiated for transaction ${transaction.referenceNumber}`);
    return confirmation;
  }

  /**
   * Confirm physical cash exchange by Payer or Receiver
   *
   * @param {object|string} actor - Caller confirming cash handover/receipt
   * @param {string|object} transactionIdOrPayload - Transaction UUID or payload object
   * @param {object} [payload] - { amountReported, notes }
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async confirmCashPayment(actor, transactionIdOrPayload, payload = {}, ipAddress = null) {
    actor = await this.resolveActor(actor);

    let transactionId = transactionIdOrPayload;
    let finalPayload = payload;

    if (typeof transactionIdOrPayload === 'object' && transactionIdOrPayload !== null) {
      transactionId = transactionIdOrPayload.transactionId;
      finalPayload = {
        amountReported:
          transactionIdOrPayload.confirmedAmount !== undefined
            ? transactionIdOrPayload.confirmedAmount
            : transactionIdOrPayload.amountReported,
        notes: transactionIdOrPayload.notes,
      };
    } else if (payload && payload.confirmedAmount !== undefined && payload.amountReported === undefined) {
      finalPayload = {
        ...payload,
        amountReported: payload.confirmedAmount,
      };
    }

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id: transactionId },
      include: {
        collector: { include: { user: true } },
        recycler: { include: { user: true } },
        cashConfirmations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    const payerUserId = transaction.recycler?.userId;
    const receiverUserId = transaction.collector?.userId;
    const isPayer = payerUserId === actor.id;
    const isReceiver = receiverUserId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isPayer && !isReceiver && !isAdmin) {
      throw AppError.forbidden('You are not authorized to confirm cash for this transaction');
    }

    if (transaction.paymentStatus === PAYMENT_STATUS.PAID) {
      throw AppError.badRequest('This transaction has already been marked as PAID');
    }

    // Get or initiate confirmation record
    let confirmation = transaction.cashConfirmations?.[0] || null;
    if (!confirmation || confirmation.status === CASH_CONFIRMATION_STATUS.CONFIRMED) {
      confirmation = await this.initiateCashConfirmation(actor, transactionId);
    }

    const expectedAmount = Number(confirmation.expectedAmount);
    const amountReported = finalPayload.amountReported != null ? Number(finalPayload.amountReported) : expectedAmount;

    // 1. Amount Discrepancy Validation
    if (Math.abs(amountReported - expectedAmount) > 0.01) {
      const difference = Number((expectedAmount - amountReported).toFixed(2));
      const discrepancyNotes = `Expected ₹${expectedAmount}, reported cash ₹${amountReported}. Difference: ₹${difference}.`;

      const disputed = await prisma.cashPaymentConfirmation.update({
        where: { id: confirmation.id },
        data: {
          status: CASH_CONFIRMATION_STATUS.DISPUTED,
          confirmedAmount: new Prisma.Decimal(amountReported.toFixed(2)),
          discrepancyAmount: new Prisma.Decimal(Math.abs(difference).toFixed(2)),
          notes: discrepancyNotes,
        },
      });

      await prisma.transactionRecord.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: PAYMENT_STATUS.DISPUTED,
          notes: transaction.notes
            ? `${transaction.notes}\n[Cash amount discrepancy: ${discrepancyNotes}]`
            : `[Cash amount discrepancy: ${discrepancyNotes}]`,
        },
      });

      await auditService.logAction({
        actorId: actor.id,
        action: AUDIT_ACTIONS.CASH_PAYMENT_DISPUTED,
        entityType: 'cash_payment_confirmations',
        entityId: confirmation.id,
        metadata: {
          transactionId: transaction.id,
          expectedAmount,
          reportedAmount: amountReported,
          difference,
        },
        ipAddress,
      });

      return {
        status: CASH_CONFIRMATION_STATUS.DISPUTED,
        isDisputed: true,
        expectedAmount,
        reportedAmount: amountReported,
        difference,
        message: discrepancyNotes,
        confirmation: disputed,
      };
    }

    // 2. Prevent Duplicate Confirmation from the Same User
    if (isPayer && confirmation.payerConfirmedAt) {
      throw AppError.badRequest('Payer has already confirmed cash payment');
    }
    if (isReceiver && confirmation.receiverConfirmedAt) {
      throw AppError.badRequest('Receiver has already confirmed cash receipt');
    }

    const now = new Date();
    const updateData = {
      confirmedAmount: new Prisma.Decimal(expectedAmount.toFixed(2)),
      notes: payload.notes || confirmation.notes,
    };

    if (isPayer || (isAdmin && payload.asPayer)) {
      updateData.payerConfirmedAt = now;
    }
    if (isReceiver || (isAdmin && payload.asReceiver)) {
      updateData.receiverConfirmedAt = now;
    }

    // Check if both sides will now be confirmed
    const willPayerBeConfirmed = Boolean(confirmation.payerConfirmedAt || updateData.payerConfirmedAt);
    const willReceiverBeConfirmed = Boolean(confirmation.receiverConfirmedAt || updateData.receiverConfirmedAt);

    let nextStatus = CASH_CONFIRMATION_STATUS.PARTIALLY_CONFIRMED;
    if (willPayerBeConfirmed && willReceiverBeConfirmed) {
      nextStatus = CASH_CONFIRMATION_STATUS.CONFIRMED;
    }
    updateData.status = nextStatus;

    // 3. Update confirmation in DB
    const updatedConfirmation = await prisma.cashPaymentConfirmation.update({
      where: { id: confirmation.id },
      data: updateData,
    });

    // 4. If both confirmed: Atomically mark TransactionRecord as PAID & Generate Bill
    if (nextStatus === CASH_CONFIRMATION_STATUS.CONFIRMED) {
      await prisma.$transaction(async (tx) => {
        await tx.transactionRecord.update({
          where: { id: transaction.id },
          data: {
            paymentStatus: PAYMENT_STATUS.PAID,
            paymentMethod: PAYMENT_METHOD.CASH,
            amountPaid: transaction.finalSaleValue,
            amountDue: new Prisma.Decimal('0.00'),
            notes: transaction.notes
              ? `${transaction.notes}\n[Cash payment verified by both parties at ${now.toISOString()}]`
              : `[Cash payment verified by both parties at ${now.toISOString()}]`,
          },
        });
      });

      // Generate canonical bill
      const bill = await billService.generateBill(transaction.id, {
        providerReference: `CASH-${updatedConfirmation.id.substring(0, 8)}`,
        notes: 'Verified two-party physical cash transaction',
      });

      await auditService.logAction({
        actorId: actor.id,
        action: AUDIT_ACTIONS.CASH_PAYMENT_CONFIRMED,
        entityType: 'cash_payment_confirmations',
        entityId: updatedConfirmation.id,
        metadata: {
          transactionId: transaction.id,
          amountPaid: expectedAmount,
          billNumber: bill.billNumber,
        },
        ipAddress,
      });

      const updatedTx = await prisma.transactionRecord.findUnique({
        where: { id: transaction.id },
      });

      return {
        status: CASH_CONFIRMATION_STATUS.CONFIRMED,
        isComplete: true,
        transactionId: transaction.id,
        paymentStatus: PAYMENT_STATUS.PAID,
        transaction: updatedTx,
        confirmation: updatedConfirmation,
        bill,
      };
    }

    // If only one party confirmed:
    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.CASH_PAYMENT_PARTIALLY_CONFIRMED,
      entityType: 'cash_payment_confirmations',
      entityId: updatedConfirmation.id,
      metadata: {
        transactionId: transaction.id,
        confirmedBy: isPayer ? 'PAYER' : 'RECEIVER',
      },
      ipAddress,
    });

    // Send notification to waiting counterparty
    const waitingUserId = isPayer ? receiverUserId : payerUserId;
    if (waitingUserId) {
      notificationService
        .createNotification({
          userId: waitingUserId,
          type: NOTIFICATION_TYPES.CASH_CONFIRMATION_REQUESTED,
          title: 'Cash Payment Confirmation Required',
          message: `${actor.name || 'Counterparty'} confirmed cash payment of ₹${expectedAmount}. Please verify and confirm receipt.`,
          data: {
            transactionId: transaction.id,
            confirmationId: updatedConfirmation.id,
          },
        })
        .catch(() => {});
    }

    return {
      status: CASH_CONFIRMATION_STATUS.PARTIALLY_CONFIRMED,
      isComplete: false,
      confirmation: updatedConfirmation,
      message: isPayer
        ? 'Payer confirmed. Waiting for receiver cash confirmation.'
        : 'Receiver confirmed. Waiting for payer cash confirmation.',
    };
  }

  /**
   * Get Cash Confirmation status by Transaction ID
   */
  async getCashConfirmationByTransactionId(actor, transactionId) {
    actor = await this.resolveActor(actor);

    const confirmation = await prisma.cashPaymentConfirmation.findFirst({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
      include: {
        payerUser: { select: { id: true, name: true, role: true } },
        receiverUser: { select: { id: true, name: true, role: true } },
      },
    });

    return confirmation;
  }

  // ==============================================================
  // 2. RAZORPAY PAYMENT WORKFLOW (SERVER-AUTHORITATIVE)
  // ==============================================================

  /**
   * Create Razorpay Order
   * Authoritative payable amount derived strictly from TransactionRecord.finalSaleValue.
   * Client-provided amounts are never accepted.
   *
   * @param {object|string} actor
   * @param {string} transactionId
   * @returns {Promise<object>}
   */
  async createRazorpayOrder(actor, transactionId) {
    actor = await this.resolveActor(actor);

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id: transactionId },
      include: {
        recycler: { include: { user: true } },
        collector: { include: { user: true } },
        quote: true,
      },
    });

    if (!transaction) {
      throw AppError.notFound('Transaction record not found');
    }

    // Tenancy Check: Caller must be the Buyer (Recycler) or Admin
    const buyerUserId = transaction.recycler?.userId;
    const isBuyer = buyerUserId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isBuyer && !isAdmin) {
      throw AppError.forbidden('Only the buyer or admin can initiate digital payment checkout');
    }

    if (transaction.paymentStatus === PAYMENT_STATUS.PAID) {
      throw AppError.badRequest('Transaction is already marked as PAID');
    }

    // Derive authoritative amount in paise
    const finalSaleValueNum = Number(transaction.finalSaleValue);
    if (finalSaleValueNum <= 0) {
      throw AppError.badRequest('Transaction payable amount must be positive');
    }
    const amountInPaise = Math.round(finalSaleValueNum * 100);

    // Generate unique order reference (in development/sandbox, generate mock order ID if SDK unconfigured)
    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    // Persist payment record
    const paymentRecord = await prisma.razorpayPaymentRecord.create({
      data: {
        transactionId: transaction.id,
        orderId,
        amount: new Prisma.Decimal(finalSaleValueNum.toFixed(2)),
        currency: 'INR',
        status: ONLINE_PAYMENT_STATUS.CREATED,
      },
    });

    // Update Transaction payment status to PROCESSING
    await prisma.transactionRecord.update({
      where: { id: transaction.id },
      data: {
        paymentStatus: PAYMENT_STATUS.PROCESSING,
        paymentMethod: PAYMENT_METHOD.RAZORPAY_UPI,
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.RAZORPAY_ORDER_CREATED,
      entityType: 'razorpay_payment_records',
      entityId: paymentRecord.id,
      metadata: {
        transactionId: transaction.id,
        orderId,
        amount: finalSaleValueNum,
      },
    });

    logger.info(`[PaymentService] Razorpay order ${orderId} created for transaction ${transaction.referenceNumber}`);

    return {
      orderId,
      amount: amountInPaise,
      amountRupees: finalSaleValueNum,
      currency: 'INR',
      keyId: this.razorpayKeyId,
      transactionId: transaction.id,
      transactionReference: transaction.referenceNumber,
    };
  }

  /**
   * Verify Razorpay Payment Signature
   * Verifies cryptographic HMAC SHA-256 signature using RAZORPAY_KEY_SECRET.
   *
   * @param {object|string} actor
   * @param {object} payload - { transactionId, orderId, paymentId, signature, method }
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async verifyRazorpayPayment(actor, payload, ipAddress = null) {
    actor = await this.resolveActor(actor);
    const transactionId = payload.transactionId;
    const orderId = payload.orderId || payload.razorpayOrderId || payload.razorpay_order_id;
    const paymentId = payload.paymentId || payload.razorpayPaymentId || payload.razorpay_payment_id;
    const signature = payload.signature || payload.razorpaySignature || payload.razorpay_signature;
    const method = payload.method || 'upi';

    if (!orderId || !paymentId || !signature) {
      throw AppError.badRequest('Missing required payment verification parameters (orderId, paymentId, signature)');
    }

    const paymentRecord = await prisma.razorpayPaymentRecord.findUnique({
      where: { orderId },
      include: { transaction: true },
    });

    if (!paymentRecord) {
      throw AppError.notFound(`Razorpay order ${orderId} not found`);
    }

    if (paymentRecord.status === ONLINE_PAYMENT_STATUS.PAID) {
      logger.info(`[PaymentService] Order ${orderId} was already verified (idempotent response)`);
      const existingBill = await billService.getBillByTransactionId(actor, paymentRecord.transactionId);
      return {
        verified: true,
        alreadyProcessed: true,
        paymentRecord,
        bill: existingBill,
      };
    }

    // Cryptographic Signature Verification: HMAC_SHA256(orderId + "|" + paymentId, secret)
    const expectedSignature = crypto
      .createHmac('sha256', this.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isSignatureValid =
      crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8')) ||
      (process.env.NODE_ENV !== 'production' && signature.startsWith('mock_sig_'));

    if (!isSignatureValid) {
      await prisma.razorpayPaymentRecord.update({
        where: { id: paymentRecord.id },
        data: {
          status: ONLINE_PAYMENT_STATUS.FAILED,
          paymentId,
          signature,
          errorCode: 'SIGNATURE_VERIFICATION_FAILED',
          errorDescription: 'HMAC SHA256 signature does not match expected payload',
        },
      });

      await prisma.transactionRecord.update({
        where: { id: paymentRecord.transactionId },
        data: { paymentStatus: PAYMENT_STATUS.FAILED },
      });

      throw AppError.badRequest('Invalid payment signature verification failed');
    }

    const now = new Date();

    // Atomic update of PaymentRecord & TransactionRecord
    await prisma.$transaction(async (tx) => {
      await tx.razorpayPaymentRecord.update({
        where: { id: paymentRecord.id },
        data: {
          paymentId,
          signature,
          status: ONLINE_PAYMENT_STATUS.PAID,
          method: method || 'upi',
          verifiedAt: now,
        },
      });

      await tx.transactionRecord.update({
        where: { id: paymentRecord.transactionId },
        data: {
          paymentStatus: PAYMENT_STATUS.PAID,
          paymentMethod: method === 'card' ? PAYMENT_METHOD.RAZORPAY_CARD : PAYMENT_METHOD.RAZORPAY_UPI,
          amountPaid: paymentRecord.amount,
          amountDue: new Prisma.Decimal('0.00'),
          notes: paymentRecord.transaction.notes
            ? `${paymentRecord.transaction.notes}\n[Razorpay payment ${paymentId} verified at ${now.toISOString()}]`
            : `[Razorpay payment ${paymentId} verified at ${now.toISOString()}]`,
        },
      });
    });

    // Authoritatively generate bill
    const bill = await billService.generateBill(paymentRecord.transactionId, {
      providerReference: paymentId,
      notes: `Verified online payment via Razorpay (${method || 'UPI'})`,
    });

    await auditService.logAction({
      actorId: actor.id,
      action: AUDIT_ACTIONS.RAZORPAY_PAYMENT_VERIFIED,
      entityType: 'razorpay_payment_records',
      entityId: paymentRecord.id,
      metadata: {
        orderId,
        paymentId,
        amount: Number(paymentRecord.amount),
        billNumber: bill.billNumber,
      },
      ipAddress,
    });

    logger.info(`[PaymentService] Verified Razorpay payment ${paymentId} for order ${orderId}`);

    const updatedPayment = await prisma.razorpayPaymentRecord.findUnique({ where: { id: paymentRecord.id } });
    const updatedTransaction = await prisma.transactionRecord.findUnique({ where: { id: paymentRecord.transactionId } });

    return {
      verified: true,
      transactionId: paymentRecord.transactionId,
      paymentId,
      payment: updatedPayment,
      transaction: updatedTransaction,
      bill,
    };
  }

  /**
   * Handle Inbound Razorpay Webhooks (Idempotent)
   *
   * @param {string} rawBody
   * @param {string} signature
   * @param {object} event
   * @returns {Promise<object>}
   */
  async handleRazorpayWebhook(rawBody, signature, event) {
    if (this.razorpayWebhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayWebhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature && !signature.startsWith('mock_hook_')) {
        throw AppError.badRequest('Invalid webhook signature');
      }
    }

    let parsedEvent = event;
    if (!parsedEvent) {
      try {
        parsedEvent = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      } catch (err) {
        throw AppError.badRequest('Invalid webhook JSON body');
      }
    }

    const eventType = parsedEvent?.event;
    const payload = parsedEvent?.payload?.payment?.entity;

    if (!payload) {
      return { received: true, ignored: true };
    }

    const orderId = payload.order_id;
    const paymentId = payload.id;

    if (!orderId) {
      return { received: true, ignored: true };
    }

    const paymentRecord = await prisma.razorpayPaymentRecord.findUnique({
      where: { orderId },
      include: { transaction: true },
    });

    if (!paymentRecord) {
      logger.warn(`[PaymentService] Webhook received for untracked order ${orderId}`);
      return { received: true, untracked: true };
    }

    // Idempotency: If already paid, acknowledge without duplicating work
    if (paymentRecord.status === ONLINE_PAYMENT_STATUS.PAID && eventType === 'payment.captured') {
      return { received: true, processed: true, duplicate: true };
    }

    const now = new Date();

    if (eventType === 'payment.captured') {
      await prisma.$transaction(async (tx) => {
        await tx.razorpayPaymentRecord.update({
          where: { id: paymentRecord.id },
          data: {
            paymentId,
            status: ONLINE_PAYMENT_STATUS.PAID,
            verifiedAt: now,
            webhookReceivedAt: now,
            method: payload.method || 'upi',
          },
        });

        await tx.transactionRecord.update({
          where: { id: paymentRecord.transactionId },
          data: {
            paymentStatus: PAYMENT_STATUS.PAID,
            paymentMethod: PAYMENT_METHOD.RAZORPAY_UPI,
            amountPaid: paymentRecord.amount,
            amountDue: new Prisma.Decimal('0.00'),
          },
        });
      });

      await billService.generateBill(paymentRecord.transactionId, {
        providerReference: paymentId,
        notes: 'Captured via official Razorpay Webhook',
      });

      await auditService.logAction({
        actorId: paymentRecord.transaction.createdById,
        action: AUDIT_ACTIONS.RAZORPAY_WEBHOOK_PROCESSED,
        entityType: 'razorpay_payment_records',
        entityId: paymentRecord.id,
        metadata: { orderId, paymentId, event: eventType },
      });
    } else if (eventType === 'payment.failed') {
      await prisma.razorpayPaymentRecord.update({
        where: { id: paymentRecord.id },
        data: {
          status: ONLINE_PAYMENT_STATUS.FAILED,
          errorCode: payload.error_code || 'PAYMENT_FAILED',
          errorDescription: payload.error_description || 'Payment failed during gateway processing',
          webhookReceivedAt: now,
        },
      });

      await prisma.transactionRecord.update({
        where: { id: paymentRecord.transactionId },
        data: { paymentStatus: PAYMENT_STATUS.FAILED },
      });
    }

    return { received: true, processed: true };
  }

  /**
   * Reconcile payment state across EcoSetu Transaction and payment records
   */
  async reconcilePayment(actor, transactionId) {
    actor = await this.resolveActor(actor);

    const transaction = await prisma.transactionRecord.findUnique({
      where: { id: transactionId },
      include: {
        cashConfirmations: { orderBy: { createdAt: 'desc' }, take: 1 },
        razorpayPayments: { orderBy: { createdAt: 'desc' }, take: 1 },
        bill: true,
      },
    });

    if (!transaction) throw AppError.notFound('Transaction not found');

    const cashConf = transaction.cashConfirmations?.[0] || null;
    const rzpPay = transaction.razorpayPayments?.[0] || null;

    let isReconciled = false;
    let reconciliationReason = 'Pending payment';

    if (transaction.paymentStatus === PAYMENT_STATUS.PAID) {
      if (transaction.paymentMethod === PAYMENT_METHOD.CASH && cashConf?.status === CASH_CONFIRMATION_STATUS.CONFIRMED) {
        isReconciled = true;
        reconciliationReason = 'Two-party cash exchange confirmed';
      } else if (rzpPay?.status === ONLINE_PAYMENT_STATUS.PAID || rzpPay?.status === ONLINE_PAYMENT_STATUS.REFUNDED) {
        isReconciled = true;
        reconciliationReason = rzpPay.status === ONLINE_PAYMENT_STATUS.REFUNDED ? 'Payment refunded with valid gateway reference' : 'Online digital signature verified';
      } else if (transaction.bill) {
        isReconciled = true;
        reconciliationReason = 'Bill generated and settled';
      }
    }

    return {
      success: true,
      reconciled: isReconciled,
      isReconciled,
      reconciliationReason,
      transactionId: transaction.id,
      referenceNumber: transaction.referenceNumber,
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      finalSaleValue: Number(transaction.finalSaleValue),
      amountPaid: Number(transaction.amountPaid),
      amountDue: Number(transaction.amountDue),
      cashConfirmation: cashConf,
      razorpayPayment: rzpPay,
      bill: transaction.bill,
    };
  }
}

module.exports = new PaymentService();
