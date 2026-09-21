/**
 * EcoSetu Offline Sync Queue
 * Persistent FIFO queue for offline operations with automatic online synchronization,
 * retry handling with backoff, conflict handling, user tenancy isolation,
 * credential sanitization, failure classification, and local reconciliation.
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 5.2 & 6.1, docs/24_ERROR_EDGE_CASES.md Section 10,
 * docs/25_SIH_26229_REQUIREMENTS.md Module 20 (SIH-OFFLINE-001..014)
 */

import { storage } from '../utils/storage.js';
import { STORAGE_KEYS, QUEUE_STATUS, QUEUE_ACTION_TYPES, API_CONFIG } from '../utils/constants.js';
import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { offlineStore } from './offlineStore.js';

// Sensitive keys that MUST NEVER be stored in offline queue payloads
const SENSITIVE_PAYLOAD_KEYS = new Set([
  'password',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'aadhaar',
  'aadhaarNumber',
  'pan',
  'panNumber',
  'bankAccount',
  'accountNumber',
  'ifsc',
  'ifscCode',
  'cvv',
  'pin',
  'otp',
]);

/**
 * Recursively sanitize payload to prevent persisting sensitive credentials in the queue
 * @param {any} data
 * @returns {any}
 */
function sanitizePayload(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_PAYLOAD_KEYS.has(key)) {
      continue; // Exclude sensitive field entirely
    }
    if (val && typeof val === 'object') {
      clean[key] = sanitizePayload(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

class OfflineQueue {
  constructor() {
    this._syncPromise = null;
    this._listeners = new Set();
    this._syncPassCount = 0;

    // Automatically trigger synchronization when network returns online
    networkService.addListener(
      (networkState) => {
        if (networkState.isConnected && !this._syncPromise) {
          this.sync().catch((err) => {
            console.error('[OfflineQueue] Automatic sync error:', err);
          });
        }
      },
      {
        onOnline: () => {
          this.sync().catch((err) => {
            console.error('[OfflineQueue] Online reconnect sync error:', err);
          });
        },
      }
    );
  }

  /**
   * Subscribe to queue state updates
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  addListener(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async _notifyListeners() {
    const queue = await this.getQueue();
    const activeUserId = await this._getActiveUserId();

    // Filter queue to current user for caller diagnostics if logged in
    const userQueue = activeUserId ? queue.filter((item) => !item.userId || item.userId === activeUserId) : queue;

    const pendingCount = userQueue.filter(
      (item) => item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.PROCESSING || item.status === QUEUE_STATUS.SYNCING
    ).length;

    const failedCount = userQueue.filter((item) => item.status === QUEUE_STATUS.FAILED).length;
    const conflictCount = userQueue.filter((item) => item.status === QUEUE_STATUS.CONFLICT).length;

    const payload = {
      queue: userQueue,
      allQueue: queue,
      pendingCount,
      failedCount,
      conflictCount,
      isSyncing: Boolean(this._syncPromise),
    };

    for (const listener of this._listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[OfflineQueue] Listener notification error:', err);
      }
    }
  }

  /**
   * Retrieve current queue items from persistent storage
   * @returns {Promise<Array<Object>>}
   */
  async getQueue() {
    return (await storage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) || [];
  }

  /**
   * Save queue to storage and notify listeners
   * @private
   */
  async _saveQueue(queue) {
    await storage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    await this._notifyListeners();
  }

  /**
   * Get active authenticated user ID from storage
   * @private
   * @returns {Promise<string|null>}
   */
  async _getActiveUserId() {
    try {
      const user = await storage.getItem(STORAGE_KEYS.USER_PROFILE);
      return user?.id || user?.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Get count of pending actions (scoped to active user if authenticated)
   * @returns {Promise<number>}
   */
  async getPendingCount() {
    const queue = await this.getQueue();
    const activeUserId = await this._getActiveUserId();
    const filtered = activeUserId ? queue.filter((item) => !item.userId || item.userId === activeUserId) : queue;

    return filtered.filter(
      (item) =>
        item.status === QUEUE_STATUS.PENDING ||
        item.status === QUEUE_STATUS.PROCESSING ||
        item.status === QUEUE_STATUS.SYNCING
    ).length;
  }

  /**
   * Get diagnostic summary of current queue state
   * @returns {Promise<{ pending: number, failed: number, conflict: number, total: number, isSyncing: boolean }>}
   */
  async getDiagnostics() {
    const queue = await this.getQueue();
    const activeUserId = await this._getActiveUserId();
    const userQueue = activeUserId ? queue.filter((item) => !item.userId || item.userId === activeUserId) : queue;

    return {
      pending: userQueue.filter(
        (i) => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.PROCESSING || i.status === QUEUE_STATUS.SYNCING
      ).length,
      failed: userQueue.filter((i) => i.status === QUEUE_STATUS.FAILED).length,
      conflict: userQueue.filter((i) => i.status === QUEUE_STATUS.CONFLICT).length,
      total: userQueue.length,
      isSyncing: Boolean(this._syncPromise),
    };
  }

  /**
   * Enqueue a new operation for offline persistence and eventual sync
   * @param {Object} action
   * @param {string} action.type - Operation type (e.g. QUEUE_ACTION_TYPES.CREATE_MATERIAL_LOT)
   * @param {string} action.endpoint - Backend API endpoint
   * @param {string} [action.method='POST'] - HTTP method
   * @param {any} action.payload - Request payload (will be sanitized)
   * @param {string} [action.localId] - Temporary local identifier for reconciliation
   * @param {string} [action.clientOperationId] - Optional explicit client operation ID for idempotency
   * @param {string} [action.userId] - Optional explicit user ID (defaults to active authenticated user)
   * @returns {Promise<Object>} queued item
   */
  async enqueue({ type, endpoint, method = 'POST', payload, localId = null, clientOperationId = null, userId = null }) {
    const queue = await this.getQueue();
    const activeUserId = userId || (await this._getActiveUserId());

    const opId = clientOperationId || `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Strip sensitive fields (passwords, tokens, bank credentials)
    const sanitized = sanitizePayload(payload);

    const queueItem = {
      id: opId,
      clientOperationId: opId,
      userId: activeUserId,
      type,
      endpoint,
      method,
      payload: sanitized,
      localId,
      status: QUEUE_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAttemptAt: null,
      retries: 0,
      maxRetries: API_CONFIG.MAX_RETRIES || 3,
      error: null,
    };

    queue.push(queueItem);
    await this._saveQueue(queue);

    // Safe diagnostic log (no secrets or sensitive credentials)
    console.log(`[OfflineQueue] Enqueued action: ${type}, clientOperationId: ${opId}, localId: ${localId || 'none'}`);

    // If online, kick off sync immediately
    if (networkService.isConnected() && !this._syncPromise) {
      this.sync().catch((err) => {
        console.error('[OfflineQueue] Immediate sync trigger error:', err);
      });
    }

    return queueItem;
  }

  /**
   * Synchronize pending operations with the backend API.
   * Safe execution lock: returns existing promise if sync is already running.
   * Scoped to the currently authenticated user to ensure tenancy isolation.
   * @returns {Promise<{ syncedCount: number, failedCount: number, conflictCount: number, offline?: boolean }>}
   */
  sync() {
    if (this._syncPromise) {
      return this._syncPromise;
    }

    if (!networkService.isConnected()) {
      return Promise.resolve({ syncedCount: 0, failedCount: 0, conflictCount: 0, offline: true });
    }

    this._syncPromise = this._executeSync().finally(() => {
      this._syncPromise = null;
    });

    return this._syncPromise;
  }

  /**
   * Safe manual "Sync now" action triggered by the user
   * Returns honest feedback if offline or already running.
   * @returns {Promise<{ syncedCount: number, failedCount: number, conflictCount: number, offline?: boolean, alreadySyncing?: boolean }>}
   */
  async syncNow() {
    if (!networkService.isConnected()) {
      return { syncedCount: 0, failedCount: 0, conflictCount: 0, offline: true };
    }

    if (this._syncPromise) {
      // In-flight guard: wait for existing sync without triggering a duplicate execution
      const res = await this._syncPromise;
      return { ...(res || {}), alreadySyncing: true };
    }

    return this.sync();
  }

  async _executeSync() {
    this._syncPassCount = (this._syncPassCount || 0) + 1;
    let syncedCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    try {
      const queue = await this.getQueue();
      const activeUserId = await this._getActiveUserId();

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // Only process PENDING or SYNCING items
        if (item.status !== QUEUE_STATUS.PENDING && item.status !== QUEUE_STATUS.SYNCING) {
          continue;
        }

        // Enforce user tenancy isolation: do NOT process items belonging to another user
        if (activeUserId && item.userId && item.userId !== activeUserId) {
          continue;
        }

        // Mark as SYNCING / PROCESSING
        item.status = QUEUE_STATUS.SYNCING;
        item.updatedAt = new Date().toISOString();
        item.lastAttemptAt = new Date().toISOString();
        await this._saveQueue(queue);

        try {
          console.log(`[OfflineQueue] Processing item ${item.id} (${item.type}) for user ${item.userId || 'anonymous'}`);

          // If queued ewaste item has a local offline image, upload it first and link imageUrl
          if (
            item.type === QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM &&
            item.payload &&
            item.payload.imageUri &&
            (item.payload.imageUri.startsWith('file:') || item.payload.imageUri.startsWith('content:')) &&
            !item.payload.imageUrl
          ) {
            try {
              const formData = new FormData();
              formData.append('image', {
                uri: item.payload.imageUri,
                type: 'image/jpeg',
                name: `offline_${Date.now()}.jpg`,
              });
              const uploadRes = await apiClient.request('/ewaste-items/upload', {
                method: 'POST',
                body: formData,
              });
              const serverImageUrl = uploadRes?.data?.imageUrl || uploadRes?.imageUrl;
              if (serverImageUrl) {
                item.payload.imageUrl = serverImageUrl;
                delete item.payload.imageUri;
                await this._saveQueue(queue);
              }
            } catch (imgErr) {
              console.warn('[OfflineQueue] Offline image upload warning:', imgErr?.message);
            }
          }

          // Execute network call via central apiClient
          const response = await apiClient.request(item.endpoint, {
            method: item.method,
            body: item.payload,
          });

          // Successful execution
          item.status = QUEUE_STATUS.SYNCED;
          item.updatedAt = new Date().toISOString();
          item.error = null;
          syncedCount++;

          // Reconcile local state based on action type
          await this._reconcileLocalState(item, response);

          console.log(`[OfflineQueue] Successfully synced ${item.id} (${item.type})`);
        } catch (error) {
          const status = error?.status || 0;
          const isRetryable = Boolean(error?.isRetryable);
          const isConflict = status === 409 || error?.code === 'CONFLICT';

          item.updatedAt = new Date().toISOString();
          item.error = {
            code: error?.code || (isConflict ? 'CONFLICT' : 'SYNC_ERROR'),
            message: error?.message || 'Synchronization failed',
            status,
            details: error?.details || null,
          };

          if (isConflict) {
            // Conservative conflict model: server state is authoritative.
            // Do NOT blindly overwrite. Mark CONFLICT, preserve error, do NOT retry endlessly.
            item.status = QUEUE_STATUS.CONFLICT;
            conflictCount++;
            console.warn(
              `[OfflineQueue] Conflict detected for ${item.id} (${item.type}). Server rejected change: ${error?.message}`
            );
          } else if (isRetryable && item.retries < item.maxRetries) {
            // Bounded exponential backoff retry for transient network/server failures
            item.retries += 1;
            item.status = QUEUE_STATUS.PENDING;
            const backoffMs = Math.min(1000 * Math.pow(2, item.retries), 10000);
            item.nextRetryAfter = Date.now() + backoffMs;
            console.warn(
              `[OfflineQueue] Retryable error for ${item.id} (${item.type}). Attempt ${item.retries}/${item.maxRetries}`
            );
          } else {
            // Permanent failure (400 validation, 403 forbidden, 404 not found, or retries exhausted)
            item.status = QUEUE_STATUS.FAILED;
            failedCount++;
            console.error(
              `[OfflineQueue] Permanent failure for ${item.id} (${item.type}). Status: ${status}, Code: ${error?.code}`
            );
          }
        }

        // Save progress after each item
        await this._saveQueue(queue);
      }

      // Purge SYNCED items from persistent queue to keep queue lean
      const updatedQueue = await this.getQueue();
      const remainingQueue = updatedQueue.filter((item) => item.status !== QUEUE_STATUS.SYNCED);
      if (remainingQueue.length !== updatedQueue.length) {
        await this._saveQueue(remainingQueue);
      }
    } finally {
      await this._notifyListeners();
    }

    return { syncedCount, failedCount, conflictCount };
  }

  /**
   * Return total count of actual sync execution passes (for concurrency verification)
   * @returns {number}
   */
  getSyncPassCount() {
    return this._syncPassCount || 0;
  }

  /**
   * Reconcile local offline data with authoritative server responses
   * @private
   */
  async _reconcileLocalState(item, response) {
    if (!response) return;

    try {
      if (item.type === QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM && item.localId) {
        const serverItem = response.data?.item || response.data;
        if (serverItem && serverItem.id) {
          await offlineStore.reconcileItem(item.localId, serverItem);
        }
      } else if (item.type === QUEUE_ACTION_TYPES.CREATE_REQUEST && item.localId) {
        const serverRequest = response.data?.request || response.data;
        if (serverRequest && serverRequest.id) {
          await offlineStore.reconcileRequest(item.localId, serverRequest);
        }
      } else if (item.type === QUEUE_ACTION_TYPES.CREATE_MATERIAL_LOT && item.localId) {
        const serverLot = response.data?.lot || response.data;
        if (serverLot && serverLot.id) {
          await offlineStore.reconcileLot(item.localId, serverLot);
        }
      } else if (item.type === QUEUE_ACTION_TYPES.UPDATE_COLLECTOR_PROFILE) {
        // Reconcile profile cache on successful profile update sync
        const profile = response.data?.profile || response.data;
        if (profile) {
          const cached = (await storage.getItem('@ecosetu_collector_profile')) || {};
          await storage.setItem('@ecosetu_collector_profile', {
            ...cached,
            ...profile,
            isPendingSync: false,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('[OfflineQueue] Reconciliation error:', err);
    }
  }

  /**
   * Remove item from queue by ID
   * @param {string} id
   */
  async removeQueueItem(id) {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await this._saveQueue(filtered);
  }

  /**
   * Clear all items from queue
   */
  async clearQueue() {
    await storage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    await this._notifyListeners();
  }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;

