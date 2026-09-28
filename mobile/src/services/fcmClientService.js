/**
 * EcoSetu Mobile FCM Client Service
 * Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md Section 4.5, docs/15_DEPLOYMENT_GUIDE.md Section 8.3
 *
 * Role:
 * - Manages FCM registration token lifecycle on the Android client using @react-native-firebase/messaging.
 * - Associates token with the authenticated user via POST /api/v1/notifications/device-token.
 * - Safely unregisters token upon logout via DELETE /api/v1/notifications/device-token.
 * - Handles incoming push messages in foreground and background without duplicating records.
 * - Dispatches safe deep-linking into existing role navigation flows.
 */

import { notificationService } from './notificationService.js';
import { storage } from '../utils/storage.js';

let messaging = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  // Graceful fallback if native module is not linked
}

const AsyncStorage = storage;
const FCM_TOKEN_KEY = '@ecosetu_fcm_token';

class FcmClientService {
  constructor() {
    this._listeners = new Set();
    this._isInitialized = false;
    this._navigation = null;
  }

  /**
   * Initialize FCM client listener and sync token with backend if authenticated
   * @param {object} navigation - Optional React Navigation ref
   */
  async init(navigation = null) {
    if (navigation) {
      this._navigation = navigation;
    }

    if (this._isInitialized) return;
    this._isInitialized = true;

    try {
      if (messaging) {
        // Request notification permission (required on Android 13+)
        const authStatus = await messaging().requestPermission().catch(() => null);

        // Fetch native registration token
        const nativeToken = await messaging().getToken().catch(() => null);
        if (nativeToken) {
          await this.syncTokenWithBackend(nativeToken);
        }

        // Listen for token refreshes
        messaging().onTokenRefresh(async (newToken) => {
          if (newToken) {
            await this.syncTokenWithBackend(newToken);
          }
        });

        // Handle foreground notifications
        messaging().onMessage(async (remoteMessage) => {
          if (remoteMessage) {
            this.handleForegroundNotification(remoteMessage);
          }
        });

        // Handle notification open from background state
        messaging().onNotificationOpenedApp((remoteMessage) => {
          if (remoteMessage && remoteMessage.data) {
            this.handleNotificationTap(this._navigation, remoteMessage.data);
          }
        });

        // Handle notification open from quit / terminated state
        const initialNotification = await messaging().getInitialNotification().catch(() => null);
        if (initialNotification && initialNotification.data) {
          this.handleNotificationTap(this._navigation, initialNotification.data);
        }
      } else {
        const storedToken = await this.getStoredToken();
        if (storedToken) {
          await this.syncTokenWithBackend(storedToken);
        }
      }
    } catch (err) {
      // Non-blocking initialization failure
    }
  }

  /**
   * Request native FCM token and sync with backend
   * Called upon user login
   */
  async requestAndSyncToken() {
    try {
      if (messaging) {
        await messaging().requestPermission().catch(() => null);
        const token = await messaging().getToken().catch(() => null);
        if (token) {
          return await this.syncTokenWithBackend(token);
        }
      }
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        return await this.syncTokenWithBackend(storedToken);
      }
    } catch {
      return false;
    }
    return false;
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
      if (messaging) {
        await messaging().deleteToken().catch(() => {});
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
   * @param {object} data - { referenceType, referenceId, type }
   */
  handleNotificationTap(navigation, data = {}) {
    const nav = navigation || this._navigation;
    if (!nav || typeof nav.navigate !== 'function') return;

    const { referenceType, referenceId, type } = data;

    if (referenceType === 'collection_request' && referenceId) {
      nav.navigate('RequestDetail', { requestId: referenceId });
    } else if (referenceType === 'consignment' && referenceId) {
      nav.navigate('ConsignmentDetail', { consignmentId: referenceId });
    } else if (referenceType === 'material_lot' && referenceId) {
      nav.navigate('RecyclerMarketplace', { lotId: referenceId });
    } else if (type === 'OFFER_RECEIVED' && referenceId) {
      nav.navigate('RequestDetail', { requestId: referenceId });
    } else {
      nav.navigate('Notifications');
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
