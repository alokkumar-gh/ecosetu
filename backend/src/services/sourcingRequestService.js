// EcoSetu Sourcing Request & Demand Discovery Service
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6: Demand Discovery & Recurring Trade

const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const {
  ROLES,
  SOURCING_REQUEST_STATUS,
  SOURCING_RESPONSE_STATUS,
  AUDIT_ACTIONS,
  MATERIAL_CATEGORIES,
  ITEM_CONDITIONS,
  PRICE_UNITS,
  RECYCLER_AUTHORIZATION_STATUS,
} = require('../utils/constants');

class SourcingRequestService {
  /**
   * Generate unique, human-readable sourcing request reference number (SRC-YYYYMM-XXXXX)
   * @returns {string}
   */
  generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `SRC-${year}${month}-${randomHex}`;
  }

  /**
   * Generate unique, human-readable sourcing response reference number (RES-YYYYMM-XXXXX)
   * @returns {string}
   */
  generateResponseReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    return `RES-${year}${month}-${randomHex}`;
  }

  /**
   * Helper: Resolve Actor to full user record
   */
  async resolveActor(actor) {
    if (!actor) {
      throw AppError.unauthorized('Authentication required');
    }
    if (typeof actor === 'string') {
      const user = await prisma.user.findUnique({ where: { id: actor } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      return user;
    }
    if (!actor.role && actor.id) {
      const user = await prisma.user.findUnique({ where: { id: actor.id } });
      if (!user) {
        throw AppError.unauthorized('User not found');
      }
      return user;
    }
    return actor;
  }

  /**
   * Helper: Get Collector Profile by User ID
   */
  async getCollectorProfileOrThrow(userId) {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) {
      throw AppError.forbidden('Collector profile not found for this account');
    }
    return profile;
  }

  /**
   * Helper: Get Recycler Profile by User ID
   */
  async getRecyclerProfileOrThrow(userId) {
    const profile = await prisma.recyclerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) {
      throw AppError.forbidden('Recycler profile not found for this account');
    }
    return profile;
  }

  /**
   * Helper: Auto-expire outdated sourcing requests
   */
  async autoExpireRequests() {
    try {
      const now = new Date();
      await prisma.sourcingRequest.updateMany({
        where: {
          status: SOURCING_REQUEST_STATUS.OPEN,
          requestedByDate: {
            lt: now,
          },
        },
        data: {
          status: SOURCING_REQUEST_STATUS.EXPIRED,
        },
      });
    } catch (err) {
      logger.error('Error auto-expiring sourcing requests:', err);
    }
  }

  /**
   * Create a new Sourcing Request (Recycler only)
   * @param {object|string} actor
   * @param {object} data
   */
  async createRequest(actor, data) {
    const user = await this.resolveActor(actor);

    // Only authorized recyclers or Admin can create sourcing requests
    if (user.role !== ROLES.RECYCLER && user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Only verified recyclers can create sourcing requests');
    }

    let recyclerProfile;
    if (user.role === ROLES.RECYCLER) {
      recyclerProfile = await this.getRecyclerProfileOrThrow(user.id);
      if (
        recyclerProfile.authorizationStatus !== RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED &&
        recyclerProfile.authorizationStatus !== RECYCLER_AUTHORIZATION_STATUS.PROVISIONAL
      ) {
        throw AppError.forbidden('Your recycler authorization status does not permit creating sourcing requests');
      }
    } else if (data.recyclerId) {
      recyclerProfile = await prisma.recyclerProfile.findUnique({
        where: { id: data.recyclerId },
        include: { user: true },
      });
      if (!recyclerProfile) {
        throw AppError.notFound('Specified recycler profile not found');
      }
    } else {
      throw AppError.badRequest('Admin must supply recyclerId');
    }

    const {
      materialCategory,
      materialSubcategory,
      condition = ITEM_CONDITIONS.UNKNOWN,
      minimumWeightKg,
      targetWeightKg,
      maximumWeightKg,
      requestedByDate,
      pickupRequired = false,
      pickupArea,
      offeredRatePerKg,
      rateUnit = PRICE_UNITS.PER_KG,
      notes,
      status: requestedStatus,
      isDraft = false,
    } = data;

    if (!materialCategory || !Object.values(MATERIAL_CATEGORIES).includes(materialCategory)) {
      throw AppError.badRequest(`Invalid material category. Must be one of: ${Object.values(MATERIAL_CATEGORIES).join(', ')}`);
    }

    const minWeight = Number(minimumWeightKg);
    if (isNaN(minWeight) || minWeight <= 0) {
      throw AppError.badRequest('minimumWeightKg must be a positive number');
    }

    if (targetWeightKg !== undefined && targetWeightKg !== null && targetWeightKg !== '') {
      const tgtWeight = Number(targetWeightKg);
      if (isNaN(tgtWeight) || tgtWeight < minWeight) {
        throw AppError.badRequest('targetWeightKg cannot be less than minimumWeightKg');
      }
    }

    if (maximumWeightKg !== undefined && maximumWeightKg !== null && maximumWeightKg !== '') {
      const maxWeight = Number(maximumWeightKg);
      const comparisonWeight = targetWeightKg ? Number(targetWeightKg) : minWeight;
      if (isNaN(maxWeight) || maxWeight < comparisonWeight) {
        throw AppError.badRequest('maximumWeightKg cannot be less than minimum or target weight');
      }
    }

    let reqDate = null;
    if (requestedByDate) {
      reqDate = new Date(requestedByDate);
      if (isNaN(reqDate.getTime())) {
        throw AppError.badRequest('Invalid requestedByDate timestamp');
      }
    }

    let rate = null;
    if (offeredRatePerKg !== undefined && offeredRatePerKg !== null && offeredRatePerKg !== '') {
      rate = Number(offeredRatePerKg);
      if (isNaN(rate) || rate <= 0) {
        throw AppError.badRequest('offeredRatePerKg must be a positive number when supplied');
      }
    }

    let initialStatus = SOURCING_REQUEST_STATUS.OPEN;
    if (isDraft || requestedStatus === SOURCING_REQUEST_STATUS.DRAFT) {
      initialStatus = SOURCING_REQUEST_STATUS.DRAFT;
    }

    const referenceNumber = this.generateReferenceNumber();

    const sourcingRequest = await prisma.sourcingRequest.create({
      data: {
        referenceNumber,
        recyclerId: recyclerProfile.id,
        materialCategory,
        materialSubcategory: materialSubcategory ? String(materialSubcategory).trim() : null,
        condition,
        minimumWeightKg: minWeight,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
        maximumWeightKg: maximumWeightKg ? Number(maximumWeightKg) : null,
        requestedByDate: reqDate,
        pickupRequired: Boolean(pickupRequired),
        pickupArea: pickupArea ? String(pickupArea).trim() : recyclerProfile.serviceArea || null,
        offeredRatePerKg: rate,
        rateUnit: rate ? rateUnit : PRICE_UNITS.PER_KG,
        notes: notes ? String(notes).trim() : null,
        status: initialStatus,
        createdById: user.id,
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
      actorId: user.id,
      action: AUDIT_ACTIONS.SOURCING_REQUEST_CREATED,
      entityType: 'SourcingRequest',
      entityId: sourcingRequest.id,
      details: {
        referenceNumber,
        recyclerId: recyclerProfile.id,
        category: materialCategory,
        minWeight,
        status: initialStatus,
      },
    });

    logger.info(`[SourcingRequestService] Request ${referenceNumber} created by recycler ${recyclerProfile.facilityName}`);

    return this.formatRequest(sourcingRequest, user);
  }

  /**
   * Get Sourcing Requests (Demand Feed for Collectors, Management for Recyclers)
   * @param {object|string} actor
   * @param {object} filters
   * @param {object} pagination
   */
  async getRequests(actor, filters = {}, pagination = {}) {
    const user = await this.resolveActor(actor);
    await this.autoExpireRequests();

    const { page = 1, limit = 20 } = pagination;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const take = Math.max(1, Math.min(100, parseInt(limit, 10)));

    const where = {};

    // Filter by own requests vs public feed
    if (filters.myRequests === 'true' || filters.myRequests === true) {
      if (user.role === ROLES.RECYCLER) {
        const recycler = await this.getRecyclerProfileOrThrow(user.id);
        where.recyclerId = recycler.id;
      } else if (user.role === ROLES.INFORMAL_COLLECTOR) {
        const collector = await this.getCollectorProfileOrThrow(user.id);
        where.responses = {
          some: {
            collectorId: collector.id,
          },
        };
      }
    } else {
      // Public collector demand feed: only OPEN requests
      if (user.role !== ROLES.ADMIN) {
        where.status = SOURCING_REQUEST_STATUS.OPEN;
        where.OR = [
          { requestedByDate: null },
          { requestedByDate: { gte: new Date() } },
        ];
      }
    }

    if (filters.status && Object.values(SOURCING_REQUEST_STATUS).includes(filters.status)) {
      where.status = filters.status;
    }

    if (filters.category && Object.values(MATERIAL_CATEGORIES).includes(filters.category)) {
      where.materialCategory = filters.category;
    }

    if (filters.condition && Object.values(ITEM_CONDITIONS).includes(filters.condition)) {
      where.condition = filters.condition;
    }

    if (filters.pickupRequired !== undefined && filters.pickupRequired !== '') {
      where.pickupRequired = filters.pickupRequired === 'true' || filters.pickupRequired === true;
    }

    if (filters.minWeight) {
      where.minimumWeightKg = { gte: Number(filters.minWeight) };
    }

    if (filters.search) {
      const q = String(filters.search).trim();
      where.OR = [
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { materialSubcategory: { contains: q, mode: 'insensitive' } },
        { pickupArea: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, requests] = await Promise.all([
      prisma.sourcingRequest.count({ where }),
      prisma.sourcingRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          recycler: {
            select: {
              id: true,
              facilityName: true,
              city: true,
              state: true,
              serviceArea: true,
              authorizationStatus: true,
            },
          },
          _count: {
            select: {
              responses: true,
            },
          },
        },
      }),
    ]);

    return {
      requests: requests.map((req) => this.formatRequest(req, user)),
      pagination: {
        total,
        page: Math.max(1, parseInt(page, 10)),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get single Sourcing Request by ID
   * @param {object|string} actor
   * @param {string} id
   */
  async getRequestById(actor, id) {
    const user = await this.resolveActor(actor);
    await this.autoExpireRequests();

    const request = await prisma.sourcingRequest.findUnique({
      where: { id },
      include: {
        recycler: {
          select: {
            id: true,
            userId: true,
            facilityName: true,
            facilityAddress: true,
            city: true,
            state: true,
            serviceArea: true,
            authorizationStatus: true,
            operationalPhone: true,
          },
        },
        responses: {
          orderBy: { createdAt: 'desc' },
          include: {
            collector: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw AppError.notFound('Sourcing request not found');
    }

    return this.formatRequestDetail(request, user);
  }

  /**
   * Update Sourcing Request Status / Details (Recycler only)
   * @param {object|string} actor
   * @param {string} id
   * @param {object} updates
   */
  async updateRequest(actor, id, updates) {
    const user = await this.resolveActor(actor);
    const request = await prisma.sourcingRequest.findUnique({
      where: { id },
      include: { recycler: true },
    });

    if (!request) {
      throw AppError.notFound('Sourcing request not found');
    }

    if (user.role !== ROLES.ADMIN && request.recycler.userId !== user.id) {
      throw AppError.forbidden('You are not authorized to modify this sourcing request');
    }

    const { status, notes, requestedByDate, pickupArea, offeredRatePerKg } = updates;
    const dataToUpdate = {};

    if (status && status !== request.status) {
      if (!Object.values(SOURCING_REQUEST_STATUS).includes(status)) {
        throw AppError.badRequest(`Invalid status: ${status}`);
      }

      // State transition enforcement
      if (request.status === SOURCING_REQUEST_STATUS.CANCELLED || request.status === SOURCING_REQUEST_STATUS.FULFILLED) {
        throw AppError.badRequest(`Cannot modify a ${request.status} sourcing request`);
      }

      if (status === SOURCING_REQUEST_STATUS.OPEN) {
        if (request.status === SOURCING_REQUEST_STATUS.EXPIRED) {
          if (!requestedByDate && (!request.requestedByDate || request.requestedByDate < new Date())) {
            throw AppError.badRequest('Cannot reopen an expired request without extending requestedByDate');
          }
        }
      }

      dataToUpdate.status = status;
      if (status === SOURCING_REQUEST_STATUS.CANCELLED) {
        dataToUpdate.cancelledAt = new Date();
        dataToUpdate.cancellationReason = updates.cancellationReason || 'Cancelled by buyer';
      } else if (status === SOURCING_REQUEST_STATUS.FULFILLED) {
        dataToUpdate.fulfilledAt = new Date();
      }
    }

    if (notes !== undefined) dataToUpdate.notes = String(notes).trim();
    if (pickupArea !== undefined) dataToUpdate.pickupArea = String(pickupArea).trim();
    if (requestedByDate !== undefined) {
      dataToUpdate.requestedByDate = requestedByDate ? new Date(requestedByDate) : null;
    }
    if (offeredRatePerKg !== undefined) {
      dataToUpdate.offeredRatePerKg = offeredRatePerKg ? Number(offeredRatePerKg) : null;
    }

    const updated = await prisma.sourcingRequest.update({
      where: { id },
      data: dataToUpdate,
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
      actorId: user.id,
      action: AUDIT_ACTIONS.SOURCING_REQUEST_STATUS_UPDATED,
      entityType: 'SourcingRequest',
      entityId: updated.id,
      details: {
        previousStatus: request.status,
        newStatus: updated.status,
      },
    });

    logger.info(`[SourcingRequestService] Request ${request.referenceNumber} status updated to ${updated.status}`);

    return this.formatRequest(updated, user);
  }

  /**
   * Collector responds to a Sourcing Request
   * @param {object|string} actor
   * @param {string} requestId
   * @param {object} data
   */
  async respondToRequest(actor, requestId, data) {
    const user = await this.resolveActor(actor);

    if (user.role !== ROLES.INFORMAL_COLLECTOR && user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Only registered informal collectors can respond to sourcing requests');
    }

    const collectorProfile = await this.getCollectorProfileOrThrow(user.id);
    await this.autoExpireRequests();

    const request = await prisma.sourcingRequest.findUnique({
      where: { id: requestId },
      include: { recycler: { include: { user: true } } },
    });

    if (!request) {
      throw AppError.notFound('Sourcing request not found');
    }

    if (request.status !== SOURCING_REQUEST_STATUS.OPEN) {
      throw AppError.badRequest(`Cannot respond to a sourcing request with status ${request.status}`);
    }

    if (request.requestedByDate && request.requestedByDate < new Date()) {
      throw AppError.badRequest('This sourcing request has expired and is no longer accepting responses');
    }

    // Duplicate Active Response Prevention
    const existingActiveResponse = await prisma.sourcingResponse.findFirst({
      where: {
        sourcingRequestId: requestId,
        collectorId: collectorProfile.id,
        status: {
          in: [
            SOURCING_RESPONSE_STATUS.PENDING,
            SOURCING_RESPONSE_STATUS.REVIEWED,
            SOURCING_RESPONSE_STATUS.QUOTE_REQUESTED,
          ],
        },
      },
    });

    if (existingActiveResponse) {
      throw AppError.badRequest(
        `You have already submitted an active response (${existingActiveResponse.referenceNumber}) to this request. Please update your existing response if details have changed.`
      );
    }

    const {
      availableWeightKg,
      condition = request.condition || ITEM_CONDITIONS.UNKNOWN,
      pickupAddress,
      latitude,
      longitude,
      availableDate,
      notes,
      materialLotId,
    } = data;

    const weight = Number(availableWeightKg);
    if (isNaN(weight) || weight <= 0) {
      throw AppError.badRequest('availableWeightKg must be a positive number');
    }

    let availDate = null;
    if (availableDate) {
      availDate = new Date(availableDate);
      if (isNaN(availDate.getTime())) {
        throw AppError.badRequest('Invalid availableDate timestamp');
      }
    }

    // If collector optionally links an existing open lot
    let validLotId = null;
    if (materialLotId) {
      const lot = await prisma.materialLot.findUnique({
        where: { id: materialLotId },
      });
      if (lot && lot.collectorId === collectorProfile.id) {
        validLotId = lot.id;
      }
    }

    const referenceNumber = this.generateResponseReferenceNumber();

    const response = await prisma.sourcingResponse.create({
      data: {
        referenceNumber,
        sourcingRequestId: request.id,
        collectorId: collectorProfile.id,
        availableWeightKg: weight,
        condition,
        pickupAddress: pickupAddress ? String(pickupAddress).trim() : collectorProfile.serviceArea || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        availableDate: availDate,
        notes: notes ? String(notes).trim() : null,
        status: SOURCING_RESPONSE_STATUS.PENDING,
        materialLotId: validLotId,
        createdById: user.id,
      },
      include: {
        sourcingRequest: true,
        collector: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    await auditService.logAction({
      actorId: user.id,
      action: AUDIT_ACTIONS.SOURCING_RESPONSE_CREATED,
      entityType: 'SourcingResponse',
      entityId: response.id,
      details: {
        referenceNumber,
        requestId: request.id,
        requestRef: request.referenceNumber,
        availableWeightKg: weight,
      },
    });

    // Notify the buyer
    try {
      await notificationService.createNotification({
        userId: request.recycler.userId,
        type: 'SOURCING_RESPONSE_RECEIVED',
        title: 'New Response to Sourcing Request',
        message: `Collector responded with ${weight} kg of ${request.materialCategory} for request ${request.referenceNumber}`,
        referenceType: 'SourcingRequest',
        referenceId: request.id,
      });
    } catch (notifErr) {
      logger.warn('Failed to send notification for sourcing response:', notifErr);
    }

    logger.info(`[SourcingRequestService] Collector ${collectorProfile.id} responded to request ${request.referenceNumber} (${weight} kg)`);

    return this.formatResponse(response, user);
  }

  /**
   * Update Sourcing Response (Collector updates details or Recycler updates status)
   * @param {object|string} actor
   * @param {string} responseId
   * @param {object} updates
   */
  async updateResponse(actor, responseId, updates) {
    const user = await this.resolveActor(actor);

    const response = await prisma.sourcingResponse.findUnique({
      where: { id: responseId },
      include: {
        sourcingRequest: {
          include: {
            recycler: true,
          },
        },
        collector: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!response) {
      throw AppError.notFound('Sourcing response not found');
    }

    const isCollectorOwner = response.collector.userId === user.id;
    const isRecyclerOwner = response.sourcingRequest.recycler.userId === user.id;
    const isAdmin = user.role === ROLES.ADMIN;

    if (!isCollectorOwner && !isRecyclerOwner && !isAdmin) {
      throw AppError.forbidden('You are not authorized to modify this response');
    }

    const dataToUpdate = {};

    // Collector modifications
    if (isCollectorOwner) {
      if (response.status !== SOURCING_RESPONSE_STATUS.PENDING) {
        throw AppError.badRequest(`Cannot modify response after it has been ${response.status.toLowerCase()}`);
      }

      if (updates.availableWeightKg) {
        const w = Number(updates.availableWeightKg);
        if (isNaN(w) || w <= 0) throw AppError.badRequest('availableWeightKg must be a positive number');
        dataToUpdate.availableWeightKg = w;
      }
      if (updates.condition) dataToUpdate.condition = updates.condition;
      if (updates.pickupAddress !== undefined) dataToUpdate.pickupAddress = updates.pickupAddress;
      if (updates.notes !== undefined) dataToUpdate.notes = updates.notes;
      if (updates.availableDate !== undefined) {
        dataToUpdate.availableDate = updates.availableDate ? new Date(updates.availableDate) : null;
      }
      if (updates.status === SOURCING_RESPONSE_STATUS.CANCELLED) {
        dataToUpdate.status = SOURCING_RESPONSE_STATUS.CANCELLED;
      }
    }

    // Recycler status updates
    if (isRecyclerOwner || isAdmin) {
      if (updates.status && Object.values(SOURCING_RESPONSE_STATUS).includes(updates.status)) {
        dataToUpdate.status = updates.status;
      }
      if (updates.materialLotId) {
        dataToUpdate.materialLotId = updates.materialLotId;
      }
    }

    const updated = await prisma.sourcingResponse.update({
      where: { id: responseId },
      data: dataToUpdate,
      include: {
        sourcingRequest: true,
        collector: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    await auditService.logAction({
      actorId: user.id,
      action: AUDIT_ACTIONS.SOURCING_RESPONSE_UPDATED,
      entityType: 'SourcingResponse',
      entityId: updated.id,
      details: {
        newStatus: updated.status,
      },
    });

    return this.formatResponse(updated, user);
  }

  /**
   * Helper: Format request for API response with contact privacy protection
   */
  formatRequest(request, actor) {
    const isRecyclerOwner = request.recycler?.userId === actor?.id || request.recyclerId === actor?.recyclerProfile?.id;
    const isAdmin = actor?.role === ROLES.ADMIN;

    const responseCount = request._count ? request._count.responses : (request.responses ? request.responses.length : 0);

    return {
      id: request.id,
      referenceNumber: request.referenceNumber,
      recyclerId: request.recyclerId,
      materialCategory: request.materialCategory,
      materialSubcategory: request.materialSubcategory || null,
      condition: request.condition,
      minimumWeightKg: Number(request.minimumWeightKg),
      targetWeightKg: request.targetWeightKg ? Number(request.targetWeightKg) : null,
      maximumWeightKg: request.maximumWeightKg ? Number(request.maximumWeightKg) : null,
      requestedByDate: request.requestedByDate,
      pickupRequired: request.pickupRequired,
      pickupArea: request.pickupArea || null,
      offeredRatePerKg: request.offeredRatePerKg ? Number(request.offeredRatePerKg) : null,
      rateUnit: request.rateUnit || PRICE_UNITS.PER_KG,
      hasOfferedPrice: Boolean(request.offeredRatePerKg),
      priceDisplay: request.offeredRatePerKg
        ? `₹${Number(request.offeredRatePerKg).toFixed(2)} / ${request.rateUnit === PRICE_UNITS.PER_UNIT ? 'Unit' : 'Kg'}`
        : 'Price discussed after response',
      notes: request.notes || null,
      status: request.status,
      responseCount,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      cancelledAt: request.cancelledAt || null,
      cancellationReason: request.cancellationReason || null,
      fulfilledAt: request.fulfilledAt || null,
      recycler: request.recycler
        ? {
            id: request.recycler.id,
            facilityName: request.recycler.facilityName,
            city: request.recycler.city || null,
            state: request.recycler.state || null,
            serviceArea: request.recycler.serviceArea || null,
            authorizationStatus: request.recycler.authorizationStatus,
          }
        : null,
    };
  }

  /**
   * Helper: Format full request detail including responses
   */
  formatRequestDetail(request, actor) {
    const base = this.formatRequest(request, actor);
    const isOwner = request.recycler?.userId === actor?.id;
    const isAdmin = actor?.role === ROLES.ADMIN;

    let responses = [];
    if (isOwner || isAdmin) {
      responses = (request.responses || []).map((res) => this.formatResponse(res, actor));
    } else if (actor?.role === ROLES.INFORMAL_COLLECTOR) {
      // Collector only sees their own response if one exists
      responses = (request.responses || [])
        .filter((res) => res.collector?.userId === actor.id)
        .map((res) => this.formatResponse(res, actor));
    }

    return {
      ...base,
      responses,
    };
  }

  /**
   * Helper: Format response with privacy masking
   */
  formatResponse(response, actor) {
    const isCollectorOwner = response.collector?.userId === actor?.id;
    const isRecyclerOwner = response.sourcingRequest?.recycler?.userId === actor?.id;
    const isAdmin = actor?.role === ROLES.ADMIN;

    let maskedPhone = 'Protected';
    if (response.collector?.user?.phone) {
      const raw = response.collector.user.phone;
      if (isCollectorOwner || isRecyclerOwner || isAdmin) {
        maskedPhone = raw;
      } else {
        maskedPhone = raw.length > 4 ? `${raw.slice(0, 3)}****${raw.slice(-2)}` : '****';
      }
    }

    return {
      id: response.id,
      referenceNumber: response.referenceNumber,
      sourcingRequestId: response.sourcingRequestId,
      collectorId: response.collectorId,
      availableWeightKg: Number(response.availableWeightKg),
      condition: response.condition,
      pickupAddress: response.pickupAddress || null,
      latitude: response.latitude ? Number(response.latitude) : null,
      longitude: response.longitude ? Number(response.longitude) : null,
      availableDate: response.availableDate || null,
      notes: response.notes || null,
      status: response.status,
      materialLotId: response.materialLotId || null,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      collector: response.collector
        ? {
            id: response.collector.id,
            name: response.collector.user?.name || 'Verified Collector',
            phone: maskedPhone,
            serviceArea: response.collector.serviceArea || null,
          }
        : null,
      sourcingRequest: response.sourcingRequest
        ? {
            id: response.sourcingRequest.id,
            referenceNumber: response.sourcingRequest.referenceNumber,
            materialCategory: response.sourcingRequest.materialCategory,
            minimumWeightKg: Number(response.sourcingRequest.minimumWeightKg),
            status: response.sourcingRequest.status,
          }
        : null,
    };
  }
}

module.exports = new SourcingRequestService();
