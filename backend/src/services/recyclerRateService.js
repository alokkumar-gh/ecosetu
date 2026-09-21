/**
 * recyclerRateService.js
 * Recycler Offered Rates Service
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 8 (SIH-RATE-001..004)
 */

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const {
  ROLES,
  PRICE_UNITS,
  PRICE_SOURCES,
  PICKUP_AVAILABILITY,
  RECYCLER_RATE_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
  USER_STATUS,
} = require('../utils/constants');
const { isValidCategory } = require('../config/materialTaxonomy');

class RecyclerRateService {
  /**
   * Create a new offered rate for a recycler
   */
  async createRate(rateData, actor) {
    let {
      recyclerId,
      category,
      subcategory,
      rate,
      unit = PRICE_UNITS.PER_KG,
      currency = 'INR',
      pickupAvailable = PICKUP_AVAILABILITY.UNKNOWN,
      serviceArea,
      source = PRICE_SOURCES.RECYCLER_OFFER,
      sourceReference,
      status = RECYCLER_RATE_STATUS.ACTIVE,
      effectiveDate,
      expiryDate,
    } = rateData;

    // RBAC: Only ADMIN or RECYCLER can manage rates
    if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.RECYCLER) {
      throw AppError.forbidden('Only authorized recyclers and administrators can create offered rates');
    }

    // If actor is a RECYCLER, determine recyclerId from profile
    if (actor.role === ROLES.RECYCLER) {
      const profile = await prisma.recyclerProfile.findUnique({
        where: { userId: actor.id },
      });
      if (!profile) {
        throw AppError.forbidden('Recycler profile not found for user');
      }
      recyclerId = profile.id;
    }

    if (!recyclerId) {
      throw AppError.badRequest('Recycler ID is required');
    }

    // Verify recycler profile exists
    const recycler = await prisma.recyclerProfile.findUnique({
      where: { id: recyclerId },
      include: { user: true },
    });
    if (!recycler) {
      throw AppError.notFound('Recycler facility profile not found');
    }

    // If actor is RECYCLER, ensure ownership
    if (actor.role === ROLES.RECYCLER && recycler.userId !== actor.id) {
      throw AppError.forbidden('Cannot create offered rate for another recycler');
    }

    // Validation
    const numericRate = parseFloat(rate);
    if (isNaN(numericRate) || numericRate <= 0) {
      throw AppError.badRequest('Offered rate must be a positive number greater than 0');
    }

    if (!category || !isValidCategory(category)) {
      throw AppError.badRequest(`Invalid or unsupported material category: ${category}`);
    }

    if (!sourceReference || !sourceReference.trim()) {
      throw AppError.badRequest('Provenance sourceReference is mandatory');
    }

