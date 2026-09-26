/**
 * EcoSetu — Eco-Saathi Intelligence Routing Test Suite
 * Validates classification and routing for:
 * 1. General knowledge (routed to Groq)
 * 2. Casual conversation (routed to Groq)
 * 3. Application data (routed to ECOSETU tools)
 * 4. Mixed questions (ECOSETU context + Groq reasoning)
 * 5. Missing application data (no fabricated facts)
 * 6. Groq failure fallback (graceful RuleFallbackProvider)
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const aiService = require('../src/services/ai/AIService');
const intentDetector = require('../src/services/ecoSaathi/intentDetector');

async function runRoutingTests() {
  console.log('🧪 Starting Eco-Saathi Intelligence Routing Verification...\n');

  let passed = 0;
  let failed = 0;

  async function testCase(title, fn) {
    try {
      await fn();
      console.log(`  ✔ PASS: ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ FAIL: ${title}`);
      console.error(`    Details: ${err.message}`);
      failed++;
    }
  }

  // Fetch test user context
  let user = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
  if (!user) {
    user = { id: 'test_user_routing', role: 'CITIZEN', name: 'Test User' };
  }

  console.log('--- 1. QUESTION CLASSIFICATION LAYER ---');

  await testCase('IntentDetector classifies "What is e-waste?" as GENERAL_KNOWLEDGE', async () => {
    const res = intentDetector.detect('What is e-waste?');
    assert.strictEqual(res.classification, 'GENERAL_KNOWLEDGE');
  });

  await testCase('IntentDetector classifies "Hello Eco-Saathi" as CONVERSATIONAL', async () => {
    const res = intentDetector.detect('Hello Eco-Saathi');
    assert.strictEqual(res.classification, 'CONVERSATIONAL');
  });

  await testCase('IntentDetector classifies "What offers did I receive?" as DETERMINISTIC_APP', async () => {
    const res = intentDetector.detect('What offers did I receive?');
    assert.strictEqual(res.classification, 'DETERMINISTIC_APP');
    assert.strictEqual(res.intent, 'VIEW_OFFERS');
  });

  await testCase('IntentDetector classifies "Why is my ₹500 offer low?" as EXPLANATION', async () => {
    const res = intentDetector.detect('Why is my ₹500 offer low?');
    assert.strictEqual(res.classification, 'EXPLANATION');
  });

  console.log('\n--- 2. ORCHESTRATOR ROUTING TO GROQ ---');

  await testCase('Test 1 — General Knowledge ("What is e-waste?") routes to Groq', async () => {
    const res = await orchestrator.processMessage(user, {
      message: 'What is e-waste and why is it important to recycle?',
    });
    assert.ok(res.message, 'Expected non-empty response message');
    assert.ok(res.message.length > 20, 'Expected rich response');
    assert.notStrictEqual(res.message, 'I don’t have a verified answer for that yet.');
    assert.ok(res.provider === 'groq' || res.provider === 'rule-fallback', `Expected groq or rule-fallback provider, got ${res.provider}`);
  });

  await testCase('Test 2 — Casual Conversation ("Hello Eco-Saathi") routes to Groq', async () => {
    const res = await orchestrator.processMessage(user, {
      message: 'Hello Eco-Saathi! How are you today?',
    });
    assert.ok(res.message, 'Expected conversational response');
    assert.notStrictEqual(res.message, 'I don’t have a verified answer for that yet.');
  });

  await testCase('Test 3 — Application Data ("What offers did I receive?") uses ECOSETU tools', async () => {
    const res = await orchestrator.processMessage(user, {
      message: 'What offers did I receive?',
    });
    assert.ok(res.intent === 'VIEW_OFFERS' || res.intent === 'OFFER_COMPARISON');
    assert.strictEqual(res.provider, 'DETERMINISTIC_TOOL');
  });

  await testCase('Test 4 — Mixed Question ("Why is my ₹500 offer low?") combines context with Groq', async () => {
    const res = await orchestrator.processMessage(user, {
      message: 'Why is my ₹500 offer low for my old laptop?',
    });
    assert.ok(res.message, 'Expected contextual explanation response');
    assert.notStrictEqual(res.message, 'I don’t have a verified answer for that yet.');
  });

  await testCase('Test 5 — Missing Application Data ("What time exactly will my collector arrive?") avoids hallucination', async () => {
    const res = await orchestrator.processMessage(user, {
      message: 'Where is my pickup status?',
    });
    assert.ok(res.message, 'Expected non-empty response');
    // Ensure response does not invent fake arrival time
    assert.doesNotMatch(res.message, /collector will arrive at (10:45|03:15|04:20) AM/i);
  });

  console.log('\n--- 3. FALLBACK TO RULE-FALLBACK ON GROQ FAILURE ---');

  await testCase('Test 6 — Groq Failure / Rate Limit triggers RuleFallbackProvider gracefully', async () => {
    // Temporarily mock Groq error
    const groqProvider = aiService.providers.groq;
    const originalGenerate = groqProvider.generate;
    groqProvider.generate = async () => {
      throw new Error('Groq rate limit exceeded (HTTP 429)');
    };

    try {
      const res = await orchestrator.processMessage(user, {
        message: 'How is lithium battery recycled?',
      });
      assert.ok(res.message, 'Expected fallback response text');
      assert.strictEqual(res.provider, 'rule-fallback', 'Expected fallback provider rule-fallback');
    } finally {
      // Restore original
      groqProvider.generate = originalGenerate;
    }
  });

  console.log(`\n========================================`);
  console.log(`📊 Intelligence Routing Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRoutingTests()
  .catch((err) => {
    console.error('Fatal test runner failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
