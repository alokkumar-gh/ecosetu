/**
 * EcoSetu Mobile Collector Sync & Realtime Feed Service
 * Provides dynamic real-time synchronization of collector availability,
 * available open pickup requests, and scheduled pickups without manual page refreshes.
 *
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md, docs/23_NOTIFICATION_SYSTEM.md
 */

import { collectorService } from './collectorService.js';
import { fcmClientService } from './fcmClientService.js';
import { networkService } from './networkService.js';

export interface CollectorRealtimeRequest {
  id: string;
  requestId?: string;
  category?: string;
  condition?: string;
  estimatedWeightKg?: number | string | null;
  imageUrl?: string | null;
  distanceKm?: number | null;
  pickupAddress?: string;
  city?: string;
  status?: string;
  createdAt?: string;
  ewasteItems?: any[];
  items?: any[];
  itemsCount?: number;
  valuation?: any;
  score?: number;
  myOffer?: any;
  offersCount?: number;
}

export interface CollectorSyncData {
  isAvailable: boolean;
  availableRequests: CollectorRealtimeRequest[];
  pendingPickups: any[];
  lastSyncedAt: number | null;
  fromCache: boolean;
}

export type CollectorSyncListener = (data: CollectorSyncData) => void;

class CollectorSyncService {
  private _listeners: Set<CollectorSyncListener> = new Set();
  private _isInitialized: boolean = false;
  private _unsubFcm: (() => void) | null = null;
  private _cachedData: CollectorSyncData = {
    isAvailable: true,
    availableRequests: [],
    pendingPickups: [],
    lastSyncedAt: null,
    fromCache: true,
  };

  constructor() {
    this.init();
  }

  /**
   * Initialize background notification and realtime listeners
   */
  public init(): void {
    if (this._isInitialized) return;
    this._isInitialized = true;

    // Listen to push / realtime notifications from FCM / in-app channels
    const unsub = fcmClientService.addListener((notification: any) => {
      this._handleIncomingNotification(notification);
    });
    if (typeof unsub === 'function') {
      this._unsubFcm = () => unsub();
    }
  }

