// EcoSetu AI Health Diagnostics & Groq Verification Test Suite
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/11_AI_EWASTE_DETECTION.md

const assert = require('assert');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const aiService = require('../src/services/aiService');
const aiIntelligenceService = require('../src/services/ai/AIService');
const GroqProvider = require('../src/services/ai/providers/GroqProvider');
const orchestrator = require('../src/services/ecoSaathi/EcoSaathiOrchestrator');

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

async function runDiagnosticsTests() {
  console.log('====================================================');
  console.log('ECOSETU — AI & GROQ HEALTH DIAGNOSTICS TEST SUITE');
  console.log('====================================================\n');

  // ── TEST 1: GROQ_API_KEY configured ──
  await test('Test 1: GROQ_API_KEY configured returns configured=true', async () => {
    const provider = new GroqProvider({ apiKey: 'dummy_gsk_key_12345' });
    assert.strictEqual(provider.isConfigured(), true);
    assert.strictEqual(typeof provider.model, 'string');
  });

  // ── TEST 2: GROQ_API_KEY missing ──
  await test('Test 2: Missing GROQ_API_KEY returns configured=false and not_configured connectivity', async () => {
    const provider = new GroqProvider({ apiKey: '' });
    assert.strictEqual(provider.isConfigured(), false);
    const conn = await provider.checkConnectivity();
    assert.strictEqual(conn.ok, false);
    assert.strictEqual(conn.status, 'not_configured');
  });

  // ── TEST 3: Live / Successful Groq Request ──
  await test('Test 3: Successful Groq Request returns connectivity=ok', async () => {
    const liveGroq = new GroqProvider();
    if (liveGroq.isConfigured()) {
      const conn = await liveGroq.checkConnectivity({ timeoutMs: 10000 });
      assert.strictEqual(conn.ok, true);
      assert.strictEqual(conn.status, 'ok');
      assert.ok(typeof conn.latencyMs === 'number');
    } else {
      // Mock validation
      const originalFetch = global.fetch;
      try {
        global.fetch = async () => ({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
        });
        const provider = new GroqProvider({ apiKey: 'mock_key' });
        const conn = await provider.checkConnectivity();
        assert.strictEqual(conn.ok, true);
        assert.strictEqual(conn.status, 'ok');
      } finally {
        global.fetch = originalFetch;
      }
    }
  });

  // ── TEST 4: HTTP 401 / 403 Authentication Error ──
  await test('Test 4: HTTP 401/403 returns connectivity=authentication_error', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        text: async () => 'Invalid API Key',
      });
      const provider = new GroqProvider({ apiKey: 'invalid_key' });
      const conn = await provider.checkConnectivity();
      assert.strictEqual(conn.ok, false);
      assert.strictEqual(conn.status, 'authentication_error');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ── TEST 5: HTTP 429 Rate Limit ──
  await test('Test 5: HTTP 429 returns connectivity=rate_limited', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => ({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });
      const provider = new GroqProvider({ apiKey: 'rate_limited_key' });
      const conn = await provider.checkConnectivity();
      assert.strictEqual(conn.ok, false);
      assert.strictEqual(conn.status, 'rate_limited');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ── TEST 6: Request Timeout ──
  await test('Test 6: Request timeout returns connectivity=timeout', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => {
        const err = new Error('AbortError');
        err.name = 'AbortError';
        throw err;
      };
      const provider = new GroqProvider({ apiKey: 'mock_key' });
      const conn = await provider.checkConnectivity();
      assert.strictEqual(conn.ok, false);
      assert.strictEqual(conn.status, 'timeout');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ── TEST 7: Fallback Provider Available ──
  await test('Test 7: RuleFallbackProvider is available and verified', async () => {
    const diagnostics = await aiIntelligenceService.getDiagnostics({ checkConnectivity: false });
    assert.ok(diagnostics.fallback);
    assert.strictEqual(diagnostics.fallback.provider, 'RuleFallbackProvider');
    assert.strictEqual(diagnostics.fallback.available, true);
    assert.strictEqual(diagnostics.budget_mode, 'FREE_ONLY');
    assert.strictEqual(diagnostics.paid_provider_blocking, true);
  });

  // ── TEST 8: Zero API Key Leakage ──
  await test('Test 8: API key is NEVER present in JSON response', async () => {
    const composite = await aiService.getCompositeHealth({ checkConnectivity: true });
    const jsonStr = JSON.stringify(composite);

    assert.ok(!jsonStr.includes('gsk_'), 'Response must not contain gsk_ prefix');
    assert.ok(!jsonStr.includes(process.env.GROQ_API_KEY || 'MISSING_SECRET'), 'Response must not contain GROQ_API_KEY value');
    assert.ok(!jsonStr.includes(process.env.ROBOFLOW_API_KEY || 'MISSING_SECRET'), 'Response must not contain ROBOFLOW_API_KEY value');
    assert.ok(composite.eco_saathi.groq.configured !== undefined);
    assert.ok(composite.vision !== undefined);
    assert.ok(composite.status === 'ok' || composite.status === 'degraded');
  });

  // ── TEST 9: Existing Vision / Material Detection Health Preserved ──
  await test('Test 9: Existing Vision health is preserved alongside Eco-Saathi', async () => {
    const composite = await aiService.getCompositeHealth({ checkConnectivity: false });
    assert.ok(composite.vision);
    assert.strictEqual(composite.vision.model_loaded, true);
    assert.ok(typeof composite.vision.model_version === 'string');
    assert.ok(composite.eco_saathi);
    assert.strictEqual(composite.service, 'ecosetu-ai');
  });

  // ── TEST 10: Real Eco-Saathi General Question Routing ──
  await test('Test 10: Eco-Saathi general question routes to Groq', async () => {
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Diagnostics User',
      role: 'CITIZEN',
      status: 'ACTIVE',
    };

    const res = await orchestrator.processMessage(mockUser, {
      message: 'What is e-waste and why is recycling important?',
      language: 'en',
    });

    assert.ok(res.message);
    assert.strictEqual(res.intent, 'GENERAL_KNOWLEDGE');
    assert.strictEqual(res.provider, 'groq');
  });

  console.log('\n====================================================');
  console.log(`DIAGNOSTICS RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDiagnosticsTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
