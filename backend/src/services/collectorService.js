// EcoSetu Collector Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.3, docs/05_API_SPECIFICATION.md Section 4

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const eventBus = require('./eventBus');
const { NOTIFICATION_TYPES, REQUEST_STATUS } = require('../utils/constants');

class CollectorService {
  static USER_INCLUDE_FIELDS = {
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
    },
  };

  /**
   * Re-evaluate all active submitted collection requests for a newly available collector.
   * Matches requests using EcoMatch eligibility rules without duplicating notifications.
   * @param {object} profile - CollectorProfile record with user relation
   * @returns {Promise<{ evaluated: number, matched: number, notificationsSent: number }>}
   */
  async reEvaluateActiveRequestsForCollector(profile) {
    if (!profile || !profile.userId || profile.isAvailable === false) {
      return { evaluated: 0, matched: 0, notificationsSent: 0 };
    }

    const ecoMatchService = require('./matching/EcoMatchService');
    const notificationService = require('./notificationService');

    const openRequests = await prisma.collectionRequest.findMany({
      where: {
        status: REQUEST_STATUS.SUBMITTED,
      },
      include: {
        ewasteItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let matchedCount = 0;
    let notificationsSent = 0;

    for (const req of openRequests) {
      const eligibility = ecoMatchService.checkEligibility(profile, req);
      if (!eligibility.eligible) continue;

      matchedCount++;

      // Check if notification already exists for this collector + request
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: profile.userId,
          referenceType: 'collection_request',
          referenceId: req.id,
          type: {
            in: [
              NOTIFICATION_TYPES.REQUEST_AVAILABLE,
              NOTIFICATION_TYPES.COLLECTOR_PICKUP_REQUEST_AVAILABLE || 'COLLECTOR_PICKUP_REQUEST_AVAILABLE',
            ],
          },
        },
      });

      const primaryItem = req.ewasteItems?.[0] || null;
      const categories = Array.isArray(req.ewasteItems) && req.ewasteItems.length > 0
        ? [...new Set(req.ewasteItems.map((i) => i.category))].join(', ')
        : 'E-Waste Items';

      const totalWeight = Array.isArray(req.ewasteItems)
        ? req.ewasteItems.reduce((acc, i) => acc + (parseFloat(i.estimatedWeightKg || i.actualWeightKg) || 0), 0)
        : 0;

      const area = req.district || req.city || req.landmark || 'your area';

      if (!existingNotif) {
        await notificationService.createNotification({
          userId: profile.userId,
          type: NOTIFICATION_TYPES.REQUEST_AVAILABLE,
          title: 'New Pickup Request Available',
          message: `New pickup request for ${categories} (~${totalWeight > 0 ? totalWeight + 'kg' : '1 lot'}) in ${area}. Tap to view & submit an offer.`,
          referenceType: 'collection_request',
          referenceId: req.id,
        });
        notificationsSent++;
      }

      // Emit realtime event for connected clients (sanitized payload protecting citizen privacy)
      const realtimePayload = {
        requestId: req.id,
        category: primaryItem?.category || 'OTHER',
        condition: primaryItem?.condition || 'UNKNOWN',
        estimatedWeightKg: totalWeight > 0 ? totalWeight : null,
        imageUrl: primaryItem?.imageUrl || null,
        distanceKm: eligibility.distanceKm,
        createdAt: req.createdAt,
      };

      eventBus.emit('COLLECTOR_PICKUP_REQUEST_AVAILABLE', {
        collectorId: profile.id,
        userId: profile.userId,
        request: realtimePayload,
      });
    }

    logger.info(`[COLLECTOR_AVAILABILITY] collector: ${profile.id} (${profile.userId})`);
    logger.info(`[COLLECTOR_AVAILABILITY] available: true`);
    logger.info(`[COLLECTOR_AVAILABILITY] active requests re-evaluated: ${openRequests.length}`);
    logger.info(`[COLLECTOR_AVAILABILITY] eligible matched requests: ${matchedCount}`);
    logger.info(`[COLLECTOR_AVAILABILITY] realtime notifications sent: ${notificationsSent}`);

    return {
      evaluated: openRequests.length,
      matched: matchedCount,
      notificationsSent,
    };
  }

  /**
   * Get collector profile by user ID
   * @param {string} userId - User UUID
   * @returns {Promise<object>} Collector profile with user data
   */
  async getProfile(userId) {
    let profile = await prisma.collectorProfile.findUnique({
      where: { userId },
      include: {
        user: CollectorService.USER_INCLUDE_FIELDS,
      },
    });

    if (!profile) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: CollectorService.USER_INCLUDE_FIELDS.select,
      });

      if (!user) {
        throw AppError.notFound('Collector profile not found');
      }

      profile = await prisma.collectorProfile.create({
        data: {
          userId,
          preferredLanguage: 'en',
          isAvailable: true,
        },
        include: {
          user: CollectorService.USER_INCLUDE_FIELDS,
        },
      });
    }

    return profile;
  }

  /**
   * Create or update collector profile
   * @param {string} userId - User UUID
   * @param {object} profileData - Profile details
   * @returns {Promise<object>} Upserted profile
   */
  async upsertProfile(userId, { serviceAreaLat, serviceAreaLng, serviceRadiusKm, serviceArea, city, state, pincode, bio, preferredLanguage }) {
    const data = {};

    if (serviceAreaLat !== undefined) {
      data.serviceAreaLat = serviceAreaLat !== null ? serviceAreaLat : null;
    }
    if (serviceAreaLng !== undefined) {
      data.serviceAreaLng = serviceAreaLng !== null ? serviceAreaLng : null;
    }
    if (serviceRadiusKm !== undefined) {
      data.serviceRadiusKm = serviceRadiusKm !== null ? serviceRadiusKm : 5.0;
    }
    if (serviceArea !== undefined) {
      data.serviceArea = serviceArea ? serviceArea.trim() : null;
    }
    if (city !== undefined) {
      data.city = city ? city.trim() : null;
    }
    if (state !== undefined) {
      data.state = state ? state.trim() : null;
    }
    if (pincode !== undefined) {
      data.pincode = pincode ? pincode.trim() : null;
    }
    if (bio !== undefined) {
      data.bio = bio ? bio.trim() : null;
    }
    if (preferredLanguage !== undefined) {
      const allowedLangs = ['en', 'hi', 'mr', 'or'];
      if (preferredLanguage && !allowedLangs.includes(preferredLanguage)) {
        throw AppError.badRequest('Invalid preferred language code. Supported: en, hi, mr, or');
      }
      data.preferredLanguage = preferredLanguage || 'en';
    }

    const profile = await prisma.collectorProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
      include: {
        user: CollectorService.USER_INCLUDE_FIELDS,
      },
    });

    return profile;
  }

  /**
   * Toggle collector availability
   * @param {string} userId - User UUID
   * @param {boolean} isAvailable - Availability state
   * @returns {Promise<object>} Updated profile
   */
  async toggleAvailability(userId, isAvailable) {
    const existing = await prisma.collectorProfile.findUnique({
      where: { userId },
      include: {
        user: CollectorService.USER_INCLUDE_FIELDS,
      },
    });

    if (!existing) {
      throw AppError.notFound('Collector profile not found');
    }

    const profile = await prisma.collectorProfile.update({
      where: { userId },
      data: { isAvailable },
      include: {
        user: CollectorService.USER_INCLUDE_FIELDS,
      },
    });

    // Emit availability changed event
    eventBus.emit('COLLECTOR_AVAILABILITY_CHANGED', {
      collectorId: profile.id,
      userId: profile.userId,
      availableForPickups: isAvailable,
      timestamp: new Date().toISOString(),
    });

    // When transitioning to available (false -> true), re-evaluate all active submitted requests
    if (isAvailable) {
      this.reEvaluateActiveRequestsForCollector(profile).catch((err) => {
        logger.warn(`[CollectorService] Failed to re-evaluate active requests for collector ${userId}: ${err.message}`);
      });
    }

    return profile;
  }

  /**
   * Get collector statistics
   * Canonical Reference: docs/05_API_SPECIFICATION.md Section 4, docs/06_ROLES_AND_PERMISSIONS.md
   * @param {string} userId - Authenticated user UUID
   * @returns {Promise<object>} Collector stats
   */
  async getCollectorStats(userId) {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw AppError.notFound('Collector profile not found');
    }

    const [totalPickups, pickupWeightAgg, totalConsignments, activeRequests] = await Promise.all([
      prisma.pickup.count({
        where: {
          collectorId: profile.id,
          status: 'COMPLETED',
        },
      }),
      prisma.pickup.aggregate({
        where: {
          collectorId: profile.id,
          status: 'COMPLETED',
        },
        _sum: { totalWeightKg: true },
      }),
      prisma.consignment.count({
        where: {
          collectorId: profile.id,
        },
      }),
      prisma.collectionRequest.count({
        where: {
          collectorId: profile.id,
          status: { in: ['ACCEPTED', 'PICKUP_SCHEDULED'] },
        },
      }),
    ]);

    const totalWeightKg = pickupWeightAgg?._sum?.totalWeightKg
      ? parseFloat(Number(pickupWeightAgg._sum.totalWeightKg).toFixed(2))
      : 0;

    return {
      totalPickups,
      totalWeightKg,
      totalConsignments,
      activeRequests,
    };
  }
}

module.exports = new CollectorService();
