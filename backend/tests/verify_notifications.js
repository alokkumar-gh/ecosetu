// EcoSetu Notification System Test Suite
// Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md, docs/05_API_SPECIFICATION.md Section 13, docs/10_BACKEND_ARCHITECTURE.md

const assert = require('assert');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/config/database');
const environment = require('../src/config/environment');
const notificationService = require('../src/services/notificationService');
const requestService = require('../src/services/requestService');
const pickupService = require('../src/services/pickupService');
const userService = require('../src/services/userService');
const {
  ROLES,
  USER_STATUS,
  EWASTE_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUS,
  REQUEST_STATUS,
  PICKUP_STATUS,
  NOTIFICATION_TYPES,
} = require('../src/utils/constants');

async function runNotificationModuleTests() {
  console.log('====================================================');
  console.log('ECOSETU NOTIFICATION SYSTEM TEST SUITE');
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

  function createToken(payload) {
    return jwt.sign(payload, environment.jwtAccessSecret, { expiresIn: '15m' });
  }

  // Test identities
  const citizen1 = {
    id: 'a1111111-1111-4111-8111-111111111111',
    email: 'citizen1@ecosetu.org',
    name: 'Citizen Alice',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const citizen2 = {
    id: 'a2222222-2222-4222-8222-222222222222',
    email: 'citizen2@ecosetu.org',
    name: 'Citizen Bob',
    role: ROLES.CITIZEN,
    status: USER_STATUS.ACTIVE,
  };

  const collector1User = {
    id: 'b1111111-1111-4111-8111-111111111111',
    email: 'collector1@ecosetu.org',
    name: 'Collector Dave',
    role: ROLES.INFORMAL_COLLECTOR,
    status: USER_STATUS.ACTIVE,
  };

  const collector1Profile = {
    id: 'b1111111-1111-4111-8111-222222222222',
    userId: collector1User.id,
    serviceAreaLat: 28.6139,
    serviceAreaLng: 77.2090,
    serviceRadiusKm: 10.0,
    isAvailable: true,
    totalPickups: 5,
  };

  const admin = {
    id: 'e1111111-1111-4111-8111-111111111111',
    email: 'admin@ecosetu.org',
    name: 'Admin System',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  };

  const usersDb = new Map([
    [citizen1.id, citizen1],
    [citizen2.id, citizen2],
    [collector1User.id, collector1User],
    [admin.id, admin],
  ]);

  const collectorProfilesDb = new Map([
    [collector1User.id, collector1Profile],
    [collector1Profile.id, collector1Profile],
  ]);

  const notificationsDb = new Map();
  const requestsDb = new Map();
  const pickupsDb = new Map();
  const itemsDb = new Map();

  // Save original Prisma functions
  const origUserFindUnique = prisma.user.findUnique;
  const origUserUpdate = prisma.user.update;
  const origCollectorFindUnique = prisma.collectorProfile.findUnique;
  const origCollectorUpdate = prisma.collectorProfile.update;
  const origRequestFindUnique = prisma.collectionRequest.findUnique;
  const origRequestUpdate = prisma.collectionRequest.update;
  const origPickupFindUnique = prisma.pickup.findUnique;
  const origPickupCreate = prisma.pickup.create;
  const origPickupUpdate = prisma.pickup.update;
  const origPickupUpdateMany = prisma.pickup.updateMany;
  const origItemUpdate = prisma.ewasteItem.update;
  const origItemUpdateMany = prisma.ewasteItem.updateMany;

  const origNotificationCreate = prisma.notification.create;
  const origNotificationFindMany = prisma.notification.findMany;
  const origNotificationFindUnique = prisma.notification.findUnique;
  const origNotificationCount = prisma.notification.count;
  const origNotificationUpdate = prisma.notification.update;
  const origNotificationUpdateMany = prisma.notification.updateMany;
  const origTransaction = prisma.$transaction;

  // Setup Prisma Mocks
  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;
  prisma.user.update = async ({ where, data }) => {
    const u = usersDb.get(where.id);
    if (!u) throw new Error('User not found');
    Object.assign(u, data);
    return u;
  };

  prisma.collectorProfile.findUnique = async ({ where }) => {
    if (where.userId) return collectorProfilesDb.get(where.userId) || null;
    if (where.id) return collectorProfilesDb.get(where.id) || null;
    return null;
  };

  prisma.collectorProfile.update = async ({ where, data }) => {
    const p = collectorProfilesDb.get(where.id);
    if (!p) throw new Error('Collector profile not found');
    if (data.totalPickups && data.totalPickups.increment) {
      p.totalPickups += data.totalPickups.increment;
    }
    Object.assign(p, data);
    return p;
  };

  prisma.collectionRequest.findUnique = async ({ where }) => {
    const r = requestsDb.get(where.id);
    if (!r) return null;
    const items = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id);
    return { ...r, ewasteItems: items };
  };

  prisma.collectionRequest.update = async ({ where, data }) => {
    const r = requestsDb.get(where.id);
    if (!r) throw new Error('Request not found');
    Object.assign(r, data);
    const items = Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id);
    return { ...r, ewasteItems: items };
  };

  prisma.pickup.findUnique = async ({ where }) => {
    const p = pickupsDb.get(where.id);
    if (!p) return null;
    const r = requestsDb.get(p.collectionRequestId);
    const items = r ? Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id) : [];
    return {
      ...p,
      collectionRequest: r ? { ...r, ewasteItems: items } : null,
      collector: collectorProfilesDb.get(p.collectorId) || null,
    };
  };

  prisma.pickup.create = async ({ data }) => {
    const id = data.id || randomUUID();
    const newPickup = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    pickupsDb.set(id, newPickup);
    return newPickup;
  };

  prisma.pickup.update = async ({ where, data }) => {
    const p = pickupsDb.get(where.id);
    if (!p) throw new Error('Pickup not found');
    Object.assign(p, data);
    const r = requestsDb.get(p.collectionRequestId);
    const items = r ? Array.from(itemsDb.values()).filter((i) => i.collectionRequestId === r.id) : [];
    return {
      ...p,
      collectionRequest: r ? { ...r, ewasteItems: items } : null,
    };
  };

  prisma.pickup.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const p of pickupsDb.values()) {
      if (where.collectionRequestId && p.collectionRequestId === where.collectionRequestId) {
        Object.assign(p, data);
        count++;
      }
    }
    return { count };
  };

  prisma.ewasteItem.update = async ({ where, data }) => {
    const item = itemsDb.get(where.id);
    if (!item) throw new Error('Item not found');
    Object.assign(item, data);
    return item;
  };

  prisma.ewasteItem.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const item of itemsDb.values()) {
      if (where.collectionRequestId && item.collectionRequestId === where.collectionRequestId) {
        Object.assign(item, data);
        count++;
      }
    }
    return { count };
  };

  // Notification Prisma Mocks
  prisma.notification.create = async ({ data }) => {
    const id = data.id || randomUUID();
    const newNotification = {
      id,
      ...data,
      isRead: data.isRead !== undefined ? data.isRead : false,
      createdAt: new Date(),
    };
    notificationsDb.set(id, newNotification);
    return newNotification;
  };

  prisma.notification.findUnique = async ({ where }) => {
    return notificationsDb.get(where.id) || null;
  };

  prisma.notification.findMany = async ({ where, skip = 0, take = 20 }) => {
    let list = Array.from(notificationsDb.values());
    if (where.userId) {
      list = list.filter((n) => n.userId === where.userId);
    }
    if (where.isRead !== undefined) {
      list = list.filter((n) => n.isRead === where.isRead);
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list.slice(skip, skip + take);
  };

  prisma.notification.count = async ({ where }) => {
    let list = Array.from(notificationsDb.values());
    if (where.userId) {
      list = list.filter((n) => n.userId === where.userId);
    }
    if (where.isRead !== undefined) {
      list = list.filter((n) => n.isRead === where.isRead);
    }
    return list.length;
  };

  prisma.notification.update = async ({ where, data }) => {
    const n = notificationsDb.get(where.id);
    if (!n) throw new Error('Notification not found');
    Object.assign(n, data);
    return n;
  };

  prisma.notification.updateMany = async ({ where, data }) => {
    let count = 0;
    for (const n of notificationsDb.values()) {
      if (where.userId && n.userId !== where.userId) continue;
      if (where.isRead !== undefined && n.isRead !== where.isRead) continue;
      Object.assign(n, data);
      count++;
    }
    return { count };
  };

  prisma.$transaction = async (fn) => {
    if (typeof fn === 'function') {
      return fn(prisma);
    }
    return Promise.all(fn);
  };

  const TEST_PORT = 3110;
  const server = app.listen(TEST_PORT);

  try {
    const citizen1Token = createToken({ userId: citizen1.id });
    const citizen2Token = createToken({ userId: citizen2.id });
    const collector1Token = createToken({ userId: collector1User.id });
    const adminToken = createToken({ userId: admin.id });

    // Seed test notifications
    const n1Id = randomUUID();
    const n2Id = randomUUID();
    const n3Id = randomUUID();
    const nOtherId = randomUUID();

    notificationsDb.set(n1Id, {
      id: n1Id,
      userId: citizen1.id,
      type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
      title: 'Request Accepted',
      message: 'A collector has accepted your collection request.',
      isRead: false,
      referenceType: 'collection_request',
      referenceId: randomUUID(),
      createdAt: new Date('2026-09-17T10:00:00Z'),
    });

    notificationsDb.set(n2Id, {
      id: n2Id,
      userId: citizen1.id,
      type: NOTIFICATION_TYPES.PICKUP_SCHEDULED,
      title: 'Pickup Scheduled',
      message: 'Your pickup is scheduled for tomorrow.',
      isRead: false,
      referenceType: 'pickup',
      referenceId: randomUUID(),
      createdAt: new Date('2026-09-17T11:00:00Z'),
    });

    notificationsDb.set(n3Id, {
      id: n3Id,
      userId: citizen1.id,
      type: NOTIFICATION_TYPES.PICKUP_COMPLETED,
      title: 'Pickup Completed',
      message: 'Your e-waste has been collected. 1 items, 2.5kg total.',
      isRead: true, // already read
      referenceType: 'pickup',
      referenceId: randomUUID(),
      createdAt: new Date('2026-09-17T09:00:00Z'),
    });

    notificationsDb.set(nOtherId, {
      id: nOtherId,
      userId: citizen2.id,
      type: NOTIFICATION_TYPES.ACCOUNT_REACTIVATED,
      title: 'Account Reactivated',
      message: 'Your account has been reactivated.',
      isRead: false,
      referenceType: 'user',
      referenceId: citizen2.id,
      createdAt: new Date('2026-09-17T12:00:00Z'),
    });

    // ==========================================
    // 1. Authentication & Authorization
    // ==========================================
    await testAsync('GET /notifications: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('GET /notifications/count: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/count`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('PATCH /notifications/read-all: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/read-all`, {
        method: 'PATCH',
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await testAsync('PATCH /notifications/:id/read: Unauthenticated request rejected (401)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/${n1Id}/read`, {
        method: 'PATCH',
      });
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    // ==========================================
    // 2. Retrieval & Privacy (GET /notifications)
    // ==========================================
    await testAsync('GET /notifications: Authenticated user retrieves own notifications only (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data.notifications));
      assert.strictEqual(data.data.notifications.length, 3);
      // Ensure all belong to citizen1 and not citizen2
      for (const n of data.data.notifications) {
        assert.strictEqual(n.userId, citizen1.id);
      }
      assert.strictEqual(data.data.pagination.total, 3);
    });

    await testAsync('GET /notifications: unreadOnly=true filters out read notifications (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.notifications.length, 2);
      for (const n of data.data.notifications) {
        assert.strictEqual(n.isRead, false);
      }
    });

    await testAsync('GET /notifications: pagination parameters work as expected (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.notifications.length, 2);
      assert.strictEqual(data.data.pagination.page, 1);
      assert.strictEqual(data.data.pagination.limit, 2);
      assert.strictEqual(data.data.pagination.total, 3);
      assert.strictEqual(data.data.pagination.totalPages, 2);
    });

    // ==========================================
    // 3. Unread Count (GET /notifications/count)
    // ==========================================
    await testAsync('GET /notifications/count: Returns accurate unread count (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/count`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.unreadCount, 2);
    });

    await testAsync('GET /notifications/count: Other user has independent unread count (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/count`, {
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.unreadCount, 1);
    });

    // ==========================================
    // 4. Mark As Read (PATCH /notifications/:id/read)
    // ==========================================
    await testAsync('PATCH /notifications/:id/read: Non-existent notification returns 404', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/${randomUUID()}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'NOT_FOUND');
    });

    await testAsync('PATCH /notifications/:id/read: Invalid UUID returns 400', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/invalid-uuid/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await testAsync("PATCH /notifications/:id/read: User cannot mark another user's notification as read (403)", async () => {
      // Citizen 1 tries to mark Citizen 2's notification
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/${nOtherId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'FORBIDDEN');
    });

    await testAsync('PATCH /notifications/:id/read: Owner successfully marks notification as read (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/${n1Id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.notification.isRead, true);

      // Verify unread count decreased from 2 to 1
      const countRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/count`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      const countData = await countRes.json();
      assert.strictEqual(countData.data.unreadCount, 1);
    });

    await testAsync('PATCH /notifications/:id/read: Marking already read notification succeeds idempotently (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/${n1Id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.notification.isRead, true);
    });

    // ==========================================
    // 5. Mark All As Read (PATCH /notifications/read-all)
    // ==========================================
    await testAsync('PATCH /notifications/read-all: Marks all remaining unread as read (200)', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.count, 1); // n2 was the only unread left for citizen1

      // Verify unread count is now 0 for citizen1
      const countRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/count`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      const countData = await countRes.json();
      assert.strictEqual(countData.data.unreadCount, 0);

      // Verify citizen2's unread count is untouched
      const countRes2 = await fetch(`http://localhost:${TEST_PORT}/api/v1/notifications/count`, {
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      const countData2 = await countRes2.json();
      assert.strictEqual(countData2.data.unreadCount, 1);
    });

    // ==========================================
    // 6. Workflow Event Integrations
    // ==========================================
    await testAsync('Workflow Integration: Request acceptance triggers REQUEST_ACCEPTED notification for citizen', async () => {
      const reqId = randomUUID();
      const testItem = {
        id: randomUUID(),
        collectionRequestId: reqId,
        citizenId: citizen1.id,
        category: EWASTE_CATEGORIES.LAPTOP,
        quantity: 1,
        status: ITEM_STATUS.SUBMITTED,
      };
      itemsDb.set(testItem.id, testItem);

      requestsDb.set(reqId, {
        id: reqId,
        citizenId: citizen1.id,
        status: REQUEST_STATUS.SUBMITTED,
        pickupAddress: '123 Tech Park',
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        collectorId: null,
      });

      const countBefore = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === citizen1.id && n.type === NOTIFICATION_TYPES.REQUEST_ACCEPTED
      ).length;

      await requestService.acceptRequest(collector1User.id, reqId);

      const createdNotifications = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === citizen1.id && n.type === NOTIFICATION_TYPES.REQUEST_ACCEPTED
      );
      assert.strictEqual(createdNotifications.length, countBefore + 1);
      const latest = createdNotifications[createdNotifications.length - 1];
      assert.strictEqual(latest.title, 'Request Accepted');
      assert.strictEqual(latest.message, 'A collector has accepted your collection request.');
      assert.strictEqual(latest.referenceType, 'collection_request');
      assert.strictEqual(latest.referenceId, reqId);
    });

    await testAsync('Workflow Integration: Pickup completion triggers PICKUP_COMPLETED notification for citizen', async () => {
      const reqId = randomUUID();
      const pickupId = randomUUID();
      const testItem = {
        id: randomUUID(),
        collectionRequestId: reqId,
        citizenId: citizen1.id,
        category: EWASTE_CATEGORIES.LAPTOP,
        actualWeightKg: null,
        status: ITEM_STATUS.SUBMITTED,
      };
      itemsDb.set(testItem.id, testItem);

      requestsDb.set(reqId, {
        id: reqId,
        citizenId: citizen1.id,
        status: REQUEST_STATUS.ACCEPTED,
        collectorId: collector1Profile.id,
      });

      pickupsDb.set(pickupId, {
        id: pickupId,
        collectionRequestId: reqId,
        collectorId: collector1Profile.id,
        status: PICKUP_STATUS.IN_PROGRESS,
      });

      await pickupService.completePickup(collector1User.id, pickupId, {
        totalWeightKg: 2.5,
        collectorNotes: 'Collected in good condition',
        items: [{ itemId: testItem.id, actualWeightKg: 2.5 }],
      });

      const completedNotifications = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === citizen1.id && n.type === NOTIFICATION_TYPES.PICKUP_COMPLETED
      );
      assert.ok(completedNotifications.length >= 1);
      const latest = completedNotifications[completedNotifications.length - 1];
      assert.strictEqual(latest.title, 'Pickup Completed');
      assert.strictEqual(latest.message, 'Your e-waste has been collected. 1 items, 2.5kg total.');
      assert.strictEqual(latest.referenceType, 'pickup');
      assert.strictEqual(latest.referenceId, pickupId);
    });

    await testAsync('Workflow Integration: Citizen cancelling accepted request triggers REQUEST_CANCELLED for collector', async () => {
      const reqId = randomUUID();
      requestsDb.set(reqId, {
        id: reqId,
        citizenId: citizen1.id,
        status: REQUEST_STATUS.ACCEPTED,
        collectorId: collector1Profile.id,
      });

      const countBefore = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === collector1User.id && n.type === NOTIFICATION_TYPES.REQUEST_CANCELLED
      ).length;

      await requestService.cancelRequest(citizen1, reqId, 'Need to reschedule next week');

      const cancelledNotifications = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === collector1User.id && n.type === NOTIFICATION_TYPES.REQUEST_CANCELLED
      );
      assert.strictEqual(cancelledNotifications.length, countBefore + 1);
      const latest = cancelledNotifications[cancelledNotifications.length - 1];
      assert.strictEqual(latest.title, 'Request Cancelled');
      assert.strictEqual(latest.message, 'The collection request has been cancelled by the citizen.');
      assert.strictEqual(latest.referenceType, 'collection_request');
      assert.strictEqual(latest.referenceId, reqId);
    });

    await testAsync('Workflow Integration: Admin suspending user triggers ACCOUNT_SUSPENDED notification', async () => {
      await userService.updateUserStatus(admin.id, citizen2.id, USER_STATUS.SUSPENDED, 'Policy violation');

      const suspendedNotifications = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === citizen2.id && n.type === NOTIFICATION_TYPES.ACCOUNT_SUSPENDED
      );
      assert.ok(suspendedNotifications.length >= 1);
      const latest = suspendedNotifications[suspendedNotifications.length - 1];
      assert.strictEqual(latest.title, 'Account Suspended');
      assert.strictEqual(latest.message, 'Your account has been suspended. Reason: Policy violation');
    });

    await testAsync('Workflow Integration: Admin reactivating suspended user triggers ACCOUNT_REACTIVATED notification', async () => {
      await userService.updateUserStatus(admin.id, citizen2.id, USER_STATUS.ACTIVE);

      const reactivatedNotifications = Array.from(notificationsDb.values()).filter(
        (n) => n.userId === citizen2.id && n.type === NOTIFICATION_TYPES.ACCOUNT_REACTIVATED
      );
      assert.ok(reactivatedNotifications.length >= 1);
      const latest = reactivatedNotifications[reactivatedNotifications.length - 1];
      assert.strictEqual(latest.title, 'Account Reactivated');
      assert.strictEqual(latest.message, 'Your account has been reactivated.');
    });

    // ==========================================
    // 7. Resilient Notification Failure Handling (Section 7)
    // ==========================================
    await testAsync('Failure Resilience: When notification DB write fails, parent operation does NOT fail', async () => {
      // Temporarily sabotage prisma.notification.create to simulate DB outage
      const failingCreate = prisma.notification.create;
      prisma.notification.create = async () => {
        throw new Error('Database connection failed');
      };

      try {
        const resilientReqId = randomUUID();
        const testItem = {
          id: randomUUID(),
          collectionRequestId: resilientReqId,
          citizenId: citizen1.id,
          category: EWASTE_CATEGORIES.TABLET,
          quantity: 1,
          status: ITEM_STATUS.SUBMITTED,
        };
        itemsDb.set(testItem.id, testItem);

        requestsDb.set(resilientReqId, {
          id: resilientReqId,
          citizenId: citizen1.id,
          status: REQUEST_STATUS.SUBMITTED,
          pickupAddress: '456 Resilient Ave',
          pickupLat: 28.6139,
          pickupLng: 77.2090,
          collectorId: null,
        });

        // The request acceptance must succeed without throwing error even though notification failed
        const res = await requestService.acceptRequest(collector1User.id, resilientReqId);
        assert.ok(res);
        assert.strictEqual(res.request.status, REQUEST_STATUS.ACCEPTED);
      } finally {
        prisma.notification.create = failingCreate;
      }
    });

  } finally {
    // Restore prisma mocks and close server
    prisma.user.findUnique = origUserFindUnique;
    prisma.user.update = origUserUpdate;
    prisma.collectorProfile.findUnique = origCollectorFindUnique;
    prisma.collectorProfile.update = origCollectorUpdate;
    prisma.collectionRequest.findUnique = origRequestFindUnique;
    prisma.collectionRequest.update = origRequestUpdate;
    prisma.pickup.findUnique = origPickupFindUnique;
    prisma.pickup.create = origPickupCreate;
    prisma.pickup.update = origPickupUpdate;
    prisma.pickup.updateMany = origPickupUpdateMany;
    prisma.ewasteItem.update = origItemUpdate;
    prisma.ewasteItem.updateMany = origItemUpdateMany;
    prisma.notification.create = origNotificationCreate;
    prisma.notification.findMany = origNotificationFindMany;
    prisma.notification.findUnique = origNotificationFindUnique;
    prisma.notification.count = origNotificationCount;
    prisma.notification.update = origNotificationUpdate;
    prisma.notification.updateMany = origNotificationUpdateMany;
    prisma.$transaction = origTransaction;

    server.close();
  }

  console.log(`\nNotification Test Results: ${passed}/${total} passed`);
  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runNotificationModuleTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = runNotificationModuleTests;
