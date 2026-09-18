// EcoSetu Admin Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const userService = require('../services/userService');
const analyticsService = require('../services/analyticsService');
const auditService = require('../services/auditService');
const verificationService = require('../services/verificationService');
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
   * Get platform analytics
   * GET /api/v1/admin/analytics
   */
  async getAnalytics(req, res, next) {
    try {
      const data = await analyticsService.getPlatformAnalytics();
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
   * Approve or reject user verification request
   * PATCH /api/v1/admin/verifications/:id
   */
  async updateVerification(req, res, next) {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || null;
      const data = await verificationService.updateVerification(
        req.user.id,
        req.params.id,
        req.body.status,
        req.body.reviewNotes,
        clientIp
      );
      return sendSuccess(res, { verification: data }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
