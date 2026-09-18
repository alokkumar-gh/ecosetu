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

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const CACHE_KEYS = Object.freeze({
  ANALYTICS: '@ecosetu_admin_analytics',
  USERS: '@ecosetu_admin_users',
  AUDIT_LOGS: '@ecosetu_admin_audit_logs',
  VERIFICATIONS: '@ecosetu_admin_verifications',
});

class AdminService {
  /**
   * Fetch platform-wide metrics and circular economy conversion funnel.
   * Cached for offline inspection with stale indication.
   * @returns {Promise<{ analytics: object, fromCache: boolean }>}
   */
  async getAnalytics() {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get('/admin/analytics');
        const analytics = response.data?.data || response.data;
        if (analytics) {
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
   * @returns {Promise<{ verifications: Array<object>, pagination: object, fromCache: boolean }>}
   */
  async getVerifications({ status = 'PENDING', page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();
    if (status && status !== 'ALL') query.append('status', status);
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

        if ((!status || status === 'PENDING') && page === 1) {
          await AsyncStorage.setItem(CACHE_KEYS.VERIFICATIONS, JSON.stringify({ verifications, pagination }));
        }

        return { verifications, pagination, fromCache: false };
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
   * Approve or reject a user verification request.
   * Server-authoritative mutation. ONLINE-ONLY: blocked when offline.
   * Never enqueued in offlineQueue.
   *
   * @param {string} verificationId - Verification UUID
   * @param {string} status - 'APPROVED' or 'REJECTED'
   * @param {string} [reviewNotes] - Optional review notes / rejection reason
   * @returns {Promise<object>} Updated verification record
   */
  async updateVerification(verificationId, status, reviewNotes) {
    if (!networkService.isConnected()) {
      const err = new Error('Internet connection required. Verification decisions cannot be performed offline.');
      err.isOfflineError = true;
      throw err;
    }

    const payload = { status };
    if (reviewNotes && reviewNotes.trim()) {
      payload.reviewNotes = reviewNotes.trim();
    }

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
}

export const adminService = new AdminService();
export default adminService;
