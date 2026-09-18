// EcoSetu User Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.2, docs/05_API_SPECIFICATION.md Section 3 & 14

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');
const { USER_STATUS, NOTIFICATION_TYPES } = require('../utils/constants');

class UserService {
  /**
   * Safe fields selector for User records
   * Never exposes passwordHash or internal security data
   */
  static SAFE_USER_FIELDS = {
    id: true,
    email: true,
    name: true,
    phone: true,
    role: true,
    status: true,
    avatarUrl: true,
    createdAt: true,
  };

  /**
   * Get user profile by ID
   * @param {string} userId - User UUID
   * @returns {Promise<object>} User profile object
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: UserService.SAFE_USER_FIELDS,
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  }

  /**
   * Update current user profile
   * Only allows updating safe editable fields (name, phone)
   * @param {string} userId - User UUID
   * @param {object} updateData - Fields to update
   * @returns {Promise<object>} Updated user profile
   */
  async updateProfile(userId, { name, phone }) {
    const dataToUpdate = {};

    if (name !== undefined) {
      dataToUpdate.name = name.trim();
    }

    if (phone !== undefined) {
      dataToUpdate.phone = phone ? phone.trim() : null;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw AppError.validation('At least one editable field (name, phone) must be provided');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: UserService.SAFE_USER_FIELDS,
    });

    return updatedUser;
  }

  /**
   * List users with filtering, search, and pagination (Admin only)
   * @param {object} query - Query parameters
   * @returns {Promise<object>} Users list and pagination metadata
   */
  async listUsers({ role, status, search, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: UserService.SAFE_USER_FIELDS,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Update user account status (Admin only)
   * @param {string} adminUserId - Authenticated admin ID
   * @param {string} targetUserId - Target user UUID
   * @param {string} status - New UserStatus
   * @param {string} [reason] - Optional reason for status change
   * @returns {Promise<object>} Updated user
   */
  async updateUserStatus(adminUserId, targetUserId, status, reason) {
    if (adminUserId === targetUserId) {
      throw AppError.badRequest('Administrators cannot change their own account status');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw AppError.notFound('User not found');
    }

    const previousStatus = targetUser.status;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { status },
      select: UserService.SAFE_USER_FIELDS,
    });

    // Notify user if account was suspended or reactivated (docs/23_NOTIFICATION_SYSTEM.md Section 2)
    if (status === USER_STATUS.SUSPENDED && previousStatus !== USER_STATUS.SUSPENDED) {
      await notificationService.createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.ACCOUNT_SUSPENDED,
        title: 'Account Suspended',
        message: reason ? `Your account has been suspended. Reason: ${reason}` : 'Your account has been suspended.',
        referenceType: 'user',
        referenceId: targetUserId,
      });
    } else if (status === USER_STATUS.ACTIVE && previousStatus === USER_STATUS.SUSPENDED) {
      await notificationService.createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.ACCOUNT_REACTIVATED,
        title: 'Account Reactivated',
        message: 'Your account has been reactivated.',
        referenceType: 'user',
        referenceId: targetUserId,
      });
    }

    return updatedUser;
  }
}

module.exports = new UserService();
