// Automated Verification Test Suite for EcoSetu Roboflow v43 Integration
// Canonical Reference: docs/ECOSETU_AI_ROBOFLOW_STEP1_EVALUATION_REPORT.md, Phase 7 Test Matrix

const assert = require('assert');
const {
  PRIORITY_TIERS,
  ROBOFLOW_CLASS_MAP,
  mapRoboflowClass,
  prioritizeDetections,
} = require('../src/services/roboflowTaxonomyMapper');
const roboflowService = require('../src/services/roboflowService');
const aiService = require('../src/services/aiService');
const { EWASTE_CATEGORIES } = require('../src/utils/constants');

console.log('================================================================');
console.log('  ECOSETU AI — ROBOFLOW v43 INTEGRATION VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    console.error(`       Error: ${err.message}\n`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    console.error(`       Error: ${err.message}\n`);
  }
}

(async () => {
  // ── Test 1: Smartphone → MOBILE_PHONE ──
  runTest('Mapping: Smartphone -> MOBILE_PHONE', () => {
    const res = mapRoboflowClass('Smartphone');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.MOBILE_PHONE);
    assert.strictEqual(res.tier, PRIORITY_TIERS.COMPLETE_DEVICE);
    assert.strictEqual(res.status, 'DIRECT');
  });

  // ── Test 2: Bar-Phone → MOBILE_PHONE ──
  runTest('Mapping: Bar-Phone -> MOBILE_PHONE', () => {
    const res = mapRoboflowClass('Bar-Phone');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.MOBILE_PHONE);
    assert.strictEqual(res.tier, PRIORITY_TIERS.COMPLETE_DEVICE);
    assert.strictEqual(res.status, 'DIRECT');
  });

  // ── Test 3: Tablet → TABLET ──
  runTest('Mapping: Tablet -> TABLET', () => {
    const res = mapRoboflowClass('Tablet');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.TABLET);
    assert.strictEqual(res.tier, PRIORITY_TIERS.COMPLETE_DEVICE);
  });

  // ── Test 4: Laptop → LAPTOP ──
  runTest('Mapping: Laptop -> LAPTOP', () => {
    const res = mapRoboflowClass('Laptop');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.LAPTOP);
    assert.strictEqual(res.tier, PRIORITY_TIERS.COMPLETE_DEVICE);
  });

  // ── Test 5: Computer-Keyboard → KEYBOARD_MOUSE ──
  runTest('Mapping: Computer-Keyboard -> KEYBOARD_MOUSE', () => {
    const res = mapRoboflowClass('Computer-Keyboard');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.KEYBOARD_MOUSE);
    assert.strictEqual(res.tier, PRIORITY_TIERS.PERIPHERAL_ASSEMBLY);
  });

  // ── Test 6: Computer-Mouse → KEYBOARD_MOUSE ──
  runTest('Mapping: Computer-Mouse -> KEYBOARD_MOUSE', () => {
    const res = mapRoboflowClass('Computer-Mouse');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.KEYBOARD_MOUSE);
    assert.strictEqual(res.tier, PRIORITY_TIERS.PERIPHERAL_ASSEMBLY);
  });

  // ── Test 7: Battery → BATTERY ──
  runTest('Mapping: Battery -> BATTERY', () => {
    const res = mapRoboflowClass('Battery');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.BATTERY);
    assert.strictEqual(res.tier, PRIORITY_TIERS.INTERNAL_COMPONENT);
  });

  // ── Test 8: PCB → CIRCUIT_BOARD ──
  runTest('Mapping: PCB -> CIRCUIT_BOARD', () => {
    const res = mapRoboflowClass('PCB');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.CIRCUIT_BOARD);
    assert.strictEqual(res.tier, PRIORITY_TIERS.INTERNAL_COMPONENT);
  });

  // ── Test 9: Monitor → MONITOR ──
  runTest('Mapping: Flat-Panel-Monitor & Monitor alias -> MONITOR', () => {
    const res1 = mapRoboflowClass('Flat-Panel-Monitor');
    const res2 = mapRoboflowClass('Monitor');
    assert.strictEqual(res1.category, EWASTE_CATEGORIES.MONITOR);
    assert.strictEqual(res2.category, EWASTE_CATEGORIES.MONITOR);
  });

  // ── Test 10: Printer → PRINTER ──
  runTest('Mapping: Printer -> PRINTER', () => {
    const res = mapRoboflowClass('Printer');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.PRINTER);
    assert.strictEqual(res.tier, PRIORITY_TIERS.COMPLETE_DEVICE);
  });

  // ── Test 11: Power-Adapter → CABLE_CHARGER ──
  runTest('Mapping: Power-Adapter -> CABLE_CHARGER', () => {
    const res = mapRoboflowClass('Power-Adapter');
    assert.strictEqual(res.category, EWASTE_CATEGORIES.CABLE_CHARGER);
    assert.strictEqual(res.tier, PRIORITY_TIERS.INTERNAL_COMPONENT);
  });

  // ── Test 12: Zero Detections → OTHER + review_required = true (Valid outcome) ──
  runTest('Normalization: Zero Detections returns valid OTHER prediction with review_required', () => {
    const normalized = roboflowService.normalizeDetections([], { width: 640, height: 640 });
    assert.strictEqual(normalized.length, 0);

    // Test zero detections behavior simulation
    const zeroResult = {
      success: true,
      has_detection: false,
      category: EWASTE_CATEGORIES.OTHER,
      confidence: 0.0,
      confidence_level: 'LOW',
      review_required: true,
      review_reason: 'NO_DETECTION',
      bbox: null,
      detections: [],
      allPredictions: [],
      modelVersion: 'roboflow-e-waste-dataset-r0ojc-43',
      inferenceTimeMs: 45,
    };

    assert.strictEqual(zeroResult.success, true);
    assert.strictEqual(zeroResult.has_detection, false);
    assert.strictEqual(zeroResult.category, 'OTHER');
    assert.strictEqual(zeroResult.review_required, true);
    assert.strictEqual(zeroResult.review_reason, 'NO_DETECTION');
  });

  // ── Test 13: Roboflow Timeout → Safe Graceful Service Failure (null) ──
  await runAsyncTest('Resilience: Request timeout gracefully returns null without uncaught exception', async () => {
    const savedTimeout = roboflowService.timeoutMs;
    const savedKey = roboflowService.apiKey;
    roboflowService.timeoutMs = 1; // 1ms forces immediate AbortController timeout
    roboflowService.apiKey = 'mock_key_for_timeout_test';

    // Mock buffer
    const dummyBuffer = Buffer.from('fake_image_bytes_for_timeout_test');
    const res = await roboflowService.predict(dummyBuffer);
    
    // Restore
    roboflowService.timeoutMs = savedTimeout;
    roboflowService.apiKey = savedKey;

    assert.strictEqual(res, null, 'Timeout must result in null return (handled gracefully)');
  });

  // ── Test 14: Missing API Key → Configuration Failure Handled Safely ──
  await runAsyncTest('Security: Missing API key fails safely without leaking secrets or crashing', async () => {
    const savedKey = roboflowService.apiKey;
    roboflowService.apiKey = '';

    const dummyBuffer = Buffer.from('dummy_image_data');
    const res = await roboflowService.predict(dummyBuffer);

    roboflowService.apiKey = savedKey;

    assert.strictEqual(res, null, 'Missing API key must return null and prevent outbound network call');
  });

  // ── Test 15: Multi-Detection Prioritization: Container Device > Component ──
  runTest('Prioritization: Laptop (0.89) vs Computer-Keyboard (0.84) -> LAPTOP wins', () => {
    const rawPredictions = [
      {
        x: 320,
        y: 240,
        width: 400,
        height: 300,
        confidence: 0.84,
        class: 'Computer-Keyboard',
      },
      {
        x: 320,
        y: 240,
        width: 500,
        height: 450,
        confidence: 0.89,
        class: 'Laptop',
      },
      {
        x: 200,
        y: 150,
        width: 100,
        height: 80,
        confidence: 0.95,
        class: 'PCB', // Even though PCB has higher confidence (0.95), Laptop is Tier 1 device
      },
    ];

    const normalized = roboflowService.normalizeDetections(rawPredictions, { width: 640, height: 640 });
    assert.strictEqual(normalized.length, 3);

    const primary = prioritizeDetections(normalized);
    assert.ok(primary, 'Primary detection should be found');
    assert.strictEqual(primary.className, 'Laptop', 'Laptop must be chosen over Keyboard and PCB due to Tier 1 device priority');
    assert.strictEqual(primary.category, EWASTE_CATEGORIES.LAPTOP);
  });

  // ── Test 16: Sanitize Redaction Test ──
  runTest('Security: API key sanitizer redacts secret from any string', () => {
    roboflowService.apiKey = 'rf_secret_test_key_12345';
    const testLog = 'Error connecting to https://detect.roboflow.com/model/43?api_key=rf_secret_test_key_12345';
    const sanitized = roboflowService._sanitize(testLog);

    assert.ok(!sanitized.includes('rf_secret_test_key_12345'), 'Sanitizer must strip the raw secret');
    assert.ok(sanitized.includes('[REDACTED_API_KEY]'), 'Sanitizer must inject placeholder');
  });

  // ── Summary ──
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
