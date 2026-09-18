// EcoSetu Recycling Service
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 10, docs/07_BUSINESS_WORKFLOWS.md Section 3.2, docs/21_TRACEABILITY_AND_AUDIT.md, docs/23_NOTIFICATION_SYSTEM.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  ROLES,
  ITEM_STATUS,
  RECYCLING_STATUS,
  NOTIFICATION_TYPES,
} = require('../utils/constants');

class RecyclingService {
  /**
   * List recycling records with role-based scoping and pagination
   * @param {object} user - Authenticated user context
   * @param {object} query - Query parameters (status, page, limit)
   * @returns {Promise<object>} Paginated recycling records
   */
  async listRecyclingRecords(user, { status, page = 1, limit = 20 }) {
    const where = {};

    if (user.role === ROLES.RECYCLER) {
      const recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!recyclerProfile) {
        throw AppError.forbidden('Recycler profile not found');
      }
      where.recyclerId = recyclerProfile.id;
    } else if (user.role === ROLES.ADMIN) {
      // Admins have platform-wide visibility
    } else {
      throw AppError.forbidden('Access forbidden: Insufficient permissions for recycling records');
    }

    if (status) {
      where.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      prisma.recyclingRecord.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          consignment: {
            include: {
              collector: {
                include: {
                  user: {
                    select: { id: true, name: true },
                  },
                },
              },
              consignmentItems: {
                include: {
                  ewasteItem: {
                    select: {
                      id: true,
                      category: true,
                      estimatedWeightKg: true,
                      actualWeightKg: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
          recycler: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.recyclingRecord.count({ where }),
    ]);

    return {
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Retrieve single recycling record by ID with role authorization
   * @param {object} user - Authenticated user context
   * @param {string} recordId - Recycling record UUID
   * @returns {Promise<object>} Recycling record details
   */
  async getRecyclingRecordById(user, recordId) {
    const record = await prisma.recyclingRecord.findUnique({
      where: { id: recordId },
      include: {
        consignment: {
          include: {
            consignmentItems: {
              include: {
                ewasteItem: true,
              },
            },
          },
        },
        recycler: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!record) {
      throw AppError.notFound('Recycling record not found');
    }

    if (user.role === ROLES.RECYCLER) {
      const recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!recyclerProfile || record.recyclerId !== recyclerProfile.id) {
        throw AppError.forbidden('Access forbidden: You can only view recycling records assigned to your facility');
      }
    } else if (user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions');
    }

    return record;
  }

  /**
   * Recycler begins processing materials
   * PATCH /api/v1/recycling-records/:id/start-processing
   * @param {string} recyclerUserId - Authenticated recycler user UUID
   * @param {string} recordId - Recycling record UUID
   * @param {string} [ipAddress] - Request IP
   * @returns {Promise<object>} Updated recycling record
   */
  async startProcessing(recyclerUserId, recordId, ipAddress = null) {
    const recyclerProfile = await prisma.recyclerProfile.findUnique({
      where: { userId: recyclerUserId },
    });

    if (!recyclerProfile) {
      throw AppError.forbidden('Recycler profile not found');
    }

    const record = await prisma.recyclingRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw AppError.notFound('Recycling record not found');
    }

    // Ownership check: Recycler must own the record
    if (record.recyclerId !== recyclerProfile.id) {
      throw AppError.forbidden('You can only start processing records assigned to your facility');
    }

    // Validation: Status must be RECEIVED
    if (record.status !== RECYCLING_STATUS.RECEIVED) {
      throw AppError.badRequest(
        `Cannot start processing recycling record in status '${record.status}'. Status must be RECEIVED.`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.recyclingRecord.update({
        where: { id: recordId },
        data: {
          status: RECYCLING_STATUS.PROCESSING,
          processingStartedAt: new Date(),
        },
        include: {
          consignment: {
            include: {
              consignmentItems: {
                include: {
                  ewasteItem: true,
                },
              },
            },
          },
          recycler: true,
        },
      });

      // Audit log: RECYCLING_STARTED (docs/21 Section 5.2)
      await auditService.logAction(
        {
          actorId: recyclerUserId,
          action: 'RECYCLING_STARTED',
          entityType: 'recycling_records',
          entityId: record.id,
          ipAddress,
        },
        tx
      );

      return rec;
    });

    return updated;
  }

  /**
   * Recycler marks recycling as completed
   * PATCH /api/v1/recycling-records/:id/complete
   * @param {string} recyclerUserId - Authenticated recycler user UUID
   * @param {string} recordId - Recycling record UUID
   * @param {object} data - Completion payload (processingNotes, outputDescription, outputWeightKg, certificateUrl)
   * @param {object} [file] - Uploaded certificate file if any
   * @param {string} [ipAddress] - Request IP
   * @returns {Promise<object>} Completed recycling record
   */
  async completeRecycling(recyclerUserId, recordId, data = {}, file = null, ipAddress = null) {
    const recyclerProfile = await prisma.recyclerProfile.findUnique({
      where: { userId: recyclerUserId },
    });

    if (!recyclerProfile) {
      throw AppError.forbidden('Recycler profile not found');
    }

    const record = await prisma.recyclingRecord.findUnique({
      where: { id: recordId },
      include: {
        consignment: {
          include: {
            consignmentItems: {
              include: {
                ewasteItem: {
                  select: {
                    id: true,
                    citizenId: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw AppError.notFound('Recycling record not found');
    }

    // Ownership check: Recycler must own the record
    if (record.recyclerId !== recyclerProfile.id) {
      throw AppError.forbidden('You can only complete recycling records assigned to your facility');
    }

    // Validation: Status must be PROCESSING
    if (record.status !== RECYCLING_STATUS.PROCESSING) {
      throw AppError.badRequest(
        `Cannot complete recycling record in status '${record.status}'. Status must be PROCESSING.`
      );
    }

    // Handle certificate file or URL
    let certificateUrl = data.certificateUrl || null;
    if (file && file.filename) {
      certificateUrl = `/uploads/certificates/${file.filename}`;
    }

    const itemIds =
      record.consignment?.consignmentItems?.map((ci) => ci.ewasteItem?.id).filter(Boolean) || [];

    const outputWeight =
      data.outputWeightKg !== undefined && data.outputWeightKg !== null
        ? parseFloat(data.outputWeightKg)
        : null;

    // Atomic transaction: update record, update linked items to RECYCLED, record audit log
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update RecyclingRecord to COMPLETED
      const rec = await tx.recyclingRecord.update({
        where: { id: recordId },
        data: {
          status: RECYCLING_STATUS.COMPLETED,
          completedAt: new Date(),
          processingNotes: data.processingNotes ? data.processingNotes.trim() : null,
          outputDescription: data.outputDescription ? data.outputDescription.trim() : null,
          outputWeightKg: outputWeight,
          completionCertificateUrl: certificateUrl,
        },
        include: {
          consignment: {
            include: {
              consignmentItems: {
                include: {
                  ewasteItem: true,
                },
              },
            },
          },
          recycler: true,
        },
      });

      // 2. BR-RR-02: Recycling completion changes all linked items to RECYCLED
      if (itemIds.length > 0) {
        await tx.ewasteItem.updateMany({
          where: { id: { in: itemIds } },
          data: { status: ITEM_STATUS.RECYCLED },
        });
      }

      // 3. Audit log: RECYCLING_COMPLETED (docs/21 Section 5.2)
      await auditService.logAction(
        {
          actorId: recyclerUserId,
          action: 'RECYCLING_COMPLETED',
          entityType: 'recycling_records',
          entityId: record.id,
          details: {
            outputDescription: data.outputDescription || null,
            outputWeightKg: outputWeight,
            itemCount: itemIds.length,
          },
          ipAddress,
        },
        tx
      );

      return rec;
    });

    // 4. Notify original citizen owner(s) (docs/23 Section 2: RECYCLING_COMPLETED)
    const citizenIds = [
      ...new Set(
        record.consignment?.consignmentItems
          ?.map((ci) => ci.ewasteItem?.citizenId)
          .filter(Boolean)
      ),
    ];

    for (const citizenId of citizenIds) {
      await notificationService.createNotification({
        userId: citizenId,
        type: NOTIFICATION_TYPES.RECYCLING_COMPLETED,
        title: 'Recycling Complete',
        message: `Your e-waste has been formally recycled by ${recyclerProfile.facilityName}.`,
        referenceType: 'recycling_record',
        referenceId: record.id,
      });
    }

    return updated;
  }
}

module.exports = new RecyclingService();
