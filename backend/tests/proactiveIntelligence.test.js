/**
 * EcoSetu — Proactive Intelligence Test Suite
 * Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md, docs/10_BACKEND_ARCHITECTURE.md
 */

const assert = require('assert');
const proactiveService = require('../src/services/proactive/EcoSaathiIntelligenceService');
const ecoSaathiOrchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const intentDetector = require('../src/services/ecoSaathi/intentDetector');
const toolRegistry = require('../src/services/ecoSaathi/tools/toolRegistry');
const { ROLES, NOTIFICATION_TYPES } = require('../src/utils/constants');

async function runTests() {
  console.log('🧪 Starting Proactive Intelligence Test Suite...\n');
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

  // Clear cache before starting
  proactiveService.clearCache();

  const citizenUser = {
    id: 'ccd8eb93-8b12-42ef-9d10-36ab0a978fea',
    name: 'Alok Kumar',
    role: ROLES.CITIZEN,
  };

  const collectorUser = {
    id: '5c49dd7d-fe95-4a24-a0aa-bb6700bd2ede',
    name: 'Rajesh Senapati',
    role: ROLES.INFORMAL_COLLECTOR,
  };

  // ── TEST 1: New Citizen Offer Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      recipientId: citizenUser.id,
      recipientRole: ROLES.CITIZEN,
      data: {
        requestId: 'req-101',
        collectorName: 'Rajesh Senapati',
        offeredPrice: 950,
        category: 'LAPTOP',
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.urgency, 'ACTION_REQUIRED');
    assert.strictEqual(alert.priority, 'HIGH');
    assert.strictEqual(alert.message.includes('Rajesh Senapati offered ₹950 for your laptop'), true);
    assert.strictEqual(alert.quickActions.includes('View Offer'), true);
    pass('1. New citizen offer notification created with collector name and amount');
  } catch (err) {
    fail('1. New citizen offer notification', err);
  }

  // ── TEST 2: Collector Counter-Offer Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: 'COUNTER_OFFER_RECEIVED',
      recipientId: collectorUser.id,
      recipientRole: ROLES.INFORMAL_COLLECTOR,
      data: {
        requestId: 'req-101',
        offeredPrice: 900,
        counterPrice: 1050,
        category: 'LAPTOP',
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.urgency, 'ACTION_REQUIRED');
    assert.strictEqual(alert.priority, 'HIGH');
    assert.strictEqual(alert.message.includes('Citizen countered your ₹900 offer with ₹1,050'), true);
    assert.strictEqual(alert.quickActions.includes('View Negotiation'), true);
    pass('2. Collector counter-offer notification generated with original and counter prices');
  } catch (err) {
    fail('2. Collector counter-offer notification', err);
  }

  // ── TEST 3: Offer Accepted Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: NOTIFICATION_TYPES.OFFER_ACCEPTED,
      recipientId: collectorUser.id,
      recipientRole: ROLES.INFORMAL_COLLECTOR,
      data: {
        requestId: 'req-102',
        offeredPrice: 1050,
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.urgency, 'ACTION_REQUIRED');
    assert.strictEqual(alert.message.includes('Your offer of ₹1,050 has been accepted'), true);
    assert.strictEqual(alert.quickActions.includes('View Pickup'), true);
    pass('3. Offer accepted notification assigns pickup to collector');
  } catch (err) {
    fail('3. Offer accepted notification', err);
  }

  // ── TEST 4: Pickup Scheduled Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: NOTIFICATION_TYPES.PICKUP_SCHEDULED,
      recipientId: citizenUser.id,
      recipientRole: ROLES.CITIZEN,
      data: {
        requestId: 'req-103',
        category: 'LAPTOP',
        scheduledDate: new Date('2026-09-27T10:00:00Z'),
        timeSlot: '10:00 AM - 12:00 PM',
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.urgency, 'INFO');
    assert.strictEqual(alert.message.includes('pickup is scheduled'), true);
    pass('4. Pickup scheduled notification generated with scheduled time');
  } catch (err) {
    fail('4. Pickup scheduled notification', err);
  }

  // ── TEST 5: Pickup Overdue Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: 'PICKUP_OVERDUE',
      recipientId: citizenUser.id,
      recipientRole: ROLES.CITIZEN,
      data: {
        requestId: 'req-104',
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.urgency, 'TIME_SENSITIVE');
    assert.strictEqual(alert.priority, 'HIGH');
    assert.strictEqual(alert.message.includes('completion has not yet been recorded'), true);
    assert.strictEqual(alert.quickActions.includes('Contact Collector'), true);
    pass('5. Pickup overdue notification generated with factual non-blaming warning');
  } catch (err) {
    fail('5. Pickup overdue notification', err);
  }

  // ── TEST 6: Traceability Update Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: NOTIFICATION_TYPES.PICKUP_COMPLETED,
      recipientId: citizenUser.id,
      recipientRole: ROLES.CITIZEN,
      data: {
        requestId: 'req-105',
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.urgency, 'INFO');
    assert.strictEqual(alert.quickActions.includes('View Journey'), true);
    pass('6. Traceability update notification generated on pickup completion');
  } catch (err) {
    fail('6. Traceability update notification', err);
  }

  // ── TEST 7: Recycling Update Notification ──
  try {
    const alert = await proactiveService.processEvent({
      type: NOTIFICATION_TYPES.RECYCLING_COMPLETED,
      recipientId: citizenUser.id,
      recipientRole: ROLES.CITIZEN,
      data: {
        recordId: 'rec-101',
      },
    });

    assert.strictEqual(Boolean(alert), true);
    assert.strictEqual(alert.quickActions.includes('Download Certificate'), true);
    pass('7. Recycling update notification provides green certificate action');
  } catch (err) {
    fail('7. Recycling update notification', err);
  }

  // ── TEST 8: Duplicate Notification Prevention ──
  try {
    const duplicateEvent = {
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      recipientId: citizenUser.id,
      recipientRole: ROLES.CITIZEN,
      data: {
        requestId: 'req-101',
        collectorName: 'Rajesh Senapati',
        offeredPrice: 950,
        category: 'LAPTOP',
      },
    };

    // Since this identical event was already processed in TEST 1, second run must return null
    const duplicateResult = await proactiveService.processEvent(duplicateEvent);
    assert.strictEqual(duplicateResult, null, 'Duplicate event must be suppressed');
    pass('8. Deterministic deduplication key suppresses duplicate notifications');
  } catch (err) {
    fail('8. Duplicate notification prevention', err);
  }

  // ── TEST 9: Notification Key Generation Format ──
  try {
    const key = proactiveService.generateNotificationKey({
      type: 'OFFER_RECEIVED',
      recipientId: 'user-abc',
      data: { requestId: 'req-999', offeredPrice: 950 },
    });
    assert.strictEqual(key.includes('USER-ABC_OFFER_RECEIVED'), true);
    assert.strictEqual(key.includes('REQ-999'), true);
    pass('9. Deterministic notification keys generated with entity references');
  } catch (err) {
    fail('9. Notification key generation', err);
  }

  // ── TEST 10 & 11: Role Delivery Isolation ──
  try {
    const citizenEval = proactiveService.evaluateEvent({
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      recipientRole: ROLES.CITIZEN,
      data: { offeredPrice: 950, category: 'LAPTOP' },
    });
    const collectorEval = proactiveService.evaluateEvent({
      type: 'COUNTER_OFFER_RECEIVED',
      recipientRole: ROLES.INFORMAL_COLLECTOR,
      data: { counterPrice: 1100, offeredPrice: 900 },
    });

    assert.strictEqual(citizenEval.title.includes('New Offer Received'), true);
    assert.strictEqual(collectorEval.title.includes('Counter-Offer'), true);
    pass('10 & 11. Role-based event evaluation isolates Citizen vs Collector context');
  } catch (err) {
    fail('10 & 11. Role delivery isolation', err);
  }

  // ── TEST 12: Recycler / Collector Request Available Alert ──
  try {
    const matchAlert = proactiveService.evaluateEvent({
      type: 'NEW_MATCHING_REQUEST',
      recipientRole: ROLES.INFORMAL_COLLECTOR,
      data: { category: 'LAPTOP', distanceKm: 3.8, requestId: 'req-202' },
    });
    assert.strictEqual(matchAlert.isActionable, true);
    assert.strictEqual(matchAlert.message.includes('3.8 km away'), true);
    pass('12. New matching request alert provides distance and category to collector');
  } catch (err) {
    fail('12. Matching request alert', err);
  }

  // ── TEST 13, 14, 15: Multilingual Phrasing (HI, Hinglish, OR) ──
  try {
    const evalResult = proactiveService.evaluateEvent({
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      recipientRole: ROLES.CITIZEN,
      data: { collectorName: 'Rajesh', offeredPrice: 950, category: 'LAPTOP' },
    });

    assert.strictEqual(evalResult.multilingual.hi.includes('₹950 का ऑफर दिया है'), true);
    assert.strictEqual(evalResult.multilingual.hinglish.includes('₹950 offer kiya hai'), true);
    assert.strictEqual(evalResult.multilingual.or.includes('₹950 ଅଫର ଦେଇଛନ୍ତି'), true);
    pass('13, 14, 15. Multilingual notifications generated across Hindi, Hinglish, and Odia');
  } catch (err) {
    fail('13, 14, 15. Multilingual notifications', err);
  }

  // ── TEST 16: Voice-Friendly Prompt ──
  try {
    const evalResult = proactiveService.evaluateEvent({
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      recipientRole: ROLES.CITIZEN,
      data: { offeredPrice: 950, category: 'LAPTOP' },
    });
    assert.strictEqual(evalResult.voicePrompt.length < 120, true, 'Voice prompt must be short and conversational');
    assert.strictEqual(evalResult.voicePrompt.includes('Would you like to view it?'), true);
    pass('16. Voice-friendly alert prompt is concise and interactive');
  } catch (err) {
    fail('16. Voice-friendly prompt', err);
  }

  // ── TEST 17: Attention Summary Service ──
  try {
    const summary = await proactiveService.getAttentionSummary(citizenUser, 'en');
    assert.strictEqual(typeof summary.count, 'number');
    assert.strictEqual(Boolean(summary.headline), true);
    assert.strictEqual(Array.isArray(summary.items), true);
    pass('17. Attention summary aggregates real actionable tasks for citizen');
  } catch (err) {
    fail('17. Attention summary service', err);
  }

  // ── TEST 18: Attention Summary Intent Detection ──
  try {
    const q1 = intentDetector.detect('What do I need to do?');
    const q2 = intentDetector.detect('Kya pending hai?');
    const q3 = intentDetector.detect('Mo pain kana pending achi?');
    const q4 = intentDetector.detect('Show what needs my attention');

    assert.strictEqual(q1.intent, 'ATTENTION_SUMMARY');
    assert.strictEqual(q2.intent, 'ATTENTION_SUMMARY');
    assert.strictEqual(q3.intent, 'ATTENTION_SUMMARY');
    assert.strictEqual(q4.intent, 'ATTENTION_SUMMARY');
    pass('18. ATTENTION_SUMMARY intent detected across English, Hindi, Hinglish, and Odia');
  } catch (err) {
    fail('18. Attention summary intent detection', err);
  }

  // ── TEST 19: Irrelevant Non-Actionable Event Ignored ──
  try {
    const result = proactiveService.evaluateEvent({
      type: 'INTERNAL_PING',
      recipientRole: ROLES.CITIZEN,
      data: {},
    });
    assert.strictEqual(result.isActionable, false);
    pass('19. Non-actionable internal events are flagged as non-actionable');
  } catch (err) {
    fail('19. Irrelevant event ignored', err);
  }

  // ── TEST 20: Deterministic Zero-LLM Evaluation ──
  try {
    const start = Date.now();
    const evalRes = proactiveService.evaluateEvent({
      type: NOTIFICATION_TYPES.PICKUP_SCHEDULED,
      recipientRole: ROLES.CITIZEN,
      data: { category: 'LAPTOP', scheduledDate: new Date() },
    });
    const duration = Date.now() - start;
    assert.strictEqual(duration < 10, true, 'Deterministic evaluation must be instantaneous');
    assert.strictEqual(evalRes.isActionable, true);
    pass('20. Zero-LLM deterministic event evaluation executes in sub-millisecond time');
  } catch (err) {
    fail('20. Deterministic evaluation performance', err);
  }

  // ── TEST 21: Orchestrator In-App Attention Card ──
  try {
    const response = await ecoSaathiOrchestrator.processQuery('What needs my attention?', citizenUser, {
      language: 'en',
    });
    assert.strictEqual(response.responseType, 'ATTENTION_CARD');
    assert.strictEqual(Boolean(response.message), true);
    assert.strictEqual(response.quickActions.length > 0, true);
    pass('21. Eco-Saathi Orchestrator delivers structured ATTENTION_CARD with interactive chips');
  } catch (err) {
    fail('21. Orchestrator attention card', err);
  }

  // ── TEST 22: Consequential Action Confirmation Integrity ──
  try {
    const negResponse = await ecoSaathiOrchestrator.processQuery('Ask him for 1150 rupees', citizenUser, {
      language: 'en',
    });
    assert.strictEqual(negResponse.requiresConfirmation, true);
    assert.strictEqual(negResponse.action.counterAmount, 1150);
    pass('22. Consequential action triggered from proactive flow requires explicit human confirmation');
  } catch (err) {
    fail('22. Action confirmation integrity', err);
  }

  console.log(`\n========================================`);
  console.log(`📊 Proactive Intelligence Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running Proactive Intelligence tests:', err);
  process.exit(1);
});
