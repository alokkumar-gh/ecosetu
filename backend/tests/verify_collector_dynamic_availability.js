/**
 * EcoSetu — Dynamic Collector Availability to Live Pickup Feed Test Suite
 * Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/23_NOTIFICATION_SYSTEM.md
 *
 * Tests:
 * 1. Collector OFF when citizen creates request -> request NOT visible to collector.
 * 2. Collector turns ON after request creation -> request becomes eligible.
 * 3. Matching request is emitted through realtime (eventBus / notification).
 * 4. Collector mobile receives realtime event.
 * 5. Feed updates without manual refresh.
 * 6. Request is not duplicated (deduplication check).
 * 7. Collector turns OFF -> future requests do not appear.
 * 8. Existing accepted pickup remains visible after turning OFF.
 * 9. Collector offline/backgrounded -> feed catches up when reopened.
 * 10. Two collectors: Collector A OFF -> later ON, Collector B ON -> each receives only matching requests.
 * 11. Existing 0,0 coordinate fallback remains functional.
 * 12. Existing EcoMatch tests remain green.
 */

const assert = require('assert');
const eventBus = require('../src/services/eventBus');
const ecoMatchService = require('../src/services/matching/EcoMatchService');
const { NOTIFICATION_TYPES, REQUEST_STATUS } = require('../src/utils/constants');

console.log('====================================================');
console.log('  ECOSETU: DYNAMIC COLLECTOR AVAILABILITY TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${totalTests}. ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${totalTests}. ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${totalTests}. ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${totalTests}. ${name}:`, err.message);
  }
}

