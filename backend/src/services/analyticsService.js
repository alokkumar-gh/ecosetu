// EcoSetu Analytics Service
// Canonical Reference: docs/22_ANALYTICS_AND_REPORTING.md, docs/05_API_SPECIFICATION.md Section 14, docs/10_BACKEND_ARCHITECTURE.md

const prisma = require('../config/database');
const {
  ROLES,
  USER_STATUS,
  EWASTE_CATEGORIES,
  ITEM_CONDITIONS,
  ITEM_STATUS,
  REQUEST_STATUS,
  PICKUP_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  VERIFICATION_STATUS,
} = require('../utils/constants');

class AnalyticsService {
  /**
   * Resolve time-range start date based on period query parameter
   * @param {string} period - '7d', '30d', '90d', '1y', 'custom', 'all'
   * @param {string} [startDate]
   * @param {string} [endDate]
   * @returns {{ periodStart: Date|null, periodEnd: Date|null, periodLabel: string }}
   */
  _resolveTimeRange(period = '7d', startDate = null, endDate = null) {
    const now = new Date();
    const cleanPeriod = String(period || '7d').toLowerCase();

    if (cleanPeriod === 'custom' && startDate) {
      const s = new Date(startDate);
      const e = endDate ? new Date(endDate) : now;
      return {
        periodStart: isNaN(s.getTime()) ? null : s,
        periodEnd: isNaN(e.getTime()) ? null : e,
        periodLabel: 'CUSTOM',
      };
    }

    if (cleanPeriod === 'all') {
      return { periodStart: null, periodEnd: null, periodLabel: 'ALL' };
    }

    if (cleanPeriod === '30d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      return { periodStart: s, periodEnd: now, periodLabel: '30D' };
    }

    if (cleanPeriod === '90d') {
      const s = new Date(now);
      s.setDate(s.getDate() - 90);
      return { periodStart: s, periodEnd: now, periodLabel: '90D' };
    }

    if (cleanPeriod === '1y') {
      const s = new Date(now);
      s.setFullYear(s.getFullYear() - 1);
      return { periodStart: s, periodEnd: now, periodLabel: '1Y' };
    }

    // Default 7d
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    return { periodStart: s, periodEnd: now, periodLabel: '7D' };
  }

