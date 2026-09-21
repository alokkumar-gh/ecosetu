// EcoSetu Collector Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.3, docs/05_API_SPECIFICATION.md Section 4

const prisma = require('../config/database');
const AppError = require('../utils/AppError');

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