    const createdRate = await prisma.recyclerOfferedRate.create({
      data: {
        recyclerId,
        category,
        subcategory: subcategory ? subcategory.trim() : null,
        rate: numericRate,
        unit,
        currency,
        pickupAvailable,
        serviceArea: serviceArea ? serviceArea.trim() : recycler.serviceArea,
        source,
        sourceReference: sourceReference.trim(),
        status,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      include: {
        recycler: {
          select: {
            id: true,
            facilityName: true,
            city: true,
            state: true,
            authorizationStatus: true,
          },
        },
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'CREATE_RECYCLER_OFFERED_RATE',
      entityType: 'RECYCLER_OFFERED_RATE',
      entityId: createdRate.id,
      details: {
        recyclerId,
        category,
        rate: numericRate,
        unit,
        sourceReference,
      },
    });

    return createdRate;
  }

  /**
   * List recycler offered rates with filtering & pagination
   */
  async listRates(query = {}) {
    const {
      recyclerId,
      category,
      status,
      page = 1,
      limit = 20,
    } = query;

    const where = {};
    if (recyclerId) where.recyclerId = recyclerId;
    if (category) where.category = category;
    if (status) where.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, records] = await Promise.all([
      prisma.recyclerOfferedRate.count({ where }),
      prisma.recyclerOfferedRate.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          recycler: {
            select: {
              id: true,
              facilityName: true,
              city: true,
              state: true,
              authorizationStatus: true,
            },
          },
        },
      }),
    ]);

    return {
      rates: records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get single rate by ID
   */
  async getRateById(id) {
    const record = await prisma.recyclerOfferedRate.findUnique({
      where: { id },
      include: {
        recycler: {
          select: {
            id: true,
            facilityName: true,
            facilityAddress: true,
            city: true,
            district: true,
            state: true,
            authorizationStatus: true,
            user: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw AppError.notFound('Recycler offered rate not found');
    }

    return record;
  }

  /**
   * Update an offered rate
   */
  async updateRate(id, updateData, actor) {
    if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.RECYCLER) {
      throw AppError.forbidden('Only authorized recyclers and administrators can modify offered rates');
    }

    const existing = await this.getRateById(id);

    // Ownership check for RECYCLER role
    if (actor.role === ROLES.RECYCLER && existing.recycler.user.id !== actor.id) {
      throw AppError.forbidden('Cannot modify offered rate belonging to another recycler');
    }

    const data = {};

    if (updateData.rate !== undefined) {
      const numeric = parseFloat(updateData.rate);
      if (isNaN(numeric) || numeric <= 0) {
        throw AppError.badRequest('Rate must be a positive number');
      }
      data.rate = numeric;
    }

    if (updateData.unit !== undefined) data.unit = updateData.unit;
    if (updateData.pickupAvailable !== undefined) data.pickupAvailable = updateData.pickupAvailable;
    if (updateData.serviceArea !== undefined) data.serviceArea = updateData.serviceArea;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.effectiveDate !== undefined) data.effectiveDate = new Date(updateData.effectiveDate);
    if (updateData.expiryDate !== undefined) {
      data.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null;
    }
    if (updateData.sourceReference !== undefined) data.sourceReference = updateData.sourceReference.trim();

    const updated = await prisma.recyclerOfferedRate.update({
      where: { id },
      data,
      include: {
        recycler: {
          select: {
            id: true,
            facilityName: true,
            city: true,
            state: true,
            authorizationStatus: true,
          },
        },
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'UPDATE_RECYCLER_OFFERED_RATE',
      entityType: 'RECYCLER_OFFERED_RATE',
      entityId: id,
      details: { updatedFields: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Delete rate (deactivates non-destructively to preserve history)
   */
  async deleteRate(id, actor) {
    if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.RECYCLER) {
      throw AppError.forbidden('Only authorized recyclers and administrators can delete offered rates');
    }

    const existing = await this.getRateById(id);

    if (actor.role === ROLES.RECYCLER && existing.recycler.user.id !== actor.id) {
      throw AppError.forbidden('Cannot delete offered rate belonging to another recycler');
    }

    // Soft deactivation to preserve auditability and history
    const deactivated = await prisma.recyclerOfferedRate.update({
      where: { id },
      data: {
        status: RECYCLER_RATE_STATUS.INACTIVE,
      },
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'DEACTIVATE_RECYCLER_OFFERED_RATE',
      entityType: 'RECYCLER_OFFERED_RATE',
      entityId: id,
      details: { previousStatus: existing.status },
    });

    return deactivated;
  }

  /**
   * Public / collector rates query for active verified recyclers
   */
  async getPublicRates(query = {}) {
    const { category, location } = query;
    const now = new Date();

    const where = {
      status: RECYCLER_RATE_STATUS.ACTIVE,
      effectiveDate: { lte: now },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: now } },
      ],
      recycler: {
        authorizationStatus: RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED,
        user: {
          status: USER_STATUS.ACTIVE,
        },
      },
    };

    if (category) {
      where.category = category;
    }

    if (location && location !== 'ALL') {
      where.OR = [
        { serviceArea: { contains: location, mode: 'insensitive' } },
        { recycler: { city: { contains: location, mode: 'insensitive' } } },
        { recycler: { state: { contains: location, mode: 'insensitive' } } },
      ];
    }

    const rates = await prisma.recyclerOfferedRate.findMany({
      where,
      orderBy: { rate: 'desc' },
      include: {
        recycler: {
          select: {
            id: true,
            facilityName: true,
            city: true,
            district: true,
            state: true,
            pickupAvailable: true,
            serviceArea: true,
            authorizationStatus: true,
          },
        },
      },
    });

    return rates;
  }
}

module.exports = new RecyclerRateService();
