// EcoSetu Collection Request Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.6, docs/05_API_SPECIFICATION.md Section 7, docs/07_BUSINESS_WORKFLOWS.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');
const { calculateDistanceKm, formatAddress } = require('../utils/locationHelper');
const { ROLES, REQUEST_STATUS, ITEM_STATUS, PICKUP_STATUS, NOTIFICATION_TYPES } = require('../utils/constants');

class RequestService {
  /**
   * Create a new collection request in DRAFT status
   * @param {string} citizenId - Citizen user UUID
   * @param {object} requestData - Request payload
   * @returns {Promise<object>} Created collection request with linked items
   */
  async createRequest(
    citizenId,
    {
      itemIds,
      pickupAddress,
      pickupLat,
      pickupLng,
      preferredDate,
      preferredTimeStart,
      preferredTimeEnd,
      notes,
      houseNumber,
      street,
      landmark,
      city,
      district,
      state,
      pincode,
      locationAccuracy,
      addressType,
    }
  ) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw AppError.validation('At least one e-waste item is required to create a collection request');
    }

    // 1. Verify all items exist and belong to authenticated citizen
    const items = await prisma.ewasteItem.findMany({
      where: {
        id: { in: itemIds },
      },
    });

    if (items.length !== itemIds.length) {
      throw AppError.validation('One or more selected items were not found');
    }

    for (const item of items) {
      if (item.citizenId !== citizenId) {
        throw AppError.forbidden('You cannot add items belonging to another user');
      }

      // 2. Enforce EC-CR-06: Check items are not already associated with an active request
      if (item.collectionRequestId) {
        throw AppError.conflict('One or more items are already in an active collection request');
      }
    }

    const resolvedAddress =
      formatAddress({
        houseNumber,
        street,
        landmark,
        city,
        district,
        state,
        pincode,
        pickupAddress,
      }) || (pickupAddress ? pickupAddress.trim() : '');

    // 3. Create collection request in DRAFT status
    const request = await prisma.collectionRequest.create({
      data: {
        citizenId,
        status: REQUEST_STATUS.DRAFT,
        pickupAddress: resolvedAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        houseNumber: houseNumber ? houseNumber.trim() : null,
        street: street ? street.trim() : null,
        landmark: landmark ? landmark.trim() : null,
        city: city ? city.trim() : null,
        district: district ? district.trim() : null,
        state: state ? state.trim() : null,
        pincode: pincode ? pincode.trim() : null,
        locationAccuracy:
          locationAccuracy !== undefined && locationAccuracy !== null
            ? parseFloat(locationAccuracy)
            : null,
        addressType: addressType || 'HOME',
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTimeStart: preferredTimeStart ? new Date(`1970-01-01T${preferredTimeStart}:00Z`) : null,
        preferredTimeEnd: preferredTimeEnd ? new Date(`1970-01-01T${preferredTimeEnd}:00Z`) : null,
        notes: notes ? notes.trim() : null,
      },
    });

    // 4. Associate items with newly created request
    await prisma.ewasteItem.updateMany({
      where: { id: { in: itemIds } },
      data: { collectionRequestId: request.id },
    });

    return prisma.collectionRequest.findUnique({
      where: { id: request.id },
      include: { ewasteItems: true },
    });
  }

  /**
   * List collection requests for citizen or admin
   * @param {object} actor - Authenticated user context
   * @param {object} query - Filtering and pagination parameters
   * @returns {Promise<object>} Paginated requests
   */
  async listRequests(actor, { status, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (actor.role === ROLES.CITIZEN) {
      where.citizenId = actor.id;
    }

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.collectionRequest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { ewasteItems: true },
      }),
      prisma.collectionRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * List available collection requests for verified collectors (status: SUBMITTED)
   * Enforces privacy by masking exact pickup addresses until accepted
   * @param {object} collectorUser - Authenticated collector user
   * @param {object} query - Location & pagination parameters
   * @returns {Promise<object>} Available requests with masked location
   */
  async listAvailableRequests(collectorUser, { lat, lng, radiusKm, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Get collector's profile location if not supplied in query
    let searchLat = lat ? parseFloat(lat) : null;
    let searchLng = lng ? parseFloat(lng) : null;
    let searchRadius = radiusKm ? parseFloat(radiusKm) : 5.0;

    if (searchLat === null || searchLng === null) {
      const profile = await prisma.collectorProfile.findUnique({
        where: { userId: collectorUser.id },
      });
      if (profile) {
        if (searchLat === null && profile.serviceAreaLat !== null) {
          searchLat = parseFloat(profile.serviceAreaLat);
        }
        if (searchLng === null && profile.serviceAreaLng !== null) {
          searchLng = parseFloat(profile.serviceAreaLng);
        }
        if (!radiusKm && profile.serviceRadiusKm !== null) {
          searchRadius = parseFloat(profile.serviceRadiusKm);
        }
      }
    }

    // Retrieve all SUBMITTED requests
    const allSubmitted = await prisma.collectionRequest.findMany({
      where: {
        status: REQUEST_STATUS.SUBMITTED,
      },
      include: {
        ewasteItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Distance filtering if location is known
    let filtered = allSubmitted;
    if (searchLat !== null && searchLng !== null && !isNaN(searchLat) && !isNaN(searchLng)) {
      filtered = allSubmitted.filter((req) => {
        const reqLat = parseFloat(req.pickupLat);
        const reqLng = parseFloat(req.pickupLng);
        const dist = calculateDistanceKm(searchLat, searchLng, reqLat, reqLng);
        return dist <= searchRadius;
      });
    }

    const total = filtered.length;
    const skip = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(skip, skip + limitNum);

    // Apply privacy masking per Task 33 specification:
    // Collector receives structured doorstep address (houseNumber, street, landmark, city, district, state, pincode)
    // but exact GPS coordinates (pickupLat, pickupLng, locationAccuracy) are strictly masked (null) before acceptance
    const sanitized = paginated.map((r) => {
      const formattedAddress = [
        r.houseNumber,
        r.street,
        r.landmark ? `Near ${r.landmark}` : null,
        r.city,
        r.district,
        r.state,
        r.pincode,
      ].filter(Boolean).join(', ');

      return {
        ...r,
        pickupAddress: formattedAddress || r.pickupAddress || 'Address details available',
        houseNumber: r.houseNumber || null,
        street: r.street || null,
        landmark: r.landmark || null,
        city: r.city || null,
        district: r.district || null,
        state: r.state || null,
        pincode: r.pincode || null,
        addressType: r.addressType || null,
        pickupLat: null,
        pickupLng: null,
        locationAccuracy: null,
      };
    });

    return {
      requests: sanitized,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get specific collection request by ID with role-based access checks
   * @param {object} actor - Authenticated user context
   * @param {string} requestId - Collection request UUID
   * @returns {Promise<object>} Collection request details
   */
  async getRequestById(actor, requestId) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: {
        ewasteItems: true,
        collector: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (actor.role === ROLES.CITIZEN) {
      if (request.citizenId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view your own requests');
      }
    } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      // Collectors can view available SUBMITTED requests or requests assigned to them
      const isAssigned = request.collector && request.collector.userId === actor.id;
      const isAvailable = request.status === REQUEST_STATUS.SUBMITTED;

      if (!isAssigned && !isAvailable) {
        throw AppError.forbidden('Access forbidden: You do not have permission to view this request');
      }

      if (!isAssigned) {
        const formattedAddress = [
          request.houseNumber,
          request.street,
          request.landmark ? `Near ${request.landmark}` : null,
          request.city,
          request.district,
          request.state,
          request.pincode,
        ].filter(Boolean).join(', ');

        return {
          ...request,
          pickupAddress: formattedAddress || request.pickupAddress || 'Address details available',
          houseNumber: request.houseNumber || null,
          street: request.street || null,
          landmark: request.landmark || null,
          city: request.city || null,
          district: request.district || null,
          state: request.state || null,
          pincode: request.pincode || null,
          addressType: request.addressType || null,
          pickupLat: null,
          pickupLng: null,
          locationAccuracy: null,
        };
      }
    }

    return request;
  }

  /**
   * Move collection request from DRAFT to SUBMITTED
   * @param {string} citizenId - Citizen user UUID
   * @param {string} requestId - Request UUID
   * @returns {Promise<object>} Updated request
   */
  async submitRequest(citizenId, requestId) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: { ewasteItems: true },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (request.citizenId !== citizenId) {
      throw AppError.forbidden('Access forbidden: You can only submit your own requests');
    }

    if (request.status !== REQUEST_STATUS.DRAFT) {
      throw AppError.badRequest(`Request is in status '${request.status}' and cannot be submitted. Only DRAFT requests can be submitted.`);
    }

    if (!request.ewasteItems || request.ewasteItems.length === 0) {
      throw AppError.validation('At least one e-waste item is required to submit a request');
    }

    // Update request to SUBMITTED status and set submittedAt timestamp
    const updated = await prisma.collectionRequest.update({
      where: { id: requestId },
      data: {
        status: REQUEST_STATUS.SUBMITTED,
        submittedAt: new Date(),
      },
      include: { ewasteItems: true },
    });

    // Also update linked items status to SUBMITTED
    await prisma.ewasteItem.updateMany({
      where: { collectionRequestId: requestId },
      data: { status: ITEM_STATUS.SUBMITTED },
    });

    return updated;
  }

  /**
   * Accept an available collection request
   * Implements EC-CR-03: atomic transition from SUBMITTED to ACCEPTED, creating Pickup in SCHEDULED status
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {string} requestId - Request UUID
   * @returns {Promise<object>} { request, pickup }
   */
  async acceptRequest(collectorUserId, requestId) {
    // 1. Resolve collector profile
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUserId },
    });

    if (!profile) {
      throw AppError.forbidden('Collector profile not found or user is not an active collector');
    }

    // 2. Fetch request to check existence
    const existing = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: { ewasteItems: true },
    });

    if (!existing) {
      throw AppError.notFound('Collection request not found');
    }

    if (existing.status !== REQUEST_STATUS.SUBMITTED) {
      throw AppError.conflict(
        existing.status === REQUEST_STATUS.ACCEPTED
          ? 'Request has already been accepted by another collector'
          : `Request is in status '${existing.status}' and cannot be accepted. Only SUBMITTED requests can be accepted.`
      );
    }

    // 3. Perform atomic update: CollectionRequest -> ACCEPTED, create Pickup -> SCHEDULED
    const executeTransaction = async (tx) => {
      // Re-verify request status inside transaction to prevent race conditions (EC-CR-03)
      const current = await tx.collectionRequest.findUnique({
        where: { id: requestId },
      });

      if (!current || current.status !== REQUEST_STATUS.SUBMITTED) {
        throw AppError.conflict('Request has already been accepted by another collector');
      }

      const updatedRequest = await tx.collectionRequest.update({
        where: { id: requestId },
        data: {
          status: REQUEST_STATUS.ACCEPTED,
          collectorId: profile.id,
          acceptedAt: new Date(),
        },
        include: {
          ewasteItems: true,
          collector: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      const pickup = await tx.pickup.create({
        data: {
          collectionRequestId: requestId,
          collectorId: profile.id,
          status: PICKUP_STATUS.SCHEDULED,
          scheduledDate: updatedRequest.preferredDate || null,
        },
      });

      return { request: updatedRequest, pickup };
    };

    const result = typeof prisma.$transaction === 'function'
      ? await prisma.$transaction(executeTransaction)
      : await executeTransaction(prisma);

    // Notify citizen that request was accepted (docs/23_NOTIFICATION_SYSTEM.md Section 2)
    if (result && result.request && result.request.citizenId) {
      await notificationService.createNotification({
        userId: result.request.citizenId,
        type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
        title: 'Request Accepted',
        message: 'A collector has accepted your collection request.',
        referenceType: 'collection_request',
        referenceId: requestId,
      });
    }

    return result;
  }

  /**
   * Cancel a collection request
   * @param {object} actor - Authenticated user context
   * @param {string} requestId - Request UUID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} Cancelled request
   */
  async cancelRequest(actor, requestId, reason) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: { ewasteItems: true },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (actor.role === ROLES.CITIZEN && request.citizenId !== actor.id) {
      throw AppError.forbidden('Access forbidden: You can only cancel your own requests');
    }

    // Docs specify: "Cannot cancel after PICKED_UP"
    const unCancellableStatuses = [
      REQUEST_STATUS.PICKED_UP,
      REQUEST_STATUS.CANCELLED,
      REQUEST_STATUS.EXPIRED,
    ];

    if (unCancellableStatuses.includes(request.status)) {
      throw AppError.badRequest(`Cannot cancel request in status '${request.status}'`);
    }

    // Cancel request
    const updated = await prisma.collectionRequest.update({
      where: { id: requestId },
      data: {
        status: REQUEST_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason ? reason.trim() : null,
      },
      include: { ewasteItems: true },
    });

    // EC-CR-04: Citizen cancels after acceptance: Request -> CANCELLED, Pickup -> CANCELLED
    if (request.status === REQUEST_STATUS.ACCEPTED) {
      if (prisma.pickup && typeof prisma.pickup.updateMany === 'function') {
        await prisma.pickup.updateMany({
          where: { collectionRequestId: requestId },
          data: { status: PICKUP_STATUS.CANCELLED },
        });
      }

      // Notify assigned collector that request was cancelled (docs/23_NOTIFICATION_SYSTEM.md Section 2)
      if (request.collectorId) {
        const collectorProfile = await prisma.collectorProfile.findUnique({
          where: { id: request.collectorId },
        });
        if (collectorProfile && collectorProfile.userId) {
          await notificationService.createNotification({
            userId: collectorProfile.userId,
            type: NOTIFICATION_TYPES.REQUEST_CANCELLED,
            title: 'Request Cancelled',
            message: 'The collection request has been cancelled by the citizen.',
            referenceType: 'collection_request',
            referenceId: requestId,
          });
        }
      }
    }

    // Free items so citizen can re-request
    await prisma.ewasteItem.updateMany({
      where: { collectionRequestId: requestId },
      data: { collectionRequestId: null },
    });

    return updated;
  }
}

module.exports = new RequestService();
