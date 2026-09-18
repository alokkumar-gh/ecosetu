// EcoSetu User Controller
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 3, docs/10_BACKEND_ARCHITECTURE.md

const userService = require('../services/userService');
const { sendSuccess } = require('../utils/responseHelper');

class UserController {
  /**
   * Get current authenticated user profile
   * GET /api/v1/users/me
   */
  async getMe(req, res, next) {
    try {
      const user = await userService.getProfile(req.user.id);
      return sendSuccess(res, { user }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update current authenticated user profile
   * PATCH /api/v1/users/me
   */
  async updateMe(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, { user }, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
