// EcoSetu Material Lot Service
// Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1 & 2
// Authoritative order: SIH 26229 Problem Statement

const crypto = require('crypto');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const {
  ROLES,
  USER_STATUS,
  ITEM_CONDITIONS,
  MATERIAL_CATEGORIES,
  MATERIAL_SOURCE_TYPES,
  MATERIAL_LOT_STATUS,
  LISTING_PURPOSE,
  PRICE_UNITS,
  ERROR_CODES,
} = require('../utils/constants');

class MaterialLotService {
  /**
   * Generate human-readable reference number (e.g. LOT-202609-A7B3X or MAT-202609-K9M2D)
   * @param {'LOT'|'MAT'} prefix
   * @returns {string}
   */
  generateReferenceNumber(prefix = 'LOT') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `${prefix}-${year}${month}-${randomHex}`;
  }

  /**
   * Helper: Retrieve and validate collector profile for an authenticated user
   * @param {string} userId - User UUID
   * @returns {Promise<object>} CollectorProfile
   */
  async getCollectorProfileOrThrow(userOrId) {
    const userId = typeof userOrId === 'string' ? userOrId : (userOrId?.id || userOrId?.userId);
    if (!userId) {
      throw AppError.forbidden('Invalid user context');
    }
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      throw AppError.forbidden('User does not have an associated collector profile');
    }

    if (profile.user.status === USER_STATUS.SUSPENDED || profile.user.status === USER_STATUS.DEACTIVATED) {
      throw AppError.forbidden('Collector account is not active');
    }

    return profile;
  }

  /**
   * Create a new standalone Material Item
   * @param {string} collectorUserId - Authenticated collector User ID
   * @param {object} data - Material item payload
   * @returns {Promise<object>}
   */
  async createMaterialItem(collectorUserId, data) {
    const userId = typeof collectorUserId === 'string' ? collectorUserId : (collectorUserId?.id || collectorUserId?.userId);
    const collectorProfile = await this.getCollectorProfileOrThrow(userId);

    if (!data.category || !MATERIAL_CATEGORIES[data.category]) {
      throw AppError.badRequest(`Invalid material category: ${data.category}`, ERROR_CODES.VALIDATION_ERROR);
    }

    let weight = null;
    if (data.approximateWeightKg !== undefined && data.approximateWeightKg !== null) {
      weight = parseFloat(data.approximateWeightKg);
      if (isNaN(weight) || weight <= 0) {
        throw AppError.badRequest('Approximate weight must be a positive number', ERROR_CODES.VALIDATION_ERROR);
      }
    }

    let condition = ITEM_CONDITIONS.UNKNOWN;
    if (data.condition) {
      if (!ITEM_CONDITIONS[data.condition]) {
        throw AppError.badRequest(`Invalid condition: ${data.condition}`, ERROR_CODES.VALIDATION_ERROR);
      }
      condition = data.condition;
    }

    let sourceType = MATERIAL_SOURCE_TYPES.HOUSEHOLD;
    if (data.sourceType) {
      if (!MATERIAL_SOURCE_TYPES[data.sourceType]) {
        throw AppError.badRequest(`Invalid source type: ${data.sourceType}`, ERROR_CODES.VALIDATION_ERROR);
      }
      sourceType = data.sourceType;
    }

    let referenceId = this.generateReferenceNumber('MAT');
    // Ensure uniqueness
    for (let attempts = 0; attempts < 3; attempts++) {
      const existing = await prisma.materialItem.findUnique({ where: { referenceId } });
      if (!existing) break;
      referenceId = this.generateReferenceNumber('MAT');
    }

    const item = await prisma.materialItem.create({
      data: {
        referenceId,
        collectorId: collectorProfile.id,
        category,
        subcategory: data.subcategory || null,
        description: data.description || null,
        approximateWeightKg: weight,
        condition,
        sourceType,
      },
    });

    return item;
  }

  /**
   * Create a new Material Lot
   * @param {string} collectorUserId - Authenticated collector User ID
   * @param {object} data - Lot payload
   * @param {string} [ipAddress] - Client IP for audit logging
   * @returns {Promise<object>}
   */
  async createMaterialLot(collectorUserId, data, ipAddress = null) {
    const userId = typeof collectorUserId === 'string' ? collectorUserId : (collectorUserId?.id || collectorUserId?.userId);
    const collectorProfile = await this.getCollectorProfileOrThrow(userId);

    // Idempotency: prevent duplicate creation during offline sync retries
    if (data.clientReferenceId) {
      const existingLot = await prisma.materialLot.findUnique({
        where: { clientReferenceId: data.clientReferenceId },
        include: {
          items: { include: { materialItem: true } },
          photos: true,
        },
      });

      if (existingLot) {
        if (existingLot.collectorId !== collectorProfile.id) {
          throw AppError.forbidden('Client reference ID conflict', ERROR_CODES.CONFLICT);
        }
        logger.info(`[MaterialLotService] Idempotent lot match for clientReferenceId: ${data.clientReferenceId}`);
        return existingLot;
      }
    }

    // Validate category
    const category = data.category === 'SMARTPHONE' ? 'MOBILE_PHONE' : data.category;
    if (!category || !MATERIAL_CATEGORIES[category]) {
      throw AppError.badRequest(`Invalid material category: ${data.category}`, ERROR_CODES.VALIDATION_ERROR);
    }

    // Validate weight
    let weight = null;
    const rawWeight = data.approximateTotalWeightKg !== undefined ? data.approximateTotalWeightKg : data.approximateWeightKg;
    if (rawWeight !== undefined && rawWeight !== null) {
      weight = parseFloat(rawWeight);
      if (isNaN(weight) || weight <= 0) {
        throw AppError.badRequest('Approximate total weight must be a positive number', ERROR_CODES.VALIDATION_ERROR);
      }
    }

    // Validate condition
    let condition = ITEM_CONDITIONS.UNKNOWN;
    if (data.condition) {
      if (!ITEM_CONDITIONS[data.condition]) {
        throw AppError.badRequest(`Invalid condition: ${data.condition}`, ERROR_CODES.VALIDATION_ERROR);
      }
      condition = data.condition;
    }

    // Validate source type
    let sourceType = MATERIAL_SOURCE_TYPES.HOUSEHOLD;
    if (data.sourceType) {
      if (!MATERIAL_SOURCE_TYPES[data.sourceType]) {
        throw AppError.badRequest(`Invalid source type: ${data.sourceType}`, ERROR_CODES.VALIDATION_ERROR);
      }
      sourceType = data.sourceType;
    }

    // Validate status (Phase 1 allows DRAFT or OPEN at creation)
    let status = MATERIAL_LOT_STATUS.DRAFT;
    if (data.status) {
      if (data.status !== MATERIAL_LOT_STATUS.DRAFT && data.status !== MATERIAL_LOT_STATUS.OPEN) {
        throw AppError.badRequest(
          `Initial lot status must be DRAFT or OPEN, received: ${data.status}`,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      status = data.status;
    }

    // Validate GPS (graceful handling: if invalid or out of range, throw error; if missing, allow null)
    let collectionLat = null;
    let collectionLng = null;
    let collectionAccuracy = null;
    const rawLat = data.collectionLat !== undefined ? data.collectionLat : data.collectionLatitude;
    if (rawLat !== undefined && rawLat !== null) {
      const lat = parseFloat(rawLat);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw AppError.badRequest('Latitude must be between -90 and 90 degrees', ERROR_CODES.VALIDATION_ERROR);
      }
      collectionLat = lat;
    }

    const rawLng = data.collectionLng !== undefined ? data.collectionLng : data.collectionLongitude;
    if (rawLng !== undefined && rawLng !== null) {
      const lng = parseFloat(rawLng);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw AppError.badRequest('Longitude must be between -180 and 180 degrees', ERROR_CODES.VALIDATION_ERROR);
      }
      collectionLng = lng;
    }

    const rawAcc = data.collectionAccuracy !== undefined ? data.collectionAccuracy : data.locationAccuracyMeters;
    if (rawAcc !== undefined && rawAcc !== null) {
      const acc = parseFloat(rawAcc);
      if (!isNaN(acc) && acc >= 0) {
        collectionAccuracy = acc;
      }
    }

    let collectionTimestamp = null;
    if (data.collectionTimestamp) {
      const parsedDate = new Date(data.collectionTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        collectionTimestamp = parsedDate;
      }
    } else if (collectionLat !== null && collectionLng !== null) {
      collectionTimestamp = new Date();
    }

    // Generate unique human-readable reference number
    let referenceNumber = this.generateReferenceNumber('LOT');
    for (let attempts = 0; attempts < 3; attempts++) {
      const existing = await prisma.materialLot.findUnique({ where: { referenceNumber } });
      if (!existing) break;
      referenceNumber = this.generateReferenceNumber('LOT');
    }

    // Prepare photos data
    const photosToCreate = [];
    if (Array.isArray(data.photos)) {
      for (const p of data.photos) {
        const photoUrl = typeof p === 'string' ? p : p.photoUrl || p.url || p.imageUrl;
        if (photoUrl) {
          photosToCreate.push({
            photoUrl,
            storagePath: p.storagePath || null,
            fileSize: p.fileSize ? parseInt(p.fileSize, 10) : null,
            mimeType: p.mimeType || 'image/jpeg',
            capturedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
          });
        }
      }
    }

    // Prepare items to link
    const itemIdsToLink = [];
    if (Array.isArray(data.itemIds)) {
      for (const id of data.itemIds) {
        // Verify item belongs to this collector
        const item = await prisma.materialItem.findUnique({ where: { id } });
        if (item && item.collectorId === collectorProfile.id) {
          itemIdsToLink.push(id);
        } else {
          throw AppError.badRequest(`Material item ${id} not found or not owned by collector`, ERROR_CODES.BAD_REQUEST);
        }
      }
    }

    // If inline single item data provided without items, create a material item record
    let inlineItem = null;
    if (itemIdsToLink.length === 0) {
      let itemRef = this.generateReferenceNumber('MAT');
      inlineItem = await prisma.materialItem.create({
        data: {
          referenceId: itemRef,
          collectorId: collectorProfile.id,
          category,
          subcategory: data.subcategory || null,
          description: data.description || null,
          approximateWeightKg: weight,
          condition,
          sourceType,
        },
      });
      itemIdsToLink.push(inlineItem.id);
    }

    const listingPurpose = data.listingPurpose && LISTING_PURPOSE[data.listingPurpose]
      ? data.listingPurpose
      : LISTING_PURPOSE.RECYCLING;

    let askingPrice = null;
    if (data.askingPrice !== undefined && data.askingPrice !== null) {
      const p = parseFloat(data.askingPrice);
      if (!isNaN(p) && p >= 0) askingPrice = p;
    }

    const priceUnit = data.priceUnit && PRICE_UNITS[data.priceUnit] ? data.priceUnit : null;

    // Create lot with transactions
    const lot = await prisma.$transaction(async (tx) => {
      const createdLot = await tx.materialLot.create({
        data: {
          referenceNumber,
          clientReferenceId: data.clientReferenceId || null,
          collectorId: collectorProfile.id,
          status,
          listingPurpose,
          askingPrice,
          priceUnit,
          category,
          subcategory: data.subcategory || null,
          description: data.description || null,
          approximateTotalWeightKg: weight,
          condition,
          sourceType,
          collectionLat,
          collectionLng,
          collectionAccuracy,
          collectionTimestamp,
          photos: {
            create: photosToCreate,
          },
          items: {
            create: itemIdsToLink.map((materialItemId) => ({
              materialItemId,
            })),
          },
        },
        include: {
          items: { include: { materialItem: true } },
          photos: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'MATERIAL_LOT_CREATED',
          entityType: 'MATERIAL_LOT',
          entityId: createdLot.id,
          details: {
            referenceNumber: createdLot.referenceNumber,
            status: createdLot.status,
            category: createdLot.category,
            weight: createdLot.approximateTotalWeightKg,
            itemsCount: itemIdsToLink.length,
            photosCount: photosToCreate.length,
          },
          ipAddress,
        },
      });

      return createdLot;
    });

    return lot;
  }

  /**
   * List material lots with role-based access control
   * @param {object} user - Authenticated user context
   * @param {object} query - Query parameters
   * @returns {Promise<{ lots: Array<object>, total: number, page: number, limit: number }>}
   */
  async listMaterialLots(user, query = {}) {
    const userId = typeof user === 'string' ? user : (user?.id || user?.userId);
    const userRole = user?.role || ROLES.INFORMAL_COLLECTOR;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    // Role-based filtering
    if (userRole === ROLES.INFORMAL_COLLECTOR) {
      const profile = await this.getCollectorProfileOrThrow(userId);
      where.collectorId = profile.id;
      if (query.status && MATERIAL_LOT_STATUS[query.status]) {
        where.status = query.status;
      }
      if (query.listingPurpose && LISTING_PURPOSE[query.listingPurpose]) {
        where.listingPurpose = query.listingPurpose;
      }
    } else if (userRole === ROLES.CITIZEN) {
      // Citizens discover available reusable/repairable items (OPEN or QUOTED)
      if (query.status && ['OPEN', 'QUOTED'].includes(query.status)) {
        where.status = query.status;
      } else {
        where.status = { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] };
      }
      // Strict separation: Only allow REUSE and REPAIR_REUSE lots for Citizen marketplace
      if (query.listingPurpose && [LISTING_PURPOSE.REUSE, LISTING_PURPOSE.REPAIR_REUSE].includes(query.listingPurpose)) {
        where.listingPurpose = query.listingPurpose;
      } else {
        where.listingPurpose = { in: [LISTING_PURPOSE.REUSE, LISTING_PURPOSE.REPAIR_REUSE] };
      }
    } else if (userRole === ROLES.RECYCLER) {
      // Recyclers discover available recycling marketplace lots (OPEN or QUOTED)
      if (query.status && ['OPEN', 'QUOTED'].includes(query.status)) {
        where.status = query.status;
      } else {
        where.status = { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] };
      }
      // Strict separation: Default to RECYCLING lots
      if (query.listingPurpose && LISTING_PURPOSE[query.listingPurpose]) {
        where.listingPurpose = query.listingPurpose;
      } else {
        where.listingPurpose = LISTING_PURPOSE.RECYCLING;
      }
    } else if (userRole === ROLES.ADMIN) {
      if (query.collectorId) {
        where.collectorId = query.collectorId;
      }
      if (query.status && MATERIAL_LOT_STATUS[query.status]) {
        where.status = query.status;
      }
      if (query.listingPurpose && LISTING_PURPOSE[query.listingPurpose]) {
        where.listingPurpose = query.listingPurpose;
      }
    } else {
      throw AppError.forbidden('Access forbidden: You do not have permission to list material lots');
    }

    if (query.category) {
      if (query.category === 'SMARTPHONE' || query.category === 'MOBILE_PHONE') {
        where.category = 'MOBILE_PHONE';
      } else if (MATERIAL_CATEGORIES[query.category]) {
        where.category = query.category;
      } else {
        return {
          lots: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }

    if (query.condition && ITEM_CONDITIONS[query.condition]) {
      where.condition = query.condition;
    }

    if (query.minWeight || query.maxWeight) {
      where.approximateTotalWeightKg = {};
      if (query.minWeight) where.approximateTotalWeightKg.gte = parseFloat(query.minWeight);
      if (query.maxWeight) where.approximateTotalWeightKg.lte = parseFloat(query.maxWeight);
    }

    if (query.minPrice || query.maxPrice) {
      where.askingPrice = {};
      if (query.minPrice) where.askingPrice.gte = parseFloat(query.minPrice);
      if (query.maxPrice) where.askingPrice.lte = parseFloat(query.maxPrice);
    }

    if (query.search && typeof query.search === 'string' && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { subcategory: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { collector: { city: { contains: s, mode: 'insensitive' } } },
        { collector: { serviceArea: { contains: s, mode: 'insensitive' } } },
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (query.sortBy === 'WEIGHT_HIGH') {
      orderBy = { approximateTotalWeightKg: 'desc' };
    } else if (query.sortBy === 'WEIGHT_LOW') {
      orderBy = { approximateTotalWeightKg: 'asc' };
    } else if (query.sortBy === 'PRICE_HIGH') {
      orderBy = { askingPrice: 'desc' };
    } else if (query.sortBy === 'PRICE_LOW') {
      orderBy = { askingPrice: 'asc' };
    } else if (query.sortBy === 'NEWEST') {
      orderBy = { createdAt: 'desc' };
    } else if (query.sortBy === 'OLDEST') {
      orderBy = { createdAt: 'asc' };
    }

    // Collector contact privacy selection based on role (Shield phone/email for Recyclers and Citizens)
    const collectorSelect = (userRole === ROLES.RECYCLER || userRole === ROLES.CITIZEN)
      ? {
          id: true,
          serviceArea: true,
          city: true,
          state: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        }
      : {
          id: true,
          userId: true,
          serviceArea: true,
          city: true,
          state: true,
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
        };

    const [total, lots] = await Promise.all([
      prisma.materialLot.count({ where }),
      prisma.materialLot.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          photos: true,
          items: { include: { materialItem: true } },
          _count: { select: { quotes: true } },
          collector: {
            select: collectorSelect,
          },
        },
      }),
    ]);

    return {
      lots,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get material lot details by ID
   * @param {object} user - Authenticated user context
   * @param {string} lotId - Material lot UUID
   * @returns {Promise<object>}
   */
  async getMaterialLotById(user, lotId) {
    const userId = typeof user === 'string' ? user : (user?.id || user?.userId);
    const userRole = user?.role || ROLES.INFORMAL_COLLECTOR;

    const lot = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: {
        photos: true,
        items: { include: { materialItem: true } },
        _count: { select: { quotes: true } },
        collector: {
          select: {
            id: true,
            userId: true,
            serviceArea: true,
            city: true,
            state: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: userRole !== ROLES.RECYCLER && userRole !== ROLES.CITIZEN, // Mask phone for recyclers and citizens
              },
            },
          },
        },
      },
    });

    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    // Role-based authorization
    if (userRole === ROLES.INFORMAL_COLLECTOR) {
      const profile = await prisma.collectorProfile.findUnique({
        where: { userId },
      });
      if (!profile || lot.collectorId !== profile.id) {
        throw AppError.forbidden('You can only view your own material lots');
      }
    } else if (userRole === ROLES.CITIZEN) {
      // Citizens can only view non-draft lots listed for REUSE or REPAIR_REUSE
      if (lot.status === MATERIAL_LOT_STATUS.DRAFT) {
        throw AppError.notFound('Material lot not found or not yet listed');
      }
      if (![LISTING_PURPOSE.REUSE, LISTING_PURPOSE.REPAIR_REUSE].includes(lot.listingPurpose)) {
        throw AppError.notFound('Material lot is not available in citizen marketplace');
      }
    } else if (userRole === ROLES.RECYCLER) {
      // Recyclers can view any non-draft lot in the marketplace
      if (lot.status === MATERIAL_LOT_STATUS.DRAFT) {
        throw AppError.notFound('Material lot not found or not yet listed');
      }
    } else if (userRole === ROLES.ADMIN) {
      // Admin supervisory read allowed
    } else {
      throw AppError.forbidden('Access forbidden: Unauthorized to view material lot');
    }

    return lot;
  }

  /**
   * Update a material lot (draft edits and DRAFT -> OPEN transition)
   * @param {string} collectorUserId - Authenticated collector User ID
   * @param {string} lotId - Material lot UUID
   * @param {object} data - Update payload
   * @param {string} [ipAddress] - Client IP
   * @returns {Promise<object>}
   */
  async updateMaterialLot(collectorUserId, lotId, data, ipAddress = null) {
    const userId = typeof collectorUserId === 'string' ? collectorUserId : (collectorUserId?.id || collectorUserId?.userId);
    const collectorProfile = await this.getCollectorProfileOrThrow(userId);

    const existingLot = await prisma.materialLot.findUnique({
      where: { id: lotId },
    });

    if (!existingLot) {
      throw AppError.notFound('Material lot not found');
    }

    if (existingLot.collectorId !== collectorProfile.id) {
      throw AppError.forbidden('You can only edit your own material lots');
    }

    // Status transition rules:
    // In Phase 1, only DRAFT -> DRAFT (editing) and DRAFT -> OPEN (submitting) are permitted.
    // Client cannot jump directly to QUOTED, ACCEPTED, HANDOVER_PENDING, or COMPLETED!
    if (data.status) {
      if (!MATERIAL_LOT_STATUS[data.status]) {
        throw AppError.badRequest(`Invalid status: ${data.status}`, ERROR_CODES.VALIDATION_ERROR);
      }

      if (existingLot.status === MATERIAL_LOT_STATUS.DRAFT) {
        if (data.status !== MATERIAL_LOT_STATUS.DRAFT && data.status !== MATERIAL_LOT_STATUS.OPEN) {
          throw AppError.badRequest(
            `Invalid status transition from DRAFT to ${data.status}. Allowed target in this phase: OPEN`,
            ERROR_CODES.BAD_REQUEST
          );
        }
      } else if (existingLot.status === MATERIAL_LOT_STATUS.OPEN) {
        if (data.status !== MATERIAL_LOT_STATUS.OPEN) {
          throw AppError.badRequest(
            `Lot is already submitted in OPEN status and cannot transition to ${data.status}`,
            ERROR_CODES.BAD_REQUEST
          );
        }
      } else {
        throw AppError.badRequest(
          `Cannot modify lot in status ${existingLot.status}`,
          ERROR_CODES.BAD_REQUEST
        );
      }
    }

    const updateData = {};

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.category) {
      if (!MATERIAL_CATEGORIES[data.category]) {
        throw AppError.badRequest(`Invalid material category: ${data.category}`, ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.category = data.category;
    }

    if (data.subcategory !== undefined) {
      updateData.subcategory = data.subcategory || null;
    }

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    const rawWeight = data.approximateTotalWeightKg !== undefined ? data.approximateTotalWeightKg : data.approximateWeightKg;
    if (rawWeight !== undefined && rawWeight !== null) {
      const weight = parseFloat(rawWeight);
      if (isNaN(weight) || weight <= 0) {
        throw AppError.badRequest('Approximate total weight must be a positive number', ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.approximateTotalWeightKg = weight;
    }

    if (data.condition) {
      if (!ITEM_CONDITIONS[data.condition]) {
        throw AppError.badRequest(`Invalid condition: ${data.condition}`, ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.condition = data.condition;
    }

    if (data.sourceType) {
      if (!MATERIAL_SOURCE_TYPES[data.sourceType]) {
        throw AppError.badRequest(`Invalid source type: ${data.sourceType}`, ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.sourceType = data.sourceType;
    }

    if (data.listingPurpose && LISTING_PURPOSE[data.listingPurpose]) {
      updateData.listingPurpose = data.listingPurpose;
    }

    if (data.askingPrice !== undefined) {
      if (data.askingPrice === null || data.askingPrice === '') {
        updateData.askingPrice = null;
      } else {
        const p = parseFloat(data.askingPrice);
        if (!isNaN(p) && p >= 0) {
          updateData.askingPrice = p;
        }
      }
    }

    if (data.priceUnit !== undefined) {
      updateData.priceUnit = data.priceUnit && PRICE_UNITS[data.priceUnit] ? data.priceUnit : null;
    }

    const updatedLot = await prisma.$transaction(async (tx) => {
      const result = await tx.materialLot.update({
        where: { id: lotId },
        data: updateData,
        include: {
          items: { include: { materialItem: true } },
          photos: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: data.status === MATERIAL_LOT_STATUS.OPEN ? 'MATERIAL_LOT_SUBMITTED' : 'MATERIAL_LOT_UPDATED',
          entityType: 'MATERIAL_LOT',
          entityId: lotId,
          details: updateData,
          ipAddress,
        },
      });

      return result;
    });

    return updatedLot;
  }

  /**
   * Add photos to an existing lot
   * @param {string} collectorUserId - Authenticated collector User ID
   * @param {string} lotId - Material lot UUID
   * @param {Array<object>} photos - Array of photo objects
   * @returns {Promise<Array<object>>} Created photo records
   */
  async addLotPhotos(collectorUserId, lotId, photos) {
    const userId = typeof collectorUserId === 'string' ? collectorUserId : (collectorUserId?.id || collectorUserId?.userId);
    const collectorProfile = await this.getCollectorProfileOrThrow(userId);

    const lot = await prisma.materialLot.findUnique({ where: { id: lotId } });
    if (!lot) {
      throw AppError.notFound('Material lot not found');
    }

    if (lot.collectorId !== collectorProfile.id) {
      throw AppError.forbidden('You can only add photos to your own material lots');
    }

    if (!Array.isArray(photos) || photos.length === 0) {
      throw AppError.badRequest('At least one photo must be provided', ERROR_CODES.VALIDATION_ERROR);
    }

    const createdPhotos = [];
    for (const p of photos) {
      const photoUrl = typeof p === 'string' ? p : p.photoUrl || p.url || p.imageUrl;
      if (!photoUrl) continue;

      const photoRecord = await prisma.materialLotPhoto.create({
        data: {
          lotId,
          photoUrl,
          storagePath: p.storagePath || null,
          fileSize: p.fileSize ? parseInt(p.fileSize, 10) : null,
          mimeType: p.mimeType || 'image/jpeg',
          capturedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
        },
      });
      createdPhotos.push(photoRecord);
    }

    return createdPhotos;
  }

  /**
   * Get marketplace dashboard metrics for Collector or Recycler (Phase 3)
   * @param {object} user - Authenticated user
   * @returns {Promise<object>}
   */
  async getMarketplaceOverview(user) {
    if (user.role === ROLES.INFORMAL_COLLECTOR) {
      const collectorProfile = await this.getCollectorProfileOrThrow(user.id);
      const collectorId = collectorProfile.id;

      const [
        activeListings,
        offersReceived,
        activeNegotiations,
        acceptedDeals,
        completedSales,
        recentListings,
      ] = await Promise.all([
        prisma.materialLot.count({
          where: { collectorId, status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] } },
        }),
        prisma.quote.count({
          where: {
            materialLot: { collectorId },
            status: { in: ['SENT', 'VIEWED'] },
          },
        }),
        prisma.quote.count({
          where: {
            materialLot: { collectorId },
            status: { in: ['SENT', 'VIEWED'] },
            notes: { contains: 'Counter' },
          },
        }),
        prisma.materialLot.count({
          where: { collectorId, status: { in: [MATERIAL_LOT_STATUS.ACCEPTED, MATERIAL_LOT_STATUS.HANDOVER_PENDING] } },
        }),
        prisma.materialLot.count({
          where: { collectorId, status: MATERIAL_LOT_STATUS.COMPLETED },
        }),
        prisma.materialLot.findMany({
          where: {
            collectorId,
            status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED, MATERIAL_LOT_STATUS.ACCEPTED] },
          },
          include: {
            _count: { select: { quotes: true } },
            quotes: {
              where: { status: { in: ['SENT', 'VIEWED', 'ACCEPTED'] } },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                quotedUnitPrice: true,
                unit: true,
                status: true,
                updatedAt: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

      return {
        role: 'INFORMAL_COLLECTOR',
        metrics: {
          activeListings,
          offersReceived,
          activeNegotiations,
          acceptedDeals,
          completedSales,
        },
        recentListings: recentListings.map((lot) => ({
          id: lot.id,
          referenceNumber: lot.referenceNumber,
          category: lot.category,
          subcategory: lot.subcategory,
          weightKg: lot.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : null,
          status: lot.status,
          offerCount: lot._count.quotes,
          latestOffer: lot.quotes[0]
            ? {
                rate: Number(lot.quotes[0].quotedUnitPrice),
                unit: lot.quotes[0].unit,
                timestamp: lot.quotes[0].updatedAt,
              }
            : null,
          updatedAt: lot.updatedAt,
          createdAt: lot.createdAt,
        })),
      };
    } else if (user.role === ROLES.RECYCLER) {
      const recyclerProfile = await prisma.recyclerProfile.findFirst({
        where: { userId: user.id },
      });

      const [
        availableLots,
        newToday,
        myActiveOffers,
        categoryGroups,
      ] = await Promise.all([
        prisma.materialLot.count({
          where: { status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] } },
        }),
        prisma.materialLot.count({
          where: {
            status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        recyclerProfile
          ? prisma.quote.count({
              where: {
                recyclerId: recyclerProfile.id,
                status: { in: ['SENT', 'VIEWED'] },
              },
            })
          : 0,
        prisma.materialLot.groupBy({
          by: ['category'],
          where: { status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] } },
          _count: { id: true },
        }),
      ]);

      let nearbyLots = 0;
      if (recyclerProfile && (recyclerProfile.city || recyclerProfile.serviceArea)) {
        const queryOr = [];
        if (recyclerProfile.city) {
          queryOr.push({ collector: { city: recyclerProfile.city } });
        }
        if (recyclerProfile.serviceArea) {
          queryOr.push({ collector: { serviceArea: { contains: recyclerProfile.serviceArea, mode: 'insensitive' } } });
        }
        if (queryOr.length > 0) {
          nearbyLots = await prisma.materialLot.count({
            where: {
              status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] },
              OR: queryOr,
            },
          });
        }
      }

      return {
        role: 'RECYCLER',
        metrics: {
          availableLots,
          nearbyLots,
          newToday,
          myActiveOffers,
        },
        categoryBreakdown: categoryGroups.map((g) => ({
          category: g.category,
          count: g._count.id,
        })),
      };
    }

    return { role: user.role, metrics: {} };
  }

  /**
   * Get factual market statistics for a material category/subcategory (Phase 3)
   * @param {string} category
   * @param {string} [subcategory]
   * @returns {Promise<object>}
   */
  async getMaterialMarketStats(category, subcategory = null) {
    if (!category || !MATERIAL_CATEGORIES[category]) {
      throw AppError.badRequest(`Invalid material category: ${category}`);
    }

    const whereLot = {
      category,
      ...(subcategory ? { subcategory } : {}),
    };

    const [
      availableLotsCount,
      activeBuyerOffersCount,
      completedSalesCount,
      activeRecyclerRatesCount,
      marketPriceRecord,
      latestCompletedTransaction,
    ] = await Promise.all([
      prisma.materialLot.count({
        where: { ...whereLot, status: { in: [MATERIAL_LOT_STATUS.OPEN, MATERIAL_LOT_STATUS.QUOTED] } },
      }),
      prisma.quote.count({
        where: {
          materialLot: whereLot,
          status: { in: ['SENT', 'VIEWED'] },
        },
      }),
      prisma.materialLot.count({
        where: { ...whereLot, status: MATERIAL_LOT_STATUS.COMPLETED },
      }),
      prisma.priceData.count({
        where: { category, ...(subcategory ? { subcategory } : {}), source: 'RECYCLER_OFFER', status: 'ACTIVE' },
      }),
      prisma.priceData.findFirst({
        where: { category, ...(subcategory ? { subcategory } : {}), status: 'ACTIVE' },
        orderBy: { effectiveDate: 'desc' },
      }),
      prisma.transactionRecord.findFirst({
        where: {
          transactionStatus: 'RECORDED',
          materialLot: whereLot,
        },
        include: { quote: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let verifiedStandard = null;
    if (marketPriceRecord) {
      const sourceLabel = marketPriceRecord.source === 'ADMIN_VERIFIED'
        ? (marketPriceRecord.sourceReference ? `Admin Price Standard (${marketPriceRecord.sourceReference})` : 'Admin Price Standard')
        : marketPriceRecord.source === 'RECYCLER_OFFER'
        ? 'Recycler Posted Rate'
        : 'Historical Platform Data';

      verifiedStandard = {
        buyingPrice: Number(marketPriceRecord.buyingPrice),
        unit: marketPriceRecord.unit,
        sourceLabel,
        effectiveDate: marketPriceRecord.effectiveDate,
      };
    }

    return {
      category,
      subcategory: subcategory || null,
      availableLotsCount,
      activeBuyerOffersCount,
      recentCompletedSalesCount: completedSalesCount,
      activeRecyclerRatesCount,
      verifiedPriceStandard: verifiedStandard,
      latestTransactionRate: latestCompletedTransaction?.quote
        ? {
            rate: Number(latestCompletedTransaction.quote.quotedUnitPrice),
            unit: latestCompletedTransaction.quote.unit,
            timestamp: latestCompletedTransaction.createdAt,
          }
        : null,
    };
  }
}

module.exports = new MaterialLotService();
