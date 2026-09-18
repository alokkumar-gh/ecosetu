/**
 * EcoSetu Mobile FCM Client Service
 * Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md Section 4.5, docs/15_DEPLOYMENT_GUIDE.md Section 8.3
 *
 * Role:
 * - Manages FCM registration token lifecycle on the Android client.
 * - Associates token with the authenticated user via POST /api/v1/notifications/device-token.
 * - Safely unregisters token upon logout via DELETE /api/v1/notifications/device-token.
 * - Handles incoming push messages in foreground and background without duplicating records.
 * - Dispatches safe deep-linking into existing role navigation flows.
 */

import { notificationService } from './notificationService.js';
import { storage } from '../utils/storage.js';

const AsyncStorage = storage;

const FCM_TOKEN_KEY = '@ecosetu_fcm_token';

class FcmClientService {
  constructor() {
    this._listeners = new Set();
    this._isInitialized = false;
  }

  /**
   * Initialize FCM client listener and sync token with backend if authenticated
   */
  async init() {
    if (this._isInitialized) return;
    this._isInitialized = true;

    try {
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        await this.syncTokenWithBackend(storedToken);
      }
    } catch (err) {
      // Non-blocking initialization failure
    }
  }

  /**
   * Get cached registration token from local AsyncStorage
   * @returns {Promise<string|null>}
   */
  async getStoredToken() {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Synchronize registration token with backend for the authenticated user
   * @param {string} token - Android FCM registration token
   * @returns {Promise<boolean>}
   */
  async syncTokenWithBackend(token) {
    if (!token || typeof token !== 'string') return false;

    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      await notificationService.registerDeviceToken(token);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Unregister token with backend on logout and clear local cache
   * @returns {Promise<void>}
   */
  async unregisterOnLogout() {
    try {
      const token = await this.getStoredToken();
      if (token) {
        await notificationService.unregisterDeviceToken(token).catch(() => {});
        await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      }
    } catch {
      // Non-blocking logout cleanup
    }
  }

  /**
   * Handle push notification payload received while app is in foreground
   * Never fabricates duplicate database notifications.
   *
   * @param {object} message - { notification, data }
   */
  handleForegroundNotification(message) {
    if (!message) return;
    const notification = {
      title: message.notification?.title || message.title || 'EcoSetu Alert',
      body: message.notification?.body || message.body || '',
      type: message.data?.type || 'GENERAL',
      referenceType: message.data?.referenceType || null,
      referenceId: message.data?.referenceId || null,
      receivedAt: Date.now(),
    };

    // Notify registered UI listeners (e.g. InAppBanner or NotificationsScreen)
    this._listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch {}
    });
  }

  /**
   * Handle user tap on system notification with deep-linking
   * @param {object} navigation - React Navigation object
   * @param {object} data - { referenceType, referenceId }
   */
  handleNotificationTap(navigation, data = {}) {
    if (!navigation || typeof navigation.navigate !== 'function') return;

    const { referenceType, referenceId } = data;

    if (referenceType === 'collection_request' && referenceId) {
      navigation.navigate('RequestDetail', { requestId: referenceId });
    } else if (referenceType === 'consignment' && referenceId) {
      navigation.navigate('ConsignmentDetail', { consignmentId: referenceId });
    } else {
      navigation.navigate('Notifications');
    }
  }

  /**
   * Subscribe to foreground notification events
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this._listeners.add(callback);
      return () => this._listeners.delete(callback);
    }
    return () => {};
  }
}

export const fcmClientService = new FcmClientService();
export default fcmClientService;
