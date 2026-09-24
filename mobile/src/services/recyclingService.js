/**
 * EcoSetu Mobile Recycling Service
 * Manages consignments and recycling records.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 6 & 7
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const CACHE_COLLECTOR_RECYCLERS = '@ecosetu_collector_recyclers';
const CACHE_RECYCLER_CONSIGNMENTS = '@ecosetu_recycler_consignments';
const CACHE_COLLECTOR_CONSIGNMENTS = '@ecosetu_collector_consignments';
const CACHE_RECYCLER_RECORDS = '@ecosetu_recycler_records';
const CACHE_RECYCLER_PROFILE = '@ecosetu_recycler_profile';

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
    // Non-fatal
  }
}

class RecyclingService {
  /**
   * Get authenticated formal recycler's own profile.
   * Endpoint: GET /api/v1/recyclers/profile
   * Scoped to authenticated recycler on backend.
   * Offline-first with AsyncStorage cache (@ecosetu_recycler_profile).
   *
   * @returns {Promise<{ profile: Object|null, fromCache: boolean }>}
   */
  async getProfile() {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get('/recyclers/profile');
        const profile = response.data?.profile || response.data;
        if (profile) {
          await _writeCache(CACHE_RECYCLER_PROFILE, profile);
        }
        return { profile, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_RECYCLER_PROFILE);
          return { profile: cached, fromCache: true };
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_RECYCLER_PROFILE);
    return { profile: cached, fromCache: true };
  }

  /**
   * List all verified formal recyclers (for collectors discovering facilities / consignments)
   * Endpoint: GET /api/v1/recyclers
   * Authorized: INFORMAL_COLLECTOR, ADMIN (backend enforces checkVerified)
   * Read-only: Offline-first with AsyncStorage caching
   *
   * @param {Object} [params] - { category?: string }
   * @returns {Promise<{ recyclers: Array<Object>, fromCache: boolean }>}
   */
  async getRecyclers(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/recyclers?${query}` : '/recyclers';
        const response = await apiClient.get(endpoint);
        const recyclers = response.data?.recyclers || response.data || [];
        if (!params.category) {
          await _writeCache(CACHE_COLLECTOR_RECYCLERS, recyclers);
        }
        return { recyclers, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await _readCache(CACHE_COLLECTOR_RECYCLERS);
          let filtered = cached || [];
          if (params.category && Array.isArray(filtered)) {
            filtered = filtered.filter(
              (r) => Array.isArray(r.acceptedCategories) && r.acceptedCategories.includes(params.category)
            );
          }
          return { recyclers: filtered, fromCache: true };
        }
        throw err;
      }
    }
    const cached = await _readCache(CACHE_COLLECTOR_RECYCLERS);
    let filtered = cached || [];
    if (params.category && Array.isArray(filtered)) {
      filtered = filtered.filter(
        (r) => Array.isArray(r.acceptedCategories) && r.acceptedCategories.includes(params.category)
      );
    }
    return { recyclers: filtered, fromCache: true };
  }

  /**
   * Get consignments (collector own, recycler received, admin all)
   * Endpoint: GET /api/v1/consignments
   * Offline-first with AsyncStorage cache.
   *
   * @param {Object} [params] - { status?: string, page?: number, limit?: number }
   * @returns {Promise<{ consignments: Array<Object>, pagination: Object|null, fromCache: boolean }>}
   */
  async getConsignments(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/consignments?${query}` : '/consignments';
        const response = await apiClient.get(endpoint);
        const consignments = response.data?.consignments || response.data || [];
        const pagination = response.data?.pagination || null;
        if (!params.status) {
          await _writeCache(CACHE_RECYCLER_CONSIGNMENTS, consignments);
        }
        return { consignments, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = (await _readCache(CACHE_RECYCLER_CONSIGNMENTS)) || [];
          let filtered = cached;
          if (params.status) {
            filtered = cached.filter((c) => c.status === params.status);
          }
          return { consignments: filtered, pagination: null, fromCache: true };
        }
        throw err;
      }
    }

    const cached = (await _readCache(CACHE_RECYCLER_CONSIGNMENTS)) || [];
    let filtered = cached;
    if (params.status) {
      filtered = cached.filter((c) => c.status === params.status);
    }
    return { consignments: filtered, pagination: null, fromCache: true };
  }

  /**
   * Get authenticated collector's own consignments
   * Endpoint: GET /api/v1/consignments
   * Scoped to authenticated collector on backend.
   * Offline-first with AsyncStorage cache (@ecosetu_collector_consignments).
   *
   * @param {Object} [params] - { status?: string, page?: number, limit?: number }
   * @returns {Promise<{ consignments: Array<Object>, pagination: Object|null, fromCache: boolean }>}
   */
  async getCollectorConsignments(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/consignments?${query}` : '/consignments';
        const response = await apiClient.get(endpoint);
        const consignments = response.data?.consignments || response.data || [];
        const pagination = response.data?.pagination || null;
        if (!params.status) {
          await _writeCache(CACHE_COLLECTOR_CONSIGNMENTS, consignments);
        }
        return { consignments, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = (await _readCache(CACHE_COLLECTOR_CONSIGNMENTS)) || [];
          let filtered = cached;
          if (params.status) {
            filtered = cached.filter((c) => c.status === params.status);
          }
          return { consignments: filtered, pagination: null, fromCache: true };
        }
        throw err;
      }
    }

    const cached = (await _readCache(CACHE_COLLECTOR_CONSIGNMENTS)) || [];
    let filtered = cached;
    if (params.status) {
      filtered = cached.filter((c) => c.status === params.status);
    }
    return { consignments: filtered, pagination: null, fromCache: true };
  }

  /**
   * Informal Collector marks consignment as delivered at formal recycler facility.
   * Endpoint: PATCH /api/v1/consignments/:id/deliver
   * Canonical Reference: docs/05_API_SPECIFICATION.md Section 9, docs/07_BUSINESS_WORKFLOWS.md
   * Server-authoritative: ONLINE-ONLY. Must NOT be queued for offline execution.
   *
   * @param {string} consignmentId - Consignment UUID
   * @returns {Promise<Object>} Updated consignment with status DELIVERED and server deliveredAt
   */
  async deliverConsignment(consignmentId) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Marking a consignment as delivered requires an active internet connection. Server-authoritative delivery timestamp and state transition are required.'),
        { isOfflineError: true }
      );
    }

    if (!consignmentId || typeof consignmentId !== 'string') {
      throw new Error('Consignment ID is required');
    }

    const response = await apiClient.patch(`/consignments/${consignmentId}/deliver`);
    const consignment = response.data?.consignment || response.data;

    // Update local collector cache
    const cached = (await _readCache(CACHE_COLLECTOR_CONSIGNMENTS)) || [];
    if (Array.isArray(cached) && consignment) {
      const idx = cached.findIndex((c) => c.id === consignmentId);
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...consignment };
      } else {
        cached.unshift(consignment);
      }
      await _writeCache(CACHE_COLLECTOR_CONSIGNMENTS, cached);
    }

    return consignment;
  }

  /**
   * Recycler accepts delivered consignment.
   * Endpoint: PATCH /api/v1/consignments/:id/accept
   * Server-authoritative: ONLINE-ONLY. Must NOT be queued for offline execution.
   *
   * @param {string} consignmentId - Consignment UUID
   * @returns {Promise<Object>} Updated consignment with auto-created recyclingRecord
   */
  async acceptConsignment(consignmentId) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Accepting a consignment requires an active internet connection. Real-time verification and item status transition are required.'),
        { isOfflineError: true }
      );
    }

    if (!consignmentId || typeof consignmentId !== 'string') {
      throw new Error('Consignment ID is required');
    }

    const response = await apiClient.patch(`/consignments/${consignmentId}/accept`);
    const consignment = response.data?.consignment || response.data;

    // Update local cache
    const cached = (await _readCache(CACHE_RECYCLER_CONSIGNMENTS)) || [];
    if (Array.isArray(cached)) {
      const idx = cached.findIndex((c) => c.id === consignmentId);
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...consignment };
        await _writeCache(CACHE_RECYCLER_CONSIGNMENTS, cached);
      }
    }

    return consignment;
  }

  /**
   * Recycler rejects consignment with documented reason.
   * Endpoint: PATCH /api/v1/consignments/:id/reject
   * Server-authoritative: ONLINE-ONLY. Must NOT be queued for offline execution.
   *
   * @param {string} consignmentId - Consignment UUID
   * @param {string} reason - Rejection reason (1-500 chars)
   * @returns {Promise<Object>} Updated consignment
   */
  async rejectConsignment(consignmentId, reason) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Rejecting a consignment requires an active internet connection. Server-authoritative state transition is required.'),
        { isOfflineError: true }
      );
    }

    if (!consignmentId || typeof consignmentId !== 'string') {
      throw new Error('Consignment ID is required');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    if (reason.trim().length > 500) {
      throw new Error('Rejection reason must not exceed 500 characters');
    }

    const response = await apiClient.patch(`/consignments/${consignmentId}/reject`, {
      reason: reason.trim(),
    });
    const consignment = response.data?.consignment || response.data;

    // Update local cache
    const cached = (await _readCache(CACHE_RECYCLER_CONSIGNMENTS)) || [];
    if (Array.isArray(cached)) {
      const idx = cached.findIndex((c) => c.id === consignmentId);
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...consignment };
        await _writeCache(CACHE_RECYCLER_CONSIGNMENTS, cached);
      }
    }

    return consignment;
  }

  /**
   * Create consignment from collector to verified formal recycler.
   * Endpoint: POST /api/v1/consignments
   * Server-authoritative: ONLINE-ONLY. Must NOT be queued for offline execution.
   *
   * @param {Object} data - { recyclerId: string, itemIds: Array<string>, totalWeightKg?: number, deliveryNotes?: string, notes?: string }
   * @returns {Promise<Object>} Created consignment
   */
  async createConsignment(data) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Creating a consignment requires an active internet connection. Real-time facility verification and item locking are required.'),
        { isOfflineError: true }
      );
    }

    const payload = {
      recyclerId: data.recyclerId,
      itemIds: data.itemIds,
    };

    if (data.totalWeightKg !== undefined && data.totalWeightKg !== null) {
      payload.totalWeightKg = parseFloat(data.totalWeightKg);
    }

    const notes = data.deliveryNotes || data.notes;
    if (notes && typeof notes === 'string' && notes.trim()) {
      payload.deliveryNotes = notes.trim();
    }

    const response = await apiClient.post('/consignments', payload);
    const consignment = response.data?.consignment || response.data;

    // Update collector consignment cache
    const cached = (await _readCache(CACHE_COLLECTOR_CONSIGNMENTS)) || [];
    if (Array.isArray(cached) && consignment) {
      cached.unshift(consignment);
      await _writeCache(CACHE_COLLECTOR_CONSIGNMENTS, cached);
    }

    return consignment;
  }

  /**
   * Get collector's collected e-waste items eligible for consignment.
   * Queries completed pickups (GET /api/v1/pickups?status=COMPLETED)
   * and excludes items already linked to active consignments (CREATED, IN_TRANSIT, DELIVERED, ACCEPTED).
   *
   * @returns {Promise<Array<Object>>} Eligible collected e-waste items
   */
  async getEligibleItems() {
    try {
      const [pickupRes, consignmentRes] = await Promise.all([
        apiClient.get('/pickups?status=COMPLETED&limit=50'),
        apiClient.get('/consignments?limit=50'),
      ]);

      const pickups = pickupRes.data?.pickups || pickupRes.data || [];
      const consignments = consignmentRes.data?.consignments || consignmentRes.data || [];

      // Collect item IDs from active consignments
      const activeStatuses = ['CREATED', 'IN_TRANSIT', 'DELIVERED', 'ACCEPTED'];
      const activeConsignedItemIds = new Set();

      for (const csg of consignments) {
        if (activeStatuses.includes(csg.status) && Array.isArray(csg.consignmentItems)) {
          for (const ci of csg.consignmentItems) {
            if (ci.ewasteItemId) {
              activeConsignedItemIds.add(ci.ewasteItemId);
            }
          }
        }
      }

      // Extract all items in COLLECTED status not currently in an active consignment
      const eligible = [];
      const seenItemIds = new Set();

      for (const p of pickups) {
        const items = p.collectionRequest?.ewasteItems || [];
        for (const it of items) {
          if (
            it.status === 'COLLECTED' &&
            !activeConsignedItemIds.has(it.id) &&
            !seenItemIds.has(it.id)
          ) {
            seenItemIds.add(it.id);
            eligible.push({
              ...it,
              pickupId: p.id,
              pickupCompletedAt: p.completedAt,
            });
          }
        }
      }

      return eligible;
    } catch (err) {
      if (err.isNetworkError || !networkService.isConnected()) {
        return [];
      }
      throw err;
    }
  }

  /**
   * List recycling records (Recycler own, Admin all)
   * Endpoint: GET /api/v1/recycling-records
   * Offline-first with AsyncStorage caching.
   *
   * @param {Object} [params] - { status?: string, page?: number, limit?: number }
   * @returns {Promise<{ records: Array<Object>, pagination: Object|null, fromCache: boolean }>}
   */
  async getRecyclingRecords(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/recycling-records?${query}` : '/recycling-records';
        const response = await apiClient.get(endpoint);
        const records = response.data?.records || response.data || [];
        const pagination = response.data?.pagination || null;
        if (!params.status) {
          await _writeCache(CACHE_RECYCLER_RECORDS, records);
        }
        return { records, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          const cached = (await _readCache(CACHE_RECYCLER_RECORDS)) || [];
          let filtered = Array.isArray(cached) ? cached : [];
          if (params.status) {
            filtered = filtered.filter((r) => r.status === params.status);
          }
          return { records: filtered, pagination: null, fromCache: true };
        }
        throw err;
      }
    }
    const cached = (await _readCache(CACHE_RECYCLER_RECORDS)) || [];
    let filtered = Array.isArray(cached) ? cached : [];
    if (params.status) {
      filtered = filtered.filter((r) => r.status === params.status);
    }
    return { records: filtered, pagination: null, fromCache: true };
  }

  /**
   * Backward-compatible alias for getRecyclingRecords returning the array
   * @param {Object} [params]
   * @returns {Promise<Array<Object>>}
   */
  async getRecords(params = {}) {
    const res = await this.getRecyclingRecords(params);
    return res.records || [];
  }

  /**
   * Recycler begins processing materials for a recycling record
   * Endpoint: PATCH /api/v1/recycling-records/:id/start-processing
   * Authorized: RECYCLER (verified, facility-owned)
   * Pre-condition: status must be RECEIVED
   * ONLINE-ONLY: Must never queue into offline queue
   *
   * @param {string} recordId - UUID of recycling record
   * @returns {Promise<Object>} Updated recycling record in PROCESSING status
   */
  async startProcessing(recordId) {
    if (!networkService.isConnected()) {
      const offlineErr = new Error(
        'Online connection required to start material processing. Action cannot be performed offline.'
      );
      offlineErr.isOfflineError = true;
      offlineErr.code = 'NETWORK_OFFLINE';
      throw offlineErr;
    }

    const response = await apiClient.patch(`/recycling-records/${recordId}/start-processing`);
    const record = response.data?.recyclingRecord || response.data;

    // Update cached record
    const cached = (await _readCache(CACHE_RECYCLER_RECORDS)) || [];
    if (Array.isArray(cached) && record) {
      const index = cached.findIndex((r) => r.id === recordId);
      if (index !== -1) {
        cached[index] = { ...cached[index], ...record };
      } else {
        cached.unshift(record);
      }
      await _writeCache(CACHE_RECYCLER_RECORDS, cached);
    }

    return record;
  }

  /**
   * Recycler marks recycling as completed
   * Endpoint: PATCH /api/v1/recycling-records/:id/complete
   * Authorized: RECYCLER (verified, facility-owned)
   * Pre-condition: status must be PROCESSING
   * ONLINE-ONLY: Must never queue into offline queue
   *
   * @param {string} recordId - UUID of recycling record
   * @param {Object} [data] - { processingNotes?: string, outputDescription?: string, outputWeightKg?: number }
   * @returns {Promise<Object>} Completed recycling record in COMPLETED status
   */
  async completeRecycling(recordId, data = {}) {
    if (!networkService.isConnected()) {
      const offlineErr = new Error(
        'Online connection required to complete recycling. Action cannot be performed offline.'
      );
      offlineErr.isOfflineError = true;
      offlineErr.code = 'NETWORK_OFFLINE';
      throw offlineErr;
    }

    const payload = {};

    if (data.processingNotes !== undefined && data.processingNotes !== null) {
      const notes = String(data.processingNotes).trim();
      if (notes.length > 1000) {
        throw new Error('processingNotes must not exceed 1000 characters');
      }
      payload.processingNotes = notes;
    }

    if (data.outputDescription !== undefined && data.outputDescription !== null) {
      const desc = String(data.outputDescription).trim();
      if (desc.length > 500) {
        throw new Error('outputDescription must not exceed 500 characters');
      }
      payload.outputDescription = desc;
    }

    if (data.outputWeightKg !== undefined && data.outputWeightKg !== null) {
      const weight = parseFloat(data.outputWeightKg);
      if (isNaN(weight) || weight < 0) {
        throw new Error('outputWeightKg must be a non-negative number >= 0');
      }
      payload.outputWeightKg = weight;
    }

    const response = await apiClient.patch(`/recycling-records/${recordId}/complete`, payload);
    const record = response.data?.recyclingRecord || response.data;

    // Update cached record
    const cached = (await _readCache(CACHE_RECYCLER_RECORDS)) || [];
    if (Array.isArray(cached) && record) {
      const index = cached.findIndex((r) => r.id === recordId);
      if (index !== -1) {
        cached[index] = { ...cached[index], ...record };
      } else {
        cached.unshift(record);
      }
      await _writeCache(CACHE_RECYCLER_RECORDS, cached);
    }

    return record;
  }
}

export {
  CACHE_COLLECTOR_RECYCLERS,
  CACHE_RECYCLER_CONSIGNMENTS,
  CACHE_COLLECTOR_CONSIGNMENTS,
  CACHE_RECYCLER_RECORDS,
  CACHE_RECYCLER_PROFILE,
};
export const recyclingService = new RecyclingService();
export default recyclingService;
