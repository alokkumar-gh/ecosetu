/**
 * EcoSetu Mobile Pickup Service
 * Manages collector acceptance and pickup completion workflows.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 5, docs/07_BUSINESS_WORKFLOWS.md Section 2
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { offlineQueue } from './offlineQueue.js';
import { offlineStore } from './offlineStore.js';
import { QUEUE_ACTION_TYPES } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';

class PickupService {
  /**
   * Collector accepts a collection request (Server-authoritative, requires online)
   * @param {string} requestId
   * @returns {Promise<Object>}
   */
  async acceptRequest(requestId) {
    if (!networkService.isConnected()) {
      throw AppError.networkError(
        'Internet connection required to accept collection requests. Real-time availability check is required.'
      );
    }
    const response = await apiClient.post(`/collection-requests/${requestId}/accept`);
    return response.data?.pickup || response.data;
  }

  /**
   * Start pickup execution (SCHEDULED -> IN_PROGRESS)
   * Server-authoritative — requires connectivity.
   * MUST NOT be queued for offline execution.
   *
   * @param {string} pickupId
   * @returns {Promise<Object>}
   */
  async startPickup(pickupId) {
    if (!networkService.isConnected()) {
      throw AppError.networkError(
        'Internet connection required to start pickups. Real-time status update is required.'
      );
    }
    const response = await apiClient.patch(`/pickups/${pickupId}/start`);
    return response.data?.pickup || response.data;
  }

  /**
   * Complete pickup execution (IN_PROGRESS -> COMPLETED)
   * Server-authoritative — requires connectivity.
   * MUST NOT be queued for offline execution.
   *
   * @param {string} pickupId
   * @param {Object} completionData - { totalWeightKg: number, collectorNotes?: string, items: Array<{ itemId: string, actualWeightKg: number }> }
   * @returns {Promise<Object>}
   */
  async completePickup(pickupId, completionData) {
    if (!networkService.isConnected()) {
      throw AppError.networkError(
        'Internet connection required to complete pickups. Server-authoritative sync is required.'
      );
    }
    const response = await apiClient.patch(`/pickups/${pickupId}/complete`, completionData);
    return response.data?.pickup || response.data;
  }

  /**
   * Get collector's assigned pickups
   * Canonical endpoint: GET /api/v1/pickups
   * @param {Object} [params] - { status, page, limit }
   * @returns {Promise<Array<Object>>}
   */
  async getMyPickups(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/pickups?${query}` : '/pickups';
        const response = await apiClient.get(endpoint);
        const pickups = response.data?.pickups || response.data || [];
        await offlineStore.cachePickups(pickups);
        return pickups;
      } catch (err) {
        if (err.isNetworkError) {
          return offlineStore.getCachedPickups();
        }
        throw err;
      }
    }
    return offlineStore.getCachedPickups();
  }
}

export const pickupService = new PickupService();
export default pickupService;
