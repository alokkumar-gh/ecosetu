/**
 * EcoSetu Offline Sync Queue
 * Persistent FIFO queue for offline operations with automatic online synchronization,
 * retry handling with backoff, failure classification, and local reconciliation.
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 5.2 & 6.1, docs/24_ERROR_EDGE_CASES.md Section 10
 */

import { storage } from '../utils/storage.js';
import { STORAGE_KEYS, QUEUE_STATUS, QUEUE_ACTION_TYPES, API_CONFIG } from '../utils/constants.js';
import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { offlineStore } from './offlineStore.js';

class OfflineQueue {
  constructor() {
    this._syncPromise = null;
    this._listeners = new Set();

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
    const pendingCount = queue.filter(
      (item) => item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.PROCESSING
    ).length;

    const payload = {
      queue,
      pendingCount,
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
   * Get count of pending actions
   * @returns {Promise<number>}
   */
  async getPendingCount() {
    const queue = await this.getQueue();
    return queue.filter(
      (item) => item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.PROCESSING
    ).length;
  }

  /**
   * Enqueue a new operation for offline persistence and eventual sync
   * @param {Object} action
   * @param {string} action.type - Operation type (e.g. QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM)
   * @param {string} action.endpoint - Backend API endpoint
   * @param {string} [action.method='POST'] - HTTP method
   * @param {any} action.payload - Request payload
   * @param {string} [action.localId] - Temporary local identifier for reconciliation
   * @returns {Promise<Object>} queued item
   */
  async enqueue({ type, endpoint, method = 'POST', payload, localId = null }) {
    const queue = await this.getQueue();

    const queueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      endpoint,
      method,
      payload,
      localId,
      status: QUEUE_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retries: 0,
      maxRetries: API_CONFIG.MAX_RETRIES,
      error: null,
    };

    queue.push(queueItem);
    await this._saveQueue(queue);

    // Safe diagnostic log (no secrets or sensitive credentials)
    console.log(`[OfflineQueue] Enqueued action: ${type}, localId: ${localId || 'none'}`);

    // If online, kick off sync immediately
    if (networkService.isConnected() && !this._syncPromise) {
      this.sync().catch((err) => {
        console.error('[OfflineQueue] Immediate sync trigger error:', err);
      });
    }

    return queueItem;
  }

  /**
   * Synchronize pending operations with the backend API
   * @returns {Promise<{ syncedCount: number, failedCount: number, offline?: boolean }>}
   */
  sync() {
    if (this._syncPromise) {
      return this._syncPromise;
    }

    if (!networkService.isConnected()) {
      return Promise.resolve({ syncedCount: 0, failedCount: 0, offline: true });
    }

    this._syncPromise = this._executeSync().finally(() => {
      this._syncPromise = null;
    });

    return this._syncPromise;
  }

  async _executeSync() {
    this._syncPassCount = (this._syncPassCount || 0) + 1;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const queue = await this.getQueue();

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // Only process PENDING items
        if (item.status !== QUEUE_STATUS.PENDING) {
          continue;
        }

        // Mark as PROCESSING
        item.status = QUEUE_STATUS.PROCESSING;
        item.updatedAt = new Date().toISOString();
        await this._saveQueue(queue);

        try {
          // Safe log
          console.log(`[OfflineQueue] Processing item ${item.id} (${item.type})`);

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
          const isRetryable = Boolean(error?.isRetryable);
          item.updatedAt = new Date().toISOString();
          item.error = {
            code: error?.code || 'SYNC_ERROR',
            message: error?.message || 'Synchronization failed',
            status: error?.status || 0,
          };

          if (isRetryable && item.retries < item.maxRetries) {
            item.retries += 1;
            item.status = QUEUE_STATUS.PENDING;
            console.warn(
              `[OfflineQueue] Retryable error for ${item.id} (${item.type}). Attempt ${item.retries}/${item.maxRetries}`
            );
          } else {
            // Non-retryable error (validation 400, forbidden 403, conflict 409, or max retries exceeded)
            item.status = QUEUE_STATUS.FAILED;
            failedCount++;
            console.error(
              `[OfflineQueue] Permanent failure for ${item.id} (${item.type}). Status: ${error?.status}, Code: ${error?.code}`
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

    return { syncedCount, failedCount };
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
