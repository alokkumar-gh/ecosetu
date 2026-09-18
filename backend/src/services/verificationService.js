// EcoSetu Verification Service
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/07_BUSINESS_WORKFLOWS.md Sections 2.1, 3.1, 4.1, docs/21_TRACEABILITY_AND_AUDIT.md, docs/23_NOTIFICATION_SYSTEM.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  VERIFICATION_STATUS,
  USER_STATUS,
  NOTIFICATION_TYPES,
} = require('../utils/constants');

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  createdAt: true,
  collectorProfile: {
    select: {
      id: true,
      serviceRadiusKm: true,
      idDocumentUrl: true,
      bio: true,
      isAvailable: true,
    },
  },
  recyclerProfile: {
    select: {
      id: true,
      facilityName: true,
      facilityAddress: true,
      licenseNumber: true,
      licenseDocumentUrl: true,
      acceptedCategories: true,
    },
  },
};

const SAFE_REVIEWER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
};

class VerificationService {
  /**
   * List verifications with filtering and pagination (Admin only)
   * @param {object} params
   * @param {string} [params.status='PENDING']
   * @param {number|string} [params.page=1]
   * @param {number|string} [params.limit=20]
   * @returns {Promise<object>} { verifications, pagination }
   */
  async listVerifications({ status = VERIFICATION_STATUS.PENDING, page = 1, limit = 20 } = {}) {
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [verifications, total] = await Promise.all([
      prisma.verification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { submittedAt: 'desc' },
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
          reviewer: {
            select: SAFE_REVIEWER_SELECT,
          },
        },
      }),
      prisma.verification.count({ where }),
    ]);

    return {
      verifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Approve or reject a verification request (Admin only)
   * Atomically updates user status on approval and dispatches audit/notifications.
   *
   * @param {string} adminUserId - Authenticated admin UUID
   * @param {string} verificationId - Verification UUID
   * @param {string} newStatus - 'APPROVED' or 'REJECTED'
   * @param {string} [reviewNotes] - Optional review notes / rejection reason
   * @param {string} [ipAddress] - Request IP address
   * @returns {Promise<object>} Updated verification record
   */
  async updateVerification(adminUserId, verificationId, newStatus, reviewNotes, ipAddress = null) {
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: {
        user: {
          select: SAFE_USER_SELECT,
        },
      },
    });

    if (!verification) {
      throw AppError.notFound('Verification request not found');
    }

    // Must be in PENDING status to make a decision
    if (verification.status !== VERIFICATION_STATUS.PENDING) {
      throw AppError.conflict(
        `Verification request has already been reviewed with status '${verification.status}'.`
      );
    }

    const now = new Date();

    // Atomic transaction: update verification, and if approved, update user status to ACTIVE
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.verification.update({
        where: { id: verificationId },
        data: {
          status: newStatus,
          reviewedAt: now,
          reviewedBy: adminUserId,
          reviewNotes: reviewNotes ? reviewNotes.trim() : null,
        },
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
          reviewer: {
            select: SAFE_REVIEWER_SELECT,
          },
        },
      });

      if (newStatus === VERIFICATION_STATUS.APPROVED) {
        await tx.user.update({
          where: { id: verification.userId },
          data: { status: USER_STATUS.ACTIVE },
        });
      }

      return updated;
    });

    // Audit Logging (docs/21_TRACEABILITY_AND_AUDIT.md Section 5.2)
    const auditAction =
      newStatus === VERIFICATION_STATUS.APPROVED ? 'USER_VERIFIED' : 'USER_REJECTED';

    await auditService.logAction({
      actorId: adminUserId,
      action: auditAction,
      entityType: 'verifications',
      entityId: verificationId,
      details: {
        userId: verification.userId,
        targetRole: verification.user?.role,
        status: newStatus,
        reviewNotes: reviewNotes || null,
      },
      ipAddress,
    });

    // Notification Dispatch (docs/23_NOTIFICATION_SYSTEM.md Section 2)
    if (newStatus === VERIFICATION_STATUS.APPROVED) {
      await notificationService.createNotification({
        userId: verification.userId,
        type: NOTIFICATION_TYPES.VERIFICATION_APPROVED,
        title: 'Verification Approved',
        message: 'Your account has been verified. You can now use the platform.',
        referenceType: 'verification',
        referenceId: verificationId,
      });
    } else if (newStatus === VERIFICATION_STATUS.REJECTED) {
      const rejectReason = reviewNotes ? reviewNotes.trim() : 'Details could not be verified';
      await notificationService.createNotification({
        userId: verification.userId,
        type: NOTIFICATION_TYPES.VERIFICATION_REJECTED,
        title: 'Verification Rejected',
        message: `Your verification was not approved. Reason: ${rejectReason}. You can resubmit.`,
        referenceType: 'verification',
        referenceId: verificationId,
      });
    }

    return result;
  }
}

module.exports = new VerificationService();