  /**
   * Subscribe a component (e.g. CollectorBrowseScreen, CollectorDashboardScreen) to live updates
   */
  public subscribe(listener: CollectorSyncListener): () => void {
    this._listeners.add(listener);
    // Immediately provide current state
    try {
      listener(this._cachedData);
    } catch {}

    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._cachedData);
      } catch (err) {
        console.warn('[CollectorSyncService] Listener notification error:', err);
      }
    }
  }

  /**
   * Handle incoming realtime notification for available requests or status transitions
   */
  private _handleIncomingNotification(notification: any): void {
    if (!notification) return;

    const notifType = notification.type || notification.data?.type;
    const isRequestAvailable =
      notifType === 'REQUEST_AVAILABLE' ||
      notifType === 'COLLECTOR_PICKUP_REQUEST_AVAILABLE';

    if (isRequestAvailable) {
      const payload = notification.data || notification;
      const rawId = payload.requestId || payload.referenceId || payload.id;
      if (!rawId) return;

      const requestId = String(rawId);

      // Construct normalized request item
      const newItem: CollectorRealtimeRequest = {
        id: requestId,
        requestId,
        category: payload.category || 'OTHER',
        condition: payload.condition || 'UNKNOWN',
        estimatedWeightKg: payload.estimatedWeightKg || null,
        imageUrl: payload.imageUrl || null,
        distanceKm: payload.distanceKm ? parseFloat(payload.distanceKm) : null,
        pickupAddress: payload.pickupAddress || 'Service location verified',
        status: 'SUBMITTED',
        createdAt: payload.createdAt || new Date().toISOString(),
        ewasteItems: [
          {
            id: `item-${requestId}`,
            category: payload.category || 'OTHER',
            condition: payload.condition || 'UNKNOWN',
            estimatedWeightKg: payload.estimatedWeightKg || null,
            imageUrl: payload.imageUrl || null,
          },
        ],
        itemsCount: 1,
      };

      // Stable deduplication using requestId/id
      const existingIndex = this._cachedData.availableRequests.findIndex(
        (r) => r.id === requestId || r.requestId === requestId,
      );

      let updatedList: CollectorRealtimeRequest[];
      if (existingIndex >= 0) {
        updatedList = [...this._cachedData.availableRequests];
        updatedList[existingIndex] = {
          ...updatedList[existingIndex],
          ...newItem,
        };
      } else {
        // Prepend new request
        updatedList = [newItem, ...this._cachedData.availableRequests];
      }

      this._cachedData = {
        ...this._cachedData,
        availableRequests: updatedList,
        lastSyncedAt: Date.now(),
        fromCache: false,
      };

      this._notify();

      // Trigger authoritative catch-up in background to load complete pricing and relations
      this.refreshAvailableRequests().catch(() => {});
    }
  }

  /**
   * Fetch authoritative available requests and pickups from backend
   */
  public async fetchAuthoritative(force: boolean = false): Promise<CollectorSyncData> {
    if (!networkService.isConnected()) {
      return this._cachedData;
    }

    try {
      const [profileRes, availableRes, pickupsRes] = await Promise.allSettled([
        (collectorService as any).getProfile(),
        (collectorService as any).getAvailableRequests({ limit: 50 }),
        (collectorService as any).getMyPickups({ limit: 20 }),
      ]);

      let isAvailable = this._cachedData.isAvailable;
      if (profileRes.status === 'fulfilled' && profileRes.value?.profile) {
        isAvailable = Boolean(profileRes.value.profile.isAvailable);
      }

      let availableRequests: CollectorRealtimeRequest[] = [];
      if (availableRes.status === 'fulfilled') {
        const rawReqs =
          availableRes.value?.requests || availableRes.value?.data || [];
        // Deduplicate
        const seen = new Set<string>();
        for (const req of rawReqs) {
          const id = String(req.id || req.requestId || '');
          if (id && !seen.has(id)) {
            seen.add(id);
            availableRequests.push(req);
          }
        }
      } else {
        availableRequests = this._cachedData.availableRequests;
      }

      let pendingPickups: any[] = [];
      if (pickupsRes.status === 'fulfilled') {
        const rawPickups =
          pickupsRes.value?.pickups || pickupsRes.value?.data || [];
        pendingPickups = Array.isArray(rawPickups) ? rawPickups : [];
      } else {
        pendingPickups = this._cachedData.pendingPickups;
      }

      this._cachedData = {
        isAvailable,
        availableRequests,
        pendingPickups,
        lastSyncedAt: Date.now(),
        fromCache: false,
      };

      this._notify();
      return this._cachedData;
    } catch (err) {
      console.warn('[CollectorSyncService] fetchAuthoritative error:', err);
      return this._cachedData;
    }
  }

  /**
   * Refresh available requests list
   */
  public async refreshAvailableRequests(): Promise<CollectorRealtimeRequest[]> {
    if (!networkService.isConnected()) {
      return this._cachedData.availableRequests;
    }

    try {
      const res = await (collectorService as any).getAvailableRequests({ limit: 50 });
      const rawReqs = res?.requests || res?.data || [];
      const seen = new Set<string>();
      const deduped: CollectorRealtimeRequest[] = [];
      for (const req of rawReqs) {
        const id = String(req.id || req.requestId || '');
        if (id && !seen.has(id)) {
          seen.add(id);
          deduped.push(req);
        }
      }

      this._cachedData = {
        ...this._cachedData,
        availableRequests: deduped,
        lastSyncedAt: Date.now(),
        fromCache: false,
      };

      this._notify();
      return deduped;
    } catch (err) {
      return this._cachedData.availableRequests;
    }
  }

  /**
   * Toggle availability and immediately reconcile feed
   */
  public async setAvailability(isAvailable: boolean): Promise<boolean> {
    this._cachedData = {
      ...this._cachedData,
      isAvailable,
    };
    this._notify();

    try {
      await (collectorService as any).toggleAvailability(isAvailable);
      // Immediately refresh available requests
      await this.refreshAvailableRequests();
      return true;
    } catch (err) {
      // Revert on failure
      this._cachedData = {
        ...this._cachedData,
        isAvailable: !isAvailable,
      };
      this._notify();
      throw err;
    }
  }

  /**
   * Get current in-memory cached state
   */
  public getCachedData(): CollectorSyncData {
    return this._cachedData;
  }
}

export const collectorSyncService = new CollectorSyncService();
export default collectorSyncService;
