/**
 * EcoSetu Mobile Collection Request Service
 * Offline-first service for managing collection requests and drafts.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 4, docs/09_FRONTEND_ARCHITECTURE.md
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { offlineStore } from './offlineStore.js';
import { offlineQueue } from './offlineQueue.js';
import { QUEUE_ACTION_TYPES } from '../utils/constants.js';

class RequestService {
  /**
   * Get collection requests with offline caching
   * @param {Object} [params]
   * @returns {Promise<Array<Object>>}
   */
  async getRequests(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/collection-requests?${query}` : '/collection-requests';
        const response = await apiClient.get(endpoint);
        const requests = response.data?.requests || response.data || [];
        await offlineStore.cacheRequests(requests);
        return requests;
      } catch (err) {
        if (err.isNetworkError) {
          return offlineStore.getCachedRequests();
        }
        throw err;
      }
    }
    return offlineStore.getCachedRequests();
  }

  /**
   * Get collection request by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getRequestById(id) {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(`/collection-requests/${id}`);
        return response.data?.request || response.data;
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await offlineStore.getCachedRequests();
          return cached.find((r) => r.id === id) || null;
        }
        throw err;
      }
    }
    const cached = await offlineStore.getCachedRequests();
    return cached.find((r) => r.id === id) || null;
  }

  /**
   * Create collection request (Offline-first)
   * @param {Object} requestData - { itemIds, pickupAddress, pickupCoordinates, scheduledDate, notes }
   * @returns {Promise<Object>}
   */
  async createRequest(requestData) {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.post('/collection-requests', requestData);
        const created = response.data?.request || response.data;
        await offlineStore.saveRequestDraft(created);
        return created;
      } catch (err) {
        if (err.isNetworkError) {
          return this._createOfflineRequest(requestData);
        }
        throw err;
      }
    }
    return this._createOfflineRequest(requestData);
  }

  async _createOfflineRequest(requestData) {
    const draft = await offlineStore.saveRequestDraft(requestData);
    await offlineQueue.enqueue({
      type: QUEUE_ACTION_TYPES.CREATE_REQUEST,
      endpoint: '/collection-requests',
      method: 'POST',
      payload: requestData,
      localId: draft.id,
    });
    return draft;
  }

  /**
   * Submit collection request (move from DRAFT to SUBMITTED)
   * Source of Truth: docs/05_API_SPECIFICATION.md Section 7, POST /collection-requests/:id/submit
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async submitRequest(id) {
    const response = await apiClient.post(`/collection-requests/${id}/submit`);
    const submitted = response.data?.request || response.data;
    try {
      const cached = await offlineStore.getCachedRequests();
      if (Array.isArray(cached)) {
        const index = cached.findIndex((r) => r.id === id);
        if (index >= 0) {
          cached[index] = { ...cached[index], ...submitted, status: 'SUBMITTED' };
          await offlineStore.cacheRequests(cached);
        }
      }
    } catch (cacheErr) {
      // Non-fatal cache update error
    }
    return submitted;
  }

  /**
   * Cancel collection request
   * Source of Truth: docs/05_API_SPECIFICATION.md Section 7, POST /collection-requests/:id/cancel
   * @param {string} id
   * @param {string|Object} reason
   * @returns {Promise<Object>}
   */
  async cancelRequest(id, reason) {
    const reasonText =
      typeof reason === 'string'
        ? reason
        : reason?.reason || reason?.cancellationReason || 'Cancelled by citizen';

    const response = await apiClient.post(`/collection-requests/${id}/cancel`, {
      reason: reasonText,
    });
    const cancelledRequest = response.data?.request || response.data;

    // Update local cache if available
    try {
      const cached = await offlineStore.getCachedRequests();
      if (Array.isArray(cached)) {
        const index = cached.findIndex((r) => r.id === id);
        if (index >= 0) {
          cached[index] = { ...cached[index], ...cancelledRequest, status: 'CANCELLED' };
          await offlineStore.cacheRequests(cached);
        }
      }
    } catch (cacheErr) {
      // Non-fatal cache update error
    }

    return cancelledRequest;
  }
}

export const requestService = new RequestService();
export default requestService;
