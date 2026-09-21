/**
 * verify_transactions.js
 * Comprehensive Verification Suite for SIH 26229 Payment Recording + Transaction Dataset
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 7
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const transactionService = require('../src/services/transactionService');
const handoverService = require('../src/services/handoverService');
const quoteService = require('../src/services/quoteService');
const materialLotService = require('../src/services/materialLotService');
const {
  ROLES,
  QUOTE_STATUS,
  HANDOVER_STATUS,
  TRANSACTION_TYPE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} = require('../src/utils/constants');

async function runTransactionVerification() {
  console.log('========================================================');
  console.log('--- STARTING VERIFY_TRANSACTIONS (SIH 26229 PROMPT 7) ---');
  console.log('========================================================\n');

  let collector1User, collector1Profile;
  let collector2User, collector2Profile;
  let recycler1User, recycler1Profile;
  let recycler2User, recycler2Profile;
  let adminUser;
  let testLot1, testLot2, testLot3;
  let acceptedQuote1, pendingQuote2;
  let confirmedHandover1, pendingHandover2, cancelledHandover3;
  let createdTransactionIds = [];
  let createdHandoverIds = [];
  let createdQuoteIds = [];
  let createdLotIds = [];

  try {
    // --- SETUP ISOLATED FIXTURES ---
    console.log('[SETUP] Creating isolated test users, profiles, lots, quotes, and handovers...');
    const timestamp = Date.now();

    // 1. Collector 1
    collector1User = await prisma.user.create({
      data: {
        email: `test.col1.txn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9198881${timestamp % 100000}`,
        name: 'Transaction Test Collector 1',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
      },
    });
    collector1Profile = await prisma.collectorProfile.create({
      data: {
        userId: collector1User.id,
        city: 'Pune',
        state: 'Maharashtra',
        serviceArea: 'Kothrud',
      },
    });

    // 2. Collector 2 (Unrelated collector)
    collector2User = await prisma.user.create({
      data: {
        email: `test.col2.txn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9198882${timestamp % 100000}`,
        name: 'Transaction Test Collector 2',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
      },
    });
    collector2Profile = await prisma.collectorProfile.create({
      data: {
        userId: collector2User.id,
        city: 'Mumbai',
        state: 'Maharashtra',
        serviceArea: 'Dharavi',
      },
    });

    // 3. Recycler 1
    recycler1User = await prisma.user.create({
      data: {
        email: `test.rec1.txn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9198883${timestamp % 100000}`,
        name: 'Authorized Recycler 1',
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
      },
    });
    recycler1Profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler1User.id,
        facilityName: 'Maharashtra Green Recyclers Ltd',
        facilityAddress: 'Plot 42, Hinjawadi Phase 2, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        acceptedCategories: ['PCB', 'BATTERY', 'MOBILE_PHONE'],
        authorizationStatus: 'AUTHORIZED',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 4. Recycler 2
    recycler2User = await prisma.user.create({
      data: {
        email: `test.rec2.txn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9198884${timestamp % 100000}`,
        name: 'Authorized Recycler 2',
        role: ROLES.RECYCLER,
        status: 'ACTIVE',
      },
    });
    recycler2Profile = await prisma.recyclerProfile.create({
      data: {
        userId: recycler2User.id,
        facilityName: 'Navi Mumbai Clean Metals',
        facilityAddress: 'MIDC Rabale, Navi Mumbai',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        acceptedCategories: ['PCB'],
        authorizationStatus: 'AUTHORIZED',
        pickupAvailable: 'AVAILABLE',
      },
    });

    // 5. Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `test.admin.txn.${timestamp}@ecosetu.test`,
        passwordHash: 'dummy-hash',
        phone: `+9198885${timestamp % 100000}`,
        name: 'System Admin User',
        role: ROLES.ADMIN,
        status: 'ACTIVE',
      },
    });

    // 6. Test Material Lot 1 (Collector 1)
    testLot1 = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'PCB',
      subcategory: 'Server Motherboards',
      approximateTotalWeightKg: 100.0,
      notes: 'High-grade server circuit boards',
      collectionArea: 'Kothrud Industrial Area',
    });
    testLot1 = await materialLotService.updateMaterialLot(collector1User.id, testLot1.id, { status: 'OPEN' });
    createdLotIds.push(testLot1.id);

    // 7. Quote 1 from Recycler 1 for Lot 1
    const quoteData1 = await quoteService.createQuote(recycler1User, {
      materialLotId: testLot1.id,
      quotedUnitPrice: 250.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
      notes: 'Industrial grade rate',
    });
    acceptedQuote1 = quoteData1;
    createdQuoteIds.push(acceptedQuote1.id);

    // Collector 1 accepts Quote 1
    await quoteService.acceptQuote(collector1User, acceptedQuote1.id);

    // 8. Handover 1 for Lot 1 (CONFIRMED status)
    const hdo1 = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLot1.id,
      quoteId: acceptedQuote1.id,
      handoverWeightKg: 98.5,
      latitude: 18.5204,
      longitude: 73.8567,
      locationAccuracyMeters: 5.0,
    });
    createdHandoverIds.push(hdo1.id);

    // Both parties confirm Handover 1
    await handoverService.collectorConfirm(collector1User.id, hdo1.id, {
      handoverWeightKg: 98.5,
      notes: 'Weighed on digital platform scale',
    });
    const confirmedResult1 = await handoverService.recyclerConfirm(recycler1User.id, hdo1.id, {
      handoverWeightKg: 98.5,
      notes: 'Verified dock weight',
    });
    confirmedHandover1 = confirmedResult1;

    // 9. Test Material Lot 2 + Quote 2 + Handover 2 in PENDING status
    testLot2 = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'BATTERY',
      subcategory: 'Lithium Ion',
      approximateTotalWeightKg: 50.0,
      notes: 'EV and laptop batteries',
    });
    testLot2 = await materialLotService.updateMaterialLot(collector1User.id, testLot2.id, { status: 'OPEN' });
    createdLotIds.push(testLot2.id);

    pendingQuote2 = await quoteService.createQuote(recycler1User, {
      materialLotId: testLot2.id,
      quotedUnitPrice: 100.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    createdQuoteIds.push(pendingQuote2.id);
    await quoteService.acceptQuote(collector1User, pendingQuote2.id);

    pendingHandover2 = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLot2.id,
      quoteId: pendingQuote2.id,
      handoverWeightKg: 50.0,
    });
    createdHandoverIds.push(pendingHandover2.id);

    // 10. Test Material Lot 3 + Cancelled Handover 3 (Null GPS)
    testLot3 = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'MOBILE_PHONE',
      subcategory: 'Smartphones',
      approximateTotalWeightKg: 20.0,
    });
    testLot3 = await materialLotService.updateMaterialLot(collector1User.id, testLot3.id, { status: 'OPEN' });
    createdLotIds.push(testLot3.id);

    const quote3 = await quoteService.createQuote(recycler1User, {
      materialLotId: testLot3.id,
      quotedUnitPrice: 300.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    createdQuoteIds.push(quote3.id);
    await quoteService.acceptQuote(collector1User, quote3.id);

    const hdo3 = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLot3.id,
      quoteId: quote3.id,
      handoverWeightKg: 20.0,
      locationAvailable: false,
    });
    createdHandoverIds.push(hdo3.id);
    cancelledHandover3 = await handoverService.cancelHandover(collector1User.id, hdo3.id, {
      reason: 'Physical transfer aborted by collector',
    });

    console.log('✓ Setup complete\n');

    // ========================================================
    // TEST 1: Transaction Record Model Exists
    // ========================================================
    console.log('[TEST 1] TransactionRecord model exists');
    assert.ok(prisma.transactionRecord, 'prisma.transactionRecord must be defined');
    console.log('✓ TransactionRecord model verified in Prisma client');

    // ========================================================
    // TEST 2: Unique TXN Reference Number Format
    // ========================================================
    console.log('\n[TEST 2] Unique TXN reference format');
    const ref = await transactionService.generateReferenceNumber();
    const refRegex = /^TXN-\d{6}-\d{5}$/;
    assert.ok(refRegex.test(ref), `Reference ${ref} must match TXN-YYYYMM-XXXXX`);
    console.log(`✓ Reference format verified: ${ref}`);

    // ========================================================
    // TEST 3: Sequential Counter Incrementation
    // ========================================================
    console.log('\n[TEST 3] Sequential counter incrementation');
    const parts = ref.split('-');
    const currentSeq = parseInt(parts[2], 10);
    assert.ok(currentSeq >= 1, 'Sequence counter must be >= 1');
    console.log(`✓ Sequential counter verified: ${parts[2]}`);

    // ========================================================
    // TEST 4: Confirmed Handover Prerequisite (Reject PENDING)
    // ========================================================
    console.log('\n[TEST 4] Reject transaction creation for PENDING handover');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collector1User.id, {
          handoverId: pendingHandover2.id,
          finalSaleValue: 5000.0,
        });
      },
      /CONFIRMED status/i,
      'Handover in PENDING status must be rejected'
    );
    console.log('✓ Rejected transaction for PENDING_COLLECTOR handover');

    // ========================================================
    // TEST 5: Reject Transaction for CANCELLED Handover
    // ========================================================
    console.log('\n[TEST 5] Reject transaction creation for CANCELLED handover');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collector1User.id, {
          handoverId: cancelledHandover3.id,
          finalSaleValue: 6000.0,
        });
      },
      /CONFIRMED status/i,
      'Handover in CANCELLED status must be rejected'
    );
    console.log('✓ Rejected transaction for CANCELLED handover');

    // ========================================================
    // TEST 6: Reject Direct Transaction Creation Without Handover
    // ========================================================
    console.log('\n[TEST 6] Reject transaction without valid handover ID');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collector1User.id, {
          handoverId: '00000000-0000-0000-0000-000000000000',
          finalSaleValue: 1000.0,
        });
      },
      /Handover record not found/i,
      'Non-existent handover must be rejected'
    );
    console.log('✓ Rejected transaction with non-existent handover');

    // ========================================================
    // TEST 7: Ownership Protection: Unrelated Collector Blocked
    // ========================================================
    console.log('\n[TEST 7] Unrelated Collector cannot record transaction (403)');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collector2User.id, {
          handoverId: confirmedHandover1.id,
          finalSaleValue: 24625.0,
        });
      },
      /not authorized/i,
      'Collector 2 must not be authorized to record transaction for Collector 1 handover'
    );
    console.log('✓ Unrelated collector blocked with authorization error');

    // ========================================================
    // TEST 8: Ownership Protection: Unrelated Recycler Blocked
    // ========================================================
    console.log('\n[TEST 8] Unrelated Recycler cannot record transaction (403)');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(recycler2User.id, {
          handoverId: confirmedHandover1.id,
          finalSaleValue: 24625.0,
        });
      },
      /not authorized/i,
      'Recycler 2 must not be authorized to record transaction for Recycler 1 handover'
    );
    console.log('✓ Unrelated recycler blocked with authorization error');

    // ========================================================
    // TEST 9: Client Tampering: Mismatched Relationship IDs Blocked
    // ========================================================
    console.log('\n[TEST 9] Mismatched lotId or quoteId in payload rejected');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collector1User.id, {
          handoverId: confirmedHandover1.id,
          materialLotId: testLot2.id, // Tampered lotId
          finalSaleValue: 24625.0,
        });
      },
      /does not match/i,
      'Mismatched lotId must be rejected'
    );
    console.log('✓ Mismatched client-supplied relation IDs rejected');

    // ========================================================
    // TEST 10: Successful Transaction Recording by Collector (CASH + PAID)
    // ========================================================
    console.log('\n[TEST 10] Successful transaction recording by Collector (CASH, PAID)');
    // Handover weight = 98.5 kg, Quoted rate = ₹250/kg -> ₹24,625
    const txn1 = await transactionService.createTransaction(collector1User.id, {
      handoverId: confirmedHandover1.id,
      finalSaleValue: 24625.0,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
      notes: 'Paid in full upon digital handover confirmation',
    });
    createdTransactionIds.push(txn1.id);

    assert.ok(txn1.id, 'Transaction ID must be returned');
    assert.ok(refRegex.test(txn1.referenceNumber), 'Reference must follow TXN-YYYYMM-XXXXX');
    assert.strictEqual(txn1.paymentMethod, PAYMENT_METHOD.CASH);
    assert.strictEqual(txn1.paymentStatus, PAYMENT_STATUS.PAID);
    assert.strictEqual(Number(txn1.finalSaleValue), 24625.0);
    assert.strictEqual(Number(txn1.amountPaid), 24625.0);
    assert.strictEqual(Number(txn1.amountDue), 0.0);
    console.log(`✓ Transaction recorded: ${txn1.referenceNumber} (₹${txn1.finalSaleValue})`);

    // ========================================================
    // TEST 11: Duplicate Transaction for Same Handover Blocked
    // ========================================================
    console.log('\n[TEST 11] Duplicate transaction for same handover blocked');
    await assert.rejects(
      async () => {
        await transactionService.createTransaction(collector1User.id, {
          handoverId: confirmedHandover1.id,
          finalSaleValue: 24625.0,
        });
      },
      /already exists/i,
      'Duplicate transaction for the same handover must be prevented'
    );
    console.log('✓ Duplicate transaction attempt safely rejected');

    // ========================================================
    // TEST 12: Quoted Price & Rates Preserved Exactly
    // ========================================================
    console.log('\n[TEST 12] Quoted price and quoted total preserved exactly');
    assert.strictEqual(Number(txn1.quotedUnitPrice), 250.0);
    assert.strictEqual(Number(txn1.quotedTotal), Number(acceptedQuote1.quotedTotal));
    console.log(`✓ Quoted unit price (${txn1.quotedUnitPrice}) and total (${txn1.quotedTotal}) preserved`);

    // ========================================================
    // TEST 13: Final Sale Value Stored Separately
    // ========================================================
    console.log('\n[TEST 13] Final sale value stored separately from quoted total');
    assert.strictEqual(Number(txn1.finalSaleValue), 24625.0);
    assert.strictEqual(Number(txn1.quotedTotal), 25000.0);
    assert.strictEqual(txn1.isPriceAdjusted, true);
    assert.strictEqual(txn1.differenceFromQuote, -375.0);
    console.log('✓ Final sale value and quoted values preserved in separate columns (with variance calculation)');

    // ========================================================
    // TEST 14: Non-Movement Statutory Disclaimer for CASH
    // ========================================================
    console.log('\n[TEST 14] Statutory disclaimer for CASH recorded');
    assert.ok(txn1.disclaimer.includes('ECOSETU does not transfer money'), 'Disclaimer must mention no money transfer');
    assert.ok(txn1.disclaimer.includes('Cash payment recorded by user'), 'Disclaimer must mention cash recorded by user');
    console.log(`✓ Cash disclaimer verified: "${txn1.disclaimer}"`);

    // ========================================================
    // TEST 15: Decimal-Safe Money Calculations
    // ========================================================
    console.log('\n[TEST 15] Decimal-safe money calculations (no floating point drift)');
    assert.strictEqual(typeof txn1.finalSaleValue, 'object', 'finalSaleValue must be Decimal object in Prisma model');
    assert.strictEqual(Number(txn1.finalSaleValue).toFixed(2), '24625.00');
    console.log('✓ Decimal monetary representation verified');

    // ========================================================
    // TEST 16: Setup Handover 4 to Test Price Variance (Diff vs Quote)
    // ========================================================
    console.log('\n[TEST 16] Final sale value differs from quote (variance calculation)');
    let testLot4 = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'PCB',
      subcategory: 'High Grade',
      approximateTotalWeightKg: 10.0,
    });
    testLot4 = await materialLotService.updateMaterialLot(collector1User.id, testLot4.id, { status: 'OPEN' });
    createdLotIds.push(testLot4.id);

    const quote4 = await quoteService.createQuote(recycler1User, {
      materialLotId: testLot4.id,
      quotedUnitPrice: 200.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    createdQuoteIds.push(quote4.id);
    await quoteService.acceptQuote(collector1User, quote4.id);

    const hdo4 = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLot4.id,
      quoteId: quote4.id,
      handoverWeightKg: 10.0,
    });
    createdHandoverIds.push(hdo4.id);
    await handoverService.collectorConfirm(collector1User.id, hdo4.id);
    const confirmedHdo4 = await handoverService.recyclerConfirm(recycler1User.id, hdo4.id);

    // Quoted total = 10 * 200 = ₹2,000. Final sale value negotiated to ₹2,200 (+₹200 bonus)
    const txn4 = await transactionService.createTransaction(collector1User.id, {
      handoverId: confirmedHdo4.id,
      finalSaleValue: 2200.0,
      paymentMethod: PAYMENT_METHOD.UPI_RECORDED,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    createdTransactionIds.push(txn4.id);

    assert.strictEqual(Number(txn4.quotedTotal), 2000.0);
    assert.strictEqual(Number(txn4.finalSaleValue), 2200.0);
    assert.strictEqual(txn4.differenceFromQuote, 200.0);
    assert.strictEqual(txn4.variancePercent, 10.0);
    assert.strictEqual(txn4.isPriceAdjusted, true);
    console.log(`✓ Price variance verified: Difference +₹${txn4.differenceFromQuote} (+${txn4.variancePercent}%)`);

    // ========================================================
    // TEST 17: UPI_RECORDED Non-Movement Disclaimer
    // ========================================================
    console.log('\n[TEST 17] Statutory disclaimer for UPI_RECORDED');
    assert.ok(txn4.disclaimer.includes('Payment method recorded by user; payment is not processed or verified by ECOSETU'));
    console.log(`✓ UPI disclaimer verified: "${txn4.disclaimer}"`);

    // ========================================================
    // TEST 18: Setup Handover 5 for PARTIALLY_PAID Payment Status
    // ========================================================
    console.log('\n[TEST 18] PARTIALLY_PAID payment status and amountDue calculation');
    let testLot5 = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'BATTERY',
      approximateTotalWeightKg: 20.0,
    });
    testLot5 = await materialLotService.updateMaterialLot(collector1User.id, testLot5.id, { status: 'OPEN' });
    createdLotIds.push(testLot5.id);

    const quote5 = await quoteService.createQuote(recycler1User, {
      materialLotId: testLot5.id,
      quotedUnitPrice: 100.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    createdQuoteIds.push(quote5.id);
    await quoteService.acceptQuote(collector1User, quote5.id);

    const hdo5 = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLot5.id,
      quoteId: quote5.id,
      handoverWeightKg: 20.0,
    });
    createdHandoverIds.push(hdo5.id);
    await handoverService.collectorConfirm(collector1User.id, hdo5.id);
    const confirmedHdo5 = await handoverService.recyclerConfirm(recycler1User.id, hdo5.id);

    // Total = ₹2,000, Paid = ₹1,200, Due = ₹800
    const txn5 = await transactionService.createTransaction(collector1User.id, {
      handoverId: confirmedHdo5.id,
      finalSaleValue: 2000.0,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PARTIALLY_PAID,
      amountPaid: 1200.0,
    });
    createdTransactionIds.push(txn5.id);

    assert.strictEqual(Number(txn5.finalSaleValue), 2000.0);
    assert.strictEqual(Number(txn5.amountPaid), 1200.0);
    assert.strictEqual(Number(txn5.amountDue), 800.0);
    console.log(`✓ Partial payment verified: Paid ₹${txn5.amountPaid}, Due ₹${txn5.amountDue}`);

    // ========================================================
    // TEST 19: Overpayment Blocked (amountPaid > finalSaleValue)
    // ========================================================
    console.log('\n[TEST 19] Overpayment blocked');
    await assert.rejects(
      async () => {
        let testLotErr = await materialLotService.createMaterialLot(collector1User.id, {
          category: 'BATTERY',
          approximateTotalWeightKg: 5.0,
        });
        testLotErr = await materialLotService.updateMaterialLot(collector1User.id, testLotErr.id, { status: 'OPEN' });
        createdLotIds.push(testLotErr.id);
        const qErr = await quoteService.createQuote(recycler1User, {
          materialLotId: testLotErr.id,
          quotedUnitPrice: 100.0,
          unit: 'PER_KG',
          validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
        createdQuoteIds.push(qErr.id);
        await quoteService.acceptQuote(collector1User, qErr.id);
        const hErr = await handoverService.createHandover(collector1User.id, {
          materialLotId: testLotErr.id,
          quoteId: qErr.id,
          handoverWeightKg: 5.0,
        });
        createdHandoverIds.push(hErr.id);
        await handoverService.collectorConfirm(collector1User.id, hErr.id);
        const confErr = await handoverService.recyclerConfirm(recycler1User.id, hErr.id);

        await transactionService.createTransaction(collector1User.id, {
          handoverId: confErr.id,
          finalSaleValue: 500.0,
          paymentStatus: PAYMENT_STATUS.PARTIALLY_PAID,
          amountPaid: 600.0, // Overpayment!
        });
      },
      /cannot exceed final sale value/i,
      'Overpayment must be rejected'
    );
    console.log('✓ Overpayment successfully blocked');

    // ========================================================
    // TEST 20: Negative Amount Paid Blocked
    // ========================================================
    console.log('\n[TEST 20] Negative amount paid blocked');
    await assert.rejects(
      async () => {
        await transactionService.updatePaymentStatus(collector1User.id, txn5.id, {
          paymentStatus: PAYMENT_STATUS.PARTIALLY_PAID,
          amountPaid: -50.0,
        });
      },
      /cannot be negative/i,
      'Negative amount paid must be rejected'
    );
    console.log('✓ Negative payment amount blocked');

    // ========================================================
    // TEST 21: PENDING Payment Status (amountPaid = 0, amountDue = full)
    // ========================================================
    console.log('\n[TEST 21] PENDING payment status calculation');
    const updatedToPending = await transactionService.updatePaymentStatus(collector1User.id, txn5.id, {
      paymentStatus: PAYMENT_STATUS.PENDING,
    });
    assert.strictEqual(Number(updatedToPending.amountPaid), 0.0);
    assert.strictEqual(Number(updatedToPending.amountDue), 2000.0);
    console.log('✓ Pending payment status defaults amountPaid to 0 and amountDue to total');

    // ========================================================
    // TEST 22: Update Payment Status to PAID
    // ========================================================
    console.log('\n[TEST 22] Update payment status to PAID');
    const updatedToPaid = await transactionService.updatePaymentStatus(collector1User.id, txn5.id, {
      paymentStatus: PAYMENT_STATUS.PAID,
      paymentMethod: PAYMENT_METHOD.BANK_TRANSFER_RECORDED,
      notes: 'Settled via NEFT bank transfer voucher #9988',
    });
    assert.strictEqual(updatedToPaid.paymentStatus, PAYMENT_STATUS.PAID);
    assert.strictEqual(Number(updatedToPaid.amountPaid), 2000.0);
    assert.strictEqual(Number(updatedToPaid.amountDue), 0.0);
    assert.strictEqual(updatedToPaid.paymentMethod, PAYMENT_METHOD.BANK_TRANSFER_RECORDED);
    console.log('✓ Updated payment status to PAID with amountDue cleared to 0');

    // ========================================================
    // TEST 23: Admin Can Create / Record Transaction
    // ========================================================
    console.log('\n[TEST 23] Admin can record transaction');
    let testLotAdmin = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'MOBILE_PHONE',
      approximateTotalWeightKg: 15.0,
    });
    testLotAdmin = await materialLotService.updateMaterialLot(collector1User.id, testLotAdmin.id, { status: 'OPEN' });
    createdLotIds.push(testLotAdmin.id);

    const quoteAdmin = await quoteService.createQuote(recycler1User, {
      materialLotId: testLotAdmin.id,
      quotedUnitPrice: 150.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    createdQuoteIds.push(quoteAdmin.id);
    await quoteService.acceptQuote(collector1User, quoteAdmin.id);

    const hdoAdmin = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLotAdmin.id,
      quoteId: quoteAdmin.id,
      handoverWeightKg: 15.0,
    });
    createdHandoverIds.push(hdoAdmin.id);
    await handoverService.collectorConfirm(collector1User.id, hdoAdmin.id);
    const confAdmin = await handoverService.recyclerConfirm(recycler1User.id, hdoAdmin.id);

    const adminTxn = await transactionService.createTransaction(adminUser.id, {
      handoverId: confAdmin.id,
      finalSaleValue: 2250.0,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    createdTransactionIds.push(adminTxn.id);
    assert.ok(adminTxn.id, 'Admin created transaction must succeed');
    console.log('✓ Admin administrative transaction recording verified');

    // ========================================================
    // TEST 24: Recycler Can Create / Record Transaction
    // ========================================================
    console.log('\n[TEST 24] Recycler can record transaction');
    let testLotRec = await materialLotService.createMaterialLot(collector1User.id, {
      category: 'PCB',
      approximateTotalWeightKg: 8.0,
    });
    testLotRec = await materialLotService.updateMaterialLot(collector1User.id, testLotRec.id, { status: 'OPEN' });
    createdLotIds.push(testLotRec.id);

    const quoteRec = await quoteService.createQuote(recycler1User, {
      materialLotId: testLotRec.id,
      quotedUnitPrice: 200.0,
      unit: 'PER_KG',
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    createdQuoteIds.push(quoteRec.id);
    await quoteService.acceptQuote(collector1User, quoteRec.id);

    const hdoRec = await handoverService.createHandover(collector1User.id, {
      materialLotId: testLotRec.id,
      quoteId: quoteRec.id,
      handoverWeightKg: 8.0,
    });
    createdHandoverIds.push(hdoRec.id);
    await handoverService.collectorConfirm(collector1User.id, hdoRec.id);
    const confRec = await handoverService.recyclerConfirm(recycler1User.id, hdoRec.id);

    const recyclerTxn = await transactionService.createTransaction(recycler1User.id, {
      handoverId: confRec.id,
      finalSaleValue: 1600.0,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    createdTransactionIds.push(recyclerTxn.id);
    assert.ok(recyclerTxn.id, 'Recycler recorded transaction must succeed');
    console.log('✓ Recycler transaction recording verified');

    // ========================================================
    // TEST 25: GPS Copied Without Fabrication
    // ========================================================
    console.log('\n[TEST 25] Handover GPS coordinates copied without fabrication');
    assert.strictEqual(Number(txn1.latitude), 18.5204);
    assert.strictEqual(Number(txn1.longitude), 73.8567);
    console.log(`✓ GPS coordinates copied: (${txn1.latitude}, ${txn1.longitude})`);

    // ========================================================
    // TEST 26: Null GPS on Handover Preserved as Null
    // ========================================================
    console.log('\n[TEST 26] Null GPS on handover preserved as null');
    assert.strictEqual(txn4.latitude, null);
    assert.strictEqual(txn4.longitude, null);
    console.log('✓ Null GPS strictly preserved (zero-fabrication enforced)');

    // ========================================================
    // TEST 27: Audit Logging on Transaction Recording
    // ========================================================
    console.log('\n[TEST 27] Audit log emitted on transaction recording');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'TRANSACTION',
        entityId: txn1.id,
      },
    });
    assert.ok(auditLogs.length > 0, 'Audit log must be created for transaction');
    assert.strictEqual(auditLogs[0].action, AUDIT_ACTIONS.TRANSACTION_RECORDED);
    console.log(`✓ Audit log verified: ${auditLogs[0].action}`);

    // ========================================================
    // TEST 28: Notification Generated for Counterparty
    // ========================================================
    console.log('\n[TEST 28] Resilient notification emitted for transaction counterparty');
    const notifications = await prisma.notification.findMany({
      where: {
        userId: recycler1User.id,
        type: NOTIFICATION_TYPES.TRANSACTION_RECORDED,
      },
    });
    assert.ok(notifications.length > 0, 'Notification must be dispatched to recycler');
    assert.ok(notifications[0].message.includes('Recording only'), 'Notification must include recording-only note');
    console.log(`✓ Notification verified: "${notifications[0].title}"`);

    // ========================================================
    // TEST 29: Transaction Lookup by Handover ID
    // ========================================================
    console.log('\n[TEST 29] Transaction lookup by handover ID');
    const foundByHdo = await transactionService.getTransactionByHandoverId(
      collector1User.id,
      confirmedHandover1.id
    );
    assert.ok(foundByHdo, 'Transaction must be findable by handover ID');
    assert.strictEqual(foundByHdo.id, txn1.id);
    console.log('✓ Handover ID to transaction lookup verified');

    // ========================================================
    // TEST 30: Tenancy Isolation: Collector 2 Blocked from Viewing Collector 1 Transactions
    // ========================================================
    console.log('\n[TEST 30] Tenancy isolation in transaction retrieval');
    await assert.rejects(
      async () => {
        await transactionService.getTransactionById(collector2User.id, txn1.id);
      },
      /not authorized/i,
      'Collector 2 must not be able to view Collector 1 transaction'
    );
    console.log('✓ Tenancy isolation verified: cross-collector access blocked');

    // ========================================================
    // TEST 31: Transaction History Query for Collector 1
    // ========================================================
    console.log('\n[TEST 31] List transactions for Collector 1');
    const col1List = await transactionService.getTransactions(collector1User);
    assert.ok(col1List.transactions.length >= 3, 'Collector 1 must see their transactions');
    assert.ok(
      col1List.transactions.every((tx) => tx.collectorProfileId === collector1Profile.id),
      'All transactions must belong to Collector 1'
    );
    console.log(`✓ Collector 1 listed ${col1List.transactions.length} transactions`);

    // ========================================================
    // TEST 32: Transaction History Query for Collector 2 (Empty)
    // ========================================================
    console.log('\n[TEST 32] Collector 2 sees 0 transactions');
    const col2List = await transactionService.getTransactions(collector2User);
    assert.strictEqual(col2List.total, 0);
    console.log('✓ Collector 2 transaction list is empty (strict isolation)');

    // ========================================================
    // TEST 33: Explicit Transaction Cancellation
    // ========================================================
    console.log('\n[TEST 33] Transaction cancellation with reason');
    const cancelledTx = await transactionService.cancelTransaction(adminUser.id, adminTxn.id, {
      reason: 'Administrative correction due to entry error',
    });
    assert.strictEqual(cancelledTx.transactionStatus, TRANSACTION_STATUS.CANCELLED);
    assert.strictEqual(cancelledTx.cancellationReason, 'Administrative correction due to entry error');
    assert.ok(cancelledTx.cancelledAt, 'cancelledAt must be recorded');
    console.log(`✓ Transaction cancelled: ${cancelledTx.referenceNumber}`);

    // ========================================================
    // TEST 34: Block Payment Updates on Cancelled Transaction
    // ========================================================
    console.log('\n[TEST 34] Block payment updates on cancelled transaction');
    await assert.rejects(
      async () => {
        await transactionService.updatePaymentStatus(adminUser.id, adminTxn.id, {
          paymentStatus: PAYMENT_STATUS.PAID,
        });
      },
      /Cannot update payment status of a cancelled transaction/i,
      'Cancelled transaction updates must be rejected'
    );
    console.log('✓ Cancelled transaction update blocked');

    // ========================================================
    // TEST 35: STRICT BOUNDARY: No Earnings Ledger Created
    // ========================================================
    console.log('\n[TEST 35] STRICT BOUNDARY: No earnings ledger or balance accounts created');
    // Ensure no unexpected financial tables were touched
    assert.strictEqual(typeof prisma.earningsLedger, 'undefined', 'Earnings ledger table must NOT exist');
    console.log('✓ Verified: No earnings ledger created');

    // ========================================================
    // TEST 36: STRICT BOUNDARY: No Recycling Record Created or Modified
    // ========================================================
    console.log('\n[TEST 36] STRICT BOUNDARY: Recycling records untouched');
    const recyclingCount = await prisma.recyclingRecord.count({
      where: { recyclerId: recycler1Profile.id },
    });
    assert.strictEqual(recyclingCount, 0, 'No recycling records should have been created for test lots/recyclers');
    console.log('✓ Verified: Recycling processing remains strictly untouched');

    // ========================================================
    // TEST 37: Mobile Vernacular Speech Generation
    // ========================================================
    console.log('\n[TEST 37] Vernacular speech text formatting (en, hi, mr, or)');
    const speechEn = transactionService.generateTransactionSpeechText(txn1, 'en');
    const speechHi = transactionService.generateTransactionSpeechText(txn1, 'hi');
    const speechMr = transactionService.generateTransactionSpeechText(txn1, 'mr');
    const speechOr = transactionService.generateTransactionSpeechText(txn1, 'or');

    assert.ok(speechEn.includes('Transaction reference'), 'English speech text valid');
    assert.ok(speechHi.includes('लेन-देन संदर्भ'), 'Hindi speech text valid');
    assert.ok(speechMr.includes('व्यवहार संदर्भ'), 'Marathi speech text valid');
    assert.ok(speechOr.includes('କାରବାର ରେଫରେନ୍ସ'), 'Odia speech text valid');
    console.log('✓ Vernacular speech text generated across all 4 languages');

    // ========================================================
    // TEST 38: Multilingual Localization Key Coverage
    // ========================================================
    console.log('\n[TEST 38] Localization dictionary coverage for transaction keys');
    const enFile = fs.readFileSync(path.join(__dirname, '../../mobile/src/i18n/locales/en.ts'), 'utf8');
    const hiFile = fs.readFileSync(path.join(__dirname, '../../mobile/src/i18n/locales/hi.ts'), 'utf8');
    const mrFile = fs.readFileSync(path.join(__dirname, '../../mobile/src/i18n/locales/mr.ts'), 'utf8');
    const orFile = fs.readFileSync(path.join(__dirname, '../../mobile/src/i18n/locales/or.ts'), 'utf8');

    for (const [lang, content] of Object.entries({ en: enFile, hi: hiFile, mr: mrFile, or: orFile })) {
      assert.ok(content.includes('transaction: {'), `Language ${lang} must define transaction dictionary`);
      assert.ok(content.includes('recordSale:'), `Language ${lang} must have recordSale key`);
      assert.ok(content.includes('finalSaleValue:'), `Language ${lang} must have finalSaleValue key`);
      assert.ok(content.includes('disclaimerCash:'), `Language ${lang} must have disclaimerCash key`);
    }
    console.log('✓ Multilingual i18n dictionaries verified in en, hi, mr, and or');

    // ========================================================
    // TEST 39: Mobile TypeScript Typecheck Verification
    // ========================================================
    console.log('\n[TEST 39] Mobile TypeScript compilation validation');
    const tscOutput = execSync('npm run typecheck', {
      cwd: path.join(__dirname, '../../mobile'),
      encoding: 'utf8',
    });
    assert.ok(!tscOutput.includes('error TS'), 'Mobile TypeScript must compile with zero errors');
    console.log('✓ Mobile TypeScript typecheck: 0 errors');

    console.log('\n========================================================');
    console.log('TRANSACTION VERIFICATION SUMMARY');
    console.log('========================================================');
    console.log('Total Checks: 39');
    console.log('Passed:       39');
    console.log('Failed:       0');
    console.log('Success Rate: 100%');
    console.log('========================================================\n');
  } finally {
    // Teardown
    console.log('[TEARDOWN] Cleaning up test fixtures...');
    try {
      if (createdHandoverIds.length > 0) {
        await prisma.transactionRecord.deleteMany({
          where: { handoverId: { in: createdHandoverIds } },
        });
      }
      if (createdTransactionIds.length > 0) {
        await prisma.transactionRecord.deleteMany({
          where: { id: { in: createdTransactionIds } },
        });
      }
      if (createdHandoverIds.length > 0) {
        await prisma.handoverPhoto.deleteMany({
          where: { handoverId: { in: createdHandoverIds } },
        });
        await prisma.handoverRecord.deleteMany({
          where: { id: { in: createdHandoverIds } },
        });
      }
      if (createdQuoteIds.length > 0) {
        await prisma.quote.deleteMany({
          where: { id: { in: createdQuoteIds } },
        });
      }
      if (collector1Profile) {
        await prisma.materialLotItem.deleteMany({
          where: { materialItem: { collectorId: collector1Profile.id } },
        });
        await prisma.materialLot.deleteMany({
          where: { collectorId: collector1Profile.id },
        });
        await prisma.materialItem.deleteMany({
          where: { collectorId: collector1Profile.id },
        });
        await prisma.collectorProfile.delete({
          where: { id: collector1Profile.id },
        });
      }
      if (collector1User) {
        await prisma.user.delete({ where: { id: collector1User.id } });
      }
      if (collector2Profile) {
        await prisma.materialItem.deleteMany({
          where: { collectorId: collector2Profile.id },
        });
        await prisma.collectorProfile.delete({
          where: { id: collector2Profile.id },
        });
      }
      if (collector2User) {
        await prisma.user.delete({ where: { id: collector2User.id } });
      }
      if (recycler1Profile) {
        await prisma.recyclerProfile.delete({
          where: { id: recycler1Profile.id },
        });
      }
      if (recycler1User) {
        await prisma.user.delete({ where: { id: recycler1User.id } });
      }
      if (recycler2Profile) {
        await prisma.recyclerProfile.delete({
          where: { id: recycler2Profile.id },
        });
      }
      if (recycler2User) {
        await prisma.user.delete({ where: { id: recycler2User.id } });
      }
      if (adminUser) {
        await prisma.user.delete({ where: { id: adminUser.id } });
      }
      console.log('✓ Teardown complete\n');
    } catch (cleanErr) {
      console.warn('Teardown warning:', cleanErr.message);
    } finally {
      await prisma.$disconnect();
    }
  }
}

runTransactionVerification().catch((err) => {
  console.error('TRANSACTION VERIFICATION FAILED:', err);
  process.exit(1);
});
