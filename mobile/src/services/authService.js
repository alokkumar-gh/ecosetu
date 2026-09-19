/**
 * EcoSetu Mobile Authentication Service
 * Manages user authentication sessions, tokens in AsyncStorage, and session restoration.
 * Source of Truth: docs/05_API_SPECIFICATION.md Section 2, docs/09_FRONTEND_ARCHITECTURE.md Section 5.1, docs/13_SECURITY_PRIVACY.md
 */

import { apiClient } from './apiClient.js';
import { storage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';
import { fcmClientService } from './fcmClientService.js';

class AuthService {
  constructor() {
    this._listeners = new Set();

    // Listen to 401 session expiration from ApiClient
    apiClient.onAuthExpired(() => {
      this._notifyListeners({ event: 'EXPIRED', user: null });
    });
  }

  /**
   * Add listener for authentication state changes (LOGIN, LOGOUT, EXPIRED)
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  addListener(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners(payload) {
    for (const listener of this._listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[AuthService] Listener notification error:', err);
      }
    }
  }

  /**
   * Authenticate user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken?: string }>}
   */
  async login(email, password) {
    if (!email || !password) {
      throw AppError.validationError('Email and password are required');
    }

    const response = await apiClient.post(
      '/auth/login',
      { email, password },
      { skipAuth: true }
    );

    if (!response?.success || !response.data) {
      throw AppError.authError('Login failed: Invalid server response');
    }

    const { user, accessToken, refreshToken } = response.data;

    // Securely persist credentials in AsyncStorage
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user) {
      await storage.setItem(STORAGE_KEYS.USER_PROFILE, user);
    }

    this._notifyListeners({ event: 'LOGIN', user });
    return response.data;
  }

  /**
   * Authenticate user with verified Firebase ID token
   * Synchronizes Firebase identity with backend ECOSETU session
   * @param {Object} params - { idToken: string, provider?: string }
   * @returns {Promise<{ user: Object, accessToken: string, refreshToken?: string }>}
   */
  async loginWithFirebase({ idToken, provider = 'firebase' }) {
    if (!idToken) {
      throw AppError.validationError('Firebase ID token is required');
    }

    const response = await apiClient.post(
      '/auth/firebase-login',
      { idToken, provider },
      { skipAuth: true }
    );

    if (!response?.success || !response.data) {
      throw AppError.authError('Firebase login failed: Invalid server response');
    }

    const { user, accessToken, refreshToken } = response.data;

    // Securely persist credentials in AsyncStorage
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user) {
      await storage.setItem(STORAGE_KEYS.USER_PROFILE, user);
    }

    this._notifyListeners({ event: 'LOGIN', user });
    return response.data;
  }


  /**
   * Register a new user
   * @param {Object} userData - { email, password, name, role, phone }
   * @returns {Promise<{ user: Object, accessToken: string }>}
   */
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData, { skipAuth: true });

    if (!response?.success || !response.data) {
      throw AppError.validationError('Registration failed: Invalid response');
    }

    const { user, accessToken, refreshToken } = response.data;

    if (accessToken) {
      await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    }
    if (refreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user) {
      await storage.setItem(STORAGE_KEYS.USER_PROFILE, user);
    }

    this._notifyListeners({ event: 'LOGIN', user });
    return response.data;
  }

  /**
   * Log out current user, invalidate session, and clear stored credentials
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      // Best-effort server notification and FCM token deactivation
      await Promise.all([
        apiClient.post('/auth/logout', {}, { timeoutMs: 5000 }).catch(() => {}),
        fcmClientService.unregisterOnLogout().catch(() => {}),
      ]);
    } finally {
      // Purge all tokens, profile, and user domain caches to prevent cross-account leakage (Phase 18 Security Hardening)
      await storage.clearAllUserCaches(false);
      await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER_PROFILE);

      this._notifyListeners({ event: 'LOGOUT', user: null });
    }
  }

  /**
   * Manually trigger token refresh
   * @returns {Promise<string>} new access token
   */
  async refresh() {
    const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw AppError.authError('No refresh token available');
    }

    const response = await apiClient.post(
      '/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    );

    if (!response?.success || !response.data?.accessToken) {
      throw AppError.authError('Token refresh failed');
    }

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (newRefreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
    }

    return accessToken;
  }

  /**
   * Restore existing session on app launch
   * @returns {Promise<{ user: Object|null, accessToken: string|null, isAuthenticated: boolean }>}
   */
  async getSession() {
    const accessToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const user = await storage.getItem(STORAGE_KEYS.USER_PROFILE);

    if (!accessToken || !user) {
      return {
        user: null,
        accessToken: null,
        isAuthenticated: false,
      };
    }

    return {
      user,
      accessToken,
      isAuthenticated: true,
    };
  }

  /**
   * Get cached user profile
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser() {
    return storage.getItem(STORAGE_KEYS.USER_PROFILE);
  }

  /**
   * Check if token is present
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return Boolean(token);
  }
}

export const authService = new AuthService();
export default authService;
