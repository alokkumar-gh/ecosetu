/**
 * EcoSetu Citizen Synchronization & Bootstrap Service
 * Fast, silent, cached-first data synchronization for the Citizen portal.
 *
 * Implements:
 * 1. Instant Cache-First Paint: Reads cached profile, items, requests, and notifications.
 * 2. Parallel Critical Fetch: Runs essential first-paint APIs concurrently (Promise.allSettled).
 * 3. Background Secondary Sync: Silently synchronizes notifications and history without blocking UI.
 * 4. Deduplication & Concurrency Guard: Prevents redundant sync triggers from remounts or React StrictMode.
 * 5. Event Subscription: Allows UI screens to subscribe to real-time sync status and data updates.
 */

import { ewasteService } from './ewasteService';
import { requestService } from './requestService';
import { userProfileService } from './userProfileService';
import { notificationService } from './notificationService';
import { offlineStore } from './offlineStore';
import { networkService } from './networkService';

export interface CitizenCriticalData {
  user: any | null;
  items: any[];
  requests: any[];
  unreadNotificationCount: number;
  fromCache: boolean;
  lastSyncedAt: number | null;
}

export interface CitizenSyncState {
  isBootstrapping: boolean;
  isBackgroundSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

type SyncListener = (data: CitizenCriticalData, state: CitizenSyncState) => void;

class CitizenSyncService {
  private _listeners: Set<SyncListener> = new Set();
  private _inFlightPromise: Promise<CitizenCriticalData> | null = null;
  private _lastSyncedAt: number | null = null;
  private _cachedData: CitizenCriticalData = {
    user: null,
    items: [],
    requests: [],
    unreadNotificationCount: 0,
    fromCache: true,
    lastSyncedAt: null,
  };
  private _state: CitizenSyncState = {
    isBootstrapping: false,
    isBackgroundSyncing: false,
    lastSyncedAt: null,
    error: null,
  };

  /**
   * Subscribe to Citizen sync updates
   */
  subscribe(listener: SyncListener): () => void {
    this._listeners.add(listener);
    // Immediately notify subscriber of current state
    listener(this._cachedData, this._state);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify() {
    for (const listener of this._listeners) {
      try {
        listener(this._cachedData, this._state);
      } catch (err) {
        console.warn('[CitizenSyncService] Listener error:', err);
      }
    }
  }

  /**
   * Immediately read cached citizen data from local storage
   */
  async getCachedData(): Promise<CitizenCriticalData> {
    try {
      const [cachedItems, cachedRequests, profileResult, unreadCount] = await Promise.all([
        offlineStore.getCachedItems(),
        offlineStore.getCachedRequests(),
        userProfileService.getProfile().catch(() => ({ user: null, fromCache: true })),
        notificationService.getUnreadCount().catch(() => 0),
      ]);

      this._cachedData = {
        user: profileResult?.user || this._cachedData.user || null,
        items: Array.isArray(cachedItems) ? cachedItems : [],
        requests: Array.isArray(cachedRequests) ? cachedRequests : [],
        unreadNotificationCount: typeof unreadCount === 'number' ? unreadCount : 0,
        fromCache: true,
        lastSyncedAt: this._lastSyncedAt,
      };

      this._notify();
      return this._cachedData;
    } catch (err) {
      console.warn('[CitizenSyncService] Error reading local cache:', err);
      return this._cachedData;
    }
  }

  /**
   * Bootstrap Citizen portal: Instant cache read + Parallel background server sync
   * @param force - Force sync even if recently synced
   */
  async bootstrap(force = false): Promise<CitizenCriticalData> {
    // 1. If a sync is already in flight, return existing promise (deduplication)
    if (this._inFlightPromise) {
      return this._inFlightPromise;
    }

    // 2. Read local cache first for instant usable UI
    await this.getCachedData();

    // If offline or recently synced within 15 seconds (and not forced), return cached
    const now = Date.now();
    if (!networkService.isConnected() || (!force && this._lastSyncedAt && now - this._lastSyncedAt < 15000)) {
      return this._cachedData;
    }

    // 3. Initiate parallel server fetch
    this._state.isBackgroundSyncing = true;
    this._state.error = null;
    this._notify();

    this._inFlightPromise = (async () => {
      try {
        // Parallelized fetch using Promise.allSettled for failure isolation
        const [profileRes, itemsRes, requestsRes, unreadRes] = await Promise.allSettled([
          userProfileService.getProfile(),
          ewasteService.getItems(),
          requestService.getRequests(),
          notificationService.getUnreadCount(),
        ]);

        // Process profile result
        if (profileRes.status === 'fulfilled' && profileRes.value?.user) {
          this._cachedData.user = profileRes.value.user;
        }

        // Process items result
        if (itemsRes.status === 'fulfilled' && Array.isArray(itemsRes.value)) {
          this._cachedData.items = itemsRes.value;
        }

        // Process requests result
        if (requestsRes.status === 'fulfilled' && Array.isArray(requestsRes.value)) {
          this._cachedData.requests = requestsRes.value;
        }

        // Process unread count result
        if (unreadRes.status === 'fulfilled' && typeof unreadRes.value === 'number') {
          this._cachedData.unreadNotificationCount = unreadRes.value;
        }

        this._lastSyncedAt = Date.now();
        this._cachedData.lastSyncedAt = this._lastSyncedAt;
        this._cachedData.fromCache = false;
        this._state.lastSyncedAt = this._lastSyncedAt;
        this._state.isBackgroundSyncing = false;
        this._state.error = null;

        this._notify();

        // 4. Silently trigger secondary background sync (notifications page 1)
        this._syncSecondaryData();

        return this._cachedData;
      } catch (err: any) {
        console.warn('[CitizenSyncService] Background sync error:', err?.message || err);
        this._state.isBackgroundSyncing = false;
        this._state.error = err?.message || 'Sync failed';
        this._notify();
        return this._cachedData;
      } finally {
        this._inFlightPromise = null;
      }
    })();

    return this._inFlightPromise;
  }

  /**
   * Silently sync secondary non-critical data in background
   */
  private async _syncSecondaryData() {
    try {
      if (!networkService.isConnected()) return;
      // Fetch recent notifications quietly
      await notificationService.getNotifications({ page: 1, limit: 10 }).catch(() => {});
    } catch (err) {
      // Non-critical background fetch error ignored
    }
  }

  /**
   * Clear all in-memory sync state (e.g., on logout)
   */
  clear() {
    this._cachedData = {
      user: null,
      items: [],
      requests: [],
      unreadNotificationCount: 0,
      fromCache: true,
      lastSyncedAt: null,
    };
    this._lastSyncedAt = null;
    this._inFlightPromise = null;
    this._state = {
      isBootstrapping: false,
      isBackgroundSyncing: false,
      lastSyncedAt: null,
      error: null,
    };
    this._notify();
  }
}

export const citizenSyncService = new CitizenSyncService();
export default citizenSyncService;
