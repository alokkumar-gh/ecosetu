// EcoSetu Analytics & Reporting Test Suite
// Canonical Reference: docs/22_ANALYTICS_AND_REPORTING.md, docs/05_API_SPECIFICATION.md Sections 4 & 14, docs/06_ROLES_AND_PERMISSIONS.md, docs/21_TRACEABILITY_AND_AUDIT.md, docs/13_SECURITY_PRIVACY.md

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const {
  ROLES,
  USER_STATUS,
  EWASTE_CATEGORIES,
  ITEM_STATUS,
  REQUEST_STATUS,
  PICKUP_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
} = require('../src/utils/constants');

async function runAnalyticsAndReportingTests() {
  console.log('====================================================');
  console.log('ECOSETU ANALYTICS + REPORTING TEST SUITE');
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
    email: 'citizen1@ecosetu.org',
    name: 'Alice Citizen',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'citizen2@ecosetu.org',
    name: 'Bob Citizen',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector1 = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector1@ecosetu.org',
    name: 'Ramesh Collector',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collector2 = {
    id: 'b2222222-2222-4222-8222-222222222222',
    email: 'collector2@ecosetu.org',
    name: 'Suresh Collector',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const recycler1 = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler1@ecosetu.org',
    name: 'GreenTech Recyclers',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const admin = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin User',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  // Collector Profiles
  const collector1Profile = {
    id: 'd1111111-1111-4111-8111-111111111111',
    userId: collector1.id,
    serviceAreaLat: 28.6139,
    serviceAreaLng: 77.209,
    serviceRadiusKm: 10,
    isAvailable: true,
    totalPickups: 3,
  };

  const collector2Profile = {
    id: 'd2222222-2222-4222-8222-222222222222',
    userId: collector2.id,
    serviceAreaLat: 19.076,
    serviceAreaLng: 72.8777,
    serviceRadiusKm: 5,
    isAvailable: true,
    totalPickups: 1,
  };

  // Recycler Profiles
  const recycler1Profile = {
    id: 'f1111111-1111-4111-8111-111111111111',
    userId: recycler1.id,
    facilityName: 'GreenTech Processing Plant',
    facilityAddress: 'Industrial Zone, Delhi',
    acceptedCategories: [EWASTE_CATEGORIES.MOBILE_PHONE, EWASTE_CATEGORIES.LAPTOP],
    totalConsignments: 2,
  };

  // --- Seed Data Maps ---
  const usersDb = new Map();
  usersDb.set(citizen1.id, citizen1);
  usersDb.set(citizen2.id, citizen2);
  usersDb.set(collector1.id, collector1);
  usersDb.set(collector2.id, collector2);
  usersDb.set(recycler1.id, recycler1);
  usersDb.set(admin.id, admin);

  const collectorProfilesDb = new Map();
  collectorProfilesDb.set(collector1.id, collector1Profile);
  collectorProfilesDb.set(collector2.id, collector2Profile);

  const recyclerProfilesDb = new Map();
  recyclerProfilesDb.set(recycler1.id, recycler1Profile);

  // E-waste items (5 items: 2 mobiles, 2 laptops, 1 monitor)
  const itemsDb = new Map([
    ['it-1', { id: 'it-1', category: EWASTE_CATEGORIES.MOBILE_PHONE, citizenId: citizen1.id, status: ITEM_STATUS.RECYCLED }],
    ['it-2', { id: 'it-2', category: EWASTE_CATEGORIES.MOBILE_PHONE, citizenId: citizen1.id, status: ITEM_STATUS.CONSIGNED }],
    ['it-3', { id: 'it-3', category: EWASTE_CATEGORIES.LAPTOP, citizenId: citizen2.id, status: ITEM_STATUS.COLLECTED }],
    ['it-4', { id: 'it-4', category: EWASTE_CATEGORIES.LAPTOP, citizenId: citizen2.id, status: ITEM_STATUS.SUBMITTED }],
    ['it-5', { id: 'it-5', category: EWASTE_CATEGORIES.MONITOR, citizenId: citizen1.id, status: ITEM_STATUS.SUBMITTED }],
  ]);

  // Collection Requests (4 requests: 1 DRAFT, 1 SUBMITTED, 1 ACCEPTED, 1 PICKED_UP)
  const collectionRequestsDb = new Map([
    ['cr-1', { id: 'cr-1', citizenId: citizen1.id, status: REQUEST_STATUS.DRAFT, collectorId: null, acceptedAt: null }],
    ['cr-2', { id: 'cr-2', citizenId: citizen1.id, status: REQUEST_STATUS.SUBMITTED, collectorId: null, acceptedAt: null }],
    ['cr-3', { id: 'cr-3', citizenId: citizen2.id, status: REQUEST_STATUS.ACCEPTED, collectorId: collector1Profile.id, acceptedAt: new Date('2026-09-10T10:00:00Z') }],
    ['cr-4', { id: 'cr-4', citizenId: citizen2.id, status: REQUEST_STATUS.PICKED_UP, collectorId: collector1Profile.id, acceptedAt: new Date('2026-09-09T08:00:00Z') }],
    ['cr-5', { id: 'cr-5', citizenId: citizen1.id, status: REQUEST_STATUS.PICKUP_SCHEDULED, collectorId: collector2Profile.id, acceptedAt: new Date('2026-09-11T12:00:00Z') }],
  ]);

  // Pickups (Collector 1 has 2 completed (15.5kg, 12.0kg = 27.5kg) and 1 scheduled; Collector 2 has 1 completed (8.0kg))
  const pickupsDb = new Map([
    ['p-1', { id: 'p-1', collectorId: collector1Profile.id, status: PICKUP_STATUS.COMPLETED, totalWeightKg: 15.5 }],
    ['p-2', { id: 'p-2', collectorId: collector1Profile.id, status: PICKUP_STATUS.COMPLETED, totalWeightKg: 12.0 }],
    ['p-3', { id: 'p-3', collectorId: collector1Profile.id, status: PICKUP_STATUS.SCHEDULED, totalWeightKg: null }],
    ['p-4', { id: 'p-4', collectorId: collector2Profile.id, status: PICKUP_STATUS.COMPLETED, totalWeightKg: 8.0 }],
  ]);

  // Consignments (Collector 1 has 2 accepted, 1 rejected; Collector 2 has 1 created)
  const consignmentsDb = new Map([
    ['con-1', { id: 'con-1', collectorId: collector1Profile.id, recyclerId: recycler1Profile.id, status: CONSIGNMENT_STATUS.ACCEPTED }],
    ['con-2', { id: 'con-2', collectorId: collector1Profile.id, recyclerId: recycler1Profile.id, status: CONSIGNMENT_STATUS.ACCEPTED }],
    ['con-3', { id: 'con-3', collectorId: collector1Profile.id, recyclerId: recycler1Profile.id, status: CONSIGNMENT_STATUS.REJECTED }],
    ['con-4', { id: 'con-4', collectorId: collector2Profile.id, recyclerId: recycler1Profile.id, status: CONSIGNMENT_STATUS.CREATED }],
  ]);

  // Recycling Records (2 completed: 14.2kg + 11.0kg = 25.2kg, 1 processing)
  const recyclingRecordsDb = new Map([
    ['rr-1', { id: 'rr-1', recyclerId: recycler1Profile.id, status: RECYCLING_STATUS.COMPLETED, outputWeightKg: 14.2 }],
    ['rr-2', { id: 'rr-2', recyclerId: recycler1Profile.id, status: RECYCLING_STATUS.COMPLETED, outputWeightKg: 11.0 }],
    ['rr-3', { id: 'rr-3', recyclerId: recycler1Profile.id, status: RECYCLING_STATUS.PROCESSING, outputWeightKg: null }],
  ]);

  // Audit Logs (5 logs with diverse actions, entities, dates)
  const auditLogsDb = [
    {
      id: 'al-1',
      actorId: admin.id,
      action: 'USER_VERIFIED',
      entityType: 'verifications',
      entityId: 'v-1',
      details: { role: 'RECYCLER' },
      createdAt: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'al-2',
      actorId: collector1.id,
      action: 'PICKUP_COMPLETED',
      entityType: 'pickups',
      entityId: 'p-1',
      details: { totalWeightKg: 15.5 },
      createdAt: new Date('2026-09-05T14:00:00Z'),
    },
    {
      id: 'al-3',
      actorId: recycler1.id,
      action: 'CONSIGNMENT_ACCEPTED',
      entityType: 'consignments',
      entityId: 'con-1',
      details: {},
      createdAt: new Date('2026-09-08T09:00:00Z'),
    },
    {
      id: 'al-4',
      actorId: recycler1.id,
      action: 'RECYCLING_STARTED',
      entityType: 'recycling_records',
      entityId: 'rr-1',
      details: {},
      createdAt: new Date('2026-09-09T11:00:00Z'),
    },
    {
      id: 'al-5',
      actorId: recycler1.id,
      action: 'RECYCLING_COMPLETED',
      entityType: 'recycling_records',
      entityId: 'rr-1',
      details: { outputWeightKg: 14.2 },
      createdAt: new Date('2026-09-12T16:00:00Z'),
    },
  ];

  // --- Mock Prisma Methods ---
  prisma.user.findUnique = async ({ where }) => {
    if (where.id) return usersDb.get(where.id) || null;
    if (where.email) {
      for (const u of usersDb.values()) {
        if (u.email === where.email) return u;
      }
    }
    return null;
  };

  prisma.user.count = async ({ where } = {}) => {
    let list = Array.from(usersDb.values());
    if (where && where.role) list = list.filter((u) => u.role === where.role);
    if (where && where.status) list = list.filter((u) => u.status === where.status);
    return list.length;
  };

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
    if (where.userId) return recyclerProfilesDb.get(where.userId) || null;
    if (where.id) {
      for (const p of recyclerProfilesDb.values()) {
        if (p.id === where.id) return p;
      }
    }
    return null;
  };

  prisma.ewasteItem.count = async ({ where } = {}) => {
    let list = Array.from(itemsDb.values());
    if (where && where.category) list = list.filter((i) => i.category === where.category);
    if (where && where.status) list = list.filter((i) => i.status === where.status);
    return list.length;
  };

  prisma.ewasteItem.groupBy = async ({ by }) => {
    if (by && by.includes('category')) {
      const counts = {};
      for (const it of itemsDb.values()) {
        counts[it.category] = (counts[it.category] || 0) + 1;
      }
      return Object.entries(counts).map(([category, count]) => ({
        category,
        _count: { _all: count },
      }));
    }
    return [];
  };

  prisma.collectionRequest.count = async ({ where } = {}) => {
    let list = Array.from(collectionRequestsDb.values());
    if (where) {
      if (where.status) {
        if (typeof where.status === 'object' && where.status.not) {
          list = list.filter((r) => r.status !== where.status.not);
        } else if (typeof where.status === 'object' && Array.isArray(where.status.in)) {
          list = list.filter((r) => where.status.in.includes(r.status));
        } else {
          list = list.filter((r) => r.status === where.status);
        }
      }
      if (where.acceptedAt && where.acceptedAt.not === null) {
        list = list.filter((r) => r.acceptedAt !== null);
      }
      if (where.collectorId) {
        list = list.filter((r) => r.collectorId === where.collectorId);
      }
    }
    return list.length;
  };

  prisma.collectionRequest.groupBy = async ({ by }) => {
    if (by && by.includes('status')) {
      const counts = {};
      for (const req of collectionRequestsDb.values()) {
        counts[req.status] = (counts[req.status] || 0) + 1;
      }
      return Object.entries(counts).map(([status, count]) => ({
        status,
        _count: { _all: count },
      }));
    }
    return [];
  };

  prisma.pickup.count = async ({ where } = {}) => {
    let list = Array.from(pickupsDb.values());
    if (where) {
      if (where.status) list = list.filter((p) => p.status === where.status);
      if (where.collectorId) list = list.filter((p) => p.collectorId === where.collectorId);
    }
    return list.length;
  };

  prisma.pickup.aggregate = async ({ where, _sum } = {}) => {
    let list = Array.from(pickupsDb.values());
    if (where) {
      if (where.status) list = list.filter((p) => p.status === where.status);
      if (where.collectorId) list = list.filter((p) => p.collectorId === where.collectorId);
    }
    let totalWeightKg = 0;
    if (_sum && _sum.totalWeightKg) {
      for (const p of list) {
        if (typeof p.totalWeightKg === 'number') totalWeightKg += p.totalWeightKg;
      }
    }
    return { _sum: { totalWeightKg } };
  };

  prisma.consignment.count = async ({ where } = {}) => {
    let list = Array.from(consignmentsDb.values());
    if (where) {
      if (where.status) list = list.filter((c) => c.status === where.status);
      if (where.collectorId) list = list.filter((c) => c.collectorId === where.collectorId);
    }
    return list.length;
  };

  prisma.recyclingRecord.count = async ({ where } = {}) => {
    let list = Array.from(recyclingRecordsDb.values());
    if (where) {
      if (where.status) list = list.filter((r) => r.status === where.status);
    }
    return list.length;
  };

  prisma.recyclingRecord.aggregate = async ({ where, _sum } = {}) => {
    let list = Array.from(recyclingRecordsDb.values());
    if (where) {
      if (where.status) list = list.filter((r) => r.status === where.status);
    }
    let outputWeightKg = 0;
    if (_sum && _sum.outputWeightKg) {
      for (const r of list) {
        if (typeof r.outputWeightKg === 'number') outputWeightKg += r.outputWeightKg;
      }
    }
    return { _sum: { outputWeightKg } };
  };

  prisma.auditLog.count = async ({ where } = {}) => {
    let list = [...auditLogsDb];
    if (where) {
      if (where.action) list = list.filter((l) => l.action === where.action);
      if (where.entityType) list = list.filter((l) => l.entityType === where.entityType);
      if (where.actorId) list = list.filter((l) => l.actorId === where.actorId);
      if (where.createdAt) {
        if (where.createdAt.gte) list = list.filter((l) => new Date(l.createdAt) >= new Date(where.createdAt.gte));
        if (where.createdAt.lte) list = list.filter((l) => new Date(l.createdAt) <= new Date(where.createdAt.lte));
      }
    }
    return list.length;
  };

  prisma.auditLog.findMany = async ({ where, skip = 0, take = 20, include } = {}) => {
    let list = [...auditLogsDb];
    if (where) {
      if (where.action) list = list.filter((l) => l.action === where.action);
      if (where.entityType) list = list.filter((l) => l.entityType === where.entityType);
      if (where.actorId) list = list.filter((l) => l.actorId === where.actorId);
      if (where.createdAt) {
        if (where.createdAt.gte) list = list.filter((l) => new Date(l.createdAt) >= new Date(where.createdAt.gte));
        if (where.createdAt.lte) list = list.filter((l) => new Date(l.createdAt) <= new Date(where.createdAt.lte));
      }
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const sliced = list.slice(skip, skip + take);

    return sliced.map((log) => {
      const res = { ...log };
      if (include && include.actor) {
        const u = usersDb.get(log.actorId);
        res.actor = u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
      }
      return res;
    });
  };

  // --- Start Ephemeral HTTP Server ---
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  async function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {},
      };

      let bodyData = null;
      if (body) {
        bodyData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(bodyData);
      }

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: rawData });
          }
        });
      });

      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    });
  }

  const adminToken = createToken(admin);
  const citizen1Token = createToken(citizen1);
  const collector1Token = createToken(collector1);
  const collector2Token = createToken(collector2);
  const recycler1Token = createToken(recycler1);

  try {
    // -------------------------------------------------------------
    // PART A: AUTHENTICATION & RBAC PERMISSIONS
    // -------------------------------------------------------------

    await testAsync('GET /admin/analytics: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/analytics');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    await testAsync('GET /admin/analytics: Citizen role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/analytics', null, citizen1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /admin/analytics: Collector role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/analytics', null, collector1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /admin/analytics: Recycler role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/analytics', null, recycler1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /admin/audit-logs: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/audit-logs');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    await testAsync('GET /admin/audit-logs: Citizen role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/audit-logs', null, citizen1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /admin/audit-logs: Collector role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/audit-logs', null, collector1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /admin/audit-logs: Recycler role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/audit-logs', null, recycler1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /collectors/stats: Unauthenticated rejected (401)', async () => {
      const res = await makeRequest('GET', '/api/v1/collectors/stats');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
    });

    await testAsync('GET /collectors/stats: Citizen role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/collectors/stats', null, citizen1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    await testAsync('GET /collectors/stats: Recycler role rejected (403)', async () => {
      const res = await makeRequest('GET', '/api/v1/collectors/stats', null, recycler1Token);
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });

    // -------------------------------------------------------------
    // PART B: PLATFORM ANALYTICS (GET /api/v1/admin/analytics)
    // -------------------------------------------------------------

    let analyticsData = null;

    await testAsync('GET /admin/analytics: Admin retrieves platform analytics (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/analytics', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data);
      analyticsData = res.body.data;
    });

    await testAsync('Analytics Metric: User counts & role breakdown', async () => {
      assert.strictEqual(analyticsData.users.total, 6);
      assert.strictEqual(analyticsData.users.byRole.CITIZEN, 2);
      assert.strictEqual(analyticsData.users.byRole.INFORMAL_COLLECTOR, 2);
      assert.strictEqual(analyticsData.users.byRole.RECYCLER, 1);
    });

    await testAsync('Analytics Metric: E-waste items total & category breakdown', async () => {
      assert.strictEqual(analyticsData.ewasteItems.total, 5);
      assert.strictEqual(analyticsData.ewasteItems.byCategory[EWASTE_CATEGORIES.MOBILE_PHONE], 2);
      assert.strictEqual(analyticsData.ewasteItems.byCategory[EWASTE_CATEGORIES.LAPTOP], 2);
      assert.strictEqual(analyticsData.ewasteItems.byCategory[EWASTE_CATEGORIES.MONITOR], 1);
    });

    await testAsync('Analytics Metric: Collection requests total & status breakdown', async () => {
      assert.strictEqual(analyticsData.requests.total, 5);
      assert.strictEqual(analyticsData.requests.byStatus[REQUEST_STATUS.DRAFT], 1);
      assert.strictEqual(analyticsData.requests.byStatus[REQUEST_STATUS.SUBMITTED], 1);
      assert.strictEqual(analyticsData.requests.byStatus[REQUEST_STATUS.ACCEPTED], 1);
      assert.strictEqual(analyticsData.requests.byStatus[REQUEST_STATUS.PICKED_UP], 1);
      assert.strictEqual(analyticsData.requests.byStatus[REQUEST_STATUS.PICKUP_SCHEDULED], 1);
    });

    await testAsync('Analytics Metric: Pickups total, completed, and totalWeightKg sum', async () => {
      assert.strictEqual(analyticsData.pickups.total, 4);
      assert.strictEqual(analyticsData.pickups.completed, 3);
      // 15.5 + 12.0 + 8.0 = 35.5 kg
      assert.strictEqual(analyticsData.pickups.totalWeightKg, 35.5);
    });

    await testAsync('Analytics Metric: Consignments total, accepted, and rejected counts', async () => {
      assert.strictEqual(analyticsData.consignments.total, 4);
      assert.strictEqual(analyticsData.consignments.accepted, 2);
      assert.strictEqual(analyticsData.consignments.rejected, 1);
    });

    await testAsync('Analytics Metric: Recycling records total, completed, and totalOutputWeightKg sum', async () => {
      assert.strictEqual(analyticsData.recycling.total, 3);
      assert.strictEqual(analyticsData.recycling.completed, 2);
      // 14.2 + 11.0 = 25.2 kg
      assert.strictEqual(analyticsData.recycling.totalOutputWeightKg, 25.2);
    });

    await testAsync('Analytics Metric: Conversion funnel (6 steps per docs/22 Section 2.5)', async () => {
      assert(analyticsData.conversionFunnel);
      assert.strictEqual(analyticsData.conversionFunnel.itemsSubmitted, 5);
      // 5 requests - 1 DRAFT = 4
      assert.strictEqual(analyticsData.conversionFunnel.requestsSubmitted, 4);
      // 3 requests with acceptedAt
      assert.strictEqual(analyticsData.conversionFunnel.requestsAccepted, 3);
      assert.strictEqual(analyticsData.conversionFunnel.pickupsCompleted, 3);
      assert.strictEqual(analyticsData.conversionFunnel.consignmentsDelivered, 2);
      assert.strictEqual(analyticsData.conversionFunnel.recyclingCompleted, 2);
    });

    await testAsync('Analytics Metric: Recent activity returns last 20 events with actor names', async () => {
      assert(Array.isArray(analyticsData.recentActivity));
      assert.strictEqual(analyticsData.recentActivity.length, 5);
      // Most recent first: al-5
      assert.strictEqual(analyticsData.recentActivity[0].action, 'RECYCLING_COMPLETED');
      assert.strictEqual(analyticsData.recentActivity[0].entityType, 'recycling_records');
      assert.strictEqual(analyticsData.recentActivity[0].actorName, recycler1.name);
    });

    await testAsync('Analytics: Compatibility fields present (docs/05 Section 14)', async () => {
      assert.strictEqual(analyticsData.totalRequests, 5);
      assert.strictEqual(analyticsData.totalPickups, 4);
      assert.strictEqual(analyticsData.totalConsignments, 4);
      assert.strictEqual(analyticsData.totalRecycled, 2);
      assert.strictEqual(analyticsData.totalWeightKg, 35.5);
      assert.strictEqual(analyticsData.totalUsers.citizen, 2);
      assert.strictEqual(analyticsData.totalUsers.collector, 2);
      assert.strictEqual(analyticsData.totalUsers.recycler, 1);
    });

    // -------------------------------------------------------------
    // PART C: COLLECTOR STATISTICS (GET /api/v1/collectors/stats)
    // -------------------------------------------------------------

    await testAsync('GET /collectors/stats: Collector 1 retrieves own operational stats (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/collectors/stats', null, collector1Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const data = res.body.data;
      // Collector 1 completed pickups: 2 (weights: 15.5 + 12.0 = 27.5)
      assert.strictEqual(data.totalPickups, 2);
      assert.strictEqual(data.totalWeightKg, 27.5);
      // Collector 1 consignments: 3
      assert.strictEqual(data.totalConsignments, 3);
      // Collector 1 active requests: cr-3 (ACCEPTED) and cr-4 (PICKED_UP is not in ['ACCEPTED', 'PICKUP_SCHEDULED']) => 1
      assert.strictEqual(data.activeRequests, 1);
    });

    await testAsync('GET /collectors/stats: Collector 2 retrieves independent operational stats (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/collectors/stats', null, collector2Token);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const data = res.body.data;
      // Collector 2 completed pickups: 1 (weight: 8.0)
      assert.strictEqual(data.totalPickups, 1);
      assert.strictEqual(data.totalWeightKg, 8.0);
      // Collector 2 consignments: 1
      assert.strictEqual(data.totalConsignments, 1);
      // Collector 2 active requests: cr-5 (PICKUP_SCHEDULED) => 1
      assert.strictEqual(data.activeRequests, 1);
    });

    await testAsync('Scoping & Privacy: Cross-collector isolation verified', async () => {
      const res1 = await makeRequest('GET', '/api/v1/collectors/stats', null, collector1Token);
      const res2 = await makeRequest('GET', '/api/v1/collectors/stats', null, collector2Token);
      assert.notStrictEqual(res1.body.data.totalWeightKg, res2.body.data.totalWeightKg);
      assert.notStrictEqual(res1.body.data.totalConsignments, res2.body.data.totalConsignments);
    });

    // -------------------------------------------------------------
    // PART D: AUDIT LOG VIEWER & FILTERING (GET /api/v1/admin/audit-logs)
    // -------------------------------------------------------------

    await testAsync('GET /admin/audit-logs: Admin retrieves paginated audit logs (200)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/audit-logs', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert(Array.isArray(res.body.data.auditLogs));
      assert.strictEqual(res.body.data.auditLogs.length, 5);
      assert.strictEqual(res.body.data.pagination.total, 5);
      assert.strictEqual(res.body.data.pagination.page, 1);
    });

    await testAsync('Audit Logs Filter: Filter by action', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?action=PICKUP_COMPLETED',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.auditLogs.length, 1);
      assert.strictEqual(res.body.data.auditLogs[0].action, 'PICKUP_COMPLETED');
      assert.strictEqual(res.body.data.auditLogs[0].actorId, collector1.id);
    });

    await testAsync('Audit Logs Filter: Filter by entityType', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?entityType=recycling_records',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.auditLogs.length, 2);
      for (const log of res.body.data.auditLogs) {
        assert.strictEqual(log.entityType, 'recycling_records');
      }
    });

    await testAsync('Audit Logs Filter: Filter by actorId', async () => {
      const res = await makeRequest(
        'GET',
        `/api/v1/admin/audit-logs?actorId=${recycler1.id}`,
        null,
        adminToken
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.auditLogs.length, 3);
      for (const log of res.body.data.auditLogs) {
        assert.strictEqual(log.actorId, recycler1.id);
      }
    });

    await testAsync('Audit Logs Filter: Filter by date range (startDate & endDate)', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?startDate=2026-09-08T00:00:00Z&endDate=2026-09-10T00:00:00Z',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 200);
      // al-3 (Sep 8) and al-4 (Sep 9)
      assert.strictEqual(res.body.data.auditLogs.length, 2);
    });

    await testAsync('Audit Logs Validation: Malformed startDate rejected (400)', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?startDate=not-a-date',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });

    await testAsync('Audit Logs Validation: startDate after endDate rejected (400)', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?startDate=2026-09-15T00:00:00Z&endDate=2026-09-01T00:00:00Z',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.details.some((d) => d.message.includes('startDate cannot be after endDate')));
    });

    await testAsync('Audit Logs Validation: Invalid actorId UUID rejected (400)', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?actorId=not-a-valid-uuid',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await testAsync('Audit Logs Validation: Negative page or limit rejected (400)', async () => {
      const res = await makeRequest(
        'GET',
        '/api/v1/admin/audit-logs?page=-1&limit=0',
        null,
        adminToken
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    // -------------------------------------------------------------
    // PART E: SECURITY & SENSITIVE DATA LEAKAGE
    // -------------------------------------------------------------

    await testAsync('Security: Zero password hashes, JWT secrets, or sensitive tokens leaked', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/analytics', null, adminToken);
      const str = JSON.stringify(res.body);
      assert(!str.includes('passwordHash'));
      assert(!str.includes('jwtAccessSecret'));
      assert(!str.includes('$2a$'));

      const resLogs = await makeRequest('GET', '/api/v1/admin/audit-logs', null, adminToken);
      const strLogs = JSON.stringify(resLogs.body);
      assert(!strLogs.includes('passwordHash'));
      assert(!strLogs.includes('jwtAccessSecret'));

      const resStats = await makeRequest('GET', '/api/v1/collectors/stats', null, collector1Token);
      const strStats = JSON.stringify(resStats.body);
      assert(!strStats.includes('passwordHash'));
      assert(!strStats.includes('jwtAccessSecret'));
    });

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`ANALYTICS & REPORTING TEST SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAnalyticsAndReportingTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
