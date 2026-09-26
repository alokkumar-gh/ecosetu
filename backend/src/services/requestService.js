// EcoSetu Collection Request Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.6, docs/05_API_SPECIFICATION.md Section 7, docs/07_BUSINESS_WORKFLOWS.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const { calculateDistanceKm, formatAddress, maskCoordinates } = require('../utils/locationHelper');
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
      autoSubmit,
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

    const initialStatus = autoSubmit ? REQUEST_STATUS.SUBMITTED : REQUEST_STATUS.DRAFT;
    const submittedAt = autoSubmit ? new Date() : null;

    // 3. Create collection request
    const request = await prisma.collectionRequest.create({
      data: {
        citizenId,
        status: initialStatus,
        submittedAt,
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
      data: {
        collectionRequestId: request.id,
        status: autoSubmit ? ITEM_STATUS.SUBMITTED : ITEM_STATUS.SUBMITTED,
      },
    });

    // 5. If auto-submitted, notify eligible collectors
    if (autoSubmit) {
      this._notifyEligibleCollectors(request, items).catch((err) => {
        console.warn('[RequestService] Collector notification error:', err?.message || err);
      });
    }

    return prisma.collectionRequest.findUnique({
      where: { id: request.id },
      include: { ewasteItems: true },
    });
  }

  /**
   * Helper: Calculate standard reference price for items using active verified rates
   */
  async _calculateStandardPrice(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    try {
      const priceService = require('./priceService');
      let total = 0;
      let hasEstimate = false;

      for (const item of items) {
        const weight = parseFloat(item.estimatedWeightKg || item.actualWeightKg || item.quantity || 1);
        const est = await priceService.calculateEstimate({
          category: item.category,
          weightKg: weight > 0 ? weight : 1,
        });
        if (est && est.isEstimateAvailable && typeof est.estimatedValue === 'number') {
          total += est.estimatedValue;
          hasEstimate = true;
        }
      }

      return hasEstimate ? parseFloat(total.toFixed(2)) : null;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Broadcast notification to eligible active collectors
   */
  async _notifyEligibleCollectors(request, ewasteItems) {
    try {
      const activeCollectors = await prisma.user.findMany({
        where: {
          role: ROLES.INFORMAL_COLLECTOR,
          status: 'ACTIVE',
          collectorProfile: {
            isAvailable: true,
          },
        },
        include: {
          collectorProfile: true,
        },
      });

      if (!activeCollectors || activeCollectors.length === 0) {
        return;
      }

      const categories = Array.isArray(ewasteItems) && ewasteItems.length > 0
        ? [...new Set(ewasteItems.map((i) => i.category))].join(', ')
        : 'E-Waste Items';

      const approxWeight = Array.isArray(ewasteItems)
        ? ewasteItems.reduce((acc, i) => acc + (parseFloat(i.estimatedWeightKg || i.actualWeightKg) || 0), 0)
        : 0;

      const area = request.district || request.city || request.landmark || 'your area';

      for (const collector of activeCollectors) {
        // Distance check if service area coords are set
        if (
          collector.collectorProfile?.serviceAreaLat &&
          collector.collectorProfile?.serviceAreaLng &&
          request.pickupLat &&
          request.pickupLng
        ) {
          const dist = calculateDistanceKm(
            parseFloat(collector.collectorProfile.serviceAreaLat),
            parseFloat(collector.collectorProfile.serviceAreaLng),
            parseFloat(request.pickupLat),
            parseFloat(request.pickupLng)
          );
          const radius = parseFloat(collector.collectorProfile.serviceRadiusKm) || 25.0;
          if (dist > radius) {
            continue;
          }
        }

        await notificationService.createNotification({
          userId: collector.id,
          type: NOTIFICATION_TYPES.REQUEST_AVAILABLE,
          title: 'New Pickup Request Available',
          message: `New pickup request for ${categories} (~${approxWeight > 0 ? approxWeight + 'kg' : '1 lot'}) in ${area}. Tap to view & submit an offer.`,
          referenceType: 'collection_request',
          referenceId: request.id,
        });
      }
    } catch (err) {
      console.warn('[RequestService] _notifyEligibleCollectors error:', err?.message || err);
    }
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
        include: {
          ewasteItems: true,
          pickupOffers: {
            select: {
              id: true,
              collectorId: true,
              offeredPrice: true,
              standardPrice: true,
              notes: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.collectionRequest.count({ where }),
    ]);

    const enhanced = requests.map((r) => {
      const offersCount = (r.pickupOffers || []).filter((o) => o.status === 'PENDING').length;
      return {
        ...r,
        offersCount,
      };
    });

    return {
      requests: enhanced,
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

    // Get collector's profile location
    let searchLat = lat ? parseFloat(lat) : null;
    let searchLng = lng ? parseFloat(lng) : null;
    let searchRadius = radiusKm ? parseFloat(radiusKm) : 5.0;
    let collectorProfileId = null;

    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUser.id },
    });
    if (profile) {
      collectorProfileId = profile.id;
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

    // Retrieve all SUBMITTED requests
    const allSubmitted = await prisma.collectionRequest.findMany({
      where: {
        status: REQUEST_STATUS.SUBMITTED,
      },
      include: {
        ewasteItems: true,
        pickupOffers: {
          select: {
            id: true,
            collectorId: true,
            offeredPrice: true,
            standardPrice: true,
            notes: true,
            status: true,
            createdAt: true,
          },
        },
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

    // Apply privacy masking and attach offer metadata
    const sanitized = await Promise.all(
      paginated.map(async (r) => {
        const formattedAddress = [
          r.houseNumber,
          r.street,
          r.landmark ? `Near ${r.landmark}` : null,
          r.city,
          r.district,
          r.state,
          r.pincode,
        ].filter(Boolean).join(', ');

        const { maskedLat, maskedLng } = maskCoordinates(r.pickupLat, r.pickupLng, 2);
        const standardPrice = await this._calculateStandardPrice(r.ewasteItems);
        const activeOffers = (r.pickupOffers || []).filter((o) => o.status === 'PENDING');
        const myOffer = collectorProfileId
          ? (r.pickupOffers || []).find((o) => o.collectorId === collectorProfileId) || null
          : null;

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
          standardPrice,
          offersCount: activeOffers.length,
          myOffer: myOffer
            ? {
                id: myOffer.id,
                offeredPrice: parseFloat(myOffer.offeredPrice),
                standardPrice: myOffer.standardPrice ? parseFloat(myOffer.standardPrice) : null,
                notes: myOffer.notes,
                status: myOffer.status,
                createdAt: myOffer.createdAt,
              }
            : null,
          pickupOffers: undefined, // Do not expose other collectors' raw offers
        };
      })
    );

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

        const { maskedLat, maskedLng } = maskCoordinates(request.pickupLat, request.pickupLng, 2);

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

    // Notify eligible collectors about new submitted request
    this._notifyEligibleCollectors(updated, request.ewasteItems).catch((err) => {
      console.warn('[RequestService] Collector notification error:', err?.message || err);
    });

    return updated;
  }

  /**
   * Collector submits or updates an offer for a collection request
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @param {string} requestId - Request UUID
   * @param {object} payload - { offeredPrice, notes }
   * @returns {Promise<object>} Created or updated PickupOffer
   */
  async submitOffer(collectorUserId, requestId, { offeredPrice, notes }) {
    // 1. Resolve collector profile
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUserId },
      include: { user: true },
    });

    if (!profile || profile.user.status !== 'ACTIVE') {
      throw AppError.forbidden('Only active verified collectors can submit offers');
    }

    // 2. Fetch request
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: { ewasteItems: true, citizen: true },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (request.status !== REQUEST_STATUS.SUBMITTED) {
      throw AppError.badRequest(
        request.status === REQUEST_STATUS.ACCEPTED
          ? 'This collection request has already been accepted and assigned.'
          : `Cannot submit offer on request in status '${request.status}'. Only open requests accept offers.`
      );
    }

    const priceNum = parseFloat(offeredPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw AppError.badRequest('Offered price must be a positive number greater than 0');
    }

    const standardPrice = await this._calculateStandardPrice(request.ewasteItems);

    // 3. Upsert offer (strictly one active offer per collector per request)
    const offer = await prisma.pickupOffer.upsert({
      where: {
        collectionRequestId_collectorId: {
          collectionRequestId: requestId,
          collectorId: profile.id,
        },
      },
      update: {
        offeredPrice: priceNum,
        standardPrice,
        notes: notes ? notes.trim() : null,
        status: 'PENDING',
        updatedAt: new Date(),
      },
      create: {
        collectionRequestId: requestId,
        collectorId: profile.id,
        offeredPrice: priceNum,
        standardPrice,
        notes: notes ? notes.trim() : null,
        status: 'PENDING',
      },
      include: {
        collector: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        },
      },
    });

    // 4. Notify citizen about incoming offer
    await notificationService.createNotification({
      userId: request.citizenId,
      type: NOTIFICATION_TYPES.OFFER_RECEIVED,
      title: 'New Offer Received',
      message: `${profile.user.name || 'A local collector'} submitted an offer of ₹${priceNum} for your pickup request.`,
      referenceType: 'collection_request',
      referenceId: requestId,
    });

    // 5. Immutable Traceability Event
    await auditService.logAction({
      actorId: collectorUserId,
      action: 'OFFER_SUBMITTED',
      entityType: 'collection_requests',
      entityId: requestId,
      details: {
        offerId: offer.id,
        offeredPrice: priceNum,
        collectorName: profile.user?.name || 'Collector',
        notes: notes ? notes.trim() : null,
      },
    });

    return offer;
  }

  /**
   * Citizen counters / negotiates a collector offer
   * @param {string} citizenId - Authenticated citizen UUID
   * @param {string} requestId - Request UUID
   * @param {string} offerId - Offer UUID
   * @param {object} payload - { counterPrice, notes }
   * @returns {Promise<object>} Updated offer
   */
  async counterOffer(citizenId, requestId, offerId, { counterPrice, notes }) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: { ewasteItems: true },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (request.citizenId !== citizenId) {
      throw AppError.forbidden('You can only negotiate offers on your own requests');
    }

    if (request.status !== REQUEST_STATUS.SUBMITTED) {
      throw AppError.badRequest(`Cannot negotiate offer on request in status '${request.status}'.`);
    }

    const priceNum = parseFloat(counterPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw AppError.badRequest('Counter price must be a positive number greater than 0');
    }

    const offer = await prisma.pickupOffer.findUnique({
      where: { id: offerId },
      include: { collector: { include: { user: true } } },
    });

    if (!offer || offer.collectionRequestId !== requestId) {
      throw AppError.notFound('Offer not found for this request');
    }

    const counterNote = `[Citizen Counter: ₹${priceNum}] ${notes ? notes.trim() : ''}`.trim();

    const updatedOffer = await prisma.pickupOffer.update({
      where: { id: offerId },
      data: {
        notes: counterNote,
        updatedAt: new Date(),
      },
      include: {
        collector: {
          include: {
            user: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        },
      },
    });

    // Notify collector
    if (offer.collector?.userId) {
      await notificationService.createNotification({
        userId: offer.collector.userId,
        type: NOTIFICATION_TYPES.OFFER_RECEIVED,
        title: 'Counter Offer from Citizen',
        message: `Citizen counter-offered ₹${priceNum} for collection request #${requestId.slice(0, 8)}.`,
        referenceType: 'collection_request',
        referenceId: requestId,
      });
    }

    // Append-only audit log
    await auditService.logAction({
      actorId: citizenId,
      action: 'OFFER_COUNTERED',
      entityType: 'collection_requests',
      entityId: requestId,
      details: {
        offerId,
        counterPrice: priceNum,
        collectorId: offer.collectorId,
        notes: notes ? notes.trim() : null,
      },
    });

    return updatedOffer;
  }

  /**
   * Citizen rejects a collector offer
   * @param {string} citizenId - Authenticated citizen UUID
   * @param {string} requestId - Request UUID
   * @param {string} offerId - Offer UUID
   * @param {object} [payload] - { reason }
   * @returns {Promise<object>} Updated offer
   */
  async rejectOffer(citizenId, requestId, offerId, { reason } = {}) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (request.citizenId !== citizenId) {
      throw AppError.forbidden('You can only reject offers on your own requests');
    }

    const offer = await prisma.pickupOffer.findUnique({
      where: { id: offerId },
      include: { collector: { include: { user: true } } },
    });

    if (!offer || offer.collectionRequestId !== requestId) {
      throw AppError.notFound('Offer not found for this request');
    }

    const updatedOffer = await prisma.pickupOffer.update({
      where: { id: offerId },
      data: {
        status: 'REJECTED',
        updatedAt: new Date(),
      },
      include: {
        collector: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    // Notify collector
    if (offer.collector?.userId) {
      await notificationService.createNotification({
        userId: offer.collector.userId,
        type: NOTIFICATION_TYPES.OFFER_REJECTED,
        title: 'Offer Declined',
        message: `Your offer of ₹${offer.offeredPrice} for request #${requestId.slice(0, 8)} was declined.`,
        referenceType: 'collection_request',
        referenceId: requestId,
      });
    }

    // Append-only audit log
    await auditService.logAction({
      actorId: citizenId,
      action: 'OFFER_REJECTED',
      entityType: 'collection_requests',
      entityId: requestId,
      details: {
        offerId,
        collectorId: offer.collectorId,
        reason: reason || null,
      },
    });

    return updatedOffer;
  }

  /**
   * List all offers placed by a collector across all requests
   * @param {string} collectorUserId - Authenticated collector user UUID
   * @returns {Promise<object>} { offers }
   */
  async listCollectorOffers(collectorUserId) {
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: collectorUserId },
    });

    if (!profile) {
      throw AppError.forbidden('Collector profile not found');
    }

    const offers = await prisma.pickupOffer.findMany({
      where: { collectorId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        collectionRequest: {
          include: {
            ewasteItems: true,
          },
        },
      },
    });

    return { offers };
  }

  /**
   * List offers for a collection request (Citizen owner, Collector self, Admin)
   * @param {object} actor - Authenticated user
   * @param {string} requestId - Request UUID
   * @returns {Promise<object>} { offers }
   */
  async listOffers(actor, requestId) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: {
        collector: { select: { id: true, userId: true } },
      },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    const isOwner = actor.role === ROLES.CITIZEN && request.citizenId === actor.id;
    const isAdmin = actor.role === ROLES.ADMIN;

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const profile = await prisma.collectorProfile.findUnique({
        where: { userId: actor.id },
      });
      if (!profile) throw AppError.forbidden('Collector profile not found');

      // Collector sees only their own offer on this request
      const myOffers = await prisma.pickupOffer.findMany({
        where: {
          collectionRequestId: requestId,
          collectorId: profile.id,
        },
        include: {
          collector: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });
      return { offers: myOffers };
    }

    if (!isOwner && !isAdmin) {
      throw AppError.forbidden('You are not authorized to view offers for this request');
    }

    const offers = await prisma.pickupOffer.findMany({
      where: { collectionRequestId: requestId },
      orderBy: { createdAt: 'desc' },
      include: {
        collector: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true, status: true } },
          },
        },
      },
    });

    return { offers };
  }

  /**
   * Citizen accepts a collector offer transactionally
   * @param {string} citizenId - Authenticated citizen UUID
   * @param {string} requestId - Request UUID
   * @param {string} offerId - Offer UUID
   * @returns {Promise<object>} { request, offer, pickup }
   */
  async acceptOffer(citizenId, requestId, offerId) {
    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: { ewasteItems: true },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    if (request.citizenId !== citizenId) {
      throw AppError.forbidden('You can only accept offers for your own requests');
    }

    if (request.status !== REQUEST_STATUS.SUBMITTED) {
      throw AppError.conflict(
        request.status === REQUEST_STATUS.ACCEPTED
          ? 'This collection request has already been accepted.'
          : `Request is in status '${request.status}' and cannot accept offers.`
      );
    }

    const offer = await prisma.pickupOffer.findUnique({
      where: { id: offerId },
      include: { collector: { include: { user: true } } },
    });

    if (!offer || offer.collectionRequestId !== requestId) {
      throw AppError.notFound('Offer not found for this request');
    }

    if (offer.status !== 'PENDING') {
      throw AppError.badRequest(`Offer is in status '${offer.status}' and cannot be accepted`);
    }

    const executeTransaction = async (tx) => {
      // Re-verify request status inside transaction to prevent race conditions
      const current = await tx.collectionRequest.findUnique({
        where: { id: requestId },
      });

      if (!current || current.status !== REQUEST_STATUS.SUBMITTED) {
        throw AppError.conflict('Request has already been accepted by another collector');
      }

      // 1. Update collection request -> ACCEPTED
      const updatedRequest = await tx.collectionRequest.update({
        where: { id: requestId },
        data: {
          status: REQUEST_STATUS.ACCEPTED,
          collectorId: offer.collectorId,
          acceptedAt: new Date(),
        },
        include: {
          ewasteItems: true,
          collector: {
            select: { id: true, userId: true, user: { select: { name: true, phone: true } } },
          },
        },
      });

      // 2. Update selected offer -> ACCEPTED
      await tx.pickupOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' },
      });

      // 3. Reject all other active offers for this request
      await tx.pickupOffer.updateMany({
        where: {
          collectionRequestId: requestId,
          id: { not: offerId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      });

      // 4. Create Pickup in SCHEDULED status
      const pickup = await tx.pickup.create({
        data: {
          collectionRequestId: requestId,
          collectorId: offer.collectorId,
          status: PICKUP_STATUS.SCHEDULED,
          scheduledDate: updatedRequest.preferredDate || null,
        },
      });

      return { request: updatedRequest, offer, pickup };
    };

    const result = typeof prisma.$transaction === 'function'
      ? await prisma.$transaction(executeTransaction)
      : await executeTransaction(prisma);

    // Notifications
    // 1. Selected Collector
    if (offer.collector?.userId) {
      await notificationService.createNotification({
        userId: offer.collector.userId,
        type: NOTIFICATION_TYPES.OFFER_ACCEPTED,
        title: 'Offer Accepted!',
        message: `Your offer of ₹${offer.offeredPrice} for collection request #${requestId.slice(0, 8)} was accepted! Pickup is now scheduled.`,
        referenceType: 'collection_request',
        referenceId: requestId,
      });
    }

    // 2. Citizen
    await notificationService.createNotification({
      userId: citizenId,
      type: NOTIFICATION_TYPES.REQUEST_ACCEPTED,
      title: 'Collector Confirmed',
      message: `You accepted ${offer.collector?.user?.name || 'collector'}'s offer of ₹${offer.offeredPrice}. Pickup is scheduled.`,
      referenceType: 'collection_request',
      referenceId: requestId,
    });

    // 3. Other Bidding Collectors
    try {
      const otherOffers = await prisma.pickupOffer.findMany({
        where: {
          collectionRequestId: requestId,
          id: { not: offerId },
        },
        include: { collector: true },
      });
      for (const other of otherOffers) {
        if (other.collector?.userId) {
          await notificationService.createNotification({
            userId: other.collector.userId,
            type: NOTIFICATION_TYPES.OFFER_REJECTED,
            title: 'Pickup Request Closed',
            message: `Pickup request #${requestId.slice(0, 8)} has been assigned to another collector.`,
            referenceType: 'collection_request',
            referenceId: requestId,
          });
        }
      }
    } catch (notifErr) {
      console.warn('[RequestService] Failed to notify other collectors:', notifErr?.message || notifErr);
    }

    return result;
  }

  /**
   * Accept an available collection request (Direct assignment fallback)
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
