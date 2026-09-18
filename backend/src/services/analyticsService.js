// EcoSetu Analytics Service
// Canonical Reference: docs/22_ANALYTICS_AND_REPORTING.md, docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const {
  ROLES,
  EWASTE_CATEGORIES,
  REQUEST_STATUS,
  PICKUP_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
} = require('../utils/constants');

class AnalyticsService {
  /**
   * Get comprehensive platform analytics for admin
   * @returns {Promise<object>} Platform analytics data
   */
  async getPlatformAnalytics() {
    const [
      totalUsers,
      citizenUsers,
      collectorUsers,
      recyclerUsers,
      totalItems,
      totalRequests,
      requestsSubmitted,
      requestsAccepted,
      totalPickups,
      completedPickups,
      pickupWeightAgg,
      totalConsignments,
      acceptedConsignments,
      rejectedConsignments,
      totalRecycling,
      completedRecycling,
      recyclingWeightAgg,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: ROLES.CITIZEN } }),
      prisma.user.count({ where: { role: ROLES.INFORMAL_COLLECTOR } }),
      prisma.user.count({ where: { role: ROLES.RECYCLER } }),
      prisma.ewasteItem.count(),
      prisma.collectionRequest.count(),
      prisma.collectionRequest.count({ where: { status: { not: REQUEST_STATUS.DRAFT } } }),
      prisma.collectionRequest.count({ where: { acceptedAt: { not: null } } }),
      prisma.pickup.count(),
      prisma.pickup.count({ where: { status: PICKUP_STATUS.COMPLETED } }),
      prisma.pickup.aggregate({
        where: { status: PICKUP_STATUS.COMPLETED },
        _sum: { totalWeightKg: true },
      }),
      prisma.consignment.count(),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.ACCEPTED } }),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.REJECTED } }),
      prisma.recyclingRecord.count(),
      prisma.recyclingRecord.count({ where: { status: RECYCLING_STATUS.COMPLETED } }),
      prisma.recyclingRecord.aggregate({
        where: { status: RECYCLING_STATUS.COMPLETED },
        _sum: { outputWeightKg: true },
      }),
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      }),
    ]);

    // Items by category
    const itemsByCategory = {};
    try {
      if (typeof prisma.ewasteItem.groupBy === 'function') {
        const itemCategoryCounts = await prisma.ewasteItem.groupBy({
          by: ['category'],
          _count: { _all: true },
        });
        for (const group of itemCategoryCounts) {
          itemsByCategory[group.category] = group._count._all ?? group._count ?? 0;
        }
      } else {
        throw new Error('groupBy not supported');
      }
    } catch {
      for (const cat of Object.values(EWASTE_CATEGORIES)) {
        const c = await prisma.ewasteItem.count({ where: { category: cat } });
        if (c > 0) itemsByCategory[cat] = c;
      }
    }

    // Requests by status
    const requestsByStatus = {};
    try {
      if (typeof prisma.collectionRequest.groupBy === 'function') {
        const requestStatusCounts = await prisma.collectionRequest.groupBy({
          by: ['status'],
          _count: { _all: true },
        });
        for (const group of requestStatusCounts) {
          requestsByStatus[group.status] = group._count._all ?? group._count ?? 0;
        }
      } else {
        throw new Error('groupBy not supported');
      }
    } catch {
      for (const st of Object.values(REQUEST_STATUS)) {
        const c = await prisma.collectionRequest.count({ where: { status: st } });
        if (c > 0) requestsByStatus[st] = c;
      }
    }

    const totalWeightKg = pickupWeightAgg?._sum?.totalWeightKg
      ? parseFloat(Number(pickupWeightAgg._sum.totalWeightKg).toFixed(2))
      : 0;

    const totalOutputWeightKg = recyclingWeightAgg?._sum?.outputWeightKg
      ? parseFloat(Number(recyclingWeightAgg._sum.outputWeightKg).toFixed(2))
      : 0;

    const recentActivity = (recentLogs || []).map((log) => ({
      action: log.action,
      entityType: log.entityType,
      actorName: log.actor?.name || 'System',
      createdAt: log.createdAt,
    }));

    return {
      users: {
        total: totalUsers,
        byRole: {
          CITIZEN: citizenUsers,
          INFORMAL_COLLECTOR: collectorUsers,
          RECYCLER: recyclerUsers,
        },
      },
      ewasteItems: {
        total: totalItems,
        byCategory: itemsByCategory,
      },
      requests: {
        total: totalRequests,
        byStatus: requestsByStatus,
      },
      pickups: {
        total: totalPickups,
        completed: completedPickups,
        totalWeightKg,
      },
      consignments: {
        total: totalConsignments,
        accepted: acceptedConsignments,
        rejected: rejectedConsignments,
      },
      recycling: {
        total: totalRecycling,
        completed: completedRecycling,
        totalOutputWeightKg,
      },
      conversionFunnel: {
        itemsSubmitted: totalItems,
        requestsSubmitted,
        requestsAccepted,
        pickupsCompleted: completedPickups,
        consignmentsDelivered: acceptedConsignments,
        recyclingCompleted: completedRecycling,
      },
      recentActivity,
      // Compatibility fields per docs/05_API_SPECIFICATION.md Section 14
      totalUsers: {
        citizen: citizenUsers,
        collector: collectorUsers,
        recycler: recyclerUsers,
      },
      totalRequests,
      totalPickups,
      totalConsignments,
      totalRecycled: completedRecycling,
      totalWeightKg,
    };
  }
}

module.exports = new AnalyticsService();
