/**
 * EcoSetu Mobile E-Waste Service
 * Offline-first service for managing e-waste items and drafts.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 3, docs/09_FRONTEND_ARCHITECTURE.md Section 6.2
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { offlineStore } from './offlineStore.js';
import { offlineQueue } from './offlineQueue.js';
import { QUEUE_ACTION_TYPES } from '../utils/constants.js';

class EWasteService {
  /**
   * Get list of e-waste items (with offline fallback)
   * @param {Object} [params]
   * @returns {Promise<Array<Object>>}
   */
  async getItems(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/ewaste-items?${query}` : '/ewaste-items';
        const response = await apiClient.get(endpoint);
        const items = response.data?.items || response.data || [];
        // Update local cache
        for (const item of items) {
          await offlineStore.saveItemDraft(item);
        }
        return items;
      } catch (err) {
        // Fall back to local cache if network error
        if (err.isNetworkError) {
          return offlineStore.getCachedItems();
        }
        throw err;
      }
    }
    return offlineStore.getCachedItems();
  }

  /**
   * Get single item by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getItemById(id) {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(`/ewaste-items/${id}`);
        const item = response.data?.item || response.data;
        if (item) {
          await offlineStore.saveItemDraft(item);
        }
        return item;
      } catch (err) {
        if (err.isNetworkError) {
          const cached = await offlineStore.getCachedItems();
          return cached.find((i) => i.id === id) || null;
        }
        throw err;
      }
    }
    const cached = await offlineStore.getCachedItems();
    return cached.find((i) => i.id === id) || null;
  }

  /**
   * Upload image file to server storage
   * @param {string} imageUri - Local file path (file://... or content://...)
   * @param {string} [fileName]
   * @param {string} [mimeType]
   * @returns {Promise<Object>} { fileKey, imageUrl }
   */
  async uploadImage(imageUri, fileName = null, mimeType = 'image/jpeg') {
    if (!imageUri) return null;
    if (!networkService.isConnected()) {
      return null;
    }

    const cleanUri = imageUri.startsWith('file://') || imageUri.startsWith('content://')
      ? imageUri
      : `file://${imageUri}`;
    const name = fileName || `ewaste_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append('image', {
      uri: cleanUri,
      type: mimeType || 'image/jpeg',
      name,
    });

    const response = await apiClient.request('/ewaste-items/upload', {
      method: 'POST',
      body: formData,
    });

    return response.data || response;
  }

  /**
   * Create e-waste item (Offline-first: queues if offline)
   * @param {Object} itemData - { categoryId, brand, model, condition, estimatedWeightKg, ... }
   * @returns {Promise<Object>} Created or draft item
   */
  async createItem(itemData) {
    if (networkService.isConnected()) {
      try {
        const payload = { ...itemData };
        if (payload.imageUri && (payload.imageUri.startsWith('file:') || payload.imageUri.startsWith('content:'))) {
          try {
            const uploadRes = await this.uploadImage(payload.imageUri);
            if (uploadRes?.imageUrl) {
              payload.imageUrl = uploadRes.imageUrl;
            }
          } catch (uploadErr) {
            console.warn('[EWasteService] Image upload warning, proceeding with item creation:', uploadErr?.message);
          }
        }

        const response = await apiClient.post('/ewaste-items', payload);
        const createdItem = response.data?.item || response.data;
        await offlineStore.saveItemDraft(createdItem);
        return createdItem;
      } catch (err) {
        if (err.isNetworkError) {
          // Network failed during call; fallback to offline queue
          return this._createOfflineItem(itemData);
        }
        throw err;
      }
    }
    return this._createOfflineItem(itemData);
  }

  async _createOfflineItem(itemData) {
    const draft = await offlineStore.saveItemDraft(itemData);
    await offlineQueue.enqueue({
      type: QUEUE_ACTION_TYPES.CREATE_EWASTE_ITEM,
      endpoint: '/ewaste-items',
      method: 'POST',
      payload: itemData,
      localId: draft.id,
    });
    return draft;
  }

  /**
   * Get full item traceability chain (offline-first with per-item cache)
   * Endpoint: GET /api/v1/ewaste-items/:id/traceability
   * Source of Truth: docs/05_API_SPECIFICATION.md, docs/21_TRACEABILITY_AND_AUDIT.md
   *
   * @param {string} itemId - E-waste item UUID
   * @returns {Promise<Object|null>} Traceability payload or null if not found
   */
  async getItemTraceability(itemId) {
    const cacheKey = `@ecosetu_trace_${itemId}`;
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(`/ewaste-items/${itemId}/traceability`);
        const payload = response.data?.traceability || response.data;
        if (payload) {
          await storage.setItem(cacheKey, JSON.stringify({ data: payload, cachedAt: Date.now() }));
        }
        return payload || null;
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedTraceability(itemId, cacheKey);
        }
        throw err;
      }
    }
    return this._getCachedTraceability(itemId, cacheKey);
  }

  async _getCachedTraceability(itemId, cacheKey) {
    try {
      const raw = await storage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const data = parsed?.data || parsed;
      return data || null;
    } catch {
      return null;
    }
  }

  /**
   * Delete an item (removes from cache and deletes from server if online)
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteItem(id) {
    await offlineStore.removeItem(id);
    if (networkService.isConnected()) {
      await apiClient.delete(`/ewaste-items/${id}`).catch(() => {});
    }
  }
}

export const ewasteService = new EWasteService();
export default ewasteService;
