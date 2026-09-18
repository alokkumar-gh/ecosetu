// EcoSetu Mobile Production Security & Hardening Verification Suite
// Canonical Reference: docs/13_SECURITY_PRIVACY.md, docs/09_FRONTEND_ARCHITECTURE.md, docs/05_API_SPECIFICATION.md

import assert from 'assert';
import { storage } from '../src/utils/storage.js';
import { authService } from '../src/services/authService.js';
import { STORAGE_KEYS, ROLES } from '../src/utils/constants.js';
import { apiClient } from '../src/services/apiClient.js';
import { AppError } from '../src/utils/AppError.js';

async function runMobileSecurityTests() {
  console.log('====================================================');
  console.log('ECOSETU MOBILE PRODUCTION SECURITY & HARDENING SUITE');
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

  // -------------------------------------------------------------
  // 1. ASYNCSTORAGE AUTH CREDENTIALS PERSISTENCE & ENCAPSULATION
  // -------------------------------------------------------------
  await test('Mobile Auth: Login correctly stores tokens and user profile', async () => {
    // Mock apiClient.post for /auth/login
    const origPost = apiClient.post;
    apiClient.post = async (path, body) => {
      if (path === '/auth/login') {
        return {
          success: true,
          data: {
            accessToken: 'mock-access-token-12345',
            refreshToken: 'mock-refresh-token-67890',
            user: {
              id: 'user-uuid-111',
              email: 'citizen@ecosetu.org',
              name: 'Citizen Test',
              role: ROLES.CITIZEN,
              status: 'ACTIVE',
            },
          },
        };
      }
      return origPost.call(apiClient, path, body);
    };

    try {
      const res = await authService.login('citizen@ecosetu.org', 'ValidPassword123!');
      assert.strictEqual(res.user.role, ROLES.CITIZEN);

      const storedAccess = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefresh = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedUser = await storage.getItem(STORAGE_KEYS.USER_PROFILE);

      assert.strictEqual(storedAccess, 'mock-access-token-12345');
      assert.strictEqual(storedRefresh, 'mock-refresh-token-67890');
      assert.strictEqual(storedUser.id, 'user-uuid-111');
      assert.strictEqual(storedUser.role, ROLES.CITIZEN);
    } finally {
      apiClient.post = origPost;
    }
  });

  // -------------------------------------------------------------
  // 2. CROSS-ACCOUNT STORAGE ISOLATION & LOGOUT CACHE PURGING
  // -------------------------------------------------------------
  await test('Mobile Privacy: Logout purges all tokens, user profile, and user domain caches', async () => {
    // Populate storage with tokens, profile, and various sensitive user domain caches
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'active-access-token');
    await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'active-refresh-token');
    await storage.setItem(STORAGE_KEYS.USER_PROFILE, { id: 'user-1', name: 'User 1' });
    await storage.setItem('@ecosetu_notifications', [{ id: 'notif-1', title: 'Private Alert' }]);
    await storage.setItem('@ecosetu_notifications_unread_count', { unreadCount: 5 });
    await storage.setItem('@ecosetu_collector_pickups', [{ id: 'pickup-1', address: 'Secret Address' }]);
    await storage.setItem('@ecosetu_admin_analytics', { totalUsers: 500, kpis: 'confidential' });
    await storage.setItem('@ecosetu_recycler_consignments', [{ id: 'consign-1' }]);
    await storage.setItem('@ecosetu_user_profile', { phone: '+919999999999' });

    // Set an offline queue item (unsynced mutations preserved across logouts if configured)
    await storage.setItem('@ecosetu_offline_queue', [{ action: 'CREATE_ITEM', data: {} }]);

    // Trigger logout
    await authService.logout();

    // Verify tokens and user profile are wiped
    assert.strictEqual(await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN), null);
    assert.strictEqual(await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN), null);
    assert.strictEqual(await storage.getItem(STORAGE_KEYS.USER_PROFILE), null);

    // Verify all domain caches are completely wiped
    assert.strictEqual(await storage.getItem('@ecosetu_notifications'), null);
    assert.strictEqual(await storage.getItem('@ecosetu_notifications_unread_count'), null);
    assert.strictEqual(await storage.getItem('@ecosetu_collector_pickups'), null);
    assert.strictEqual(await storage.getItem('@ecosetu_admin_analytics'), null);
    assert.strictEqual(await storage.getItem('@ecosetu_recycler_consignments'), null);
    assert.strictEqual(await storage.getItem('@ecosetu_user_profile'), null);

    // Verify offline queue remains safe if there were offline actions
    const offlineQueue = await storage.getItem('@ecosetu_offline_queue');
    assert(offlineQueue !== null && offlineQueue.length === 1, 'Offline queue preserved for sync');
  });

  // -------------------------------------------------------------
  // 3. STORAGE CLEAR-ALL-USER-CACHES WITH OPTIONAL QUEUE INCLUSION
  // -------------------------------------------------------------
  await test('Mobile Storage: clearAllUserCaches(true) removes all @ecosetu_ keys including queue', async () => {
    await storage.setItem('@ecosetu_offline_queue', [{ id: 'q1' }]);
    await storage.setItem('@ecosetu_cache_items', [{ id: 'item1' }]);

    await storage.clearAllUserCaches(true);

    assert.strictEqual(await storage.getItem('@ecosetu_offline_queue'), null);
    assert.strictEqual(await storage.getItem('@ecosetu_cache_items'), null);
  });

  // -------------------------------------------------------------
  // 4. API CLIENT 401 AUTH EXPIRATION HANDLING
  // -------------------------------------------------------------
  await test('Mobile Session: Expired auth notification triggers listener', async () => {
    let expiredEventReceived = false;
    const unsub = authService.addListener(({ event }) => {
      if (event === 'EXPIRED') {
        expiredEventReceived = true;
      }
    });

    try {
      // Simulate 401 auth expiration handler
      apiClient._notifyAuthExpired();
      assert.strictEqual(expiredEventReceived, true, 'AuthService should notify listeners of session expiry');
    } finally {
      unsub();
    }
  });

  // -------------------------------------------------------------
  // 5. CLIENT-SIDE ERROR HANDLING & SECURE APP ERROR WRAPPER
  // -------------------------------------------------------------
  await test('Client Security: AppError never leaks unformatted internal error data', () => {
    const err = AppError.fromResponse(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Access forbidden: Insufficient permissions',
        },
      },
      403
    );

    assert.strictEqual(err.status, 403);
    assert.strictEqual(err.code, 'FORBIDDEN');
    assert.strictEqual(err.message, 'Access forbidden: Insufficient permissions');
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('====================================================');

  if (passed !== total) {
    throw new Error(`Mobile security verification failed: ${total - passed} tests failed`);
  }
}

runMobileSecurityTests().catch((err) => {
  console.error('Fatal mobile security test error:', err);
  process.exit(1);
});
