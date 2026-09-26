/**
 * EcoSetu — Comprehensive End-to-End Test Suite
 * Validates:
 * 1. Groq external AI intelligence routing & fallback
 * 2. Complete Pickup Flow (Citizen -> Database -> EcoMatch -> Collector Feed -> Notification -> Offer -> Citizen -> Eco-Saathi)
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const aiService = require('../src/services/ai/AIService');
const requestService = require('../src/services/requestService');
const ecoMatchService = require('../src/services/matching/EcoMatchService');
const notificationService = require('../src/services/notificationService');
const { ROLES, REQUEST_STATUS, ITEM_STATUS, EWASTE_CATEGORIES, ITEM_CONDITIONS } = require('../src/utils/constants');

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('ECOSETU CRITICAL FLOW END-TO-END VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function step(name, fn) {
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Details: ${err.message}`);
      failed++;
    }
  }

  // --- PART 1: GROQ INTELLIGENCE ROUTING ---
  console.log('\n--- PART 1: GROQ INTELLIGENCE & ECO-SAATHI ROUTING ---');

  await step('1.1 GroqProvider is configured and reaches Groq API', async () => {
    const groq = aiService.providers.groq;
    assert.strictEqual(groq.isConfigured(), true, 'GroqProvider should be configured');
    const res = await groq.generate({ prompt: 'What is e-waste in 1 sentence?' });
    assert.ok(res.text, 'Expected non-empty text response from Groq');
    assert.ok(res.text.length > 10, 'Expected valid response content');
  });

  await step('1.2 General knowledge question ("What is e-waste?") routes to Groq', async () => {
    const actor = { id: '00000000-0000-0000-0000-000000000001', role: ROLES.CITIZEN, name: 'Aarav' };
    const res = await orchestrator.processMessage(actor, {
      message: 'What is e-waste and why is it dangerous?',
      language: 'en',
    });
    assert.ok(res.message, 'Expected answer message');
    assert.ok(res.message.length > 20, 'Expected rich answer');
    assert.notStrictEqual(res.message, "I don't have a verified answer for that yet.");
    assert.strictEqual(res.provider, 'groq');
  });

  await step('1.3 Conversational greeting ("Hello Saathi") routes to Groq', async () => {
    const actor = { id: '00000000-0000-0000-0000-000000000001', role: ROLES.CITIZEN, name: 'Aarav' };
    const res = await orchestrator.processMessage(actor, {
      message: 'Hello Saathi! How are you today?',
      language: 'en',
    });
    assert.ok(res.message, 'Expected conversational response');
    assert.notStrictEqual(res.message, "I don't have a verified answer for that yet.");
    assert.strictEqual(res.provider, 'groq');
  });

  await step('1.4 Groq error / 429 rate limit triggers RuleFallbackProvider gracefully', async () => {
    const groqProvider = aiService.providers.groq;
    const originalGenerate = groqProvider.generate;
    groqProvider.generate = async () => {
      throw new Error('Groq rate limit exceeded (HTTP 429)');
    };

    try {
      const actor = { id: '00000000-0000-0000-0000-000000000001', role: ROLES.CITIZEN, name: 'Aarav' };
      const res = await orchestrator.processMessage(actor, {
        message: 'How is copper recovered from e-waste?',
        language: 'en',
      });
      assert.ok(res.message, 'Expected fallback response');
      assert.strictEqual(res.provider, 'rule-fallback');
    } finally {
      groqProvider.generate = originalGenerate;
    }
  });

  // --- PART 2: PICKUP FLOW END-TO-END ---
  console.log('\n--- PART 2: COMPLETE PICKUP BROADCAST & DELIVERY FLOW ---');

  // STEP 1: Create Citizen A
  const citizenId = '11111111-2222-3333-4444-555555555551';
  const citizenEmail = `citizen_e2e_${Date.now()}@ecosetu.org`;
  let citizenUser;
  await step('STEP 1: Create Citizen A in database', async () => {
    // Clean any prior run artifacts
    await prisma.pickupOffer.deleteMany({ where: { collectorId: '11111111-2222-3333-4444-555555555552' } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId: { in: [citizenId, '11111111-2222-3333-4444-555555555552'] } } }).catch(() => {});
    await prisma.collectionRequest.deleteMany({ where: { citizenId } }).catch(() => {});
    await prisma.ewasteItem.deleteMany({ where: { citizenId } }).catch(() => {});

    citizenUser = await prisma.user.upsert({
      where: { id: citizenId },
      update: { email: citizenEmail, name: 'Citizen A', role: ROLES.CITIZEN, status: 'ACTIVE' },
      create: {
        id: citizenId,
        email: citizenEmail,
        passwordHash: 'dummy_hash_for_testing',
        name: 'Citizen A',
        role: ROLES.CITIZEN,
        status: 'ACTIVE',
        phone: '+919999999991',
      },
    });
    assert.ok(citizenUser.id);
  });

  // STEP 2: Create eligible Collector B
  const collectorUserId = '11111111-2222-3333-4444-555555555552';
  const collectorEmail = `collector_e2e_${Date.now()}@ecosetu.org`;
  let collectorUser;
  let collectorProfile;
  await step('STEP 2: Create eligible Collector B with Bhubaneswar coordinates', async () => {
    collectorUser = await prisma.user.upsert({
      where: { id: collectorUserId },
      update: { email: collectorEmail, name: 'Collector B', role: ROLES.INFORMAL_COLLECTOR, status: 'ACTIVE' },
      create: {
        id: collectorUserId,
        email: collectorEmail,
        passwordHash: 'dummy_hash_for_testing',
        name: 'Collector B',
        role: ROLES.INFORMAL_COLLECTOR,
        status: 'ACTIVE',
        phone: '+919999999992',
      },
    });

    collectorProfile = await prisma.collectorProfile.upsert({
      where: { userId: collectorUserId },
      update: {
        isAvailable: true,
        serviceAreaLat: 20.2961,
        serviceAreaLng: 85.8245,
        serviceRadiusKm: 15.0,
        city: 'Bhubaneswar',
      },
      create: {
        userId: collectorUserId,
        isAvailable: true,
        serviceAreaLat: 20.2961,
        serviceAreaLng: 85.8245,
        serviceRadiusKm: 15.0,
        city: 'Bhubaneswar',
      },
    });
    assert.ok(collectorProfile.id);
  });

  // STEP 3: Create E-Waste Item
  let ewasteItem;
  const testImageUrl = 'https://storage.ecosetu.org/uploads/test_phone_e2e.jpg';
  await step('STEP 3: Create E-Waste Item (MOBILE_PHONE, WORKING, imageUrl)', async () => {
    ewasteItem = await prisma.ewasteItem.create({
      data: {
        citizenId: citizenUser.id,
        category: EWASTE_CATEGORIES.MOBILE_PHONE,
        condition: ITEM_CONDITIONS.WORKING,
        estimatedWeightKg: 0.25,
        imageUrl: testImageUrl,
        description: 'Old Android smartphone in working condition',
        status: ITEM_STATUS.SUBMITTED,
      },
    });
    assert.ok(ewasteItem.id);
    assert.strictEqual(ewasteItem.imageUrl, testImageUrl);
  });

  // STEP 4: Submit pickup request
  let createdRequest;
  await step('STEP 4: Submit pickup request via requestService.createRequest (autoSubmit=true)', async () => {
    createdRequest = await requestService.createRequest(citizenUser.id, {
      itemIds: [ewasteItem.id],
      pickupAddress: 'Plot 42, Saheed Nagar, Bhubaneswar, Odisha',
      pickupLat: 20.2980,
      pickupLng: 85.8260,
      city: 'Bhubaneswar',
      district: 'Khordha',
      state: 'Odisha',
      pincode: '751007',
      addressType: 'HOME',
      autoSubmit: true,
    });
    assert.ok(createdRequest.id);
  });

  // STEP 5: Verify database record
  await step('STEP 5: Verify database record status is SUBMITTED and item linked', async () => {
    const dbReq = await prisma.collectionRequest.findUnique({
      where: { id: createdRequest.id },
      include: { ewasteItems: true },
    });
    assert.strictEqual(dbReq.status, REQUEST_STATUS.SUBMITTED);
    assert.strictEqual(dbReq.ewasteItems.length, 1);
    assert.strictEqual(dbReq.ewasteItems[0].id, ewasteItem.id);
    assert.strictEqual(dbReq.ewasteItems[0].imageUrl, testImageUrl);
  });

  // STEP 6: Run EcoMatch
  await step('STEP 6: Verify EcoMatch identifies Collector B as eligible', async () => {
    const dbReq = await prisma.collectionRequest.findUnique({
      where: { id: createdRequest.id },
      include: { ewasteItems: true },
    });
    const eligibility = ecoMatchService.checkEligibility(collectorProfile, dbReq);
    assert.strictEqual(eligibility.eligible, true, `Expected eligible, got blockedReason: ${eligibility.blockedReason}`);
    assert.ok(eligibility.distanceKm !== null, 'Distance should be computed');
    assert.ok(eligibility.distanceKm <= 5.0, `Distance should be <= 5km, got ${eligibility.distanceKm}`);
  });

  // STEP 7: Verify collector feed
  let availableRequests;
  await step('STEP 7: Collector B feed contains the submitted request', async () => {
    const feed = await requestService.listAvailableRequests(collectorUser, {
      lat: 20.2961,
      lng: 85.8245,
      limit: 20,
    });
    assert.ok(Array.isArray(feed.requests), 'Feed should return requests array');
    const found = feed.requests.find((r) => r.id === createdRequest.id);
    assert.ok(found, `Expected request #${createdRequest.id} in collector feed`);
    availableRequests = feed.requests;
  });

  // STEP 8: Verify image visibility in collector feed
  await step('STEP 8: Collector B receives citizen-uploaded image URL in feed item', async () => {
    const reqInFeed = availableRequests.find((r) => r.id === createdRequest.id);
    assert.ok(reqInFeed.ewasteItems && reqInFeed.ewasteItems.length > 0, 'Items should be included in feed');
    assert.strictEqual(reqInFeed.ewasteItems[0].imageUrl, testImageUrl, 'Image URL must match citizen upload');
  });

  // STEP 9: Verify notification
  await step('STEP 9: Collector B has received REQUEST_AVAILABLE notification', async () => {
    const notifs = await notificationService.listNotifications(collectorUserId, { limit: 10 });
    assert.ok(notifs.notifications.length > 0, 'Collector should have notifications');
    const reqNotif = notifs.notifications.find(
      (n) => n.referenceId === createdRequest.id || n.message.includes('pickup request')
    );
    assert.ok(reqNotif, 'Expected notification for the created request');
  });

  // STEP 10: Collector B submits an offer
  let submittedOffer;
  await step('STEP 10: Collector B submits an offer (₹850)', async () => {
    submittedOffer = await requestService.submitOffer(collectorUserId, createdRequest.id, {
      offeredPrice: 850,
      notes: 'I can pick this up tomorrow afternoon.',
    });
    assert.ok(submittedOffer.id);
    assert.strictEqual(parseFloat(submittedOffer.offeredPrice), 850);
  });

  // STEP 11: Citizen sees the offer
  await step('STEP 11: Citizen A sees the submitted offer from Collector B', async () => {
    const offersRes = await requestService.listOffers(citizenUser, createdRequest.id);
    assert.ok(Array.isArray(offersRes.offers), 'Offers should be an array');
    assert.strictEqual(offersRes.offers.length, 1);
    assert.strictEqual(offersRes.offers[0].id, submittedOffer.id);
    assert.strictEqual(parseFloat(offersRes.offers[0].offeredPrice), 850);
  });

  // STEP 12: Eco-Saathi Assistant verification
  await step('STEP 12.1: Citizen Eco-Saathi answers "What offers did I receive?" with real offer data', async () => {
    const res = await orchestrator.processMessage(citizenUser, {
      message: 'What offers did I receive?',
      language: 'en',
    });
    assert.ok(res.message, 'Expected response message');
    assert.strictEqual(res.intent, 'VIEW_OFFERS');
    assert.strictEqual(res.provider, 'DETERMINISTIC_TOOL');
    assert.ok(
      res.message.includes('850') ||
      res.data?.offers?.some((o) => o.offeredPrice === 850 || o.price === 850 || (o.formattedPrice && o.formattedPrice.includes('850'))),
      'Expected offer amount 850 in response or data'
    );
  });

  await step('STEP 12.2: Collector Eco-Saathi answers "What new pickup requests do I have?" with feed data', async () => {
    const res = await orchestrator.processMessage(collectorUser, {
      message: 'What new pickup requests do I have in my area?',
      language: 'en',
    });
    assert.ok(res.message, 'Expected response message');
    assert.strictEqual(res.intent, 'VIEW_MATCHING_REQUESTS');
    assert.strictEqual(res.type, 'COLLECTOR_FEED');
    assert.ok(res.data?.requests?.length > 0, 'Expected at least 1 matching request');
  });

  console.log('\n====================================================');
  console.log(`FINAL E2E RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndTests()
  .catch((err) => {
    console.error('Fatal test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
