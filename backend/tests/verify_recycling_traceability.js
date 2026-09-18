// EcoSetu Recycling & Traceability Test Suite
// Canonical Reference: docs/04_DATABASE_SCHEMA.md, docs/05_API_SPECIFICATION.md Sections 6 & 10, docs/06_ROLES_AND_PERMISSIONS.md, docs/07_BUSINESS_WORKFLOWS.md Section 3.2, docs/21_TRACEABILITY_AND_AUDIT.md, docs/23_NOTIFICATION_SYSTEM.md, docs/24_ERROR_EDGE_CASES.md

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

async function runRecyclingAndTraceabilityTests() {
  console.log('====================================================');
  console.log('ECOSETU RECYCLING + TRACEABILITY TEST SUITE');
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
  const citizen1 = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'alice@ecosetu.org',
    name: 'Alice Citizen',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'bob@ecosetu.org',
    name: 'Bob Citizen',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collectorVerified = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector@ecosetu.org',
    name: 'Collector Ramesh',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const recycler1Verified = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler1@ecosetu.org',
    name: 'Recycler Manager 1',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const recycler2Verified = {
    id: 'c2222222-2222-4222-8222-222222222222',
    email: 'recycler2@ecosetu.org',
    name: 'Recycler Manager 2',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const recyclerUnverified = {
    id: 'c3333333-3333-4333-8333-333333333333',
    email: 'recycler.pending@ecosetu.org',
    name: 'Pending Recycler',
    role: ROLES.RECYCLER,
    status: USER_STATUS.PENDING_VERIFICATION,
  };

  const admin = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin EcoSetu',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  // --- Profiles ---
  const collectorProfile = {
    id: 'd1111111-1111-4111-8111-111111111111',
    userId: collectorVerified.id,
    user: collectorVerified,
  };

  const recycler1Profile = {
    id: 'f1111111-1111-4111-8111-111111111111',
    userId: recycler1Verified.id,
    facilityName: 'CleanEarth Recycling Facility',
    totalConsignments: 2,
    user: recycler1Verified,
  };

  const recycler2Profile = {
    id: 'f2222222-2222-4222-8222-222222222222',
    userId: recycler2Verified.id,
    facilityName: 'Apex Materials Plant',
    totalConsignments: 1,
    user: recycler2Verified,
  };

  const recyclerUnverifiedProfile = {
    id: 'f3333333-3333-4333-8333-333333333333',
    userId: recyclerUnverified.id,
    facilityName: 'Unverified Facility',
    user: recyclerUnverified,
  };

  // --- In-Memory DB Stores ---
  const usersDb = new Map();
  [citizen1, citizen2, collectorVerified, recycler1Verified, recycler2Verified, recyclerUnverified, admin].forEach(
    (u) => usersDb.set(u.id, u)
  );

  const collectorProfilesDb = new Map();
  collectorProfilesDb.set(collectorProfile.userId, collectorProfile);

  const recyclerProfilesDb = new Map();
  recyclerProfilesDb.set(recycler1Profile.id, recycler1Profile);
  recyclerProfilesDb.set(recycler1Profile.userId, recycler1Profile);
  recyclerProfilesDb.set(recycler2Profile.id, recycler2Profile);
  recyclerProfilesDb.set(recycler2Profile.userId, recycler2Profile);
  recyclerProfilesDb.set(recyclerUnverifiedProfile.id, recyclerUnverifiedProfile);
  recyclerProfilesDb.set(recyclerUnverifiedProfile.userId, recyclerUnverifiedProfile);

  const itemsDb = new Map();
  const collectionRequestsDb = new Map();
  const pickupsDb = new Map();
  const consignmentsDb = new Map();
  const consignmentItemsDb = new Map();
  const recyclingRecordsDb = new Map();
  const auditLogsDb = [];
  const notificationsDb = [];

  // Seed Item 1 (Full flow with Citizen 1)
  const item1 = {
    id: '81111111-1111-4111-8111-111111111111',
    citizenId: citizen1.id,
    category: 'LAPTOP',
    description: 'Old Dell Latitude',
    quantity: 1,
    condition: 'DAMAGED',
    actualWeightKg: 2.3,
    estimatedWeightKg: 2.0,
    status: ITEM_STATUS.CONSIGNED,
    collectionRequestId: 'req-1',
    createdAt: new Date('2026-09-01T10:00:00Z'),
  };

  // Seed Item 2 (Citizen 2)
  const item2 = {
    id: '82222222-2222-4222-8222-222222222222',
    citizenId: citizen2.id,
    category: 'MOBILE_PHONE',
    description: 'Samsung Galaxy S10',
    quantity: 1,
    condition: 'WORKING',
    actualWeightKg: 0.2,
    estimatedWeightKg: 0.2,
    status: ITEM_STATUS.CONSIGNED,
    collectionRequestId: 'req-1',
    createdAt: new Date('2026-09-01T11:00:00Z'),
  };

  // Seed Collection Request & Pickup
  const req1 = {
    id: 'req-1',
    citizenId: citizen1.id,
    pickupAddress: '42 MG Road, Bangalore',
    submittedAt: new Date('2026-09-01T12:00:00Z'),
    acceptedAt: new Date('2026-09-02T09:00:00Z'),
    collectorId: collectorProfile.id,
  };

  const pickup1 = {
    id: 'p-1',
    collectionRequestId: req1.id,
    collectorId: collectorProfile.id,
    completedAt: new Date('2026-09-02T14:30:00Z'),
  };

  // Seed Consignment 1 (assigned to Recycler 1)
  const consignment1 = {
    id: 'con-1',
    collectorId: collectorProfile.id,
    recyclerId: recycler1Profile.id,
    status: CONSIGNMENT_STATUS.ACCEPTED,
    createdAt: new Date('2026-09-03T08:00:00Z'),
    acceptedAt: new Date('2026-09-03T16:00:00Z'),
  };

  // Seed Consignment 2 (assigned to Recycler 2)
  const consignment2 = {
    id: 'con-2',
    collectorId: collectorProfile.id,
    recyclerId: recycler2Profile.id,
    status: CONSIGNMENT_STATUS.ACCEPTED,
    createdAt: new Date('2026-09-04T08:00:00Z'),
    acceptedAt: new Date('2026-09-04T16:00:00Z'),
  };

  itemsDb.set(item1.id, { ...item1 });
  itemsDb.set(item2.id, { ...item2 });
  collectionRequestsDb.set(req1.id, req1);
  pickupsDb.set(pickup1.id, pickup1);
  consignmentsDb.set(consignment1.id, consignment1);
  consignmentsDb.set(consignment2.id, consignment2);

  consignmentItemsDb.set('ci-1', {
    id: 'ci-1',
    consignmentId: consignment1.id,
    ewasteItemId: item1.id,
    createdAt: new Date('2026-09-03T08:00:00Z'),
  });
  consignmentItemsDb.set('ci-2', {
    id: 'ci-2',
    consignmentId: consignment1.id,
    ewasteItemId: item2.id,
    createdAt: new Date('2026-09-03T08:00:00Z'),
  });

  // Seed Recycling Record 1 (status: RECEIVED, belonging to Recycler 1)
  const record1Id = 'd1111111-1111-4111-8111-111111111111';
  const recyclingRecord1 = {
    id: record1Id,
    consignmentId: consignment1.id,
    recyclerId: recycler1Profile.id,
    status: RECYCLING_STATUS.RECEIVED,
    receivedAt: new Date('2026-09-03T16:00:00Z'),
    processingStartedAt: null,
    completedAt: null,
    processingNotes: null,
    outputDescription: null,
    outputWeightKg: null,
    completionCertificateUrl: null,
    createdAt: new Date('2026-09-03T16:00:00Z'),
    updatedAt: new Date('2026-09-03T16:00:00Z'),
  };
  recyclingRecordsDb.set(record1Id, recyclingRecord1);

  // Seed Recycling Record 2 (status: RECEIVED, belonging to Recycler 2)
  const record2Id = 'd2222222-2222-4222-8222-222222222222';
  const recyclingRecord2 = {
    id: record2Id,
    consignmentId: consignment2.id,
    recyclerId: recycler2Profile.id,
    status: RECYCLING_STATUS.RECEIVED,
    receivedAt: new Date('2026-09-04T16:00:00Z'),
    processingStartedAt: null,
    completedAt: null,
    createdAt: new Date('2026-09-04T16:00:00Z'),
    updatedAt: new Date('2026-09-04T16:00:00Z'),
  };
  recyclingRecordsDb.set(record2Id, recyclingRecord2);

  // --- Save Original Prisma Methods ---
  const origUserFindUnique = prisma.user.findUnique;
  const origCollectorProfileFindUnique = prisma.collectorProfile.findUnique;
  const origRecyclerProfileFindUnique = prisma.recyclerProfile.findUnique;
  const origItemFindUnique = prisma.ewasteItem.findUnique;
  const origItemFindMany = prisma.ewasteItem.findMany;
  const origItemUpdateMany = prisma.ewasteItem.updateMany;
  const origConsignmentFindUnique = prisma.consignment ? prisma.consignment.findUnique : undefined;
  const origRecyclingFindUnique = prisma.recyclingRecord ? prisma.recyclingRecord.findUnique : undefined;
  const origRecyclingFindMany = prisma.recyclingRecord ? prisma.recyclingRecord.findMany : undefined;
  const origRecyclingCount = prisma.recyclingRecord ? prisma.recyclingRecord.count : undefined;
  const origRecyclingUpdate = prisma.recyclingRecord ? prisma.recyclingRecord.update : undefined;
  const origAuditCreate = prisma.auditLog.create;
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
    if (where.userId) return recyclerProfilesDb.get(where.userId) || null;
    return null;
  };

  prisma.ewasteItem.findUnique = async ({ where, include }) => {
    const item = itemsDb.get(where.id);
    if (!item) return null;
    const res = { ...item };

    if (include && include.citizen) {
      res.citizen = usersDb.get(item.citizenId);
    }
    if (include && include.collectionRequest) {
      const cr = collectionRequestsDb.get(item.collectionRequestId);
      if (cr) {
        res.collectionRequest = {
          ...cr,
          collector: collectorProfilesDb.get(collectorVerified.id),
          pickup: Array.from(pickupsDb.values()).find((p) => p.collectionRequestId === cr.id),
        };
      }
    }
    if (include && include.consignmentItems) {
      const cis = [];
      for (const ci of consignmentItemsDb.values()) {
        if (ci.ewasteItemId === item.id) {
          const c = consignmentsDb.get(ci.consignmentId);
          if (c) {
            cis.push({
              ...ci,
              consignment: {
                ...c,
                collector: collectorProfilesDb.get(collectorVerified.id),
                recycler: recyclerProfilesDb.get(c.recyclerId),
                recyclingRecord: Array.from(recyclingRecordsDb.values()).find(
                  (rr) => rr.consignmentId === c.id
                ),
              },
            });
          }
        }
      }
      res.consignmentItems = cis;
    }
    return res;
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

  if (!prisma.recyclingRecord) prisma.recyclingRecord = {};

  prisma.recyclingRecord.findUnique = async ({ where, include }) => {
    const r = recyclingRecordsDb.get(where.id);
    if (!r) return null;
    const res = { ...r };

    if (include && include.consignment) {
      const c = consignmentsDb.get(r.consignmentId);
      if (c) {
        const cis = [];
        for (const ci of consignmentItemsDb.values()) {
          if (ci.consignmentId === c.id) {
            const it = itemsDb.get(ci.ewasteItemId);
            cis.push({
              ...ci,
              ewasteItem: it ? { ...it, citizen: usersDb.get(it.citizenId) } : null,
            });
          }
        }
        res.consignment = {
          ...c,
          collector: collectorProfilesDb.get(collectorVerified.id),
          consignmentItems: cis,
        };
      }
    }
    if (include && include.recycler) {
      res.recycler = recyclerProfilesDb.get(r.recyclerId);
    }
    return res;
  };

  prisma.recyclingRecord.findMany = async ({ where, skip = 0, take = 20, include }) => {
    let list = Array.from(recyclingRecordsDb.values());
    if (where && where.recyclerId) {
      list = list.filter((r) => r.recyclerId === where.recyclerId);
    }
    if (where && where.status) {
      list = list.filter((r) => r.status === where.status);
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const sliced = list.slice(skip, skip + take);

    return sliced.map((r) => {
      const res = { ...r };
      if (include && include.recycler) {
        res.recycler = recyclerProfilesDb.get(r.recyclerId);
      }
      return res;
    });
  };

  prisma.recyclingRecord.count = async ({ where }) => {
    let list = Array.from(recyclingRecordsDb.values());
    if (where && where.recyclerId) {
      list = list.filter((r) => r.recyclerId === where.recyclerId);
    }
    if (where && where.status) {
      list = list.filter((r) => r.status === where.status);
    }
    return list.length;
  };

  prisma.recyclingRecord.update = async ({ where, data, include }) => {
    const r = recyclingRecordsDb.get(where.id);
    if (!r) throw new Error('Recycling record not found');
    Object.assign(r, data, { updatedAt: new Date() });
    recyclingRecordsDb.set(where.id, r);

    const res = { ...r };
    if (include && include.consignment) {
      const c = consignmentsDb.get(r.consignmentId);
      if (c) {
        const cis = [];
        for (const ci of consignmentItemsDb.values()) {
          if (ci.consignmentId === c.id) {
            const it = itemsDb.get(ci.ewasteItemId);
            cis.push({
              ...ci,
              ewasteItem: it ? { ...it, citizen: usersDb.get(it.citizenId) } : null,
            });
          }
        }
        res.consignment = {
          ...c,
          consignmentItems: cis,
        };
      }
    }
    if (include && include.recycler) {
      res.recycler = recyclerProfilesDb.get(r.recyclerId);
    }
    return res;
  };

  if (!prisma.auditLog) prisma.auditLog = {};
  prisma.auditLog.create = async ({ data }) => {
    const log = {
      id: randomUUID(),
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      details: data.details,
      ipAddress: data.ipAddress,
      createdAt: new Date(),
    };
    auditLogsDb.push(log);
    return log;
  };

  prisma.notification.create = async ({ data }) => {
    const notif = {
      id: randomUUID(),
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
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const dataStr = body ? JSON.stringify(body) : null;
      if (dataStr) headers['Content-Length'] = Buffer.byteLength(dataStr);

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
      if (dataStr) req.write(dataStr);
      req.end();
    });
  }

  // --- Tokens ---
  const citizen1Token = createToken(citizen1);
  const citizen2Token = createToken(citizen2);
  const collectorToken = createToken(collectorVerified);
  const recycler1Token = createToken(recycler1Verified);
  const recycler2Token = createToken(recycler2Verified);
  const recyclerUnverifiedToken = createToken(recyclerUnverified);
  const adminToken = createToken(admin);

  try {
    // -------------------------------------------------------------
    // PART A: AUTHENTICATION & AUTHORIZATION TESTS
    // -------------------------------------------------------------

    await testAsync('GET /recycling-records: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('GET /recycling-records: Citizen role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records', null, citizen1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /recycling-records: Collector role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records', null, collectorToken);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('PATCH /start-processing: Unverified recycler blocked by checkVerified (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/start-processing`,
        null,
        recyclerUnverifiedToken
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Administrator approval is required'));
    });

    await testAsync('PATCH /start-processing: Collector role rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/start-processing`,
        null,
        collectorToken
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /complete: Citizen role rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        { outputDescription: 'Metal scraps' },
        citizen1Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    // -------------------------------------------------------------
    // PART B: LISTING & SCOPING TESTS
    // -------------------------------------------------------------

    await testAsync('GET /recycling-records: Recycler 1 lists own records (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records', null, recycler1Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(Array.isArray(res.body.data.records));
      assert.strictEqual(res.body.data.records.length, 1);
      assert.strictEqual(res.body.data.records[0].recyclerId, recycler1Profile.id);
      assert(res.body.data.pagination);
    });

    await testAsync('GET /recycling-records: Recycler 2 sees only their own record (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records', null, recycler2Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.records.length, 1);
      assert.strictEqual(res.body.data.records[0].recyclerId, recycler2Profile.id);
    });

    await testAsync('GET /recycling-records: Admin lists all records platform-wide (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.records.length, 2);
    });

    await testAsync('GET /recycling-records: Status filter works (200)', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/recycling-records?status=RECEIVED',
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 200);
      assert(res.body.data.records.every((r) => r.status === RECYCLING_STATUS.RECEIVED));
    });

    // -------------------------------------------------------------
    // PART C: START PROCESSING WORKFLOW
    // -------------------------------------------------------------

    await testAsync('PATCH /start-processing: Non-existent record returns 404', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${randomUUID()}/start-processing`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /start-processing: Recycler 2 cannot process Recycler 1 record (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/start-processing`,
        null,
        recycler2Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('only start processing records assigned to your facility'));
    });

    await testAsync('PATCH /start-processing: Protected body fields rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/start-processing`,
        { status: 'COMPLETED' },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(JSON.stringify(res.body.error).includes('status'));
    });

    await testAsync('PATCH /complete: Premature completion while in RECEIVED status rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        { outputDescription: 'Premature output' },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Status must be PROCESSING'));
    });

    await testAsync('PATCH /start-processing: Assigned recycler begins processing (200)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/start-processing`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.recyclingRecord.status, RECYCLING_STATUS.PROCESSING);
      assert(res.body.data.recyclingRecord.processingStartedAt);
    });

    await testAsync('Audit: RECYCLING_STARTED event logged in audit_logs', async () => {
      const log = auditLogsDb.find(
        (l) => l.action === 'RECYCLING_STARTED' && l.entityId === record1Id
      );
      assert(log, 'RECYCLING_STARTED audit log not found');
      assert.strictEqual(log.actorId, recycler1Verified.id);
      assert.strictEqual(log.entityType, 'recycling_records');
    });

    await testAsync('PATCH /start-processing: Starting already PROCESSING record rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/start-processing`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Status must be RECEIVED'));
    });

    await testAsync('Item Consistency: Items remain in CONSIGNED status during PROCESSING', async () => {
      const it1 = itemsDb.get(item1.id);
      const it2 = itemsDb.get(item2.id);
      assert.strictEqual(it1.status, ITEM_STATUS.CONSIGNED);
      assert.strictEqual(it2.status, ITEM_STATUS.CONSIGNED);
    });

    // -------------------------------------------------------------
    // PART D: COMPLETE RECYCLING WORKFLOW
    // -------------------------------------------------------------

    await testAsync('PATCH /complete: Negative outputWeightKg rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        { outputWeightKg: -5.0 },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /complete: Excessive notes length (>1000) rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        { processingNotes: 'A'.repeat(1001) },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('PATCH /complete: Other recycler completing record rejected (403)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        { outputDescription: 'Metals recovered' },
        recycler2Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('only complete recycling records assigned to your facility'));
    });

    await testAsync('PATCH /complete: Assigned recycler completes recycling (200)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        {
          processingNotes: 'Dismantled battery & PCB, shredded plastics, smelted copper.',
          outputDescription: 'Copper ingot 0.8kg, shredded plastics 1.2kg, gold pin yield 0.05g.',
          outputWeightKg: 2.05,
        },
        recycler1Token
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.recyclingRecord.status, RECYCLING_STATUS.COMPLETED);
      assert(res.body.data.recyclingRecord.completedAt);
      assert.strictEqual(res.body.data.recyclingRecord.outputWeightKg, 2.05);
    });

    await testAsync('Item Consistency: All linked items atomically updated to RECYCLED (BR-RR-02)', async () => {
      const it1 = itemsDb.get(item1.id);
      const it2 = itemsDb.get(item2.id);
      assert.strictEqual(it1.status, ITEM_STATUS.RECYCLED);
      assert.strictEqual(it2.status, ITEM_STATUS.RECYCLED);
    });

    await testAsync('Audit: RECYCLING_COMPLETED event logged in audit_logs', async () => {
      const log = auditLogsDb.find(
        (l) => l.action === 'RECYCLING_COMPLETED' && l.entityId === record1Id
      );
      assert(log, 'RECYCLING_COMPLETED audit log not found');
      assert.strictEqual(log.actorId, recycler1Verified.id);
      assert(log.details);
      assert.strictEqual(log.details.outputWeightKg, 2.05);
    });

    await testAsync('Notification: RECYCLING_COMPLETED sent to original citizen owners (docs/23)', async () => {
      // Citizen 1
      const notif1 = notificationsDb.find(
        (n) => n.userId === citizen1.id && n.type === NOTIFICATION_TYPES.RECYCLING_COMPLETED
      );
      assert(notif1, 'Notification not found for citizen 1');
      assert.strictEqual(notif1.title, 'Recycling Complete');
      assert(notif1.message.includes(recycler1Profile.facilityName));

      // Citizen 2
      const notif2 = notificationsDb.find(
        (n) => n.userId === citizen2.id && n.type === NOTIFICATION_TYPES.RECYCLING_COMPLETED
      );
      assert(notif2, 'Notification not found for citizen 2');
    });

    await testAsync('PATCH /complete: Completing already COMPLETED record rejected (400)', async () => {
      const res = await makeRequest(
        'PATCH',
        `/api/v1/recycling-records/${record1Id}/complete`,
        { outputDescription: 'Second completion attempt' },
        recycler1Token
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Status must be PROCESSING'));
    });

    // -------------------------------------------------------------
    // PART E: TRACEABILITY ENDPOINT (GET /ewaste-items/:id/traceability)
    // -------------------------------------------------------------

    await testAsync('GET /ewaste-items/:id/traceability: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('GET', `/api/v1/ewaste-items/${item1.id}/traceability`);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('GET /ewaste-items/:id/traceability: Collector role rejected (403)', async () => {
      const res = await makeRequest(
        'GET',
        `/api/v1/ewaste-items/${item1.id}/traceability`,
        null,
        collectorToken
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('GET /ewaste-items/:id/traceability: Recycler role rejected (403)', async () => {
      const res = await makeRequest(
        'GET',
        `/api/v1/ewaste-items/${item1.id}/traceability`,
        null,
        recycler1Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('GET /ewaste-items/:id/traceability: Other citizen viewing item rejected (403)', async () => {
      // Citizen 2 tries to view Citizen 1's item
      const res = await makeRequest(
        'GET',
        `/api/v1/ewaste-items/${item1.id}/traceability`,
        null,
        citizen2Token
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('only view traceability for your own items'));
    });

    await testAsync('GET /ewaste-items/:id/traceability: Owner citizen retrieves full lifecycle chain (200)', async () => {
      const res = await makeRequest(
        'GET',
        `/api/v1/ewaste-items/${item1.id}/traceability`,
        null,
        citizen1Token
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.item);
      assert.strictEqual(res.body.data.item.id, item1.id);
      assert.strictEqual(res.body.data.item.status, ITEM_STATUS.RECYCLED);
      assert.strictEqual(res.body.data.isComplete, true);

      // Verify lifecycle event sequence (docs/21 Section 3)
      const events = res.body.data.events;
      assert(Array.isArray(events));
      assert(events.length >= 6);

      const eventNames = events.map((e) => e.event);
      assert(eventNames.includes('ITEM_SUBMITTED'));
      assert(eventNames.includes('REQUEST_SUBMITTED'));
      assert(eventNames.includes('REQUEST_ACCEPTED'));
      assert(eventNames.includes('PICKUP_COMPLETED'));
      assert(eventNames.includes('CONSIGNMENT_CREATED'));
      assert(eventNames.includes('CONSIGNMENT_ACCEPTED'));
      assert(eventNames.includes('RECYCLING_STARTED'));
      assert(eventNames.includes('RECYCLING_COMPLETED'));
    });

    await testAsync('GET /ewaste-items/:id/traceability: Admin can view any item traceability (200)', async () => {
      const res = await makeRequest(
        'GET',
        `/api/v1/ewaste-items/${item1.id}/traceability`,
        null,
        adminToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.isComplete, true);
    });

    // -------------------------------------------------------------
    // PART F: SECURITY & PRIVACY
    // -------------------------------------------------------------

    await testAsync('Security: Zero credential, secret, or password leak in recycling endpoints', async () => {
      const res = await makeRequest('GET', '/api/v1/recycling-records', null, recycler1Token);
      const str = JSON.stringify(res.body);
      assert(!str.includes('passwordHash'), 'passwordHash found in response');
      assert(!str.includes('jwtAccessSecret'), 'jwtAccessSecret found in response');
    });

  } finally {
    // Restore original Prisma methods
    prisma.user.findUnique = origUserFindUnique;
    prisma.collectorProfile.findUnique = origCollectorProfileFindUnique;
    prisma.recyclerProfile.findUnique = origRecyclerProfileFindUnique;
    prisma.ewasteItem.findUnique = origItemFindUnique;
    prisma.ewasteItem.findMany = origItemFindMany;
    prisma.ewasteItem.updateMany = origItemUpdateMany;
    if (origConsignmentFindUnique) prisma.consignment.findUnique = origConsignmentFindUnique;
    if (origRecyclingFindUnique) prisma.recyclingRecord.findUnique = origRecyclingFindUnique;
    if (origRecyclingFindMany) prisma.recyclingRecord.findMany = origRecyclingFindMany;
    if (origRecyclingCount) prisma.recyclingRecord.count = origRecyclingCount;
    if (origRecyclingUpdate) prisma.recyclingRecord.update = origRecyclingUpdate;
    prisma.auditLog.create = origAuditCreate;
    prisma.notification.create = origNotificationCreate;
    prisma.$transaction = origTransaction;

    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`RECYCLING + TRACEABILITY TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runRecyclingAndTraceabilityTests().catch((err) => {
  console.error('Fatal error running recycling tests:', err);
  process.exit(1);
});
