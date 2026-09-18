// EcoSetu Recycler Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.4, docs/05_API_SPECIFICATION.md Section 5

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { ROLES, USER_STATUS } = require('../utils/constants');

class RecyclerService {
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
   * Get recycler profile by user ID
   * @param {string} userId - User UUID
   * @returns {Promise<object>} Recycler profile with user details
   */
  async getProfile(userId) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { userId },
      include: {
        user: RecyclerService.USER_INCLUDE_FIELDS,
      },
    });

    if (!profile) {
      throw AppError.notFound('Recycler profile not found');
    }

    return profile;
  }

  /**
   * Create or update recycler profile
   * @param {string} userId - User UUID
   * @param {object} profileData - Recycler profile details
   * @returns {Promise<object>} Upserted profile
   */
  async upsertProfile(userId, { facilityName, facilityAddress, facilityLat, facilityLng, licenseNumber, acceptedCategories }) {
    const data = {
      facilityName: facilityName.trim(),
      facilityAddress: facilityAddress.trim(),
      acceptedCategories: Array.isArray(acceptedCategories) ? acceptedCategories : [],
    };

    if (facilityLat !== undefined) {
      data.facilityLat = facilityLat !== null ? facilityLat : null;
    }
    if (facilityLng !== undefined) {
      data.facilityLng = facilityLng !== null ? facilityLng : null;
    }
    if (licenseNumber !== undefined) {
      data.licenseNumber = licenseNumber ? licenseNumber.trim() : null;
    }

    const profile = await prisma.recyclerProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
      include: {
        user: RecyclerService.USER_INCLUDE_FIELDS,
      },
    });

    return profile;
  }

  /**
   * List all verified recyclers (for collectors creating consignments / admin)
   * Exposes only public facility information and contact details
   * @param {string} [category] - Optional e-waste category filter
   * @returns {Promise<Array>} List of verified recyclers
   */
  async listVerifiedRecyclers(category) {
    const where = {
      user: {
        status: USER_STATUS.ACTIVE,
        role: ROLES.RECYCLER,
      },
    };

    if (category) {
      where.acceptedCategories = {
        has: category,
      };
    }

    const recyclers = await prisma.recyclerProfile.findMany({
      where,
      select: {
        id: true,
        facilityName: true,
        facilityAddress: true,
        facilityLat: true,
        facilityLng: true,
        acceptedCategories: true,
        totalConsignments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recyclers;
  }
}

module.exports = new RecyclerService();
