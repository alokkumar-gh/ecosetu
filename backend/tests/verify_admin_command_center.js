// EcoSetu Admin Command Center + Notification Center Verification Suite
// Phase 19 — Task 38

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
  ITEM_CONDITIONS,
  ITEM_STATUS,
  REQUEST_STATUS,
  PICKUP_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  VERIFICATION_STATUS,
  NOTIFICATION_TYPES,
} = require('../src/utils/constants');

async function runTests() {
  console.log('====================================================');
  console.log('ECOSETU ADMIN COMMAND CENTER & NOTIFICATION TESTS');
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

  function createToken(user) {
    return jwt.sign(
      { userId: user.id, role: user.role, status: user.status },
      environment.jwtAccessSecret,
      { expiresIn: '15m' }
    );
  }

  // --- Seed Data in Memory ---
  const adminUser = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Chief Admin',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  const citizenUser = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen@ecosetu.org',
    name: 'Priya Citizen',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collectorUser = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector@ecosetu.org',
    name: 'Ramesh Kabadiwala',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const recyclerUser = {
    id: 'c1111111-1111-4111-8111-111111111111',
    email: 'recycler@ecosetu.org',
    name: 'GreenEarth Recyclers',
    role: ROLES.RECYCLER,
    status: USER_STATUS.ACTIVE,
  };

  const deactivatedUser = {
    id: 'd1111111-1111-4111-8111-111111111111',
    email: 'deactivated@ecosetu.org',
    name: 'Former User',
    role: ROLES.CITIZEN,
    status: USER_STATUS.DEACTIVATED,
  };

  const usersDb = new Map([
    [adminUser.id, adminUser],
    [citizenUser.id, citizenUser],
    [collectorUser.id, collectorUser],
    [recyclerUser.id, recyclerUser],
    [deactivatedUser.id, deactivatedUser],
  ]);

  const notificationsDb = [];
  const auditLogsDb = [];

  // Mock Prisma methods
  prisma.user.findUnique = async ({ where }) => {
    if (where.id) return usersDb.get(where.id) || null;
    if (where.email) {
      for (const u of usersDb.values()) {
        if (u.email === where.email) return u;
      }
    }
    return null;
  };

  prisma.user.findMany = async ({ where = {}, select = {} }) => {
    let list = Array.from(usersDb.values());
    if (where.status && where.status.not) {
      list = list.filter((u) => u.status !== where.status.not);
    }
    if (where.role) {
      list = list.filter((u) => u.role === where.role);
    }
    if (where.status && typeof where.status === 'string') {
      list = list.filter((u) => u.status === where.status);
    }
    if (where.OR) {
      list = list.filter((u) => {
        return where.OR.some((cond) => {
          if (cond.name && cond.name.contains) {
            return u.name.toLowerCase().includes(cond.name.contains.toLowerCase());
          }
          if (cond.email && cond.email.contains) {
            return u.email.toLowerCase().includes(cond.email.contains.toLowerCase());
          }
          return false;
        });
      });
    }
    return list;
  };

  prisma.user.count = async ({ where = {} } = {}) => {
    let list = Array.from(usersDb.values());
    if (where.role) list = list.filter((u) => u.role === where.role);
    if (where.status) list = list.filter((u) => u.status === where.status);
    return list.length;
  };

  prisma.verification = {
    count: async () => 2,
  };

  prisma.ewasteItem = {
    count: async () => 48,
    aggregate: async () => ({ _sum: { quantity: 54 } }),
    groupBy: async ({ by }) => {
      if (by && by.includes('category')) {
        return [
          { category: EWASTE_CATEGORIES.MOBILE_PHONE, _count: { _all: 20 } },
          { category: EWASTE_CATEGORIES.LAPTOP, _count: { _all: 14 } },
          { category: EWASTE_CATEGORIES.BATTERY, _count: { _all: 14 } },
        ];
      }
      if (by && by.includes('condition')) {
        return [
          { condition: ITEM_CONDITIONS.WORKING, _count: { _all: 20 } },
          { condition: ITEM_CONDITIONS.NOT_WORKING, _count: { _all: 20 } },
          { condition: ITEM_CONDITIONS.DAMAGED, _count: { _all: 8 } },
        ];
      }
      if (by && by.includes('status')) {
        return [
          { status: ITEM_STATUS.SUBMITTED, _count: { _all: 10 } },
          { status: ITEM_STATUS.COLLECTED, _count: { _all: 18 } },
          { status: ITEM_STATUS.CONSIGNED, _count: { _all: 10 } },
          { status: ITEM_STATUS.RECYCLED, _count: { _all: 10 } },
        ];
      }
      return [];
    },
  };

  prisma.collectionRequest = {
    count: async ({ where = {} } = {}) => {
      if (where.status && where.collectorId === null) return 4; // requests awaiting collector
      if (where.status === REQUEST_STATUS.ACCEPTED && where.pickup) return 3; // requests accepted pickup pending
      if (where.status && where.status.in) return 12; // active requests
      return 30; // total requests
    },
    groupBy: async () => [{ citizenId: citizenUser.id }],
    findMany: async () => [
      {
        submittedAt: new Date('2026-09-10T10:00:00Z'),
        completedAt: new Date('2026-09-10T14:00:00Z'),
      },
    ],
  };

  prisma.pickup = {
    count: async ({ where = {} } = {}) => {
      if (where.status === PICKUP_STATUS.IN_PROGRESS) return 2;
      if (where.status === PICKUP_STATUS.SCHEDULED) return 5;
      if (where.status === PICKUP_STATUS.COMPLETED) return 18;
      if (where.status === PICKUP_STATUS.FAILED) return 1;
      return 26;
    },
    aggregate: async () => ({ _sum: { totalWeightKg: 142.5 } }),
    groupBy: async () => [{ collectorId: collectorUser.id }],
  };

  prisma.consignment = {
    count: async ({ where = {} } = {}) => {
      if (where.status && where.status.in) return 3; // awaiting delivery
      if (where.status === CONSIGNMENT_STATUS.DELIVERED) return 2; // awaiting recycler acceptance
      if (where.status === CONSIGNMENT_STATUS.ACCEPTED) return 8;
      if (where.status === CONSIGNMENT_STATUS.REJECTED) return 1;
      return 14;
    },
    groupBy: async () => [{ recyclerId: recyclerUser.id }],
  };

  prisma.recyclingRecord = {
    count: async ({ where = {} } = {}) => {
      if (where.status === RECYCLING_STATUS.PROCESSING) return 3;
      if (where.status === RECYCLING_STATUS.COMPLETED) return 8;
      if (where.status === RECYCLING_STATUS.RECEIVED) return 1;
      return 12;
    },
    aggregate: async () => ({ _sum: { outputWeightKg: 135.0 } }),
  };

  prisma.collectorProfile = {
    count: async () => 6,
    findMany: async () => [
      {
        id: 'cp-1',
        serviceArea: 'Central Delhi',
        city: 'Delhi',
        state: 'Delhi',
        totalPickups: 15,
        isAvailable: true,
        user: { id: collectorUser.id, name: 'Ramesh Kabadiwala', status: USER_STATUS.ACTIVE },
      },
    ],
  };

  prisma.recyclerProfile = {
    count: async () => 4,
    findMany: async () => [
      {
        id: 'rp-1',
        facilityName: 'GreenEarth Processing Plant',
        city: 'Mumbai',
        state: 'Maharashtra',
        acceptedCategories: [EWASTE_CATEGORIES.MOBILE_PHONE, EWASTE_CATEGORIES.LAPTOP],
        totalConsignments: 8,
        user: { id: recyclerUser.id, status: USER_STATUS.ACTIVE },
      },
    ],
  };

  prisma.notification = {
    count: async ({ where = {} } = {}) => {
      let list = notificationsDb;
      if (where.referenceId) list = list.filter((n) => n.referenceId === where.referenceId);
      if (where.isRead === true) list = list.filter((n) => n.isRead === true);
      if (where.isRead === false) list = list.filter((n) => n.isRead === false);
      if (where.type) list = list.filter((n) => n.type === where.type);
      return list.length;
    },
    createMany: async ({ data }) => {
      for (const item of data) {
        notificationsDb.push({ id: `notif-${notificationsDb.length + 1}`, ...item });
      }
      return { count: data.length };
    },
    findMany: async () => notificationsDb,
  };

  prisma.deviceToken = {
    findMany: async () => [],
    update: async () => ({}),
  };

  prisma.auditLog = {
    count: async () => auditLogsDb.length,
    findMany: async ({ take = 20 }) => auditLogsDb.slice(0, take),
    create: async ({ data }) => {
      const entry = { id: `al-${auditLogsDb.length + 1}`, createdAt: new Date(), ...data };
      auditLogsDb.unshift(entry);
      return entry;
    },
  };

  // Setup test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const status = res.status;
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status, data };
  }

  try {
    const adminToken = createToken(adminUser);
    const citizenToken = createToken(citizenUser);

    // --- TEST 1: Admin RBAC Authorization ---
    await testAsync('1. Security: Analytics endpoint forbids non-admin access', async () => {
      const res = await request('/admin/analytics', {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    });

    // --- TEST 2: Command Center Platform Analytics ---
    await testAsync('2. Command Center Analytics loads with default period (7D)', async () => {
      const res = await request('/admin/analytics?period=7d', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      const d = res.data.data;
      assert.strictEqual(d.platformStatus, 'OPERATIONAL');
      assert(d.lastUpdated, 'Must contain lastUpdated timestamp');
      assert.strictEqual(d.timeRange.selected, '7D');
      assert(d.executiveKpis, 'Must contain executiveKpis');
      assert.strictEqual(typeof d.executiveKpis.totalUsers, 'number');
      assert.strictEqual(typeof d.executiveKpis.totalEwasteItems, 'number');
      assert.strictEqual(typeof d.executiveKpis.totalCollectionRequests, 'number');
      assert.strictEqual(typeof d.executiveKpis.completedPickups, 'number');
      assert.strictEqual(typeof d.executiveKpis.totalConsignments, 'number');
      assert.strictEqual(typeof d.executiveKpis.completedRecycling, 'number');
    });

    // --- TEST 3: Time Range Filtering ---
    await testAsync('3. Time range filters (30D, 90D, 1Y, ALL) respond correctly', async () => {
      for (const p of ['30d', '90d', '1y', 'all']) {
        const res = await request(`/admin/analytics?period=${p}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.data.timeRange.selected, p.toUpperCase());
        assert(res.data.data.periodMetrics, 'periodMetrics must be present');
      }
    });

    // --- TEST 4: E-Waste Analytics & Authoritative Weights ---
    await testAsync('4. E-Waste categories, conditions, and authoritative weights', async () => {
      const res = await request('/admin/analytics', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const ew = res.data.data.ewasteAnalytics;
      assert(ew, 'ewasteAnalytics must exist');
      for (const cat of Object.values(EWASTE_CATEGORIES)) {
        assert(ew.categories[cat] !== undefined, `Category ${cat} must be present`);
      }
      assert(ew.weights, 'weights must be present');
      assert.strictEqual(ew.weights.environmentalImpact, 'Not currently calculated');
      assert.strictEqual(ew.weights.totalVerifiedWeightKg, 142.5);
      assert.strictEqual(ew.weights.totalRecycledWeightKg, 135.0);
    });

    // --- TEST 5: Operational Bottlenecks ---
    await testAsync('5. Operational bottlenecks show factual queue counts', async () => {
      const res = await request('/admin/analytics', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const bn = res.data.data.bottlenecks;
      assert(bn, 'bottlenecks must exist');
      assert.strictEqual(bn.requestsAwaitingCollector, 4);
      assert.strictEqual(bn.requestsAcceptedPickupPending, 3);
      assert.strictEqual(bn.pickupsInProgress, 2);
      assert.strictEqual(bn.consignmentsAwaitingDelivery, 3);
      assert.strictEqual(bn.consignmentsDeliveredAwaitingAcceptance, 2);
      assert.strictEqual(bn.recyclingRecordsProcessing, 3);
    });

    // --- TEST 6: Recipients Preview & Strict Deactivation Exclusion ---
    await testAsync('6. Recipients preview strictly excludes deactivated users', async () => {
      const res = await request('/admin/notifications/recipients-preview?audience=ALL', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.audience, 'ALL');
      // Should have 4 users (admin, citizen, collector, recycler), NOT deactivatedUser (which is 5th)
      assert.strictEqual(res.data.data.count, 4);
      assert(res.data.data.sample.every((u) => u.status !== USER_STATUS.DEACTIVATED));
    });

    // --- TEST 7: Custom Notification Dispatch & RBAC ---
    await testAsync('7. Send custom notification: RBAC, validation, DB creation, audit log', async () => {
      // Rejects non-admin
      const forbiddenRes = await request('/admin/notifications/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizenToken}` },
        body: { title: 'Test Alert', message: 'Hello Citizens', audience: 'CITIZENS' },
      });
      assert.strictEqual(forbiddenRes.status, 403);

      // Dispatches successfully to CITIZENS
      const testTitle = 'Operational Advisory';
      const sendRes = await request('/admin/notifications/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          title: testTitle,
          message: 'Important operational update regarding pickup schedules in your sector.',
          audience: 'CITIZENS',
          confirmed: true,
        },
      });
      assert.strictEqual(sendRes.status, 200);
      assert.strictEqual(sendRes.data.data.success, true);
      assert(sendRes.data.data.broadcastId, 'Must return broadcastId');
      const broadcastId = sendRes.data.data.broadcastId;

      // Verify PostgreSQL notification record was created
      const matched = notificationsDb.filter((n) => n.referenceId === broadcastId);
      assert(matched.length > 0, 'Database notifications must be created');
      assert.strictEqual(matched[0].type, 'ADMIN_MESSAGE');
      assert.strictEqual(matched[0].title, testTitle);

      // Verify AuditLog record was created
      const auditEntry = auditLogsDb.find((al) => al.action === 'ADMIN_NOTIFICATION_SENT');
      assert(auditEntry, 'Audit log entry must be recorded');
      assert.strictEqual(auditEntry.actorId, adminUser.id);
      assert.strictEqual(auditEntry.details.title, testTitle);
    });

    // --- TEST 8: Notification Campaign History ---
    await testAsync('8. Notification campaign history returns broadcasts with read metrics', async () => {
      const res = await request('/admin/notifications/history?limit=10', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.data.broadcasts));
      assert(res.data.data.pagination, 'Pagination metadata must be present');
    });

    // --- TEST 9: Notification Analytics ---
    await testAsync('9. Notification analytics returns read rates and broadcast totals', async () => {
      const res = await request('/admin/notifications/analytics', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const d = res.data.data;
      assert(typeof d.totalNotifications === 'number');
      assert(typeof d.readCount === 'number');
      assert(typeof d.readRate === 'number');
      assert(d.adminBroadcasts, 'adminBroadcasts stats must exist');
    });

    // --- TEST 10: Privacy-Safe User Search for Notifications ---
    await testAsync('10. Privacy-safe user search excludes sensitive credentials & tokens', async () => {
      const res = await request('/admin/notifications/users/search?q=Priya', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.data.users));
      assert(res.data.data.users.length > 0);
      const u = res.data.data.users[0];
      assert.strictEqual(u.name, 'Priya Citizen');
      assert.strictEqual(u.role, ROLES.CITIZEN);
      assert(!u.passwordHash, 'Password hash MUST NEVER be exposed');
      assert(!u.phone, 'Phone MUST NOT be exposed');
    });

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
