/**
 * EcoSetu Mobile User Profile Service
 * Handles fetching and updating the authenticated user's profile.
 *
 * Endpoints:
 *   GET   /api/v1/users/me  – get current authenticated user profile
 *   PATCH /api/v1/users/me  – update mutable profile fields (name, phone)
 *
 * Editable fields verified from:
 *   backend/src/services/userService.js  -> updateProfile(userId, { name, phone })
 *   backend/src/validators/userValidators.js -> updateProfile validator
 *
 * Protected fields (client MUST NOT send):
 *   role, status, email, password, passwordHash, id,
 *   createdAt, updatedAt, avatarUrl
 *
 * Offline strategy:
 *   - Profile is cached to @ecosetu_user_profile after each successful GET.
 *   - READ: returns cached profile when offline (user object available from
 *     AuthContext which itself restores from STORAGE_KEYS.USER_PROFILE).
 *   - WRITE: profile updates require connectivity — NOT offline-queued
 *     (PATCH /users/me is not in QUEUE_ACTION_TYPES; docs do not document
 *     offline profile update as a supported capability).
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 3
 *   docs/09_FRONTEND_ARCHITECTURE.md Section 5.2
 *   docs/13_SECURITY_PRIVACY.md
 */

import { apiClient } from './apiClient.js';
import { networkService } from './networkService.js';
import { storage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

class UserProfileService {
  /**
   * Fetch the authenticated user's own profile.
   * Falls back to local cache when offline.
   *
   * @returns {Promise<{ user: object, fromCache: boolean }>}
   */
  async getProfile() {
    if (networkService.isConnected()) {
      try {
        const response = await apiClient.get('/users/me');
        const user = response.data?.user || response.data;
        if (user) {
          await storage.setItem(STORAGE_KEYS.USER_PROFILE, user);
        }
        return { user, fromCache: false };
      } catch (err) {
        if (err.isNetworkError) {
          return this._getCachedProfile();
        }
        throw err;
      }
    }
    return this._getCachedProfile();
  }

  async _getCachedProfile() {
    try {
      const user = await storage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!user) return { user: null, fromCache: true };
      return { user, fromCache: true };
    } catch {
      return { user: null, fromCache: true };
    }
  }

  /**
   * Update mutable profile fields for the authenticated user.
   * Only `name` and `phone` are permitted by the backend.
   * Requires network connectivity — not offline-capable.
   *
   * Validation mirrors backend/src/validators/userValidators.js:
   *   name: optional, 2–100 chars
   *   phone: optional/nullable, matches phone regex
   *
   * @param {{ name?: string, phone?: string | null }} fields
   * @returns {Promise<object>} Updated user profile
   */
  async updateProfile({ name, phone }) {
    if (!networkService.isConnected()) {
      throw Object.assign(
        new Error('Profile updates require an internet connection.'),
        { isOfflineError: true },
      );
    }

    // Build payload — only send editable fields
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (phone !== undefined) payload.phone = phone;

    if (Object.keys(payload).length === 0) {
      throw Object.assign(
        new Error('At least one field (name, phone) must be provided.'),
        { isValidationError: true },
      );
    }

    const response = await apiClient.patch('/users/me', payload);
    const user = response.data?.user || response.data;

    // Refresh local cache with updated profile
    if (user) {
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(user));
    }

    return user;
  }
}

export const userProfileService = new UserProfileService();
export default userProfileService;
