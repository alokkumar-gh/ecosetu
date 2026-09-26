// EcoSetu Eco-Saathi AI Orchestrator Test Suite
// Verifies intent detection, context assembly, controlled tool routing, security boundaries, and confirmation flows

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const toolRegistry = require('../src/services/ecoSaathi/tools/toolRegistry');
const aiService = require('../src/services/ai/AIService');

let testCitizen1 = null;
let testCitizen2 = null;
let testCollector = null;
let testRequest = null;
let testOffer = null;

async function setupTestData() {
  console.log('🔧 Setting up test users and data for Eco-Saathi verification...');

  // 1. Citizen 1
  testCitizen1 = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
  if (!testCitizen1) {
    testCitizen1 = await prisma.user.create({
      data: {
        email: 'test_citizen_1@ecosetu.test',
        passwordHash: 'dummy_hash',
        name: 'Ramesh Citizen',
        role: 'CITIZEN',
        status: 'ACTIVE',
      },
    });
  }

  // 2. Citizen 2 (for cross-user security checks)
  testCitizen2 = await prisma.user.findFirst({
    where: { role: 'CITIZEN', id: { not: testCitizen1.id } },
  });
  if (!testCitizen2) {
    testCitizen2 = await prisma.user.create({
      data: {
        email: 'test_citizen_2@ecosetu.test',
        passwordHash: 'dummy_hash',
        name: 'Suresh Citizen',
        role: 'CITIZEN',
        status: 'ACTIVE',
      },
    });
  }

  // 3. Collector
  testCollector = await prisma.user.findFirst({
    where: { role: 'INFORMAL_COLLECTOR' },
    include: { collectorProfile: true },
  });

  // 4. Test Collection Request for Citizen 1
  testRequest = await prisma.collectionRequest.findFirst({
    where: { citizenId: testCitizen1.id },
    include: { pickupOffers: true },
  });

  if (!testRequest) {
    testRequest = await prisma.collectionRequest.create({
      data: {
        citizenId: testCitizen1.id,
        status: 'SUBMITTED',
        pickupAddress: 'Block A, Saheed Nagar, Bhubaneswar',
        pickupLat: 20.2961,
        pickupLng: 85.8245,
      },
      include: { pickupOffers: true },
    });
  }

  // 5. Test Offer if collector profile exists
  if (testCollector?.collectorProfile) {
    testOffer = await prisma.pickupOffer.findFirst({
      where: { collectionRequestId: testRequest.id },
    });

    if (!testOffer) {
      testOffer = await prisma.pickupOffer.create({
        data: {
          collectionRequestId: testRequest.id,
          collectorId: testCollector.collectorProfile.id,
          offeredPrice: 2850,
          status: 'PENDING',
          notes: 'Standard doorstep cash pickup',
        },
      });
    }
  }

  console.log(`✅ Test setup ready: Citizen1=${testCitizen1.id}, Citizen2=${testCitizen2.id}, Request=${testRequest.id}`);
}

