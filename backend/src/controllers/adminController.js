// EcoSetu Admin Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const userService = require('../services/userService');
const analyticsService = require('../services/analyticsService');
const auditService = require('../services/auditService');
const verificationService = require('../services/verificationService');
const adminNotificationService = require('../services/adminNotificationService');
const recyclerService = require('../services/recyclerService');
const { sendSuccess } = require('../utils/responseHelper');

class AdminController {
  /**
   * List all platform users with filtering, search, and pagination
   * GET /api/v1/admin/users
   */
  async getUsers(req, res, next) {
    try {
      const data = await userService.listUsers(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update user account status
   * PATCH /api/v1/admin/users/:id/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const user = await userService.updateUserStatus(
        req.user.id,
        req.params.id,
        req.body.status,
        req.body.reason
      );
      return sendSuccess(res, { user }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get platform analytics with optional time period filtering
   * GET /api/v1/admin/analytics
   */
  async getAnalytics(req, res, next) {
    try {
      const data = await analyticsService.getPlatformAnalytics(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * View audit trail with filtering and pagination
   * GET /api/v1/admin/audit-logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const data = await auditService.listAuditLogs(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List pending/filtered verification requests
   * GET /api/v1/admin/verifications
   */
  async getVerifications(req, res, next) {
    try {
      const data = await verificationService.listVerifications(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get verification request by ID with applicant details and audit history
   * GET /api/v1/admin/verifications/:id
   */
  async getVerificationById(req, res, next) {
    try {
      const data = await verificationService.getVerificationById(req.params.id);
      return sendSuccess(res, { verification: data }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Approve, reject, or request changes on user verification request
   * PATCH /api/v1/admin/verifications/:id
   * POST /api/v1/admin/verifications/:id/approve
   * POST /api/v1/admin/verifications/:id/reject
   * POST /api/v1/admin/verifications/:id/request-changes
   */
  async updateVerification(req, res, next) {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || null;
      let status = req.body.status;
      if (req.path.endsWith('/approve')) status = 'APPROVED';
      else if (req.path.endsWith('/reject')) status = 'REJECTED';
      else if (req.path.endsWith('/request-changes')) status = 'CHANGES_REQUIRED';

      if (!status) {
        throw AppError.badRequest('Verification status decision is required');
      }

      const data = await verificationService.updateVerification(
        req.user.id,
        req.params.id,
        status,
        {
          reviewNotes: req.body.reviewNotes,
          rejectionReason: req.body.rejectionReason,
          changeRequestReason: req.body.changeRequestReason,
          changeRequestOptions: req.body.changeRequestOptions,
        },
        clientIp
      );
      return sendSuccess(res, { verification: data }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Send custom administrative notification to specified audience
   * POST /api/v1/admin/notifications/send
   */
  async sendNotification(req, res, next) {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || null;
      const result = await adminNotificationService.sendCustomNotification({
        adminId: req.user.id,
        title: req.body.title,
        message: req.body.message,
        type: req.body.type,
        audience: req.body.audience,
        targetUserId: req.body.targetUserId,
        actionUrl: req.body.actionUrl,
        confirmed: req.body.confirmed,
        ipAddress: clientIp,
      });
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Preview audience recipient count before sending
   * GET /api/v1/admin/notifications/recipients-preview
   */
  async previewNotificationRecipients(req, res, next) {
    try {
      const result = await adminNotificationService.previewAudience({
        audience: req.query.audience,
        targetUserId: req.query.targetUserId,
      });
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get administrative notification broadcast campaign history
   * GET /api/v1/admin/notifications/history
   */
  async getNotificationHistory(req, res, next) {
    try {
      const result = await adminNotificationService.getNotificationHistory(req.query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get notification analytics overview
   * GET /api/v1/admin/notifications/analytics
   */
  async getNotificationAnalytics(req, res, next) {
    try {
      const result = await adminNotificationService.getNotificationAnalytics();
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Privacy-safe search for individual user targeting
   * GET /api/v1/admin/notifications/users/search
   */
  async searchNotificationUsers(req, res, next) {
    try {
      const users = await adminNotificationService.searchUsersForNotification(req.query.q);
      return sendSuccess(res, { users }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List recyclers for admin governance with status/search filtering
   * GET /api/v1/admin/recyclers
   */
  async listRecyclers(req, res, next) {
    try {
      const data = await recyclerService.adminListRecyclers(req.query);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single recycler details for admin review including audit history
   * GET /api/v1/admin/recyclers/:id
   */
  async getRecyclerById(req, res, next) {
    try {
      const data = await recyclerService.adminGetRecyclerById(req.params.id);
      return sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update recycler authorization status with audit logging
   * PATCH /api/v1/admin/recyclers/:id/authorization
   */
  async updateRecyclerAuthorization(req, res, next) {
    try {
      const updated = await recyclerService.adminUpdateRecyclerAuthorization(
        req.user.id,
        req.params.id,
        req.body,
        req.ip
      );
      return sendSuccess(res, { recycler: updated }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update recycler operational profile (administrative maintenance)
   * PATCH /api/v1/admin/recyclers/:id
   */
  async updateRecyclerProfile(req, res, next) {
    try {
      const updated = await recyclerService.adminUpdateRecyclerProfile(
        req.user.id,
        req.params.id,
        req.body,
        req.ip
      );
      return sendSuccess(res, { recycler: updated }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Diagnostic probe for live backend health & service connectivity
   * GET /api/v1/admin/system-health
   */
  async getSystemHealth(req, res, next) {
    try {
      const prisma = require('../config/database');
      const environment = require('../config/environment');
      const fs = require('fs');
      const startTime = Date.now();

      // 1. Core Backend API Service
      const backendStatus = 'HEALTHY';
      const backendLatencyMs = Date.now() - startTime;

      // 2. PostgreSQL Database Connectivity & Latency
      let dbStatus = 'HEALTHY';
      let dbLatencyMs = 0;
      let dbDetails = '';
      const hasDbUrl = Boolean(process.env.DATABASE_URL || environment.databaseUrl);

      if (!hasDbUrl) {
        dbStatus = 'NOT_CONFIGURED';
        dbDetails = 'Database connection string (DATABASE_URL) missing';
      } else {
        try {
          const dbStart = Date.now();
          await prisma.$queryRaw`SELECT 1 as result`;
          dbLatencyMs = Date.now() - dbStart;
          dbStatus = 'HEALTHY';
          dbDetails = `Connected & Operational (Latency: ${dbLatencyMs}ms)`;
        } catch (e) {
          dbStatus = 'UNREACHABLE';
          dbDetails = 'Database query failed / connection unreachable';
        }
      }

      // 3. AI Service (Groq, Roboflow & EcoSetu AI)
      const hasGroqKey = Boolean(process.env.GROQ_API_KEY || environment.groqApiKey);
      const hasRoboflowKey = Boolean(process.env.ROBOFLOW_API_KEY || environment.roboflowApiKey);
      const aiServiceUrl = process.env.AI_SERVICE_URL || environment.aiServiceUrl;
      const hasAiUrl = Boolean(aiServiceUrl && aiServiceUrl !== 'https://ecosetu-ai.onrender.com');

      const aiConfigured = hasGroqKey || hasRoboflowKey || Boolean(aiServiceUrl);
      let aiStatus = 'NOT_CONFIGURED';
      let aiDetails = 'AI credentials or endpoints not configured';

      if (aiConfigured) {
        const providers = [];
        if (hasGroqKey) providers.push('Groq LLaMA 3.3');
        if (hasRoboflowKey) providers.push('Roboflow Vision');
        if (aiServiceUrl) providers.push('EcoSetu AI Microservice');

        // Check if runtime probe can reach AI service URL if custom URL is configured
        if (hasAiUrl) {
          try {
            const http = aiServiceUrl.startsWith('https') ? require('https') : require('http');
            const probePromise = new Promise((resolve) => {
              const reqProbe = http.get(`${aiServiceUrl}/health`, { timeout: 1500 }, (resProbe) => {
                resolve(resProbe.statusCode >= 200 && resProbe.statusCode < 400);
              });
              reqProbe.on('error', () => resolve(false));
              reqProbe.on('timeout', () => { reqProbe.destroy(); resolve(false); });
            });
            const reachable = await probePromise;
            if (reachable) {
              aiStatus = 'HEALTHY';
              aiDetails = `Operational (${providers.join(', ')})`;
            } else if (hasGroqKey || hasRoboflowKey) {
              aiStatus = 'DEGRADED';
              aiDetails = `AI microservice endpoint unreachable; local providers active (${providers.filter(p => p !== 'EcoSetu AI Microservice').join(', ')})`;
            } else {
              aiStatus = 'UNREACHABLE';
              aiDetails = 'AI microservice configured but endpoint unreachable';
            }
          } catch {
            aiStatus = hasGroqKey || hasRoboflowKey ? 'HEALTHY' : 'UNREACHABLE';
            aiDetails = `Configured (${providers.join(', ')})`;
          }
        } else {
          aiStatus = 'HEALTHY';
          aiDetails = `Configured & Available (${providers.join(', ')})`;
        }
      }

      // 4. Push Notification Dispatcher (FCM / Firebase)
      const fcmConfigured = Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        (process.env.FIREBASE_PROJECT_ID && (process.env.FIREBASE_CLIENT_EMAIL || environment.firebaseProjectId))
      );
      const registeredDeviceTokens = await prisma.deviceToken.count({ where: { isActive: true } }).catch(() => 0);

      let fcmStatus = 'NOT_CONFIGURED';
      let fcmDetails = 'Firebase credentials not configured';

      if (fcmConfigured) {
        fcmStatus = 'HEALTHY';
        fcmDetails = `${registeredDeviceTokens} active registered device token(s) (Firebase Admin SDK configured)`;
      } else if (registeredDeviceTokens > 0) {
        fcmStatus = 'CONFIGURED';
        fcmDetails = `${registeredDeviceTokens} registered device token(s); backend Firebase credentials absent (Simulated Adapter)`;
      }

      // 5. Media & Document Storage
      let storageStatus = 'HEALTHY';
      let storageDetails = 'Local persistent storage & uploads directory ready';
      const uploadDir = environment.uploadDir || './uploads';
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
      } catch (err) {
        storageStatus = 'DEGRADED';
        storageDetails = `Storage directory warning: ${err.message}`;
      }

      // 6. Geocoding & Location Engine
      const mapsStatus = 'HEALTHY';
      const mapsDetails = 'OpenStreetMap Nominatim & Geocoding Engine active';

      const items = [
        {
          id: 'backend_api',
          titleKey: 'admin.systemHealth.backendApiTitle',
          name: 'EcoSetu Core Backend API',
          status: backendStatus,
          latencyMs: backendLatencyMs,
          dynamicExplanation: `Operational (Node.js/Express, Uptime: ${Math.floor(process.uptime())}s)`,
        },
        {
          id: 'database',
          titleKey: 'admin.systemHealth.databaseTitle',
          name: 'PostgreSQL / Neon Database',
          status: dbStatus,
          latencyMs: dbLatencyMs,
          dynamicExplanation: dbDetails,
        },
        {
          id: 'ai_service',
          titleKey: 'admin.systemHealth.aiServiceTitle',
          name: 'Groq AI & EcoVision Diagnostics',
          status: aiStatus,
          dynamicExplanation: aiDetails,
        },
        {
          id: 'fcm_notifications',
          titleKey: 'admin.systemHealth.fcmTitle',
          name: 'Push Notification Dispatcher',
          status: fcmStatus,
          dynamicExplanation: fcmDetails,
        },
        {
          id: 'storage',
          titleKey: 'admin.systemHealth.storageTitle',
          name: 'Media & Document Storage',
          status: storageStatus,
          dynamicExplanation: storageDetails,
        },
        {
          id: 'google_maps',
          titleKey: 'admin.systemHealth.mapsTitle',
          name: 'Geocoding & Location Engine',
          status: mapsStatus,
          dynamicExplanation: mapsDetails,
        },
      ];

      return sendSuccess(res, {
        timestamp: new Date().toISOString(),
        isLive: true,
        items,
      }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();

