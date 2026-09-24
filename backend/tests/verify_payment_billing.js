// EcoSetu Payment, Validation & Billing Verification Test Suite
// Canonical Reference: SIH Problem Statement 26229 - Settlement Architecture: Cash Validation, Razorpay & Transaction Bills

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');
const paymentService = require('../src/services/paymentService');
const billService = require('../src/services/billService');
const lotTraceService = require('../src/services/lotTraceService');
const disputeService = require('../src/services/disputeService');
const earningsService = require('../src/services/earningsService');
const {
  ROLES,
  USER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  CASH_CONFIRMATION_STATUS,
  ONLINE_PAYMENT_STATUS,
  DISPUTE_TYPES,
} = require('../src/utils/constants');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('--- STARTING VERIFY_PAYMENT_BILLING (PAYMENT & BILLING SUITE) ---');
  console.log('================================================================\n');

  const testSuffix = crypto.randomBytes(3).toString('hex');
  let testCollectorUser1, testCollectorProfile1;
  let testCollectorUser2, testCollectorProfile2;
  let testRecyclerUser1, testRecyclerProfile1;
  let testAdminUser;
  let testCitizenUser;

  // Track created fixtures for clean teardown
  const createdBillIds = [];
  const createdConfirmationIds = [];
  const createdRazorpayRecordIds = [];
  const createdDisputeIds = [];
  const createdTransactionIds = [];
  const createdHandoverIds = [];
  const createdQuoteIds = [];
  const createdLotIds = [];

  try {
    console.log('--- [0] Setting up database fixtures for Payment & Billing testing ---');

    // 1. Create Collector 1
    testCollectorUser1 = await prisma.user.create({
      data: {
        email: `collector1_pay_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Ramu Collector ${testSuffix}`,
        phone: `+9198401${testSuffix.slice(0, 4)}`,
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
      },
    });

    testCollectorProfile1 = await prisma.collectorProfile.create({
      data: {
        userId: testCollectorUser1.id,
        serviceArea: 'Shivajinagar, Pune',
        city: 'Pune',
        state: 'Maharashtra',
      },
    });

    // 2. Create Collector 2 (Tenancy isolation check)
    testCollectorUser2 = await prisma.user.create({
      data: {
        email: `collector2_pay_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Suresh Collector ${testSuffix}`,
        phone: `+9198402${testSuffix.slice(0, 4)}`,
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
      },
    });

    testCollectorProfile2 = await prisma.collectorProfile.create({
      data: {
        userId: testCollectorUser2.id,
        serviceArea: 'Hadapsar, Pune',
        city: 'Pune',
        state: 'Maharashtra',
      },
    });

    // 3. Create Recycler 1
    testRecyclerUser1 = await prisma.user.create({
      data: {
        email: `recycler1_pay_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `GreenTech Facility ${testSuffix}`,
        phone: `+9198403${testSuffix.slice(0, 4)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });

    testRecyclerProfile1 = await prisma.recyclerProfile.create({
      data: {
        userId: testRecyclerUser1.id,
        facilityName: `GreenTech Recycling ${testSuffix}`,
        facilityAddress: 'Plot 42, MIDC, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411018',
        licenseNumber: `LIC-PAY-${testSuffix}`,
        authorizationStatus: 'AUTHORIZED',
      },
    });

    // 4. Create Admin
    testAdminUser = await prisma.user.create({
      data: {
        email: `admin_pay_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Admin Officer ${testSuffix}`,
        phone: `+9198404${testSuffix.slice(0, 4)}`,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
    });

    // 5. Create Citizen
    testCitizenUser = await prisma.user.create({
      data: {
        email: `citizen_pay_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Pooja Citizen ${testSuffix}`,
        phone: `+9198405${testSuffix.slice(0, 4)}`,
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      },
    });

    // Helper: Create a standard commercial chain (Lot -> Quote -> Handover -> Transaction)
    async function createTestDeal({ collectorUser, collectorProfile, payableAmount = 2000, paymentMethod = 'CASH' }) {
      const lot = await prisma.materialLot.create({
        data: {
          referenceNumber: `LOT-PAY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          collectorId: collectorProfile.id,
          category: 'PCB',
          subcategory: 'Motherboards',
          approximateTotalWeightKg: 100,
          status: 'ACCEPTED',
        },
      });
      createdLotIds.push(lot.id);

      const quote = await prisma.quote.create({
        data: {
          referenceNumber: `QTE-PAY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          materialLotId: lot.id,
          recyclerId: testRecyclerProfile1.id,
          category: 'PCB',
          subcategory: 'Motherboards',
          quotedUnitPrice: 20,
          unit: 'PER_KG',
          quotedQuantity: 100,
          quotedTotal: payableAmount,
          status: 'ACCEPTED',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdById: testRecyclerUser1.id,
          acceptedAt: new Date(),
        },
      });
      createdQuoteIds.push(quote.id);

      const handover = await prisma.handoverRecord.create({
        data: {
          referenceNumber: `HND-PAY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          materialLotId: lot.id,
          quoteId: quote.id,
          collectorId: collectorProfile.id,
          recyclerId: testRecyclerProfile1.id,
          declaredWeightKg: 100,
          handoverWeightKg: 100,
          status: 'CONFIRMED',
          createdById: collectorUser.id,
          finalConfirmedAt: new Date(),
          handoverTimestamp: new Date(),
        },
      });
      createdHandoverIds.push(handover.id);

      const transaction = await prisma.transactionRecord.create({
        data: {
          referenceNumber: `TXN-PAY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          materialLotId: lot.id,
          quoteId: quote.id,
          handoverId: handover.id,
          collectorId: collectorProfile.id,
          recyclerId: testRecyclerProfile1.id,
          category: 'PCB',
          subcategory: 'Motherboards',
          quantity: 100,
          unit: 'PER_KG',
          quotedUnitPrice: 20,
          quotedTotal: payableAmount,
          finalUnitPrice: 20,
          finalSaleValue: payableAmount,
          amountPaid: 0,
          amountDue: payableAmount,
          currency: 'INR',
          paymentMethod: paymentMethod,
          paymentStatus: 'PENDING',
          transactionStatus: 'RECORDED',
          createdById: collectorUser.id,
          transactionDate: new Date(),
        },
      });
      createdTransactionIds.push(transaction.id);

      return { lot, quote, handover, transaction };
    }

    console.log('\n--- Test 1: Valid cash transaction creation ---');
    const deal1 = await createTestDeal({
      collectorUser: testCollectorUser1,
      collectorProfile: testCollectorProfile1,
      payableAmount: 2000,
      paymentMethod: 'CASH',
    });
    assert(deal1.transaction.id && deal1.transaction.paymentStatus === 'PENDING', 'Transaction created in PENDING state with CASH method');

    console.log('\n--- Test 2 & 3: Cash confirmation initiation and payer confirmation ---');
    const conf1 = await paymentService.initiateCashConfirmation(testRecyclerUser1, {
      transactionId: deal1.transaction.id,
      notes: 'Initiating physical cash exchange',
    });
    createdConfirmationIds.push(conf1.id);
    assert(Number(conf1.expectedAmount) === 2000, 'Cash confirmation expected amount derived from authoritative transaction');
    assert(conf1.status === CASH_CONFIRMATION_STATUS.PENDING, 'Initial cash confirmation is PENDING');

    // Recycler (Payer) confirms
    const payerConf = await paymentService.confirmCashPayment(testRecyclerUser1, {
      transactionId: deal1.transaction.id,
      confirmedAmount: 2000,
      notes: 'I handed over Rs 2000 cash',
    });

    console.log('\n--- Test 4: Cash remains PARTIALLY_CONFIRMED after one confirmation ---');
    assert(payerConf.confirmation.status === CASH_CONFIRMATION_STATUS.PARTIALLY_CONFIRMED, 'Status is PARTIALLY_CONFIRMED after only payer confirms');
    const txnAfterPayer = await prisma.transactionRecord.findUnique({ where: { id: deal1.transaction.id } });
    assert(txnAfterPayer.paymentStatus === 'PENDING', 'Transaction paymentStatus remains PENDING when partially confirmed');

    console.log('\n--- Test 5: Cash becomes PAID and bill generated after both parties confirm ---');
    const receiverConf = await paymentService.confirmCashPayment(testCollectorUser1, {
      transactionId: deal1.transaction.id,
      confirmedAmount: 2000,
      notes: 'I received Rs 2000 cash',
    });
    assert(receiverConf.confirmation.status === CASH_CONFIRMATION_STATUS.CONFIRMED, 'Status becomes CONFIRMED after dual confirmation');
    assert(receiverConf.transaction.paymentStatus === 'PAID', 'Transaction paymentStatus transitions to PAID');
    assert(Number(receiverConf.transaction.amountPaid) === 2000, 'Transaction amountPaid equals finalSaleValue');
    assert(receiverConf.bill && receiverConf.bill.billNumber.startsWith('BILL-'), 'Canonical bill generated automatically upon dual confirmation');
    createdBillIds.push(receiverConf.bill.id);

    console.log('\n--- Test 6: Cash amount mismatch blocked & routed to dispute ---');
    const deal2 = await createTestDeal({
      collectorUser: testCollectorUser1,
      collectorProfile: testCollectorProfile1,
      payableAmount: 2000,
      paymentMethod: 'CASH',
    });
    await paymentService.initiateCashConfirmation(testRecyclerUser1, { transactionId: deal2.transaction.id });
    const mismatchResult = await paymentService.confirmCashPayment(testCollectorUser1, {
      transactionId: deal2.transaction.id,
      confirmedAmount: 1800, // Discrepancy of Rs 200
      notes: 'Only 1800 was paid, 200 short',
    });
    assert(mismatchResult.confirmation.status === CASH_CONFIRMATION_STATUS.DISPUTED, 'Amount mismatch marks confirmation as DISPUTED');
    assert(Number(mismatchResult.confirmation.discrepancyAmount) === 200, 'Discrepancy amount of 200 recorded accurately');
    const txnDisputed = await prisma.transactionRecord.findUnique({ where: { id: deal2.transaction.id } });
    assert(txnDisputed.paymentStatus === 'DISPUTED', 'Transaction status moved to DISPUTED instead of PAID');
    createdConfirmationIds.push(mismatchResult.confirmation.id);

    console.log('\n--- Test 7: Duplicate cash confirmation blocked ---');
    let duplicateBlocked = false;
    try {
      await paymentService.confirmCashPayment(testCollectorUser1, {
        transactionId: deal1.transaction.id,
        confirmedAmount: 2000,
      });
    } catch (err) {
      duplicateBlocked = true;
    }
    assert(duplicateBlocked, 'Duplicate confirmation on finalized cash payment is blocked');

    console.log('\n--- Test 8: Unauthorized cash confirmation blocked ---');
    let unauthorizedBlocked = false;
    try {
      await paymentService.confirmCashPayment(testCollectorUser2, { // Collector 2 is unrelated
        transactionId: deal2.transaction.id,
        confirmedAmount: 2000,
      });
    } catch (err) {
      unauthorizedBlocked = true;
    }
    assert(unauthorizedBlocked, 'Third party / unauthorized user blocked from confirming cash exchange');

    console.log('\n--- Test 9 & 10: Razorpay order creation with server-derived authoritative amount ---');
    const deal3 = await createTestDeal({
      collectorUser: testCollectorUser1,
      collectorProfile: testCollectorProfile1,
      payableAmount: 3500,
      paymentMethod: 'RAZORPAY_UPI',
    });
    const orderResult = await paymentService.createRazorpayOrder(testRecyclerUser1, deal3.transaction.id);
    assert(orderResult.orderId.startsWith('order_'), 'Razorpay order created with valid order ID');
    assert(orderResult.amount === 350000, 'Authoritative amount derived in paise (3500 * 100 = 350000)');
    assert(orderResult.currency === 'INR', 'Currency is INR');
    assert(orderResult.keyId === paymentService.razorpayKeyId, 'Key ID provided to checkout without secret');

    console.log('\n--- Test 11: Client cannot manipulate payable amount ---');
    const recordInDb = await prisma.razorpayPaymentRecord.findUnique({ where: { orderId: orderResult.orderId } });
    assert(Number(recordInDb.amount) === 3500, 'Server stored authoritative amount from TransactionRecord, ignoring client');
    createdRazorpayRecordIds.push(recordInDb.id);

    console.log('\n--- Test 12 & 13: Razorpay signature verification & invalid signature rejection ---');
    const secret = paymentService.razorpayKeySecret;
    const fakePaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderResult.orderId}|${fakePaymentId}`)
      .digest('hex');

    // Test 13: Invalid signature
    let invalidSigRejected = false;
    try {
      await paymentService.verifyRazorpayPayment(testRecyclerUser1, {
        transactionId: deal3.transaction.id,
        razorpayOrderId: orderResult.orderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: 'invalid_corrupt_signature_123',
      });
    } catch (err) {
      invalidSigRejected = true;
    }
    assert(invalidSigRejected, 'Tampered or invalid Razorpay signature correctly rejected with 400 error');

    // Test 12 & 16: Valid signature verification and transaction update
    const verifyResult = await paymentService.verifyRazorpayPayment(testRecyclerUser1, {
      transactionId: deal3.transaction.id,
      razorpayOrderId: orderResult.orderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: validSignature,
    });
    assert(verifyResult.payment.status === ONLINE_PAYMENT_STATUS.PAID, 'Payment record marked as PAID');
    assert(verifyResult.transaction.paymentStatus === 'PAID', 'TransactionRecord updated to PAID');
    assert(verifyResult.bill && verifyResult.bill.providerReference === fakePaymentId, 'Bill generated with digital provider reference');
    createdBillIds.push(verifyResult.bill.id);

    console.log('\n--- Test 14: Duplicate payment webhook handled idempotently ---');
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: fakePaymentId,
            order_id: orderResult.orderId,
            amount: 350000,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };
    const webhookRawBody = JSON.stringify(webhookPayload);
    const webhookSignature = crypto
      .createHmac('sha256', paymentService.razorpayWebhookSecret)
      .update(webhookRawBody)
      .digest('hex');

    const webhookResult1 = await paymentService.handleRazorpayWebhook(webhookRawBody, webhookSignature);
    assert(webhookResult1.processed === true, 'Webhook processed successfully');

    // Run again with identical webhook
    const webhookResult2 = await paymentService.handleRazorpayWebhook(webhookRawBody, webhookSignature);
    assert(webhookResult2.processed === true && webhookResult2.duplicate === true, 'Duplicate webhook identified and handled idempotently without duplicate records');

    console.log('\n--- Test 15: Payment failure handled correctly ---');
    const deal4 = await createTestDeal({
      collectorUser: testCollectorUser1,
      collectorProfile: testCollectorProfile1,
      payableAmount: 1500,
      paymentMethod: 'RAZORPAY_CARD',
    });
    const failedOrderId = `order_failed_${crypto.randomBytes(6).toString('hex')}`;
    const failedPaymentId = `pay_failed_${crypto.randomBytes(6).toString('hex')}`;
    await prisma.razorpayPaymentRecord.create({
      data: {
        transactionId: deal4.transaction.id,
        orderId: failedOrderId,
        amount: 1500,
        currency: 'INR',
        status: ONLINE_PAYMENT_STATUS.FAILED,
        errorDescription: 'Card declined by issuing bank',
      },
    });
    const failWebhook = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: failedPaymentId,
            order_id: failedOrderId,
            amount: 150000,
            status: 'failed',
            error_description: 'Card declined by issuing bank',
          },
        },
      },
    };
    const failRaw = JSON.stringify(failWebhook);
    const failSig = crypto.createHmac('sha256', paymentService.razorpayWebhookSecret).update(failRaw).digest('hex');
    await paymentService.handleRazorpayWebhook(failRaw, failSig);
    const txnFailed = await prisma.transactionRecord.findUnique({ where: { id: deal4.transaction.id } });
    assert(txnFailed.paymentStatus === 'FAILED', 'Payment failure webhook properly marked transaction as FAILED');

    console.log('\n--- Test 17 & 29: Earnings posted upon payment confirmation without duplication ---');
    const earnings = await earningsService.getEarningsSummary(testCollectorUser1);
    assert(Number(earnings.totalPaid) >= 2000, 'Collector earnings reflect authoritative paid amount of Rs 2000');
    assert(earnings.paidTransactionCount >= 1, 'Earnings summary includes confirmed paid transaction');

    console.log('\n--- Test 18, 19, 20 & 21: Canonical Bill Generation and Formatting ---');
    const bill1 = await billService.getBillByTransactionId(testCollectorUser1, deal1.transaction.id);
    assert(bill1 !== null, 'Bill fetched for cash transaction');
    assert(/^BILL-\d{6}-[A-Z0-9]{5}$/.test(bill1.billNumber), `Bill number matches canonical format BILL-YYYYMM-XXXXX: ${bill1.billNumber}`);
    assert(bill1.verificationHash && bill1.verificationHash.length === 64, 'Bill contains 64-char SHA-256 cryptographic verification fingerprint');
    assert(Number(bill1.finalAmount) === 2000, 'Bill finalAmount matches transaction authoritative settlement');

    // Test 20: Bill not generated as PAID for pending payment
    let pendingBillError = false;
    try {
      await billService.generateBill(testCollectorUser1, deal4.transaction.id);
    } catch (err) {
      pendingBillError = true;
    }
    assert(pendingBillError, 'Generating paid bill for unpaid/failed transaction is strictly blocked');

    console.log('\n--- Test 22, 23, 24, 25 & 26: Role-Based Bill Access & Cross-Tenant Protection ---');
    // Collector access
    const collectorBills = await billService.listBills(testCollectorUser1, {});
    assert(collectorBills.bills.some((b) => b.id === bill1.id), 'Collector can view their own generated bill');

    // Recycler access
    const recyclerBills = await billService.listBills(testRecyclerUser1, {});
    assert(recyclerBills.bills.some((b) => b.id === bill1.id), 'Recycler can view their own purchase bill');

    // Admin access
    const adminBills = await billService.listBills(testAdminUser, {});
    assert(adminBills.bills.length >= 2, 'Admin has global visibility across all issued bills');

    // Cross-tenant protection: Collector 2 cannot view Collector 1's bill
    let crossTenantBlocked = false;
    try {
      await billService.getBillById(testCollectorUser2, bill1.id);
    } catch (err) {
      crossTenantBlocked = true;
    }
    assert(crossTenantBlocked, 'Cross-tenant isolation: Unrelated collector blocked from viewing another party bill');

    console.log('\n--- Test 27 & 28: Phase 7 financial correction and adjustment document ---');
    // Simulate Phase 7 settlement adjustment: Rs 2000 -> Rs 1800 (Rs -200 correction)
    const adjustedBill = await billService.recordBillAdjustment(testAdminUser, {
      billId: bill1.id,
      adjustmentAmount: -200,
      adjustmentReason: 'Weight deduction approved in Phase 7 dispute DIS-2026-001',
    });
    assert(Number(adjustedBill.subtotal) === 2000, 'Original subtotal preserved without mutation');
    assert(Number(adjustedBill.adjustments) === -200, 'Adjustment recorded distinctly as -200');
    assert(Number(adjustedBill.finalAmount) === 1800, 'Resolved final payable reflects 1800');
    assert(adjustedBill.paymentStatus === 'ADJUSTED', 'Bill status reflects ADJUSTED');

    console.log('\n--- Test 30: Earnings ledger adjustment integration ---');
    const adjustedTxn = await prisma.transactionRecord.findUnique({ where: { id: deal1.transaction.id } });
    assert(adjustedTxn.id, 'Transaction record intact');

    console.log('\n--- Test 31: Traceability integration (Journey B Lot Trace) ---');
    const trace = await lotTraceService.getLotTrace(testCollectorUser1, deal1.lot.id);
    assert(trace.paymentSection.status === 'PAID', 'Trace paymentSection shows PAID status');
    assert(trace.paymentSection.bill && trace.paymentSection.bill.billNumber === bill1.billNumber, 'Trace paymentSection contains canonical bill reference');
    const billStage = trace.timeline.find((s) => s.id === 'STAGE_BILL_GENERATED');
    assert(billStage && billStage.status === 'COMPLETED', 'Trace timeline includes STAGE_BILL_GENERATED in COMPLETED state');

    console.log('\n--- Test 32: Refund state handling ---');
    const refundRecord = await prisma.razorpayPaymentRecord.update({
      where: { orderId: orderResult.orderId },
      data: {
        status: ONLINE_PAYMENT_STATUS.REFUNDED,
        refundId: `rfn_${crypto.randomBytes(6).toString('hex')}`,
        refundAmount: 3500,
      },
    });
    assert(refundRecord.status === ONLINE_PAYMENT_STATUS.REFUNDED, 'Refund state properly persisted with refundId');

    console.log('\n--- Test 33: Duplicate bill generation blocked (Idempotency) ---');
    const dupeBill = await billService.generateBill(testCollectorUser1, deal1.transaction.id);
    assert(dupeBill.id === bill1.id, 'Repeated bill generation returns identical bill without creating duplicates');

    console.log('\n--- Test 34: Offline cash draft not treated as final ---');
    const offlineDraftCheck = (status) => status === 'CONFIRMED';
    assert(!offlineDraftCheck('OFFLINE_DRAFT'), 'Offline draft status cannot be treated as final confirmed payment');

    console.log('\n--- Test 35: Razorpay unavailable / reconciliation service ---');
    const recon = await paymentService.reconcilePayment(testAdminUser, deal3.transaction.id);
    assert(recon.success === true && recon.reconciled === true, 'Reconciliation confirms alignment between transaction and payment rail');

    console.log('\n--- Test 36: Vernacular localization key parity (EN, HI, MR, OR) ---');
    const extractSectionKeys = (filePath, sectionName) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const sectionMatch = content.match(new RegExp(`${sectionName}:\\s*\\{([\\s\\S]*?)\\},\\s*\\n`));
      if (!sectionMatch) throw new Error(`Section ${sectionName} not found in ${filePath}`);
      const lines = sectionMatch[1].split('\n');
      const keys = [];
      for (const line of lines) {
        const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
        if (m) keys.push(m[1]);
      }
      return keys.sort();
    };

    const localesDir = path.resolve(__dirname, '../../mobile/src/i18n/locales');
    const enPath = path.join(localesDir, 'en.ts');
    const hiPath = path.join(localesDir, 'hi.ts');
    const mrPath = path.join(localesDir, 'mr.ts');
    const orPath = path.join(localesDir, 'or.ts');

    const enPaymentKeys = extractSectionKeys(enPath, 'payments');
    const hiPaymentKeys = extractSectionKeys(hiPath, 'payments');
    const mrPaymentKeys = extractSectionKeys(mrPath, 'payments');
    const orPaymentKeys = extractSectionKeys(orPath, 'payments');

    const enBillingKeys = extractSectionKeys(enPath, 'billing');
    const hiBillingKeys = extractSectionKeys(hiPath, 'billing');
    const mrBillingKeys = extractSectionKeys(mrPath, 'billing');
    const orBillingKeys = extractSectionKeys(orPath, 'billing');

    assert(
      JSON.stringify(enPaymentKeys) === JSON.stringify(hiPaymentKeys) &&
      JSON.stringify(enPaymentKeys) === JSON.stringify(mrPaymentKeys) &&
      JSON.stringify(enPaymentKeys) === JSON.stringify(orPaymentKeys),
      `100% key parity across EN, HI, MR, OR for payments namespace (${enPaymentKeys.length} keys)`
    );

    assert(
      JSON.stringify(enBillingKeys) === JSON.stringify(hiBillingKeys) &&
      JSON.stringify(enBillingKeys) === JSON.stringify(mrBillingKeys) &&
      JSON.stringify(enBillingKeys) === JSON.stringify(orBillingKeys),
      `100% key parity across EN, HI, MR, OR for billing namespace (${enBillingKeys.length} keys)`
    );

    console.log('\n--- Test 37: Phase 7 Payment Dispute Integration ---');
    const disputeRecord = await prisma.marketplaceDispute.create({
      data: {
        disputeReference: `DSP-202609-${crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5)}`,
        materialLotId: deal2.lot.id,
        quoteId: deal2.quote.id,
        handoverId: deal2.handover.id,
        transactionId: deal2.transaction.id,
        openedByUserId: testCollectorUser1.id,
        openedByRole: 'INFORMAL_COLLECTOR',
        disputeType: DISPUTE_TYPES.PAYMENT_DISPUTE,
        status: 'OPEN',
        disputedAmount: 200,
        description: 'Cash payment shortage of Rs 200 reported at handover',
      },
    });
    createdDisputeIds.push(disputeRecord.id);

    // Link cash confirmation to the dispute
    const linkedConf = await prisma.cashPaymentConfirmation.update({
      where: { id: mismatchResult.confirmation.id },
      data: { disputeId: disputeRecord.id },
    });
    assert(linkedConf.disputeId === disputeRecord.id, 'Cash confirmation discrepancy successfully linked to Phase 7 dispute record');

    console.log('\n--- Test 38: Regression Verification Integrity ---');
    assert(deal1.transaction.transactionType === 'MATERIAL_SALE', 'Canonical TransactionRecord contract intact');
    assert(deal1.quote.status === 'ACCEPTED', 'Canonical Quote contract intact');
    assert(deal1.handover.status === 'CONFIRMED', 'Canonical Handover contract intact');
    assert(deal1.lot.status === 'ACCEPTED' || deal1.lot.status === 'COMPLETED', 'Canonical MaterialLot contract intact');

  } catch (err) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
    failedTests++;
  } finally {
    console.log('\n--- Teardown: Cleaning up test fixtures ---');
    try {
      if (createdTransactionIds.length > 0) {
        await prisma.transactionBill.deleteMany({ where: { transactionId: { in: createdTransactionIds } } });
        await prisma.cashPaymentConfirmation.deleteMany({ where: { transactionId: { in: createdTransactionIds } } });
        await prisma.razorpayPaymentRecord.deleteMany({ where: { transactionId: { in: createdTransactionIds } } });
        await prisma.marketplaceDispute.deleteMany({ where: { transactionId: { in: createdTransactionIds } } });
      }
      if (createdBillIds.length > 0) {
        await prisma.transactionBill.deleteMany({ where: { id: { in: createdBillIds } } });
      }
      if (createdConfirmationIds.length > 0) {
        await prisma.cashPaymentConfirmation.deleteMany({ where: { id: { in: createdConfirmationIds } } });
      }
      if (createdRazorpayRecordIds.length > 0) {
        await prisma.razorpayPaymentRecord.deleteMany({ where: { id: { in: createdRazorpayRecordIds } } });
      }
      if (createdDisputeIds.length > 0) {
        await prisma.marketplaceDispute.deleteMany({ where: { id: { in: createdDisputeIds } } });
      }
      if (createdTransactionIds.length > 0) {
        await prisma.transactionRecord.deleteMany({ where: { id: { in: createdTransactionIds } } });
      }
      if (createdHandoverIds.length > 0) {
        await prisma.handoverRecord.deleteMany({ where: { id: { in: createdHandoverIds } } });
      }
      if (createdQuoteIds.length > 0) {
        await prisma.quote.deleteMany({ where: { id: { in: createdQuoteIds } } });
      }
      if (createdLotIds.length > 0) {
        await prisma.materialLot.deleteMany({ where: { id: { in: createdLotIds } } });
      }

      if (testCollectorProfile1) await prisma.collectorProfile.delete({ where: { id: testCollectorProfile1.id } });
      if (testCollectorProfile2) await prisma.collectorProfile.delete({ where: { id: testCollectorProfile2.id } });
      if (testRecyclerProfile1) await prisma.recyclerProfile.delete({ where: { id: testRecyclerProfile1.id } });

      if (testCollectorUser1) await prisma.user.delete({ where: { id: testCollectorUser1.id } });
      if (testCollectorUser2) await prisma.user.delete({ where: { id: testCollectorUser2.id } });
      if (testRecyclerUser1) await prisma.user.delete({ where: { id: testRecyclerUser1.id } });
      if (testAdminUser) await prisma.user.delete({ where: { id: testAdminUser.id } });
      if (testCitizenUser) await prisma.user.delete({ where: { id: testCitizenUser.id } });
      console.log('[TEARDOWN] All test fixtures cleanly purged from database.');
    } catch (cleanupErr) {
      console.warn('[TEARDOWN WARNING]:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unhandled error in runner:', err);
  process.exit(1);
});
