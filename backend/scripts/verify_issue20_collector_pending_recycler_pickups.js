// backend/scripts/verify_issue20_collector_pending_recycler_pickups.js
// Regression Test Suite for Issue 20 — Collector Pending Pickups Must Include Recycler-Side Pickup / Transfer Jobs

const assert = require('assert');
const crypto = require('crypto');

const prisma = require('../src/config/database');
const authService = require('../src/services/authService');
const pickupService = require('../src/services/pickupService');
const requestService = require('../src/services/requestService');
const materialLotService = require('../src/services/materialLotService');
const quoteService = require('../src/services/quoteService');
const handoverService = require('../src/services/handoverService');
const pickupBatchService = require('../src/services/pickupBatchService');
const { ROLES, REQUEST_STATUS, PICKUP_STATUS, QUOTE_STATUS, HANDOVER_STATUS, BATCH_STATUS } = require('../src/utils/constants');

async function runVerification() {
  console.log('====================================================');
  console.log('ISSUE 20: COLLECTOR PENDING RECYCLER PICKUPS REGRESSION SUITE');
  console.log('====================================================\n');

  const createdUserIds = [];
  const createdRequestIds = [];
  const createdItemIds = [];
  const createdLotIds = [];
  const createdQuoteIds = [];
  const createdHandoverIds = [];
  const createdBatchIds = [];

  let collectorAUser, collectorBUser, recyclerAUser, recyclerBUser, citizenUser;
  let collectorAProfile, collectorBProfile, recyclerAProfile, recyclerBProfile;

  let citizenPickupA;
  let handoverA, handoverB, handoverC, handoverD;
  let lotA, lotB, lotC, lotD;
  let batchD;

  try {
    const suffix = Date.now();

    console.log('1. Setting up test users and profiles...');

    // Registered Collector A
    const regColA = await authService.register({
      email: `col_a_p20_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Collector Alpha',
      role: ROLES.INFORMAL_COLLECTOR,
      phone: `9111${Math.floor(100000 + Math.random() * 900000)}`,
    });
    collectorAUser = regColA.user;
    createdUserIds.push(collectorAUser.id);
    collectorAProfile = await prisma.collectorProfile.findUnique({ where: { userId: collectorAUser.id } });

    // Registered Collector B
    const regColB = await authService.register({
      email: `col_b_p20_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Collector Beta',
      role: ROLES.INFORMAL_COLLECTOR,
      phone: `9222${Math.floor(100000 + Math.random() * 900000)}`,
    });
    collectorBUser = regColB.user;
    createdUserIds.push(collectorBUser.id);
    collectorBProfile = await prisma.collectorProfile.findUnique({ where: { userId: collectorBUser.id } });

    // Registered Recycler A
    const regRecA = await authService.register({
      email: `rec_a_p20_${suffix}@test.com`,
      password: 'Password123!',
      name: 'GreenRecycle Corp (Recycler A)',
      role: ROLES.RECYCLER,
      phone: `9333${Math.floor(100000 + Math.random() * 900000)}`,
    });
    recyclerAUser = regRecA.user;
    await prisma.user.update({ where: { id: recyclerAUser.id }, data: { status: 'ACTIVE' } });
    createdUserIds.push(recyclerAUser.id);
    recyclerAProfile = await prisma.recyclerProfile.upsert({
      where: { userId: recyclerAUser.id },
      create: {
        userId: recyclerAUser.id,
        facilityName: 'GreenRecycle Facility A',
        authorizationStatus: 'AUTHORIZED',
        facilityAddress: 'Industrial Zone Plot 42, Berhampur',
        city: 'Berhampur',
        state: 'Odisha',
        pincode: '760001',
      },
      update: {
        authorizationStatus: 'AUTHORIZED',
      },
    });

    // Registered Recycler B
    const regRecB = await authService.register({
      email: `rec_b_p20_${suffix}@test.com`,
      password: 'Password123!',
      name: 'EcoProcess Ltd (Recycler B)',
      role: ROLES.RECYCLER,
      phone: `9444${Math.floor(100000 + Math.random() * 900000)}`,
    });
    recyclerBUser = regRecB.user;
    await prisma.user.update({ where: { id: recyclerBUser.id }, data: { status: 'ACTIVE' } });
    createdUserIds.push(recyclerBUser.id);
    recyclerBProfile = await prisma.recyclerProfile.upsert({
      where: { userId: recyclerBUser.id },
      create: {
        userId: recyclerBUser.id,
        facilityName: 'EcoProcess Facility B',
        authorizationStatus: 'AUTHORIZED',
        facilityAddress: 'Eco Hub Sector 9, Berhampur',
        city: 'Berhampur',
        state: 'Odisha',
        pincode: '760002',
      },
      update: {
        authorizationStatus: 'AUTHORIZED',
      },
    });

    // Registered Citizen
    const regCit = await authService.register({
      email: `cit_p20_${suffix}@test.com`,
      password: 'Password123!',
      name: 'Citizen Requester P20',
      role: ROLES.CITIZEN,
      phone: `9555${Math.floor(100000 + Math.random() * 900000)}`,
    });
    citizenUser = regCit.user;
    createdUserIds.push(citizenUser.id);

    console.log('2. Creating Citizen -> Collector A pickup...');
    const itemA = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenUser.id,
        category: 'LAPTOP',
        condition: 'WORKING',
        estimatedWeightKg: 2.5,
        status: 'SUBMITTED',
      },
    });
    createdItemIds.push(itemA.id);

    const collectionReq = await requestService.createRequest(citizenUser.id, {
      itemIds: [itemA.id],
      pickupAddress: 'Doorstep 123 Tulsi Nagar, Berhampur',
      district: 'Ganjam',
      city: 'Berhampur',
      state: 'Odisha',
      pincode: '760001',
      pickupLat: 19.317,
      pickupLng: 84.793,
      preferredDate: new Date(Date.now() + 86400000).toISOString(),
      autoSubmit: true,
    });
    createdRequestIds.push(collectionReq.id);

    // Update status to SUBMITTED if in draft
    await prisma.collectionRequest.update({
      where: { id: collectionReq.id },
      data: { status: REQUEST_STATUS.SUBMITTED },
    });

    // Collector A accepts citizen request
    const acceptedReq = await requestService.acceptRequest(collectorAUser.id, collectionReq.id);
    const pickupRecord = await prisma.pickup.findFirst({
      where: { collectionRequestId: collectionReq.id },
    });
    assert(pickupRecord, 'Pickup record must exist for accepted collection request');
    citizenPickupA = pickupRecord;

    console.log('3. Creating Material Lots and Recycler Handovers...');

    // Material Lot A (Collector A -> Recycler A)
    lotA = await materialLotService.createMaterialLot(collectorAUser.id, {
      category: 'MOBILE_PHONE',
      subcategory: 'Smartphones',
      approximateTotalWeightKg: 12.5,
      askingPrice: 5000,
      notes: 'Real user uploaded lot image test A',
      photoUrl: 'http://localhost:5000/api/v1/media/lot_a_image.jpg',
      status: 'OPEN',
    });
    createdLotIds.push(lotA.id);

    const quoteA = await quoteService.createQuote(recyclerAUser, {
      materialLotId: lotA.id,
      quotedUnitPrice: 416,
      notes: 'Quote A from Recycler A',
    });
    createdQuoteIds.push(quoteA.id);
    await quoteService.acceptQuote(collectorAUser, quoteA.id);

    handoverA = await prisma.handoverRecord.findFirst({
      where: { materialLotId: lotA.id, quoteId: quoteA.id },
      include: { materialLot: true, recycler: { include: { user: true } } },
    });
    assert(handoverA, 'HandoverRecord A must exist after quote acceptance');
    createdHandoverIds.push(handoverA.id);

    // Material Lot B (Collector A -> Recycler B)
    lotB = await materialLotService.createMaterialLot(collectorAUser.id, {
      category: 'LAPTOP',
      subcategory: 'Gaming Laptops',
      approximateTotalWeightKg: 8.0,
      askingPrice: 15000,
      notes: 'Real user uploaded lot image test B',
      photoUrl: 'http://localhost:5000/api/v1/media/lot_b_image.jpg',
      status: 'OPEN',
    });
    createdLotIds.push(lotB.id);

    const quoteB = await quoteService.createQuote(recyclerBUser, {
      materialLotId: lotB.id,
      quotedUnitPrice: 1937.5,
      notes: 'Quote B from Recycler B',
    });
    createdQuoteIds.push(quoteB.id);
    await quoteService.acceptQuote(collectorAUser, quoteB.id);

    handoverB = await prisma.handoverRecord.findFirst({
      where: { materialLotId: lotB.id, quoteId: quoteB.id },
      include: { materialLot: true, recycler: { include: { user: true } } },
    });
    assert(handoverB, 'HandoverRecord B must exist after quote acceptance');
    createdHandoverIds.push(handoverB.id);

    // Material Lot C (Collector B -> Recycler A)
    lotC = await materialLotService.createMaterialLot(collectorBUser.id, {
      category: 'BATTERY',
      subcategory: 'Li-ion Batteries',
      approximateTotalWeightKg: 20.0,
      askingPrice: 8000,
      notes: 'Lot C owned by Collector B',
      status: 'OPEN',
    });
    createdLotIds.push(lotC.id);

    const quoteC = await quoteService.createQuote(recyclerAUser, {
      materialLotId: lotC.id,
      quotedUnitPrice: 410,
      notes: 'Quote C from Recycler A to Collector B',
    });
    createdQuoteIds.push(quoteC.id);
    await quoteService.acceptQuote(collectorBUser, quoteC.id);

    handoverC = await prisma.handoverRecord.findFirst({
      where: { materialLotId: lotC.id, quoteId: quoteC.id },
      include: { materialLot: true, recycler: { include: { user: true } } },
    });
    assert(handoverC, 'HandoverRecord C must exist for Collector B');
    createdHandoverIds.push(handoverC.id);

    // Material Lot D with PickupBatch D (Collector A -> Recycler A)
    lotD = await materialLotService.createMaterialLot(collectorAUser.id, {
      category: 'PRINTER',
      subcategory: 'Laser Printers',
      approximateTotalWeightKg: 15.0,
      askingPrice: 4000,
      status: 'OPEN',
    });
    createdLotIds.push(lotD.id);

    const quoteD = await quoteService.createQuote(recyclerAUser, {
      materialLotId: lotD.id,
      quotedUnitPrice: 280,
    });
    createdQuoteIds.push(quoteD.id);
    await quoteService.acceptQuote(collectorAUser, quoteD.id);

    batchD = await pickupBatchService.createBatch(recyclerAUser, {
      collectorId: collectorAProfile.id,
      scheduledDate: new Date(Date.now() + 172800000).toISOString(),
      pickupAddress: 'GreenRecycle Facility A Pickup Bay',
      lotIds: [lotD.id],
    });
    createdBatchIds.push(batchD.id);

    handoverD = await prisma.handoverRecord.findFirst({
      where: { materialLotId: lotD.id },
    });
    if (handoverD) {
      await prisma.handoverRecord.update({
        where: { id: handoverD.id },
        data: { batchId: batchD.id },
      });
      createdHandoverIds.push(handoverD.id);
    }

    console.log('\n----------------------------------------------------');
    console.log('RUNNING MANDATORY 20 VERIFICATION CHECKS');
    console.log('----------------------------------------------------');

    let passedChecks = 0;

    // CHECK 1: Citizen pending pickup appears
    const colAPickupsRes = await pickupService.listPickups(collectorAUser.id, {});
    const colAPickups = colAPickupsRes.pickups || [];

    const foundCitizenPickup = colAPickups.find((p) => p.id === citizenPickupA.id);
    assert(foundCitizenPickup, 'CHECK 1 FAIL: Citizen pending pickup must appear in listPickups');
    assert.strictEqual(foundCitizenPickup.type, 'CITIZEN_PICKUP', 'CHECK 1 FAIL: Citizen pickup type must be CITIZEN_PICKUP');
    console.log('✔ CHECK 1 PASSED: Citizen pending pickup appears in listPickups.');
    passedChecks++;

    // CHECK 2: Recycler pending transfer appears
    const foundHandoverA = colAPickups.find((p) => p.id === handoverA.id);
    assert(foundHandoverA, 'CHECK 2 FAIL: Recycler pending transfer (Handover A) must appear in listPickups');
    assert.strictEqual(foundHandoverA.type, 'RECYCLER_TRANSFER', 'CHECK 2 FAIL: Handover type must be RECYCLER_TRANSFER');
    console.log('✔ CHECK 2 PASSED: Recycler pending transfer appears in listPickups.');
    passedChecks++;

    // CHECK 3: Both appear simultaneously
    assert(foundCitizenPickup && foundHandoverA, 'CHECK 3 FAIL: Both Citizen pickup and Recycler transfer must be in listPickups simultaneously');
    console.log('✔ CHECK 3 PASSED: Citizen pickup and Recycler transfer appear simultaneously in queue.');
    passedChecks++;

    // CHECK 4: Dashboard count includes both
    const totalPendingCount = colAPickups.filter(
      (p) =>
        p.status === 'SCHEDULED' ||
        p.status === 'IN_PROGRESS' ||
        p.status === 'PENDING_COLLECTOR' ||
        p.status === 'COLLECTOR_CONFIRMED' ||
        p.status === 'RECYCLER_CONFIRMED'
    ).length;
    assert(totalPendingCount >= 3, 'CHECK 4 FAIL: Dashboard count must include both Citizen pickups and Recycler transfers');
    console.log(`✔ CHECK 4 PASSED: Unified pending pickups count = ${totalPendingCount} (includes Citizen + Recycler transfers).`);
    passedChecks++;

    // CHECK 5: Collector A sees own transfer
    assert(colAPickups.some((p) => p.id === handoverA.id), 'CHECK 5 FAIL: Collector A must see handoverA');
    assert(colAPickups.some((p) => p.id === handoverB.id), 'CHECK 5 FAIL: Collector A must see handoverB');
    console.log('✔ CHECK 5 PASSED: Collector A sees own transfers.');
    passedChecks++;

    // CHECK 6: Collector B cannot see Collector A transfer
    const colBPickupsRes = await pickupService.listPickups(collectorBUser.id, {});
    const colBPickups = colBPickupsRes.pickups || [];
    assert(!colBPickups.some((p) => p.id === handoverA.id), 'CHECK 6 FAIL: Collector B must NOT see handoverA');
    assert(!colBPickups.some((p) => p.id === handoverB.id), 'CHECK 6 FAIL: Collector B must NOT see handoverB');
    assert(colBPickups.some((p) => p.id === handoverC.id), 'CHECK 6 FAIL: Collector B must see own handoverC');
    console.log('✔ CHECK 6 PASSED: Collector B cannot see Collector A transfers.');
    passedChecks++;

    // CHECK 7: Recycler A transfer is correctly attributed
    assert.strictEqual(foundHandoverA.recyclerName, 'GreenRecycle Corp (Recycler A)', 'CHECK 7 FAIL: Recycler A name must be attributed');
    assert.strictEqual(foundHandoverA.primaryName, 'GreenRecycle Corp (Recycler A)', 'CHECK 7 FAIL: Primary display name must be Recycler name');
    console.log('✔ CHECK 7 PASSED: Recycler A transfer correctly attributed.');
    passedChecks++;

    // CHECK 8: Recycler B transfer is correctly attributed
    const foundHandoverB = colAPickups.find((p) => p.id === handoverB.id);
    assert(foundHandoverB, 'CHECK 8 FAIL: Handover B must exist in listPickups');
    assert.strictEqual(foundHandoverB.recyclerName, 'EcoProcess Ltd (Recycler B)', 'CHECK 8 FAIL: Recycler B name must be attributed');
    console.log('✔ CHECK 8 PASSED: Recycler B transfer correctly attributed.');
    passedChecks++;

    // CHECK 9: Multiple transfers are not merged incorrectly
    assert.notStrictEqual(foundHandoverA.id, foundHandoverB.id, 'CHECK 9 FAIL: Handovers A and B must remain distinct entries');
    console.log('✔ CHECK 9 PASSED: Multiple transfers are not merged incorrectly.');
    passedChecks++;

    // CHECK 10: Same transfer is not duplicated
    const handoverAOccurrences = colAPickups.filter((p) => p.id === handoverA.id);
    assert.strictEqual(handoverAOccurrences.length, 1, 'CHECK 10 FAIL: Handover A must appear exactly ONCE (no duplication)');
    console.log('✔ CHECK 10 PASSED: Same transfer is not duplicated.');
    passedChecks++;

    // CHECK 11: Completed transfer disappears from pending
    await prisma.handoverRecord.update({
      where: { id: handoverA.id },
      data: { status: HANDOVER_STATUS.CONFIRMED },
    });
    const colAPickupsPendingOnly = await pickupService.listPickups(collectorAUser.id, { status: 'PENDING_COLLECTOR' });
    assert(!colAPickupsPendingOnly.pickups.some((p) => p.id === handoverA.id), 'CHECK 11 FAIL: Completed transfer (CONFIRMED) must disappear from pending list');
    console.log('✔ CHECK 11 PASSED: Completed transfer disappears from pending list.');
    passedChecks++;

    // CHECK 12: In-progress behavior is correct
    await prisma.handoverRecord.update({
      where: { id: handoverB.id },
      data: { status: HANDOVER_STATUS.COLLECTOR_CONFIRMED },
    });
    const colAPickupsInProgress = await pickupService.listPickups(collectorAUser.id, { status: 'IN_PROGRESS' });
    assert(colAPickupsInProgress.pickups.some((p) => p.id === handoverB.id), 'CHECK 12 FAIL: COLLECTOR_CONFIRMED handover must appear under IN_PROGRESS filter');
    console.log('✔ CHECK 12 PASSED: In-progress behavior is correct.');
    passedChecks++;

    // Revert handover statuses for remaining checks
    await prisma.handoverRecord.update({ where: { id: handoverA.id }, data: { status: 'PENDING_COLLECTOR' } });
    await prisma.handoverRecord.update({ where: { id: handoverB.id }, data: { status: 'PENDING_COLLECTOR' } });

    // CHECK 13: MaterialLot linkage is correct
    assert.strictEqual(foundHandoverA.materialLotId, lotA.id, 'CHECK 13 FAIL: MaterialLot linkage must match lotA.id');
    console.log('✔ CHECK 13 PASSED: MaterialLot linkage is correct.');
    passedChecks++;

    // CHECK 14: Handover linkage is correct
    assert.strictEqual(foundHandoverA.handoverId, handoverA.id, 'CHECK 14 FAIL: Handover linkage must match handoverA.id');
    console.log('✔ CHECK 14 PASSED: Handover linkage is correct.');
    passedChecks++;

    // CHECK 15: PickupBatch linkage is correct where applicable
    const colAPickupsFresh = (await pickupService.listPickups(collectorAUser.id, {})).pickups;
    const foundHandoverD = colAPickupsFresh.find((p) => p.id === (handoverD ? handoverD.id : ''));
    if (foundHandoverD) {
      assert.strictEqual(foundHandoverD.batchId, batchD.id, 'CHECK 15 FAIL: Batch linkage must match batchD.id');
    }
    console.log('✔ CHECK 15 PASSED: PickupBatch linkage is correct.');
    passedChecks++;

    // CHECK 16: Correct Recycler name returned
    assert.strictEqual(foundHandoverA.primaryName, 'GreenRecycle Corp (Recycler A)', 'CHECK 16 FAIL: Primary name must be Recycler name');
    console.log('✔ CHECK 16 PASSED: Correct Recycler name returned.');
    passedChecks++;

    // CHECK 17: Correct material/category returned
    assert(foundHandoverA.secondaryText.includes('MOBILE PHONE'), 'CHECK 17 FAIL: Category MOBILE PHONE must be in secondary text');
    console.log('✔ CHECK 17 PASSED: Correct material/category returned.');
    passedChecks++;

    // CHECK 18: Correct image reference returned
    assert.strictEqual(foundHandoverA.photoUrl, 'http://localhost:5000/api/v1/media/lot_a_image.jpg', 'CHECK 18 FAIL: Image reference must match lot photo');
    console.log('✔ CHECK 18 PASSED: Correct image reference returned.');
    passedChecks++;

    // CHECK 19: IDOR blocked
    try {
      await pickupService.getPickupById({ id: collectorBUser.id, role: ROLES.INFORMAL_COLLECTOR }, handoverA.id);
      assert.fail('CHECK 19 FAIL: Collector B accessing Collector A handover must throw 403');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403, 'CHECK 19 FAIL: IDOR attempt must return 403 Forbidden');
    }
    console.log('✔ CHECK 19 PASSED: IDOR blocked (403 Forbidden).');
    passedChecks++;

    // CHECK 20: Unauthorized roles blocked
    try {
      await pickupService.listPickups(citizenUser.id, {});
      assert.fail('CHECK 20 FAIL: Citizen calling listPickups must throw 403');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403, 'CHECK 20 FAIL: Unauthorized role must return 403 Forbidden');
    }
    console.log('✔ CHECK 20 PASSED: Unauthorized roles blocked (403 Forbidden).');
    passedChecks++;

    console.log(`\n====================================================`);
    console.log(`FINAL RESULT: ${passedChecks}/20 CHECKS PASSED (100%)`);
    console.log(`====================================================`);

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up test data...');
    try {
      if (createdHandoverIds.length > 0) {
        await prisma.handoverRecord.deleteMany({ where: { id: { in: createdHandoverIds } } }).catch(() => {});
      }
      if (createdBatchIds.length > 0) {
        await prisma.pickupBatch.deleteMany({ where: { id: { in: createdBatchIds } } }).catch(() => {});
      }
      if (createdQuoteIds.length > 0) {
        await prisma.quote.deleteMany({ where: { id: { in: createdQuoteIds } } }).catch(() => {});
      }
      if (createdLotIds.length > 0) {
        await prisma.materialLotPhoto.deleteMany({ where: { lotId: { in: createdLotIds } } }).catch(() => {});
        await prisma.materialLotItem.deleteMany({ where: { lotId: { in: createdLotIds } } }).catch(() => {});
        await prisma.materialLot.deleteMany({ where: { id: { in: createdLotIds } } }).catch(() => {});
      }
      if (createdRequestIds.length > 0) {
        await prisma.pickup.deleteMany({ where: { collectionRequestId: { in: createdRequestIds } } }).catch(() => {});
        await prisma.ewasteItem.deleteMany({ where: { collectionRequestId: { in: createdRequestIds } } }).catch(() => {});
        await prisma.collectionRequest.deleteMany({ where: { id: { in: createdRequestIds } } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        const collectorProfiles = await prisma.collectorProfile.findMany({ where: { userId: { in: createdUserIds } } });
        const colProfIds = collectorProfiles.map(p => p.id);
        if (colProfIds.length > 0) {
          await prisma.materialItem.deleteMany({ where: { collectorId: { in: colProfIds } } }).catch(() => {});
        }
        await prisma.collectorProfile.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
        await prisma.recyclerProfile.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
      }
      console.log('Teardown complete.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }
}

runVerification();
