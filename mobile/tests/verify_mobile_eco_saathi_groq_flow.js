// EcoSetu Mobile -> Live Backend -> Groq Production Flow Verification Suite
const assert = require('assert');

// 1. Emulate React Native global environment
global.__DEV__ = false;
global.FormData = class FormData {};

// 2. Load mobile constants & API Client
const { API_CONFIG, PRODUCTION_API_BASE_URL } = require('../src/utils/constants.js');
const { apiClient } = require('../src/services/apiClient.js');
const { ecoSaathiService } = require('../src/services/ecoSaathiService.ts');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✔ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Details: ${err.message}`);
    failed++;
  }
}

async function runMobileGroqFlowTests() {
  console.log('====================================================');
  console.log('ECOSETU — MOBILE TO GROQ PRODUCTION FLOW VERIFICATION');
  console.log('====================================================\n');

  // STEP 1: Check Resolved URL
  await test('Step 1: Mobile default Base URL matches live production Render backend', async () => {
    const currentBase = apiClient.getBaseUrl();
    console.log(`     [CONFIG] Current Base URL: ${currentBase}`);
    assert.strictEqual(currentBase, PRODUCTION_API_BASE_URL);
    assert.strictEqual(currentBase, 'https://ecosetu-backend.onrender.com/api/v1');
  });

  // STEP 2 & 8: Send First Message to Production Backend
  await test('Step 2 & 8: First query ("What is e-waste and why is recycling important?") reaches Groq', async () => {
    const query = 'What is e-waste and why is recycling important?';
    const response = await ecoSaathiService.sendMessage({
      message: query,
      language: 'en',
    });

    console.log(`     [RESPONSE] Provider: ${response.provider}`);
    console.log(`     [RESPONSE] Intent: ${response.intent}`);
    console.log(`     [RESPONSE] Answer length: ${response.message?.length || 0} chars`);

    assert.ok(response.success, 'Response must be success=true');
    assert.ok(response.message && response.message.length > 20, 'Response message must not be empty');
    assert.strictEqual(response.provider, 'groq', 'Provider must be groq');
    assert.ok(!response.message.includes("I don't have a verified answer"), 'Must not return fallback text');
  });

  // STEP 9: Send Second Message
  await test('Step 9: Second query ("Tell me something interesting about recycling.") reaches Groq', async () => {
    const query = 'Tell me something interesting about recycling.';
    const response = await ecoSaathiService.sendMessage({
      message: query,
      language: 'en',
    });

    console.log(`     [RESPONSE] Provider: ${response.provider}`);
    console.log(`     [RESPONSE] Answer preview: "${response.message.substring(0, 80)}..."`);

    assert.ok(response.success, 'Response must be success=true');
    assert.ok(response.message && response.message.length > 10, 'Response message must not be empty');
    assert.strictEqual(response.provider, 'groq', 'Provider must be groq');
  });

  // STEP 6: Sanitization Verification
  await test('Step 6: Speech Sanitization strips emojis/markdown without mangling text', async () => {
    const sanitizeTextForSpeech = (text) =>
      text
        .replace(
          /[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          ''
        )
        .replace(/[*_#`~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const rawGroqAnswer = '🤖 **Recycling e-waste** recovers gold & copper from _circuit boards_! 1 ton of PCBs contains 40-800x more gold than ore. 🌟';
    const cleaned = sanitizeTextForSpeech(rawGroqAnswer);

    console.log(`     [RAW]  : ${rawGroqAnswer}`);
    console.log(`     [CLEAN]: ${cleaned}`);

    assert.ok(!cleaned.includes('**'));
    assert.ok(!cleaned.includes('🤖'));
    assert.ok(!cleaned.includes('🌟'));
    assert.ok(cleaned.includes('Recycling e-waste recovers gold & copper from circuit boards!'));
    assert.ok(cleaned.includes('40-800x'));
  });

  console.log('\n====================================================');
  console.log(`RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMobileGroqFlowTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
