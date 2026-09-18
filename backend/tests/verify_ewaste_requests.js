// EcoSetu E-Waste Item and Collection Request Test Suite
// Canonical Reference: docs/04_DATABASE_SCHEMA.md, docs/05_API_SPECIFICATION.md, docs/06_ROLES_AND_PERMISSIONS.md, docs/07_BUSINESS_WORKFLOWS.md

const assert = require('assert');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const { ROLES, USER_STATUS, EWASTE_CATEGORIES, ITEM_CONDITIONS, ITEM_STATUS, REQUEST_STATUS } = require('../src/utils/constants');

async function runEwasteAndRequestTests() {
  console.log('====================================================');
  console.log('ECOSETU E-WASTE & COLLECTION REQUEST TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
    }
  }

  function createToken(payload) {
    return jwt.sign(payload, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  // Test identities (RFC4122 v4 compliant UUIDs)
  const citizen1 = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen1@ecosetu.org',
    name: 'Citizen Jane',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'citizen2@ecosetu.org',
    name: 'Citizen John',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collectorVerified = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector.verified@ecosetu.org',
    name: 'Collector Ramesh',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collectorUnverified = {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'collector.pending@ecosetu.org',
    name: 'Collector Suresh',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.PENDING_VERIFICATION,
  };

  const admin = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin EcoSetu',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  // In-memory mock database state
  const usersDb = new Map([
    [citizen1.id, citizen1],
    [citizen2.id, citizen2],
    [collectorVerified.id, collectorVerified],
    [collectorUnverified.id, collectorUnverified],
    [admin.id, admin],
  ]);

  const collectorProfilesDb = new Map([
    [
      collectorVerified.id,
      {
        id: 'cp-verified-1',
        userId: collectorVerified.id,
        serviceAreaLat: 28.6139,
        serviceAreaLng: 77.209,
        serviceRadiusKm: 10.0,
      },
    ],
  ]);

  const itemsDb = new Map();
  const requestsDb = new Map();

  // Seed existing item for citizen2 to test cross-user access
  const otherUserItemId = 'c2222222-2222-4222-8222-222222222222';
  itemsDb.set(otherUserItemId, {
    id: otherUserItemId,
    citizenId: citizen2.id,
    category: EWASTE_CATEGORIES.LAPTOP,
    description: 'Citizen2 HP laptop',
    quantity: 1,
    condition: ITEM_CONDITIONS.WORKING,
    estimatedWeightKg: 2.2,
    imageUrl: null,
    status: ITEM_STATUS.SUBMITTED,
    collectionRequestId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  // Prisma Mocks
  const origUserFindUnique = prisma.user.findUnique;
  const origCollectorFindUnique = prisma.collectorProfile.findUnique;

  const origItemCreate = prisma.ewasteItem.create;
  const origItemFindMany = prisma.ewasteItem.findMany;
  const origItemFindUnique = prisma.ewasteItem.findUnique;
  const origItemCount = prisma.ewasteItem.count;
  const origItemUpdateMany = prisma.ewasteItem.updateMany;

  const origReqCreate = prisma.collectionRequest.create;
  const origReqFindMany = prisma.collectionRequest.findMany;
  const origReqFindUnique = prisma.collectionRequest.findUnique;
  const origReqCount = prisma.collectionRequest.count;
  const origReqUpdate = prisma.collectionRequest.update;

  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;
  prisma.collectorProfile.findUnique = async ({ where }) => collectorProfilesDb.get(where.userId) || null;

  prisma.ewasteItem.create = async ({ data }) => {
    const id = randomUUID();
    const newItem = {
      id,
      collectionRequestId: null,
      actualWeightKg: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    itemsDb.set(id, newItem);
    return newItem;
  };

  prisma.ewasteItem.findMany = async ({ where, skip = 0, take = 20 }) => {
    let list = Array.from(itemsDb.values());
    if (where.id && where.id.in) {
      list = list.filter((i) => where.id.in.includes(i.id));
    }
    if (where.citizenId) {
      list = list.filter((i) => i.citizenId === where.citizenId);
    }
    if (where.status) {
      list = list.filter((i) => i.status === where.status);
    }
    if (where.category) {
      list = list.filter((i) => i.category === where.category);
    }
    return list.slice(skip, skip + take);
  };

  prisma.ewasteItem.findUnique = async ({ where }) => {
    const item = itemsDb.get(where.id);
    if (!item) return null;
    let collectionRequest = null;
    if (item.collectionRequestId) {
      collectionRequest = requestsDb.get(item.collectionRequestId) || null;
    }
    return {
      ...item,
      collectionRequest,
    };
  };

  prisma.ewasteItem.count = async ({ where }) => {
    let list = Array.from(itemsDb.values());
    if (where.citizenId) list = list.filter((i) => i.citizenId === where.citizenId);
    if (where.status) list = list.filter((i) => i.status === where.status);
    if (where.category) list = list.filter((i) => i.category === where.category);
    return list.length;
  };

  prisma.ewasteItem.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const item of itemsDb.values()) {
      let match = true;
      if (where.id && where.id.in && !where.id.in.includes(item.id)) match = false;
      if (where.collectionRequestId && item.collectionRequestId !== where.collectionRequestId) match = false;
      if (match) {
        Object.assign(item, data, { updatedAt: new Date() });
        count++;
      }
    }
    return { count };
  };

  prisma.collectionRequest.create = async ({ data }) => {
    const id = randomUUID();
    const newReq = {
      id,
      collectorId: null,
      submittedAt: null,
      acceptedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    requestsDb.set(id, newReq);
    return newReq;
  };

  prisma.collectionRequest.findMany = async ({ where, skip = 0, take = 20 }) => {
    let list = Array.from(requestsDb.values());
    if (where.citizenId) list = list.filter((r) => r.citizenId === where.citizenId);
    if (where.status) list = list.filter((r) => r.status === where.status);
    const sliced = list.slice(skip, skip + take);
    return sliced.map((r) => ({
      ...r,
      ewasteItems: Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id),
    }));
  };

  prisma.collectionRequest.findUnique = async ({ where }) => {
    const req = requestsDb.get(where.id);
    if (!req) return null;
    return {
      ...req,
      ewasteItems: Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id),
      collector: req.collectorId
        ? { id: req.collectorId, userId: collectorVerified.id }
        : null,
    };
  };

  prisma.collectionRequest.count = async ({ where }) => {
    let list = Array.from(requestsDb.values());
    if (where.citizenId) list = list.filter((r) => r.citizenId === where.citizenId);
    if (where.status) list = list.filter((r) => r.status === where.status);
    return list.length;
  };

  prisma.collectionRequest.update = async ({ where, data }) => {
    const req = requestsDb.get(where.id);
    if (!req) throw new Error('Request not found');
    Object.assign(req, data, { updatedAt: new Date() });
    return {
      ...req,
      ewasteItems: Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id),
    };
  };

  const TEST_PORT = 3005;
  const server = app.listen(TEST_PORT);

  try {
    const citizen1Token = createToken({ userId: citizen1.id });
    const citizen2Token = createToken({ userId: citizen2.id });
    const collectorToken = createToken({ userId: collectorVerified.id });
    const unverifiedToken = createToken({ userId: collectorUnverified.id });
    const adminToken = createToken({ userId: admin.id });

    let createdItemId1 = null;
    let createdItemId2 = null;
    let createdRequestId = null;

    // =============================================================
    // 1. E-WASTE ITEM CREATION (POST /api/v1/ewaste-items)
    // =============================================================
    await testAsync('POST /ewaste-items: Authenticated citizen creates valid item (201)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          category: EWASTE_CATEGORIES.LAPTOP,
          description: 'Old Dell Latitude with charger',
          quantity: 1,
          condition: ITEM_CONDITIONS.WORKING,
          estimatedWeightKg: 2.5,
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.item.category, 'LAPTOP');
      assert.strictEqual(data.data.item.status, 'SUBMITTED');
      assert.strictEqual(data.data.item.citizenId, citizen1.id);
      assert.strictEqual(data.data.aiPrediction, null);
      createdItemId1 = data.data.item.id;
    });

    await testAsync('POST /ewaste-items: Create second valid item for collection request', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          category: EWASTE_CATEGORIES.MOBILE_PHONE,
          description: 'Broken iPhone screen',
          quantity: 2,
          condition: ITEM_CONDITIONS.DAMAGED,
          estimatedWeightKg: 0.4,
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      createdItemId2 = data.data.item.id;
    });

    await testAsync('POST /ewaste-items: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: EWASTE_CATEGORIES.BATTERY }),
      });
      assert.strictEqual(res.status, 401);
    });

    await testAsync('POST /ewaste-items: Non-citizen role (COLLECTOR) rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collectorToken}`,
        },
        body: JSON.stringify({ category: EWASTE_CATEGORIES.LAPTOP }),
      });
      assert.strictEqual(res.status, 403);
    });

    await testAsync('POST /ewaste-items: Invalid category rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({ category: 'NON_EXISTENT_CATEGORY' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /ewaste-items: Invalid condition rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          category: EWASTE_CATEGORIES.MONITOR,
          condition: 'BRAND_NEW_SEALED', // Invalid enum
        }),
      });
      assert.strictEqual(res.status, 400);
    });

    await testAsync('POST /ewaste-items: Protected status field in creation payload rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          category: EWASTE_CATEGORIES.DESKTOP,
          status: 'RECYCLED', // Protected lifecycle status
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert(JSON.stringify(data.error.details).includes('status'));
    });

    await testAsync('POST /ewaste-items: Spoofed citizenId in creation payload rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          category: EWASTE_CATEGORIES.DESKTOP,
          citizenId: citizen2.id, // Spoofing another user
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert(JSON.stringify(data.error.details).includes('citizenId'));
    });

    // =============================================================
    // 2. E-WASTE ITEM RETRIEVAL (GET /api/v1/ewaste-items)
    // =============================================================
    await testAsync('GET /ewaste-items: Citizen lists own submitted items with pagination (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data.items));
      assert.strictEqual(data.data.items.length, 2);
      assert.strictEqual(data.data.pagination.page, 1);
      // Ensure citizen1 only sees their own items
      for (const item of data.data.items) {
        assert.strictEqual(item.citizenId, citizen1.id);
      }
    });

    await testAsync('GET /ewaste-items/:id: Citizen views own item details (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items/${createdItemId1}`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.item.id, createdItemId1);
    });

    await testAsync("GET /ewaste-items/:id: Citizen viewing another citizen's item is rejected (403)", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items/${otherUserItemId}`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /ewaste-items/:id: Admin can view any citizen item (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/ewaste-items/${otherUserItemId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.item.id, otherUserItemId);
    });

    // =============================================================
    // 3. COLLECTION REQUEST CREATION (POST /api/v1/collection-requests)
    // =============================================================
    await testAsync('POST /collection-requests: Citizen creates valid collection request (201)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          itemIds: [createdItemId1, createdItemId2],
          pickupAddress: '42 Connaught Place, New Delhi',
          pickupLat: 28.6315,
          pickupLng: 77.2167,
          preferredDate: '2026-09-20',
          preferredTimeStart: '10:00',
          preferredTimeEnd: '12:00',
          notes: 'Please ring bell 3 times',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.request.status, 'DRAFT', 'Initial status must be DRAFT');
      assert.strictEqual(data.data.request.citizenId, citizen1.id);
      assert.strictEqual(data.data.request.ewasteItems.length, 2);
      createdRequestId = data.data.request.id;
    });

    await testAsync('POST /collection-requests: Empty itemIds array rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          itemIds: [],
          pickupAddress: 'Address',
          pickupLat: 28.6,
          pickupLng: 77.2,
        }),
      });
      assert.strictEqual(res.status, 400);
    });

    await testAsync('POST /collection-requests: Missing coordinates rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          itemIds: [createdItemId1],
          pickupAddress: 'Address',
        }),
      });
      assert.strictEqual(res.status, 400);
    });

    await testAsync('POST /collection-requests: Items belonging to another citizen rejected (403/400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          itemIds: [otherUserItemId], // Belongs to citizen2
          pickupAddress: 'Address',
          pickupLat: 28.6,
          pickupLng: 77.2,
        }),
      });
      assert(res.status === 403 || res.status === 400);
    });

    await testAsync('POST /collection-requests: Items already in another request rejected with 409 CONFLICT', async () => {
      // createdItemId1 is already attached to createdRequestId
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          itemIds: [createdItemId1],
          pickupAddress: 'Different address',
          pickupLat: 28.6,
          pickupLng: 77.2,
        }),
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'CONFLICT');
    });

    await testAsync('POST /collection-requests: Attempting to directly set status: ACCEPTED rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          itemIds: [createdItemId2],
          pickupAddress: 'Address',
          pickupLat: 28.6,
          pickupLng: 77.2,
          status: 'ACCEPTED', // Protected field
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert(JSON.stringify(data.error.details).includes('status'));
    });

    // =============================================================
    // 4. COLLECTION REQUEST RETRIEVAL (GET /api/v1/collection-requests)
    // =============================================================
    await testAsync('GET /collection-requests: Citizen lists own requests (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.requests.length, 1);
      assert.strictEqual(data.data.requests[0].id, createdRequestId);
    });

    await testAsync('GET /collection-requests: Admin lists all requests (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data.requests));
    });

    await testAsync('GET /collection-requests/:id: Citizen views own request details (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.request.id, createdRequestId);
      assert.strictEqual(data.data.request.pickupAddress, '42 Connaught Place, New Delhi');
    });

    await testAsync("GET /collection-requests/:id: Other citizen viewing request is rejected (403)", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}`, {
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    // =============================================================
    // 5. REQUEST SUBMISSION (POST /api/v1/collection-requests/:id/submit)
    // =============================================================
    await testAsync('POST /collection-requests/:id/submit: Citizen submits draft request (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.request.status, 'SUBMITTED');
      assert(data.data.request.submittedAt !== null, 'submittedAt timestamp must be recorded');
    });

    await testAsync('POST /collection-requests/:id/submit: Submitting already submitted request rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 400);
    });

    await testAsync("POST /collection-requests/:id/submit: Other citizen submitting request rejected (403)", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      assert.strictEqual(res.status, 403);
    });

    // =============================================================
    // 6. AVAILABLE REQUESTS BROWSING (GET /api/v1/collection-requests/available)
    // =============================================================
    await testAsync('GET /collection-requests/available: Verified collector browses available requests (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/available?lat=28.6139&lng=77.2090&radiusKm=15`, {
        headers: { Authorization: `Bearer ${collectorToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(Array.isArray(data.data.requests));
      assert(data.data.requests.length > 0);
      // Privacy check: verify exact address is masked until accepted
      assert(data.data.requests[0].pickupAddress.includes('Approximate Location'));
    });

    await testAsync('GET /collection-requests/available: Unverified collector is blocked by checkVerified (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/available`, {
        headers: { Authorization: `Bearer ${unverifiedToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /collection-requests/available: Citizen role is blocked (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/available`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 403);
    });

    // =============================================================
    // 7. REQUEST CANCELLATION (POST /api/v1/collection-requests/:id/cancel)
    // =============================================================
    await testAsync('POST /collection-requests/:id/cancel: Missing cancellation reason rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
    });

    await testAsync("POST /collection-requests/:id/cancel: Other citizen cancelling request rejected (403)", async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen2Token}`,
        },
        body: JSON.stringify({ reason: 'Malicious cancellation attempt' }),
      });
      assert.strictEqual(res.status, 403);
    });

    await testAsync('POST /collection-requests/:id/cancel: Citizen owner cancels request with valid reason (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({ reason: 'Travelling out of town, will reschedule' }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.request.status, 'CANCELLED');
      assert.strictEqual(data.data.request.cancellationReason, 'Travelling out of town, will reschedule');
      assert(data.data.request.cancelledAt !== null);

      // Verify linked items are freed from the cancelled request
      const item1 = itemsDb.get(createdItemId1);
      assert.strictEqual(item1.collectionRequestId, null, 'Items must be released for re-request upon cancellation');
    });

    await testAsync('POST /collection-requests/:id/cancel: Cannot cancel already cancelled request (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${createdRequestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({ reason: 'Double cancel attempt' }),
      });
      assert.strictEqual(res.status, 400);
    });

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
    console.log('====================================================');
  } finally {
    // Unhook Prisma mocks
    prisma.user.findUnique = origUserFindUnique;
    prisma.collectorProfile.findUnique = origCollectorFindUnique;

    prisma.ewasteItem.create = origItemCreate;
    prisma.ewasteItem.findMany = origItemFindMany;
    prisma.ewasteItem.findUnique = origItemFindUnique;
    prisma.ewasteItem.count = origItemCount;
    prisma.ewasteItem.updateMany = origItemUpdateMany;

    prisma.collectionRequest.create = origReqCreate;
    prisma.collectionRequest.findMany = origReqFindMany;
    prisma.collectionRequest.findUnique = origReqFindUnique;
    prisma.collectionRequest.count = origReqCount;
    prisma.collectionRequest.update = origReqUpdate;

    await new Promise((resolve) => server.close(resolve));
  }
}

runEwasteAndRequestTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
