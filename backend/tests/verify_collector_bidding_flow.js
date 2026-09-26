/**
 * verify_collector_bidding_flow.js
 * Comprehensive Verification of ECOSETU Pickup Request -> Collector Bidding -> Citizen Acceptance Workflow
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const { ROLES, USER_STATUS, REQUEST_STATUS, ITEM_STATUS, PICKUP_STATUS, OFFER_STATUS } = require('../src/utils/constants');

let server;
let baseUrl;

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, status: user.status },
    environment.jwtAccessSecret,
    { expiresIn: '15m' }
  );
}

function request(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const fullPath = path.startsWith('/api/v1') ? path : `/api/v1${path}`;
    const url = new URL(fullPath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('ECOSETU — BIDDING & OFFERS FLOW TEST SUITE');
  console.log('====================================================');

  // Start temporary test server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api/v1`;

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✖ [FAIL] ${name}`);
      console.error(' ', err.message);
    }
  }

  // 1. Setup Test Users in Database
  const citizenUser = await prisma.user.upsert({
    where: { email: 'bidding.citizen@ecosetu.org' },
    update: { status: USER_STATUS.ACTIVE, role: ROLES.CITIZEN },
    create: {
      email: 'bidding.citizen@ecosetu.org',
      passwordHash: 'dummy_hash',
      name: 'Ananya Citizen',
      phone: '+919876500001',
      role: ROLES.CITIZEN,
      status: USER_STATUS.ACTIVE,
    },
  });

  const citizenToken = generateToken(citizenUser);

  const collectorUser1 = await prisma.user.upsert({
    where: { email: 'bidding.collector1@ecosetu.org' },
    update: { status: USER_STATUS.ACTIVE, role: ROLES.INFORMAL_COLLECTOR },
    create: {
      email: 'bidding.collector1@ecosetu.org',
      passwordHash: 'dummy_hash',
      name: 'Ramesh Kabadiwala',
      phone: '+919876500002',
      role: ROLES.INFORMAL_COLLECTOR,
      status: USER_STATUS.ACTIVE,
    },
  });

  const collectorProfile1 = await prisma.collectorProfile.upsert({
    where: { userId: collectorUser1.id },
    update: { isAvailable: true, serviceArea: 'Bhubaneswar Zone A' },
    create: {
      userId: collectorUser1.id,
      isAvailable: true,
      serviceArea: 'Bhubaneswar Zone A',
      city: 'Bhubaneswar',
      state: 'Odisha',
    },
  });

  const collectorToken1 = generateToken(collectorUser1);

  const collectorUser2 = await prisma.user.upsert({
    where: { email: 'bidding.collector2@ecosetu.org' },
    update: { status: USER_STATUS.ACTIVE, role: ROLES.INFORMAL_COLLECTOR },
    create: {
      email: 'bidding.collector2@ecosetu.org',
      passwordHash: 'dummy_hash',
      name: 'Suresh Scrap Dealer',
      phone: '+919876500003',
      role: ROLES.INFORMAL_COLLECTOR,
      status: USER_STATUS.ACTIVE,
    },
  });

  const collectorProfile2 = await prisma.collectorProfile.upsert({
    where: { userId: collectorUser2.id },
    update: { isAvailable: true, serviceArea: 'Bhubaneswar Zone B' },
    create: {
      userId: collectorUser2.id,
      isAvailable: true,
      serviceArea: 'Bhubaneswar Zone B',
      city: 'Bhubaneswar',
      state: 'Odisha',
    },
  });

  const collectorToken2 = generateToken(collectorUser2);

  // 2. Create E-waste items for citizen
  const item1 = await prisma.ewasteItem.create({
    data: {
      citizenId: citizenUser.id,
      category: 'MOBILE_PHONE',
      description: 'Used Android Phone with broken screen',
      quantity: 1,
      estimatedWeightKg: 0.35,
      status: ITEM_STATUS.SUBMITTED,
    },
  });

  const item2 = await prisma.ewasteItem.create({
    data: {
      citizenId: citizenUser.id,
      category: 'LAPTOP',
      description: 'Old Dell Laptop without charger',
      quantity: 1,
      estimatedWeightKg: 2.10,
      status: ITEM_STATUS.SUBMITTED,
    },
  });

  let createdRequestId = null;
  let offerId1 = null;
  let offerId2 = null;

  // TEST 1: Citizen creates pickup request with autoSubmit: true
  await test('POST /collection-requests: Citizen creates and auto-submits request (status = SUBMITTED)', async () => {
    const res = await request('POST', '/collection-requests', citizenToken, {
      itemIds: [item1.id, item2.id],
      pickupAddress: 'Plot 101, Saheed Nagar, Bhubaneswar, Odisha',
      pickupLat: 20.2961,
      pickupLng: 85.8245,
      city: 'Bhubaneswar',
      state: 'Odisha',
      pincode: '751007',
      autoSubmit: true,
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.request.status, REQUEST_STATUS.SUBMITTED);
    assert.strictEqual(res.body.data.request.citizenId, citizenUser.id);
    createdRequestId = res.body.data.request.id;
  });

  // TEST 2: Collector sees the request in GET /collection-requests/available
  await test('GET /collection-requests/available: Verified Collector sees the open request', async () => {
    const res = await request('GET', '/collection-requests/available', collectorToken1);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const found = res.body.data.requests.find((r) => r.id === createdRequestId);
    assert.ok(found, 'Request must appear in available requests list');
    assert.strictEqual(found.status, REQUEST_STATUS.SUBMITTED);
    assert.strictEqual(found.offersCount, 0);
    assert.strictEqual(found.myOffer, null);
    assert.ok(found.pickupAddress.includes('Saheed Nagar') || found.pickupAddress.includes('Bhubaneswar'));
  });

  // TEST 3: Collector 1 submits an offer (₹350)
  await test('POST /collection-requests/:id/offers: Collector 1 submits offer of ₹350', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers`, collectorToken1, {
      offeredPrice: 350.00,
      notes: 'Can pick up tomorrow morning between 9 AM and 11 AM',
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(parseFloat(res.body.data.offer.offeredPrice), 350.00);
    assert.strictEqual(res.body.data.offer.status, 'PENDING');
    offerId1 = res.body.data.offer.id;
  });

  // TEST 4: Collector 1 updates their offer (₹380) without duplicate creation
  await test('POST /collection-requests/:id/offers: Collector 1 updates offer to ₹380 (upsert, no duplicates)', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers`, collectorToken1, {
      offeredPrice: 380.00,
      notes: 'Updated offer: ₹380 with instant cash payment',
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.offer.id, offerId1, 'Must update existing offer ID');
    assert.strictEqual(parseFloat(res.body.data.offer.offeredPrice), 380.00);
  });

  // TEST 5: Collector 2 submits a competing offer (₹420)
  await test('POST /collection-requests/:id/offers: Collector 2 submits competing offer of ₹420', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers`, collectorToken2, {
      offeredPrice: 420.00,
      notes: 'Best price guarantee with certified e-waste certificate',
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(parseFloat(res.body.data.offer.offeredPrice), 420.00);
    offerId2 = res.body.data.offer.id;
    assert.notStrictEqual(offerId1, offerId2);
  });

  // TEST 6: Invalid offer price <= 0 is rejected (400)
  await test('POST /collection-requests/:id/offers: Invalid price <= 0 rejected (400)', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers`, collectorToken1, {
      offeredPrice: -50,
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // TEST 7: Citizen cannot submit collector offers (403)
  await test('POST /collection-requests/:id/offers: Citizen role is forbidden (403)', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers`, citizenToken, {
      offeredPrice: 500,
    });

    assert.strictEqual(res.status, 403);
  });

  // TEST 8: Citizen views all offers for their request
  await test('GET /collection-requests/:id/offers: Citizen lists all received offers', async () => {
    const res = await request('GET', `/collection-requests/${createdRequestId}/offers`, citizenToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.offers.length, 2);
    const offer1 = res.body.data.offers.find((o) => o.id === offerId1);
    const offer2 = res.body.data.offers.find((o) => o.id === offerId2);
    assert.ok(offer1, 'Offer 1 must be present');
    assert.ok(offer2, 'Offer 2 must be present');
    assert.strictEqual(parseFloat(offer1.offeredPrice), 380.00);
    assert.strictEqual(parseFloat(offer2.offeredPrice), 420.00);
  });

  // TEST 9: Collector sees only their own offer in GET /collection-requests/:id/offers
  await test('GET /collection-requests/:id/offers: Collector sees only their own offer (privacy preserved)', async () => {
    const res = await request('GET', `/collection-requests/${createdRequestId}/offers`, collectorToken1);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.offers.length, 1);
    assert.strictEqual(res.body.data.offers[0].id, offerId1);
  });

  // TEST 10: Collector views own offers in GET /collectors/my-offers
  await test('GET /collectors/my-offers: Collector 2 views their submitted offers', async () => {
    const res = await request('GET', '/collectors/my-offers', collectorToken2);

    assert.strictEqual(res.status, 200);
    const found = res.body.data.offers.find((o) => o.id === offerId2);
    assert.ok(found);
    assert.strictEqual(parseFloat(found.offeredPrice), 420.00);
  });

  // TEST 11: Collector cannot accept offers (403)
  await test('POST /collection-requests/:id/offers/:offerId/accept: Collector role cannot accept offer (403)', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers/${offerId2}/accept`, collectorToken1);
    assert.strictEqual(res.status, 403);
  });

  // TEST 12: Citizen accepts Collector 2's offer (₹420)
  await test('POST /collection-requests/:id/offers/:offerId/accept: Citizen accepts Collector 2 offer', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers/${offerId2}/accept`, citizenToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.request.status, REQUEST_STATUS.ACCEPTED);
    assert.strictEqual(res.body.data.request.collectorId, collectorProfile2.id);
    assert.strictEqual(res.body.data.pickup.status, PICKUP_STATUS.SCHEDULED);
  });

  // TEST 13: Verify DB state after acceptance: Request ACCEPTED, Offer 2 ACCEPTED, Offer 1 REJECTED
  await test('Database Verification: Selected offer ACCEPTED, competing offer REJECTED, Pickup created', async () => {
    const dbReq = await prisma.collectionRequest.findUnique({
      where: { id: createdRequestId },
      include: { pickup: true, pickupOffers: true },
    });

    assert.strictEqual(dbReq.status, REQUEST_STATUS.ACCEPTED);
    assert.strictEqual(dbReq.collectorId, collectorProfile2.id);
    assert.ok(dbReq.pickup, 'Pickup must be created');
    assert.strictEqual(dbReq.pickup.status, PICKUP_STATUS.SCHEDULED);

    const o1 = dbReq.pickupOffers.find((o) => o.id === offerId1);
    const o2 = dbReq.pickupOffers.find((o) => o.id === offerId2);

    assert.strictEqual(o2.status, 'ACCEPTED');
    assert.strictEqual(o1.status, 'REJECTED');
  });

  // TEST 14: Submitting an offer on an already accepted request is rejected (400)
  await test('POST /collection-requests/:id/offers: Offer on already ACCEPTED request is rejected (400)', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers`, collectorToken1, {
      offeredPrice: 500,
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // TEST 15: Accepting an offer on an already accepted request is rejected (409)
  await test('POST /collection-requests/:id/offers/:offerId/accept: Double acceptance prevented (409 Conflict)', async () => {
    const res = await request('POST', `/collection-requests/${createdRequestId}/offers/${offerId1}/accept`, citizenToken);

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
  });

  // Clean up test server
  server.close();

  console.log('\n====================================================');
  console.log(`BIDDING TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  if (server) server.close();
  process.exit(1);
});
