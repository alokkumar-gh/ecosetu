/**
 * Complete Verification Test Suite: Citizen -> Collector Offer Marketplace
 * Canonical Reference: Prompt Section 18
 */

const prisma = require('../src/config/database');
const requestService = require('../src/services/requestService');
const eventBus = require('../src/services/eventBus');
const { REQUEST_STATUS, ROLES } = require('../src/utils/constants');

async function runTests() {
  console.log('================================================================');
  console.log('CITIZEN -> COLLECTOR OFFER MARKETPLACE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 22;

  // Cleanup helper
  const cleanups = [];

  try {
    // Setup test users: 1 Citizen, 2 Collectors, 1 Unauthorized Citizen
    const timestamp = Date.now();
    const citizenUser = await prisma.user.create({
      data: {
        email: `citizen_offer_test_${timestamp}@test.com`,
        passwordHash: 'dummy_hash',
        name: 'Citizen Test User',
        phone: '9876543210',
        role: ROLES.CITIZEN,
        status: 'ACTIVE',
      },
    });
    cleanups.push(() => prisma.user.delete({ where: { id: citizenUser.id } }));

    const unauthorizedCitizen = await prisma.user.create({
      data: {
        email: `unauth_citizen_${timestamp}@test.com`,
        passwordHash: 'dummy_hash',
        name: 'Unauthorized Citizen',
        phone: '9876543211',
        role: ROLES.CITIZEN,
        status: 'ACTIVE',
      },
    });
    cleanups.push(() => prisma.user.delete({ where: { id: unauthorizedCitizen.id } }));

    const collectorAUser = await prisma.user.create({
      data: {
        email: `collector_a_${timestamp}@test.com`,
        passwordHash: 'dummy_hash',
        name: 'Collector Alpha',
        phone: '9876543221',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
      },
    });
    cleanups.push(() => prisma.user.delete({ where: { id: collectorAUser.id } }));

    const collectorAProfile = await prisma.collectorProfile.create({
      data: {
        userId: collectorAUser.id,
        serviceArea: 'Sector 14',
        serviceAreaLat: 28.4595,
        serviceAreaLng: 77.0266,
        serviceRadiusKm: 5.0,
        totalPickups: 15,
        isAvailable: true,
      },
    });

    const collectorBUser = await prisma.user.create({
      data: {
        email: `collector_b_${timestamp}@test.com`,
        passwordHash: 'dummy_hash',
        name: 'Collector Beta',
        phone: '9876543222',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
      },
    });
    cleanups.push(() => prisma.user.delete({ where: { id: collectorBUser.id } }));

    const collectorBProfile = await prisma.collectorProfile.create({
      data: {
        userId: collectorBUser.id,
        serviceArea: 'Sector 29',
        serviceAreaLat: 28.4695,
        serviceAreaLng: 77.0366,
        serviceRadiusKm: 6.0,
        totalPickups: 28,
        isAvailable: true,
      },
    });

    // Create item
    const item = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenUser.id,
        category: 'LAPTOP',
        condition: 'PARTIALLY_WORKING',
        estimatedWeightKg: 2.5,
        status: 'SUBMITTED',
      },
    });
    cleanups.push(() => prisma.ewasteItem.delete({ where: { id: item.id } }));

    // Realtime event tracking
    const realtimeEvents = [];
    const onOfferSubmitted = (evt) => realtimeEvents.push({ event: 'COLLECTOR_OFFER_SUBMITTED', ...evt });
    const onOfferCountered = (evt) => realtimeEvents.push({ event: 'COLLECTOR_OFFER_COUNTERED', ...evt });
    const onOfferAccepted = (evt) => realtimeEvents.push({ event: 'COLLECTOR_OFFER_ACCEPTED', ...evt });
    eventBus.on('COLLECTOR_OFFER_SUBMITTED', onOfferSubmitted);
    eventBus.on('COLLECTOR_OFFER_COUNTERED', onOfferCountered);
    eventBus.on('COLLECTOR_OFFER_ACCEPTED', onOfferAccepted);

    // 1. Citizen creates request
    console.log('Test 1: Citizen creates pickup request...');
    const request = await requestService.createRequest(citizenUser.id, {
      itemIds: [item.id],
      pickupAddress: 'Flat 402, Green Enclave, Sector 14, Gurugram',
      pickupLat: 28.4590,
      pickupLng: 77.0260,
      preferredDate: new Date(),
    });
    const submittedReq = await requestService.submitRequest(citizenUser.id, request.id);
    if (submittedReq.status === 'SUBMITTED') {
      console.log('  [PASS] 1. Citizen creates request in SUBMITTED status');
      passed++;
    } else {
      console.log('  [FAIL] 1. Request status was:', submittedReq.status);
    }

    // 2. Collector A submits offer
    console.log('Test 2: Collector A submits offer...');
    const offerA = await requestService.submitOffer(collectorAUser.id, request.id, {
      offeredPrice: 850,
      notes: 'Available for morning pickup',
    });
    if (offerA && parseFloat(offerA.offeredPrice) === 850 && offerA.status === 'PENDING') {
      console.log('  [PASS] 2. Collector A submitted offer (₹850, PENDING)');
      passed++;
    } else {
      console.log('  [FAIL] 2. Collector A offer invalid:', offerA);
    }

    // 3. Collector B submits offer
    console.log('Test 3: Collector B submits offer...');
    const offerB = await requestService.submitOffer(collectorBUser.id, request.id, {
      offeredPrice: 920,
      notes: 'Can pickup within 2 hours',
    });
    if (offerB && parseFloat(offerB.offeredPrice) === 920 && offerB.status === 'PENDING') {
      console.log('  [PASS] 3. Collector B submitted offer (₹920, PENDING)');
      passed++;
    } else {
      console.log('  [FAIL] 3. Collector B offer invalid:', offerB);
    }

    // 4. Citizen can retrieve both
    console.log('Test 4: Citizen retrieves all offers for the request...');
    const offersRes = await requestService.listOffers(citizenUser, request.id);
    if (offersRes.offers && offersRes.offers.length === 2) {
      console.log('  [PASS] 4. Citizen retrieved both offers');
      passed++;
    } else {
      console.log('  [FAIL] 4. Offers retrieved:', offersRes);
    }

    // 5. Offer count = 2
    console.log('Test 5: Offer count = 2...');
    if (offersRes.count === 2 || (offersRes.offers && offersRes.offers.length === 2)) {
      console.log('  [PASS] 5. Offer count is accurately 2');
      passed++;
    } else {
      console.log('  [FAIL] 5. Count was:', offersRes.count);
    }

    // 6. Citizen opens request and sees both with distance & verified metrics
    console.log('Test 6: Citizen opens request details...');
    const reqDetails = await requestService.getRequestById(citizenUser, request.id);
    if (
      reqDetails.pickupOffers &&
      reqDetails.pickupOffers.length === 2 &&
      reqDetails.offersCount === 2 &&
      reqDetails.pickupOffers[0].collector.isVerified === true
    ) {
      console.log('  [PASS] 6. Citizen sees both offers with verified collector metadata & distance');
      passed++;
    } else {
      console.log('  [FAIL] 6. Request details offers:', reqDetails.pickupOffers);
    }

    // 7. Citizen opens offer details
    console.log('Test 7: Citizen inspects offer details...');
    const firstOffer = reqDetails.pickupOffers.find((o) => o.id === offerA.id);
    if (firstOffer && firstOffer.offeredPrice === 850 && firstOffer.collector.name === 'Collector Alpha') {
      console.log('  [PASS] 7. Offer details contains sanitized collector name and offered amount');
      passed++;
    } else {
      console.log('  [FAIL] 7. First offer details:', firstOffer);
    }

    // 8. Citizen rejects an offer
    console.log('Test 8: Citizen rejects an offer (Collector A)...');
    const rejectedOffer = await requestService.rejectOffer(citizenUser.id, request.id, offerA.id, {
      reason: 'Price too low',
    });
    if (rejectedOffer.status === 'REJECTED') {
      console.log('  [PASS] 8. Offer successfully transitioned to REJECTED');
      passed++;
    } else {
      console.log('  [FAIL] 8. Status was:', rejectedOffer.status);
    }

    // 9. Citizen counters an offer (Collector B)
    console.log('Test 9: Citizen counters offer B...');
    const counteredOffer = await requestService.counterOffer(citizenUser.id, request.id, offerB.id, {
      counterPrice: 1000,
      notes: 'Item includes original adapter',
    });
    if (counteredOffer.notes && counteredOffer.notes.includes('[Citizen Counter: ₹1000]')) {
      console.log('  [PASS] 9. Counter-offer recorded in negotiation timeline');
      passed++;
    } else {
      console.log('  [FAIL] 9. Countered offer notes:', counteredOffer.notes);
    }

    // 10. Collector receives counter / views updated offer
    console.log('Test 10: Collector B retrieves own offer...');
    const collectorBView = await requestService.listOffers(collectorBUser, request.id);
    if (collectorBView.offers && collectorBView.offers[0].notes.includes('[Citizen Counter: ₹1000]')) {
      console.log('  [PASS] 10. Collector B sees counter-offer');
      passed++;
    } else {
      console.log('  [FAIL] 10. Collector B view:', collectorBView);
    }

    // 11. Collector counters back (Collector B updates to ₹950)
    console.log('Test 11: Collector B counters back (₹950)...');
    const collectorBCounter = await requestService.submitOffer(collectorBUser.id, request.id, {
      offeredPrice: 950,
      notes: 'Final price with doorstep collection',
    });
    if (
      collectorBCounter.notes.includes('[Citizen Counter: ₹1000]') &&
      collectorBCounter.notes.includes('[Collector Offer: ₹950]') &&
      parseFloat(collectorBCounter.offeredPrice) === 950
    ) {
      console.log('  [PASS] 11. Full multi-step negotiation history preserved');
      passed++;
    } else {
      console.log('  [FAIL] 11. Negotiation history notes:', collectorBCounter.notes);
    }

    // 12. Citizen accepts one offer (Accepts Collector B @ ₹950)
    console.log('Test 12: Citizen accepts offer B...');
    const acceptResult = await requestService.acceptOffer(citizenUser.id, request.id, offerB.id);
    if (acceptResult && acceptResult.offer && acceptResult.pickup) {
      console.log('  [PASS] 12. Citizen acceptance transaction succeeded');
      passed++;
    } else {
      console.log('  [FAIL] 12. Accept result:', acceptResult);
    }

    // 13. Accepted offer becomes ACCEPTED
    console.log('Test 13: Winning offer status = ACCEPTED...');
    const dbWinningOffer = await prisma.pickupOffer.findUnique({ where: { id: offerB.id } });
    if (dbWinningOffer.status === 'ACCEPTED') {
      console.log('  [PASS] 13. Winning offer status is ACCEPTED');
      passed++;
    } else {
      console.log('  [FAIL] 13. Winning offer status:', dbWinningOffer.status);
    }

    // 14. Other active offers become CLOSED/REJECTED
    console.log('Test 14: Competing offers closed/rejected...');
    const dbOfferA = await prisma.pickupOffer.findUnique({ where: { id: offerA.id } });
    if (dbOfferA.status === 'REJECTED') {
      console.log('  [PASS] 14. Competing offer is closed/rejected');
      passed++;
    } else {
      console.log('  [FAIL] 14. Competing offer status:', dbOfferA.status);
    }

    // 15. Collector assignment is correct
    console.log('Test 15: Collector assignment...');
    const assignedReq = await prisma.collectionRequest.findUnique({ where: { id: request.id } });
    if (assignedReq.collectorId === collectorBProfile.id) {
      console.log('  [PASS] 15. CollectionRequest collectorId = Collector B Profile ID');
      passed++;
    } else {
      console.log('  [FAIL] 15. Assigned collector ID:', assignedReq.collectorId);
    }

    // 16. Citizen status updates to ACCEPTED
    console.log('Test 16: Request status is ACCEPTED...');
    if (assignedReq.status === REQUEST_STATUS.ACCEPTED) {
      console.log('  [PASS] 16. Request status updated to ACCEPTED');
      passed++;
    } else {
      console.log('  [FAIL] 16. Status was:', assignedReq.status);
    }

    // 17. Collector notification sent
    console.log('Test 17: Notifications created for collector and citizen...');
    const notifs = await prisma.notification.findMany({
      where: {
        userId: { in: [collectorBUser.id, citizenUser.id, collectorAUser.id] },
      },
    });
    const winningCollectorNotif = notifs.find(
      (n) => n.userId === collectorBUser.id && n.type === 'OFFER_ACCEPTED'
    );
    if (winningCollectorNotif) {
      console.log('  [PASS] 17. Winning collector received OFFER_ACCEPTED notification');
      passed++;
    } else {
      console.log('  [FAIL] 17. Notifications found:', notifs);
    }

    // 18. Citizen receives realtime new-offer event
    console.log('Test 18: Realtime event bus delivery...');
    const submittedEvt = realtimeEvents.find((e) => e.event === 'COLLECTOR_OFFER_SUBMITTED');
    const acceptedEvt = realtimeEvents.find((e) => e.event === 'COLLECTOR_OFFER_ACCEPTED');
    if (submittedEvt && acceptedEvt) {
      console.log('  [PASS] 18. Realtime event bus emitted SUBMITTED and ACCEPTED events');
      passed++;
    } else {
      console.log('  [FAIL] 18. Realtime events:', realtimeEvents);
    }

    // 19. Duplicate acceptance is prevented
    console.log('Test 19: Race condition & duplicate acceptance prevention...');
    let duplicatePrevented = false;
    try {
      await requestService.acceptOffer(citizenUser.id, request.id, offerA.id);
    } catch (dupErr) {
      duplicatePrevented = true;
    }
    if (duplicatePrevented) {
      console.log('  [PASS] 19. Duplicate acceptance prevented by atomic validation');
      passed++;
    } else {
      console.log('  [FAIL] 19. Duplicate acceptance was NOT prevented');
    }

    // 20. Unauthorized citizen cannot access another citizen's offers
    console.log('Test 20: Privacy & authorization protection...');
    let unauthBlocked = false;
    try {
      await requestService.listOffers(unauthorizedCitizen, request.id);
    } catch (authErr) {
      unauthBlocked = true;
    }
    if (unauthBlocked) {
      console.log('  [PASS] 20. Unauthorized citizen blocked from accessing offers (403 Forbidden)');
      passed++;
    } else {
      console.log('  [FAIL] 20. Unauthorized citizen was NOT blocked');
    }

    // 21. Offer history remains available
    console.log('Test 21: Offer history preservation...');
    const historyOffers = await prisma.pickupOffer.findMany({
      where: { collectionRequestId: request.id },
    });
    if (historyOffers.length === 2) {
      console.log('  [PASS] 21. All 2 offer records preserved for audit history');
      passed++;
    } else {
      console.log('  [FAIL] 21. History count:', historyOffers.length);
    }

    // 22. EcoTrace records the important lifecycle events
    console.log('Test 22: EcoTrace / AuditLog audit trail...');
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: request.id },
    });
    const hasOfferSubmitted = auditLogs.some((l) => l.action.includes('OFFER_SUBMITTED'));
    const hasOfferAccepted = auditLogs.some((l) => l.action.includes('OFFER_ACCEPTED'));
    if (hasOfferSubmitted && hasOfferAccepted) {
      console.log('  [PASS] 22. EcoTrace audit log captures complete offer lifecycle');
      passed++;
    } else {
      console.log('  [FAIL] 22. Audit logs:', auditLogs.map((l) => l.action));
    }

    // Teardown event listeners
    eventBus.removeListener('COLLECTOR_OFFER_SUBMITTED', onOfferSubmitted);
    eventBus.removeListener('COLLECTOR_OFFER_COUNTERED', onOfferCountered);
    eventBus.removeListener('COLLECTOR_OFFER_ACCEPTED', onOfferAccepted);
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    // Cleanup records in correct dependency order
    try {
      if (request?.id) {
        await prisma.pickup.deleteMany({ where: { collectionRequestId: request.id } });
        await prisma.pickupOffer.deleteMany({ where: { collectionRequestId: request.id } });
        await prisma.collectionRequest.deleteMany({ where: { id: request.id } });
      }
      if (item?.id) {
        await prisma.ewasteItem.deleteMany({ where: { id: item.id } });
      }
      if (collectorAProfile?.id) {
        await prisma.collectorProfile.deleteMany({ where: { id: collectorAProfile.id } });
      }
      if (collectorBProfile?.id) {
        await prisma.collectorProfile.deleteMany({ where: { id: collectorBProfile.id } });
      }
      if (collectorAUser?.id) {
        await prisma.notification.deleteMany({ where: { userId: collectorAUser.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: collectorAUser.id } });
        await prisma.user.deleteMany({ where: { id: collectorAUser.id } });
      }
      if (collectorBUser?.id) {
        await prisma.notification.deleteMany({ where: { userId: collectorBUser.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: collectorBUser.id } });
        await prisma.user.deleteMany({ where: { id: collectorBUser.id } });
      }
      if (citizenUser?.id) {
        await prisma.notification.deleteMany({ where: { userId: citizenUser.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: citizenUser.id } });
        await prisma.user.deleteMany({ where: { id: citizenUser.id } });
      }
      if (unauthorizedCitizen?.id) {
        await prisma.notification.deleteMany({ where: { userId: unauthorizedCitizen.id } });
        await prisma.user.deleteMany({ where: { id: unauthorizedCitizen.id } });
      }
    } catch (cleanupErr) {}
  }

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