async function runTests() {
  await setupTestData();

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      await fn();
      console.log(`  ✔ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- 1. CITIZEN QUERIES ---');

  // Test 1: Citizen asking pickup status
  await assertTest('Citizen asking pickup status (English)', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Where is my pickup request status?',
    });
    if (!res || res.intent !== 'PICKUP_STATUS') {
      throw new Error(`Expected intent PICKUP_STATUS, got ${res?.intent}`);
    }
    if (!res.message || typeof res.message !== 'string') {
      throw new Error('Expected message string in response');
    }
  });

  // Test 2: Citizen viewing own offers
  await assertTest('Citizen viewing received offers', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Show me the offers I received for my ewaste',
    });
    if (!res || (res.intent !== 'VIEW_OFFERS' && res.intent !== 'OFFER_COMPARISON')) {
      throw new Error(`Expected intent VIEW_OFFERS, got ${res?.intent}`);
    }
    if (!res.data || !Array.isArray(res.data.offers)) {
      throw new Error('Expected offers array in data payload');
    }
  });

  console.log('\n--- 2. MULTILINGUAL & VERNACULAR QUERIES ---');

  // Test 3: Hindi Input
  await assertTest('Hindi Input: "Mera pickup kab aayega?"', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Mera pickup kab aayega?',
      language: 'hi',
    });
    if (!res || res.intent !== 'PICKUP_STATUS') {
      throw new Error(`Expected intent PICKUP_STATUS, got ${res?.intent}`);
    }
    if (!res.message) throw new Error('Expected response message');
  });

  // Test 4: Hinglish Input
  await assertTest('Hinglish Input: "Collector ne kitna offer diya?"', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Collector ne kitna offer diya?',
      language: 'hi',
    });
    if (!res || (res.intent !== 'VIEW_OFFERS' && res.intent !== 'OFFER_COMPARISON')) {
      throw new Error(`Expected intent VIEW_OFFERS, got ${res?.intent}`);
    }
  });

  // Test 5: Unknown query
  await assertTest('Unknown question handling', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Aaj mausam kaisa hai?',
    });
    if (!res || !res.message) {
      throw new Error('Expected fallback helpful response');
    }
  });

  console.log('\n--- 3. SECURITY & AUTHORIZATION BOUNDARIES ---');

  // Test 6: Citizen attempting to access another citizen's request
  await assertTest('Security: Citizen cannot access another citizen request details', async () => {
    try {
      await toolRegistry.execute(testCitizen2, 'getPickupRequestDetails', {
        requestId: testRequest.id,
      });
      throw new Error('Security violation: Citizen 2 accessed Citizen 1 request!');
    } catch (err) {
      if (!err.message.includes('Access denied') && !err.message.includes('forbidden')) {
        throw err;
      }
    }
  });

  // Test 7: Citizen trying to execute collector-only action
  await assertTest('Security: Citizen blocked from collector-only tools', async () => {
    const permitted = toolRegistry.getPermittedTools('CITIZEN');
    const hasCollectorOnly = permitted.some((t) => t.name === 'createConsignment' || t.name === 'assignBatch');
    if (hasCollectorOnly) {
      throw new Error('Security violation: Citizen permitted collector-only tool');
    }
  });

  console.log('\n--- 4. WRITE ACTIONS & EXPLICIT CONFIRMATION ---');

  // Test 8: Accept offer confirmation intercept
  await assertTest('Accept offer triggers confirmation guardrail without silent execution', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Accept the 2850 offer',
    });
    if (!res.requiresConfirmation) {
      throw new Error('Expected requiresConfirmation: true for accept offer');
    }
    if (!res.action || res.action.type !== 'ACCEPT_OFFER') {
      throw new Error(`Expected action type ACCEPT_OFFER, got ${res.action?.type}`);
    }
    if (!res.action.offerId) {
      throw new Error('Expected offerId in action payload');
    }
  });

  // Test 9: Counter-offer negotiation confirmation intercept
  await assertTest('Negotiate counter-offer triggers confirmation guardrail', async () => {
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'Can I counter offer 3100 rupees?',
    });
    if (!res.requiresConfirmation) {
      throw new Error('Expected requiresConfirmation: true for counter offer');
    }
    if (!res.action || res.action.type !== 'SEND_COUNTER_OFFER') {
      throw new Error(`Expected action type SEND_COUNTER_OFFER, got ${res.action?.type}`);
    }
    if (res.action.counterPrice !== 3100) {
      throw new Error(`Expected counterPrice 3100, got ${res.action.counterPrice}`);
    }
  });

  console.log('\n--- 5. ERROR RESILIENCE & FALLBACK ---');

  // Test 10: Graceful fallback when invalid provider requested
  await assertTest('AI provider fallback works reliably', async () => {
    const previous = aiService.activeProviderName;
    aiService.setProvider('rule-fallback');
    const res = await orchestrator.processMessage(testCitizen1, {
      message: 'What is the price of PCB?',
    });
    if (!res || !res.message) {
      throw new Error('Fallback failed to produce response');
    }
    aiService.setProvider(previous);
  });

  console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
