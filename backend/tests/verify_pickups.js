// EcoSetu Collector Acceptance & Pickup Workflow Test Suite
// Canonical Reference: docs/04_DATABASE_SCHEMA.md, docs/05_API_SPECIFICATION.md, docs/06_ROLES_AND_PERMISSIONS.md, docs/07_BUSINESS_WORKFLOWS.md, docs/24_ERROR_EDGE_CASES.md

const assert = require('assert');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const {
  ROLES,
  USER_STATUS,
  EWASTE_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUS,
  REQUEST_STATUS,
  PICKUP_STATUS,
} = require('../src/utils/constants');

async function runCollectorAcceptanceAndPickupTests() {
  console.log('====================================================');
  console.log('ECOSETU COLLECTOR ACCEPTANCE & PICKUP TEST SUITE');
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
    phone: '+919876543210',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'citizen2@ecosetu.org',
    name: 'Citizen John',
    phone: '+919876543211',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector1Verified = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector1.verified@ecosetu.org',
    name: 'Collector Ramesh',
    phone: '+919876543212',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collector2Verified = {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'collector2.verified@ecosetu.org',
    name: 'Collector Suresh',
    phone: '+919876543213',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collectorUnverified = {
    id: 'b3333333-3333-4333-8333-333333333333',
    email: 'collector.pending@ecosetu.org',
    name: 'Collector Dinesh',
    phone: '+919876543214',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.PENDING_VERIFICATION,
  };

  const recycler = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler@ecosetu.org',
    name: 'Green Recyclers Ltd',
    phone: '+919876543215',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const admin = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin EcoSetu',
    phone: '+919876543216',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  // Profiles DB
  const collector1Profile = {
    id: 'd1111111-1111-4111-8111-111111111111',
    userId: collector1Verified.id,
    serviceAreaLat: 28.6139,
    serviceAreaLng: 77.2090,
    serviceRadiusKm: 10.0,
    bio: 'Experienced electronics collector',
    isAvailable: true,
    totalPickups: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const collector2Profile = {
    id: 'd2222222-2222-4222-8222-222222222222',
    userId: collector2Verified.id,
    serviceAreaLat: 28.6200,
    serviceAreaLng: 77.2100,
    serviceRadiusKm: 5.0,
    bio: 'South Delhi e-waste collector',
    isAvailable: true,
    totalPickups: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // In-memory mock database collections
  const usersDb = new Map([
    [citizen1.id, citizen1],
    [citizen2.id, citizen2],
    [collector1Verified.id, collector1Verified],
    [collector2Verified.id, collector2Verified],
    [collectorUnverified.id, collectorUnverified],
    [recycler.id, recycler],
    [admin.id, admin],
  ]);

  const collectorProfilesDb = new Map([
    [collector1Verified.id, collector1Profile],
    [collector2Verified.id, collector2Profile],
  ]);

  const itemsDb = new Map();
  const requestsDb = new Map();
  const pickupsDb = new Map();

  // Prisma Mocks
  const origUserFindUnique = prisma.user.findUnique;
  const origCollectorFindUnique = prisma.collectorProfile.findUnique;
  const origCollectorUpdate = prisma.collectorProfile.update;

  const origItemCreate = prisma.ewasteItem.create;
  const origItemFindMany = prisma.ewasteItem.findMany;
  const origItemFindUnique = prisma.ewasteItem.findUnique;
  const origItemCount = prisma.ewasteItem.count;
  const origItemUpdate = prisma.ewasteItem.update;
  const origItemUpdateMany = prisma.ewasteItem.updateMany;

  const origReqCreate = prisma.collectionRequest.create;
  const origReqFindMany = prisma.collectionRequest.findMany;
  const origReqFindUnique = prisma.collectionRequest.findUnique;
  const origReqCount = prisma.collectionRequest.count;
  const origReqUpdate = prisma.collectionRequest.update;

  const origPickupCreate = prisma.pickup ? prisma.pickup.create : undefined;
  const origPickupFindMany = prisma.pickup ? prisma.pickup.findMany : undefined;
  const origPickupFindUnique = prisma.pickup ? prisma.pickup.findUnique : undefined;
  const origPickupCount = prisma.pickup ? prisma.pickup.count : undefined;
  const origPickupUpdate = prisma.pickup ? prisma.pickup.update : undefined;
  const origPickupUpdateMany = prisma.pickup ? prisma.pickup.updateMany : undefined;
  const origTransaction = prisma.$transaction;

  // Setup Prisma Mocks
  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;

  prisma.collectorProfile.findUnique = async ({ where }) => {
    if (where.userId) {
      return collectorProfilesDb.get(where.userId) || null;
    }
    if (where.id) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === where.id) return p;
      }
    }
    return null;
  };

  prisma.collectorProfile.update = async ({ where, data }) => {
    let profile = null;
    if (where.id) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === where.id) {
          profile = p;
          break;
        }
      }
    } else if (where.userId) {
      profile = collectorProfilesDb.get(where.userId);
    }
    if (!profile) throw new Error('Collector profile not found');
    if (data.totalPickups && typeof data.totalPickups === 'object' && data.totalPickups.increment) {
      profile.totalPickups = (profile.totalPickups || 0) + data.totalPickups.increment;
    }
    return profile;
  };

  prisma.ewasteItem.findUnique = async ({ where }) => {
    const item = itemsDb.get(where.id);
    if (!item) return null;
    return {
      ...item,
      collectionRequest: item.collectionRequestId ? requestsDb.get(item.collectionRequestId) : null,
    };
  };

  prisma.ewasteItem.findMany = async ({ where }) => {
    let list = Array.from(itemsDb.values());
    if (where && where.id && where.id.in) {
      list = list.filter((i) => where.id.in.includes(i.id));
    }
    if (where && where.collectionRequestId) {
      list = list.filter((i) => i.collectionRequestId === where.collectionRequestId);
    }
    return list;
  };

  prisma.ewasteItem.update = async ({ where, data }) => {
    const item = itemsDb.get(where.id);
    if (!item) throw new Error('Item not found');
    Object.assign(item, data, { updatedAt: new Date() });
    return item;
  };

  prisma.ewasteItem.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const item of itemsDb.values()) {
      if (where.collectionRequestId && item.collectionRequestId === where.collectionRequestId) {
        Object.assign(item, data, { updatedAt: new Date() });
        count++;
      }
    }
    return { count };
  };

  prisma.collectionRequest.findUnique = async ({ where }) => {
    const req = requestsDb.get(where.id);
    if (!req) return null;
    const items = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id);
    let collector = null;
    if (req.collectorId) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === req.collectorId) {
          collector = {
            id: p.id,
            userId: p.userId,
          };
          break;
        }
      }
    }
    return {
      ...req,
      ewasteItems: items,
      collector,
      citizen: usersDb.get(req.citizenId) || null,
    };
  };

  prisma.collectionRequest.update = async ({ where, data }) => {
    const req = requestsDb.get(where.id);
    if (!req) throw new Error('Request not found');
    Object.assign(req, data, { updatedAt: new Date() });
    const items = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id);
    let collector = null;
    if (req.collectorId) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === req.collectorId) {
          collector = {
            id: p.id,
            userId: p.userId,
          };
          break;
        }
      }
    }
    return {
      ...req,
      ewasteItems: items,
      collector,
      citizen: usersDb.get(req.citizenId) || null,
    };
  };

  if (!prisma.pickup) {
    prisma.pickup = {};
  }

  prisma.pickup.create = async ({ data }) => {
    const id = randomUUID();
    const newPickup = {
      id,
      collectionRequestId: data.collectionRequestId,
      collectorId: data.collectorId,
      status: data.status || PICKUP_STATUS.SCHEDULED,
      scheduledDate: data.scheduledDate || null,
      startedAt: null,
      completedAt: null,
      totalWeightKg: null,
      collectorNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pickupsDb.set(id, newPickup);
    return newPickup;
  };

  prisma.pickup.findUnique = async ({ where }) => {
    const pickup = pickupsDb.get(where.id);
    if (!pickup) return null;
    const req = requestsDb.get(pickup.collectionRequestId);
    const reqItems = req ? Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id) : [];
    const citizen = req ? usersDb.get(req.citizenId) : null;
    let collectorUser = null;
    for (const p of collectorProfilesDb.values()) {
      if (p.id === pickup.collectorId) {
        collectorUser = usersDb.get(p.userId);
        break;
      }
    }
    return {
      ...pickup,
      collectionRequest: req ? { ...req, ewasteItems: reqItems, citizen } : null,
      collector: {
        id: pickup.collectorId,
        userId: collectorUser ? collectorUser.id : null,
        user: collectorUser,
      },
    };
  };

  prisma.pickup.findMany = async ({ where, skip = 0, take = 20 }) => {
    let list = Array.from(pickupsDb.values());
    if (where.collectorId) {
      list = list.filter((p) => p.collectorId === where.collectorId);
    }
    if (where.status) {
      list = list.filter((p) => p.status === where.status);
    }
    return list.slice(skip, skip + take).map((pickup) => {
      const req = requestsDb.get(pickup.collectionRequestId);
      const reqItems = req ? Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id) : [];
      const citizen = req ? usersDb.get(req.citizenId) : null;
      return {
        ...pickup,
        collectionRequest: req ? { ...req, ewasteItems: reqItems, citizen } : null,
      };
    });
  };

  prisma.pickup.count = async ({ where }) => {
    let list = Array.from(pickupsDb.values());
    if (where.collectorId) {
      list = list.filter((p) => p.collectorId === where.collectorId);
    }
    if (where.status) {
      list = list.filter((p) => p.status === where.status);
    }
    return list.length;
  };

  prisma.pickup.update = async ({ where, data }) => {
    const pickup = pickupsDb.get(where.id);
    if (!pickup) throw new Error('Pickup not found');
    Object.assign(pickup, data, { updatedAt: new Date() });
    const req = requestsDb.get(pickup.collectionRequestId);
    const reqItems = req ? Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === req.id) : [];
    return {
      ...pickup,
      collectionRequest: req ? { ...req, ewasteItems: reqItems } : null,
    };
  };

  prisma.pickup.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const p of pickupsDb.values()) {
      if (where.collectionRequestId && p.collectionRequestId === where.collectionRequestId) {
        Object.assign(p, data, { updatedAt: new Date() });
        count++;
      }
    }
    return { count };
  };

  prisma.$transaction = async (fn) => {
    if (typeof fn === 'function') {
      return fn(prisma);
    }
    return Promise.all(fn);
  };

  const TEST_PORT = 3099;
  const server = app.listen(TEST_PORT);

  try {
    const citizen1Token = createToken({ userId: citizen1.id });
    const citizen2Token = createToken({ userId: citizen2.id });
    const collector1Token = createToken({ userId: collector1Verified.id });
    const collector2Token = createToken({ userId: collector2Verified.id });
    const unverifiedToken = createToken({ userId: collectorUnverified.id });
    const recyclerToken = createToken({ userId: recycler.id });
    const adminToken = createToken({ userId: admin.id });

    // Seed test items
    const item1 = {
      id: randomUUID(),
      citizenId: citizen1.id,
      category: EWASTE_CATEGORIES.LAPTOP,
      description: 'Old Laptop',
      quantity: 1,
      condition: ITEM_CONDITIONS.WORKING,
      estimatedWeightKg: 2.5,
      actualWeightKg: null,
      status: ITEM_STATUS.SUBMITTED,
      collectionRequestId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    itemsDb.set(item1.id, item1);

    const item2 = {
      id: randomUUID(),
      citizenId: citizen1.id,
      category: EWASTE_CATEGORIES.MOBILE_PHONE,
      description: 'Old Smartphone',
      quantity: 1,
      condition: ITEM_CONDITIONS.NOT_WORKING,
      estimatedWeightKg: 0.2,
      actualWeightKg: null,
      status: ITEM_STATUS.SUBMITTED,
      collectionRequestId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    itemsDb.set(item2.id, item2);

    // Seed test collection requests
    const draftRequestId = randomUUID();
    requestsDb.set(draftRequestId, {
      id: draftRequestId,
      citizenId: citizen1.id,
      status: REQUEST_STATUS.DRAFT,
      pickupAddress: '42 Sector 5, Connaught Place, New Delhi',
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      preferredDate: new Date('2026-10-01'),
      collectorId: null,
      submittedAt: null,
      acceptedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const eligibleRequestId = randomUUID();
    requestsDb.set(eligibleRequestId, {
      id: eligibleRequestId,
      citizenId: citizen1.id,
      status: REQUEST_STATUS.SUBMITTED,
      pickupAddress: '42 Sector 5, Connaught Place, New Delhi',
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      preferredDate: new Date('2026-10-01'),
      collectorId: null,
      submittedAt: new Date(),
      acceptedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    item1.collectionRequestId = eligibleRequestId;
    item2.collectionRequestId = eligibleRequestId;

    let createdPickupId = null;

    // =============================================================
    // 1. COLLECTOR ACCEPTANCE (POST /collection-requests/:id/accept)
    // =============================================================

    await testAsync('POST /collection-requests/:id/accept: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('POST /collection-requests/:id/accept: Citizen role rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /collection-requests/:id/accept: Recycler role rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${recyclerToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /collection-requests/:id/accept: Admin rejected per permission matrix (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /collection-requests/:id/accept: Unverified collector rejected by checkVerified (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${unverifiedToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /collection-requests/:id/accept: Request in DRAFT rejected (409 CONFLICT)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${draftRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'CONFLICT');
    });

    await testAsync('POST /collection-requests/:id/accept: Attempting to spoof collectorId or status in body rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          collectorId: collector2Profile.id,
          status: 'COMPLETED',
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('POST /collection-requests/:id/accept: Verified collector successfully accepts eligible request (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.request.status, REQUEST_STATUS.ACCEPTED);
      assert.strictEqual(data.data.request.collectorId, collector1Profile.id);
      assert.ok(data.data.request.acceptedAt);
      assert.strictEqual(data.data.pickup.status, PICKUP_STATUS.SCHEDULED);
      assert.strictEqual(data.data.pickup.collectorId, collector1Profile.id);
      assert.strictEqual(data.data.pickup.collectionRequestId, eligibleRequestId);
      createdPickupId = data.data.pickup.id;
    });

    await testAsync('POST /collection-requests/:id/accept: Race condition/Double acceptance rejected with 409 CONFLICT (EC-CR-03)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${collector2Token}` },
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'CONFLICT');
      assert.ok(data.error.message.includes('already been accepted'));
    });

    // =============================================================
    // 2. PRIVACY VERIFICATION
    // =============================================================

    await testAsync('GET /collection-requests/:id: Assigned collector sees exact unmasked address & contact details', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}`, {
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.request.pickupAddress, '42 Sector 5, Connaught Place, New Delhi');
      assert.strictEqual(data.data.request.pickupLat, 28.6139);
    });

    await testAsync('GET /collection-requests/:id: Unassigned collector cannot view accepted request of another collector (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${eligibleRequestId}`, {
        headers: { Authorization: `Bearer ${collector2Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    // =============================================================
    // 3. PICKUP LISTING (GET /api/v1/pickups)
    // =============================================================

    await testAsync('GET /pickups: Assigned collector lists own pickups (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups`, {
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data.pickups));
      assert.strictEqual(data.data.pickups.length, 1);
      assert.strictEqual(data.data.pickups[0].id, createdPickupId);
      assert.strictEqual(data.data.pickups[0].status, PICKUP_STATUS.SCHEDULED);
    });

    await testAsync('GET /pickups: Filter by status returns matching pickups (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups?status=SCHEDULED`, {
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.data.pickups.length, 1);

      const resEmpty = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups?status=COMPLETED`, {
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(resEmpty.status, 200);
      const dataEmpty = await resEmpty.json();
      assert.strictEqual(dataEmpty.data.pickups.length, 0);
    });

    await testAsync('GET /pickups: Citizen role cannot access /pickups list (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    // =============================================================
    // 4. PICKUP DETAILS (GET /api/v1/pickups/:id)
    // =============================================================

    await testAsync('GET /pickups/:id: Assigned collector views pickup details (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}`, {
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.pickup.id, createdPickupId);
      assert.strictEqual(data.data.pickup.status, PICKUP_STATUS.SCHEDULED);
      assert.ok(data.data.pickup.collectionRequest);
      assert.strictEqual(data.data.pickup.collectionRequest.citizen.name, citizen1.name);
      assert.strictEqual(data.data.pickup.collectionRequest.citizen.phone, citizen1.phone);
    });

    await testAsync('GET /pickups/:id: Request owner citizen views pickup details (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.pickup.id, createdPickupId);
    });

    await testAsync('GET /pickups/:id: Other citizen is blocked (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}`, {
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /pickups/:id: Other collector is blocked (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}`, {
        headers: { Authorization: `Bearer ${collector2Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /pickups/:id: Admin can view pickup details (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    await testAsync('GET /pickups/:id: Non-existent pickup returns 404', async () => {
      const nonExistent = randomUUID();
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${nonExistent}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    // =============================================================
    // 5. START PICKUP (PATCH /api/v1/pickups/:id/start)
    // =============================================================

    await testAsync('PATCH /pickups/:id/start: Citizen cannot start pickup (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    await testAsync('PATCH /pickups/:id/start: Unassigned collector cannot start pickup (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${collector2Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('PATCH /pickups/:id/start: Attempting to modify protected fields rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/start`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('PATCH /pickups/:id/start: Assigned collector successfully starts pickup (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.pickup.status, PICKUP_STATUS.IN_PROGRESS);
      assert.ok(data.data.pickup.startedAt);
    });

    await testAsync('PATCH /pickups/:id/start: Starting already IN_PROGRESS pickup rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'BAD_REQUEST');
      assert.ok(data.error.message.includes('SCHEDULED'));
    });

    // =============================================================
    // 6. COMPLETE PICKUP (PATCH /api/v1/pickups/:id/complete)
    // =============================================================

    await testAsync('PATCH /pickups/:id/complete: Missing required items or totalWeightKg rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          collectorNotes: 'Collected successfully',
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('PATCH /pickups/:id/complete: Item with invalid weight <= 0 rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          totalWeightKg: 2.7,
          items: [{ itemId: item1.id, actualWeightKg: -1 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    await testAsync('PATCH /pickups/:id/complete: Item not belonging to request rejected (400)', async () => {
      const foreignItemId = randomUUID();
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          totalWeightKg: 2.7,
          items: [{ itemId: foreignItemId, actualWeightKg: 2.5 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.message.includes('does not belong'));
    });

    await testAsync('PATCH /pickups/:id/complete: Unassigned collector rejected (403)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector2Token}`,
        },
        body: JSON.stringify({
          totalWeightKg: 2.7,
          items: [
            { itemId: item1.id, actualWeightKg: 2.5 },
            { itemId: item2.id, actualWeightKg: 0.2 },
          ],
        }),
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('PATCH /pickups/:id/complete: Assigned collector completes pickup with atomic state transitions (200)', async () => {
      const prevTotalPickups = collector1Profile.totalPickups || 0;
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          totalWeightKg: 2.7,
          collectorNotes: 'All items collected in good order',
          items: [
            { itemId: item1.id, actualWeightKg: 2.5 },
            { itemId: item2.id, actualWeightKg: 0.2 },
          ],
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.pickup.status, PICKUP_STATUS.COMPLETED);
      assert.ok(data.data.pickup.completedAt);
      assert.strictEqual(data.data.pickup.totalWeightKg, 2.7);

      // Verify CollectionRequest transitioned to PICKED_UP
      const updatedReq = requestsDb.get(eligibleRequestId);
      assert.strictEqual(updatedReq.status, REQUEST_STATUS.PICKED_UP);
      assert.ok(updatedReq.completedAt);

      // Verify items transitioned to COLLECTED and actualWeightKg recorded
      const updatedItem1 = itemsDb.get(item1.id);
      const updatedItem2 = itemsDb.get(item2.id);
      assert.strictEqual(updatedItem1.status, ITEM_STATUS.COLLECTED);
      assert.strictEqual(updatedItem1.actualWeightKg, 2.5);
      assert.strictEqual(updatedItem2.status, ITEM_STATUS.COLLECTED);
      assert.strictEqual(updatedItem2.actualWeightKg, 0.2);

      // Verify collector's totalPickups incremented
      assert.strictEqual(collector1Profile.totalPickups, prevTotalPickups + 1);
    });

    await testAsync('PATCH /pickups/:id/complete: Completing already completed pickup rejected (400)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/pickups/${createdPickupId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${collector1Token}`,
        },
        body: JSON.stringify({
          totalWeightKg: 2.7,
          items: [
            { itemId: item1.id, actualWeightKg: 2.5 },
            { itemId: item2.id, actualWeightKg: 0.2 },
          ],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'BAD_REQUEST');
    });

    // =============================================================
    // 7. CANCELLATION CONSISTENCY (EC-CR-04)
    // =============================================================

    await testAsync('POST /collection-requests/:id/cancel: Cancelling an accepted request also cancels linked pickup (200)', async () => {
      // Create another request in SUBMITTED status and accept it
      const cancelTestReqId = randomUUID();
      requestsDb.set(cancelTestReqId, {
        id: cancelTestReqId,
        citizenId: citizen2.id,
        status: REQUEST_STATUS.SUBMITTED,
        pickupAddress: '10 Civil Lines, Delhi',
        pickupLat: 28.6700,
        pickupLng: 77.2200,
        preferredDate: new Date('2026-10-05'),
        collectorId: null,
        submittedAt: new Date(),
        acceptedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cancelTestItem = {
        id: randomUUID(),
        citizenId: citizen2.id,
        category: EWASTE_CATEGORIES.BATTERY,
        status: ITEM_STATUS.SUBMITTED,
        collectionRequestId: cancelTestReqId,
      };
      itemsDb.set(cancelTestItem.id, cancelTestItem);

      // Collector 1 accepts request
      const acceptRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${cancelTestReqId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${collector1Token}` },
      });
      assert.strictEqual(acceptRes.status, 200);
      const acceptData = await acceptRes.json();
      const cancelPickupId = acceptData.data.pickup.id;

      // Citizen 2 cancels request with valid reason
      const cancelRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/collection-requests/${cancelTestReqId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${citizen2Token}`,
        },
        body: JSON.stringify({ reason: 'Accidentally created duplicate request' }),
      });
      assert.strictEqual(cancelRes.status, 200);

      // Check CollectionRequest status is CANCELLED
      const cancelledReq = requestsDb.get(cancelTestReqId);
      assert.strictEqual(cancelledReq.status, REQUEST_STATUS.CANCELLED);

      // Check linked Pickup status is CANCELLED (EC-CR-04)
      const cancelledPickup = pickupsDb.get(cancelPickupId);
      assert.strictEqual(cancelledPickup.status, PICKUP_STATUS.CANCELLED);
    });

  } finally {
    // Restore Prisma Mocks
    prisma.user.findUnique = origUserFindUnique;
    prisma.collectorProfile.findUnique = origCollectorFindUnique;
    prisma.collectorProfile.update = origCollectorUpdate;

    prisma.ewasteItem.create = origItemCreate;
    prisma.ewasteItem.findMany = origItemFindMany;
    prisma.ewasteItem.findUnique = origItemFindUnique;
    prisma.ewasteItem.count = origItemCount;
    prisma.ewasteItem.update = origItemUpdate;
    prisma.ewasteItem.updateMany = origItemUpdateMany;

    prisma.collectionRequest.create = origReqCreate;
    prisma.collectionRequest.findMany = origReqFindMany;
    prisma.collectionRequest.findUnique = origReqFindUnique;
    prisma.collectionRequest.count = origReqCount;
    prisma.collectionRequest.update = origReqUpdate;

    if (origPickupCreate) prisma.pickup.create = origPickupCreate;
    if (origPickupFindMany) prisma.pickup.findMany = origPickupFindMany;
    if (origPickupFindUnique) prisma.pickup.findUnique = origPickupFindUnique;
    if (origPickupCount) prisma.pickup.count = origPickupCount;
    if (origPickupUpdate) prisma.pickup.update = origPickupUpdate;
    if (origPickupUpdateMany) prisma.pickup.updateMany = origPickupUpdateMany;
    prisma.$transaction = origTransaction;

    server.close();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runCollectorAcceptanceAndPickupTests().catch((err) => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
