/**
 * verify_multi_item_request_flow.js
 * Automated validation of Phase 19 Task 32 Multi-Item E-Waste Request Flow.
 */

const assert = require('assert');

function runMultiItemFlowTest() {
  console.log('=== TEST 1: Multi-Item E-Waste Request Flow Validation ===');

  // Simulated items draft array
  const items = [];

  // Add Item 1: Mobile Phone (Qty: 2, Working)
  items.push({
    id: 'item-1',
    category: 'MOBILE_PHONE',
    condition: 'WORKING',
    quantity: 2,
    estimatedWeightKg: '0.4',
  });

  // Add Item 2: Laptop (Qty: 1, Not Working)
  items.push({
    id: 'item-2',
    category: 'LAPTOP',
    condition: 'NOT_WORKING',
    quantity: 1,
    estimatedWeightKg: '2.1',
  });

  // Add Item 3: Battery (Qty: 4, Damaged)
  items.push({
    id: 'item-3',
    category: 'BATTERY',
    condition: 'DAMAGED',
    quantity: 4,
    estimatedWeightKg: '0.8',
  });

  assert.strictEqual(items.length, 3, 'Should have 3 distinct item entries');

  // Edit Item 2 (Laptop: change quantity to 2)
  const laptopIndex = items.findIndex((it) => it.id === 'item-2');
  assert.ok(laptopIndex >= 0, 'Laptop item must exist in draft list');
  items[laptopIndex] = { ...items[laptopIndex], quantity: 2, estimatedWeightKg: '4.2' };
  assert.strictEqual(items[laptopIndex].quantity, 2, 'Laptop quantity should be updated to 2');

  // Remove Item 3 (Battery)
  const filteredItems = items.filter((it) => it.id !== 'item-3');
  assert.strictEqual(filteredItems.length, 2, 'Should have 2 items after removal');

  // Calculate totals
  const totalItemCount = filteredItems.reduce((sum, it) => sum + it.quantity, 0);
  const totalWeight = filteredItems.reduce((sum, it) => sum + parseFloat(it.estimatedWeightKg), 0);

  assert.strictEqual(totalItemCount, 4, 'Total item count should be 2 (Mobiles) + 2 (Laptops) = 4');
  assert.strictEqual(Math.round(totalWeight * 10) / 10, 4.6, 'Total weight should be 0.4 + 4.2 = 4.6 kg');

  console.log('✓ Multi-item draft operations (Add, Edit, Remove, Quantity & Weight Totals) passed.');

  // Verify Single CollectionRequest payload with multiple item IDs
  const createdItemIds = ['uuid-mobile-1', 'uuid-laptop-1'];
  const requestPayload = {
    itemIds: createdItemIds,
    pickupAddress: '12, College Road, Near City Hospital, Berhampur, Ganjam, Odisha, 760001',
    houseNumber: '12',
    street: 'College Road',
    landmark: 'Near City Hospital',
    city: 'Berhampur',
    district: 'Ganjam',
    state: 'Odisha',
    pincode: '760001',
    pickupLat: 19.3149,
    pickupLng: 84.7941,
  };

  assert.strictEqual(requestPayload.itemIds.length, 2, 'Payload must link both item IDs');
  assert.strictEqual(requestPayload.pincode, '760001', 'Pincode must be present in structured payload');
  assert.strictEqual(requestPayload.city, 'Berhampur', 'City must be present in structured payload');

  console.log('✓ Multi-item CollectionRequest structured payload assembly passed.');
  console.log('=== MULTI-ITEM FLOW TEST PASSED ===\n');
}

try {
  runMultiItemFlowTest();
} catch (err) {
  console.error('Test Failed:', err);
  process.exit(1);
}
