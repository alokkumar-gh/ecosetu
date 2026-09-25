// EcoSetu Verification Service
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 14, docs/07_BUSINESS_WORKFLOWS.md Sections 2.1, 3.1, 4.1, docs/21_TRACEABILITY_AND_AUDIT.md, docs/23_NOTIFICATION_SYSTEM.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  VERIFICATION_STATUS,
  USER_STATUS,
  ROLES,
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
      serviceArea: true,
      city: true,
      state: true,
      pincode: true,
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
      city: true,
      state: true,
      pincode: true,
      licenseNumber: true,
      licenseDocumentUrl: true,
      authorizationStatus: true,
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
   * List verifications with filtering by status and role, plus dashboard metrics (Admin only)
   * @param {object} params
   * @param {string} [params.status='PENDING']
   * @param {string} [params.role='ALL']
   * @param {number|string} [params.page=1]
   * @param {number|string} [params.limit=20]
   * @returns {Promise<object>} { verifications, pagination, metrics }
   */
  async listVerifications({ status = 'PENDING', role = 'ALL', page = 1, limit = 20 } = {}) {
    const where = {};

    // 1. Status Filter Mapping
    if (status && status !== 'ALL') {
      if (status === 'PENDING' || status === 'PENDING_ALL') {
        where.status = {
          in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.SUBMITTED, VERIFICATION_STATUS.UNDER_REVIEW],
        };
      } else {
        where.status = status;
      }
    }

    // 2. Role Filter Mapping
    if (role && role !== 'ALL') {
      where.OR = [
        { role },
        { user: { role } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // 3. Query verifications list, total count, and dashboard metrics in parallel
    const [verifications, total, pendingCount, underReviewCount, approvedCount, rejectedCount, changesRequiredCount] =
      await Promise.all([
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
        prisma.verification.count({
          where: {
            status: { in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.SUBMITTED] },
          },
        }),
        prisma.verification.count({
          where: { status: VERIFICATION_STATUS.UNDER_REVIEW },
        }),
        prisma.verification.count({
          where: { status: VERIFICATION_STATUS.APPROVED },
        }),
        prisma.verification.count({
          where: { status: VERIFICATION_STATUS.REJECTED },
        }),
        prisma.verification.count({
          where: { status: VERIFICATION_STATUS.CHANGES_REQUIRED },
        }),
      ]);

    return {
      verifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      metrics: {
        pending: pendingCount,
        underReview: underReviewCount,
        approved: approvedCount,
        rejected: rejectedCount,
        changesRequired: changesRequiredCount,
        total: pendingCount + underReviewCount + approvedCount + rejectedCount + changesRequiredCount,
      },
    };
  }

  /**
   * Get single verification details by ID (Admin only)
   * @param {string} verificationId
   * @returns {Promise<object>} Verification with full profile and audit trail
   */
  async getVerificationById(verificationId) {
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: {
        user: {
          select: SAFE_USER_SELECT,
        },
        reviewer: {
          select: SAFE_REVIEWER_SELECT,
        },
      },
    });

    if (!verification) {
      throw AppError.notFound('Verification request not found');
    }

    // Fetch related audit logs for this verification
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'verifications',
        entityId: verificationId,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        actor: {
          select: SAFE_REVIEWER_SELECT,
        },
      },
    });

    return {
      ...verification,
      auditHistory: auditLogs,
    };
  }

  /**
   * Update verification status (APPROVE, REJECT, REQUEST_CHANGES, UNDER_REVIEW)
   * @param {string} adminUserId - Authenticated admin UUID
   * @param {string} verificationId - Verification UUID
   * @param {string} newStatus - 'APPROVED' | 'REJECTED' | 'CHANGES_REQUIRED' | 'UNDER_REVIEW'
   * @param {object} payload - Decision metadata { reviewNotes, rejectionReason, changeRequestReason, changeRequestOptions }
   * @param {string} [ipAddress] - Request IP address
   */
  async updateVerification(adminUserId, verificationId, newStatus, payload = {}, ipAddress = null) {
    const { reviewNotes, rejectionReason, changeRequestReason, changeRequestOptions } = payload;

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

    const now = new Date();
    const effectiveRole = verification.role || verification.user?.role;

    // Atomic transaction for state transition
    const result = await prisma.$transaction(async (tx) => {
      const updateData = {
        status: newStatus,
        reviewedAt: now,
        reviewedBy: adminUserId,
        reviewNotes: reviewNotes ? reviewNotes.trim() : null,
      };

      if (newStatus === VERIFICATION_STATUS.REJECTED) {
        updateData.rejectionReason = rejectionReason ? rejectionReason.trim() : (reviewNotes ? reviewNotes.trim() : 'Document could not be verified');
      } else if (newStatus === VERIFICATION_STATUS.CHANGES_REQUIRED) {
        updateData.changeRequestReason = changeRequestReason ? changeRequestReason.trim() : (reviewNotes ? reviewNotes.trim() : 'Additional documentation required');
        if (Array.isArray(changeRequestOptions)) {
          updateData.changeRequestOptions = changeRequestOptions;
        }
      }

      const updated = await tx.verification.update({
        where: { id: verificationId },
        data: updateData,
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
          reviewer: {
            select: SAFE_REVIEWER_SELECT,
          },
        },
      });

      // Role & User status side-effects
      if (newStatus === VERIFICATION_STATUS.APPROVED) {
        // Activate User Account
        await tx.user.update({
          where: { id: verification.userId },
          data: { status: USER_STATUS.ACTIVE },
        });

        // If Recycler, update RecyclerProfile authorization
        if (effectiveRole === ROLES.RECYCLER) {
          await tx.recyclerProfile.updateMany({
            where: { userId: verification.userId },
            data: {
              authorizationStatus: 'AUTHORIZED',
              verifiedAt: now,
              verifiedBy: adminUserId,
              verificationNotes: reviewNotes || 'Approved by EcoSetu administration',
            },
          });
        }
      } else if (newStatus === VERIFICATION_STATUS.REJECTED) {
        // Keep status PENDING_VERIFICATION so applicant can resubmit without locking out completely
        if (effectiveRole === ROLES.RECYCLER) {
          await tx.recyclerProfile.updateMany({
            where: { userId: verification.userId },
            data: { authorizationStatus: 'REJECTED' },
          });
        }
      }

      return updated;
    });

    // Determine audit action
    let auditAction = 'USER_VERIFICATION_UPDATED';
    if (newStatus === VERIFICATION_STATUS.APPROVED) auditAction = 'USER_VERIFIED';
    else if (newStatus === VERIFICATION_STATUS.REJECTED) auditAction = 'USER_REJECTED';
    else if (newStatus === VERIFICATION_STATUS.CHANGES_REQUIRED) auditAction = 'USER_VERIFICATION_CHANGES_REQUESTED';
    else if (newStatus === VERIFICATION_STATUS.UNDER_REVIEW) auditAction = 'USER_VERIFICATION_UNDER_REVIEW';

    await auditService.logAction({
      actorId: adminUserId,
      action: auditAction,
      entityType: 'verifications',
      entityId: verificationId,
      details: {
        userId: verification.userId,
        targetRole: effectiveRole,
        newStatus,
        reviewNotes: reviewNotes || null,
        rejectionReason: rejectionReason || null,
        changeRequestReason: changeRequestReason || null,
        changeRequestOptions: changeRequestOptions || [],
      },
      ipAddress,
    });

    // Dispatch appropriate user notification
    try {
      if (newStatus === VERIFICATION_STATUS.APPROVED) {
        await notificationService.createNotification({
          userId: verification.userId,
          type: NOTIFICATION_TYPES.VERIFICATION_APPROVED,
          title: 'ECOSETU Verification Approved',
          message: 'Your identity documents have been approved by the administration. You now have full operational access.',
          referenceType: 'verification',
          referenceId: verificationId,
        });
      } else if (newStatus === VERIFICATION_STATUS.CHANGES_REQUIRED) {
        const feedback = changeRequestReason || reviewNotes || 'Please submit updated identity documentation.';
        await notificationService.createNotification({
          userId: verification.userId,
          type: NOTIFICATION_TYPES.VERIFICATION_CHANGES_REQUESTED,
          title: 'Action Required: Verification Update',
          message: `Your verification submission needs an update: ${feedback}`,
          referenceType: 'verification',
          referenceId: verificationId,
        });
      } else if (newStatus === VERIFICATION_STATUS.REJECTED) {
        const reason = rejectionReason || reviewNotes || 'Details could not be verified.';
        await notificationService.createNotification({
          userId: verification.userId,
          type: NOTIFICATION_TYPES.VERIFICATION_REJECTED,
          title: 'Verification Not Approved',
          message: `Your verification request was not approved: ${reason}. You can submit a corrected document.`,
          referenceType: 'verification',
          referenceId: verificationId,
        });
      }
    } catch (notifErr) {
      console.warn('[VerificationService] Notification dispatch non-fatal failure:', notifErr.message);
    }

    return result;
  }

  /**
   * User endpoint: Submit identity document for verification (Collector / Recycler)
   * @param {string} userId - Authenticated user UUID
   * @param {object} submissionData
   */
  async submitVerification(userId, submissionData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        collectorProfile: true,
        recyclerProfile: true,
        verifications: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User account not found');
    }

    if (user.role === ROLES.CITIZEN) {
      throw AppError.badRequest('Citizens do not require identity verification');
    }

    const {
      documentType = user.role === ROLES.RECYCLER ? 'RECYCLER_LICENSE' : 'AADHAAR',
      documentNumberMasked,
      documentUrl,
      storageKey,
      mimeType,
      fileSize,
      reviewNotes,
    } = submissionData;

    if (!documentUrl && !storageKey) {
      throw AppError.badRequest('Identity document file or URL is required');
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Create new verification record
      const verification = await tx.verification.create({
        data: {
          userId,
          role: user.role,
          status: VERIFICATION_STATUS.SUBMITTED,
          documentType,
          documentNumberMasked: documentNumberMasked || null,
          documentUrl: documentUrl || null,
          storageKey: storageKey || null,
          mimeType: mimeType || null,
          fileSize: fileSize || null,
          submittedAt: now,
          reviewNotes: reviewNotes || null,
        },
      });

      // Update role profile document reference
      if (user.role === ROLES.INFORMAL_COLLECTOR) {
        await tx.collectorProfile.updateMany({
          where: { userId },
          data: { idDocumentUrl: documentUrl || storageKey },
        });
      } else if (user.role === ROLES.RECYCLER) {
        await tx.recyclerProfile.updateMany({
          where: { userId },
          data: {
            licenseDocumentUrl: documentUrl || storageKey,
            authorizationStatus: 'PENDING',
          },
        });
      }

      return verification;
    });

    await auditService.logAction({
      actorId: userId,
      action: 'VERIFICATION_SUBMITTED',
      entityType: 'verifications',
      entityId: result.id,
      details: {
        role: user.role,
        documentType,
        documentNumberMasked: documentNumberMasked || null,
      },
    });

    return result;
  }

  /**
   * User endpoint: Get current verification status for logged-in user
   * @param {string} userId
   */
  async getUserVerificationStatus(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        collectorProfile: {
          select: {
            id: true,
            serviceArea: true,
            idDocumentUrl: true,
            isAvailable: true,
          },
        },
        recyclerProfile: {
          select: {
            id: true,
            facilityName: true,
            licenseNumber: true,
            licenseDocumentUrl: true,
            authorizationStatus: true,
          },
        },
        verifications: {
          orderBy: { submittedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const latest = user.verifications?.[0] || null;

    return {
      userId: user.id,
      role: user.role,
      accountStatus: user.status,
      isVerified: user.status === USER_STATUS.ACTIVE,
      latestVerification: latest
        ? {
            id: latest.id,
            status: latest.status,
            documentType: latest.documentType,
            documentNumberMasked: latest.documentNumberMasked,
            submittedAt: latest.submittedAt,
            reviewedAt: latest.reviewedAt,
            reviewNotes: latest.reviewNotes,
            rejectionReason: latest.rejectionReason,
            changeRequestReason: latest.changeRequestReason,
            changeRequestOptions: latest.changeRequestOptions,
          }
        : null,
      history: (user.verifications || []).map((v) => ({
        id: v.id,
        status: v.status,
        documentType: v.documentType,
        submittedAt: v.submittedAt,
        reviewedAt: v.reviewedAt,
        rejectionReason: v.rejectionReason,
        changeRequestReason: v.changeRequestReason,
      })),
    };
  }

  /**
   * User endpoint: Resubmit corrected verification documents
   * @param {string} userId
   * @param {object} resubmissionData
   */
  async resubmitVerification(userId, resubmissionData) {
    return this.submitVerification(userId, resubmissionData);
  }
}

module.exports = new VerificationService();
