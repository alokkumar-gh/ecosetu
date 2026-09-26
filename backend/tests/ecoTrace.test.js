/**
 * EcoSetu — EcoTrace Intelligence Test Suite
 * Canonical Reference: docs/07_BUSINESS_WORKFLOWS.md, docs/21_TRACEABILITY_AND_AUDIT.md
 */

const assert = require('assert');
const ecoTraceService = require('../src/services/traceability/EcoTraceService');
const ecoSaathiOrchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const intentDetector = require('../src/services/ecoSaathi/intentDetector');
const toolRegistry = require('../src/services/ecoSaathi/tools/toolRegistry');
const { ROLES, REQUEST_STATUS, ITEM_STATUS } = require('../src/utils/constants');

async function runTests() {
  console.log('🧪 Starting EcoTrace Intelligence Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function pass(name) {
    passed++;
    console.log(`  ✔ PASS: ${name}`);
  }

  function fail(name, err) {
    failed++;
    console.error(`  ✖ FAIL: ${name}\n    Error: ${err.message}`);
  }

  const citizenUser = {
    id: 'ccd8eb93-8b12-42ef-9d10-36ab0a978fea',
    name: 'Alok Kumar',
    role: ROLES.CITIZEN,
  };

  const otherCitizenUser = {
    id: 'c6c3905c-1b14-4832-9060-78bdec25414a',
    name: 'Priya Sharma',
    role: ROLES.CITIZEN,
  };

  const collectorUser = {
    id: '5c49dd7d-fe95-4a24-a0aa-bb6700bd2ede',
    name: 'Rajesh Senapati',
    role: ROLES.INFORMAL_COLLECTOR,
  };

  const otherCollectorUser = {
    id: '99999999-9999-9999-9999-999999999999',
    name: 'Vikram Patel',
    role: ROLES.INFORMAL_COLLECTOR,
  };

  // ── TEST 1: Complete Lifecycle Timeline Construction ──
  try {
    const mockRequest = {
      id: 'req-full-lifecycle-1',
      citizenId: citizenUser.id,
      citizen: { name: citizenUser.name },
      status: REQUEST_STATUS.PICKED_UP,
      pickupAddress: 'Plot 104, Saheed Nagar, Bhubaneswar',
      submittedAt: new Date(Date.now() - 3600000 * 24),
      acceptedAt: new Date(Date.now() - 3600000 * 20),
      collector: { user: { name: collectorUser.name } },
      pickup: {
        completedAt: new Date(Date.now() - 3600000 * 18),
        scheduledDate: new Date(Date.now() - 3600000 * 19),
      },
      pickupOffers: [
        {
          id: 'off-1',
          offeredPrice: '950',
          status: 'ACCEPTED',
          createdAt: new Date(Date.now() - 3600000 * 22),
          collector: { user: { name: collectorUser.name } },
        },
      ],
      ewasteItems: [
        {
          id: 'item-1',
          category: 'LAPTOP',
          condition: 'WORKING',
          estimatedWeightKg: '2.1',
          actualWeightKg: '2.15',
          imageUrl: 'https://ecosetu.in/uploads/laptop.jpg',
          citizen: { name: citizenUser.name },
          createdAt: new Date(Date.now() - 3600000 * 25),
          aiPredictions: [
            {
              predictedCategory: 'LAPTOP',
              confidence: '0.94',
              createdAt: new Date(Date.now() - 3600000 * 25),
            },
          ],
          consignmentItems: [
            {
              consignment: {
                id: 'con-1',
                createdAt: new Date(Date.now() - 3600000 * 12),
                acceptedAt: new Date(Date.now() - 3600000 * 10),
                collector: { user: { name: collectorUser.name } },
                recycler: { facilityName: 'EcoRecycle Formal Hub' },
                recyclingRecord: {
                  processingStartedAt: new Date(Date.now() - 3600000 * 8),
                  completedAt: new Date(Date.now() - 3600000 * 2),
                  outputWeightKg: '1.95',
                  outputDescription: 'Recycled PCB, Aluminum Chassis, Lithium Recovery',
                },
              },
            },
          ],
        },
      ],
    };

    const events = ecoTraceService._buildNormalizedEvents(mockRequest, mockRequest.ewasteItems[0]);
    assert.strictEqual(events.length >= 8, true, 'Complete lifecycle must produce all verified events');
    const eventTypes = events.map((e) => e.type);
    assert.strictEqual(eventTypes.includes('REQUEST_CREATED'), true);
    assert.strictEqual(eventTypes.includes('AI_CLASSIFIED'), true);
    assert.strictEqual(eventTypes.includes('CATEGORY_CONFIRMED'), true);
    assert.strictEqual(eventTypes.includes('OFFERS_BROADCAST'), true);
    assert.strictEqual(eventTypes.includes('OFFER_ACCEPTED'), true);
    assert.strictEqual(eventTypes.includes('PICKUP_COMPLETED'), true);
    assert.strictEqual(eventTypes.includes('CONSIGNMENT_CREATED'), true);
    assert.strictEqual(eventTypes.includes('RECYCLING_COMPLETED'), true);
    pass('1. Complete lifecycle timeline contains all verified milestones');
  } catch (err) {
    fail('1. Complete lifecycle timeline', err);
  }

  // ── TEST 2: Partial Lifecycle Timeline ──
  try {
    const partialRequest = {
      id: 'req-partial-1',
      citizenId: citizenUser.id,
      status: REQUEST_STATUS.SUBMITTED,
      submittedAt: new Date(),
      pickupOffers: [],
      ewasteItems: [
        {
          id: 'item-2',
          category: 'MOBILE_PHONE',
          condition: 'DAMAGED',
          createdAt: new Date(),
          consignmentItems: [],
        },
      ],
    };

    const events = ecoTraceService._buildNormalizedEvents(partialRequest, partialRequest.ewasteItems[0]);
    const eventTypes = events.map((e) => e.type);
    assert.strictEqual(eventTypes.includes('REQUEST_CREATED'), true);
    assert.strictEqual(eventTypes.includes('OFFERS_BROADCAST'), true);
    assert.strictEqual(eventTypes.includes('PICKUP_COMPLETED'), false, 'Should not contain completed pickup event');
    pass('2. Partial lifecycle timeline only reflects completed actions');
  } catch (err) {
    fail('2. Partial lifecycle timeline', err);
  }

  // ── TEST 3 & 4: Current & Next State Detection ──
  try {
    const currentState = ecoTraceService._resolveCurrentState(
      { status: REQUEST_STATUS.PICKUP_SCHEDULED },
      null,
      []
    );
    assert.strictEqual(currentState, 'PICKUP_SCHEDULED');

    const nextState = ecoTraceService._resolveNextExpectedState('PICKUP_SCHEDULED');
    assert.strictEqual(nextState, 'PICKUP_COMPLETED');

    const nextRecycle = ecoTraceService._resolveNextExpectedState('PICKED_UP');
    assert.strictEqual(nextRecycle, 'CONSIGNED_TO_RECYCLER');

    pass('3 & 4. Current state and next expected state resolved deterministically');
  } catch (err) {
    fail('3 & 4. Current & next state detection', err);
  }

  // ── TEST 5: Missing Recycler Record Handling (Zero Fabrication) ──
  try {
    const itemWithoutRecycler = {
      id: 'item-no-recycler',
      category: 'LAPTOP',
      consignmentItems: [],
    };

    const recyclerInfo = ecoTraceService._resolveRecyclerInfo(itemWithoutRecycler);
    assert.strictEqual(recyclerInfo.isRecorded, false);
    assert.strictEqual(
      recyclerInfo.statusMessage,
      'Recycler processing information has not been recorded for this item.'
    );
    pass('5. Missing recycler record is explicitly identified without fabrication');
  } catch (err) {
    fail('5. Missing recycler record handling', err);
  }

  // ── TEST 6: Pickup Scheduled Milestone ──
  try {
    const scheduledReq = {
      id: 'req-sched',
      status: REQUEST_STATUS.PICKUP_SCHEDULED,
      preferredDate: new Date(Date.now() + 86400000),
      collector: { user: { name: 'Rajesh Collector' } },
    };
    const events = ecoTraceService._buildNormalizedEvents(scheduledReq, {
      category: 'LAPTOP',
      createdAt: new Date(),
    });
    const schedEvent = events.find((e) => e.type === 'PICKUP_SCHEDULED');
    assert.strictEqual(Boolean(schedEvent), true);
    assert.strictEqual(schedEvent.status, 'CURRENT');
    pass('6. Pickup scheduled milestone correctly flagged as CURRENT');
  } catch (err) {
    fail('6. Pickup scheduled milestone', err);
  }

  // ── TEST 7: Pickup Overdue Detection (Neutral Phrasing) ──
  try {
    const overdueReq = {
      id: 'req-overdue',
      status: REQUEST_STATUS.ACCEPTED,
      preferredDate: new Date(Date.now() - 86400000 * 3), // 3 days ago
      pickup: { completedAt: null },
    };
    const delay = ecoTraceService._detectDelays(overdueReq, null);
    assert.strictEqual(delay.isOverdue, true);
    assert.strictEqual(delay.delayStatus, 'PICKUP_OVERDUE');
    assert.strictEqual(
      delay.delayReason.includes('completion has not yet been recorded'),
      true
    );
    pass('7. Pickup overdue detected with neutral, non-blaming explanation');
  } catch (err) {
    fail('7. Pickup overdue detection', err);
  }

  // ── TEST 8: Pickup Completed Milestone with Weight ──
  try {
    const completedReq = {
      id: 'req-comp',
      status: REQUEST_STATUS.PICKED_UP,
      completedAt: new Date(),
      collector: { user: { name: 'Rajesh Collector' } },
      pickup: { completedAt: new Date() },
    };
    const completedItem = {
      category: 'LAPTOP',
      actualWeightKg: '2.4',
      createdAt: new Date(),
    };
    const events = ecoTraceService._buildNormalizedEvents(completedReq, completedItem);
    const compEvent = events.find((e) => e.type === 'PICKUP_COMPLETED');
    assert.strictEqual(Boolean(compEvent), true);
    assert.strictEqual(compEvent.details.actualWeightKg, 2.4);
    assert.strictEqual(compEvent.actorRole, ROLES.INFORMAL_COLLECTOR);
    pass('8. Pickup completed milestone recorded with verified weight and collector');
  } catch (err) {
    fail('8. Pickup completed milestone', err);
  }

  // ── TEST 9: Recorded vs Derived Event Sources ──
  try {
    const events = ecoTraceService._buildNormalizedEvents(
      { id: 'req-1', submittedAt: new Date() },
      { id: 'item-1', category: 'LAPTOP', createdAt: new Date() }
    );
    const createdEvent = events.find((e) => e.type === 'REQUEST_CREATED');
    const confirmedEvent = events.find((e) => e.type === 'CATEGORY_CONFIRMED');
    assert.strictEqual(createdEvent.sourceType, 'RECORDED');
    assert.strictEqual(confirmedEvent.sourceType, 'DERIVED');
    pass('9. Event source types distinguish RECORDED vs DERIVED facts');
  } catch (err) {
    fail('9. Recorded vs Derived event sources', err);
  }

  // ── TEST 10 & 11: Security Isolation (Citizen Ownership) ──
  try {
    const req = { citizenId: citizenUser.id, status: REQUEST_STATUS.SUBMITTED };
    
    // Citizen accessing own request
    assert.doesNotThrow(() => {
      ecoTraceService._validateAuthorization(citizenUser, req, null);
    });

    // Citizen accessing another citizen's request
    assert.throws(
      () => {
        ecoTraceService._validateAuthorization(otherCitizenUser, req, null);
      },
      (err) => err.statusCode === 403
    );

    pass('10 & 11. Citizen own-request access granted; unauthorized citizen blocked (403)');
  } catch (err) {
    fail('10 & 11. Citizen ownership security', err);
  }

  // ── TEST 12 & 13: Security Isolation (Collector Access) ──
  try {
    const assignedReq = {
      collector: { userId: collectorUser.id },
      status: REQUEST_STATUS.ACCEPTED,
    };

    // Assigned collector access
    assert.doesNotThrow(() => {
      ecoTraceService._validateAuthorization(collectorUser, assignedReq, null);
    });

    // Unassigned collector accessing private assigned request
    assert.throws(
      () => {
        ecoTraceService._validateAuthorization(otherCollectorUser, assignedReq, null);
      },
      (err) => err.statusCode === 403
    );

    pass('12 & 13. Assigned collector access granted; cross-collector access blocked (403)');
  } catch (err) {
    fail('12 & 13. Collector access security', err);
  }

  // ── TEST 14: English Traceability Question ──
  try {
    const d1 = intentDetector.detect('Where is my e-waste?');
    const d2 = intentDetector.detect('What happened to my laptop?');
    assert.strictEqual(d1.intent, 'TRACEABILITY_EXPLANATION');
    assert.strictEqual(d2.intent, 'TRACEABILITY_EXPLANATION');
    pass('14. English traceability queries detected ("Where is my e-waste?", "What happened to my laptop?")');
  } catch (err) {
    fail('14. English traceability queries', err);
  }

  // ── TEST 15: Hindi Traceability Question ──
  try {
    const d = intentDetector.detect('Mera e-waste kaha hai?');
    assert.strictEqual(d.intent, 'TRACEABILITY_EXPLANATION');
    pass('15. Hindi traceability query detected ("Mera e-waste kaha hai?")');
  } catch (err) {
    fail('15. Hindi traceability query', err);
  }

  // ── TEST 16: Hinglish Traceability Question ──
  try {
    const d = intentDetector.detect('Abhi mera item kis stage pe hai?');
    assert.strictEqual(d.intent, 'TRACEABILITY_EXPLANATION');
    pass('16. Hinglish traceability query detected ("Abhi mera item kis stage pe hai?")');
  } catch (err) {
    fail('16. Hinglish traceability query', err);
  }

  // ── TEST 17: Odia Traceability Question ──
  try {
    const d = intentDetector.detect('ମୋ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ କେଉଁଠି ଅଛି');
    assert.strictEqual(d.intent, 'TRACEABILITY_EXPLANATION');
    pass('17. Odia traceability query detected ("ମୋ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ କେଉଁଠି ଅଛି")');
  } catch (err) {
    fail('17. Odia traceability query', err);
  }

  // ── TEST 18: "What happens next?" using Traceability State ──
  try {
    const expl = ecoTraceService._generateExplanation({
      currentState: 'PICKUP_SCHEDULED',
      nextExpectedState: 'PICKUP_COMPLETED',
      item: { category: 'LAPTOP' },
      request: { collector: { user: { name: 'Rajesh Senapati' } } },
      delayInfo: { isOverdue: false },
      recyclerInfo: { isRecorded: false },
      language: 'en',
    });
    assert.strictEqual(expl.includes('Rajesh Senapati is assigned'), true);
    pass('18. What happens next explains stage factually from verified state');
  } catch (err) {
    fail('18. What happens next', err);
  }

  // ── TEST 19: Missing GPS Handling (No Fabricated Distance) ──
  try {
    const loc = ecoTraceService._resolveLocationInfo(
      { status: REQUEST_STATUS.PICKED_UP, pickupAddress: 'Saheed Nagar' },
      null
    );
    assert.strictEqual(loc.hasLiveGps, false);
    assert.strictEqual(
      loc.locationMessage.includes('does not currently have live GPS location tracking'),
      true
    );
    pass('19. Missing live GPS handled factually without fabricating real-time coordinates');
  } catch (err) {
    fail('19. Missing GPS handling', err);
  }

  // ── TEST 20: Missing Timestamp Handling ──
  try {
    const time = ecoTraceService._calculateElapsedTime(null);
    assert.strictEqual(time, 'Recently');
    pass('20. Missing timestamp handled gracefully without runtime exceptions');
  } catch (err) {
    fail('20. Missing timestamp handling', err);
  }

  // ── TEST 21: No Hallucinated Lifecycle Event ──
  try {
    const req = {
      id: 'req-plain',
      status: REQUEST_STATUS.SUBMITTED,
      submittedAt: new Date(),
      pickupOffers: [],
      ewasteItems: [{ id: 'item-plain', category: 'LAPTOP', createdAt: new Date() }],
    };
    const events = ecoTraceService._buildNormalizedEvents(req, req.ewasteItems[0]);
    const eventTypes = events.map((e) => e.type);
    assert.strictEqual(eventTypes.includes('RECYCLING_STARTED'), false);
    assert.strictEqual(eventTypes.includes('GREEN_CERTIFICATE_ISSUED'), false);
    pass('21. Zero hallucination: unverified stages are never added as completed events');
  } catch (err) {
    fail('21. No hallucinated lifecycle event', err);
  }

  // ── TEST 22: Pure Read Model (No Autonomous State Mutation) ──
  try {
    const toolDef = toolRegistry.getTool('getLifecycleTrace');
    assert.strictEqual(toolDef.type, 'READ');
    assert.strictEqual(toolDef.allowedRoles.includes(ROLES.CITIZEN), true);
    assert.strictEqual(toolDef.allowedRoles.includes(ROLES.INFORMAL_COLLECTOR), true);
    pass('22. Traceability tool is strictly classified as READ-only and non-mutating');
  } catch (err) {
    fail('22. Pure read model', err);
  }

  // ── TEST 23: Orchestrator Integration ──
  try {
    const response = await ecoSaathiOrchestrator.processQuery('Where is my e-waste?', citizenUser, {
      language: 'en',
    });
    assert.strictEqual(response.responseType, 'TRACEABILITY');
    assert.strictEqual(Boolean(response.message), true);
    assert.strictEqual(response.quickActions.length > 0, true);
    pass('23. Eco-Saathi Orchestrator delivers structured TRACEABILITY card with quick actions');
  } catch (err) {
    fail('23. Orchestrator integration', err);
  }

  // ── TEST 24: Orchestrator Hindi Vernacular Response ──
  try {
    const response = await ecoSaathiOrchestrator.processQuery('Mera e-waste kaha hai?', citizenUser, {
      language: 'hi',
    });
    assert.strictEqual(response.responseType, 'TRACEABILITY');
    assert.strictEqual(Boolean(response.message), true);
    pass('24. Eco-Saathi delivers vernacular Hindi traceability response');
  } catch (err) {
    fail('24. Hindi vernacular response', err);
  }

  console.log(`\n========================================`);
  console.log(`📊 EcoTrace Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running EcoTrace tests:', err);
  process.exit(1);
});
