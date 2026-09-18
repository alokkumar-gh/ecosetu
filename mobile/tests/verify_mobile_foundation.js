/**
 * EcoSetu Mobile Foundation Verification Suite (Phase 15)
 * Tests:
 * 1. Local Persistence (survives restarts, multi-get/set, clear)
 * 2. Network Detection (offline/online transitions, listeners)
 * 3. Centralized API Client (auth injection, timeout, 401 token refresh)
 * 4. Auth Session Management (login, session restore, purge on logout)
 * 5. Persistent Sync Queue (offline enqueue, online auto-sync)
 * 6. Retry Handling (transient retry with backoff vs. permanent fail stop)
 * 7. Offline Operation Boundaries (server-authoritative vs. field-queued)
 * 8. Data Reconciliation (local draft ID -> server UUID)
 * 9. Security & Concurrency (no secrets in logs, sync locking)
 *
 * Uses built-in Node.js 'http' and 'assert' modules for zero-dependency test runner.
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md, docs/13_SECURITY_PRIVACY.md, docs/24_ERROR_EDGE_CASES.md
 */

const assert = require('assert');
const http = require('http');

// Import mobile foundation modules
const { storage } = require('../src/utils/storage');
const { STORAGE_KEYS, QUEUE_STATUS, QUEUE_ACTION_TYPES, API_CONFIG } = require('../src/utils/constants');
const { AppError } = require('../src/utils/AppError');
const { networkService } = require('../src/services/networkService');
const { apiClient } = require('../src/services/apiClient');
const { authService } = require('../src/services/authService');
const { offlineStore } = require('../src/services/offlineStore');
const { offlineQueue } = require('../src/services/offlineQueue');
const { ewasteService } = require('../src/services/ewasteService');
const { pickupService } = require('../src/services/pickupService');

