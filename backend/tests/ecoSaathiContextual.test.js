/**
 * EcoSetu — Eco-Saathi Contextual Intelligence Test Suite
 * Tests all 14 scenarios required for context-aware, state-grounded AI interaction.
 */

const assert = require('assert');
const prisma = require('../src/config/database');
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const contextBuilder = require('../src/services/ecoSaathi/contextBuilder');
const offerAnalyzer = require('../src/services/ecoSaathi/offerAnalyzer');
const priceExplainer = require('../src/services/ecoSaathi/priceExplainer');
const { ROLES, REQUEST_STATUS } = require('../src/utils/constants');

async function runContextualTests() {
  console.log('🧪 Starting Eco-Saathi Contextual Intelligence Test Suite...\n');

  let citizen1, citizen2, collectorUser, collectorProfile, testRequest, offer1, offer2, offer3;

  try {
    // 1. Setup Test Users
    citizen1 = await prisma.user.findFirst({ where: { role: ROLES.CITIZEN } });
    citizen2 = await prisma.user.findFirst({
      where: { role: ROLES.CITIZEN, id: { not: citizen1.id } },
    });

    let collectors = await prisma.collectorProfile.findMany({
      include: { user: true },
      take: 3,
    });

    // Ensure we have at least 3 collectors
    while (collectors.length < 3) {
      const u = await prisma.user.create({
        data: {
          email: `test_collector_${Date.now()}_${collectors.length}@ecosetu.test`,
          passwordHash: 'dummy',
          name: `Collector ${collectors.length + 1}`,
          role: ROLES.INFORMAL_COLLECTOR,
          status: 'ACTIVE',
        },
      });
      const prof = await prisma.collectorProfile.create({
        data: {
          userId: u.id,
          serviceArea: 'Rourkela',
          city: 'Rourkela',
          state: 'Odisha',
          pincode: '769002',
          serviceAreaLat: 22.25 + collectors.length * 0.01,
          serviceAreaLng: 84.87 + collectors.length * 0.01,
        },
        include: { user: true },
      });
      collectors.push(prof);
    }

    // 2. Setup Active Request with multiple offers
    testRequest = await prisma.collectionRequest.create({
      data: {
        citizenId: citizen1.id,
        status: REQUEST_STATUS.SUBMITTED,
        pickupAddress: 'Sector 5, Rourkela, Odisha 769002',
        pickupLat: 22.253,
        pickupLng: 84.878,
        ewasteItems: {
          create: [
            {
              citizenId: citizen1.id,
              category: 'LAPTOP',
              condition: 'DAMAGED',
              estimatedWeightKg: 2.5,
            },
          ],
        },
      },
      include: { ewasteItems: true },
    });

    // Offer 1: ₹850
    offer1 = await prisma.pickupOffer.create({
      data: {
        collectionRequestId: testRequest.id,
        collectorId: collectors[0].id,
        offeredPrice: 850,
        status: 'PENDING',
        notes: 'Can pick up today',
      },
    });

    // Offer 2: ₹1050 (Highest)
    offer2 = await prisma.pickupOffer.create({
      data: {
        collectionRequestId: testRequest.id,
        collectorId: collectors[1].id,
        offeredPrice: 1050,
        status: 'PENDING',
        notes: 'Highest price offer',
      },
    });

    // Offer 3: ₹950
    offer3 = await prisma.pickupOffer.create({
      data: {
        collectionRequestId: testRequest.id,
        collectorId: collectors[2].id,
        offeredPrice: 950,
        status: 'PENDING',
        notes: 'Standard market rate',
      },
    });

    console.log(`✅ Test fixture created: Request #${testRequest.id.substring(0, 8)} with 3 offers (₹850, ₹1050, ₹950)\n`);

    let passed = 0;
    let failed = 0;

    function record(name, condition) {
      if (condition) {
        console.log(`  ✔ PASS: ${name}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${name}`);
        failed++;
      }
    }

    // --- TEST 1: User asks "what next?" on an offers screen ---
    console.log('--- TEST 1: "What Next?" Intelligence ---');
    const res1 = await orchestrator.processQuery(
      citizen1,
      'What happens next?',
      { currentScreen: 'CollectorOffers', requestId: testRequest.id }
    );
    record(
      'User asks "what next?" and receives real request state reasoning',
      res1.intent === 'WHAT_NEXT' &&
      res1.type === 'STATUS_CARD' &&
      res1.message.includes('collector offer') &&
      res1.quickActions.length > 0
    );

    // --- TEST 2: User asks "which offer is highest?" ---
    console.log('\n--- TEST 2: Smart Offer Analysis (Highest) ---');
    const res2 = await orchestrator.processQuery(
      citizen1,
      'Which one gave me the most?',
      { requestId: testRequest.id }
    );
    record(
      'User asks "which offer is highest?" and receives factual comparison (₹1,050)',
      res2.intent === 'OFFER_COMPARISON' &&
      res2.type === 'OFFER_COMPARISON' &&
      res2.data.highestOffer.price === 1050
    );

    // --- TEST 3: User asks "which collector is closest?" ---
    console.log('\n--- TEST 3: Smart Offer Analysis (Closest) ---');
    const res3 = await orchestrator.processQuery(
      citizen1,
      'Which collector is closest to me?',
      { requestId: testRequest.id }
    );
    record(
      'User asks "which collector is closest?" and gets structured comparison',
      res3.intent === 'OFFER_COMPARISON' &&
      res3.data.offers.length === 3
    );

    // --- TEST 4: User asks price explanation ---
    console.log('\n--- TEST 4: Grounded Price Explanation ---');
    const res4 = await orchestrator.processQuery(
      citizen1,
      'Why is the price so low?',
      { requestId: testRequest.id }
    );
    record(
      'User asks price explanation and receives category & condition baseline breakdown',
      res4.intent === 'PRICE_EXPLANATION' &&
      res4.data.hasData === true &&
      res4.message.includes('DAMAGED')
    );

    // --- TEST 5: User asks in Hindi ---
    console.log('\n--- TEST 5: Hindi Vernacular State Inquiry ---');
    const res5 = await orchestrator.processQuery(
      citizen1,
      'Mera pickup kaha tak pahucha?',
      { language: 'hi', requestId: testRequest.id }
    );
    record(
      'User asks in Hindi ("Mera pickup kaha tak pahucha?") and receives contextual response',
      res5.intent === 'PICKUP_STATUS' || res5.intent === 'TRACEABILITY_EXPLANATION'
    );

    // --- TEST 6: User asks in Hinglish ---
    console.log('\n--- TEST 6: Hinglish Vernacular Offer Inquiry ---');
    const res6 = await orchestrator.processQuery(
      citizen1,
      'Collector ne kitna offer diya?',
      { language: 'hi', requestId: testRequest.id }
    );
    record(
      'User asks in Hinglish ("Collector ne kitna offer diya?") and gets received offers summary',
      res6.intent === 'VIEW_OFFERS' || res6.intent === 'OFFER_COMPARISON'
    );

    // --- TEST 7: Conversational Follow-up ("what about the second one?") ---
    console.log('\n--- TEST 7: Conversational Follow-Up ---');
    const res7 = await orchestrator.processQuery(
      citizen1,
      'What about the second one?',
      { requestId: testRequest.id }
    );
    record(
      'Follow-up ("What about the second one?") resolves 2nd offer reference without re-asking',
      res7.intent === 'OFFER_COMPARISON' &&
      res7.data.selectedOffer !== undefined
    );

    // --- TEST 8: Security: Citizen asks about another citizen request ---
    console.log('\n--- TEST 8: Security Isolation (Cross-User Request) ---');
    const contextCitizen2 = await contextBuilder.build(citizen2, {
      requestId: testRequest.id, // citizen2 attempting to inject citizen1's request
    });
    record(
      'Security: Unauthorized citizen cannot inject another citizen request into context',
      contextCitizen2.activeRequest === null || contextCitizen2.activeRequest.id !== testRequest.id
    );

    // --- TEST 9: Security: Citizen asks collector-only information ---
    console.log('\n--- TEST 9: Security Isolation (Collector-Only Info) ---');
    const res9 = await orchestrator.processQuery(
      citizen1,
      'Show my collector dashboard and lots',
      {}
    );
    record(
      'Security: Citizen cannot access collector-only private management tools',
      !res9.message.includes('collector profile')
    );

    // --- TEST 10: Negotiation Counter-Offer requires explicit confirmation ---
    console.log('\n--- TEST 10: Negotiation Confirmation Guardrail ---');
    const res10 = await orchestrator.processQuery(
      citizen1,
      'Ask him for 1100 rupees',
      { requestId: testRequest.id }
    );
    record(
      'Negotiation counter-offer requires confirmation guardrail with action payload',
      res10.intent === 'NEGOTIATION' &&
      res10.requiresConfirmation === true &&
      (res10.action.type === 'COUNTER_OFFER' || res10.action.type === 'SEND_COUNTER_OFFER') &&
      res10.action.counterAmount === 1100
    );

    // --- TEST 11: Current screen context is correctly passed and used ---
    console.log('\n--- TEST 11: Current Screen Context Awareness ---');
    const res11 = await orchestrator.processQuery(
      citizen1,
      'next',
      { currentScreen: 'CitizenPickupDetails', requestId: testRequest.id }
    );
    record(
      'Current screen context boosts intent and synthesizes screen-specific guidance',
      res11.intent === 'WHAT_NEXT' &&
      res11.context.currentScreen === 'CitizenPickupDetails'
    );

    // --- TEST 12: Stale/invalid request ID rejected gracefully ---
    console.log('\n--- TEST 12: Invalid Request ID Graceful Degradation ---');
    const res12 = await orchestrator.processQuery(
      citizen1,
      'What happens next?',
      { requestId: '00000000-0000-0000-0000-000000000000' }
    );
    record(
      'Stale/invalid request ID falls back gracefully without unhandled crash',
      res12.type !== 'ERROR' && res12.message.length > 0
    );

    // --- TEST 13: E-waste Category & Garbage Education ---
    console.log('\n--- TEST 13: E-Waste Education & Guidelines ---');
    const res13 = await orchestrator.processQuery(
      citizen1,
      'Why shouldn’t I throw electronics in normal garbage?',
      {}
    );
    record(
      'E-waste education answers hazard questions concisely',
      res13.intent === 'E_WASTE_CATEGORY' &&
      res13.message.includes('hazardous')
    );

    // --- TEST 14: Confirmed Action Execution ---
    console.log('\n--- TEST 14: Confirmed Action Execution ---');
    const res14 = await orchestrator.executeConfirmedAction(
      citizen1,
      {
        type: 'COUNTER_OFFER',
        offerId: offer1.id,
        counterAmount: 1100,
      },
      true
    );
    record(
      'Explicit confirmed write action executes existing business logic securely',
      res14.success === true &&
      res14.message.includes('Counter-offer')
    );

    console.log(`\n========================================`);
    console.log(`📊 Final Contextual Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  } finally {
    // Cleanup fixtures
    try {
      if (offer1) await prisma.pickupOffer.deleteMany({ where: { collectionRequestId: testRequest.id } });
      if (testRequest) {
        await prisma.ewasteItem.deleteMany({ where: { collectionRequestId: testRequest.id } });
        await prisma.collectionRequest.delete({ where: { id: testRequest.id } });
      }
    } catch (_) {}
    await prisma.$disconnect();
  }
}

runContextualTests();
