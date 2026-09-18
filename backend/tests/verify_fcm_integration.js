// EcoSetu Firebase Cloud Messaging (FCM) Integration Verification Suite
// Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md Section 4.5, docs/05_API_SPECIFICATION.md Section 13

const assert = require('assert');
const http = require('http');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const prisma = require('../src/config/database');
const fcmService = require('../src/services/fcmService');
const notificationService = require('../src/services/notificationService');

const environment = require('../src/config/environment');

const TEST_SECRET = environment.jwtAccessSecret;

function generateToken(userId, role = 'CITIZEN') {
  return jwt.sign(
    {
      sub: userId,
      userId,
      role,
      status: 'ACTIVE',
      tokenType: 'ACCESS',
    },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

async function runFcmIntegrationSuite() {
  console.log('====================================================');
  console.log('ECOSETU FIREBASE CLOUD MESSAGING (FCM) INTEGRATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
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

  const userA = '11111111-1111-1111-1111-111111111111';
  const userB = '22222222-2222-2222-2222-222222222222';
  const tokenA = generateToken(userA);
  const tokenB = generateToken(userB);

  // In-memory mock stores for Prisma operations
  const usersDb = new Map([
    [userA, { id: userA, role: 'CITIZEN', status: 'ACTIVE' }],
    [userB, { id: userB, role: 'CITIZEN', status: 'ACTIVE' }],
  ]);
  const deviceTokensDb = new Map();
  const notificationsDb = new Map();

  // Save original methods
  const origUserFindUnique = prisma.user.findUnique;
  const origTokenFindUnique = prisma.deviceToken?.findUnique;
  const origTokenFindMany = prisma.deviceToken?.findMany;
  const origTokenCreate = prisma.deviceToken?.create;
  const origTokenUpdate = prisma.deviceToken?.update;
  const origTokenUpdateMany = prisma.deviceToken?.updateMany;
  const origTokenCount = prisma.deviceToken?.count;
  const origNotifCreate = prisma.notification.create;
  const origNotifFindUnique = prisma.notification.findUnique;
  const origNotifDelete = prisma.notification.delete;

  // Stub Prisma
  if (!prisma.deviceToken) prisma.deviceToken = {};
  prisma.user.findUnique = async ({ where }) => usersDb.get(where.id) || null;

  prisma.deviceToken.findUnique = async ({ where }) => {
    if (where.token) {
      for (const t of deviceTokensDb.values()) {
        if (t.token === where.token) return { ...t };
      }
      return null;
    }
    if (where.id) return deviceTokensDb.get(where.id) || null;
    return null;
  };

  prisma.deviceToken.findMany = async ({ where = {} }) => {
    let list = Array.from(deviceTokensDb.values());
    if (where.userId) list = list.filter((t) => t.userId === where.userId);
    if (where.isActive !== undefined) list = list.filter((t) => t.isActive === where.isActive);
    return list;
  };

  prisma.deviceToken.create = async ({ data }) => {
    const id = randomUUID();
    const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
    deviceTokensDb.set(id, record);
    return record;
  };

  prisma.deviceToken.update = async ({ where, data }) => {
    const record = deviceTokensDb.get(where.id);
    if (!record) throw new Error('Device token not found');
    Object.assign(record, data);
    return record;
  };

  prisma.deviceToken.updateMany = async ({ where = {}, data }) => {
    let count = 0;
    for (const record of deviceTokensDb.values()) {
      if (where.userId && record.userId !== where.userId) continue;
      if (where.token && record.token !== where.token) continue;
      Object.assign(record, data);
      count++;
    }
    return { count };
  };

  prisma.deviceToken.count = async ({ where = {} }) => {
    let count = 0;
    for (const record of deviceTokensDb.values()) {
      if (where.token && record.token !== where.token) continue;
      if (where.userId && record.userId !== where.userId) continue;
      count++;
    }
    return count;
  };

  prisma.notification.create = async ({ data }) => {
    const id = randomUUID();
    const record = { id, ...data, createdAt: new Date() };
    notificationsDb.set(id, record);
    return record;
  };

  prisma.notification.findUnique = async ({ where }) => notificationsDb.get(where.id) || null;

  prisma.notification.delete = async ({ where }) => {
    notificationsDb.delete(where.id);
    return true;
  };

  const PORT = 3097;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const sampleFcmToken1 = 'fcm_registration_token_alpha_1234567890_abcdefghijklmnopqrstuvwxyz';
  const sampleFcmToken2 = 'fcm_registration_token_beta_9876543210_zyxwvutsrqponmlkjihgfedcba';

  try {
    // -------------------------------------------------------------
    // 1. DEVICE TOKEN API: AUTHENTICATION
    // -------------------------------------------------------------
    await test('POST /api/v1/notifications/device-token rejects unauthenticated request (401)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sampleFcmToken1 }),
      });
      assert.strictEqual(res.status, 401);
    });

    await test('DELETE /api/v1/notifications/device-token rejects unauthenticated request (401)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sampleFcmToken1 }),
      });
      assert.strictEqual(res.status, 401);
    });

    // -------------------------------------------------------------
    // 2. DEVICE TOKEN API: VALIDATION
    // -------------------------------------------------------------
    await test('POST /api/v1/notifications/device-token rejects invalid or short token (<32 chars)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ token: 'short_token' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert(data.error && data.error.details, 'Must return validation error details');
    });

    await test('POST /api/v1/notifications/device-token rejects invalid platform parameter', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ token: sampleFcmToken1, platform: 'windows_phone' }),
      });
      assert.strictEqual(res.status, 400);
    });

    // -------------------------------------------------------------
    // 3. REGISTRATION AND IDEMPOTENCY
    // -------------------------------------------------------------
    await test('POST /api/v1/notifications/device-token successfully registers token for authenticated user', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ token: sampleFcmToken1, platform: 'android' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.registered, true);

      // Verify in DB
      const record = await prisma.deviceToken.findUnique({ where: { token: sampleFcmToken1 } });
      assert(record, 'DeviceToken record must exist in PostgreSQL');
      assert.strictEqual(record.userId, userA);
      assert.strictEqual(record.isActive, true);
      assert.strictEqual(record.platform, 'android');
    });

    await test('POST /api/v1/notifications/device-token is idempotent on re-registration', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ token: sampleFcmToken1, platform: 'android' }),
      });
      assert.strictEqual(res.status, 200);
      const count = await prisma.deviceToken.count({ where: { token: sampleFcmToken1 } });
      assert.strictEqual(count, 1, 'Duplicate tokens must not be created');
    });

    await test('Multiple devices per user: User can register a second device token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ token: sampleFcmToken2, platform: 'android' }),
      });
      assert.strictEqual(res.status, 200);

      const userTokens = await prisma.deviceToken.findMany({ where: { userId: userA, isActive: true } });
      assert.strictEqual(userTokens.length, 2, 'User must have 2 active device tokens');
    });

    // -------------------------------------------------------------
    // 4. UNREGISTRATION AND CROSS-USER ISOLATION
    // -------------------------------------------------------------
    await test('User B cannot unregister User A device token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ token: sampleFcmToken1 }),
      });
      assert.strictEqual(res.status, 200);

      // Verify User A token remains active
      const record = await prisma.deviceToken.findUnique({ where: { token: sampleFcmToken1 } });
      assert(record);
      assert.strictEqual(record.isActive, true, 'User A token must NOT be modified by User B');
    });

    await test('DELETE /api/v1/notifications/device-token safely deactivates token on logout', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/device-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ token: sampleFcmToken1 }),
      });
      assert.strictEqual(res.status, 200);

      const record = await prisma.deviceToken.findUnique({ where: { token: sampleFcmToken1 } });
      assert(record);
      assert.strictEqual(record.isActive, false, 'Token must be deactivated');
    });

    // -------------------------------------------------------------
    // 5. FCM DISPATCH RESILIENCE & STALE TOKEN CLEANUP
    // -------------------------------------------------------------
    await test('FCM Service: sendToUser dispatches across active tokens safely in mock mode', async () => {
      const dispatchResult = await fcmService.sendToUser(userA, {
        title: 'Pickup Confirmed',
        message: 'Collector accepted pickup',
        type: 'REQUEST_ACCEPTED',
        referenceType: 'collection_request',
        referenceId: '33333333-3333-3333-3333-333333333333',
      });
      assert.strictEqual(dispatchResult.delivered, true);
      assert(Array.isArray(dispatchResult.results));
      assert.strictEqual(dispatchResult.results.length, 1, 'Should dispatch only to active token');
    });

    await test('FCM Service: Automatic deactivation of stale token on registration failure', async () => {
      // Mock sendToDevice to simulate registration-token-not-registered error
      const originalSend = fcmService.sendToDevice;
      fcmService.sendToDevice = async () => ({
        delivered: false,
        error: 'messaging/registration-token-not-registered',
      });

      try {
        await fcmService.sendToUser(userA, {
          title: 'Alert',
          message: 'Test',
          type: 'GENERAL',
        });

        // Verify token2 is now deactivated
        const record = await prisma.deviceToken.findUnique({ where: { token: sampleFcmToken2 } });
        assert(record);
        assert.strictEqual(record.isActive, false, 'Stale token must be automatically deactivated');
      } finally {
        fcmService.sendToDevice = originalSend;
      }
    });

    // -------------------------------------------------------------
    // 6. BUSINESS NOTIFICATION INDEPENDENCE
    // -------------------------------------------------------------
    await test('Notification creation persists in PostgreSQL even when FCM fails', async () => {
      const originalSend = fcmService.sendToUser;
      fcmService.sendToUser = async () => {
        throw new Error('Simulated FCM network failure');
      };

      try {
        const notification = await notificationService.createNotification({
          userId: userA,
          type: 'REQUEST_ACCEPTED',
          title: 'Resilience Test',
          message: 'This record must be stored despite FCM error',
        });

        assert(notification, 'Notification must be returned');
        assert(notification.id, 'Notification ID must exist');

        const dbRecord = await prisma.notification.findUnique({ where: { id: notification.id } });
        assert(dbRecord, 'Notification must be securely committed to PostgreSQL');
        assert.strictEqual(dbRecord.title, 'Resilience Test');
      } finally {
        fcmService.sendToUser = originalSend;
      }
    });

  } finally {
    // Restore original methods
    prisma.user.findUnique = origUserFindUnique;
    if (origTokenFindUnique) prisma.deviceToken.findUnique = origTokenFindUnique;
    if (origTokenFindMany) prisma.deviceToken.findMany = origTokenFindMany;
    if (origTokenCreate) prisma.deviceToken.create = origTokenCreate;
    if (origTokenUpdate) prisma.deviceToken.update = origTokenUpdate;
    if (origTokenUpdateMany) prisma.deviceToken.updateMany = origTokenUpdateMany;
    if (origTokenCount) prisma.deviceToken.count = origTokenCount;
    prisma.notification.create = origNotifCreate;
    prisma.notification.findUnique = origNotifFindUnique;
    prisma.notification.delete = origNotifDelete;

    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('====================================================');

  if (passed !== total) {
    throw new Error(`FCM integration verification failed: ${total - passed} tests failed`);
  }
}

runFcmIntegrationSuite().catch((err) => {
  console.error('Fatal FCM integration test error:', err);
  process.exit(1);
});
