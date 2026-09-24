// EcoSetu Marketplace Phase 6 Verification Test Suite
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6: Demand Discovery & Recurring Trade

const crypto = require('crypto');
const prisma = require('../src/config/database');
const sourcingRequestService = require('../src/services/sourcingRequestService');
const recurringTradeService = require('../src/services/recurringTradeService');
const quoteService = require('../src/services/quoteService');
const handoverService = require('../src/services/handoverService');
const transactionService = require('../src/services/transactionService');
const {
  ROLES,
  USER_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
  MATERIAL_CATEGORIES,
  ITEM_CONDITIONS,
  PRICE_UNITS,
  SOURCING_REQUEST_STATUS,
  SOURCING_RESPONSE_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
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
  console.log('--- STARTING VERIFY_MARKETPLACE_PHASE_6 (DEMAND & RECURRING TRADE) ---');
  console.log('================================================================\n');

  const testSuffix = crypto.randomBytes(3).toString('hex');
  let testRecyclerUser1, testRecyclerProfile1;
  let testRecyclerUser2, testRecyclerProfile2;
  let testCollectorUser1, testCollectorProfile1;
  let testCollectorUser2, testCollectorProfile2;
  let testCitizenUser;
  let createdRequest1, createdRequest2, createdResponse1;

  try {
    console.log('--- [0] Setting up database fixtures for Phase 6 Demand testing ---');

    // 1. Create Recycler 1 (Authorized)
    testRecyclerUser1 = await prisma.user.create({
      data: {
        email: `recycler1_p6_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Recycler Alpha Sourcing Hub ${testSuffix}`,
        phone: `+9198111${testSuffix.slice(0, 4)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });

    testRecyclerProfile1 = await prisma.recyclerProfile.create({
      data: {
        userId: testRecyclerUser1.id,
        facilityName: `GreenTech Metals & Plastics Hub ${testSuffix}`,
        facilityAddress: '100 Industrial Area, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        licenseNumber: `LIC-P6-${testSuffix}`,
        acceptedCategories: [MATERIAL_CATEGORIES.PCB, MATERIAL_CATEGORIES.BATTERY],
        authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
        serviceArea: 'Pune Metropolitan Region',
      },
    });

    // 2. Create Recycler 2 (Authorized)
    testRecyclerUser2 = await prisma.user.create({
      data: {
        email: `recycler2_p6_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `EcoSmelters Beta ${testSuffix}`,
        phone: `+9198222${testSuffix.slice(0, 4)}`,
        role: ROLES.RECYCLER,
        status: USER_STATUS.ACTIVE,
      },
    });

    testRecyclerProfile2 = await prisma.recyclerProfile.create({
      data: {
        userId: testRecyclerUser2.id,
        facilityName: `EcoSmelters Refining Facility ${testSuffix}`,
        facilityAddress: '200 Chemical Zone, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        licenseNumber: `LIC-P6-B-${testSuffix}`,
        acceptedCategories: [MATERIAL_CATEGORIES.PCB],
        authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
        serviceArea: 'Mumbai Metropolitan Region',
      },
    });

    // 3. Create Collector 1
    testCollectorUser1 = await prisma.user.create({
      data: {
        email: `collector1_p6_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Ramesh Collector ${testSuffix}`,
        phone: `+9198333${testSuffix.slice(0, 4)}`,
        role: ROLES.INFORMAL_COLLECTOR,
        status: USER_STATUS.ACTIVE,
      },
    });

    testCollectorProfile1 = await prisma.collectorProfile.create({
      data: {
        userId: testCollectorUser1.id,
        serviceArea: 'Kothrud, Pune',
        city: 'Pune',
        state: 'Maharashtra',
      },
    });

    // 4. Create Collector 2
    testCollectorUser2 = await prisma.user.create({
      data: {
        email: `collector2_p6_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Suresh Collector ${testSuffix}`,
        phone: `+9198444${testSuffix.slice(0, 4)}`,
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

    // 5. Create Citizen
    testCitizenUser = await prisma.user.create({
      data: {
        email: `citizen_p6_${testSuffix}@ecosetu.test`,
        passwordHash: 'hash',
        name: `Citizen User ${testSuffix}`,
        phone: `+9198555${testSuffix.slice(0, 4)}`,
        role: ROLES.CITIZEN,
        status: USER_STATUS.ACTIVE,
      },
    });

    console.log('✓ Test fixtures initialized successfully.\n');

    // [TEST 1] Authorized Recycler creates a Sourcing Request
    console.log('[TEST 1] Authorized Recycler creates a Sourcing Request (PCB, 50kg, optional rate ₹250)...');
    createdRequest1 = await sourcingRequestService.createRequest(testRecyclerUser1, {
      materialCategory: MATERIAL_CATEGORIES.PCB,
      materialSubcategory: 'Motherboards & Green PCB',
      condition: ITEM_CONDITIONS.DAMAGED,
      minimumWeightKg: 50,
      targetWeightKg: 100,
      maximumWeightKg: 200,
      pickupRequired: true,
      pickupArea: 'Pune Central & East',
      offeredRatePerKg: 250,
      notes: 'Clean sorted boards preferred without heavy heat sinks.',
    });

    assert(createdRequest1.referenceNumber.startsWith('SRC-'), 'Test 1.1: Request reference format matches SRC-YYYYMM-XXXXX');
    assert(createdRequest1.status === SOURCING_REQUEST_STATUS.OPEN, 'Test 1.2: Sourcing request initialized in OPEN status');
    assert(createdRequest1.minimumWeightKg === 50, 'Test 1.3: Minimum weight accurately saved as 50 kg');
    assert(createdRequest1.offeredRatePerKg === 250, 'Test 1.4: Offered rate accurately saved as ₹250.00/kg');
    assert(createdRequest1.hasOfferedPrice === true, 'Test 1.5: hasOfferedPrice is true');
    console.log('');

    // [TEST 2] Recycler creates Request WITHOUT price (Zero-Price Honesty)
    console.log('[TEST 2] Creating Sourcing Request without price...');
    createdRequest2 = await sourcingRequestService.createRequest(testRecyclerUser1, {
      materialCategory: MATERIAL_CATEGORIES.BATTERY,
      minimumWeightKg: 20,
      pickupRequired: false,
      notes: 'Lithium-ion cells from consumer electronics.',
    });

    assert(createdRequest2.offeredRatePerKg === null, 'Test 2.1: Sourcing request preserves null offered rate when not provided');
    assert(createdRequest2.hasOfferedPrice === false, 'Test 2.2: hasOfferedPrice is false');
    assert(createdRequest2.priceDisplay === 'Price discussed after response', 'Test 2.3: Displays honest unpriced text without fabricating a price');
    console.log('');

    // [TEST 3] Unauthorized user (Citizen) cannot create Sourcing Request
    console.log('[TEST 3] Verifying Citizen is rejected from creating sourcing request (403)...');
    let citizenBlocked = false;
    try {
      await sourcingRequestService.createRequest(testCitizenUser, {
        materialCategory: MATERIAL_CATEGORIES.PCB,
        minimumWeightKg: 10,
      });
    } catch (err) {
      if (err.statusCode === 403) citizenBlocked = true;
    }
    assert(citizenBlocked, 'Test 3: Citizen unauthorized from creating sourcing request (403 Forbidden)');
    console.log('');

    // [TEST 4] Collector Demand Feed Discovery & Filtering
    console.log('[TEST 4] Collector queries Demand Feed...');
    const feed = await sourcingRequestService.getRequests(testCollectorUser1, { category: MATERIAL_CATEGORIES.PCB });
    assert(feed.requests.length >= 1, 'Test 4.1: Open sourcing request discovered in collector demand feed');
    const matched = feed.requests.find((r) => r.id === createdRequest1.id);
    assert(matched !== undefined, 'Test 4.2: Created request found in feed');
    assert(matched.recycler.facilityName === `GreenTech Metals & Plastics Hub ${testSuffix}`, 'Test 4.3: Recycler facility name visible in feed');
    console.log('');

    // [TEST 5] Request Pause & Resume Lifecycle
    console.log('[TEST 5] Recycler pauses request...');
    const pausedReq = await sourcingRequestService.updateRequest(testRecyclerUser1, createdRequest1.id, {
      status: SOURCING_REQUEST_STATUS.PAUSED,
    });
    assert(pausedReq.status === SOURCING_REQUEST_STATUS.PAUSED, 'Test 5.1: Status transitioned to PAUSED');

    const feedWhilePaused = await sourcingRequestService.getRequests(testCollectorUser1, { category: MATERIAL_CATEGORIES.PCB });
    const foundWhilePaused = feedWhilePaused.requests.find((r) => r.id === createdRequest1.id);
    assert(!foundWhilePaused, 'Test 5.2: Paused request is strictly excluded from active collector demand feed');

    // Resume request
    const resumedReq = await sourcingRequestService.updateRequest(testRecyclerUser1, createdRequest1.id, {
      status: SOURCING_REQUEST_STATUS.OPEN,
    });
    assert(resumedReq.status === SOURCING_REQUEST_STATUS.OPEN, 'Test 5.3: Status resumed to OPEN');
    console.log('');

    // [TEST 6] Collector responds to Sourcing Request
    console.log('[TEST 6] Collector 1 responds to Sourcing Request 1 with 65kg...');
    createdResponse1 = await sourcingRequestService.respondToRequest(testCollectorUser1, createdRequest1.id, {
      availableWeightKg: 65,
      condition: ITEM_CONDITIONS.DAMAGED,
      pickupAddress: 'Shop 4, Market Yard, Pune',
      notes: 'Available for pickup this Thursday morning.',
    });

    assert(createdResponse1.referenceNumber.startsWith('RES-'), 'Test 6.1: Response reference format matches RES-YYYYMM-XXXXX');
    assert(createdResponse1.availableWeightKg === 65, 'Test 6.2: Available weight accurately recorded as 65 kg');
    assert(createdResponse1.status === SOURCING_RESPONSE_STATUS.PENDING, 'Test 6.3: Response initialized in PENDING status');
    console.log('');

    // [TEST 7] Duplicate Active Response Prevention
    console.log('[TEST 7] Collector 1 attempts duplicate active response...');
    let duplicateBlocked = false;
    try {
      await sourcingRequestService.respondToRequest(testCollectorUser1, createdRequest1.id, {
        availableWeightKg: 30,
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('already submitted an active response')) {
        duplicateBlocked = true;
      }
    }
    assert(duplicateBlocked, 'Test 7: Duplicate active response rejected (400 Bad Request)');
    console.log('');

    // [TEST 8] Collector updates existing pending response
    console.log('[TEST 8] Collector 1 updates available quantity to 75kg...');
    const updatedResp = await sourcingRequestService.updateResponse(testCollectorUser1, createdResponse1.id, {
      availableWeightKg: 75,
      notes: 'Updated: 75 kg ready for collection.',
    });
    assert(updatedResp.availableWeightKg === 75, 'Test 8: Collector successfully updated response quantity to 75 kg');
    console.log('');

    // [TEST 9] Recycler reviews responses to own request
    console.log('[TEST 9] Recycler 1 reviews responses...');
    const reqWithResponses = await sourcingRequestService.getRequestById(testRecyclerUser1, createdRequest1.id);
    assert(reqWithResponses.responses.length === 1, 'Test 9.1: Recycler sees 1 response');
    assert(reqWithResponses.responses[0].availableWeightKg === 75, 'Test 9.2: Correct updated weight reflected to buyer');
    console.log('');

    // [TEST 10] Tenancy Isolation: Uninvolved Recycler 2 cannot see responses of Recycler 1
    console.log('[TEST 10] Verifying Recycler 2 cannot see Recycler 1 responses...');
    const reqViewByOther = await sourcingRequestService.getRequestById(testRecyclerUser2, createdRequest1.id);
    assert(reqViewByOther.responses.length === 0, 'Test 10: Uninvolved recycler receives 0 private counterparty responses');
    console.log('');

    // [TEST 11] Sourcing Response does NOT create Quote automatically (Separation of Intent vs Contract)
    console.log('[TEST 11] Verifying response did NOT create an automatic Quote...');
    const quotesOnDb = await prisma.quote.count({
      where: {
        recyclerId: testRecyclerProfile1.id,
      },
    });
    assert(quotesOnDb === 0, 'Test 11: Sourcing response strictly establishes supply interest and does NOT create a premature financial quote');
    console.log('');

    // [TEST 12] Response transitions into Canonical Quote Workflow
    console.log('[TEST 12] Transitioning response into canonical MaterialLot and Quote...');
    // Collector creates material lot for the supply
    const newLot = await prisma.materialLot.create({
      data: {
        referenceNumber: `LOT-P6-${testSuffix}`,
        collectorId: testCollectorProfile1.id,
        category: MATERIAL_CATEGORIES.PCB,
        approximateTotalWeightKg: 75,
        condition: ITEM_CONDITIONS.DAMAGED,
        status: 'OPEN',
      },
    });

    // Link lot to response and update response status
    await sourcingRequestService.updateResponse(testRecyclerUser1, createdResponse1.id, {
      status: SOURCING_RESPONSE_STATUS.QUOTE_REQUESTED,
      materialLotId: newLot.id,
    });

    // Recycler submits formal quote on the lot using canonical quote service
    const formalQuote = await quoteService.createQuote(testRecyclerUser1, {
      materialLotId: newLot.id,
      quotedUnitPrice: 250,
      priceUnit: PRICE_UNITS.PER_KG,
      validUntilHours: 48,
    });

    assert(formalQuote.referenceNumber.startsWith('QTE-'), 'Test 12.1: Formal quote created with reference QTE-YYYYMM-XXXXX');
    assert(Number(formalQuote.quotedUnitPrice) === 250, 'Test 12.2: Quote rate ₹250.00/kg');
    assert(Number(formalQuote.quotedTotal) === 75 * 250, 'Test 12.3: Calculated quote value ₹18,750 (75 kg * ₹250)');
    console.log('');

    // [TEST 13] Execute Handover and Settlement to build factual transaction history
    console.log('[TEST 13] Executing Deal Acceptance, Handover, and Settlement for repeat trading data...');
    // Accept quote
    await quoteService.acceptQuote(testCollectorUser1, formalQuote.id);

    // Create and confirm handover
    const handover = await handoverService.createHandover(testCollectorUser1, {
      materialLotId: newLot.id,
      quoteId: formalQuote.id,
      handoverWeightKg: 74.0,
      declaredWeightKg: 75.0,
    });
    await handoverService.collectorConfirm(testCollectorUser1, handover.id);
    await handoverService.recyclerConfirm(testRecyclerUser1, handover.id);

    // Record settlement
    const txn = await transactionService.createTransaction(testCollectorUser1, {
      handoverId: handover.id,
      paymentMethod: PAYMENT_METHOD.CASH,
      paymentStatus: PAYMENT_STATUS.PAID,
    });

    assert(txn.referenceNumber.startsWith('TXN-'), 'Test 13: Transaction settled with reference TXN-YYYYMM-XXXXX');
    console.log('');

    // [TEST 14] Factual Repeat Trading Relationship Aggregation
    console.log('[TEST 14] Querying trading relationship between Collector 1 and Recycler 1...');
    const relationship = await recurringTradeService.getTradingRelationship(testCollectorUser1, testRecyclerUser1.id);
    assert(relationship.hasPreviousTrade === true, 'Test 14.1: Previous trade detected');
    assert(relationship.completedTransactionsCount === 1, 'Test 14.2: Completed transactions count is exactly 1');
    assert(relationship.totalWeightKg === 74.0, 'Test 14.3: Total verified weight traded is 74.0 kg');
    assert(relationship.totalValueINR === 74.0 * 250, 'Test 14.4: Total settled value is ₹18,500');
    assert(relationship.categoriesTraded.includes(MATERIAL_CATEGORIES.PCB), 'Test 14.5: PCB included in categories traded');
    console.log('');

    // [TEST 15] "Sell Again" Template Generator (Collector)
    console.log('[TEST 15] Collector generates "Sell Again" template from previous lot...');
    const sellAgainTemplate = await recurringTradeService.getSellAgainTemplate(testCollectorUser1, newLot.id);
    assert(sellAgainTemplate.category === MATERIAL_CATEGORIES.PCB, 'Test 15.1: Reuses category PCB');
    assert(sellAgainTemplate.condition === ITEM_CONDITIONS.DAMAGED, 'Test 15.2: Reuses condition DAMAGED');
    assert(sellAgainTemplate.id === undefined, 'Test 15.3: Does NOT copy old lot ID');
    assert(sellAgainTemplate.referenceNumber === undefined, 'Test 15.4: Does NOT copy old reference number');
    assert(sellAgainTemplate.sourceLotReference === `LOT-P6-${testSuffix}`, 'Test 15.5: Tracks source lot reference cleanly');
    console.log('');

    // [TEST 16] "Source Again" Template Generator (Recycler)
    console.log('[TEST 16] Recycler generates "Source Again" template from previous request...');
    const sourceAgainTemplate = await recurringTradeService.getSourceAgainTemplate(testRecyclerUser1, createdRequest1.id);
    assert(sourceAgainTemplate.materialCategory === MATERIAL_CATEGORIES.PCB, 'Test 16.1: Reuses material category');
    assert(sourceAgainTemplate.minimumWeightKg === 50, 'Test 16.2: Reuses minimum weight 50 kg');
    assert(sourceAgainTemplate.offeredRatePerKg === 250, 'Test 16.3: Reuses offered rate ₹250');
    assert(sourceAgainTemplate.id === undefined, 'Test 16.4: Does NOT copy old request ID');
    assert(sourceAgainTemplate.sourceRequestReference.startsWith('SRC-'), 'Test 16.5: Tracks source request reference cleanly');
    console.log('');

    // [TEST 17] Request Auto-Expiration Handling
    console.log('[TEST 17] Testing Request Auto-Expiration on date expiry...');
    // Create an expired request in DB
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const expRequest = await prisma.sourcingRequest.create({
      data: {
        referenceNumber: `SRC-EXP-${testSuffix}`,
        recyclerId: testRecyclerProfile1.id,
        materialCategory: MATERIAL_CATEGORIES.CABLE,
        minimumWeightKg: 10,
        requestedByDate: pastDate,
        status: SOURCING_REQUEST_STATUS.OPEN,
        createdById: testRecyclerUser1.id,
      },
    });

    // Querying feed triggers auto-expiration
    await sourcingRequestService.getRequests(testCollectorUser1);

    const refreshedExp = await prisma.sourcingRequest.findUnique({ where: { id: expRequest.id } });
    assert(refreshedExp.status === SOURCING_REQUEST_STATUS.EXPIRED, 'Test 17.1: Outdated request automatically transitioned to EXPIRED');

    // Attempt to respond to expired request
    let expiredBlocked = false;
    try {
      await sourcingRequestService.respondToRequest(testCollectorUser2, expRequest.id, {
        availableWeightKg: 15,
      });
    } catch (err) {
      if (err.statusCode === 400) expiredBlocked = true;
    }
    assert(expiredBlocked, 'Test 17.2: Responding to expired request strictly rejected (400 Bad Request)');
    console.log('');

    // [TEST 18] Zero-Demand Empty State
    console.log('[TEST 18] Querying inactive category with zero demand...');
    const emptyFeed = await sourcingRequestService.getRequests(testCollectorUser1, { category: MATERIAL_CATEGORIES.CRT });
    assert(emptyFeed.requests.length === 0, 'Test 18.1: Inactive category returns 0 requests');
    assert(emptyFeed.pagination.total === 0, 'Test 18.2: Total count is 0 without manufactured fake records');
    console.log('');

    // [CLEANUP] Clean up isolated fixtures
    console.log('[CLEANUP] Cleaning up isolated test fixtures...');
    await prisma.transactionRecord.deleteMany({ where: { createdById: testCollectorUser1.id } });
    await prisma.handoverRecord.deleteMany({ where: { materialLotId: newLot.id } });
    await prisma.quote.deleteMany({ where: { materialLotId: newLot.id } });
    await prisma.sourcingResponse.deleteMany({ where: { createdById: testCollectorUser1.id } });
    await prisma.sourcingResponse.deleteMany({ where: { createdById: testCollectorUser2.id } });
    await prisma.materialLot.deleteMany({ where: { id: newLot.id } });
    await prisma.sourcingRequest.deleteMany({ where: { recyclerId: testRecyclerProfile1.id } });
    await prisma.sourcingRequest.deleteMany({ where: { recyclerId: testRecyclerProfile2.id } });
    await prisma.collectorProfile.deleteMany({ where: { id: { in: [testCollectorProfile1.id, testCollectorProfile2.id] } } });
    await prisma.recyclerProfile.deleteMany({ where: { id: { in: [testRecyclerProfile1.id, testRecyclerProfile2.id] } } });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            testRecyclerUser1.id,
            testRecyclerUser2.id,
            testCollectorUser1.id,
            testCollectorUser2.id,
            testCitizenUser.id,
          ],
        },
      },
    });
    console.log('✓ Cleanup completed.\n');

    console.log('================================================================');
    console.log('--- PHASE 6 VERIFICATION SUMMARY ---');
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total:  ${passedTests + failedTests}`);
    console.log('================================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL MARKETPLACE PHASE 6 TESTS PASSED SUCCESSFULLY!\n');
    }
  } catch (error) {
    console.error('❌ Phase 6 Test Failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
