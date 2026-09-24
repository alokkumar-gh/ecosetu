// EcoSetu Recycler Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.4, docs/05_API_SPECIFICATION.md Section 5

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const { ROLES, USER_STATUS, RECYCLER_AUTHORIZATION_STATUS, AUDIT_ACTIONS } = require('../utils/constants');

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in km
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

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
  async upsertProfile(userId, { facilityName, facilityAddress, facilityLat, facilityLng, city, district, state, pincode, licenseNumber, acceptedCategories, acceptedSubcategories, pickupAvailable, serviceArea, serviceRadiusKm, operationalPhone, operationalEmail }) {
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
    if (city !== undefined) {
      data.city = city ? city.trim() : null;
    }
    if (district !== undefined) {
      data.district = district ? district.trim() : null;
    }
    if (state !== undefined) {
      data.state = state ? state.trim() : null;
    }
    if (pincode !== undefined) {
      data.pincode = pincode ? pincode.trim() : null;
    }
    if (licenseNumber !== undefined) {
      data.licenseNumber = licenseNumber ? licenseNumber.trim() : null;
    }
    if (acceptedSubcategories !== undefined) {
      data.acceptedSubcategories = Array.isArray(acceptedSubcategories) ? acceptedSubcategories : [];
    }
    if (pickupAvailable !== undefined) {
      data.pickupAvailable = pickupAvailable;
    }
    if (serviceArea !== undefined) {
      data.serviceArea = serviceArea ? serviceArea.trim() : null;
    }
    if (serviceRadiusKm !== undefined) {
      data.serviceRadiusKm = serviceRadiusKm !== null ? parseFloat(serviceRadiusKm) : null;
    }
    if (operationalPhone !== undefined) {
      data.operationalPhone = operationalPhone ? operationalPhone.trim() : null;
    }
    if (operationalEmail !== undefined) {
      data.operationalEmail = operationalEmail ? operationalEmail.trim() : null;
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
   * List verified recyclers with search, filters, safe distance, and pagination
   * Exposes public facility information, authorization status, pickup, and rate availability
   * @param {object|string} [params] - Optional query parameters or category string
   * @returns {Promise<object>} List of recyclers and pagination metadata
   */
  /**
   * Check if an informal collector is authorized to access a recycler's private contact details
   * SIH-RECY-006: Recycler Contact Privacy Gate
   *
   * Access is granted ONLY IF an authorized business interaction exists:
   * 1. A specified lot owned by collector has an interaction with this recycler (Quote, Handover, Transaction) or is beyond DRAFT with an active quote/interaction.
   * 2. If no lotId specified, collector has at least one active/historical Quote, Handover, Transaction, or Consignment with this recycler.
   * 3. If a lotId is explicitly provided but does NOT belong to this collector, access is strictly forbidden (403).
   *
   * @param {string} collectorUserId - Authenticated collector User UUID
   * @param {string} recyclerProfileId - Target RecyclerProfile UUID
   * @param {object} [options] - { lotId?: string }
   * @returns {Promise<boolean>}
   */
  async canCollectorAccessRecyclerContact(collectorUserId, recyclerProfileId, options = {}) {
    const { lotId } = options;

    if (lotId) {
      const lot = await prisma.materialLot.findUnique({
        where: { id: lotId },
        include: {
          collector: {
            select: { userId: true },
          },
          quotes: {
            where: { recyclerId: recyclerProfileId },
            select: { id: true, status: true },
          },
          handovers: {
            where: { recyclerId: recyclerProfileId },
            select: { id: true, status: true },
          },
          transactions: {
            where: { recyclerId: recyclerProfileId },
            select: { id: true, transactionStatus: true },
          },
        },
      });

      if (!lot) {
        throw AppError.notFound('Material lot not found');
      }

      if (lot.collector?.userId !== collectorUserId) {
        throw AppError.forbidden('Cannot access contact using another collector\'s material lot');
      }

      const hasQuotes = Array.isArray(lot.quotes) && lot.quotes.length > 0;
      const hasHandovers = Array.isArray(lot.handovers) && lot.handovers.length > 0;
      const hasTransactions = Array.isArray(lot.transactions) && lot.transactions.length > 0;

      // Eligible interaction: lot has quote with this recycler, or handover/transaction, or lot is beyond DRAFT and negotiated with this recycler
      if (hasQuotes || hasHandovers || hasTransactions) {
        return true;
      }

      return false;
    }

    // General interaction check (no specific lotId provided)
    const [quoteCount, handoverCount, transactionCount, consignmentCount] = await Promise.all([
      prisma.quote.count({
        where: {
          recyclerId: recyclerProfileId,
          materialLot: {
            collector: { userId: collectorUserId },
          },
        },
      }),
      prisma.handoverRecord.count({
        where: {
          recyclerId: recyclerProfileId,
          collector: { userId: collectorUserId },
        },
      }),
      prisma.transactionRecord.count({
        where: {
          recyclerId: recyclerProfileId,
          collector: { userId: collectorUserId },
        },
      }),
      prisma.consignment.count({
        where: {
          recyclerId: recyclerProfileId,
          collector: { userId: collectorUserId },
        },
      }),
    ]);

    return (quoteCount > 0 || handoverCount > 0 || transactionCount > 0 || consignmentCount > 0);
  }

  /**
   * List all verified recyclers with optional filters (category, authorizationStatus, pickup, search, location)
   * Enforces SIH-RECY-006: Recycler private phone/email are omitted for directory browsing
   * @param {object|string} params - Query filters or category string
   * @param {object} [requester] - Authenticated user context
   * @returns {Promise<object>} { recyclers, pagination }
   */
  async listVerifiedRecyclers(params = {}, requester = null) {
    let options = {};
    if (typeof params === 'string') {
      options = { category: params };
    } else if (params && typeof params === 'object') {
      options = params;
    }

    const isAdmin = requester && requester.role === ROLES.ADMIN;

    const where = {
      user: {
        status: USER_STATUS.ACTIVE,
        role: ROLES.RECYCLER,
      },
    };

    if (options.category) {
      where.acceptedCategories = {
        has: options.category,
      };
    }

    if (options.authorizationStatus) {
      where.authorizationStatus = options.authorizationStatus;
    }

    if (options.pickupAvailable) {
      where.pickupAvailable = options.pickupAvailable;
    }

    if (options.search) {
      const searchTerm = options.search.trim();
      if (searchTerm) {
        where.OR = [
          { facilityName: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { district: { contains: searchTerm, mode: 'insensitive' } },
          { state: { contains: searchTerm, mode: 'insensitive' } },
          { serviceArea: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
    }

    const now = new Date();
    if (options.hasRates === true || options.hasRates === 'true') {
      where.offeredRates = {
        some: {
          status: 'ACTIVE',
          effectiveDate: { lte: now },
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
        },
      };
    }

    const page = options.page ? Math.max(1, parseInt(options.page, 10)) : 1;
    const limit = options.limit ? Math.min(100, Math.max(1, parseInt(options.limit, 10))) : 50;
    const skip = (page - 1) * limit;

    const [total, recyclers] = await Promise.all([
      prisma.recyclerProfile.count({ where }),
      prisma.recyclerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          offeredRates: {
            where: {
              status: 'ACTIVE',
              effectiveDate: { lte: now },
              OR: [
                { expiryDate: null },
                { expiryDate: { gte: now } },
              ],
            },
            select: {
              id: true,
              category: true,
              subcategory: true,
              rate: true,
              unit: true,
              currency: true,
              pickupAvailable: true,
              status: true,
              sourceReference: true,
              effectiveDate: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const userLat = options.lat != null ? parseFloat(options.lat) : null;
    const userLng = options.lng != null ? parseFloat(options.lng) : null;

    const formattedRecyclers = recyclers.map((r) => {
      const facLat = r.facilityLat ? parseFloat(r.facilityLat.toString()) : null;
      const facLng = r.facilityLng ? parseFloat(r.facilityLng.toString()) : null;
      const distanceKm = calculateHaversineDistanceKm(userLat, userLng, facLat, facLng);

      const activeRates = (r.offeredRates || []).map((rate) => ({
        id: rate.id,
        category: rate.category,
        subcategory: rate.subcategory,
        rate: parseFloat(rate.rate.toString()),
        unit: rate.unit,
        currency: rate.currency,
        pickupAvailable: rate.pickupAvailable,
        status: rate.status,
        sourceReference: rate.sourceReference,
        effectiveDate: rate.effectiveDate,
        expiryDate: rate.expiryDate,
      }));

      const operationalPhone = isAdmin ? (r.operationalPhone || (r.user ? r.user.phone : null)) : null;
      const operationalEmail = isAdmin ? (r.operationalEmail || (r.user ? r.user.email : null)) : null;
      const sanitizedUser = r.user
        ? (isAdmin
            ? r.user
            : { id: r.user.id, name: r.user.name })
        : null;

      return {
        id: r.id,
        facilityName: r.facilityName,
        facilityAddress: r.facilityAddress,
        facilityLat: facLat,
        facilityLng: facLng,
        city: r.city,
        district: r.district,
        state: r.state,
        pincode: r.pincode,
        licenseNumber: r.licenseNumber,
        authorizationNumber: r.authorizationNumber || r.licenseNumber || null,
        issuingAuthority: r.issuingAuthority || null,
        authorizationValidFrom: r.authorizationValidFrom || null,
        authorizationValidTill: r.authorizationValidTill || null,
        acceptedCategories: r.acceptedCategories,
        acceptedSubcategories: r.acceptedSubcategories || [],
        totalConsignments: r.totalConsignments,
        pickupAvailable: r.pickupAvailable,
        serviceArea: r.serviceArea,
        serviceRadiusKm: r.serviceRadiusKm ? parseFloat(r.serviceRadiusKm.toString()) : null,
        authorizationStatus: r.authorizationStatus,
        operationalPhone,
        operationalEmail,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        distanceKm,
        hasActiveRates: activeRates.length > 0,
        activeRatesCount: activeRates.length,
        activeRates,
        user: sanitizedUser,
        canAccessContact: Boolean(isAdmin),
      };
    });

    return {
      recyclers: formattedRecyclers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single recycler facility details with active offered rates and contact info
   * Enforces SIH-RECY-006: Recycler Contact Privacy Gate
   * @param {string} id - RecyclerProfile UUID
   * @param {object} [options] - Optional coordinates & context { lat, lng, requester, lotId }
   * @returns {Promise<object>} Full recycler details (privacy-gated)
   */
  async getRecyclerById(id, options = {}) {
    const { lat, lng, requester, lotId } = options;
    const now = new Date();
    const profile = await prisma.recyclerProfile.findUnique({
      where: { id },
      include: {
        user: RecyclerService.USER_INCLUDE_FIELDS,
        offeredRates: {
          where: {
            status: 'ACTIVE',
            effectiveDate: { lte: now },
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: now } },
            ],
          },
          orderBy: { rate: 'desc' },
        },
      },
    });

    if (!profile) {
      throw AppError.notFound('Recycler facility not found');
    }

    // Determine contact access authorization
    let canAccessContact = false;
    if (requester) {
      if (requester.role === ROLES.ADMIN) {
        canAccessContact = true;
      } else if (requester.role === ROLES.RECYCLER && profile.userId === requester.id) {
        canAccessContact = true;
      } else if (requester.role === ROLES.INFORMAL_COLLECTOR) {
        canAccessContact = await this.canCollectorAccessRecyclerContact(requester.id, id, { lotId });
      }
    }

    const userLat = lat != null ? parseFloat(lat) : null;
    const userLng = lng != null ? parseFloat(lng) : null;
    const facLat = profile.facilityLat ? parseFloat(profile.facilityLat.toString()) : null;
    const facLng = profile.facilityLng ? parseFloat(profile.facilityLng.toString()) : null;
    const distanceKm = calculateHaversineDistanceKm(userLat, userLng, facLat, facLng);

    const activeOfferedRates = (profile.offeredRates || []).map((r) => ({
      id: r.id,
      category: r.category,
      subcategory: r.subcategory,
      rate: parseFloat(r.rate.toString()),
      unit: r.unit,
      currency: r.currency,
      pickupAvailable: r.pickupAvailable,
      serviceArea: r.serviceArea,
      source: 'RECYCLER_OFFER',
      sourceReference: r.sourceReference,
      status: r.status,
      effectiveDate: r.effectiveDate,
      expiryDate: r.expiryDate,
    }));

    const operationalPhone = canAccessContact ? (profile.operationalPhone || (profile.user ? profile.user.phone : null)) : null;
    const operationalEmail = canAccessContact ? (profile.operationalEmail || (profile.user ? profile.user.email : null)) : null;

    const contact = {
      name: profile.user ? profile.user.name : null,
      email: operationalEmail,
      phone: operationalPhone,
      isLocked: !canAccessContact,
      canAccessContact,
      ...(!canAccessContact ? { accessRequirement: 'INTERACTION_REQUIRED' } : {}),
    };

    const sanitizedUser = profile.user
      ? (canAccessContact
          ? profile.user
          : { id: profile.user.id, name: profile.user.name, role: profile.user.role, status: profile.user.status })
      : null;

    return {
      id: profile.id,
      facilityName: profile.facilityName,
      facilityAddress: profile.facilityAddress,
      facilityLat: facLat,
      facilityLng: facLng,
      city: profile.city,
      district: profile.district,
      state: profile.state,
      pincode: profile.pincode,
      licenseNumber: profile.licenseNumber,
      authorizationNumber: profile.authorizationNumber || profile.licenseNumber || null,
      issuingAuthority: profile.issuingAuthority || null,
      authorizationValidFrom: profile.authorizationValidFrom || null,
      authorizationValidTill: profile.authorizationValidTill || null,
      acceptedCategories: profile.acceptedCategories,
      acceptedSubcategories: profile.acceptedSubcategories || [],
      totalConsignments: profile.totalConsignments,
      pickupAvailable: profile.pickupAvailable,
      serviceArea: profile.serviceArea,
      serviceRadiusKm: profile.serviceRadiusKm ? parseFloat(profile.serviceRadiusKm.toString()) : null,
      authorizationStatus: profile.authorizationStatus,
      operationalPhone,
      operationalEmail,
      verifiedAt: profile.verifiedAt || null,
      verifiedBy: profile.verifiedBy || null,
      verificationNotes: profile.verificationNotes || null,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      distanceKm,
      hasActiveRates: activeOfferedRates.length > 0,
      activeRatesCount: activeOfferedRates.length,
      offeredRates: activeOfferedRates,
      contact: contact,
      user: sanitizedUser,
      canAccessContact,
    };
  }

  /**
   * List recyclers for administrative governance
   */
  async adminListRecyclers(options = {}) {
    const where = {};
    if (options.authorizationStatus) {
      where.authorizationStatus = options.authorizationStatus;
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive === true || options.isActive === 'true';
    }
    if (options.city) {
      where.city = { contains: options.city.trim(), mode: 'insensitive' };
    }
    if (options.state) {
      where.state = { contains: options.state.trim(), mode: 'insensitive' };
    }
    if (options.search) {
      const q = options.search.trim();
      where.OR = [
        { facilityName: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { authorizationNumber: { contains: q, mode: 'insensitive' } },
        { licenseNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const page = options.page ? Math.max(1, parseInt(options.page, 10)) : 1;
    const limit = options.limit ? Math.min(100, Math.max(1, parseInt(options.limit, 10))) : 50;
    const skip = (page - 1) * limit;

    const [total, recyclers] = await Promise.all([
      prisma.recyclerProfile.count({ where }),
      prisma.recyclerProfile.findMany({
        where,
        include: {
          user: RecyclerService.USER_INCLUDE_FIELDS,
          verifiedByUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { offeredRates: true, quotes: true, handovers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      recyclers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single recycler details for admin review including audit history
   */
  async adminGetRecyclerById(id) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { id },
      include: {
        user: RecyclerService.USER_INCLUDE_FIELDS,
        verifiedByUser: {
          select: { id: true, name: true, email: true },
        },
        offeredRates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw AppError.notFound('Recycler profile not found');
    }

    const auditHistory = await prisma.auditLog.findMany({
      where: {
        entityType: 'RECYCLER_PROFILE',
        entityId: profile.id,
      },
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      recycler: profile,
      auditHistory,
    };
  }

  /**
   * Admin update authorization status with audit logging
   */
  async adminUpdateRecyclerAuthorization(adminId, recyclerId, data, ipAddress = null) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { id: recyclerId },
      include: { user: true },
    });

    if (!profile) {
      throw AppError.notFound('Recycler profile not found');
    }

    const previousStatus = profile.authorizationStatus;
    const newStatus = data.status;

    const updateData = {
      authorizationStatus: newStatus,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      verificationNotes: data.reason ? data.reason.trim() : (data.verificationNotes ? data.verificationNotes.trim() : null),
    };

    if (data.authorizationNumber !== undefined) {
      updateData.authorizationNumber = data.authorizationNumber ? data.authorizationNumber.trim() : null;
    }
    if (data.issuingAuthority !== undefined) {
      updateData.issuingAuthority = data.issuingAuthority ? data.issuingAuthority.trim() : null;
    }
    if (data.validFrom !== undefined) {
      updateData.authorizationValidFrom = data.validFrom ? new Date(data.validFrom) : null;
    }
    if (data.validTill !== undefined) {
      updateData.authorizationValidTill = data.validTill ? new Date(data.validTill) : null;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
    }

    const updated = await prisma.recyclerProfile.update({
      where: { id: recyclerId },
      data: updateData,
      include: {
        user: RecyclerService.USER_INCLUDE_FIELDS,
        verifiedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    await auditService.logAction({
      actorId: adminId,
      action: AUDIT_ACTIONS.RECYCLER_AUTHORIZATION_CHANGED || 'RECYCLER_AUTHORIZATION_CHANGED',
      entityType: 'RECYCLER_PROFILE',
      entityId: profile.id,
      details: {
        previousStatus,
        newStatus,
        reason: updateData.verificationNotes,
        authorizationNumber: updateData.authorizationNumber,
        issuingAuthority: updateData.issuingAuthority,
        validFrom: updateData.authorizationValidFrom,
        validTill: updateData.authorizationValidTill,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Admin maintenance update of recycler operational data
   */
  async adminUpdateRecyclerProfile(adminId, recyclerId, data, ipAddress = null) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { id: recyclerId },
    });

    if (!profile) {
      throw AppError.notFound('Recycler profile not found');
    }

    const updateData = {};
    if (data.facilityName !== undefined) updateData.facilityName = data.facilityName.trim();
    if (data.facilityAddress !== undefined) updateData.facilityAddress = data.facilityAddress.trim();
    if (data.city !== undefined) updateData.city = data.city ? data.city.trim() : null;
    if (data.district !== undefined) updateData.district = data.district ? data.district.trim() : null;
    if (data.state !== undefined) updateData.state = data.state ? data.state.trim() : null;
    if (data.pincode !== undefined) updateData.pincode = data.pincode ? data.pincode.trim() : null;
    if (data.serviceArea !== undefined) updateData.serviceArea = data.serviceArea ? data.serviceArea.trim() : null;
    if (data.serviceRadiusKm !== undefined) updateData.serviceRadiusKm = data.serviceRadiusKm != null ? parseFloat(data.serviceRadiusKm) : null;
    if (data.pickupAvailable !== undefined) updateData.pickupAvailable = data.pickupAvailable;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const updated = await prisma.recyclerProfile.update({
      where: { id: recyclerId },
      data: updateData,
      include: { user: RecyclerService.USER_INCLUDE_FIELDS },
    });

    await auditService.logAction({
      actorId: adminId,
      action: AUDIT_ACTIONS.RECYCLER_PROFILE_UPDATED || 'RECYCLER_PROFILE_UPDATED',
      entityType: 'RECYCLER_PROFILE',
      entityId: profile.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress,
    });

    return updated;
  }
}

module.exports = new RecyclerService();