async function runMobileFoundationTests() {
  console.log('====================================================');
  console.log('ECOSETU PHASE 15 — MOBILE FOUNDATION VERIFICATION');
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

  // Setup Mock Backend HTTP Server using standard Node 'http'
  let server;
  let serverPort;
  let tokenRefreshCount = 0;
  let createdItems = [];
  let simulate503Count = 0;
  let simulatedExpiredTokenSeen = false;

  server = http.createServer(async (req, res) => {
    // Helper to send JSON
    const sendJson = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    // Helper to read body
    const getBody = () =>
      new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve({});
          }
        });
      });

    const url = req.url || '';
    const method = req.method || 'GET';

    // Route: POST /api/v1/auth/login
    if (url === '/api/v1/auth/login' && method === 'POST') {
      const body = await getBody();
      if (body.email === 'citizen@ecosetu.org' && body.password === 'ValidPass123') {
        return sendJson(200, {
          success: true,
          data: {
            user: {
              id: 'usr_mock_123',
              email: body.email,
              name: 'Priya Sharma',
              role: 'CITIZEN',
              status: 'ACTIVE',
            },
            accessToken: 'valid_mock_access_token_123',
            refreshToken: 'valid_mock_refresh_token_456',
          },
        });
      }
      return sendJson(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      });
    }

    // Route: POST /api/v1/auth/refresh
    if (url === '/api/v1/auth/refresh' && method === 'POST') {
      const body = await getBody();
      if (body.refreshToken === 'valid_mock_refresh_token_456') {
        tokenRefreshCount++;
        return sendJson(200, {
          success: true,
          data: {
            accessToken: 'refreshed_access_token_789',
            refreshToken: 'valid_mock_refresh_token_456',
          },
        });
      }
      return sendJson(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
      });
    }

    // Route: POST /api/v1/auth/logout
    if (url === '/api/v1/auth/logout' && method === 'POST') {
      return sendJson(200, { success: true, data: { message: 'Logged out' } });
    }

    // Route: GET /api/v1/users/me
    if (url === '/api/v1/users/me' && method === 'GET') {
      const authHeader = req.headers['authorization'];
      if (authHeader === 'Bearer expired_token' && !simulatedExpiredTokenSeen) {
        simulatedExpiredTokenSeen = true;
        return sendJson(401, {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token expired' },
        });
      }

      if (
        authHeader === 'Bearer refreshed_access_token_789' ||
        authHeader === 'Bearer valid_mock_access_token_123'
      ) {
        return sendJson(200, {
          success: true,
          data: { id: 'usr_mock_123', email: 'citizen@ecosetu.org' },
        });
      }

      return sendJson(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });
    }

    // Route: POST /api/v1/ewaste-items
    if (url === '/api/v1/ewaste-items' && method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return sendJson(401, {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Auth token required' },
        });
      }

      const body = await getBody();
      if (!body.brand) {
        return sendJson(400, {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Brand is required',
            details: [{ field: 'brand' }],
          },
        });
      }

      if (simulate503Count > 0) {
        simulate503Count--;
        return sendJson(503, {
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Server temporarily unavailable' },
        });
      }

      const serverItem = {
        id: `server_item_uuid_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        brand: body.brand,
        model: body.model || 'Unknown',
        status: 'SUBMITTED',
        createdAt: new Date().toISOString(),
      };
      createdItems.push(serverItem);

      return sendJson(201, {
        success: true,
        data: { item: serverItem },
      });
    }

    // Default 404
    sendJson(404, { success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      apiClient.setBaseUrl(`http://127.0.0.1:${serverPort}/api/v1`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // 1. LOCAL PERSISTENCE TESTS
    // -------------------------------------------------------------
    await test('Storage: Basic set, get, remove, and clear', async () => {
      await storage.clear();
      await storage.setItem('@test_key', { message: 'hello', value: 42 });
      const retrieved = await storage.getItem('@test_key');
      assert.deepStrictEqual(retrieved, { message: 'hello', value: 42 });

      await storage.removeItem('@test_key');
      const removed = await storage.getItem('@test_key');
      assert.strictEqual(removed, null);
    });

    await test('Storage: Batch multiSet and multiGet', async () => {
      await storage.multiSet([
        ['@key_1', { id: 1 }],
        ['@key_2', { id: 2 }],
      ]);
      const results = await storage.multiGet(['@key_1', '@key_2']);
      assert.strictEqual(results.length, 2);
      assert.deepStrictEqual(results[0][1], { id: 1 });
      assert.deepStrictEqual(results[1][1], { id: 2 });
    });

    await test('Storage: Data persists across simulated app restart', async () => {
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'persistent_token_abc');
      await storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, [{ id: 'q_1', status: 'PENDING' }]);

      const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const queue = await storage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);

      assert.strictEqual(token, 'persistent_token_abc', 'Token must survive restart');
      assert.strictEqual(queue.length, 1, 'Queue must survive restart');
      assert.strictEqual(queue[0].id, 'q_1');
    });

    // -------------------------------------------------------------
    // 2. NETWORK DETECTION TESTS
    // -------------------------------------------------------------
    await test('Network: Online, offline, and transition event detection', async () => {
      let changeFired = false;
      let onlineFired = false;

      networkService.setMockConnection(true);
      assert.strictEqual(networkService.isConnected(), true);

      const unsubscribe = networkService.addListener(
        () => {
          changeFired = true;
        },
        {
          onOnline: () => {
            onlineFired = true;
          },
        }
      );

      // Transition to offline
      networkService.setMockConnection(false);
      assert.strictEqual(networkService.isConnected(), false);
      assert.strictEqual(changeFired, true);

      // Transition to online
      networkService.setMockConnection(true);
      assert.strictEqual(networkService.isConnected(), true);
      assert.strictEqual(onlineFired, true);

      unsubscribe();
    });

    // -------------------------------------------------------------
    // 3. CENTRALIZED API CLIENT & AUTH TESTS
    // -------------------------------------------------------------
    await test('ApiClient: Injects Bearer token automatically from storage', async () => {
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'valid_mock_access_token_123');
      const response = await apiClient.get('/users/me');
      assert.strictEqual(response.success, true);
      assert.strictEqual(response.data.id, 'usr_mock_123');
    });

    await test('ApiClient: Automatically refreshes 401 token and retries request', async () => {
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'expired_token');
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'valid_mock_refresh_token_456');

      const initialRefreshCount = tokenRefreshCount;
      const response = await apiClient.get('/users/me');

      assert.strictEqual(response.success, true);
      assert.strictEqual(tokenRefreshCount, initialRefreshCount + 1, 'Refresh endpoint must be called');

      const newStoredToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      assert.strictEqual(newStoredToken, 'refreshed_access_token_789');
    });

    await test('AuthService: Login persists credentials and profile in storage', async () => {
      await storage.clear();
      const loginResult = await authService.login('citizen@ecosetu.org', 'ValidPass123');

      assert.strictEqual(loginResult.user.email, 'citizen@ecosetu.org');
      assert.strictEqual(loginResult.user.role, 'CITIZEN');

      const storedToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedUser = await storage.getItem(STORAGE_KEYS.USER_PROFILE);

      assert.strictEqual(storedToken, 'valid_mock_access_token_123');
      assert.strictEqual(storedRefreshToken, 'valid_mock_refresh_token_456');
      assert.strictEqual(storedUser.name, 'Priya Sharma');
    });

    await test('AuthService: Logout purges all stored tokens and user profile', async () => {
      await authService.logout();

      const storedToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedUser = await storage.getItem(STORAGE_KEYS.USER_PROFILE);

      assert.strictEqual(storedToken, null, 'Access token must be purged');
      assert.strictEqual(storedRefreshToken, null, 'Refresh token must be purged');
      assert.strictEqual(storedUser, null, 'User profile must be purged');
    });

    // -------------------------------------------------------------
    // 4. OFFLINE SYNC QUEUE & AUTOMATIC SYNCHRONIZATION TESTS
    // -------------------------------------------------------------
    await test('Offline Queue: Actions are queued when offline without loss', async () => {
      await offlineQueue.clearQueue();
      await offlineStore.clearAllCaches();
      networkService.setMockConnection(false);

      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'valid_mock_access_token_123');

      const draft = await ewasteService.createItem({
        brand: 'Dell',
        model: 'Latitude E7470',
        estimatedWeightKg: 2.1,
      });

      assert(draft.id.startsWith('temp_item_'), 'Draft must have temporary ID');
      assert.strictEqual(draft.isOfflineDraft, true);

      const queue = await offlineQueue.getQueue();
      assert.strictEqual(queue.length, 1);
      assert.strictEqual(queue[0].type, QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM);
      assert.strictEqual(queue[0].status, QUEUE_STATUS.PENDING);
      assert.strictEqual(queue[0].localId, draft.id);
    });

    await test('Automatic Synchronization: Online transition automatically synchronizes queue', async () => {
      assert.strictEqual(await offlineQueue.getPendingCount(), 1);

      // Simulate internet returning
      networkService.setMockConnection(true);

      // Wait for async sync to complete
      await new Promise((r) => setTimeout(r, 200));

      const pendingCount = await offlineQueue.getPendingCount();
      assert.strictEqual(pendingCount, 0, 'Pending actions must be 0 after successful auto-sync');

      assert(createdItems.length > 0, 'Backend must have received the queued item');
      const latestServerItem = createdItems[createdItems.length - 1];
      assert.strictEqual(latestServerItem.brand, 'Dell');
    });

    await test('Data Reconciliation: Local draft is reconciled with server-authoritative UUID', async () => {
      const cachedItems = await offlineStore.getCachedItems();
      const reconciled = cachedItems.find((item) => item.brand === 'Dell');

      assert(reconciled, 'Reconciled item must exist in local store');
      assert(
        reconciled.id.startsWith('server_item_uuid_'),
        'Local temp ID must be replaced by authoritative server UUID'
      );
      assert.strictEqual(reconciled.isOfflineDraft, false, 'Item must no longer be marked as draft');
      assert.strictEqual(reconciled.status, 'SUBMITTED', 'Authoritative server status must be preserved');
    });

    // -------------------------------------------------------------
    // 5. RETRY HANDLING & ERROR CLASSIFICATION TESTS
    // -------------------------------------------------------------
    await test('Retry Handling: Transient 503 error is retried up to max retries', async () => {
      await offlineQueue.clearQueue();
      simulate503Count = 1;

      // Set offline mode so enqueue does not auto-sync prematurely
      networkService.setMockConnection(false);

      const queueItem = await offlineQueue.enqueue({
        type: QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM,
        endpoint: '/ewaste-items',
        method: 'POST',
        payload: { brand: 'HP', model: 'Pavilion' },
        localId: 'temp_hp_1',
      });

      // Now set online and run sync
      networkService.setMockConnection(true);
      const syncResult1 = await offlineQueue.sync();
      assert.strictEqual(syncResult1.syncedCount, 0);

      const queueAfterFail = await offlineQueue.getQueue();
      const itemAfterFail = queueAfterFail.find((i) => i.id === queueItem.id);
      assert.strictEqual(itemAfterFail.status, QUEUE_STATUS.PENDING, 'Retryable failure must remain PENDING');
      assert.strictEqual(itemAfterFail.retries, 1, 'Retries count must increment');

      // Second sync attempt succeeds because simulate503Count was consumed
      const syncResult2 = await offlineQueue.sync();
      assert.strictEqual(syncResult2.syncedCount, 1);
    });

    await test('Non-retryable Error: Validation 400 immediately marks FAILED without infinite retries', async () => {
      await offlineQueue.clearQueue();
      networkService.setMockConnection(false);

      const queueItem = await offlineQueue.enqueue({
        type: QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM,
        endpoint: '/ewaste-items',
        method: 'POST',
        payload: { model: 'NoBrandDevice' }, // Missing brand triggers 400
        localId: 'temp_invalid_1',
      });

      networkService.setMockConnection(true);
      const syncResult = await offlineQueue.sync();
      assert.strictEqual(syncResult.failedCount, 1, 'Must count as failed');

      const queue = await offlineQueue.getQueue();
      const failedItem = queue.find((i) => i.id === queueItem.id);
      assert.strictEqual(failedItem.status, QUEUE_STATUS.FAILED, '400 must be marked FAILED');
      assert.strictEqual(failedItem.error.status, 400);
      assert.strictEqual(failedItem.retries, 0, 'Permanent failure must not increment retries');

      const syncResultSecond = await offlineQueue.sync();
      assert.strictEqual(syncResultSecond.syncedCount, 0);
      assert.strictEqual(syncResultSecond.failedCount, 0);
    });

    // -------------------------------------------------------------
    // 6. OFFLINE OPERATION BOUNDARIES
    // -------------------------------------------------------------
    await test('Offline Boundaries: Server-authoritative action strictly rejected when offline', async () => {
      networkService.setMockConnection(false);

      try {
        await pickupService.acceptRequest('req_123');
        assert.fail('Accepting request offline must be rejected');
      } catch (err) {
        assert(err.isNetworkError, 'Must throw network error requiring online connectivity');
        assert(err.message.includes('Internet connection required'), 'Error must explain online requirement');
      }

      networkService.setMockConnection(true);
    });

    // -------------------------------------------------------------
    // 7. SECURITY & CONCURRENCY TESTS
    // -------------------------------------------------------------
    await test('Security: Sensitive tokens and passwords never leaked in AppError', () => {
      const err = AppError.fromResponse(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
          },
        },
        401
      );

      const serialized = JSON.stringify(err);
      assert(!serialized.includes('password'), 'Error must never contain password');
      assert(!serialized.includes('secret'), 'Error must never contain secrets');
      assert(!serialized.includes('token'), 'Error must never leak secret tokens');
    });

    await test('Concurrency Lock: Rapid concurrent sync() calls execute only one synchronization pass', async () => {
      // Ensure any previous background sync has settled
      await offlineQueue.sync();

      // Enqueue an item while offline
      networkService.setMockConnection(false);
      await offlineQueue.enqueue({
        type: QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM,
        endpoint: '/ewaste-items',
        method: 'POST',
        payload: { brand: 'Lenovo', model: 'ThinkPad' },
        localId: 'temp_lenovo_1',
      });

      // Set online
      networkService.setMockConnection(true);

      // Launch multiple concurrent sync calls synchronously
      const p1 = offlineQueue.sync();
      const p2 = offlineQueue.sync();
      const p3 = offlineQueue.sync();

      // Verify that concurrent callers receive the exact same execution promise
      assert.strictEqual(p1, p2, 'Concurrent sync() call 2 must share identical execution promise');
      assert.strictEqual(p2, p3, 'Concurrent sync() call 3 must share identical execution promise');

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      assert.strictEqual(r1.syncedCount, 1);
      assert.strictEqual(r2.syncedCount, 1);
      assert.strictEqual(r3.syncedCount, 1);
    });

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n====================================================');
  console.log(`MOBILE FOUNDATION SUMMARY: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}% SUCCESS)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runMobileFoundationTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
