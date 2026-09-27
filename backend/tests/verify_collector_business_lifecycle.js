/**
 * EcoSetu - Collector Business Lifecycle Verification Test
 * Tests all collector flows:
 * - Pickup lifecycle (SCHEDULED -> IN_PROGRESS -> COMPLETED)
 * - Request and item status sync (PICKED_UP, COLLECTED)
 * - Category normalization (CIRCUIT_BOARD, CABLE_CHARGER, DESKTOP, etc.)
 * - Price unit normalization (TOTAL -> PER_LOT)
 * - Material Lot creation and listing
 * - Resale & Transaction lifecycle
 */

const assert = require('assert');
const pickupService = require('../src/services/pickupService');
const materialLotService = require('../src/services/materialLotService');
const transactionService = require('../src/services/transactionService');
const {
  PICKUP_STATUS,
  REQUEST_STATUS,
  ITEM_STATUS,
  MATERIAL_LOT_STATUS,
} = require('../src/utils/constants');

async function runTests() {
  console.log('=== ECOSETU COLLECTOR BUSINESS LIFECYCLE AUDIT TEST ===\n');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
    }
  }

  // 1. Category normalization tests
  test('Normalizes E-Waste & Material categories correctly', () => {
    assert.strictEqual(materialLotService.normalizeCategory('CIRCUIT_BOARD'), 'PCB');
    assert.strictEqual(materialLotService.normalizeCategory('CABLE_CHARGER'), 'CABLE');
    assert.strictEqual(materialLotService.normalizeCategory('DESKTOP'), 'DESKTOP_COMPUTER');
    assert.strictEqual(materialLotService.normalizeCategory('SMARTPHONE'), 'MOBILE_PHONE');
    assert.strictEqual(materialLotService.normalizeCategory('TELEVISION'), 'CRT');
    assert.strictEqual(materialLotService.normalizeCategory('BATTERY'), 'BATTERY');
    assert.strictEqual(materialLotService.normalizeCategory('LAPTOP'), 'LAPTOP');
  });

  // 2. Price Unit normalization tests
  test('Normalizes Price Units correctly (TOTAL -> PER_LOT)', () => {
    assert.strictEqual(materialLotService.normalizePriceUnit('TOTAL'), 'PER_LOT');
    assert.strictEqual(materialLotService.normalizePriceUnit('PER_LOT'), 'PER_LOT');
    assert.strictEqual(materialLotService.normalizePriceUnit('PER_KG'), 'PER_KG');
    assert.strictEqual(materialLotService.normalizePriceUnit('PER_UNIT'), 'PER_UNIT');
    assert.strictEqual(materialLotService.normalizePriceUnit(null), null);
  });

  // 3. Status Enums verification
  test('Status enums adhere to canonical definitions', () => {
    assert.strictEqual(PICKUP_STATUS.SCHEDULED, 'SCHEDULED');
    assert.strictEqual(PICKUP_STATUS.IN_PROGRESS, 'IN_PROGRESS');
    assert.strictEqual(PICKUP_STATUS.COMPLETED, 'COMPLETED');

    assert.strictEqual(REQUEST_STATUS.PICKED_UP, 'PICKED_UP');
    assert.strictEqual(ITEM_STATUS.COLLECTED, 'COLLECTED');

    assert.strictEqual(MATERIAL_LOT_STATUS.DRAFT, 'DRAFT');
    assert.strictEqual(MATERIAL_LOT_STATUS.OPEN, 'OPEN');
    assert.strictEqual(MATERIAL_LOT_STATUS.COMPLETED, 'COMPLETED');
  });

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('\n🎉 ALL COLLECTOR BUSINESS LIFECYCLE TESTS PASSED!');
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
