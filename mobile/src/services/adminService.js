/**
 * EcoSetu Admin Service
 * Mobile service for platform governance, user management, analytics, and audit logs.
 *
 * Operational Scope:
 *   - Platform Analytics: GET /api/v1/admin/analytics
 *   - User Governance: GET /api/v1/admin/users
 *   - Status Management: PATCH /api/v1/admin/users/:id/status
 *   - Audit Trail Inspection: GET /api/v1/admin/audit-logs
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 14
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/08_UI_UX_SPECIFICATION.md Section 4
 *   docs/10_BACKEND_ARCHITECTURE.md
 *   docs/21_TRACEABILITY_AND_AUDIT.md
 *   docs/22_ANALYTICS_AND_REPORTING.md
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { recyclingService } from './recyclingService.js';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const CACHE_KEYS = Object.freeze({
  ANALYTICS: '@ecosetu_admin_analytics',
  USERS: '@ecosetu_admin_users',
  AUDIT_LOGS: '@ecosetu_admin_audit_logs',
  VERIFICATIONS: '@ecosetu_admin_verifications',
  SYSTEM_HEALTH: '@ecosetu_admin_system_health',
});

class AdminService {
  /**
   * Fetch platform-wide metrics and circular economy conversion funnel.
   * Cached for offline inspection with stale indication.
   * @param {string} [period='7d'] - '7d', '30d', '90d', '1y', 'all', 'custom'
   * @param {string} [startDate]
   * @param {string} [endDate]
   * @returns {Promise<{ analytics: object, fromCache: boolean }>}
   */
  async getAnalytics(period = '7d', startDate = null, endDate = null) {
    if (networkService.isConnected()) {
      try {
        const query = new URLSearchParams();
        if (period) query.append('period', String(period).toLowerCase());
        if (startDate) query.append('startDate', startDate);
        if (endDate) query.append('endDate', endDate);
        const qs = query.toString();
        const url = `/admin/analytics${qs ? `?${qs}` : ''}`;

        const response = await apiClient.get(url);
        const analytics = response.data?.data || response.data;
        if (analytics) {
          const cacheKey = `${CACHE_KEYS.ANALYTICS}_${period || '7d'}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify(analytics));
          await AsyncStorage.setItem(CACHE_KEYS.ANALYTICS, JSON.stringify(analytics));
        }
        return { analytics, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedItem(CACHE_KEYS.ANALYTICS);
        }
        throw err;
      }
    }
    return this._getCachedItem(CACHE_KEYS.ANALYTICS);
  }

  /**
   * Send custom administrative broadcast notification.
   * Online-only: notifications are never queued offline.
   * @param {object} payload - { title, message, type, audience, targetUserId, actionUrl, confirmed }
   * @returns {Promise<object>}
   */
  async sendAdminNotification(payload) {
    if (!networkService.isConnected()) {
      throw Object.assign(new Error('Notification sending requires active network connection'), {
        isOfflineError: true,
      });
    }
    const response = await apiClient.post('/admin/notifications/send', payload);
    return response.data?.data || response.data;
  }

  /**
   * Preview audience recipient count before sending.
   * @param {object} params - { audience, targetUserId }
   * @returns {Promise<object>}
   */
  async previewNotificationRecipients({ audience, targetUserId = null }) {
    if (!networkService.isConnected()) {
      return { audience, count: 0, sample: [], requiresConfirmation: false };
    }
    const query = new URLSearchParams();
    if (audience) query.append('audience', audience);
    if (targetUserId) query.append('targetUserId', targetUserId);
    const response = await apiClient.get(`/admin/notifications/recipients-preview?${query.toString()}`);
    return response.data?.data || response.data;
  }

  /**
   * List administrative notification broadcast campaign history.
   * @param {object} [params] - { page, limit }
   * @returns {Promise<{ broadcasts: Array, pagination: object }>}
   */
  async getAdminNotificationHistory({ page = 1, limit = 20 } = {}) {
    if (!networkService.isConnected()) {
      return { broadcasts: [], pagination: null };
    }
    const response = await apiClient.get(`/admin/notifications/history?page=${page}&limit=${limit}`);
    return response.data?.data || response.data;
  }

  /**
   * Get notification analytics overview.
   * @returns {Promise<object>}
   */
  async getAdminNotificationAnalytics() {
    if (!networkService.isConnected()) {
      return null;
    }
    const response = await apiClient.get('/admin/notifications/analytics');
    return response.data?.data || response.data;
  }

  /**
   * Search users for individual notification targeting.
   * @param {string} q - Query text
   * @returns {Promise<Array<object>>}
   */
  async searchNotificationUsers(q) {
    if (!networkService.isConnected() || !q || !q.trim()) {
      return [];
    }
    const response = await apiClient.get(`/admin/notifications/users/search?q=${encodeURIComponent(q.trim())}`);
    const data = response.data?.data || response.data;
    return data?.users || [];
  }

  /**
   * Fetch privacy-safe geographic analytics and verified facility distribution.
   * Aggregates platform metrics and verified recycler facility locations.
   * Strictly avoids individual citizen household pins or raw doorstep coordinates.
   * @returns {Promise<{ analytics: object, recyclers: Array<object>, fromCache: boolean }>}
   */
  async getGeographicAnalytics() {
    const [analyticsResult, recyclersResult] = await Promise.all([
      this.getAnalytics(),
      recyclingService.getRecyclers(),
    ]);

    return {
      analytics: analyticsResult.analytics || null,
      recyclers: recyclersResult.recyclers || [],
      fromCache: Boolean(analyticsResult.fromCache || recyclersResult.fromCache),
    };
  }

  /**
   * List platform users with optional role/status filters, search query, and pagination.
   * @param {object} params
   * @param {string} [params.role]
   * @param {string} [params.status]
   * @param {string} [params.search]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @returns {Promise<{ users: Array<object>, pagination: object, fromCache: boolean }>}
   */
  async getUsers({ role, status, search, page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();
    if (role && role !== 'ALL') query.append('role', role);
    if (status && status !== 'ALL') query.append('status', status);
    if (search && search.trim()) query.append('search', search.trim());
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));

    const queryString = query.toString();
    const url = `/admin/users${queryString ? `?${queryString}` : ''}`;

    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(url);
        const data = response.data?.data || response.data;
        const users = data.users || [];
        const pagination = data.pagination || { page, limit, total: users.length, totalPages: 1 };

        if (!role && !status && !search && page === 1) {
          await AsyncStorage.setItem(CACHE_KEYS.USERS, JSON.stringify({ users, pagination }));
        }

        return { users, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedUsers();
        }
        throw err;
      }
    }

    return this._getCachedUsers();
  }

  /**
   * Update user account status (ACTIVE, SUSPENDED, DEACTIVATED).
   * Server-authoritative mutation. ONLINE-ONLY: blocked when offline.
   * Never enqueued in offlineQueue.
   *
   * @param {string} targetUserId - Target User UUID
   * @param {string} status - New UserStatus ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')
   * @param {string} [reason] - Optional administrative reason
   * @returns {Promise<object>} Authoritative updated user object
   */
  async updateUserStatus(targetUserId, status, reason) {
    if (!networkService.isConnected()) {
      const err = new Error('Internet connection required. Account status modifications cannot be performed offline.');
      err.isOfflineError = true;
      throw err;
    }

    const payload = { status };
    if (reason && reason.trim()) {
      payload.reason = reason.trim();
    }

    const response = await apiClient.patch(`/admin/users/${targetUserId}/status`, payload);
    const updatedUser = response.data?.data?.user || response.data?.user || response.data;

    // Invalidate users cache so next fetch reflects authoritative server state
    await AsyncStorage.removeItem(CACHE_KEYS.USERS).catch(() => {});

    return updatedUser;
  }

  /**
   * List immutable audit logs with filtering and pagination.
   * @param {object} params
   * @param {string} [params.action]
   * @param {string} [params.entityType]
   * @param {string} [params.actorId]
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @returns {Promise<{ auditLogs: Array<object>, pagination: object, fromCache: boolean }>}
   */
  async getAuditLogs({ action, entityType, actorId, startDate, endDate, page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();
    if (action && action.trim()) query.append('action', action.trim());
    if (entityType && entityType.trim()) query.append('entityType', entityType.trim());
    if (actorId && actorId.trim()) query.append('actorId', actorId.trim());
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));

    const queryString = query.toString();
    const url = `/admin/audit-logs${queryString ? `?${queryString}` : ''}`;

    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(url);
        const data = response.data?.data || response.data;
        const auditLogs = data.auditLogs || [];
        const pagination = data.pagination || { page, limit, total: auditLogs.length, totalPages: 1 };

        if (!action && !entityType && !actorId && page === 1) {
          await AsyncStorage.setItem(CACHE_KEYS.AUDIT_LOGS, JSON.stringify({ auditLogs, pagination }));
        }

        return { auditLogs, pagination, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedAuditLogs();
        }
        throw err;
      }
    }

    return this._getCachedAuditLogs();
  }

  /**
   * List verification requests with status filter and pagination.
   * @param {object} params
   * @param {string} [params.status='PENDING']
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {object} params
   * @param {string} [params.status='PENDING']
   * @param {string} [params.role='ALL']
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @returns {Promise<{ verifications: Array<object>, pagination: object, metrics: object, fromCache: boolean }>}
   */
  async getVerifications({ status = 'PENDING', role = 'ALL', page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();
    if (status && status !== 'ALL') query.append('status', status);
    if (role && role !== 'ALL') query.append('role', role);
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));

    const queryString = query.toString();
    const url = `/admin/verifications${queryString ? `?${queryString}` : ''}`;

    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get(url);
        const data = response.data?.data || response.data;
        const verifications = data.verifications || [];
        const pagination = data.pagination || { page, limit, total: verifications.length, totalPages: 1 };
        const metrics = data.metrics || { pending: 0, underReview: 0, approved: 0, rejected: 0, changesRequired: 0, total: 0 };

        if ((!status || status === 'PENDING') && page === 1 && (!role || role === 'ALL')) {
          await AsyncStorage.setItem(CACHE_KEYS.VERIFICATIONS, JSON.stringify({ verifications, pagination, metrics }));
        }

        return { verifications, pagination, metrics, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedVerifications();
        }
        throw err;
      }
    }

    return this._getCachedVerifications();
  }

  /**
   * Get single verification request by ID with applicant details and audit history
   * @param {string} verificationId
   * @returns {Promise<object>} Verification detail object
   */
  async getVerificationById(verificationId) {
    const response = await apiClient.get(`/admin/verifications/${verificationId}`);
    return response.data?.data?.verification || response.data?.verification || response.data;
  }

  /**
   * Approve, reject, or request changes on a user verification request.
   * Server-authoritative mutation. ONLINE-ONLY: blocked when offline.
   *
   * @param {string} verificationId - Verification UUID
   * @param {string} status - 'APPROVED' | 'REJECTED' | 'CHANGES_REQUIRED' | 'UNDER_REVIEW'
   * @param {string|object} [decisionData] - Notes string or payload object
   * @returns {Promise<object>} Updated verification record
   */
  async updateVerification(verificationId, status, decisionData = {}) {
    if (!networkService.isConnected()) {
      const err = new Error('Internet connection required. Verification decisions cannot be performed offline.');
      err.isOfflineError = true;
      throw err;
    }

    const payload = typeof decisionData === 'string' ? { reviewNotes: decisionData, status } : { ...decisionData, status };

    const response = await apiClient.patch(`/admin/verifications/${verificationId}`, payload);
    const updatedVerification = response.data?.data?.verification || response.data?.verification || response.data;

    // Invalidate verifications and users caches so subsequent lists reflect changes
    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.VERIFICATIONS).catch(() => {}),
      AsyncStorage.removeItem(CACHE_KEYS.USERS).catch(() => {}),
    ]);

    return updatedVerification;
  }

  // ─── Cache Helpers ────────────────────────────────────────────────────────────

  async _getCachedItem(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { analytics: null, fromCache: true };
      return { analytics: JSON.parse(raw), fromCache: true };
    } catch {
      return { analytics: null, fromCache: true };
    }
  }

  async _getCachedUsers() {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEYS.USERS);
      if (!raw) return { users: [], pagination: null, fromCache: true };
      const parsed = JSON.parse(raw);
      return { users: parsed.users || [], pagination: parsed.pagination || null, fromCache: true };
    } catch {
      return { users: [], pagination: null, fromCache: true };
    }
  }

  async _getCachedAuditLogs() {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEYS.AUDIT_LOGS);
      if (!raw) return { auditLogs: [], pagination: null, fromCache: true };
      const parsed = JSON.parse(raw);
      return { auditLogs: parsed.auditLogs || [], pagination: parsed.pagination || null, fromCache: true };
    } catch {
      return { auditLogs: [], pagination: null, fromCache: true };
    }
  }

  async _getCachedVerifications() {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEYS.VERIFICATIONS);
      if (!raw) return { verifications: [], pagination: null, fromCache: true };
      const parsed = JSON.parse(raw);
      return { verifications: parsed.verifications || [], pagination: parsed.pagination || null, fromCache: true };
    } catch {
      return { verifications: [], pagination: null, fromCache: true };
    }
  }

  /**
   * Check backend API health and response latency.
   * Performs an on-demand single check without keep-alive polling or continuous pings.
   * @returns {Promise<{ isHealthy: boolean, status: number, latencyMs: number, data?: object, error?: string }>}
   */
  async checkBackendHealth() {
    if (!networkService.isConnected()) {
      return { isHealthy: false, status: 0, latencyMs: 0, error: 'OFFLINE' };
    }
    const start = Date.now();
    try {
      const response = await apiClient.get('/health', { skipAuth: true, timeoutMs: 5000 });
      const latencyMs = Date.now() - start;
      const isHealthy = response?.status === 'ok' || response?.data?.status === 'ok';
      return {
        isHealthy,
        status: 200,
        latencyMs,
        data: response?.data || response,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      return {
        isHealthy: false,
        status: err?.status || 500,
        latencyMs,
        error: err?.message || 'Unreachable',
      };
    }
  }

  /**
   * Retrieve cached system diagnostics snapshot.
   * @returns {Promise<object|null>}
   */
  async getCachedSystemHealth() {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEYS.SYSTEM_HEALTH);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Store system diagnostics snapshot.
   * @param {object} snapshot
   * @returns {Promise<void>}
   */
  async saveCachedSystemHealth(snapshot) {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.SYSTEM_HEALTH, JSON.stringify(snapshot));
    } catch {}
  }
}

export const adminService = new AdminService();
export default adminService;
