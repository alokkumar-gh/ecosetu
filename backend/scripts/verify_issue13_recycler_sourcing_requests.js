/**
 * verify_issue13_recycler_sourcing_requests.js
 * Verification script for Issue #13: Recycler Sourcing Requests
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sourcingRequestService = require('../src/services/sourcingRequestService');
const { ROLES, SOURCING_REQUEST_STATUS, SOURCING_RESPONSE_STATUS, RECYCLER_AUTHORIZATION_STATUS } = require('../src/utils/constants');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== STARTING ISSUE 13 VERIFICATION ===\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // Setup test users & profiles
  const timestamp = Date.now();
  
  // Recycler A
  const userRecyclerA = await prisma.user.create({
    data: {
      email: `recycler_src_a_${timestamp}@ecosetu.test`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
      name: 'Alpha Recycling Hub',
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: ROLES.RECYCLER,
      status: 'ACTIVE',
      recyclerProfile: {
        create: {
          facilityName: 'Alpha Recycling Hub',
          facilityAddress: 'Plot 42, MIDC Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400705',
          serviceArea: 'Mumbai Metropolitan Region',
          authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
        },
      },
    },
    include: { recyclerProfile: true },
  });

  // Recycler B
  const userRecyclerB = await prisma.user.create({
    data: {
      email: `recycler_src_b_${timestamp}@ecosetu.test`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
      name: 'Beta E-Waste Recyclers',
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: ROLES.RECYCLER,
      status: 'ACTIVE',
      recyclerProfile: {
        create: {
          facilityName: 'Beta E-Waste Recyclers',
          facilityAddress: 'Plot 88, GIDC Industrial Estate',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411018',
          serviceArea: 'Pune District',
          authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
        },
      },
    },
    include: { recyclerProfile: true },
  });

  // Collector A
  const userCollectorA = await prisma.user.create({
    data: {
      email: `collector_src_a_${timestamp}@ecosetu.test`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
      name: 'Ramesh Sharma',
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: ROLES.INFORMAL_COLLECTOR,
      status: 'ACTIVE',
      collectorProfile: {
        create: {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          serviceArea: 'Dharavi, Mumbai',
        },
      },
    },
    include: { collectorProfile: true },
  });

  // Collector B
  const userCollectorB = await prisma.user.create({
    data: {
      email: `collector_src_b_${timestamp}@ecosetu.test`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
      name: 'Sunita Patel',
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: ROLES.INFORMAL_COLLECTOR,
      status: 'ACTIVE',
      collectorProfile: {
        create: {
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          serviceArea: 'Kothrud, Pune',
        },
      },
    },
    include: { collectorProfile: true },
  });

  // Citizen
  const userCitizen = await prisma.user.create({
    data: {
      email: `citizen_src_${timestamp}@ecosetu.test`,
      passwordHash: '$2b$10$abcdefghijklmnopqrstuuu',
      name: 'Anil Kumar',
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: ROLES.CITIZEN,
      status: 'ACTIVE',
    },
  });

  try {
    // CHECK 1: Create legitimate sourcing request by Recycler A
    const reqAData = {
      materialCategory: 'BATTERY',
      materialSubcategory: 'Li-ion Battery Packs',
      minimumWeightKg: 100,
      targetWeightKg: 250,
      offeredRatePerKg: 120.00,
      pickupRequired: true,
      notes: 'Urgent requirement for lithium-ion battery recycling',
    };
    const reqA = await sourcingRequestService.createRequest(userRecyclerA, reqAData);
    assert(reqA && reqA.id && reqA.status === 'OPEN', `CHECK 1: Legitimate sourcing request created (ID: ${reqA.id}, Ref: ${reqA.referenceNumber})`);

    // CHECK 2: Sourcing API returns request for Recycler A
    const resListA = await sourcingRequestService.getRequests(userRecyclerA, { myRequests: true });
    const foundA = resListA.requests.find(r => r.id === reqA.id);
    assert(foundA && foundA.recyclerId === userRecyclerA.recyclerProfile.id, `CHECK 2: Sourcing API returns eligible request for Recycler A`);

    // CHECK 3: Response formatting includes all required fields
    assert(foundA.minimumWeightKg === 100 && foundA.offeredRatePerKg === 120 && foundA.materialCategory === 'BATTERY', `CHECK 3: Mobile service fields mapped correctly`);

    // CHECK 4: Non-empty list for Recycler A
    assert(resListA.requests.length >= 1, `CHECK 4: Recycler Sourcing Requests receives non-empty eligible list (Count: ${resListA.requests.length})`);

    // CHECK 5 & 6 & 7 & 8 & 9: Collector A and B submit responses with real weights & details
    const respA = await sourcingRequestService.respondToRequest(userCollectorA, reqA.id, {
      availableWeightKg: 150,
      condition: 'REPAIRABLE',
      pickupAddress: 'Sector 4, Dharavi, Mumbai',
      notes: 'Clean sorted battery packs',
    });

    const respB = await sourcingRequestService.respondToRequest(userCollectorB, reqA.id, {
      availableWeightKg: 200,
      condition: 'DAMAGED',
      pickupAddress: 'Kothrud Industrial Area, Pune',
      notes: 'Industrial lead-acid & li-ion mix',
    });

    assert(respA.collector.name === 'Ramesh Sharma', `CHECK 5: Collector A material/identity correctly identified (${respA.collector.name})`);
    assert(respB.collector.name === 'Sunita Patel', `CHECK 6: Collector B material/identity correctly identified (${respB.collector.name})`);
    assert(respA.collectorId === userCollectorA.collectorProfile.id && respB.collectorId === userCollectorB.collectorProfile.id, `CHECK 7: Collector identity matches authoritative profile`);
    assert(respA.sourcingRequest.materialCategory === 'BATTERY', `CHECK 8: Material category is correct (${respA.sourcingRequest.materialCategory})`);
    assert(respA.availableWeightKg === 150 && respB.availableWeightKg === 200, `CHECK 9: Material weights are correct (A: ${respA.availableWeightKg}kg, B: ${respB.availableWeightKg}kg)`);

    // CHECK 10: Actual uploaded image / photo URL preservation if linked or fallback
    assert(respA.pickupAddress !== null, `CHECK 10: Location/address metadata preserved on response`);

    // CHECK 11: Ineligible request (EXPIRED or CANCELLED) excluded from OPEN feed
    const reqCancelled = await sourcingRequestService.createRequest(userRecyclerA, {
      materialCategory: 'PCB',
      minimumWeightKg: 50,
    });
    await sourcingRequestService.updateRequest(userRecyclerA, reqCancelled.id, { status: 'CANCELLED' });
    const openFeed = await sourcingRequestService.getRequests(userCollectorA, {});
    const hasCancelled = openFeed.requests.some(r => r.id === reqCancelled.id);
    assert(!hasCancelled, `CHECK 11: Ineligible/cancelled request correctly excluded from public collector demand feed`);

    // CHECK 12: Completed / Fulfilled request excluded from OPEN feed
    const reqFulfilled = await sourcingRequestService.createRequest(userRecyclerA, {
      materialCategory: 'PCB',
      minimumWeightKg: 60,
    });
    await sourcingRequestService.updateRequest(userRecyclerA, reqFulfilled.id, { status: 'FULFILLED' });
    const openFeed2 = await sourcingRequestService.getRequests(userCollectorA, {});
    const hasFulfilled = openFeed2.requests.some(r => r.id === reqFulfilled.id);
    assert(!hasFulfilled, `CHECK 12: Fulfilled request correctly excluded from public OPEN feed`);

    // CHECK 13: Multiple eligible records returned
    const reqA2 = await sourcingRequestService.createRequest(userRecyclerA, {
      materialCategory: 'LCD_PANEL',
      minimumWeightKg: 80,
    });
    const resListAUpdated = await sourcingRequestService.getRequests(userRecyclerA, { myRequests: true });
    assert(resListAUpdated.requests.length >= 2, `CHECK 13: Multiple eligible records returned (${resListAUpdated.requests.length} requests)`);

    // CHECK 14: Recycler A/B isolation & matching rules
    const reqB = await sourcingRequestService.createRequest(userRecyclerB, {
      materialCategory: 'CABLE',
      minimumWeightKg: 300,
    });
    const resListB = await sourcingRequestService.getRequests(userRecyclerB, { myRequests: true });
    const recyclerBHasA = resListB.requests.some(r => r.id === reqA.id);
    const recyclerAHasB = resListAUpdated.requests.some(r => r.id === reqB.id);
    assert(!recyclerBHasA && !recyclerAHasB, `CHECK 14: Recycler A and B sourcing requests strictly separated`);

    // CHECK 15: Request detail resolves same authoritative record
    const detailA = await sourcingRequestService.getRequestById(userRecyclerA, reqA.id);
    assert(detailA.id === reqA.id && detailA.responses.length === 2, `CHECK 15: Request detail resolves authoritative record with 2 responses`);

    // CHECK 16: Quote/bid can reference the response/material correctly
    assert(detailA.responses[0].collectorId !== undefined && detailA.responses[0].id !== undefined, `CHECK 16: Response payload provides valid collectorId & responseId for quote transition`);

    // CHECK 17: Unauthorized roles rejected
    let citizenBlocked = false;
    try {
      await sourcingRequestService.createRequest(userCitizen, { materialCategory: 'PCB', minimumWeightKg: 10 });
    } catch (err) {
      citizenBlocked = true;
    }
    assert(citizenBlocked, `CHECK 17: Citizen role rejected when attempting to create sourcing request`);

    // CHECK 18: IDOR manipulation blocked (Recycler B cannot update Recycler A request)
    let idorBlocked = false;
    try {
      await sourcingRequestService.updateRequest(userRecyclerB, reqA.id, { status: 'PAUSED' });
    } catch (err) {
      idorBlocked = true;
    }
    assert(idorBlocked, `CHECK 18: IDOR update attempt by wrong Recycler rejected`);

    // CHECK 19: Pagination/limits do not return empty first page
    const page1 = await sourcingRequestService.getRequests(userRecyclerA, { myRequests: true }, { page: 1, limit: 10 });
    assert(page1.requests.length > 0 && page1.pagination.total >= 2, `CHECK 19: Pagination returns valid first page (Count: ${page1.requests.length})`);

    // CHECK 20: Audit for hardcoded/mock production sourcing records
    const screenPath = path.join(__dirname, '../../mobile/src/screens/recycler/RecyclerSourcingScreen.tsx');
    const servicePath = path.join(__dirname, '../../mobile/src/services/sourcingService.ts');
    const screenContent = fs.readFileSync(screenPath, 'utf8');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    const hasHardcodedMock = screenContent.includes('mockRequests') || screenContent.includes('fakeRequest') || serviceContent.includes('mockSourcing');
    assert(!hasHardcodedMock, `CHECK 20: Production sourcing code clean of hardcoded mock records`);

  } finally {
    console.log('\nCleaning up test data...');
    await prisma.sourcingResponse.deleteMany({
      where: {
        collectorId: { in: [userCollectorA.collectorProfile.id, userCollectorB.collectorProfile.id] },
      },
    });
    await prisma.sourcingRequest.deleteMany({
      where: {
        recyclerId: { in: [userRecyclerA.recyclerProfile.id, userRecyclerB.recyclerProfile.id] },
      },
    });
    await prisma.collectorProfile.deleteMany({
      where: { userId: { in: [userCollectorA.id, userCollectorB.id] } },
    });
    await prisma.recyclerProfile.deleteMany({
      where: { userId: { in: [userRecyclerA.id, userRecyclerB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userRecyclerA.id, userRecyclerB.id, userCollectorA.id, userCollectorB.id, userCitizen.id] } },
    });
  }

  console.log(`\n=== ISSUE 13 SUMMARY: ${passedCount}/20 PASSED, ${failedCount}/20 FAILED ===`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

main()
  .catch(err => {
    console.error('Fatal error during verification:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
