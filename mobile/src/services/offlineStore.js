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
   * Save or update a material lot draft locally
   * @param {Object} lot
   * @returns {Promise<Object>}
   */
  async saveLotDraft(lot) {
    const lots = (await storage.getItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS)) || [];
    const localId = lot.id || `temp_lot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const draftLot = {
      ...lot,
      id: localId,
      status: lot.status || 'DRAFT',
      isOfflineDraft: true,
      pendingSync: Boolean(lot.pendingSync),
      createdAt: lot.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = lots.findIndex((l) => l.id === localId);
    if (existingIndex >= 0) {
      lots[existingIndex] = draftLot;
    } else {
      lots.unshift(draftLot);
    }

    await storage.setItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS, lots);
    return draftLot;
  }

  /**
   * Reconcile local draft lot with server-authoritative record
   * @param {string} tempId - Temporary local ID
   * @param {Object} serverLot - Authoritative record from backend
   * @returns {Promise<Object>}
   */
  async reconcileLot(tempId, serverLot) {
    const lots = (await storage.getItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS)) || [];
    const index = lots.findIndex(
      (l) => l.id === tempId || l.id === serverLot.id || (serverLot.clientReferenceId && l.clientReferenceId === serverLot.clientReferenceId)
    );

    const reconciledLot = {
      ...serverLot,
      isOfflineDraft: false,
      pendingSync: false,
      reconciledAt: new Date().toISOString(),
    };

    if (index >= 0) {
      lots[index] = reconciledLot;
    } else {
      lots.unshift(reconciledLot);
    }

    await storage.setItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS, lots);
    return reconciledLot;
  }

  /**
   * Get all cached/draft material lots
   * @returns {Promise<Array<Object>>}
   */
  async getCachedLots() {
    return (await storage.getItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS)) || [];
  }

  /**
   * Remove cached lot by ID
   * @param {string} id
   * @returns {Promise<void>}
   */
  async removeLot(id) {
    const lots = (await storage.getItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS)) || [];
    const filtered = lots.filter((l) => l.id !== id);
    await storage.setItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS, filtered);
  }

  /**
   * Cache material lots list from server
   * @param {Array<Object>} lots
   * @returns {Promise<void>}
   */
  async cacheLots(lots) {
    await storage.setItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS, lots);
  }

  /**
   * Cache price board data from server (SIH-PRICE-002)
   * @param {Object} boardData - { prices, location, lastUpdatedAt }
   * @returns {Promise<void>}
   */
  async cachePriceBoard(boardData) {
    const timestamp = new Date().toISOString();
    const payload = {
      ...boardData,
      cachedAt: timestamp,
    };
    await storage.setItem(STORAGE_KEYS.CACHE_PRICES, payload);
    await storage.setItem(STORAGE_KEYS.CACHE_PRICES_TIMESTAMP, timestamp);
  }

  /**
   * Retrieve cached price board data (SIH-PRICE-002)
   * Evaluates freshness (24h staleness rule)
   * @returns {Promise<{ data: Object|null, cachedAt: string|null, isStale: boolean }>}
   */
  async getCachedPriceBoard() {
    const data = await storage.getItem(STORAGE_KEYS.CACHE_PRICES);
    const cachedAt = await storage.getItem(STORAGE_KEYS.CACHE_PRICES_TIMESTAMP);
    if (!data || !cachedAt) {
      return { data: null, cachedAt: null, isStale: true };
    }

    const ageMs = Date.now() - new Date(cachedAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    const isStale = ageMs > maxAgeMs;

    return {
      data,
      cachedAt,
      isStale,
      ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
    };
  }

  /**
   * Cache price history data from server (SIH-PRICE-010..014)
   * @param {string} cacheKey - E.g. 'PCB_DELHI_MONTHLY'
   * @param {Object} historyData - Historical dataset and trends
   * @returns {Promise<void>}
   */
  async cachePriceHistory(cacheKey, historyData) {
    const timestamp = new Date().toISOString();
    const stored = (await storage.getItem(STORAGE_KEYS.CACHE_PRICE_HISTORY)) || {};
    stored[cacheKey] = {
      data: historyData,
      cachedAt: timestamp,
    };
    await storage.setItem(STORAGE_KEYS.CACHE_PRICE_HISTORY, stored);
  }

  /**
   * Retrieve cached price history data (SIH-PRICE-010..014)
   * Evaluates freshness (24h staleness rule)
   * @param {string} cacheKey
   * @returns {Promise<{ data: Object|null, cachedAt: string|null, isStale: boolean, ageHours: number }>}
   */
  async getCachedPriceHistory(cacheKey) {
    const stored = await storage.getItem(STORAGE_KEYS.CACHE_PRICE_HISTORY);
    if (!stored || !stored[cacheKey]) {
      return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    }

    const entry = stored[cacheKey];
    const ageMs = Date.now() - new Date(entry.cachedAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    const isStale = ageMs > maxAgeMs;

    return {
      data: entry.data,
      cachedAt: entry.cachedAt,
      isStale,
      ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
    };
  }

  /**
   * Cache matches for a Material Lot
   * @param {string} lotId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async cacheLotMatches(lotId, data) {
    const key = `${STORAGE_KEYS.CACHE_RECYCLER_MATCHES_PREFIX}${lotId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_RECYCLER_MATCHES_TIMESTAMP_PREFIX}${lotId}`;
    await storage.setItem(key, data);
    await storage.setItem(tsKey, new Date().toISOString());
  }

  /**
   * Get cached matches for a Material Lot
   * @param {string} lotId
   * @returns {Promise<{ data: Object|null, cachedAt: string|null, isStale: boolean, ageHours: number }>}
   */
  async getCachedLotMatches(lotId) {
    const key = `${STORAGE_KEYS.CACHE_RECYCLER_MATCHES_PREFIX}${lotId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_RECYCLER_MATCHES_TIMESTAMP_PREFIX}${lotId}`;
    const data = await storage.getItem(key);
    const cachedAt = await storage.getItem(tsKey);

    if (!data || !cachedAt) {
      return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    }

    const ageMs = Date.now() - new Date(cachedAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    const isStale = ageMs > maxAgeMs;

    return {
      data,
      cachedAt,
      isStale,
      ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
    };
  }

  /**
   * Cache quotes for a material lot
   * @param {string} lotId
   * @param {object} quotesData
   * @returns {Promise<void>}
   */
  async cacheLotQuotes(lotId, quotesData) {
    if (!lotId || !quotesData) return;
    const key = `${STORAGE_KEYS.CACHE_LOT_QUOTES_PREFIX}${lotId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_LOT_QUOTES_TIMESTAMP_PREFIX}${lotId}`;
    await storage.setItem(key, quotesData);
    await storage.setItem(tsKey, new Date().toISOString());
  }

  /**
   * Get cached quotes for a material lot
   * @param {string} lotId
   * @returns {Promise<{ data: object|null, cachedAt: string|null, isStale: boolean, ageHours: number }>}
   */
  async getCachedLotQuotes(lotId) {
    if (!lotId) return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    const key = `${STORAGE_KEYS.CACHE_LOT_QUOTES_PREFIX}${lotId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_LOT_QUOTES_TIMESTAMP_PREFIX}${lotId}`;
    const data = await storage.getItem(key);
    const cachedAt = await storage.getItem(tsKey);

    if (!data || !cachedAt) {
      return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    }

    const ageMs = Date.now() - new Date(cachedAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    const isStale = ageMs > maxAgeMs;

    return {
      data,
      cachedAt,
      isStale,
      ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
    };
  }

  /**
   * Cache a single digital handover receipt
   * @param {string} handoverId
   * @param {object} handoverData
   * @returns {Promise<void>}
   */
  async cacheHandover(handoverId, handoverData) {
    if (!handoverId || !handoverData) return;
    const key = `${STORAGE_KEYS.CACHE_HANDOVER_PREFIX}${handoverId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_HANDOVER_TIMESTAMP_PREFIX}${handoverId}`;
    await storage.setItem(key, handoverData);
    await storage.setItem(tsKey, new Date().toISOString());
  }

  /**
   * Get cached digital handover receipt
   * @param {string} handoverId
   * @returns {Promise<{ data: object|null, cachedAt: string|null, isStale: boolean, ageHours: number }>}
   */
  async getCachedHandover(handoverId) {
    if (!handoverId) return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    const key = `${STORAGE_KEYS.CACHE_HANDOVER_PREFIX}${handoverId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_HANDOVER_TIMESTAMP_PREFIX}${handoverId}`;
    const data = await storage.getItem(key);
    const cachedAt = await storage.getItem(tsKey);

    if (!data || !cachedAt) {
      return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    }

    const ageMs = Date.now() - new Date(cachedAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const isStale = ageMs > maxAgeMs;

    return {
      data,
      cachedAt,
      isStale,
      ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
    };
  }

  /**
   * Cache handovers for a material lot
   * @param {string} lotId
   * @param {Array<object>} handovers
   * @returns {Promise<void>}
   */
  async cacheLotHandovers(lotId, handovers) {
    if (!lotId || !handovers) return;
    const key = `${STORAGE_KEYS.CACHE_LOT_HANDOVERS_PREFIX}${lotId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_LOT_HANDOVERS_TIMESTAMP_PREFIX}${lotId}`;
    await storage.setItem(key, handovers);
    await storage.setItem(tsKey, new Date().toISOString());
  }

  /**
   * Get cached handovers for a material lot
   * @param {string} lotId
   * @returns {Promise<{ data: Array<object>|null, cachedAt: string|null, isStale: boolean, ageHours: number }>}
   */
  async getCachedLotHandovers(lotId) {
    if (!lotId) return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    const key = `${STORAGE_KEYS.CACHE_LOT_HANDOVERS_PREFIX}${lotId}`;
    const tsKey = `${STORAGE_KEYS.CACHE_LOT_HANDOVERS_TIMESTAMP_PREFIX}${lotId}`;
    const data = await storage.getItem(key);
    const cachedAt = await storage.getItem(tsKey);

    if (!data || !cachedAt) {
      return { data: null, cachedAt: null, isStale: true, ageHours: 0 };
    }

    const ageMs = Date.now() - new Date(cachedAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const isStale = ageMs > maxAgeMs;

    return {
      data,
      cachedAt,
      isStale,
      ageHours: Math.floor(ageMs / (60 * 60 * 1000)),
    };
  }


  /**
   * Clear price cache
   * @returns {Promise<void>}
   */
  async clearPriceCache() {
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICES);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICES_TIMESTAMP);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICE_HISTORY);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICE_HISTORY_TIMESTAMP);
  }

  /**
   * Clear all offline caches
   * @returns {Promise<void>}
   */
  async clearAllCaches() {
    await storage.removeItem(STORAGE_KEYS.CACHE_ITEMS);
    await storage.removeItem(STORAGE_KEYS.CACHE_REQUESTS);
    await storage.removeItem(STORAGE_KEYS.CACHE_PICKUPS);
    await storage.removeItem(STORAGE_KEYS.CACHE_MATERIAL_LOTS);
    await storage.removeItem(STORAGE_KEYS.CACHE_MATERIAL_ITEMS);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICES);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICES_TIMESTAMP);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICE_HISTORY);
    await storage.removeItem(STORAGE_KEYS.CACHE_PRICE_HISTORY_TIMESTAMP);
  }
}

export const offlineStore = new OfflineStore();
export default offlineStore;


