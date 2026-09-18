/**
 * EcoSetu Mobile Collector Service
 * Handles collector profile, availability, stats, available requests, and active pickups.
 *
 * Verified endpoints (backend/src/routes/*):
 *   GET   /api/v1/collectors/profile        – collector profile + user data
 *   PATCH /api/v1/collectors/availability   – toggle isAvailable (requires checkVerified)
 *   GET   /api/v1/collectors/stats          – totalPickups, totalWeightKg, totalConsignments, activeRequests
 *   GET   /api/v1/collection-requests/available – privacy-masked available requests (requires checkVerified)
 *   POST  /api/v1/collection-requests/:id/accept – accept a SUBMITTED request (server-authoritative, requires online)
 *   GET   /api/v1/pickups                   – collector's own pickups (not /pickups/my-pickups)
 *
 * Privacy note:
 *   Available requests are returned by the backend with masked pickup address:
 *   "Approximate Location (Exact address revealed upon acceptance)"
 *   and rounded coordinates. The client MUST NOT reconstruct the exact address.
 *
 * Offline strategy:
 *   - READ operations cache to AsyncStorage; stale data shown when offline
 *   - WRITE operations (accept, toggle availability) require connectivity — NOT offline-queued
 *     (not in QUEUE_ACTION_TYPES; server-authoritative race-condition checks must run live)
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Sections 4, 7, 8
 *   docs/07_BUSINESS_WORKFLOWS.md Section 2
 *   docs/09_FRONTEND_ARCHITECTURE.md Section 5.2
 *   docs/13_SECURITY_PRIVACY.md
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { AppError } from '../utils/AppError.js';
import { recyclingService } from './recyclingService.js';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Cache keys — isolated from citizen cache keys
const CACHE_COLLECTOR_PROFILE = '@ecosetu_collector_profile';
const CACHE_COLLECTOR_STATS   = '@ecosetu_collector_stats';
const CACHE_AVAILABLE_REQUESTS = '@ecosetu_collector_available_requests';
const CACHE_COLLECTOR_PICKUPS  = '@ecosetu_collector_pickups';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function _writeCache(key, data) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Cache write failure is non-fatal
  }
}

// ─── Collector Service ─────────────────────────────────────────────────────────

class CollectorService {
  /**
   * Get authenticated collector's own profile.
   * Falls back to cache when offline.
   *
   * Response shape: { profile: { id, userId, serviceAreaLat, serviceAreaLng,
   *   serviceRadiusKm, bio, isAvailable, totalPickups, user: { id, email, name, phone, role, status } } }
   *
   * @returns {Promise<{ profile: object|null, fromCache: boolean }>}
   */
  async getProfile() {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get('/collectors/profile');
        const profile = response.data?.profile || response.data;
        if (profile) await _writeCache(CACHE_COLLECTOR_PROFILE, profile);
        return { profile, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_COLLECTOR_PROFILE);
          return { profile: cached, fromCache: true };
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_COLLECTOR_PROFILE);
    return { profile: cached, fromCache: true };
  }

  /**
   * Create or update collector profile details.
   * Endpoint: PUT /api/v1/collectors/profile
   * Editable fields: bio (<= 500 chars), serviceRadiusKm (1-50 km), serviceAreaLat, serviceAreaLng
   * Protected fields: id, userId, totalPickups, idDocumentUrl, createdAt, updatedAt
   *
   * @param {object} fields - { bio?: string, serviceRadiusKm?: number, serviceAreaLat?: number, serviceAreaLng?: number }
   * @returns {Promise<object>} Updated collector profile
   */
  async updateCollectorProfile(fields) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Collector profile updates require an internet connection.'),
        { isOfflineError: true },
      );
    }
    const response = await apiClient.put('/collectors/profile', fields);
    const profile = response.data?.profile || response.data;
    if (profile) await _writeCache(CACHE_COLLECTOR_PROFILE, profile);
    return profile;
  }

  /**
   * Toggle collector availability.
   * Requires connectivity — server-authoritative + requires checkVerified middleware.
   * Only modifies isAvailable — does NOT touch role, status, or verification.
   *
   * @param {boolean} isAvailable
   * @returns {Promise<object>} Updated profile
   */
  async toggleAvailability(isAvailable) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Availability changes require an internet connection.'),
        { isOfflineError: true },
      );
    }
    const response = await apiClient.patch('/collectors/availability', { isAvailable });
    const profile = response.data?.profile || response.data;
    // Update local cache with new availability
    if (profile) await _writeCache(CACHE_COLLECTOR_PROFILE, profile);
    return profile;
  }

  /**
   * Get authenticated collector's operational statistics.
   * Response shape: { totalPickups, totalWeightKg, totalConsignments, activeRequests }
   *
   * Falls back to cache when offline.
   *
   * @returns {Promise<{ stats: object|null, fromCache: boolean }>}
   */
  async getStats() {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get('/collectors/stats');
        const stats = response.data;
        if (stats) await _writeCache(CACHE_COLLECTOR_STATS, stats);
        return { stats, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_COLLECTOR_STATS);
          return { stats: cached, fromCache: true };
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_COLLECTOR_STATS);
    return { stats: cached, fromCache: true };
  }

  /**
   * Get available SUBMITTED collection requests near the collector's service area.
   * Backend applies privacy masking:
   *   pickupAddress = "Approximate Location (Exact address revealed upon acceptance)"
   *   pickupLat/pickupLng = rounded to 2 decimal places
   *
   * Requires checkVerified (ACTIVE status). Falls back to cache when offline.
   *
   * @param {object} [params] - { lat, lng, radiusKm, page, limit }
   * @returns {Promise<{ requests: Array, pagination: object|null, fromCache: boolean }>}
   */
  async getAvailableRequests(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query
          ? `/collection-requests/available?${query}`
          : '/collection-requests/available';
        const response = await apiClient.get(endpoint);
        const requests = response.data?.requests || response.data || [];
        const pagination = response.data?.pagination || null;
        // Cache only the requests array for offline fallback
        await _writeCache(CACHE_AVAILABLE_REQUESTS, requests);
        return { requests, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_AVAILABLE_REQUESTS);
          return { requests: cached || [], pagination: null, fromCache: true };
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_AVAILABLE_REQUESTS);
    return { requests: cached || [], pagination: null, fromCache: true };
  }

  /**
   * Accept an available collection request.
   * Server-authoritative — requires connectivity.
   * Backend performs atomic transaction to prevent double-acceptance (409 conflict).
   * MUST NOT be queued for offline execution.
   *
   * @param {string} requestId - Collection request UUID
   * @returns {Promise<{ request: object, pickup: object }>}
   */
  async acceptRequest(requestId) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Accepting collection requests requires an internet connection. Real-time availability check is required.'),
        { isOfflineError: true },
      );
    }
    const response = await apiClient.post(`/collection-requests/${requestId}/accept`);
    return response.data;
  }

  /**
   * Get collector's own assigned pickups.
   * Correct endpoint: GET /api/v1/pickups (not /pickups/my-pickups)
   * Falls back to cache when offline.
   *
   * @param {object} [params] - { status, page, limit }
   * @returns {Promise<{ pickups: Array, pagination: object|null, fromCache: boolean }>}
   */
  async getMyPickups(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/pickups?${query}` : '/pickups';
        const response = await apiClient.get(endpoint);
        const pickups = response.data?.pickups || response.data || [];
        const pagination = response.data?.pagination || null;
        await _writeCache(CACHE_COLLECTOR_PICKUPS, pickups);
        return { pickups, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_COLLECTOR_PICKUPS);
          return { pickups: cached || [], pagination: null, fromCache: true };
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_COLLECTOR_PICKUPS);
    return { pickups: cached || [], pagination: null, fromCache: true };
  }

  /**
   * Start a scheduled pickup (SCHEDULED -> IN_PROGRESS).
   * Server-authoritative — requires connectivity.
   * MUST NOT be queued for offline execution.
   *
   * @param {string} pickupId - Pickup UUID
   * @returns {Promise<object>} Updated pickup
   */
  async startPickup(pickupId) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Starting a pickup requires an internet connection.'),
        { isOfflineError: true }
      );
    }
    const response = await apiClient.patch(`/pickups/${pickupId}/start`);
    return response.data?.pickup || response.data;
  }

  /**
   * Complete an in-progress pickup (IN_PROGRESS -> COMPLETED).
   * Server-authoritative — requires connectivity.
   * Updates Pickup, CollectionRequest (to PICKED_UP), EwasteItems (to COLLECTED with actual weight),
   * and increments collector's totalPickups counter on the backend.
   * MUST NOT be queued for offline execution.
   *
   * @param {string} pickupId - Pickup UUID
   * @param {object} payload - { totalWeightKg: number, collectorNotes?: string, items: Array<{ itemId: string, actualWeightKg: number }> }
   * @returns {Promise<object>} Completed pickup
   */
  async completePickup(pickupId, payload) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Completing a pickup requires an internet connection.'),
        { isOfflineError: true }
      );
    }
    const response = await apiClient.patch(`/pickups/${pickupId}/complete`, payload);
    return response.data?.pickup || response.data;
  }

  /**
   * Get single pickup details by ID.
   * @param {string} pickupId - Pickup UUID
   * @returns {Promise<object>} Pickup details
   */
  async getPickupById(pickupId) {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(`/pickups/${pickupId}`);
        return response.data?.pickup || response.data;
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_COLLECTOR_PICKUPS);
          const found = (cached || []).find((p) => p.id === pickupId);
          if (found) return found;
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_COLLECTOR_PICKUPS);
    const found = (cached || []).find((p) => p.id === pickupId);
    if (found) return found;
    throw Object.assign(new Error('Pickup not found in offline cache.'), { isOfflineError: true });
  }

  /**
   * List verified formal recyclers (read-only directory).
   * Delegates to recyclingService.getRecyclers(params).
   *
   * @param {object} [params] - { category?: string }
   * @returns {Promise<{ recyclers: Array, fromCache: boolean }>}
   */
  async getRecyclers(params = {}) {
    return recyclingService.getRecyclers(params);
  }

  /**
   * List collector's own created consignments (read-only tracking).
   * Delegates to recyclingService.getCollectorConsignments(params).
   *
   * @param {object} [params] - { status?: string, page?: number, limit?: number }
   * @returns {Promise<{ consignments: Array, pagination: object|null, fromCache: boolean }>}
   */
  async getConsignments(params = {}) {
    return recyclingService.getCollectorConsignments(params);
  }

  /**
   * Mark consignment as delivered to formal recycler facility.
   * Delegates to recyclingService.deliverConsignment(consignmentId).
   *
   * @param {string} consignmentId - Consignment UUID
   * @returns {Promise<object>} Updated consignment with status DELIVERED
   */
  async deliverConsignment(consignmentId) {
    return recyclingService.deliverConsignment(consignmentId);
  }
}

export const collectorService = new CollectorService();
export default collectorService;
