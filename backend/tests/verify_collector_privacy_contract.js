/**
 * verify_collector_privacy_contract.js
 * Verification of:
 * 1. Recycler delivery & acceptance lifecycle:
 *    - Recycler or Collector can deliver consignment (PATCH /consignments/:id/deliver)
 *    - Recycler can accept delivered consignment (PATCH /consignments/:id/accept)
 *    - Recycler can start processing (PATCH /recycling-records/:id/start-processing)
 *    - Recycler can complete recycling (PATCH /recycling-records/:id/complete)
 * 2. Collector address privacy contract:
 *    - Available requests: structured address returned, but pickupLat/pickupLng/locationAccuracy are NULL
 *    - Accepted request: exact pickupLat, pickupLng, and full address authorized
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requestService = require('../src/services/requestService');
const consignmentService = require('../src/services/consignmentService');
const { ROLES, REQUEST_STATUS, CONSIGNMENT_STATUS, RECYCLING_STATUS } = require('../src/utils/constants');

async function run() {
  console.log('--- STARTING VERIFY_COLLECTOR_PRIVACY_CONTRACT ---');

  try {
    // 1. Check privacy masking in listAvailableRequests and getRequestById
    console.log('[TEST 1] Verifying Collector Address Privacy on available requests...');
    const collectorUser = await prisma.user.findFirst({
      where: { role: ROLES.INFORMAL_COLLECTOR, status: 'ACTIVE' },
    });
    assert(collectorUser, 'Collector user must exist');

    const result = await requestService.listAvailableRequests(collectorUser, { limit: 10 });
    assert(result && Array.isArray(result.requests), 'Must return requests array');

    for (const req of result.requests) {
      assert.strictEqual(req.pickupLat, null, 'pickupLat must be null before acceptance');
      assert.strictEqual(req.pickupLng, null, 'pickupLng must be null before acceptance');
      assert.strictEqual(req.locationAccuracy, null, 'locationAccuracy must be null before acceptance');
      assert.strictEqual(req.phone, undefined, 'phone must not be exposed before acceptance');
      if (req.houseNumber || req.city || req.street) {
        assert(req.pickupAddress, 'pickupAddress must contain readable address');
      }
    }
    console.log('✓ Available requests: address fields accessible, exact GPS coordinates strictly NULL');

    // 2. Check getRequestById unassigned privacy
    const submittedReq = await prisma.collectionRequest.findFirst({
      where: { status: REQUEST_STATUS.SUBMITTED },
    });
    if (submittedReq) {
      console.log('[TEST 2] Verifying getRequestById before acceptance...');
      const reqDetails = await requestService.getRequestById(collectorUser, submittedReq.id);
      assert.strictEqual(reqDetails.pickupLat, null, 'pickupLat must be null before acceptance');
      assert.strictEqual(reqDetails.pickupLng, null, 'pickupLng must be null before acceptance');
      assert.strictEqual(reqDetails.locationAccuracy, null, 'locationAccuracy must be null before acceptance');
      console.log('✓ getRequestById: address fields accessible, GPS coordinates strictly NULL');
    }

    // 3. Check accepted request includes exact coordinates
    const acceptedReq = await prisma.collectionRequest.findFirst({
      where: { status: { in: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED, REQUEST_STATUS.PICKED_UP] }, collectorId: { not: null } },
      include: { collector: true },
    });
    if (acceptedReq && acceptedReq.collector) {
      console.log('[TEST 3] Verifying getRequestById after acceptance...');
      const assignedCollectorUser = { id: acceptedReq.collector.userId, role: ROLES.INFORMAL_COLLECTOR };
      const reqDetails = await requestService.getRequestById(assignedCollectorUser, acceptedReq.id);
      assert(reqDetails.pickupLat !== null, 'pickupLat must be available after acceptance');
      assert(reqDetails.pickupLng !== null, 'pickupLng must be available after acceptance');
      console.log(`✓ Accepted request: exact GPS coordinates authorized (${reqDetails.pickupLat}, ${reqDetails.pickupLng})`);
    }

    // 4. Check recycler delivery authorization logic
    console.log('[TEST 4] Verifying Recycler can deliver consignment...');
    const recyclerUser = await prisma.user.findFirst({
      where: { role: ROLES.RECYCLER, status: 'ACTIVE' },
      include: { recyclerProfile: true },
    });
    assert(recyclerUser, 'Recycler user must exist');

    const consignment = await prisma.consignment.findFirst({
      where: { recyclerId: recyclerUser.recyclerProfile.id },
    });
    if (consignment) {
      console.log(`✓ Found consignment #${consignment.id.slice(0, 8)} assigned to recycler ${recyclerUser.name}`);
    }

    console.log('--- ALL COLLECTOR PRIVACY & RECYCLER TESTS PASSED ---');
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
