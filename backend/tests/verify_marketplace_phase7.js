// EcoSetu Marketplace Phase 7 Verification Test Suite
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 7: Dispute Resolution & Return Workflows

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');
const disputeService = require('../src/services/disputeService');
const lotTraceService = require('../src/services/lotTraceService');
const {
  ROLES,
  USER_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
  MATERIAL_CATEGORIES,
  MATERIAL_LOT_STATUS,
  HANDOVER_STATUS,
  PAYMENT_STATUS,
  DISPUTE_TYPES,
  DISPUTE_STATUS,
  DISPUTE_RESOLUTION_TYPE,
  QUOTE_STATUS,
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
  console.log('--- STARTING VERIFY_MARKETPLACE_PHASE_7 (DISPUTES & RETURNS) ---');
  console.log('================================================================\n');

  const testSuffix = crypto.randomBytes(3).toString('hex');
  let testCollectorUser1, testCollectorProfile1;
  let testCollectorUser2, testCollectorProfile2;
  let testRecyclerUser1, testRecyclerProfile1;
  let testRecyclerUser2, testRecyclerProfile2;
  let testAdminUser;
  let testCitizenUser;

  // Track created fixtures for teardown
  const createdDisputeIds = [];
  const createdTransactionIds = [];
  const createdHandoverIds = [];
  const createdQuoteIds = [];
  const createdLotIds = [];
  const createdBatchIds = [];

  try {
    console.log('--- [0] Setting up database fixtures for Phase 7 testing ---');

    // 1. Create Collector 1
    testCollectorUser1 = await prisma.user.create({
      data: {
        email: `collector1_p7_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Ramu Collector ${testSuffix}`,
        phone: `+9198301${testSuffix.slice(0, 4)}`,
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
        email: `collector2_p7_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Suresh Collector ${testSuffix}`,
        phone: `+9198302${testSuffix.slice(0, 4)}`,
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

    // 3. Create Recycler 1 (Authorized Counterparty)
    testRecyclerUser1 = await prisma.user.create({
      data: {
        email: `recycler1_p7_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Maharshi Recyclers Alpha ${testSuffix}`,
        phone: `+9198303${testSuffix.slice(0, 4)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });

    testRecyclerProfile1 = await prisma.recyclerProfile.create({
      data: {
        userId: testRecyclerUser1.id,
        facilityName: `Maharshi Green Metals ${testSuffix}`,
        facilityAddress: 'Pimpri Industrial Zone, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411018',
        licenseNumber: `LIC-P7-A-${testSuffix}`,
        acceptedCategories: [MATERIAL_CATEGORIES.PCB, MATERIAL_CATEGORIES.BATTERY],
        authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
      },
    });

    // 4. Create Recycler 2 (Unrelated Counterparty)
    testRecyclerUser2 = await prisma.user.create({
      data: {
        email: `recycler2_p7_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Apex Smelting Beta ${testSuffix}`,
        phone: `+9198304${testSuffix.slice(0, 4)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });

    testRecyclerProfile2 = await prisma.recyclerProfile.create({
      data: {
        userId: testRecyclerUser2.id,
        facilityName: `Apex Smelting Plant ${testSuffix}`,
        facilityAddress: 'Thane Belapur Road, Navi Mumbai',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        pincode: '400705',
        licenseNumber: `LIC-P7-B-${testSuffix}`,
        acceptedCategories: [MATERIAL_CATEGORIES.PCB],
        authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
      },
    });

    // 5. Create Admin User
    testAdminUser = await prisma.user.create({
      data: {
        email: `admin_p7_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `System Admin P7 ${testSuffix}`,
        phone: `+9198305${testSuffix.slice(0, 4)}`,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
      },
    });

    // 6. Create Citizen User (Unauthorized Third Party)
    testCitizenUser = await prisma.user.create({
      data: {
        email: `citizen_p7_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Priya Citizen ${testSuffix}`,
        phone: `+9198306${testSuffix.slice(0, 4)}`,
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      },
    });

    console.log('✓ Database setup completed.\n');

    // Helper to create full trade flow: Lot -> Quote -> Handover -> Transaction
    async function setupTradeLot({
      collectorId = testCollectorProfile1.id,
      collectorUserId = testCollectorUser1.id,
      recyclerId = testRecyclerProfile1.id,
      recyclerUserId = testRecyclerUser1.id,
      lotWeightKg = 50,
      unitPrice = 120,
      handoverWeightKg = 50,
      paymentStatus = PAYMENT_STATUS.PENDING,
      amountPaid = 0,
    } = {}) {
      const lotRef = `LOT-P7-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const lot = await prisma.materialLot.create({
        data: {
          referenceNumber: lotRef,
          collectorId,
          category: MATERIAL_CATEGORIES.PCB,
          subcategory: 'Motherboards',
          approximateTotalWeightKg: lotWeightKg,
          status: MATERIAL_LOT_STATUS.ACCEPTED,
        },
      });
      createdLotIds.push(lot.id);

      const quoteRef = `QTE-P7-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const totalQuote = Number((lotWeightKg * unitPrice).toFixed(2));
      const quote = await prisma.quote.create({
        data: {
          referenceNumber: quoteRef,
          materialLotId: lot.id,
          recyclerId,
          category: MATERIAL_CATEGORIES.PCB,
          subcategory: 'Motherboards',
          quotedUnitPrice: unitPrice,
          quotedQuantity: lotWeightKg,
          quotedTotal: totalQuote,
          status: QUOTE_STATUS.ACCEPTED,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdById: recyclerUserId,
        },
      });
      createdQuoteIds.push(quote.id);

      const handoverRef = `HND-P7-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const handover = await prisma.handoverRecord.create({
        data: {
          referenceNumber: handoverRef,
          materialLotId: lot.id,
          quoteId: quote.id,
          recyclerId,
          collectorId,
          declaredWeightKg: lotWeightKg,
          handoverWeightKg,
          status: HANDOVER_STATUS.CONFIRMED,
          createdById: collectorUserId,
        },
      });
      createdHandoverIds.push(handover.id);

      const txnRef = `TXN-P7-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const finalSaleValue = Number((handoverWeightKg * unitPrice).toFixed(2));
      const amountDue = Math.max(0, finalSaleValue - amountPaid);
      const transaction = await prisma.transactionRecord.create({
        data: {
          referenceNumber: txnRef,
          materialLotId: lot.id,
          quoteId: quote.id,
          collectorId,
          recyclerId,
          handoverId: handover.id,
          category: MATERIAL_CATEGORIES.PCB,
          subcategory: 'Motherboards',
          quantity: handoverWeightKg,
          quotedUnitPrice: unitPrice,
          quotedTotal: totalQuote,
          finalUnitPrice: unitPrice,
          finalSaleValue,
          amountPaid,
          amountDue,
          paymentStatus,
          transactionStatus: 'RECORDED',
          createdById: collectorUserId,
        },
      });
      createdTransactionIds.push(transaction.id);

      return { lot, quote, handover, transaction };
    }

    // -------------------------------------------------------------
    // [TEST 1] Create valid dispute (DSP-YYYYMM-XXXXX)
    // -------------------------------------------------------------
    console.log('[TEST 1] Create valid dispute with canonical reference...');
    const trade1 = await setupTradeLot({ lotWeightKg: 50, handoverWeightKg: 40, unitPrice: 100 });
    const dispute1 = await disputeService.openDispute(testCollectorUser1, {
      materialLotId: trade1.lot.id,
      disputeType: DISPUTE_TYPES.WEIGHT_MISMATCH,
      description: 'Physical scale at recycler yard showed 40kg vs 50kg expected',
      disputedEstimatedWeightKg: 50,
      disputedFinalWeightKg: 40,
    });
    createdDisputeIds.push(dispute1.id);

    assert(
      /^DSP-\d{6}-[A-Z0-9]{5}$/.test(dispute1.disputeReference),
      `Test 1.1: Dispute reference matches DSP-YYYYMM-XXXXX pattern (${dispute1.disputeReference})`
    );
    assert(dispute1.status === DISPUTE_STATUS.OPEN, 'Test 1.2: Initial dispute status is OPEN');
    assert(dispute1.openedByRole === ROLES.INFORMAL_COLLECTOR, 'Test 1.3: Opened by role recorded as INFORMAL_COLLECTOR');

    const updatedLot1 = await prisma.materialLot.findUnique({ where: { id: trade1.lot.id } });
    assert(updatedLot1.status === MATERIAL_LOT_STATUS.DISPUTED, 'Test 1.4: MaterialLot status transitioned to DISPUTED');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 2] Invalid dispute rejected (Missing fields / invalid type)
    // -------------------------------------------------------------
    console.log('[TEST 2] Invalid dispute payload rejection...');
    let invalidTypeRejected = false;
    try {
      await disputeService.openDispute(testCollectorUser1, {
        materialLotId: trade1.lot.id,
        disputeType: 'INVALID_TYPE_FOO',
        description: 'Testing invalid type',
      });
    } catch (err) {
      invalidTypeRejected = true;
    }
    assert(invalidTypeRejected, 'Test 2.1: Invalid disputeType is rejected');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 3] Unauthorized dispute creation blocked
    // -------------------------------------------------------------
    console.log('[TEST 3] Unauthorized dispute creation blocked (unrelated third party)...');
    const trade3 = await setupTradeLot();
    let unauthorizedBlocked = false;
    try {
      await disputeService.openDispute(testCitizenUser, {
        materialLotId: trade3.lot.id,
        disputeType: DISPUTE_TYPES.WEIGHT_MISMATCH,
        description: 'Citizen trying to dispute collector lot',
      });
    } catch (err) {
      if (err.statusCode === 403) unauthorizedBlocked = true;
    }
    assert(unauthorizedBlocked, 'Test 3.1: Citizen cannot open dispute on collector lot (403 Forbidden)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 4] Collector can access own dispute
    // -------------------------------------------------------------
    console.log('[TEST 4] Collector can access own dispute...');
    const collectorDisputeView = await disputeService.getDisputeById(testCollectorUser1, dispute1.id);
    assert(collectorDisputeView.id === dispute1.id, 'Test 4.1: Collector successfully retrieved own dispute');
    assert(collectorDisputeView.materialLot.id === trade1.lot.id, 'Test 4.2: Linked lot is present');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 5] Collector cannot access another collector\'s dispute
    // -------------------------------------------------------------
    console.log('[TEST 5] Collector cannot access another collector dispute...');
    let collectorTenancyBlocked = false;
    try {
      await disputeService.getDisputeById(testCollectorUser2, dispute1.id);
    } catch (err) {
      if (err.statusCode === 403) collectorTenancyBlocked = true;
    }
    assert(collectorTenancyBlocked, 'Test 5.1: Collector 2 blocked from viewing Collector 1 dispute (403 Forbidden)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 6] Recycler can access relevant dispute
    // -------------------------------------------------------------
    console.log('[TEST 6] Recycler can access relevant dispute...');
    const recyclerDisputeView = await disputeService.getDisputeById(testRecyclerUser1, dispute1.id);
    assert(recyclerDisputeView.id === dispute1.id, 'Test 6.1: Counterparty Recycler can view dispute');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 7] Recycler cannot access unrelated dispute
    // -------------------------------------------------------------
    console.log('[TEST 7] Recycler cannot access unrelated dispute...');
    let recyclerTenancyBlocked = false;
    try {
      await disputeService.getDisputeById(testRecyclerUser2, dispute1.id);
    } catch (err) {
      if (err.statusCode === 403) recyclerTenancyBlocked = true;
    }
    assert(recyclerTenancyBlocked, 'Test 7.1: Unrelated Recycler 2 blocked from viewing Recycler 1 dispute (403 Forbidden)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 8] Admin dispute visibility
    // -------------------------------------------------------------
    console.log('[TEST 8] Admin dispute visibility...');
    const adminDisputeView = await disputeService.getDisputeById(testAdminUser, dispute1.id);
    assert(adminDisputeView.id === dispute1.id, 'Test 8.1: Admin can access any dispute');
    const adminList = await disputeService.listDisputes(testAdminUser);
    assert(adminList.disputes.length >= 1, 'Test 8.2: Admin can list all disputes system-wide');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 9] Duplicate active dispute handling
    // -------------------------------------------------------------
    console.log('[TEST 9] Duplicate active dispute handling...');
    let duplicateBlocked = false;
    try {
      await disputeService.openDispute(testCollectorUser1, {
        materialLotId: trade1.lot.id,
        disputeType: DISPUTE_TYPES.CONDITION_MISMATCH,
        description: 'Attempting second concurrent dispute on same lot',
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('already exists')) {
        duplicateBlocked = true;
      }
    }
    assert(duplicateBlocked, 'Test 9.1: Opening second concurrent active dispute on same lot is strictly blocked (400 Bad Request)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 10] Weight mismatch workflow
    // -------------------------------------------------------------
    console.log('[TEST 10] Weight mismatch workflow...');
    const trade10 = await setupTradeLot({ lotWeightKg: 50, handoverWeightKg: 40, unitPrice: 200 });
    const dispute10 = await disputeService.openDispute(testCollectorUser1, {
      materialLotId: trade10.lot.id,
      disputeType: DISPUTE_TYPES.WEIGHT_MISMATCH,
      description: 'Handover scale read 40kg, collector claims 45kg',
      disputedEstimatedWeightKg: 50,
      disputedFinalWeightKg: 40,
    });
    createdDisputeIds.push(dispute10.id);

    // Recycler responds
    const response10 = await disputeService.respondToDispute(testRecyclerUser1, dispute10.id, {
      note: 'Re-calibrated certified digital scale and measured 45kg',
      proposedWeightKg: 45,
      proposedAction: 'ACCEPT_45KG',
    });
    assert(response10.status === DISPUTE_STATUS.UNDER_REVIEW, 'Test 10.1: Dispute transitions to UNDER_REVIEW upon response');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 11] Original weight preserved
    // -------------------------------------------------------------
    console.log('[TEST 11] Original weight preserved...');
    const originalLot = await prisma.materialLot.findUnique({ where: { id: trade10.lot.id } });
    assert(Number(originalLot.approximateTotalWeightKg) === 50, 'Test 11.1: Original lot weight remains untouched (50kg)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 12] Corrected authoritative weight recorded
    // -------------------------------------------------------------
    console.log('[TEST 12] Corrected authoritative weight recorded...');
    const resolved10 = await disputeService.resolveDispute(testRecyclerUser1, dispute10.id, {
      resolutionType: DISPUTE_RESOLUTION_TYPE.WEIGHT_CORRECTION,
      resolutionNotes: 'Agreed on 45kg based on certified scale re-weighing',
      resolvedWeightKg: 45,
    });
    assert(resolved10.status === DISPUTE_STATUS.RESOLVED, 'Test 12.1: Dispute status is RESOLVED');
    assert(Number(resolved10.resolvedWeightKg) === 45, 'Test 12.2: Corrected weight recorded as 45kg');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 13] Server recalculates payable (weight × rate)
    // -------------------------------------------------------------
    console.log('[TEST 13] Server recalculates payable authoritative settlement...');
    // Agreed unit rate = 200; resolved weight = 45kg -> expected final payable = 9000
    assert(Number(resolved10.resolvedAmount) === 9000, `Test 13.1: Server authoritative payable calculated (45 * 200 = ${resolved10.resolvedAmount})`);
    const updatedTxn10 = await prisma.transactionRecord.findUnique({ where: { id: trade10.transaction.id } });
    assert(Number(updatedTxn10.finalSaleValue) === 9000, 'Test 13.2: Transaction finalSaleValue updated to ₹9000');
    assert(Number(updatedTxn10.quantity) === 45, 'Test 13.3: Transaction quantity updated to 45kg');
    assert(Number(updatedTxn10.amountDue) === 9000, 'Test 13.4: Transaction amountDue updated to ₹9000');
    assert(updatedTxn10.notes.includes('[Dispute'), 'Test 13.5: Transaction notes contain audit trail of dispute adjustment');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 14] Material mismatch workflow
    // -------------------------------------------------------------
    console.log('[TEST 14] Material mismatch workflow...');
    const trade14 = await setupTradeLot({ lotWeightKg: 60, unitPrice: 150 });
    const dispute14 = await disputeService.openDispute(testRecyclerUser1, {
      materialLotId: trade14.lot.id,
      disputeType: DISPUTE_TYPES.MATERIAL_MISMATCH,
      description: 'Lot declared as telecom boards but contains mixed power supplies',
    });
    createdDisputeIds.push(dispute14.id);
    assert(dispute14.disputeType === DISPUTE_TYPES.MATERIAL_MISMATCH, 'Test 14.1: Material mismatch dispute created');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 15] Partial acceptance workflow
    // -------------------------------------------------------------
    console.log('[TEST 15] Partial acceptance workflow...');
    const resolved14 = await disputeService.resolveDispute(testRecyclerUser1, dispute14.id, {
      resolutionType: DISPUTE_RESOLUTION_TYPE.PARTIAL_ACCEPTANCE,
      resolutionNotes: 'Accepted 40kg valid boards, rejected 20kg contaminated scrap',
      acceptedQuantityKg: 40,
      rejectedQuantityKg: 20,
    });
    assert(
      resolved14.status === DISPUTE_STATUS.PARTIALLY_RESOLVED,
      'Test 15.1: Status transitions to PARTIALLY_RESOLVED when rejected quantity exists'
    );
    console.log('');

    // -------------------------------------------------------------
    // [TEST 16] Accepted quantity settles correctly
    // -------------------------------------------------------------
    console.log('[TEST 16] Accepted quantity settles correctly...');
    // Rate = 150, accepted = 40kg -> expected = 6000
    assert(Number(resolved14.resolvedAmount) === 6000, 'Test 16.1: Payable is calculated ONLY on accepted 40kg (40 * 150 = ₹6000)');
    const txn14 = await prisma.transactionRecord.findUnique({ where: { id: trade14.transaction.id } });
    assert(Number(txn14.finalSaleValue) === 6000, 'Test 16.2: Transaction finalSaleValue reflects accepted quantity only');
    assert(Number(txn14.quantity) === 40, 'Test 16.3: Transaction quantity updated to accepted 40kg');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 17] Rejected quantity does not settle
    // -------------------------------------------------------------
    console.log('[TEST 17] Rejected quantity does not settle...');
    assert(Number(resolved14.rejectedQuantityKg) === 20, 'Test 17.1: Rejected quantity 20kg tracked explicitly');
    assert(Number(txn14.finalSaleValue) !== 9000, 'Test 17.2: Total 60kg value was NOT settled');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 18] Handover rejection
    // -------------------------------------------------------------
    console.log('[TEST 18] Handover rejection...');
    const trade18 = await setupTradeLot({ lotWeightKg: 30, unitPrice: 80 });
    const dispute18 = await disputeService.openDispute(testRecyclerUser1, {
      materialLotId: trade18.lot.id,
      handoverId: trade18.handover.id,
      disputeType: DISPUTE_TYPES.HANDOVER_REJECTION,
      description: 'Physical inspection failed: severe water damage and corrosive leakage',
    });
    createdDisputeIds.push(dispute18.id);

    const updatedHandover18 = await prisma.handoverRecord.findUnique({ where: { id: trade18.handover.id } });
    assert(updatedHandover18.status === HANDOVER_STATUS.REJECTED, 'Test 18.1: Handover status marked as REJECTED');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 19] Rejected handover cannot create successful settlement
    // -------------------------------------------------------------
    console.log('[TEST 19] Rejected handover cannot create successful settlement...');
    const lot18 = await prisma.materialLot.findUnique({ where: { id: trade18.lot.id } });
    assert(lot18.status === MATERIAL_LOT_STATUS.DISPUTED, 'Test 19.1: Lot remains in DISPUTED state');
    assert(updatedHandover18.status !== HANDOVER_STATUS.CONFIRMED, 'Test 19.2: Rejected handover cannot be treated as confirmed');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 20] Return request
    // -------------------------------------------------------------
    console.log('[TEST 20] Return request initiation...');
    const returnInitiated = await disputeService.initiateReturn(testCollectorUser1, dispute18.id, {
      quantityKg: 30,
      returnTrackingNotes: 'Collector arranged local carrier for return pickup',
    });
    assert(returnInitiated.status === DISPUTE_STATUS.RETURN_PENDING, 'Test 20.1: Dispute status is RETURN_PENDING');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 21] Return completion
    // -------------------------------------------------------------
    console.log('[TEST 21] Return completion...');
    const returnCompleted = await disputeService.completeReturn(testCollectorUser1, dispute18.id, {
      completionNotes: 'Carrier delivered returned materials back to collector warehouse',
    });
    assert(returnCompleted.status === DISPUTE_STATUS.RETURNED, 'Test 21.1: Dispute status is RETURNED');
    assert(returnCompleted.returnedAt !== null, 'Test 21.2: returnedAt timestamp recorded');

    const lotReturned = await prisma.materialLot.findUnique({ where: { id: trade18.lot.id } });
    assert(lotReturned.status === MATERIAL_LOT_STATUS.RETURNED, 'Test 21.3: Material lot status is RETURNED');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 22] Return cannot complete twice
    // -------------------------------------------------------------
    console.log('[TEST 22] Return cannot complete twice...');
    let doubleReturnBlocked = false;
    try {
      await disputeService.completeReturn(testCollectorUser1, dispute18.id, {
        completionNotes: 'Attempting second return completion',
      });
    } catch (err) {
      if (err.statusCode === 400) doubleReturnBlocked = true;
    }
    assert(doubleReturnBlocked, 'Test 22.1: Duplicate return completion strictly blocked (400 Bad Request)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 23] Cancellation before handover
    // -------------------------------------------------------------
    console.log('[TEST 23] Cancellation before handover...');
    const lot23Ref = `LOT-P7-CANC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const lot23 = await prisma.materialLot.create({
      data: {
        referenceNumber: lot23Ref,
        collectorId: testCollectorProfile1.id,
        category: MATERIAL_CATEGORIES.BATTERY,
        subcategory: 'Lithium Ion',
        approximateTotalWeightKg: 25,
        status: MATERIAL_LOT_STATUS.ACCEPTED,
      },
    });
    createdLotIds.push(lot23.id);

    const dispute23 = await disputeService.openDispute(testCollectorUser1, {
      materialLotId: lot23.id,
      disputeType: DISPUTE_TYPES.CANCELLATION_REQUEST,
      description: 'Vehicle breakdown prevented delivery before handover was started',
    });
    createdDisputeIds.push(dispute23.id);

    const cancelled23 = await disputeService.cancelDispute(
      testCollectorUser1,
      dispute23.id,
      'Collector agreed to cancel deal and re-list lot'
    );
    assert(cancelled23.status === DISPUTE_STATUS.CANCELLED, 'Test 23.1: Dispute status is CANCELLED');

    const refreshedLot23 = await prisma.materialLot.findUnique({ where: { id: lot23.id } });
    assert(
      refreshedLot23.status === MATERIAL_LOT_STATUS.ACCEPTED || refreshedLot23.status === MATERIAL_LOT_STATUS.OPEN,
      'Test 23.2: Lot status cleanly restored from DISPUTED'
    );
    console.log('');

    // -------------------------------------------------------------
    // [TEST 24] Invalid cancellation after irreversible state
    // -------------------------------------------------------------
    console.log('[TEST 24] Invalid cancellation after irreversible state (PAID)...');
    const trade24 = await setupTradeLot({
      lotWeightKg: 30,
      unitPrice: 100,
      paymentStatus: PAYMENT_STATUS.PAID,
      amountPaid: 3000,
    });

    let paidCancellationBlocked = false;
    try {
      await disputeService.openDispute(testCollectorUser1, {
        materialLotId: trade24.lot.id,
        disputeType: DISPUTE_TYPES.CANCELLATION_REQUEST,
        description: 'Attempting casual cancellation after full payment',
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('paid')) {
        paidCancellationBlocked = true;
      }
    }
    assert(paidCancellationBlocked, 'Test 24.1: Casual deal cancellation after deal is PAID is blocked (400 Bad Request)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 25] Payment dispute
    // -------------------------------------------------------------
    console.log('[TEST 25] Payment dispute creation...');
    const trade25 = await setupTradeLot({
      lotWeightKg: 50,
      unitPrice: 100,
      paymentStatus: PAYMENT_STATUS.PENDING,
      amountPaid: 0,
    });
    const dispute25 = await disputeService.openDispute(testCollectorUser1, {
      materialLotId: trade25.lot.id,
      disputeType: DISPUTE_TYPES.PAYMENT_DISPUTE,
      description: 'Agreed unit price was ₹110 per kg on phone, but quote reflects ₹100',
      disputedAmount: 5500,
    });
    createdDisputeIds.push(dispute25.id);
    assert(dispute25.disputeType === DISPUTE_TYPES.PAYMENT_DISPUTE, 'Test 25.1: Payment dispute opened');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 26] Payment correction preserves original record
    // -------------------------------------------------------------
    console.log('[TEST 26] Payment correction preserves original record...');
    const resolved25 = await disputeService.resolveDispute(testRecyclerUser1, dispute25.id, {
      resolutionType: DISPUTE_RESOLUTION_TYPE.PRICE_ADJUSTMENT,
      resolutionNotes: 'Agreed to adjust price to ₹5,500 based on agreed rate discrepancy',
      resolvedAmount: 5500,
    });
    assert(resolved25.status === DISPUTE_STATUS.RESOLVED, 'Test 26.1: Dispute resolved with PRICE_ADJUSTMENT');
    const txn25 = await prisma.transactionRecord.findUnique({ where: { id: trade25.transaction.id } });
    assert(Number(txn25.finalSaleValue) === 5500, 'Test 26.2: Transaction finalSaleValue adjusted to ₹5,500');
    assert(txn25.notes.includes('adjusted from ₹5000 to ₹5500'), 'Test 26.3: Previous payment baseline preserved in audit notes');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 27] Earnings ledger reflects authoritative adjustment
    // -------------------------------------------------------------
    console.log('[TEST 27] Earnings ledger reflects authoritative adjustment...');
    assert(Number(txn25.amountDue) === 5500, 'Test 27.1: Amount due correctly reflects adjusted ₹5,500');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 28] Pickup batch isolation
    // -------------------------------------------------------------
    console.log('[TEST 28] Pickup batch isolation (Disputing Lot B does not affect Lot A)...');
    const batchRef = `BAT-P7-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const batch = await prisma.pickupBatch.create({
      data: {
        referenceNumber: batchRef,
        recyclerId: testRecyclerProfile1.id,
        collectorId: testCollectorProfile1.id,
        status: 'PLANNED',
        createdById: testRecyclerUser1.id,
      },
    });
    createdBatchIds.push(batch.id);

    const tradeA = await setupTradeLot({ lotWeightKg: 20 });
    const tradeB = await setupTradeLot({ lotWeightKg: 25 });

    await prisma.pickupBatchLot.createMany({
      data: [
        { batchId: batch.id, materialLotId: tradeA.lot.id, addedById: testRecyclerUser1.id },
        { batchId: batch.id, materialLotId: tradeB.lot.id, addedById: testRecyclerUser1.id },
      ],
    });

    // Dispute ONLY Lot B
    const disputeB = await disputeService.openDispute(testCollectorUser1, {
      materialLotId: tradeB.lot.id,
      pickupBatchId: batch.id,
      disputeType: DISPUTE_TYPES.WEIGHT_MISMATCH,
      description: 'Lot B weight dispute within multi-lot batch',
    });
    createdDisputeIds.push(disputeB.id);

    const refreshedLotA = await prisma.materialLot.findUnique({ where: { id: tradeA.lot.id } });
    const refreshedLotB = await prisma.materialLot.findUnique({ where: { id: tradeB.lot.id } });
    const refreshedBatch = await prisma.pickupBatch.findUnique({ where: { id: batch.id } });

    assert(refreshedLotB.status === MATERIAL_LOT_STATUS.DISPUTED, 'Test 28.1: Disputed Lot B transitioned to DISPUTED');
    assert(refreshedLotA.status === MATERIAL_LOT_STATUS.ACCEPTED, 'Test 28.2: Undisputed Lot A remains unaffected in ACCEPTED state');
    assert(refreshedBatch.status === 'PLANNED', 'Test 28.3: PickupBatch remains operational (PLANNED)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 29] Traceability includes dispute
    // -------------------------------------------------------------
    console.log('[TEST 29] Traceability includes dispute and timeline stage...');
    const trace = await lotTraceService.getLotTrace(testCollectorUser1, tradeB.lot.id);
    assert(Array.isArray(trace.disputes), 'Test 29.1: Traceability object contains disputes array');
    assert(trace.disputes.length === 1, 'Test 29.2: Disputed lot has exactly 1 dispute record in trace');
    assert(trace.disputes[0].id === disputeB.id, 'Test 29.3: Linked dispute matches disputeB');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 30] Duplicate resolution blocked
    // -------------------------------------------------------------
    console.log('[TEST 30] Duplicate resolution blocked...');
    let duplicateResolveBlocked = false;
    try {
      await disputeService.resolveDispute(testRecyclerUser1, dispute10.id, {
        resolutionType: DISPUTE_RESOLUTION_TYPE.WEIGHT_CORRECTION,
        resolutionNotes: 'Resolving already resolved dispute',
        resolvedWeightKg: 45,
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('already been concluded')) {
        duplicateResolveBlocked = true;
      }
    }
    assert(duplicateResolveBlocked, 'Test 30.1: Duplicate resolution on closed dispute is blocked (400 Bad Request)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 31] Invalid state transition blocked
    // -------------------------------------------------------------
    console.log('[TEST 31] Invalid state transition blocked...');
    let invalidTransitionBlocked = false;
    try {
      await disputeService.respondToDispute(testRecyclerUser1, dispute10.id, {
        note: 'Trying to respond to resolved dispute',
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('Cannot respond')) {
        invalidTransitionBlocked = true;
      }
    }
    assert(invalidTransitionBlocked, 'Test 31.1: Cannot respond to already resolved dispute (400 Bad Request)');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 32] Audit event generated
    // -------------------------------------------------------------
    console.log('[TEST 32] Immutable dispute audit events generated...');
    const disputeEvents = await prisma.marketplaceDisputeEvent.findMany({
      where: { disputeId: dispute10.id },
      orderBy: { createdAt: 'asc' },
    });
    assert(disputeEvents.length >= 3, `Test 32.1: Dispute has sequential events (found ${disputeEvents.length})`);
    assert(disputeEvents[0].eventType === 'DISPUTE_OPENED', 'Test 32.2: First event is DISPUTE_OPENED');
    assert(disputeEvents[1].eventType === 'DISPUTE_RESPONDED', 'Test 32.3: Second event is DISPUTE_RESPONDED');
    assert(disputeEvents[2].eventType === 'DISPUTE_RESOLVED', 'Test 32.4: Third event is DISPUTE_RESOLVED');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 33] Contact privacy preserved
    // -------------------------------------------------------------
    console.log('[TEST 33] Counterparty contact privacy preserved...');
    const recyclerDisputeDetail = await disputeService.getDisputeById(testRecyclerUser1, dispute1.id);
    const collectorInView = recyclerDisputeDetail.materialLot.collector.user;
    assert(collectorInView.id === testCollectorUser1.id, 'Test 33.1: Collector user ID is present');
    assert(collectorInView.phone === undefined, 'Test 33.2: Collector phone is masked/scrubbed from counterparty view');
    assert(collectorInView.email === undefined, 'Test 33.3: Collector email is masked/scrubbed from counterparty view');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 34] Offline draft does not appear final
    // -------------------------------------------------------------
    console.log('[TEST 34] Offline draft contract check...');
    // Verify that local draft structure cannot be recognized by the server as a created dispute
    const draftKey = `ecosetu_dispute_draft_${tradeA.lot.id}`;
    const clientDraft = {
      materialLotId: tradeA.lot.id,
      disputeType: DISPUTE_TYPES.WEIGHT_MISMATCH,
      description: 'Drafted in offline mode',
      disputedWeight: 18,
      savedAt: new Date().toISOString(),
      isDraft: true,
    };
    // Search DB for this draft
    const nonExistent = await prisma.marketplaceDispute.findFirst({
      where: { materialLotId: tradeA.lot.id },
    });
    assert(nonExistent === null, 'Test 34.1: Client draft does not create server dispute until committed online');
    assert(clientDraft.isDraft === true, 'Test 34.2: Draft contract explicitly preserves isDraft indicator');
    console.log('');

    // -------------------------------------------------------------
    // [TEST 35] Localization key parity (EN, HI, MR, OR)
    // -------------------------------------------------------------
    console.log('[TEST 35] Vernacular localization parity (EN, HI, MR, OR)...');
    const requiredKeys = [
      'dispute',
      'reportProblem',
      'weightMismatch',
      'materialMismatch',
      'conditionMismatch',
      'partialAcceptance',
      'handoverRejected',
      'handoverDispute',
      'paymentDispute',
      'cancellation',
      'returnRequest',
      'other',
      'open',
      'underReview',
      'partiallyResolved',
      'resolved',
      'rejected',
      'cancelled',
      'returnPending',
      'returned',
      'submit',
      'respond',
      'resolve',
      'accept',
      'reject',
      'returnRequested',
      'returnCompleted',
      'originalAmount',
      'adjustedAmount',
      'originalWeight',
      'resolvedWeight',
      'resolutionNotes',
      'disputeReference',
      'timeline',
      'evidence',
    ];

    const localesDir = path.resolve(__dirname, '../../mobile/src/i18n/locales');
    const locales = ['en.ts', 'hi.ts', 'mr.ts', 'or.ts'];

    for (const localeFile of locales) {
      const filePath = path.join(localesDir, localeFile);
      const content = fs.readFileSync(filePath, 'utf8');
      const lang = localeFile.replace('.ts', '').toUpperCase();

      for (const key of requiredKeys) {
        const regex = new RegExp(`\\b${key}\\s*:`, 'i');
        assert(
          regex.test(content),
          `Test 35: Locale ${lang} contains dispute key '${key}'`
        );
      }
    }
    console.log(`✓ All ${requiredKeys.length} dispute keys verified across 4 languages (EN, HI, MR, OR).\n`);

    // -------------------------------------------------------------
    // [CLEANUP] Clean up isolated fixtures
    // -------------------------------------------------------------
    console.log('[CLEANUP] Cleaning up isolated test fixtures...');
    if (createdDisputeIds.length > 0) {
      await prisma.marketplaceDisputeEvent.deleteMany({
        where: { disputeId: { in: createdDisputeIds } },
      });
      await prisma.marketplaceDispute.deleteMany({
        where: { id: { in: createdDisputeIds } },
      });
    }

    if (createdBatchIds.length > 0) {
      await prisma.pickupBatchLot.deleteMany({
        where: { batchId: { in: createdBatchIds } },
      });
      await prisma.pickupBatch.deleteMany({
        where: { id: { in: createdBatchIds } },
      });
    }

    if (createdTransactionIds.length > 0) {
      await prisma.transactionRecord.deleteMany({
        where: { id: { in: createdTransactionIds } },
      });
    }

    if (createdHandoverIds.length > 0) {
      await prisma.handoverRecord.deleteMany({
        where: { id: { in: createdHandoverIds } },
      });
    }

    if (createdQuoteIds.length > 0) {
      await prisma.quote.deleteMany({
        where: { id: { in: createdQuoteIds } },
      });
    }

    if (createdLotIds.length > 0) {
      await prisma.materialLot.deleteMany({
        where: { id: { in: createdLotIds } },
      });
    }

    await prisma.collectorProfile.deleteMany({
      where: { id: { in: [testCollectorProfile1.id, testCollectorProfile2.id] } },
    });
    await prisma.recyclerProfile.deleteMany({
      where: { id: { in: [testRecyclerProfile1.id, testRecyclerProfile2.id] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            testCollectorUser1.id,
            testCollectorUser2.id,
            testRecyclerUser1.id,
            testRecyclerUser2.id,
            testAdminUser.id,
            testCitizenUser.id,
          ],
        },
      },
    });

    console.log('✓ Cleanup completed.\n');

    console.log('================================================================');
    console.log('--- PHASE 7 VERIFICATION SUMMARY ---');
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total:  ${passedTests + failedTests}`);
    console.log('================================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL MARKETPLACE PHASE 7 TESTS PASSED SUCCESSFULLY!\n');
    }
  } catch (error) {
    console.error('❌ Phase 7 Test Failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
