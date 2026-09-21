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
        category: data.category,
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
    if (!data.category || !MATERIAL_CATEGORIES[data.category]) {
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
          category: data.category,
          subcategory: data.subcategory || null,
          description: data.description || null,
          approximateWeightKg: weight,
          condition,
          sourceType,
        },
      });
      itemIdsToLink.push(inlineItem.id);
    }

    // Create lot with transactions
    const lot = await prisma.$transaction(async (tx) => {
      const createdLot = await tx.materialLot.create({
        data: {
          referenceNumber,
          clientReferenceId: data.clientReferenceId || null,
          collectorId: collectorProfile.id,
          status,
          category: data.category,
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
    } else if (userRole === ROLES.ADMIN) {
      if (query.collectorId) {
        where.collectorId = query.collectorId;
      }
    } else {
      // Recyclers or Citizens cannot browse lots broadly in Phase 1
      throw AppError.forbidden('Access forbidden: You do not have permission to list material lots');
    }

    if (query.status && MATERIAL_LOT_STATUS[query.status]) {
      where.status = query.status;
    }

    if (query.category && MATERIAL_CATEGORIES[query.category]) {
      where.category = query.category;
    }

    const [total, lots] = await Promise.all([
      prisma.materialLot.count({ where }),
      prisma.materialLot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          photos: true,
          items: { include: { materialItem: true } },
          collector: {
            select: {
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
            },
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
    } else if (userRole === ROLES.ADMIN) {
      // Admin supervisory read allowed
    } else {
      // Recyclers or Citizens cannot view lots in Phase 1
      throw AppError.forbidden('Access forbidden: Recyclers cannot access material lots until quotation phase');
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

    if (data.collectionLat !== undefined && data.collectionLat !== null) {
      const lat = parseFloat(data.collectionLat);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw AppError.badRequest('Latitude must be between -90 and 90 degrees', ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.collectionLat = lat;
    }

    if (data.collectionLng !== undefined && data.collectionLng !== null) {
      const lng = parseFloat(data.collectionLng);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw AppError.badRequest('Longitude must be between -180 and 180 degrees', ERROR_CODES.VALIDATION_ERROR);
      }
      updateData.collectionLng = lng;
    }

    if (data.collectionAccuracy !== undefined && data.collectionAccuracy !== null) {
      const acc = parseFloat(data.collectionAccuracy);
      if (!isNaN(acc) && acc >= 0) {
        updateData.collectionAccuracy = acc;
      }
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
}

module.exports = new MaterialLotService();