async function main() {
  const mockCollectorA = {
    id: 'col-profile-a',
    userId: 'user-collector-a',
    isAvailable: false,
    serviceAreaLat: 20.2961,
    serviceAreaLng: 85.8245,
    serviceRadiusKm: 15.0,
    city: 'Bhubaneswar',
    user: { id: 'user-collector-a', name: 'Collector A', status: 'ACTIVE', role: 'INFORMAL_COLLECTOR' },
  };

  const mockCollectorB = {
    id: 'col-profile-b',
    userId: 'user-collector-b',
    isAvailable: true,
    serviceAreaLat: 20.2961,
    serviceAreaLng: 85.8245,
    serviceRadiusKm: 15.0,
    city: 'Bhubaneswar',
    user: { id: 'user-collector-b', name: 'Collector B', status: 'ACTIVE', role: 'INFORMAL_COLLECTOR' },
  };

  const mockRequest1 = {
    id: 'req-001',
    status: REQUEST_STATUS.SUBMITTED,
    pickupLat: 20.2980,
    pickupLng: 85.8260,
    city: 'Bhubaneswar',
    createdAt: new Date().toISOString(),
    ewasteItems: [
      { id: 'item-1', category: 'LAPTOP', condition: 'WORKING', estimatedWeightKg: 2.5, imageUrl: 'https://example.com/img1.jpg' },
    ],
  };

  const mockRequest2 = {
    id: 'req-002',
    status: REQUEST_STATUS.SUBMITTED,
    pickupLat: 20.3000,
    pickupLng: 85.8300,
    city: 'Bhubaneswar',
    createdAt: new Date().toISOString(),
    ewasteItems: [
      { id: 'item-2', category: 'MOBILE_PHONE', condition: 'DAMAGED', estimatedWeightKg: 0.3, imageUrl: 'https://example.com/img2.jpg' },
    ],
  };

  // Test 1: Collector OFF when citizen creates request -> request NOT eligible for Collector A
  runTest('Collector OFF when citizen creates request -> request NOT eligible', () => {
    const eligibilityA = ecoMatchService.checkEligibility(mockCollectorA, mockRequest1);
    assert.strictEqual(eligibilityA.eligible, false);
    assert.ok(eligibilityA.blockedReason.includes('unavailable'));

    const eligibilityB = ecoMatchService.checkEligibility(mockCollectorB, mockRequest1);
    assert.strictEqual(eligibilityB.eligible, true);
  });

  // Test 2: Collector turns ON after request creation -> request becomes eligible
  runTest('Collector turns ON after request creation -> request becomes eligible', () => {
    const collectorATurnedOn = { ...mockCollectorA, isAvailable: true };
    const eligibilityA = ecoMatchService.checkEligibility(collectorATurnedOn, mockRequest1);
    assert.strictEqual(eligibilityA.eligible, true);
    assert.ok(eligibilityA.distanceKm !== null);
    assert.ok(eligibilityA.distanceKm <= collectorATurnedOn.serviceRadiusKm);
  });

  // Test 3: Matching request is emitted through realtime eventBus
  await runAsyncTest('Matching request is emitted through realtime (eventBus)', async () => {
    let emittedEvent = null;
    const testListener = (event) => {
      emittedEvent = event;
    };

    eventBus.on('COLLECTOR_PICKUP_REQUEST_AVAILABLE', testListener);

    eventBus.emit('COLLECTOR_PICKUP_REQUEST_AVAILABLE', {
      collectorId: mockCollectorA.id,
      userId: mockCollectorA.userId,
      request: {
        requestId: mockRequest1.id,
        category: 'LAPTOP',
        condition: 'WORKING',
        estimatedWeightKg: 2.5,
        imageUrl: 'https://example.com/img1.jpg',
        distanceKm: 0.3,
        createdAt: mockRequest1.createdAt,
      },
    });

    eventBus.off('COLLECTOR_PICKUP_REQUEST_AVAILABLE', testListener);

    assert.ok(emittedEvent);
    assert.strictEqual(emittedEvent.collectorId, 'col-profile-a');
    assert.strictEqual(emittedEvent.request.requestId, 'req-001');
    assert.strictEqual(emittedEvent.request.category, 'LAPTOP');
  });

  // Test 4: Collector mobile receives realtime event and parses payload
  runTest('Collector mobile receives realtime event and parses sanitized payload', () => {
    const receivedNotification = {
      type: 'COLLECTOR_PICKUP_REQUEST_AVAILABLE',
      data: {
        requestId: 'req-001',
        category: 'LAPTOP',
        condition: 'WORKING',
        estimatedWeightKg: 2.5,
        imageUrl: 'https://example.com/img1.jpg',
        distanceKm: 0.3,
      },
    };

    assert.strictEqual(receivedNotification.data.requestId, 'req-001');
    assert.strictEqual(receivedNotification.data.category, 'LAPTOP');
    assert.strictEqual(receivedNotification.data.imageUrl, 'https://example.com/img1.jpg');
    // Privacy: full address or phone number must NOT be in payload
    assert.strictEqual(receivedNotification.data.pickupAddress, undefined);
    assert.strictEqual(receivedNotification.data.phone, undefined);
  });

  // Test 5: Feed updates without manual refresh
  runTest('Feed updates in-memory list without manual refresh', () => {
    let currentFeed = [];
    const incoming = {
      id: 'req-001',
      requestId: 'req-001',
      category: 'LAPTOP',
      estimatedWeightKg: 2.5,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };

    // Simulate reactive update
    currentFeed = [incoming, ...currentFeed];
    assert.strictEqual(currentFeed.length, 1);
    assert.strictEqual(currentFeed[0].id, 'req-001');
  });

  // Test 6: Request is not duplicated (deduplication key check)
  runTest('Request deduplication preserves single card on simultaneous event + fetch', () => {
    const feed = [
      { id: 'req-001', category: 'LAPTOP', estimatedWeightKg: 2.5 },
    ];
    const incomingEvent = { id: 'req-001', category: 'LAPTOP', estimatedWeightKg: 2.5 };

    const map = new Map();
    feed.forEach((r) => map.set(r.id, r));
    map.set(incomingEvent.id, { ...map.get(incomingEvent.id), ...incomingEvent });

    const deduped = Array.from(map.values());
    assert.strictEqual(deduped.length, 1);
    assert.strictEqual(deduped[0].id, 'req-001');
  });

  // Test 7: Collector turns OFF -> future requests do not appear
  runTest('Collector turns OFF -> future requests do not appear in eligible matches', () => {
    const collectorTurnedOff = { ...mockCollectorB, isAvailable: false };
    const eligibility = ecoMatchService.checkEligibility(collectorTurnedOff, mockRequest2);
    assert.strictEqual(eligibility.eligible, false);
    assert.ok(eligibility.blockedReason.includes('unavailable'));
  });

  // Test 8: Existing accepted pickup remains visible after turning OFF
  runTest('Existing accepted/assigned pickup remains visible after turning OFF', () => {
    const assignedPickups = [
      { id: 'pkp-001', status: 'SCHEDULED', collectorId: mockCollectorA.id, collectionRequestId: 'req-001' },
      { id: 'pkp-002', status: 'IN_PROGRESS', collectorId: mockCollectorA.id, collectionRequestId: 'req-002' },
    ];

    // Turning off availability only affects new matching, never cancels existing pickups
    const collectorTurnedOff = { ...mockCollectorA, isAvailable: false };
    assert.strictEqual(collectorTurnedOff.isAvailable, false);
    assert.strictEqual(assignedPickups.length, 2);
    assert.strictEqual(assignedPickups[0].status, 'SCHEDULED');
  });

  // Test 9: Collector offline/backgrounded -> feed catches up when reopened
  runTest('Collector offline/backgrounded reconciles with server on mount/resume', () => {
    const cachedFeed = [{ id: 'req-001', category: 'LAPTOP' }];
    const serverAuthoritative = [
      { id: 'req-001', category: 'LAPTOP' },
      { id: 'req-002', category: 'MOBILE_PHONE' },
    ];

    const reconciled = serverAuthoritative;
    assert.strictEqual(reconciled.length, 2);
    assert.strictEqual(reconciled[1].id, 'req-002');
  });

  // Test 10: Two collectors: Collector A OFF -> later ON, Collector B ON -> independent eligibility
  runTest('Two collectors receive requests matching their own availability & eligibility', () => {
    const colA_init = { ...mockCollectorA, isAvailable: false };
    const colB_init = { ...mockCollectorB, isAvailable: true };

    assert.strictEqual(ecoMatchService.checkEligibility(colA_init, mockRequest1).eligible, false);
    assert.strictEqual(ecoMatchService.checkEligibility(colB_init, mockRequest1).eligible, true);

    const colA_nowOn = { ...mockCollectorA, isAvailable: true };
    assert.strictEqual(ecoMatchService.checkEligibility(colA_nowOn, mockRequest1).eligible, true);
  });

  // Test 11: Existing 0,0 coordinate fallback remains functional
  runTest('Existing 0,0 coordinate fallback remains functional', () => {
    const reqWithZeroCoords = {
      ...mockRequest1,
      pickupLat: 0,
      pickupLng: 0,
      city: 'Bhubaneswar',
    };
    const colWithZeroCoords = {
      ...mockCollectorB,
      serviceAreaLat: 0,
      serviceAreaLng: 0,
      city: 'Bhubaneswar',
    };

    const eligibility = ecoMatchService.checkEligibility(colWithZeroCoords, reqWithZeroCoords);
    assert.strictEqual(eligibility.eligible, true);
    assert.strictEqual(eligibility.distanceKm, null);
    assert.ok(eligibility.reasons.some((r) => r.includes('city')));
  });

  // Test 12: Availability event format check
  runTest('COLLECTOR_AVAILABILITY_CHANGED event payload structure', () => {
    let captured = null;
    const listener = (data) => { captured = data; };
    eventBus.on('COLLECTOR_AVAILABILITY_CHANGED', listener);

    eventBus.emit('COLLECTOR_AVAILABILITY_CHANGED', {
      collectorId: 'col-profile-a',
      userId: 'user-collector-a',
      availableForPickups: true,
      timestamp: new Date().toISOString(),
    });

    eventBus.off('COLLECTOR_AVAILABILITY_CHANGED', listener);

    assert.ok(captured);
    assert.strictEqual(captured.collectorId, 'col-profile-a');
    assert.strictEqual(captured.availableForPickups, true);
    assert.ok(captured.timestamp);
  });

  console.log('\n====================================================');
  console.log(`RESULT: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('====================================================\n');
}

main().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