  /**
   * Get comprehensive platform analytics for admin command center
   * @param {object} [query] - { period, startDate, endDate }
   * @returns {Promise<object>} Platform analytics data
   */
  async getPlatformAnalytics(query = {}) {
    const period = query.period || 'all';
    const { startDate, endDate } = query;
    const { periodStart, periodEnd, periodLabel } = this._resolveTimeRange(period, startDate, endDate);

    const periodFilter = periodStart
      ? {
          createdAt: {
            gte: periodStart,
            ...(periodEnd ? { lte: periodEnd } : {}),
          },
        }
      : {};

    const [
      // 1. Executive Users
      totalUsers,
      citizenUsers,
      collectorUsers,
      recyclerUsers,
      adminUsers,
      pendingVerifications,
      activeUsers,
      suspendedUsers,
      deactivatedUsers,
      newUsersInPeriod,

      // 2. Executive Items
      totalItems,
      itemsSubmittedInPeriod,
      itemQuantityAgg,

      // 3. Executive Requests
      totalRequests,
      activeRequests,
      requestsSubmittedInPeriod,
      requestsAcceptedInPeriod,
      requestsCancelledInPeriod,

      // 4. Executive Pickups & Weight
      totalPickups,
      scheduledPickups,
      inProgressPickups,
      completedPickups,
      failedPickups,
      pickupsCompletedInPeriod,
      pickupWeightAgg,

      // 5. Executive Consignments
      totalConsignments,
      inTransitConsignments,
      deliveredConsignments,
      acceptedConsignments,
      rejectedConsignments,
      consignmentsInPeriod,

      // 6. Executive Recycling & Output Weight
      totalRecycling,
      receivedRecycling,
      processingRecycling,
      completedRecycling,
      recyclingCompletedInPeriod,
      recyclingWeightAgg,

      // 7. Collector & Facility Profiles
      availableCollectors,
      totalCollectorProfiles,
      totalRecyclerProfiles,

      // 8. Recent Audit Activity
      recentLogs,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({ where: { role: ROLES.CITIZEN } }),
      prisma.user.count({ where: { role: ROLES.INFORMAL_COLLECTOR } }),
      prisma.user.count({ where: { role: ROLES.RECYCLER } }),
      prisma.user.count({ where: { role: ROLES.ADMIN } }),
      prisma.verification.count({ where: { status: VERIFICATION_STATUS.PENDING } }),
      prisma.user.count({ where: { status: USER_STATUS.ACTIVE } }),
      prisma.user.count({ where: { status: USER_STATUS.SUSPENDED } }),
      prisma.user.count({ where: { status: USER_STATUS.DEACTIVATED } }),
      periodStart ? prisma.user.count({ where: periodFilter }) : prisma.user.count(),

      // Items
      prisma.ewasteItem.count(),
      periodStart ? prisma.ewasteItem.count({ where: periodFilter }) : prisma.ewasteItem.count(),
      prisma.ewasteItem.aggregate({ _sum: { quantity: true } }),

      // Requests
      prisma.collectionRequest.count(),
      prisma.collectionRequest.count({
        where: {
          status: { in: [REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED] },
        },
      }),
      prisma.collectionRequest.count({
        where: {
          status: { not: REQUEST_STATUS.DRAFT },
          ...(periodStart ? periodFilter : {}),
        },
      }),
      prisma.collectionRequest.count({
        where: {
          acceptedAt: { not: null },
          ...(periodStart ? { acceptedAt: { gte: periodStart, ...(periodEnd ? { lte: periodEnd } : {}) } } : {}),
        },
      }),
      prisma.collectionRequest.count({
        where: {
          status: REQUEST_STATUS.CANCELLED,
          ...(periodStart ? periodFilter : {}),
        },
      }),

      // Pickups
      prisma.pickup.count(),
      prisma.pickup.count({ where: { status: PICKUP_STATUS.SCHEDULED } }),
      prisma.pickup.count({ where: { status: PICKUP_STATUS.IN_PROGRESS } }),
      prisma.pickup.count({ where: { status: PICKUP_STATUS.COMPLETED } }),
      prisma.pickup.count({ where: { status: PICKUP_STATUS.FAILED } }),
      prisma.pickup.count({
        where: {
          status: PICKUP_STATUS.COMPLETED,
          ...(periodStart ? { completedAt: { gte: periodStart, ...(periodEnd ? { lte: periodEnd } : {}) } } : {}),
        },
      }),
      prisma.pickup.aggregate({
        where: { status: PICKUP_STATUS.COMPLETED },
        _sum: { totalWeightKg: true },
      }),

      // Consignments
      prisma.consignment.count(),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.IN_TRANSIT } }),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.DELIVERED } }),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.ACCEPTED } }),
      prisma.consignment.count({ where: { status: CONSIGNMENT_STATUS.REJECTED } }),
      periodStart ? prisma.consignment.count({ where: periodFilter }) : prisma.consignment.count(),

      // Recycling
      prisma.recyclingRecord.count(),
      prisma.recyclingRecord.count({ where: { status: RECYCLING_STATUS.RECEIVED } }),
      prisma.recyclingRecord.count({ where: { status: RECYCLING_STATUS.PROCESSING } }),
      prisma.recyclingRecord.count({ where: { status: RECYCLING_STATUS.COMPLETED } }),
      prisma.recyclingRecord.count({
        where: {
          status: RECYCLING_STATUS.COMPLETED,
          ...(periodStart ? { completedAt: { gte: periodStart, ...(periodEnd ? { lte: periodEnd } : {}) } } : {}),
        },
      }),
      prisma.recyclingRecord.aggregate({
        where: { status: RECYCLING_STATUS.COMPLETED },
        _sum: { outputWeightKg: true },
      }),

      // Profiles
      prisma.collectorProfile.count({ where: { isAvailable: true } }),
      prisma.collectorProfile.count(),
      prisma.recyclerProfile.count(),

      // Recent Audit Logs
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

    // 9. Items by Category & Conditions Breakdown
    const itemsByCategory = {};
    const itemsByCondition = {
      [ITEM_CONDITIONS.WORKING]: 0,
      [ITEM_CONDITIONS.NOT_WORKING]: 0,
      [ITEM_CONDITIONS.DAMAGED]: 0,
      [ITEM_CONDITIONS.UNKNOWN]: 0,
    };
    const itemsByStatus = {
      [ITEM_STATUS.SUBMITTED]: 0,
      [ITEM_STATUS.COLLECTED]: 0,
      [ITEM_STATUS.CONSIGNED]: 0,
      [ITEM_STATUS.RECYCLED]: 0,
    };

    try {
      if (typeof prisma.ewasteItem.groupBy === 'function') {
        const [catGroups, condGroups, statusGroups] = await Promise.all([
          prisma.ewasteItem.groupBy({
            by: ['category'],
            _count: { _all: true },
          }),
          prisma.ewasteItem.groupBy({
            by: ['condition'],
            _count: { _all: true },
          }),
          prisma.ewasteItem.groupBy({
            by: ['status'],
            _count: { _all: true },
          }),
        ]);

        for (const g of catGroups) {
          itemsByCategory[g.category] = g._count._all ?? g._count ?? 0;
        }
        for (const g of condGroups) {
          itemsByCondition[g.condition] = g._count._all ?? g._count ?? 0;
        }
        for (const g of statusGroups) {
          itemsByStatus[g.status] = g._count._all ?? g._count ?? 0;
        }
      } else {
        throw new Error('groupBy fallback');
      }
    } catch {
      for (const cat of Object.values(EWASTE_CATEGORIES)) {
        const c = await prisma.ewasteItem.count({ where: { category: cat } });
        itemsByCategory[cat] = c;
      }
      for (const cond of Object.values(ITEM_CONDITIONS)) {
        const c = await prisma.ewasteItem.count({ where: { condition: cond } });
        itemsByCondition[cond] = c;
      }
      for (const st of Object.values(ITEM_STATUS)) {
        const c = await prisma.ewasteItem.count({ where: { status: st } });
        itemsByStatus[st] = c;
      }
    }

    // Ensure all 11 canonical categories are represented
    for (const cat of Object.values(EWASTE_CATEGORIES)) {
      if (itemsByCategory[cat] === undefined) {
        itemsByCategory[cat] = 0;
      }
    }

    // Category breakdown with counts and percentages
    const categoryBreakdown = Object.entries(itemsByCategory).map(([cat, count]) => ({
      category: cat,
      count,
      percentage: totalItems > 0 ? parseFloat(((count / totalItems) * 100).toFixed(1)) : 0,
    }));

    // Requests by status mapping
    const requestsByStatus = {};
    try {
      if (typeof prisma.collectionRequest.groupBy === 'function') {
        const reqGroups = await prisma.collectionRequest.groupBy({
          by: ['status'],
          _count: { _all: true },
        });
        for (const g of reqGroups) {
          requestsByStatus[g.status] = g._count._all ?? g._count ?? 0;
        }
      } else {
        throw new Error('groupBy fallback');
      }
    } catch {
      for (const st of Object.values(REQUEST_STATUS)) {
        const c = await prisma.collectionRequest.count({ where: { status: st } });
        if (c > 0) requestsByStatus[st] = c;
      }
    }

    // 10. Operational Bottlenecks (Factual Counts)
    const [
      requestsAwaitingCollector,
      requestsAcceptedPickupPending,
      pickupsInProgressCount,
      consignmentsAwaitingDelivery,
      consignmentsDeliveredAwaitingAcceptance,
      recordsProcessingCount,
    ] = await Promise.all([
      prisma.collectionRequest.count({
        where: { status: REQUEST_STATUS.SUBMITTED, collectorId: null },
      }),
      prisma.collectionRequest.count({
        where: {
          status: REQUEST_STATUS.ACCEPTED,
          pickup: { is: null },
        },
      }),
      prisma.pickup.count({
        where: { status: PICKUP_STATUS.IN_PROGRESS },
      }),
      prisma.consignment.count({
        where: { status: { in: [CONSIGNMENT_STATUS.CREATED, CONSIGNMENT_STATUS.IN_TRANSIT] } },
      }),
      prisma.consignment.count({
        where: { status: CONSIGNMENT_STATUS.DELIVERED },
      }),
      prisma.recyclingRecord.count({
        where: { status: RECYCLING_STATUS.PROCESSING },
      }),
    ]);

    // 11. Top Active Collectors by Completed Pickups (Factual Metrics)
    const topCollectorsData = await prisma.collectorProfile.findMany({
      take: 5,
      orderBy: { totalPickups: 'desc' },
      select: {
        id: true,
        serviceArea: true,
        city: true,
        state: true,
        totalPickups: true,
        isAvailable: true,
        user: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    const topActiveCollectors = topCollectorsData.map((cp) => ({
      id: cp.id,
      name: cp.user?.name || 'Collector',
      city: cp.city || 'Local Area',
      state: cp.state || '',
      completedPickups: cp.totalPickups,
      isAvailable: cp.isAvailable,
      status: cp.user?.status || USER_STATUS.ACTIVE,
    }));

    // 12. Recycler Facility Coverage & Categories
    const recyclerFacilitiesData = await prisma.recyclerProfile.findMany({
      take: 10,
      select: {
        id: true,
        facilityName: true,
        city: true,
        state: true,
        acceptedCategories: true,
        totalConsignments: true,
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const recyclerFacilityCoverage = recyclerFacilitiesData.map((rp) => ({
      id: rp.id,
      facilityName: rp.facilityName,
      city: rp.city || 'Facility Location',
      state: rp.state || '',
      acceptedCategories: rp.acceptedCategories || [],
      totalConsignments: rp.totalConsignments,
      operationalStatus: rp.user?.status || USER_STATUS.ACTIVE,
    }));

    // 13. Distinct Operationally Active Actors
    let operationallyActiveCount = 0;
    try {
      const [activeCitizens, activeCollectors, activeRecyclers] = await Promise.all([
        prisma.collectionRequest.groupBy({ by: ['citizenId'] }),
        prisma.pickup.groupBy({ by: ['collectorId'] }),
        prisma.consignment.groupBy({ by: ['recyclerId'] }),
      ]);
      operationallyActiveCount = activeCitizens.length + activeCollectors.length + activeRecyclers.length;
    } catch {
      operationallyActiveCount = completedPickups + acceptedConsignments;
    }

    // Verified Weights (Authoritative)
    const totalVerifiedWeightKg = pickupWeightAgg?._sum?.totalWeightKg
      ? parseFloat(Number(pickupWeightAgg._sum.totalWeightKg).toFixed(2))
      : 0;

    const totalRecycledWeightKg = recyclingWeightAgg?._sum?.outputWeightKg
      ? parseFloat(Number(recyclingWeightAgg._sum.outputWeightKg).toFixed(2))
      : 0;

    const collectedItemsCount = itemsByStatus[ITEM_STATUS.COLLECTED] + itemsByStatus[ITEM_STATUS.CONSIGNED] + itemsByStatus[ITEM_STATUS.RECYCLED];
    const avgItemWeightKg = collectedItemsCount > 0 && totalVerifiedWeightKg > 0
      ? parseFloat((totalVerifiedWeightKg / collectedItemsCount).toFixed(2))
      : 0;

    // Average Operational Turnaround Hours (Submitted -> Completed)
    let averageTurnaroundHours = null;
    try {
      const completedWithTimes = await prisma.collectionRequest.findMany({
        where: {
          status: REQUEST_STATUS.PICKED_UP,
          submittedAt: { not: null },
          completedAt: { not: null },
        },
        select: {
          submittedAt: true,
          completedAt: true,
        },
        take: 50,
      });

      if (completedWithTimes.length > 0) {
        const totalHours = completedWithTimes.reduce((acc, curr) => {
          const diffMs = curr.completedAt.getTime() - curr.submittedAt.getTime();
          return acc + Math.max(0, diffMs / (1000 * 60 * 60));
        }, 0);
        averageTurnaroundHours = parseFloat((totalHours / completedWithTimes.length).toFixed(1));
      }
    } catch {
      averageTurnaroundHours = null;
    }

    // Recent Activity mapping
    const recentActivity = (recentLogs || []).map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorName: log.actor?.name || 'System',
      actorRole: log.actor?.role || 'SYSTEM',
      createdAt: log.createdAt,
    }));

    return {
      // Platform status
      platformStatus: 'OPERATIONAL',
      lastUpdated: new Date().toISOString(),
      timeRange: {
        selected: periodLabel,
        startDate: periodStart ? periodStart.toISOString() : null,
        endDate: periodEnd ? periodEnd.toISOString() : null,
      },

      // Executive KPIs (Authoritative DB source)
      executiveKpis: {
        totalUsers,
        citizens: citizenUsers,
        informalCollectors: collectorUsers,
        formalRecyclers: recyclerUsers,
        adminUsers,
        pendingVerifications,
        activeUsers,
        suspendedUsers,
        deactivatedUsers,
        totalEwasteItems: totalItems,
        totalCollectionRequests: totalRequests,
        activeRequests,
        completedPickups,
        totalConsignments,
        deliveredConsignments,
        rejectedConsignments,
        itemsUnderRecycling: receivedRecycling + processingRecycling,
        completedRecycling,
      },

      // Period-filtered statistics
      periodMetrics: {
        newUsers: newUsersInPeriod,
        itemsSubmitted: itemsSubmittedInPeriod,
        requestsSubmitted: requestsSubmittedInPeriod,
        requestsAccepted: requestsAcceptedInPeriod,
        requestsCancelled: requestsCancelledInPeriod,
        pickupsCompleted: pickupsCompletedInPeriod,
        consignmentsDelivered: consignmentsInPeriod,
        recyclingCompleted: recyclingCompletedInPeriod,
      },

      // User Analytics
      userAnalytics: {
        total: totalUsers,
        byRole: {
          CITIZEN: citizenUsers,
          INFORMAL_COLLECTOR: collectorUsers,
          RECYCLER: recyclerUsers,
          ADMIN: adminUsers,
        },
        byStatus: {
          ACTIVE: activeUsers,
          PENDING_VERIFICATION: pendingVerifications,
          SUSPENDED: suspendedUsers,
          DEACTIVATED: deactivatedUsers,
        },
        verificationFunnel: {
          registered: totalUsers,
          verified: activeUsers,
          active: activeUsers,
          operationallyActive: operationallyActiveCount,
        },
      },

      // E-Waste Analytics
      ewasteAnalytics: {
        totalItems,
        totalQuantity: itemQuantityAgg?._sum?.quantity ?? totalItems,
        byStatus: itemsByStatus,
        byCondition: itemsByCondition,
        categories: itemsByCategory,
        categoryBreakdown,
        weights: {
          totalVerifiedWeightKg,
          averageItemWeightKg: avgItemWeightKg,
          totalRecycledWeightKg,
          environmentalImpact: 'Not currently calculated',
        },
      },

      // Collection Operations Analytics
      collectionOperations: {
        requestsSubmitted: requestsSubmittedInPeriod,
        requestsAccepted: requestsAcceptedInPeriod,
        requestsCancelled: requestsCancelledInPeriod,
        pickupsScheduled: scheduledPickups,
        pickupsInProgress: inProgressPickups,
        pickupsCompleted: completedPickups,
        pickupsFailed: failedPickups,
        averageTurnaroundHours,
        operationalFunnel: {
          submitted: totalRequests,
          accepted: requestsAcceptedInPeriod || completedPickups,
          scheduled: totalPickups,
          pickedUp: completedPickups,
          consigned: totalConsignments,
          acceptedByRecycler: acceptedConsignments,
          recycled: completedRecycling,
        },
      },

      // Collector Analytics
      collectorAnalytics: {
        verifiedCollectors: collectorUsers,
        availableCollectors,
        activeCollectors: topActiveCollectors.length,
        pickupsCompleted: completedPickups,
        pickupsFailed: failedPickups,
        currentAssignedPickups: scheduledPickups + inProgressPickups,
        topActiveCollectors,
      },

      // Recycler Analytics
      recyclerAnalytics: {
        verifiedRecyclers: recyclerUsers,
        activeFacilities: totalRecyclerProfiles,
        incomingConsignments: inTransitConsignments,
        deliveredConsignments,
        acceptedConsignments,
        rejectedConsignments,
        itemsProcessing: processingRecycling,
        itemsRecycled: completedRecycling,
        completedRecyclingRecords: completedRecycling,
        facilityCoverage: recyclerFacilityCoverage,
      },

      // Recycling Analytics
      recyclingAnalytics: {
        received: receivedRecycling,
        processing: processingRecycling,
        completed: completedRecycling,
        totalVerifiedRecycledWeightKg: totalRecycledWeightKg,
        environmentalImpactNotice: 'Not currently calculated',
      },

      // Operational Bottlenecks
      bottlenecks: {
        requestsAwaitingCollector,
        requestsAcceptedPickupPending,
        pickupsInProgress: pickupsInProgressCount,
        consignmentsAwaitingDelivery,
        consignmentsDeliveredAwaitingAcceptance,
        recyclingRecordsProcessing: recordsProcessingCount,
      },

      // Recent Platform Activity from AuditLog
      recentActivity,

      // Compatibility backwards-mapping for existing callers
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
        totalWeightKg: totalVerifiedWeightKg,
      },
      consignments: {
        total: totalConsignments,
        accepted: acceptedConsignments,
        rejected: rejectedConsignments,
      },
      recycling: {
        total: totalRecycling,
        completed: completedRecycling,
        totalOutputWeightKg: totalRecycledWeightKg,
      },
      conversionFunnel: {
        itemsSubmitted: totalItems,
        requestsSubmitted: requestsSubmittedInPeriod,
        requestsAccepted: requestsAcceptedInPeriod || completedPickups,
        pickupsCompleted: completedPickups,
        consignmentsDelivered: acceptedConsignments,
        recyclingCompleted: completedRecycling,
      },
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
      totalWeightKg: totalVerifiedWeightKg,
    };
  }
}

module.exports = new AnalyticsService();
