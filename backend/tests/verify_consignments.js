// EcoSetu Recycler Consignment Workflow Test Suite
// Canonical Reference: docs/04_DATABASE_SCHEMA.md, docs/05_API_SPECIFICATION.md Section 9, docs/06_ROLES_AND_PERMISSIONS.md, docs/07_BUSINESS_WORKFLOWS.md Section 2.3, docs/23_NOTIFICATION_SYSTEM.md, docs/24_ERROR_EDGE_CASES.md Section 3

const assert = require('assert');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const {
  ROLES,
  USER_STATUS,
  ITEM_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  NOTIFICATION_TYPES,
} = require('../src/utils/constants');

async function runConsignmentTests() {
  console.log('====================================================');
  console.log('ECOSETU RECYCLER CONSIGNMENT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

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

  function createToken(userOrPayload) {
    const payload = userOrPayload.userId ? userOrPayload : { userId: userOrPayload.id };
    return jwt.sign(payload, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  // --- Test Identities ---
  const citizen = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen@ecosetu.org',
    name: 'Citizen Alice',
    phone: '+919876543210',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector1Verified = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector1@ecosetu.org',
    name: 'Collector Ramesh',
    phone: '+919876543211',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collector2Verified = {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'collector2@ecosetu.org',
    name: 'Collector Suresh',
    phone: '+919876543212',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collectorUnverified = {
    id: 'b3333333-3333-4333-8333-333333333333',
    email: 'collector.pending@ecosetu.org',
    name: 'Collector Dinesh',
    phone: '+919876543213',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.PENDING_VERIFICATION,
  };

  const recycler1Verified = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler1@ecosetu.org',
    name: 'Green Tech Recyclers',
    phone: '+919876543214',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const recycler2Verified = {
    id: 'c2222222-2222-4222-8222-222222222222',
    email: 'recycler2@ecosetu.org',
    name: 'Apex Recyclers Ltd',
    phone: '+919876543215',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const recyclerUnverified = {
    id: 'c3333333-3333-4333-8333-333333333333',
    email: 'recycler.pending@ecosetu.org',
    name: 'Pending Recyclers',
    phone: '+919876543216',
    role: ROLES.RECYCLER,
    status: USER_STATUS.PENDING_VERIFICATION,
  };

  const admin = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin EcoSetu',
    phone: '+919876543217',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  // --- Profiles ---
  const collector1Profile = {
    id: 'd1111111-1111-4111-8111-111111111111',
    userId: collector1Verified.id,
    serviceAreaLat: 28.6139,
    serviceAreaLng: 77.2090,
    serviceRadiusKm: 10.0,
    isAvailable: true,
    totalPickups: 5,
    user: collector1Verified,
  };

  const collector2Profile = {
    id: 'd2222222-2222-4222-8222-222222222222',
    userId: collector2Verified.id,
    serviceAreaLat: 28.6200,
    serviceAreaLng: 77.2100,
    serviceRadiusKm: 5.0,
    isAvailable: true,
    totalPickups: 2,
    user: collector2Verified,
  };

  const recycler1Profile = {
    id: 'f1111111-1111-4111-8111-111111111111',
    userId: recycler1Verified.id,
    facilityName: 'Green Tech Recyclers Facility',
    facilityAddress: '123 Industrial Area, Phase 1, New Delhi',
    facilityLat: 28.65,
    facilityLng: 77.25,
    totalConsignments: 0,
    user: recycler1Verified,
  };

  const recycler2Profile = {
    id: 'f2222222-2222-4222-8222-222222222222',
    userId: recycler2Verified.id,
    facilityName: 'Apex Recyclers Facility',
    facilityAddress: '456 Okhla Phase 2, New Delhi',
    facilityLat: 28.53,
    facilityLng: 77.27,
    totalConsignments: 3,
    user: recycler2Verified,
  };

  const recyclerUnverifiedProfile = {
    id: 'f3333333-3333-4333-8333-333333333333',
    userId: recyclerUnverified.id,
    facilityName: 'Pending Recyclers Facility',
    facilityAddress: '789 Unverified Road, Delhi',
    totalConsignments: 0,
    user: recyclerUnverified,
  };

  // --- In-Memory DB Stores ---
  const usersDb = new Map();
  [
    citizen,
    collector1Verified,
    collector2Verified,
    collectorUnverified,
    recycler1Verified,
    recycler2Verified,
    recyclerUnverified,
    admin,
  ].forEach((u) => usersDb.set(u.id, u));

  const collectorProfilesDb = new Map();
  collectorProfilesDb.set(collector1Profile.userId, collector1Profile);
  collectorProfilesDb.set(collector2Profile.userId, collector2Profile);

  const recyclerProfilesDb = new Map();
  recyclerProfilesDb.set(recycler1Profile.id, recycler1Profile);
  recyclerProfilesDb.set(recycler2Profile.id, recycler2Profile);
  recyclerProfilesDb.set(recyclerUnverifiedProfile.id, recyclerUnverifiedProfile);

  const itemsDb = new Map();
  const consignmentsDb = new Map();
  const consignmentItemsDb = new Map();
  const recyclingRecordsDb = new Map();
  const notificationsDb = [];

  // Seed Items
  const item1 = {
    id: '81111111-1111-4111-8111-111111111111',
    citizenId: citizen.id,
    category: 'MOBILE_PHONE',
    status: ITEM_STATUS.COLLECTED,
    actualWeightKg: 0.25,
    estimatedWeightKg: 0.2,
    collectionRequestId: 'req-1',
    collectionRequest: { collectorId: collector1Profile.id },
  };

  const item2 = {
    id: '82222222-2222-4222-8222-222222222222',
    citizenId: citizen.id,
    category: 'LAPTOP',
    status: ITEM_STATUS.COLLECTED,
    actualWeightKg: 2.1,
    estimatedWeightKg: 2.0,
    collectionRequestId: 'req-1',
    collectionRequest: { collectorId: collector1Profile.id },
  };

  const item3 = {
    id: '83333333-3333-4333-8333-333333333333',
    citizenId: citizen.id,
    category: 'BATTERY',
    status: ITEM_STATUS.COLLECTED,
    actualWeightKg: 0.5,
    estimatedWeightKg: 0.5,
    collectionRequestId: 'req-1',
    collectionRequest: { collectorId: collector1Profile.id },
  };

  const itemSubmitted = {
    id: '84444444-4444-4444-8444-444444444444',
    citizenId: citizen.id,
    category: 'MONITOR',
    status: ITEM_STATUS.SUBMITTED,
    actualWeightKg: null,
    estimatedWeightKg: 4.0,
    collectionRequestId: 'req-1',
    collectionRequest: { collectorId: collector1Profile.id },
  };

  const itemCollector2 = {
    id: '85555555-5555-4555-8555-555555555555',
    citizenId: citizen.id,
    category: 'DESKTOP',
    status: ITEM_STATUS.COLLECTED,
    actualWeightKg: 8.0,
    estimatedWeightKg: 8.0,
    collectionRequestId: 'req-2',
    collectionRequest: { collectorId: collector2Profile.id },
  };

  [item1, item2, item3, itemSubmitted, itemCollector2].forEach((item) => itemsDb.set(item.id, { ...item }));

  // --- Save Original Prisma Methods ---
  const origUserFindUnique = prisma.user.findUnique;
  const origCollectorProfileFindUnique = prisma.collectorProfile.findUnique;
  const origCollectorProfileUpdate = prisma.collectorProfile.update;
  const origRecyclerProfileFindUnique = prisma.recyclerProfile.findUnique;
  const origRecyclerProfileUpdate = prisma.recyclerProfile.update;
  const origItemFindUnique = prisma.ewasteItem.findUnique;
  const origItemFindMany = prisma.ewasteItem.findMany;
  const origItemUpdateMany = prisma.ewasteItem.updateMany;
  const origConsignmentCreate = prisma.consignment ? prisma.consignment.create : undefined;
  const origConsignmentFindUnique = prisma.consignment ? prisma.consignment.findUnique : undefined;
  const origConsignmentFindMany = prisma.consignment ? prisma.consignment.findMany : undefined;
  const origConsignmentCount = prisma.consignment ? prisma.consignment.count : undefined;
  const origConsignmentUpdate = prisma.consignment ? prisma.consignment.update : undefined;
  const origRecyclingRecordCreate = prisma.recyclingRecord ? prisma.recyclingRecord.create : undefined;
  const origNotificationCreate = prisma.notification.create;
  const origTransaction = prisma.$transaction;

  // --- Mock Implementations ---
  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;

  prisma.collectorProfile.findUnique = async ({ where }) => {
    if (where.userId) return collectorProfilesDb.get(where.userId) || null;
    if (where.id) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === where.id) return p;
      }
    }
    return null;
  };

  prisma.recyclerProfile.findUnique = async ({ where }) => {
    if (where.id) return recyclerProfilesDb.get(where.id) || null;
    if (where.userId) {
      for (const p of recyclerProfilesDb.values()) {
        if (p.userId === where.userId) return p;
      }
    }
    return null;
  };

  prisma.recyclerProfile.update = async ({ where, data }) => {
    const profile = recyclerProfilesDb.get(where.id);
    if (!profile) throw new Error('Recycler profile not found');
    if (data.totalConsignments && data.totalConsignments.increment) {
      profile.totalConsignments = (profile.totalConsignments || 0) + data.totalConsignments.increment;
    }
    return profile;
  };

  prisma.ewasteItem.findUnique = async ({ where }) => {
    const item = itemsDb.get(where.id);
    if (!item) return null;
    return { ...item };
  };

  prisma.ewasteItem.findMany = async ({ where }) => {
    let list = Array.from(itemsDb.values());
    if (where && where.id && where.id.in) {
      list = list.filter((i) => where.id.in.includes(i.id));
    }
    return list.map((item) => {
      const cItems = [];
      for (const ci of consignmentItemsDb.values()) {
        if (ci.ewasteItemId === item.id) {
          const consignment = consignmentsDb.get(ci.consignmentId);
          cItems.push({ ...ci, consignment });
        }
      }
      return {
        ...item,
        consignmentItems: cItems,
      };
    });
  };

  prisma.ewasteItem.updateMany = async ({ where, data }) => {
    let count = 0;
    if (where && where.id && where.id.in) {
      for (const id of where.id.in) {
        const item = itemsDb.get(id);
        if (item) {
          Object.assign(item, data);
          count++;
        }
      }
    }
    return { count };
  };

  if (!prisma.consignment) prisma.consignment = {};
  prisma.consignment.create = async ({ data, include }) => {
    const id = randomUUID();
    const now = new Date();
    const consignment = {
      id,
      collectorId: data.collectorId,
      recyclerId: data.recyclerId,
      status: data.status || CONSIGNMENT_STATUS.CREATED,
      totalWeightKg: data.totalWeightKg || null,
      totalItems: data.totalItems || 0,
      deliveryNotes: data.deliveryNotes || null,
      deliveredAt: null,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };
    consignmentsDb.set(id, consignment);

    if (data.consignmentItems && data.consignmentItems.create) {
      for (const ci of data.consignmentItems.create) {
        const ciId = randomUUID();
        consignmentItemsDb.set(ciId, {
          id: ciId,
          consignmentId: id,
          ewasteItemId: ci.ewasteItemId,
          createdAt: now,
        });
      }
    }

    const res = { ...consignment };
    if (include && include.consignmentItems) {
      const cItems = [];
      for (const ci of consignmentItemsDb.values()) {
        if (ci.consignmentId === id) {
          cItems.push({
            ...ci,
            ewasteItem: itemsDb.get(ci.ewasteItemId),
          });
        }
      }
      res.consignmentItems = cItems;
    }
    if (include && include.recycler) {
      res.recycler = recyclerProfilesDb.get(data.recyclerId);
    }
    if (include && include.collector) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === data.collectorId) {
          res.collector = p;
          break;
        }
      }
    }
    return res;
  };

  prisma.consignment.findUnique = async ({ where, include }) => {
    const c = consignmentsDb.get(where.id);
    if (!c) return null;
    const res = { ...c };
    if (include && include.consignmentItems) {
      const cItems = [];
      for (const ci of consignmentItemsDb.values()) {
        if (ci.consignmentId === c.id) {
          cItems.push({
            ...ci,
            ewasteItem: itemsDb.get(ci.ewasteItemId),
          });
        }
      }
      res.consignmentItems = cItems;
    }
    if (include && include.collector) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === c.collectorId) {
          res.collector = p;
          break;
        }
      }
    }
    if (include && include.recycler) {
      res.recycler = recyclerProfilesDb.get(c.recyclerId);
    }
    return res;
  };

  prisma.consignment.findMany = async ({ where, skip = 0, take = 20, orderBy, include }) => {
    let list = Array.from(consignmentsDb.values());
    if (where && where.collectorId) {
      list = list.filter((c) => c.collectorId === where.collectorId);
    }
    if (where && where.recyclerId) {
      list = list.filter((c) => c.recyclerId === where.recyclerId);
    }
    if (where && where.status) {
      list = list.filter((c) => c.status === where.status);
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const sliced = list.slice(skip, skip + take);

    return sliced.map((c) => {
      const res = { ...c };
      if (include && include.consignmentItems) {
        const cItems = [];
        for (const ci of consignmentItemsDb.values()) {
          if (ci.consignmentId === c.id) {
            cItems.push({
              ...ci,
              ewasteItem: itemsDb.get(ci.ewasteItemId),
            });
          }
        }
        res.consignmentItems = cItems;
      }
      if (include && include.collector) {
        for (const p of collectorProfilesDb.values()) {
          if (p.id === c.collectorId) {
            res.collector = p;
            break;
          }
        }
      }
      if (include && include.recycler) {
        res.recycler = recyclerProfilesDb.get(c.recyclerId);
      }
      return res;
    });
  };

  prisma.consignment.count = async ({ where }) => {
    let list = Array.from(consignmentsDb.values());
    if (where && where.collectorId) {
      list = list.filter((c) => c.collectorId === where.collectorId);
    }
    if (where && where.recyclerId) {
      list = list.filter((c) => c.recyclerId === where.recyclerId);
    }
    if (where && where.status) {
      list = list.filter((c) => c.status === where.status);
    }
    return list.length;
  };

  prisma.consignment.update = async ({ where, data, include }) => {
    const c = consignmentsDb.get(where.id);
    if (!c) throw new Error('Consignment not found');
    Object.assign(c, data, { updatedAt: new Date() });
    consignmentsDb.set(where.id, c);

    const res = { ...c };
    if (include && include.consignmentItems) {
      const cItems = [];
      for (const ci of consignmentItemsDb.values()) {
        if (ci.consignmentId === c.id) {
          cItems.push({
            ...ci,
            ewasteItem: itemsDb.get(ci.ewasteItemId),
          });
        }
      }
      res.consignmentItems = cItems;
    }
    if (include && include.collector) {
      for (const p of collectorProfilesDb.values()) {
        if (p.id === c.collectorId) {
          res.collector = p;
          break;
        }
      }
    }
    if (include && include.recycler) {
      res.recycler = recyclerProfilesDb.get(c.recyclerId);
    }
    return res;
  };

  if (!prisma.recyclingRecord) prisma.recyclingRecord = {};
  prisma.recyclingRecord.create = async ({ data }) => {
    const id = randomUUID();
    const record = {
      id,
      consignmentId: data.consignmentId,
      recyclerId: data.recyclerId,
      status: data.status || RECYCLING_STATUS.RECEIVED,
      receivedAt: data.receivedAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    recyclingRecordsDb.set(id, record);
    return record;
  };

  prisma.notification.create = async ({ data }) => {
    const id = randomUUID();
    const notif = {
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      isRead: false,
      createdAt: new Date(),
    };
    notificationsDb.push(notif);
    return notif;
  };

  prisma.$transaction = async (cb) => {
    if (typeof cb === 'function') {
      return await cb(prisma);
    }
    return Array.isArray(cb) ? Promise.all(cb) : cb;
  };

  // --- HTTP Request Helper ---
  const http = require('http');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  async function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const dataStr = body ? JSON.stringify(body) : null;
      if (dataStr) {
        headers['Content-Length'] = Buffer.byteLength(dataStr);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers,
        },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = rawData ? JSON.parse(rawData) : null;
              resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            } catch (err) {
              resolve({ status: res.statusCode, headers: res.headers, rawText: rawData });
            }
          });
        }
      );

      req.on('error', reject);
      if (dataStr) {
        req.write(dataStr);
      }
      req.end();
    });
  }

  // --- Tokens ---
  const citizenToken = createToken(citizen);
  const collector1Token = createToken(collector1Verified);
  const collector2Token = createToken(collector2Verified);
  const collectorUnverifiedToken = createToken(collectorUnverified);
  const recycler1Token = createToken(recycler1Verified);
  const recycler2Token = createToken(recycler2Verified);
  const recyclerUnverifiedToken = createToken(recyclerUnverified);
  const adminToken = createToken(admin);

  let createdConsignmentId = null;
  let rejectedConsignmentId = null;

  try {
    // -------------------------------------------------------------
    // PART A: CREATION & VALIDATION TESTS
    // -------------------------------------------------------------

    await testAsync('POST /consignments: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('POST', '/api/v1/consignments', {
        recyclerId: recycler1Profile.id,
        itemIds: [item1.id],
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    await testAsync('POST /consignments: Citizen role rejected (403)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [item1.id],
        },
        citizenToken
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /consignments: Recycler role rejected (403)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [item1.id],
        },
        recycler1Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /consignments: Unverified collector blocked by checkVerified (403)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [item1.id],
        },
        collectorUnverifiedToken
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('POST /consignments: Missing recyclerId rejected (400)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          itemIds: [item1.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('POST /consignments: Empty itemIds array rejected (400)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('POST /consignments: Duplicate itemIds in request rejected (400)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [item1.id, item1.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(JSON.stringify(res.body.error).includes('Duplicate'));
    });

    await testAsync('POST /consignments: Client attempting to set protected status rejected (400)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [item1.id],
          status: 'ACCEPTED',
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(JSON.stringify(res.body.error).includes('status'));
    });

    await testAsync('POST /consignments: Non-existent recycler returns 404', async () => {
      const nonExistentRecyclerId = randomUUID();
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: nonExistentRecyclerId,
          itemIds: [item1.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('POST /consignments: Unverified recycler rejected (400) (BR-CO-03)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recyclerUnverifiedProfile.id,
          itemIds: [item1.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('verified recycler'));
    });

    await testAsync('POST /consignments: Non-existent item returns 404', async () => {
      const nonExistentItemId = randomUUID();
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [nonExistentItemId],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('POST /consignments: Consigning items collected by another collector rejected (403)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [itemCollector2.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('only consign items that you collected'));
    });

    await testAsync('POST /consignments: Items not in COLLECTED status rejected (400) (BR-CO-01, EC-CO-02)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [itemSubmitted.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Items must be in COLLECTED status'));
    });

    await testAsync('POST /consignments: Verified collector creates consignment with status CREATED (201)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler1Profile.id,
          itemIds: [item1.id, item2.id],
          deliveryNotes: 'Delivering smartphones and laptops batch',
        },
        collector1Token
      );
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.consignment);
      assert.strictEqual(res.body.data.consignment.status, CONSIGNMENT_STATUS.CREATED);
      assert.strictEqual(res.body.data.consignment.totalItems, 2);
      assert.strictEqual(res.body.data.consignment.collectorId, collector1Profile.id);
      assert.strictEqual(res.body.data.consignment.recyclerId, recycler1Profile.id);
      createdConsignmentId = res.body.data.consignment.id;
    });

    await testAsync('POST /consignments: Generates CONSIGNMENT_INCOMING notification for receiving recycler', async () => {
      const incomingNotif = notificationsDb.find(
        (n) => n.userId === recycler1Verified.id && n.type === NOTIFICATION_TYPES.CONSIGNMENT_INCOMING
      );
      assert(incomingNotif, 'CONSIGNMENT_INCOMING notification was not created');
      assert.strictEqual(incomingNotif.title, 'Incoming Consignment');
      assert(incomingNotif.message.includes('2 items'));
      assert.strictEqual(incomingNotif.referenceId, createdConsignmentId);
    });

    await testAsync('POST /consignments: Consigning item already in active consignment rejected (400) (BR-CO-02)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler2Profile.id,
          itemIds: [item1.id],
        },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('already in an active consignment'));
    });

    // -------------------------------------------------------------
    // PART B: RETRIEVAL ENDPOINTS
    // -------------------------------------------------------------

    await testAsync('GET /consignments: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('GET /consignments: Citizen role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, citizenToken);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('GET /consignments: Collector lists own consignments (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, collector1Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(Array.isArray(res.body.data.consignments));
      assert(res.body.data.consignments.length >= 1);
      assert.strictEqual(res.body.data.consignments[0].collectorId, collector1Profile.id);
      assert(res.body.data.pagination);
    });

    await testAsync('GET /consignments: Other collector cannot see collector1 consignments (200 empty)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, collector2Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.consignments.length, 0);
    });

    await testAsync('GET /consignments: Receiving recycler lists received consignments (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, recycler1Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.consignments.length >= 1);
      assert.strictEqual(res.body.data.consignments[0].recyclerId, recycler1Profile.id);
    });

    await testAsync('GET /consignments: Other recycler sees 0 received consignments (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, recycler2Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.consignments.length, 0);
    });

    await testAsync('GET /consignments: Admin lists all consignments (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.consignments.length >= 1);
    });

    await testAsync('GET /consignments: Status filter returns matching consignments (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments?status=CREATED', null, collector1Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.consignments.every((c) => c.status === CONSIGNMENT_STATUS.CREATED));
    });

    // -------------------------------------------------------------
    // PART C: DELIVER LIFECYCLE
    // -------------------------------------------------------------

    await testAsync('PATCH /consignments/:id/deliver: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${createdConsignmentId}/deliver`);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/deliver: Recycler role rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/deliver`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/deliver: Other collector delivering rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/deliver`,
        null,
        collector2Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('only deliver your own consignments'));
    });

    await testAsync('PATCH /consignments/:id/deliver: Non-existent consignment returns 404', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${randomUUID()}/deliver`,
        null,
        collector1Token
      );
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/deliver: Delivering collector marks consignment DELIVERED (200)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/deliver`,
        null,
        collector1Token
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.consignment.status, CONSIGNMENT_STATUS.DELIVERED);
      assert(res.body.data.consignment.deliveredAt);
    });

    await testAsync('PATCH /consignments/:id/deliver: Marking already DELIVERED consignment rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/deliver`,
        null,
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Status must be CREATED or IN_TRANSIT'));
    });

    // -------------------------------------------------------------
    // PART D: ACCEPT LIFECYCLE
    // -------------------------------------------------------------

    await testAsync('PATCH /consignments/:id/accept: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('PATCH', `/api/v1/consignments/${createdConsignmentId}/accept`);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/accept: Collector role rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/accept`,
        null,
        collector1Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/accept: Unverified recycler rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/accept`,
        null,
        recyclerUnverifiedToken
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/accept: Unassigned recycler rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/accept`,
        null,
        recycler2Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('only accept consignments delivered to your facility'));
    });

    await testAsync('PATCH /consignments/:id/accept: Assigned recycler accepts DELIVERED consignment (200)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/accept`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.consignment.status, CONSIGNMENT_STATUS.ACCEPTED);
      assert(res.body.data.consignment.acceptedAt);
      assert(res.body.data.consignment.recyclingRecord);
      assert.strictEqual(res.body.data.consignment.recyclingRecord.status, RECYCLING_STATUS.RECEIVED);
    });

    await testAsync('PATCH /consignments/:id/accept: Transitions linked e-waste items to CONSIGNED (BR-CO-01)', async () => {
      const item1Updated = itemsDb.get(item1.id);
      const item2Updated = itemsDb.get(item2.id);
      assert.strictEqual(item1Updated.status, ITEM_STATUS.CONSIGNED);
      assert.strictEqual(item2Updated.status, ITEM_STATUS.CONSIGNED);
    });

    await testAsync('PATCH /consignments/:id/accept: Increments recycler totalConsignments counter', async () => {
      const rProfile = recyclerProfilesDb.get(recycler1Profile.id);
      assert.strictEqual(rProfile.totalConsignments, 1);
    });

    await testAsync('PATCH /consignments/:id/accept: Generates CONSIGNMENT_ACCEPTED notification for collector', async () => {
      const acceptNotif = notificationsDb.find(
        (n) => n.userId === collector1Verified.id && n.type === NOTIFICATION_TYPES.CONSIGNMENT_ACCEPTED
      );
      assert(acceptNotif, 'CONSIGNMENT_ACCEPTED notification was not found');
      assert.strictEqual(acceptNotif.title, 'Consignment Accepted');
      assert(acceptNotif.message.includes(recycler1Profile.facilityName));
      assert.strictEqual(acceptNotif.referenceId, createdConsignmentId);
    });

    await testAsync('PATCH /consignments/:id/accept: Accepting already ACCEPTED consignment rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/accept`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Consignment must be in DELIVERED status'));
    });

    // -------------------------------------------------------------
    // PART E: REJECT LIFECYCLE & RE-CONSIGNMENT
    // -------------------------------------------------------------

    // Create a new consignment to test rejection workflow
    const createRes2 = await makeRequest(
      'POST',
      '/api/v1/consignments',
      {
        recyclerId: recycler1Profile.id,
        itemIds: [item3.id],
        deliveryNotes: 'Consignment for rejection test',
      },
      collector1Token
    );
    assert.strictEqual(createRes2.status, 201);
    rejectedConsignmentId = createRes2.body.data.consignment.id;

    await testAsync('PATCH /consignments/:id/reject: Missing reason rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${rejectedConsignmentId}/reject`,
        {},
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/reject: Unassigned recycler rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${rejectedConsignmentId}/reject`,
        { reason: 'Material damaged' },
        recycler2Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /consignments/:id/reject: Rejecting already ACCEPTED consignment rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/reject`,
        { reason: 'Too late' },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Cannot reject an already accepted consignment'));
    });

    await testAsync('PATCH /consignments/:id/reject: Assigned recycler rejects consignment with reason (200)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${rejectedConsignmentId}/reject`,
        { reason: 'Batteries show signs of leakage, cannot accept' },
        recycler1Token
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.consignment.status, CONSIGNMENT_STATUS.REJECTED);
      assert(res.body.data.consignment.rejectedAt);
      assert.strictEqual(
        res.body.data.consignment.rejectionReason,
        'Batteries show signs of leakage, cannot accept'
      );
    });

    await testAsync('PATCH /consignments/:id/reject: Generates CONSIGNMENT_REJECTED notification for collector', async () => {
      const rejectNotif = notificationsDb.find(
        (n) => n.userId === collector1Verified.id && n.type === NOTIFICATION_TYPES.CONSIGNMENT_REJECTED
      );
      assert(rejectNotif, 'CONSIGNMENT_REJECTED notification was not found');
      assert.strictEqual(rejectNotif.title, 'Consignment Rejected');
      assert(rejectNotif.message.includes('Batteries show signs of leakage'));
      assert.strictEqual(rejectNotif.referenceId, rejectedConsignmentId);
    });

    await testAsync('EC-CO-01: Rejected items remain in COLLECTED status', async () => {
      const item3Updated = itemsDb.get(item3.id);
      assert.strictEqual(item3Updated.status, ITEM_STATUS.COLLECTED);
    });

    await testAsync('PATCH /consignments/:id/reject: Rejecting already REJECTED consignment rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${rejectedConsignmentId}/reject`,
        { reason: 'Duplicate rejection' },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Consignment is already rejected'));
    });

    await testAsync('EC-CO-01 Recovery: Rejected item can be re-consigned to a different recycler (201)', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/consignments',
        {
          recyclerId: recycler2Profile.id,
          itemIds: [item3.id],
          deliveryNotes: 'Re-consigning to specialized battery recycler',
        },
        collector1Token
      );
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.consignment.recyclerId, recycler2Profile.id);
      assert.strictEqual(res.body.data.consignment.status, CONSIGNMENT_STATUS.CREATED);
    });

    // -------------------------------------------------------------
    // PART F: SECURITY VERIFICATION
    // -------------------------------------------------------------

    await testAsync('Security: Protected fields rejected in delivery request', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/consignments/${createdConsignmentId}/deliver`,
        { status: 'ACCEPTED', totalItems: 999 },
        collector1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('Security: Zero password, JWT, or internal credential leaks in response', async () => {
      const res = await makeRequest('GET', '/api/v1/consignments', null, collector1Token);
      const str = JSON.stringify(res.body);
      assert(!str.includes('passwordHash'), 'passwordHash found in response');
      assert(!str.includes('jwtAccessSecret'), 'jwtAccessSecret found in response');
    });

  } finally {
    // Restore mocks
    prisma.user.findUnique = origUserFindUnique;
    prisma.collectorProfile.findUnique = origCollectorProfileFindUnique;
    prisma.collectorProfile.update = origCollectorProfileUpdate;
    prisma.recyclerProfile.findUnique = origRecyclerProfileFindUnique;
    prisma.recyclerProfile.update = origRecyclerProfileUpdate;
    prisma.ewasteItem.findUnique = origItemFindUnique;
    prisma.ewasteItem.findMany = origItemFindMany;
    prisma.ewasteItem.updateMany = origItemUpdateMany;
    if (origConsignmentCreate) prisma.consignment.create = origConsignmentCreate;
    if (origConsignmentFindUnique) prisma.consignment.findUnique = origConsignmentFindUnique;
    if (origConsignmentFindMany) prisma.consignment.findMany = origConsignmentFindMany;
    if (origConsignmentCount) prisma.consignment.count = origConsignmentCount;
    if (origConsignmentUpdate) prisma.consignment.update = origConsignmentUpdate;
    if (origRecyclingRecordCreate) prisma.recyclingRecord.create = origRecyclingRecordCreate;
    prisma.notification.create = origNotificationCreate;
    prisma.$transaction = origTransaction;

    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`CONSIGNMENT TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runConsignmentTests().catch((err) => {
  console.error('Fatal error running consignment tests:', err);
  process.exit(1);
});
