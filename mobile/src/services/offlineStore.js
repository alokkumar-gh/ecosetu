/**
 * EcoSetu Offline Store
 * Manages local persistent caching and draft entities (items, requests, pickups).
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 5.2, docs/24_ERROR_EDGE_CASES.md Section 10
 */

import { storage } from '../utils/storage.js';
import { STORAGE_KEYS, ITEM_STATUS } from '../utils/constants.js';

class OfflineStore {
  /**
   * Save or update an e-waste item draft locally
   * @param {Object} item
   * @returns {Promise<Object>}
   */
  async saveItemDraft(item) {
    const items = (await storage.getItem(STORAGE_KEYS.CACHE_ITEMS)) || [];
    const localId = item.id || `temp_item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const draftItem = {
      ...item,
      id: localId,
      status: item.status || ITEM_STATUS.DRAFT,
      isOfflineDraft: true,
      updatedAt: new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
    };

    const existingIndex = items.findIndex((i) => i.id === localId);
    if (existingIndex >= 0) {
      items[existingIndex] = draftItem;
    } else {
      items.unshift(draftItem);
    }

    await storage.setItem(STORAGE_KEYS.CACHE_ITEMS, items);
    return draftItem;
  }

  /**
   * Reconcile local draft item with server-authoritative record
   * @param {string} tempId - Temporary local ID
   * @param {Object} serverItem - Authoritative record from backend
   * @returns {Promise<Object>}
   */
  async reconcileItem(tempId, serverItem) {
    const items = (await storage.getItem(STORAGE_KEYS.CACHE_ITEMS)) || [];
    const index = items.findIndex((i) => i.id === tempId || i.id === serverItem.id);

    const reconciledItem = {
      ...serverItem,
      isOfflineDraft: false,
      reconciledAt: new Date().toISOString(),
    };

    if (index >= 0) {
      items[index] = reconciledItem;
    } else {
      items.unshift(reconciledItem);
    }

    await storage.setItem(STORAGE_KEYS.CACHE_ITEMS, items);
    return reconciledItem;
  }

  /**
   * Get all cached/draft e-waste items
   * @returns {Promise<Array<Object>>}
   */
  async getCachedItems() {
    return (await storage.getItem(STORAGE_KEYS.CACHE_ITEMS)) || [];
  }

  /**
   * Remove cached item by ID
   * @param {string} id
   * @returns {Promise<void>}
   */
  async removeItem(id) {
    const items = (await storage.getItem(STORAGE_KEYS.CACHE_ITEMS)) || [];
    const filtered = items.filter((i) => i.id !== id);
    await storage.setItem(STORAGE_KEYS.CACHE_ITEMS, filtered);
  }

  /**
   * Cache collection requests locally
   * @param {Array<Object>} requests
   * @returns {Promise<void>}
   */
  async cacheRequests(requests) {
    await storage.setItem(STORAGE_KEYS.CACHE_REQUESTS, requests);
  }

  /**
   * Get cached collection requests
   * @returns {Promise<Array<Object>>}
   */
  async getCachedRequests() {
    return (await storage.getItem(STORAGE_KEYS.CACHE_REQUESTS)) || [];
  }

  /**
   * Save or update request draft
   * @param {Object} request
   * @returns {Promise<Object>}
   */
  async saveRequestDraft(request) {
    const requests = (await storage.getItem(STORAGE_KEYS.CACHE_REQUESTS)) || [];
    const localId = request.id || `temp_req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const draftRequest = {
      ...request,
      id: localId,
      status: request.status || 'SUBMITTED',
      isOfflineDraft: true,
      updatedAt: new Date().toISOString(),
      createdAt: request.createdAt || new Date().toISOString(),
    };

    const existingIndex = requests.findIndex((r) => r.id === localId);
    if (existingIndex >= 0) {
      requests[existingIndex] = draftRequest;
    } else {
      requests.unshift(draftRequest);
    }

    await storage.setItem(STORAGE_KEYS.CACHE_REQUESTS, requests);
    return draftRequest;
  }

  /**
   * Reconcile local request draft with authoritative server record
   * @param {string} tempId
   * @param {Object} serverRequest
   * @returns {Promise<Object>}
   */
  async reconcileRequest(tempId, serverRequest) {
    const requests = (await storage.getItem(STORAGE_KEYS.CACHE_REQUESTS)) || [];
    const index = requests.findIndex((r) => r.id === tempId || r.id === serverRequest.id);

    const reconciledRequest = {
      ...serverRequest,
      isOfflineDraft: false,
      reconciledAt: new Date().toISOString(),
    };

    if (index >= 0) {
      requests[index] = reconciledRequest;
    } else {
      requests.unshift(reconciledRequest);
    }

    await storage.setItem(STORAGE_KEYS.CACHE_REQUESTS, requests);
    return reconciledRequest;
  }

  /**
   * Cache pickups locally
   * @param {Array<Object>} pickups
   * @returns {Promise<void>}
   */
  async cachePickups(pickups) {
    await storage.setItem(STORAGE_KEYS.CACHE_PICKUPS, pickups);
  }

  /**
   * Get cached pickups
   * @returns {Promise<Array<Object>>}
   */
  async getCachedPickups() {
    return (await storage.getItem(STORAGE_KEYS.CACHE_PICKUPS)) || [];
  }

  /**
   * Clear all offline caches
   * @returns {Promise<void>}
   */
  async clearAllCaches() {
    await storage.removeItem(STORAGE_KEYS.CACHE_ITEMS);
    await storage.removeItem(STORAGE_KEYS.CACHE_REQUESTS);
    await storage.removeItem(STORAGE_KEYS.CACHE_PICKUPS);
  }
}

export const offlineStore = new OfflineStore();
export default offlineStore;
