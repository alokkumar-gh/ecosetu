/**
 * verify_marketplace_phase5.js
 * Comprehensive automated verification for EcoSetu Marketplace Phase 5:
 * Advanced Logistics, Pickup Batches & Multi-Lot Consolidation
 * Canonical Baseline SHA: 5eb21425b0aa7affe1fa11e6b5945dd3482625d7
 */

const prisma = require('../src/config/database');
const pickupBatchService = require('../src/services/pickupBatchService');
const materialLotService = require('../src/services/materialLotService');
const quoteService = require('../src/services/quoteService');
const handoverService = require('../src/services/handoverService');
const transactionService = require('../src/services/transactionService');
const lotTraceService = require('../src/services/lotTraceService');
const { ROLES, BATCH_STATUS, MATERIAL_LOT_STATUS, QUOTE_STATUS, HANDOVER_STATUS } = require('../src/utils/constants');

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('--- STARTING VERIFY_MARKETPLACE_PHASE_5 (ADVANCED LOGISTICS) ---');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- Step 0: Test Setup & Entity Provisioning ---
  console.log('--- [0] Setting up database fixtures for Phase 5 Logistics testing ---');
  const timestamp = Date.now();

  const collectorUserA = await prisma.user.create({
    data: {
      email: `collector_logistics_a_${timestamp}@ecosetu.test`,
      passwordHash: 'hashed_pw',
      name: 'Ramesh Logistics Collector A',
      phone: '+919876500501',
      role: ROLES.INFORMAL_COLLECTOR,
      status: 'ACTIVE',
    },
  });

  const collectorProfileA = await prisma.collectorProfile.create({
    data: {
      userId: collectorUserA.id,
      serviceArea: 'Andheri East, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      isAvailable: true,
    },
  });

  const collectorUserB = await prisma.user.create({
    data: {
      email: `collector_logistics_b_${timestamp}@ecosetu.test`,
      passwordHash: 'hashed_pw',
      name: 'Suresh Unrelated Collector B',
      phone: '+919876500502',
      role: ROLES.INFORMAL_COLLECTOR,
      status: 'ACTIVE',
    },
  });

  const collectorProfileB = await prisma.collectorProfile.create({
    data: {
      userId: collectorUserB.id,
      serviceArea: 'Bandra West, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      isAvailable: true,
    },
  });

  const recyclerUserA = await prisma.user.create({
    data: {
      email: `recycler_logistics_a_${timestamp}@ecosetu.test`,
      passwordHash: 'hashed_pw',
      name: 'GreenTech Logistics Processing Hub',
      phone: '+919876500503',
      role: ROLES.RECYCLER,
      status: 'ACTIVE',
    },
  });

  const recyclerProfileA = await prisma.recyclerProfile.create({
    data: {
      userId: recyclerUserA.id,
      facilityName: 'GreenTech Logistics Processing Hub',
      facilityAddress: 'Plot 42, MIDC Taloja, Navi Mumbai',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      acceptedCategories: ['MOBILE_PHONE', 'KEYBOARD_MOUSE', 'TABLET', 'LAPTOP'],
      authorizationStatus: 'AUTHORIZED',
      isActive: true,
    },
  });

  const recyclerUserB = await prisma.user.create({
    data: {
      email: `recycler_logistics_b_${timestamp}@ecosetu.test`,
      passwordHash: 'hashed_pw',
      name: 'EcoMetal Smelters Facility B',
      phone: '+919876500504',
      role: ROLES.RECYCLER,
      status: 'ACTIVE',
    },
  });

  const recyclerProfileB = await prisma.recyclerProfile.create({
    data: {
      userId: recyclerUserB.id,
      facilityName: 'EcoMetal Smelters Facility B',
      facilityAddress: 'Plot 88, Rabale MIDC, Navi Mumbai',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      acceptedCategories: ['MOBILE_PHONE', 'KEYBOARD_MOUSE', 'TABLET', 'LAPTOP'],
      authorizationStatus: 'AUTHORIZED',
      isActive: true,
    },
  });

  const citizenUser = await prisma.user.create({
    data: {
      email: `citizen_logistics_${timestamp}@ecosetu.test`,
      passwordHash: 'hashed_pw',
      name: 'Anjali Citizen',
      phone: '+919876500505',
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    },
  });

  // Create Material Lots
  // Lot 1: Mobile Phones (Collector A, 10 kg)
  const lot1 = await materialLotService.createMaterialLot(collectorUserA, {
    category: 'MOBILE_PHONE',
    subcategory: 'Smartphones & Feature Phones',
    approximateTotalWeightKg: 10.0,
    condition: 'NOT_WORKING',
    sourceType: 'HOUSEHOLD',
    description: '10 kg batch of collected damaged mobile phones',
  });

  // Lot 2: Keyboards (Collector A, 8 kg)
  const lot2 = await materialLotService.createMaterialLot(collectorUserA, {
    category: 'KEYBOARD_MOUSE',
    subcategory: 'Keyboards & Mice',
    approximateTotalWeightKg: 8.0,
    condition: 'NOT_WORKING',
    sourceType: 'COMMERCIAL',
    description: '8 kg batch of mixed keyboards and mice',
  });

  // Lot 3: Tablets (Collector A, 6 kg) -> Accepted by Recycler B (incompatible buyer)
  const lot3 = await materialLotService.createMaterialLot(collectorUserA, {
    category: 'TABLET',
    subcategory: 'iPads & Android Tablets',
    approximateTotalWeightKg: 6.0,
    condition: 'DAMAGED',
    sourceType: 'HOUSEHOLD',
    description: '6 kg batch of damaged tablets',
  });

  // Lot 4: Unrelated lot from Collector B
  const lot4 = await materialLotService.createMaterialLot(collectorUserB, {
    category: 'LAPTOP',
    subcategory: 'Laptops',
    approximateTotalWeightKg: 15.0,
    condition: 'NOT_WORKING',
    sourceType: 'COMMERCIAL',
    description: '15 kg batch of scrap laptops',
  });

  // Open lots for quotes
  await materialLotService.updateMaterialLot(collectorUserA, lot1.id, { status: MATERIAL_LOT_STATUS.OPEN });
  await materialLotService.updateMaterialLot(collectorUserA, lot2.id, { status: MATERIAL_LOT_STATUS.OPEN });
  await materialLotService.updateMaterialLot(collectorUserA, lot3.id, { status: MATERIAL_LOT_STATUS.OPEN });
  await materialLotService.updateMaterialLot(collectorUserB, lot4.id, { status: MATERIAL_LOT_STATUS.OPEN });

  // Recycler A quotes on Lot 1 (₹200/kg) and Lot 2 (₹240/kg)
  const quote1 = await quoteService.createQuote(recyclerUserA, {
    materialLotId: lot1.id,
    quotedUnitPrice: 200.0,
    validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
    notes: 'Offer of ₹200/kg for mobile phone lot',
  });

  const quote2 = await quoteService.createQuote(recyclerUserA, {
    materialLotId: lot2.id,
    quotedUnitPrice: 240.0,
    validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
    notes: 'Offer of ₹240/kg for keyboard/mouse lot',
  });

  // Recycler B quotes on Lot 3 (₹180/kg)
  const quote3 = await quoteService.createQuote(recyclerUserB, {
    materialLotId: lot3.id,
    quotedUnitPrice: 180.0,
    validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
    notes: 'Offer of ₹180/kg from Recycler B',
  });

  // Collector A accepts quote 1 and quote 2 (Both buyer: Recycler A) and quote 3 (Buyer: Recycler B)
  await quoteService.acceptQuote(collectorUserA, quote1.id);
  await quoteService.acceptQuote(collectorUserA, quote2.id);
  await quoteService.acceptQuote(collectorUserA, quote3.id);

  console.log('✓ Test fixtures initialized successfully.\n');

  try {
    // --- TEST 1: Authorized Recycler can create Pickup Batch with eligible lots ---
    console.log('[TEST 1] Authorized Recycler creates a multi-lot Pickup Batch with Lot 1 and Lot 2...');
    const batch1 = await pickupBatchService.createBatch(recyclerUserA, {
      lotIds: [lot1.id, lot2.id],
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      pickupAddress: 'Andheri East Collection Point, Mumbai',
      notes: 'Consolidated pickup for Mobile and Keyboard lots',
    });

    assert(batch1 && batch1.referenceNumber.startsWith('BAT-'), 'Test 1.1: Batch created with human-readable reference (BAT-YYYYMM-XXXXX)');
    assert(batch1.status === BATCH_STATUS.SCHEDULED, 'Test 1.2: Batch with scheduled date initializes in SCHEDULED status');
    assert(batch1.lots.length === 2, 'Test 1.3: Batch contains exactly 2 consolidated material lots');
    assert(batch1.consolidatedSummary.totalEstimatedWeightKg === 18.0, 'Test 1.4: Consolidated estimated weight is arithmetic sum (10 + 8 = 18 kg)');

    // --- TEST 2: Unauthorized participant (Citizen) cannot create batch ---
    console.log('\n[TEST 2] Verifying Citizen is rejected from creating pickup batch (403)...');
    let unauthorizedError = null;
    try {
      await pickupBatchService.createBatch(citizenUser, {
        lotIds: [lot1.id],
      });
    } catch (err) {
      unauthorizedError = err;
    }
    assert(unauthorizedError && unauthorizedError.statusCode === 403, 'Test 2: Citizen unauthorized from creating logistics batch (403 Forbidden)');

    // --- TEST 3: Incompatible buyer lot cannot be added to batch ---
    console.log('\n[TEST 3] Attempting to add Lot 3 (accepted by Recycler B) into Recycler A batch...');
    let incompatibleBuyerError = null;
    try {
      await pickupBatchService.addLotsToBatch(recyclerUserA, batch1.id, [lot3.id]);
    } catch (err) {
      incompatibleBuyerError = err;
    }
    assert(incompatibleBuyerError && incompatibleBuyerError.statusCode === 400, 'Test 3: Incompatible buyer lot strictly blocked from consolidation (400 Bad Request)');

    // --- TEST 4: Lot already in active batch cannot be added to another active batch ---
    console.log('\n[TEST 4] Attempting to create duplicate active batch with Lot 1...');
    let duplicateBatchError = null;
    try {
      await pickupBatchService.createBatch(recyclerUserA, {
        lotIds: [lot1.id],
      });
    } catch (err) {
      duplicateBatchError = err;
    }
    assert(duplicateBatchError && duplicateBatchError.statusCode === 400, 'Test 4: Lot cannot belong to multiple active batches simultaneously (400 Bad Request)');

    // --- TEST 5: Lot removal disassociates lot without deleting underlying lot ---
    console.log('\n[TEST 5] Removing Lot 2 from batch...');
    const updatedBatch = await pickupBatchService.removeLotFromBatch(recyclerUserA, batch1.id, lot2.id);
    assert(updatedBatch.lots.length === 1, 'Test 5.1: Batch now contains 1 lot after removal');

    const lot2Check = await prisma.materialLot.findUnique({ where: { id: lot2.id } });
    assert(lot2Check && lot2Check.id === lot2.id, 'Test 5.2: Underlying MaterialLot remains intact and unmutated in database');

    // Re-add Lot 2 to batch1
    await pickupBatchService.addLotsToBatch(recyclerUserA, batch1.id, [lot2.id]);
    console.log('✓ Lot 2 re-added to batch');

    // --- TEST 6: Valid Batch Status Lifecycle Transitions ---
    console.log('\n[TEST 6] Verifying valid status transitions: SCHEDULED -> IN_PROGRESS -> ARRIVED -> COLLECTING...');
    const step1 = await pickupBatchService.updateBatchStatus(recyclerUserA, batch1.id, { status: BATCH_STATUS.IN_PROGRESS });
    assert(step1.status === BATCH_STATUS.IN_PROGRESS, 'Test 6.1: Transition to IN_PROGRESS succeeded');

    const step2 = await pickupBatchService.updateBatchStatus(recyclerUserA, batch1.id, { status: BATCH_STATUS.ARRIVED });
    assert(step2.status === BATCH_STATUS.ARRIVED, 'Test 6.2: Transition to ARRIVED succeeded');

    const step3 = await pickupBatchService.updateBatchStatus(recyclerUserA, batch1.id, { status: BATCH_STATUS.COLLECTING });
    assert(step3.status === BATCH_STATUS.COLLECTING, 'Test 6.3: Transition to COLLECTING succeeded');

    // --- TEST 7: Invalid status transition rejected ---
    console.log('\n[TEST 7] Attempting invalid backward transition COLLECTING -> PLANNED...');
    let invalidTransitionError = null;
    try {
      await pickupBatchService.updateBatchStatus(recyclerUserA, batch1.id, { status: BATCH_STATUS.PLANNED });
    } catch (err) {
      invalidTransitionError = err;
    }
    assert(invalidTransitionError && invalidTransitionError.statusCode === 400, 'Test 7: Invalid lifecycle transition strictly rejected (400 Bad Request)');

    // --- TEST 8: Lot-by-Lot Handover & Independent Commercial Settlement ---
    console.log('\n[TEST 8] Executing independent lot-level handovers and Phase 4 settlements within batch...');
    // Lot 1 Handover: Estimated 10 kg, Verified 9.5 kg @ ₹200/kg
    const hdo1 = await handoverService.createHandover(collectorUserA, {
      materialLotId: lot1.id,
      quoteId: quote1.id,
      handoverWeightKg: 9.5,
      batchId: batch1.id,
    });
    await handoverService.collectorConfirm(collectorUserA, hdo1.id, { handoverWeightKg: 9.5 });
    await handoverService.recyclerConfirm(recyclerUserA, hdo1.id, { handoverWeightKg: 9.5 });

    // Lot 1 Settlement: 9.5 kg * ₹200/kg = ₹1900.00
    const txn1 = await transactionService.createTransaction(collectorUserA, {
      handoverId: hdo1.id,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      amountPaid: 1900.0,
      paymentNotes: 'Settled in cash on-site',
    });

    // Lot 2 Handover: Estimated 8 kg, Verified 8.2 kg @ ₹240/kg
    const hdo2 = await handoverService.createHandover(collectorUserA, {
      materialLotId: lot2.id,
      quoteId: quote2.id,
      handoverWeightKg: 8.2,
      batchId: batch1.id,
    });
    await handoverService.collectorConfirm(collectorUserA, hdo2.id, { handoverWeightKg: 8.2 });
    await handoverService.recyclerConfirm(recyclerUserA, hdo2.id, { handoverWeightKg: 8.2 });

    // Lot 2 Settlement: 8.2 kg * ₹240/kg = ₹1968.00
    const txn2 = await transactionService.createTransaction(collectorUserA, {
      handoverId: hdo2.id,
      paymentMethod: 'UPI_RECORDED',
      paymentStatus: 'PAID',
      amountPaid: 1968.0,
      paymentNotes: 'Settled via digital transfer',
    });

    assert(Number(txn1.finalSaleValue) === 1900.0, 'Test 8.1: Lot 1 settlement preserved independent commercial value (9.5 kg * ₹200 = ₹1900)');
    assert(Number(txn2.finalSaleValue) === 1968.0, 'Test 8.2: Lot 2 settlement preserved independent commercial value (8.2 kg * ₹240 = ₹1968)');

    // --- TEST 9: Batch Summary & Completion ---
    console.log('\n[TEST 9] Completing batch and verifying consolidated operational summary...');
    const completedBatch = await pickupBatchService.updateBatchStatus(recyclerUserA, batch1.id, { status: BATCH_STATUS.COMPLETED });

    assert(completedBatch.status === BATCH_STATUS.COMPLETED, 'Test 9.1: Batch transitioned to COMPLETED');
    assert(completedBatch.completedAt !== null, 'Test 9.2: Completed timestamp recorded');
    assert(completedBatch.consolidatedSummary.totalVerifiedWeightKg === 17.7, 'Test 9.3: Total verified weight is arithmetic sum (9.5 + 8.2 = 17.7 kg)');
    assert(completedBatch.consolidatedSummary.totalFinalPayableAmount === 3868.0, 'Test 9.4: Total settlement amount is arithmetic sum (₹1900 + ₹1968 = ₹3868)');
    assert(completedBatch.consolidatedSummary.completedLotsCount === 2, 'Test 9.5: Both lots reflected as completed');

    // --- TEST 10: Journey B Traceability links Batch to Lot ---
    console.log('\n[TEST 10] Verifying Journey B traceability incorporates batch details...');
    const trace1 = await lotTraceService.getLotTrace(collectorUserA, lot1.id);
    assert(trace1.batch !== null && trace1.batch.referenceNumber === batch1.referenceNumber, 'Test 10.1: Lot 1 trace links to batch reference');
    assert(trace1.batch.status === BATCH_STATUS.COMPLETED, 'Test 10.2: Lot 1 trace reflects completed batch status');

    // --- TEST 11: Multi-Tenant Privacy Enforcement ---
    console.log('\n[TEST 11] Verifying contact privacy and tenancy isolation on batch endpoints...');
    let crossTenantError = null;
    try {
      await pickupBatchService.getBatchById(collectorUserB, batch1.id);
    } catch (err) {
      crossTenantError = err;
    }
    assert(crossTenantError && crossTenantError.statusCode === 403, 'Test 11.1: Uninvolved Collector B blocked from viewing Batch 1 (403 Forbidden)');

    const batchAsRecycler = await pickupBatchService.getBatchById(recyclerUserA, batch1.id);
    assert(batchAsRecycler.collector.phone === 'Contact hidden per privacy policy', 'Test 11.2: Collector contact number masked for Recycler view');

  } catch (error) {
    console.error('Unexpected error in Phase 5 test suite:', error);
    failed++;
  } finally {
    console.log('\n[CLEANUP] Cleaning up isolated test fixtures...');
    try {
      await prisma.transactionRecord.deleteMany({
        where: { collectorId: { in: [collectorProfileA.id, collectorProfileB.id] } },
      });
      await prisma.handoverPhoto.deleteMany({
        where: { handover: { collectorId: { in: [collectorProfileA.id, collectorProfileB.id] } } },
      });
      await prisma.handoverRecord.deleteMany({
        where: { collectorId: { in: [collectorProfileA.id, collectorProfileB.id] } },
      });
      await prisma.pickupBatchLot.deleteMany({
        where: { batch: { recyclerId: { in: [recyclerProfileA.id, recyclerProfileB.id] } } },
      });
      await prisma.pickupBatch.deleteMany({
        where: { recyclerId: { in: [recyclerProfileA.id, recyclerProfileB.id] } },
      });
      await prisma.quote.deleteMany({
        where: { recyclerId: { in: [recyclerProfileA.id, recyclerProfileB.id] } },
      });
      await prisma.materialLotItem.deleteMany({
        where: { lot: { collectorId: { in: [collectorProfileA.id, collectorProfileB.id] } } },
      });
      await prisma.materialLot.deleteMany({
        where: { collectorId: { in: [collectorProfileA.id, collectorProfileB.id] } },
      });
      await prisma.materialItem.deleteMany({
        where: { collectorId: { in: [collectorProfileA.id, collectorProfileB.id] } },
      });
      await prisma.collectorProfile.deleteMany({
        where: { id: { in: [collectorProfileA.id, collectorProfileB.id] } },
      });
      await prisma.recyclerProfile.deleteMany({
        where: { id: { in: [recyclerProfileA.id, recyclerProfileB.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [collectorUserA.id, collectorUserB.id, recyclerUserA.id, recyclerUserB.id, citizenUser.id] } },
      });
      console.log('✓ Cleanup completed.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log('--- PHASE 5 VERIFICATION SUMMARY ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL MARKETPLACE PHASE 5 TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runPhase5Tests();
