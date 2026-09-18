// EcoSetu Firebase Cloud Messaging (FCM) Delivery Service
// Canonical Reference: docs/15_DEPLOYMENT_GUIDE.md Section 6, docs/23_NOTIFICATION_SYSTEM.md Section 8
//
// Role:
// Push notification delivery layer for the Android client.
// PostgreSQL remains the authoritative source of truth for all notifications.
// FCM delivery is asynchronous and resilient — delivery failure NEVER breaks or rolls back business state.

const logger = require('../config/logger');
const prisma = require('../config/database');

class FcmService {
  constructor() {
    this._initialized = false;
    this._admin = null;
    this._initAttempted = false;
  }

  /**
   * Safe lazy initialization of Firebase Admin SDK
   * Resolves credentials from GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_CONFIG, or explicit env vars.
   */
  _ensureInitialized() {
    if (this._initAttempted) return this._initialized;
    this._initAttempted = true;

    // Check if Firebase Admin SDK is available and credentials are configured
    const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

    if (!hasCredentials) {
      logger.info('FCM: No service credentials configured; push delivery adapter operating in mock/noop mode.');
      return false;
    }

    try {
      // Dynamically load firebase-admin if present in environment
      const admin = require('firebase-admin');
      if (admin.apps.length === 0) {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        } else {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
          });
        }
      }
      this._admin = admin;
      this._initialized = true;
      logger.info('FCM: Firebase Admin SDK initialized successfully for push delivery.');
      return true;
    } catch (err) {
      logger.warn(`FCM: Initialization skipped (${err.message}). Push notifications will run in noop mode.`);
      return false;
    }
  }

  /**
   * Mask device token for secure logging (never log full tokens)
   * @param {string} token 
   * @returns {string}
   */
  _maskToken(token) {
    if (!token || typeof token !== 'string') return 'none';
    if (token.length <= 8) return '***';
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  /**
   * Send push notification to a specific device registration token.
   * Resilient: Catches all errors and returns boolean status without throwing.
   *
   * @param {string} registrationToken - Android FCM token
   * @param {object} payload - { title, message, type, referenceType, referenceId, notificationId }
   * @returns {Promise<{ delivered: boolean, error?: string }>}
   */
  async sendToDevice(registrationToken, payload) {
    if (!registrationToken) {
      return { delivered: false, error: 'Registration token required' };
    }

    const isReady = this._ensureInitialized();
    if (!isReady || !this._admin) {
      // Mock / unconfigured environment
      logger.debug(`FCM: Simulated push dispatch to ${this._maskToken(registrationToken)}: [${payload.type}] ${payload.title}`);
      return { delivered: true, simulated: true };
    }

    // Sanitize payload: strings only in data field, no PII, no tokens
    const message = {
      token: registrationToken,
      notification: {
        title: String(payload.title || 'EcoSetu Alert').slice(0, 100),
        body: String(payload.message || '').slice(0, 250),
      },
      data: {
        type: String(payload.type || 'GENERAL'),
        referenceType: String(payload.referenceType || ''),
        referenceId: String(payload.referenceId || ''),
        notificationId: String(payload.notificationId || payload.id || ''),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'ecosetu_alerts',
          sound: 'default',
        },
      },
    };

    try {
      const response = await this._admin.messaging().send(message);
      logger.info(`FCM: Successfully sent message ${response} to device ${this._maskToken(registrationToken)}`);
      return { delivered: true, messageId: response };
    } catch (err) {
      logger.warn(`FCM: Delivery failure to ${this._maskToken(registrationToken)}: ${err.code || err.message}`);
      return { delivered: false, error: err.code || err.message };
    }
  }

  /**
   * Send notification for a user across all active registered device tokens.
   * Safe and non-blocking: never throws. Stale tokens are deactivated on error.
   *
   * @param {string} userId - Target user UUID
   * @param {object} payload - Notification data
   * @returns {Promise<{ delivered: boolean, results?: Array }>}
   */
  async sendToUser(userId, payload) {
    try {
      const activeTokens = await prisma.deviceToken.findMany({
        where: { userId, isActive: true },
        select: { id: true, token: true },
      });

      if (!activeTokens || activeTokens.length === 0) {
        logger.debug(`FCM: No active device tokens found for user ${userId}; skipping push delivery.`);
        return { delivered: false, reason: 'NO_ACTIVE_TOKENS' };
      }

      const results = await Promise.all(
        activeTokens.map(async (t) => {
          const res = await this.sendToDevice(t.token, payload);
          // Auto-clean stale or unregistered tokens
          if (
            !res.delivered &&
            (res.error === 'messaging/registration-token-not-registered' ||
              res.error === 'messaging/invalid-registration-token')
          ) {
            logger.info(`FCM: Automatically deactivating stale device token for user ${userId}`);
            await prisma.deviceToken
              .update({
                where: { id: t.id },
                data: { isActive: false, updatedAt: new Date() },
              })
              .catch(() => {});
          }
          return res;
        })
      );

      const anyDelivered = results.some((r) => r.delivered);
      return { delivered: anyDelivered, results };
    } catch (err) {
      logger.warn(`FCM: sendToUser error for ${userId}: ${err.message}`);
      return { delivered: false, error: err.message };
    }
  }
}

module.exports = new FcmService();

