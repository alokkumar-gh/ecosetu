/**
 * EcoSetu — Groq External AI Intelligence & Safety Test Suite
 * Tests:
 * 1. GroqProvider configuration and payload construction
 * 2. AIService provider resolution with AI_BUDGET_MODE=FREE_ONLY
 * 3. Graceful fallback on HTTP 429, timeout, network failure
 * 4. TTS text sanitization (stripping asterisks, hashes, backticks, bullets, links)
 * 5. Security & Zero API key leakage
 * 6. Deterministic intelligence authority & system prompt constraints
 */

const assert = require('assert');
const GroqProvider = require('../src/services/ai/providers/GroqProvider');
const RuleFallbackProvider = require('../src/services/ai/providers/RuleFallbackProvider');
const aiService = require('../src/services/ai/AIService');
const { cleanTextForTTS } = require('../src/utils/ttsSanitizer');
const contextBuilder = require('../src/services/ecoSaathi/contextBuilder');
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');
const { ROLES } = require('../src/utils/constants');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('ECOSETU — Groq AI Intelligence & Safety Test Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: TTS TEXT SANITIZATION
  // ----------------------------------------------------
  console.log('--- 1. TTS Markdown & Speech Sanitization ---');

  runTest('cleanTextForTTS: removes double asterisks (**hello** -> hello)', () => {
    const input = '**hello**';
    const result = cleanTextForTTS(input);
    assert.strictEqual(result, 'hello');
  });

  runTest('cleanTextForTTS: removes triple asterisks (***hello*** -> hello)', () => {
    const input = '***hello***';
    const result = cleanTextForTTS(input);
    assert.strictEqual(result, 'hello');
  });

  runTest('cleanTextForTTS: removes header hashes (# Pickup Status -> Pickup Status)', () => {
    const input = '# Pickup Status';
    const result = cleanTextForTTS(input);
    assert.strictEqual(result, 'Pickup Status');
  });

  runTest('cleanTextForTTS: cleans formatted offers (**Your offer is ₹500** -> Your offer is ₹500)', () => {
    const input = '**Your offer is ₹500**';
    const result = cleanTextForTTS(input);
    assert.strictEqual(result, 'Your offer is ₹500');
  });

  runTest('cleanTextForTTS: removes markdown links ([View Details](https://example.com) -> View Details)', () => {
    const input = 'Click [View Details](https://example.com) for more information.';
    const result = cleanTextForTTS(input);
    assert.strictEqual(result, 'Click View Details for more information.');
  });

  runTest('cleanTextForTTS: removes inline backticks (`code` -> code)', () => {
    const input = 'Use the `confirm` command to proceed.';
    const result = cleanTextForTTS(input);
    assert.strictEqual(result, 'Use the confirm command to proceed.');
  });

  runTest('cleanTextForTTS: cleans bullet points and lists', () => {
    const input = 'Next steps:\n- Check price\n- Schedule pickup';
    const result = cleanTextForTTS(input);
    assert(result.includes('Check price') && result.includes('Schedule pickup'));
    assert(!result.includes('- '));
  });

  // ----------------------------------------------------
  // SECTION 2: GROQ PROVIDER INITIALIZATION & CONFIGURATION
  // ----------------------------------------------------
  console.log('\n--- 2. Groq Provider Initialization & Config ---');

  runTest('GroqProvider: reports unconfigured without API key', () => {
    const provider = new GroqProvider({ apiKey: '' });
    assert.strictEqual(provider.isConfigured(), false);
  });

  runTest('GroqProvider: reports configured when API key is provided', () => {
    const provider = new GroqProvider({ apiKey: 'gsk_test_mock_key_12345' });
    assert.strictEqual(provider.isConfigured(), true);
    assert.strictEqual(provider.name, 'groq');
    assert(typeof provider.model === 'string' && provider.model.length > 0);
  });

  await runAsyncTest('GroqProvider: throws informative error if generate() is called unconfigured', async () => {
    const provider = new GroqProvider({ apiKey: '' });
    let errorThrown = false;
    try {
      await provider.generate({ prompt: 'Hello' });
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('Groq API key is not configured'));
    }
    assert.strictEqual(errorThrown, true);
  });

  // ----------------------------------------------------
  // SECTION 3: AI BUDGET MODE & PROVIDER RESOLUTION
  // ----------------------------------------------------
  console.log('\n--- 3. ₹0 Budget Mode & Provider Selection ---');

  runTest('AIService: AI_BUDGET_MODE=FREE_ONLY disallows paid providers (openai)', () => {
    process.env.AI_BUDGET_MODE = 'FREE_ONLY';
    let rejected = false;
    try {
      aiService.setProvider('openai');
    } catch (err) {
      rejected = true;
      assert(err.message.includes('FREE_ONLY'));
    }
    assert.strictEqual(rejected, true);
  });

  runTest('AIService: allows selecting groq or rule-fallback in FREE_ONLY mode', () => {
    process.env.AI_BUDGET_MODE = 'FREE_ONLY';
    aiService.setProvider('rule-fallback');
    assert.strictEqual(aiService.activeProviderName, 'rule-fallback');

    aiService.setProvider('groq');
    assert.strictEqual(aiService.activeProviderName, 'groq');
  });

  // ----------------------------------------------------
  // SECTION 4: RESILIENCE & ERROR FALLBACK
  // ----------------------------------------------------
  console.log('\n--- 4. Resilience & Graceful Fallback ---');

  await runAsyncTest('AIService: Falls back to rule-fallback when Groq fails (e.g. 429 or timeout)', async () => {
    // Mock GroqProvider throwing 429
    const failingGroq = new GroqProvider({ apiKey: 'gsk_dummy' });
    failingGroq.generate = async () => {
      throw new Error('Groq rate limit exceeded (HTTP 429)');
    };

    aiService.providers.groq = failingGroq;
    aiService.setProvider('groq');

    const result = await aiService.generate({
      prompt: 'mera pickup kahan hai?',
    });

    assert(result !== null);
    assert.strictEqual(result.provider, 'rule-fallback');
    assert(typeof result.text === 'string' && result.text.length > 0);
    // User should never see raw 429 error text in response text
    assert(!result.text.includes('HTTP 429'));
  });

  // ----------------------------------------------------
  // SECTION 5: SECURITY & ZERO SECRET EXPOSURE
  // ----------------------------------------------------
  console.log('\n--- 5. Security & Key Isolation ---');

  await runAsyncTest('Eco-Saathi: response payload never leaks GROQ_API_KEY or internal secrets', async () => {
    const actor = { id: '00000000-0000-0000-0000-000000000001', role: ROLES.CITIZEN, name: 'Aarav' };
    const response = await orchestrator.processMessage(actor, {
      message: 'bhai pickup status batao',
      language: 'hi',
    });

    const stringified = JSON.stringify(response);
    assert(!stringified.includes('gsk_'));
    assert(!stringified.includes('GROQ_API_KEY'));
    assert(!stringified.includes('Bearer'));
    assert.strictEqual(response.requiresConfirmation, false);
    assert(response.cleanSpeechText !== undefined);
  });

  // ----------------------------------------------------
  // SECTION 6: SYSTEM PROMPT & DETERMINISTIC AUTHORITY
  // ----------------------------------------------------
  console.log('\n--- 6. System Prompt & Authoritative Data Rules ---');

  runTest('contextBuilder: toSystemPrompt enforces zero-fabrication and authoritative source rules', () => {
    const mockContext = {
      user: { role: 'CITIZEN', name: 'Rohan' },
      language: 'hi',
      currentScreen: 'REQUEST_STATUS',
      activeRequest: {
        shortId: 'REQ-101',
        status: 'SUBMITTED',
        items: [{ category: 'LAPTOP', condition: 'WORKING' }],
        offersCount: 2,
      },
      currentOffers: [
        { collectorName: 'Ramesh', formattedPrice: '₹1,200', status: 'PENDING' },
      ],
    };

    const sysPrompt = contextBuilder.toSystemPrompt(mockContext);

    assert(sysPrompt.includes('Eco-Saathi'));
    assert(sysPrompt.includes('Zero Fabrication'));
    assert(sysPrompt.includes('Authoritative Data'));
    assert(sysPrompt.includes('Human Confirmation'));
    assert(sysPrompt.includes('TTS Compatibility'));
    assert(sysPrompt.includes('REQ-101'));
    assert(sysPrompt.includes('₹1,200'));
  });

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
