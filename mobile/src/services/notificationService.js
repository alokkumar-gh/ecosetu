/**
 * EcoSetu Mobile Notification Service
 * Offline-first read layer for citizen notifications.
 *
 * API:
 *   GET    /api/v1/notifications          – list (paginated)
 *   GET    /api/v1/notifications/count    – unread count
 *   PATCH  /api/v1/notifications/:id/read – mark one as read
 *   PATCH  /api/v1/notifications/read-all – mark all as read
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md  (Section 13)
 *   docs/23_NOTIFICATION_SYSTEM.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *
 * Offline strategy:
 *   - Notifications are cached per-user after a successful fetch
 *     using a dedicated AsyncStorage key (@ecosetu_notifications).
 *   - Mark-read and mark-all-read mutations require connectivity —
 *     they are NOT queued offline (not documented as offline-capable).
 *   - Unread count is NOT fabricated when offline; null is returned.
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { storage } from '../utils/storage.js';

const AsyncStorage = storage;

const CACHE_KEY = '@ecosetu_notifications';
const COUNT_CACHE_KEY = '@ecosetu_notifications_unread_count';

class NotificationService {
  /**
   * List notifications for the authenticated user.
   * Falls back to the local cache when offline.
   *
   * @param {object} [params]   – { page, limit, unreadOnly }
   * @returns {Promise<{notifications: Array, pagination: object|null, fromCache: boolean}>}
   */
  async getNotifications(params = {}) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/notifications?${query}` : '/notifications';
        const response = await apiClient.get(endpoint);
        const data = response.data || {};
        const notifications = data.notifications || data || [];
        const pagination = data.pagination || null;

        // Persist to cache (first page, no filter = primary cache)
        if (!params.page || params.page === 1) {
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ notifications, cachedAt: Date.now() }),
          );
        }

        return { notifications, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedNotifications();
        }
        throw err;
      }
    }
    return this._getCachedNotifications();
  }

  async _getCachedNotifications() {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return { notifications: [], pagination: null, fromCache: true };
      const { notifications } = JSON.parse(raw);
      return { notifications: notifications || [], pagination: null, fromCache: true };
    } catch {
      return { notifications: [], pagination: null, fromCache: true };
    }
  }

  /**
   * Get unread notification count.
   * Returns null when offline (do not fabricate counts).
   *
   * @returns {Promise<number|null>}
   */
  async getUnreadCount() {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get('/notifications/count');
        const count = response.data?.unreadCount ?? 0;
        await AsyncStorage.setItem(COUNT_CACHE_KEY, String(count));
        return count;
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedCount();
        }
        throw err;
      }
    }
    return this._getCachedCount();
  }

  async _getCachedCount() {
    try {
      const raw = await AsyncStorage.getItem(COUNT_CACHE_KEY);
      return raw !== null ? parseInt(raw, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Mark a single notification as read.
   * Requires connectivity — throws if offline.
   *
   * @param {string} notificationId
   * @returns {Promise<object>} Updated notification record
   */
  async markAsRead(notificationId) {
    if (!networkService.isConnected()) {
      throw Object.assign(new Error('Cannot mark notification as read while offline'), {
        isOfflineError: true,
      });
    }
    const response = await apiClient.patch(`/notifications/${notificationId}/read`, {});
    const notification = response.data?.notification || response.data;

    // Reconcile local cache to maintain cache consistency
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { notifications, cachedAt } = JSON.parse(raw);
        const updated = (notifications || []).map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ notifications: updated, cachedAt }));
      }
    } catch {}

    return notification;
  }

  /**
   * Mark all notifications as read.
   * Requires connectivity — throws if offline.
   *
   * @returns {Promise<{count: number}>}
   */
  async markAllAsRead() {
    if (!networkService.isConnected()) {
      throw Object.assign(new Error('Cannot mark notifications as read while offline'), {
        isOfflineError: true,
      });
    }
    const response = await apiClient.patch('/notifications/read-all', {});

    // Reconcile local cache to maintain cache consistency
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { notifications, cachedAt } = JSON.parse(raw);
        const updated = (notifications || []).map((n) => ({ ...n, isRead: true }));
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ notifications: updated, cachedAt }));
      }
      await AsyncStorage.setItem(COUNT_CACHE_KEY, '0');
    } catch {}

    return response.data || { count: 0 };
  }

  /**
   * Clear local notification cache (e.g. on logout or user switch)
   * @returns {Promise<void>}
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(COUNT_CACHE_KEY);
    } catch {}
  }

  /**
   * Register FCM device token with backend
   * POST /api/v1/notifications/device-token
   * @param {string} token - FCM registration token
   * @returns {Promise<object|null>}
   */
  async registerDeviceToken(token) {
    if (!token) return null;
    try {
      const response = await apiClient.post('/notifications/device-token', {
        token,
        platform: 'android',
      });
      return response.data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Unregister FCM device token with backend on logout
   * DELETE /api/v1/notifications/device-token
   * @param {string} token - FCM registration token
   * @returns {Promise<object|null>}
   */
  async unregisterDeviceToken(token) {
    if (!token) return null;
    try {
      const response = await apiClient.delete('/notifications/device-token', {
        data: { token },
      });
      return response.data;
    } catch (err) {
      return null;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
