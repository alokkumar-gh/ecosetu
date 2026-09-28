/**
 * verify_issue12_recycler_pickup_management.js
 *
 * Automated Verification Script for Issue #12: Recycler Pickup Management
 * Verifies end-to-end lifecycle, multi-lot batching, handovers, RBAC, IDOR protection, state machine transitions, and database persistence.
 */

const prisma = require('../src/config/database');
const quoteService = require('../src/services/quoteService');
const handoverService = require('../src/services/handoverService');
const pickupBatchService = require('../src/services/pickupBatchService');
const {
  ROLES,
  USER_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
  QUOTE_STATUS,
  MATERIAL_LOT_STATUS,
  HANDOVER_STATUS,
  BATCH_STATUS,
} = require('../src/utils/constants');
const fs = require('fs');
const path = require('path');

async function runVerification() {
  console.log('========================================');
  console.log('VERIFYING ISSUE 12: RECYCLER PICKUP MANAGEMENT');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function record(checkNum, description, success, details = '') {
    if (success) {
      passed++;
      console.log(`[PASS] CHECK ${checkNum}: ${description} ${details}`);
    } else {
      failed++;
      console.error(`[FAIL] CHECK ${checkNum}: ${description} ${details}`);
    }
  }

  let collectorUserA, collectorProfileA;
  let collectorUserB, collectorProfileB;
  let recyclerUserA, recyclerProfileA;
  let recyclerUserB, recyclerProfileB;
  let citizenUser;
  let lotA, lotB;
  let quoteA, quoteB;
  let handoverA, handoverB;
  let batchA, batchB;

  try {
    const timestamp = Date.now();

    // 1. Setup Collector A & Collector B
    collectorUserA = await prisma.user.create({
      data: {
        email: `collector_12a_${timestamp}@ecosetu.test`,
        phone: `+9197111${String(timestamp).slice(-5)}`,
        name: 'Sunil Kumar',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        collectorProfile: {
          create: {
            city: 'Delhi',
            state: 'Delhi',
            serviceArea: 'Connaught Place',
          },
        },
      },
      include: { collectorProfile: true },
    });
    collectorProfileA = collectorUserA.collectorProfile;

    collectorUserB = await prisma.user.create({
      data: {
        email: `collector_12b_${timestamp}@ecosetu.test`,
        phone: `+9197222${String(timestamp).slice(-5)}`,
        name: 'Anita Verma',
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        collectorProfile: {
          create: {
            city: 'Mumbai',
            state: 'Maharashtra',
            serviceArea: 'Bandra',
          },
        },
      },
      include: { collectorProfile: true },
    });
    collectorProfileB = collectorUserB.collectorProfile;

    // 2. Setup Recycler A & Recycler B
    recyclerUserA = await prisma.user.create({
      data: {
        email: `recycler_12a_${timestamp}@ecosetu.test`,
        phone: `+9197333${String(timestamp).slice(-5)}`,
        name: 'Apex Metals',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        recyclerProfile: {
          create: {
            facilityName: 'Apex Metal Processing Hub A',
            facilityAddress: 'Okhla Industrial Area',
            city: 'Delhi',
            state: 'Delhi',
            authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
          },
        },
      },
      include: { recyclerProfile: true },
    });
    recyclerProfileA = recyclerUserA.recyclerProfile;

    recyclerUserB = await prisma.user.create({
      data: {
        email: `recycler_12b_${timestamp}@ecosetu.test`,
        phone: `+9197444${String(timestamp).slice(-5)}`,
        name: 'Zenith E-Waste',
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        recyclerProfile: {
          create: {
            facilityName: 'Zenith E-Waste Yard B',
            facilityAddress: 'Taloja MIDC',
            city: 'Navi Mumbai',
            state: 'Maharashtra',
            authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
          },
        },
      },
      include: { recyclerProfile: true },
    });
    recyclerProfileB = recyclerUserB.recyclerProfile;

    // 3. Setup Citizen
    citizenUser = await prisma.user.create({
      data: {
        email: `citizen_12_${timestamp}@ecosetu.test`,
        phone: `+9197555${String(timestamp).slice(-5)}`,
        name: 'General Citizen',
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      },
    });

    // 4. Create Material Lots (Lot A & Lot B)
    const refSuffixA = String(timestamp).slice(-5);
    lotA = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-12A-${refSuffixA}`,
        collectorId: collectorProfileA.id,
        category: 'MOBILE_PHONE',
        approximateTotalWeightKg: 25.5,
        status: 'OPEN',
      },
    });

    lotB = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-12B-${refSuffixA}`,
        collectorId: collectorProfileB.id,
        category: 'LAPTOP',
        approximateTotalWeightKg: 40.0,
        status: 'OPEN',
      },
    });

    // 5. Submit Bids (Recycler A bids for Lot A, Recycler B bids for Lot B)
    quoteA = await quoteService.createQuote(recyclerUserA, {
      materialLotId: lotA.id,
      quotedUnitPrice: 180.0,
      unit: 'PER_KG',
      quotedQuantity: 25.5,
      notes: 'Initial bid by Recycler A',
    });

    quoteB = await quoteService.createQuote(recyclerUserB, {
      materialLotId: lotB.id,
      quotedUnitPrice: 320.0,
      unit: 'PER_KG',
      quotedQuantity: 40.0,
      notes: 'Initial bid by Recycler B',
    });

    // 6. Accept Quotes (Collector A accepts Quote A, Collector B accepts Quote B)
    await quoteService.acceptQuote(collectorUserA, quoteA.id);
    handoverA = await prisma.handoverRecord.findFirst({ where: { quoteId: quoteA.id } });

    await quoteService.acceptQuote(collectorUserB, quoteB.id);
    handoverB = await prisma.handoverRecord.findFirst({ where: { quoteId: quoteB.id } });

    // Create Pickup Batches for Recycler A and Recycler B
    batchA = await pickupBatchService.createBatch(recyclerUserA, {
      lotIds: [lotA.id],
      scheduledDate: '2026-09-30',
      pickupAddress: 'Okhla Industrial Area Phase 2, New Delhi',
      notes: 'Consolidated pickup batch A',
    });

    batchB = await pickupBatchService.createBatch(recyclerUserB, {
      lotIds: [lotB.id],
      scheduledDate: '2026-10-01',
      pickupAddress: 'Taloja MIDC, Navi Mumbai',
      notes: 'Consolidated pickup batch B',
    });

    // ----------------------------------------------------
    // CHECK 1: Recycler A can retrieve its pending handover/pickup records
    // ----------------------------------------------------
    const listA = await pickupBatchService.getBatches(recyclerUserA);
    record(
      1,
      'Recycler A can retrieve its pending pickup/batch records',
      Array.isArray(listA.batches) && listA.batches.some((b) => b.id === batchA.id)
    );

    // ----------------------------------------------------
    // CHECK 2: Recycler B can retrieve its own records
    // ----------------------------------------------------
    const listB = await pickupBatchService.getBatches(recyclerUserB);
    record(
      2,
      'Recycler B can retrieve its own records',
      Array.isArray(listB.batches) && listB.batches.some((b) => b.id === batchB.id)
    );

    // ----------------------------------------------------
    // CHECK 3: Recycler A cannot see Recycler B's records
    // ----------------------------------------------------
    const recAHasBatchB = listA.batches.some((b) => b.id === batchB.id);
    record(3, 'Recycler A cannot see Recycler B batch records', !recAHasBatchB);

    // ----------------------------------------------------
    // CHECK 4: Recycler B cannot see Recycler A's records
    // ----------------------------------------------------
    const recBHasBatchA = listB.batches.some((b) => b.id === batchA.id);
    record(4, 'Recycler B cannot see Recycler A batch records', !recBHasBatchA);

    // ----------------------------------------------------
    // CHECK 5: Accepted quote maps to correct MaterialLot
    // ----------------------------------------------------
    record(5, 'Accepted quote maps to correct MaterialLot', handoverA.materialLotId === lotA.id);

    // ----------------------------------------------------
    // CHECK 6: Correct Collector is associated
    // ----------------------------------------------------
    record(6, 'Correct Collector is associated with handover', handoverA.collectorId === collectorProfileA.id);

    // ----------------------------------------------------
    // CHECK 7: Correct Recycler is associated
    // ----------------------------------------------------
    record(7, 'Correct Recycler is associated with handover', handoverA.recyclerId === recyclerProfileA.id);

    // ----------------------------------------------------
    // CHECK 8: Pickup/Handover status is correct
    // ----------------------------------------------------
    record(8, 'Pickup/Handover status is initial PENDING_COLLECTOR / SCHEDULED', handoverA.status === HANDOVER_STATUS.PENDING_COLLECTOR);

    // ----------------------------------------------------
    // CHECK 9: Pickup detail resolves correct MaterialLot
    // ----------------------------------------------------
    const detailA = await pickupBatchService.getBatchById(recyclerUserA, batchA.id);
    const resolvedLot = detailA.lots && detailA.lots[0] ? detailA.lots[0] : null;
    record(
      9,
      'Pickup detail resolves correct MaterialLot',
      resolvedLot && resolvedLot.id === lotA.id && resolvedLot.referenceNumber === lotA.referenceNumber
    );

    // ----------------------------------------------------
    // CHECK 10: No "lot ID missing" when valid lot exists
    // ----------------------------------------------------
    record(10, 'No "lot ID missing" when valid lot exists', Boolean(resolvedLot && resolvedLot.id));

    // ----------------------------------------------------
    // CHECK 11: Authorized pickup action succeeds
    // ----------------------------------------------------
    const transitioned = await pickupBatchService.updateBatchStatus(recyclerUserA, batchA.id, {
      status: BATCH_STATUS.IN_PROGRESS,
    });
    record(11, 'Authorized pickup action (transition to IN_PROGRESS) succeeds', transitioned.status === BATCH_STATUS.IN_PROGRESS);

    // ----------------------------------------------------
    // CHECK 12: Database state changes after authorized action
    // ----------------------------------------------------
    const dbBatchCheck = await prisma.pickupBatch.findUnique({ where: { id: batchA.id } });
    record(12, 'Database state persisted after authorized action', dbBatchCheck.status === BATCH_STATUS.IN_PROGRESS);

    // ----------------------------------------------------
    // CHECK 13: Invalid state transition is rejected
    // ----------------------------------------------------
    let invalidTransitionBlocked = false;
    try {
      // Transition directly from IN_PROGRESS to COMPLETED (valid sequence requires ARRIVED -> COLLECTING -> COMPLETED)
      await pickupBatchService.updateBatchStatus(recyclerUserA, batchA.id, {
        status: BATCH_STATUS.COMPLETED,
      });
    } catch (err) {
      if (err.statusCode === 400 || err.message.includes('Cannot transition')) {
        invalidTransitionBlocked = true;
      }
    }
    record(13, 'Invalid state transition is rejected by state machine', invalidTransitionBlocked);

    // Advance batch status along valid path: IN_PROGRESS -> ARRIVED -> COLLECTING -> COMPLETED
    await pickupBatchService.updateBatchStatus(recyclerUserA, batchA.id, { status: BATCH_STATUS.ARRIVED });
    await pickupBatchService.updateBatchStatus(recyclerUserA, batchA.id, { status: BATCH_STATUS.COLLECTING });
    const completedBatch = await pickupBatchService.updateBatchStatus(recyclerUserA, batchA.id, { status: BATCH_STATUS.COMPLETED });

    // ----------------------------------------------------
    // CHECK 14: Duplicate completion is prevented
    // ----------------------------------------------------
    let dupCompletionBlocked = false;
    try {
      await pickupBatchService.updateBatchStatus(recyclerUserA, batchA.id, { status: BATCH_STATUS.COMPLETED });
    } catch (err) {
      if (err.statusCode === 400 || err.message.includes('Cannot transition')) {
        dupCompletionBlocked = true;
      }
    }
    record(14, 'Duplicate completion on completed batch is prevented', dupCompletionBlocked);

    // ----------------------------------------------------
    // CHECK 15: IDOR access is blocked
    // ----------------------------------------------------
    let idorViewBlocked = false;
    try {
      await pickupBatchService.getBatchById(recyclerUserA, batchB.id);
    } catch (err) {
      if (err.statusCode === 403) idorViewBlocked = true;
    }
    record(15, 'IDOR access (Recycler A viewing Recycler B batch) is blocked', idorViewBlocked);

    // ----------------------------------------------------
    // CHECK 16: Wrong Recycler cannot mutate another Recycler's handover
    // ----------------------------------------------------
    let wrongRecyclerMutateBlocked = false;
    try {
      await pickupBatchService.updateBatchStatus(recyclerUserA, batchB.id, { status: BATCH_STATUS.CANCELLED });
    } catch (err) {
      if (err.statusCode === 403) wrongRecyclerMutateBlocked = true;
    }
    record(16, 'Wrong Recycler cannot mutate another Recycler batch/handover', wrongRecyclerMutateBlocked);

    // ----------------------------------------------------
    // CHECK 17: Unauthorized roles are blocked from pickup management
    // ----------------------------------------------------
    let citizenBlocked = false;
    try {
      await pickupBatchService.getBatches(citizenUser);
    } catch (err) {
      if (err.statusCode === 403) citizenBlocked = true;
    }
    record(17, 'Unauthorized role (Citizen) is blocked from Pickup Management', citizenBlocked);

    // ----------------------------------------------------
    // CHECK 18: Unauthenticated access is blocked
    // ----------------------------------------------------
    let unauthBlocked = false;
    try {
      await pickupBatchService.getBatches(null);
    } catch (err) {
      if (err.statusCode === 401) unauthBlocked = true;
    }
    record(18, 'Unauthenticated request is blocked', unauthBlocked);

    // ----------------------------------------------------
    // CHECK 19: No duplicate handover/pickup is created
    // ----------------------------------------------------
    const handoverCountLotA = await prisma.handoverRecord.count({ where: { materialLotId: lotA.id } });
    record(19, 'No duplicate handover/pickup is created for single accepted quote', handoverCountLotA === 1);

    // ----------------------------------------------------
    // CHECK 20: No hardcoded/mock production pickup data is used
    // ----------------------------------------------------
    const mgmtCode = fs.readFileSync(
      path.join(__dirname, '../../mobile/src/screens/recycler/RecyclerPickupManagementScreen.tsx'),
      'utf8'
    );
    const detailCode = fs.readFileSync(
      path.join(__dirname, '../../mobile/src/screens/recycler/RecyclerBatchDetailScreen.tsx'),
      'utf8'
    );
    const noMockData = !mgmtCode.includes('MOCK_BATCHES') && !detailCode.includes('MOCK_BATCH');
    record(20, 'No hardcoded/mock production pickup data is used in UI screens', noMockData);

  } catch (err) {
    console.error('Execution error during Issue 12 verification:', err);
    record(0, `Unexpected test crash: ${err.message}`, false);
  } finally {
    // Cleanup test data in proper FK order
    const batchIds = [batchA?.id, batchB?.id].filter(Boolean);
    const lotIds = [lotA?.id, lotB?.id].filter(Boolean);
    const quoteIds = [quoteA?.id, quoteB?.id].filter(Boolean);

    if (batchIds.length > 0) {
      await prisma.pickupBatchLot.deleteMany({ where: { batchId: { in: batchIds } } });
      await prisma.pickupBatch.deleteMany({ where: { id: { in: batchIds } } });
    }
    if (lotIds.length > 0) {
      await prisma.handoverRecord.deleteMany({ where: { materialLotId: { in: lotIds } } });
    }
    if (quoteIds.length > 0) {
      await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
    }
    if (lotIds.length > 0) {
      await prisma.materialLot.deleteMany({ where: { id: { in: lotIds } } });
    }
    if (collectorUserA) {
      await prisma.collectorProfile.deleteMany({ where: { userId: collectorUserA.id } });
      await prisma.user.delete({ where: { id: collectorUserA.id } }).catch(() => {});
    }
    if (collectorUserB) {
      await prisma.collectorProfile.deleteMany({ where: { userId: collectorUserB.id } });
      await prisma.user.delete({ where: { id: collectorUserB.id } }).catch(() => {});
    }
    if (recyclerUserA) {
      await prisma.recyclerProfile.deleteMany({ where: { userId: recyclerUserA.id } });
      await prisma.user.delete({ where: { id: recyclerUserA.id } }).catch(() => {});
    }
    if (recyclerUserB) {
      await prisma.recyclerProfile.deleteMany({ where: { userId: recyclerUserB.id } });
      await prisma.user.delete({ where: { id: recyclerUserB.id } }).catch(() => {});
    }
    if (citizenUser) {
      await prisma.user.delete({ where: { id: citizenUser.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  }

  console.log('\n----------------------------------------');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
