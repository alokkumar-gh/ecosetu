// EcoSetu Eco-Saathi Controlled READ Tools
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/06_ROLES_AND_PERMISSIONS.md

const prisma = require('../../../config/database');
const AppError = require('../../../utils/AppError');
const { ROLES, REQUEST_STATUS } = require('../../../utils/constants');
const priceService = require('../../priceService');

const readTools = {
  /**
   * Get authenticated user profile summary
   */
  async getUserProfile(actor) {
    if (!actor || !actor.id) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        collectorProfile: {
          select: {
            id: true,
            city: true,
            isAvailable: true,
            totalPickups: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      city: user.collectorProfile?.city || null,
      totalPickups: user.collectorProfile?.totalPickups || 0,
    };
  },

  /**
   * List pickup requests belonging to the authenticated citizen or assigned/open to collector
   */
  async getPickupRequests(actor, params = {}) {
    if (!actor || !actor.id) {
      throw AppError.unauthorized('Authentication required');
    }

    const limit = Math.min(20, Math.max(1, parseInt(params.limit, 10) || 5));

    if (actor.role === ROLES.CITIZEN) {
      // Strictly user's own collection requests
      const requests = await prisma.collectionRequest.findMany({
        where: { citizenId: actor.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          ewasteItems: {
            select: {
              id: true,
              category: true,
              condition: true,
              estimatedWeightKg: true,
            },
          },
          pickupOffers: {
            select: {
              id: true,
              offeredPrice: true,
              status: true,
              collector: {
                select: {
                  id: true,
                  user: { select: { name: true } },
                },
              },
            },
          },
          collector: {
            select: {
              id: true,
              user: { select: { name: true, phone: true } },
            },
          },
        },
      });

      return requests.map((r) => ({
        requestId: r.id,
        status: r.status,
        pickupAddress: r.pickupAddress,
        itemsCount: r.ewasteItems.length,
        items: r.ewasteItems.map((i) => ({
          category: i.category,
          condition: i.condition,
          weightKg: i.estimatedWeightKg,
        })),
        offersCount: r.pickupOffers.length,
        assignedCollector: r.collector?.user?.name || null,
        createdAt: r.createdAt,
      }));
    }

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const profile = await prisma.collectorProfile.findUnique({
        where: { userId: actor.id },
      });

      if (!profile) {
        throw AppError.forbidden('Collector profile not found');
      }

      // Requests assigned to this collector or open for offers
      const requests = await prisma.collectionRequest.findMany({
        where: {
          OR: [
            { collectorId: profile.id },
            { status: REQUEST_STATUS.SUBMITTED },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          ewasteItems: {
            select: {
              category: true,
              condition: true,
              estimatedWeightKg: true,
            },
          },
        },
      });

      return requests.map((r) => ({
        requestId: r.id,
        status: r.status,
        itemsCount: r.ewasteItems.length,
        items: r.ewasteItems.map((i) => ({
          category: i.category,
          condition: i.condition,
          weightKg: i.estimatedWeightKg,
        })),
        isAssignedToMe: r.collectorId === profile.id,
        createdAt: r.createdAt,
      }));
    }

    throw AppError.forbidden('Unauthorized role for pickup listing');
  },

  /**
   * Get specific collection request details with strict ownership verification
   */
  async getPickupRequestDetails(actor, { requestId }) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');
    if (!requestId) throw AppError.badRequest('requestId is required');

    const request = await prisma.collectionRequest.findUnique({
      where: { id: requestId },
      include: {
        ewasteItems: true,
        pickupOffers: {
          include: {
            collector: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        collector: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    if (!request) {
      throw AppError.notFound('Collection request not found');
    }

    // Role-based privacy & ownership check
    if (actor.role === ROLES.CITIZEN) {
      if (request.citizenId !== actor.id) {
        throw AppError.forbidden('Access denied: You can only view your own pickup requests');
      }
    } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const profile = await prisma.collectorProfile.findUnique({ where: { userId: actor.id } });
      const isAssigned = profile && request.collectorId === profile.id;
      const isOpen = request.status === REQUEST_STATUS.SUBMITTED;
      if (!isAssigned && !isOpen) {
        throw AppError.forbidden('Access denied: Request is not available to your account');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access denied');
    }

    return {
      requestId: request.id,
      status: request.status,
      pickupAddress: actor.role === ROLES.CITIZEN || request.collectorId ? request.pickupAddress : 'Approximate Area',
      items: request.ewasteItems.map((i) => ({
        id: i.id,
        category: i.category,
        condition: i.condition,
        weightKg: i.estimatedWeightKg,
      })),
      offers: (request.pickupOffers || []).map((o) => ({
        offerId: o.id,
        collectorName: o.collector?.user?.name || 'Local Collector',
        offeredPrice: parseFloat(o.offeredPrice),
        status: o.status,
        notes: o.notes,
        createdAt: o.createdAt,
      })),
      assignedCollector: request.collector?.user?.name || null,
      createdAt: request.createdAt,
    };
  },

  /**
   * Get human-friendly pickup request status and what to do next
   */
  async getPickupRequestStatus(actor, { requestId }) {
    const details = await this.getPickupRequestDetails(actor, { requestId });
    let explanation = '';
    let nextStep = '';

    switch (details.status) {
      case 'DRAFT':
        explanation = 'Your request is in draft mode.';
        nextStep = 'Confirm details and submit to broadcast to nearby collectors.';
        break;
      case 'SUBMITTED':
        explanation = `Your request is active with ${details.offers.length} collector offers received.`;
        nextStep = details.offers.length > 0 ? 'Review and accept an offer from a collector.' : 'Waiting for local collectors to submit bids.';
        break;
      case 'ACCEPTED':
        explanation = `Collector ${details.assignedCollector || 'assigned'} is scheduled for pickup.`;
        nextStep = 'Keep items ready for doorstep verification and digital weighing.';
        break;
      case 'PICKUP_SCHEDULED':
        explanation = 'Pickup has been scheduled with arrival time window.';
        nextStep = 'Be available at your address.';
        break;
      case 'PICKED_UP':
        explanation = 'Items have been collected and verified.';
        nextStep = 'Your e-waste is in transit to a formal recycling facility.';
        break;
      case 'CANCELLED':
        explanation = 'This collection request was cancelled.';
        nextStep = 'You can submit a new request anytime.';
        break;
      default:
        explanation = `Status: ${details.status}`;
        nextStep = 'Check back for updates.';
    }

    return {
      requestId: details.requestId,
      status: details.status,
      explanation,
      nextStep,
      offersCount: details.offers.length,
      assignedCollector: details.assignedCollector,
    };
  },

  /**
   * Get received offers for a request (Citizen view)
   */
  async getReceivedOffers(actor, params = {}) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');

    let requestId = params.requestId;

    // If no requestId given, fetch the latest SUBMITTED request of the citizen
    if (!requestId) {
      const latestReq = await prisma.collectionRequest.findFirst({
        where: { citizenId: actor.id, status: REQUEST_STATUS.SUBMITTED },
        orderBy: { createdAt: 'desc' },
      });
      if (latestReq) requestId = latestReq.id;
    }

    if (!requestId) {
      return {
        message: 'No active collection requests awaiting offers found.',
        offers: [],
      };
    }

    const details = await this.getPickupRequestDetails(actor, { requestId });
    return {
      requestId,
      offersCount: details.offers.length,
      offers: details.offers,
    };
  },

  /**
   * Get specific offer details
   */
  async getOfferDetails(actor, { offerId }) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');
    if (!offerId) throw AppError.badRequest('offerId is required');

    const offer = await prisma.pickupOffer.findUnique({
      where: { id: offerId },
      include: {
        collectionRequest: {
          include: { citizen: { select: { id: true, name: true } } },
        },
        collector: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!offer) throw AppError.notFound('Offer not found');

    // Security check
    const isCitizenOwner = offer.collectionRequest.citizenId === actor.id;
    const isCollectorAuthor = offer.collector.userId === actor.id;

    if (!isCitizenOwner && !isCollectorAuthor && actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access denied to this offer');
    }

    return {
      offerId: offer.id,
      requestId: offer.collectionRequestId,
      collectorName: offer.collector.user.name,
      offeredPrice: parseFloat(offer.offeredPrice),
      status: offer.status,
      notes: offer.notes,
      createdAt: offer.createdAt,
    };
  },

  /**
   * Get reference pricing for an e-waste category
   */
  async getCategoryPricing(actor, { category, weightKg = 1 }) {
    const validCat = (category || 'CIRCUIT_BOARD').toUpperCase();
    const weight = Math.max(0.1, parseFloat(weightKg) || 1);

    try {
      const estimate = await priceService.calculateEstimate({
        category: validCat,
        weightKg: weight,
      });

      return {
        category: validCat,
        weightKg: weight,
        estimatedTotal: estimate.estimatedValue || 0,
        currency: 'INR',
        unit: 'kg',
        isEstimateAvailable: estimate.isEstimateAvailable !== false,
      };
    } catch {
      return {
        category: validCat,
        weightKg: weight,
        estimatedTotal: 0,
        currency: 'INR',
        unit: 'kg',
        isEstimateAvailable: false,
      };
    }
  },

  /**
   * Calculate grounded valuation for an item using EcoValue
   */
  async calculateItemValue(actor, { category, condition = 'UNKNOWN', weightKg = null, location = 'ALL' }) {
    const ecoValueService = require('../../valuation/EcoValueService');
    return await ecoValueService.calculateValue({
      category,
      condition,
      weightKg,
      location,
    });
  },

  /**
   * Get eligible matching requests for collector with distance and transparent signals
   */
  async getMatchingRequests(actor, { filterCategory, maxDistanceKm, sortBy = 'distance', limit = 10, page = 1 } = {}) {
    if (!actor || actor.role !== ROLES.INFORMAL_COLLECTOR) {
      throw AppError.forbidden('Only registered collectors can access matching requests');
    }
    const ecoMatchService = require('../../matching/EcoMatchService');
    return await ecoMatchService.getEligibleRequests(actor.id, {
      filterCategory,
      maxDistanceKm,
      sortBy,
      limit,
      page,
    });
  },

  /**
   * Check collector offer sanity against platform estimated value range
   */
  async checkOfferSanity(actor, { category, condition = 'UNKNOWN', weightKg = null, offeredPrice }) {
    if (!actor || actor.role !== ROLES.INFORMAL_COLLECTOR) {
      throw AppError.forbidden('Only collectors can perform offer sanity checks');
    }
    const ecoMatchService = require('../../matching/EcoMatchService');
    return await ecoMatchService.evaluateOfferSanity({
      category,
      condition,
      weightKg,
      offeredPrice,
    });
  },

  /**
   * Get pending negotiations and counter-offers for collector
   */
  async getCollectorNegotiations(actor) {
    if (!actor || actor.role !== ROLES.INFORMAL_COLLECTOR) {
      throw AppError.forbidden('Only collectors can access negotiations');
    }
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: actor.id },
    });
    if (!profile) throw AppError.notFound('Collector profile not found');

    const offers = await prisma.pickupOffer.findMany({
      where: {
        collectorId: profile.id,
        status: 'PENDING',
      },
      include: {
        collectionRequest: {
          include: {
            ewasteItems: {
              select: { category: true, condition: true, estimatedWeightKg: true, imageUrl: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const negotiations = offers
      .filter((o) => o.notes && o.notes.includes('[Citizen Counter:'))
      .map((o) => {
        const match = o.notes.match(/\[Citizen Counter:\s*₹?(\d+)\]\s*(.*)/i);
        const counterPrice = match ? parseInt(match[1], 10) : null;
        const citizenNote = match ? match[2] : o.notes;
        return {
          offerId: o.id,
          requestId: o.collectionRequestId,
          myOfferedPrice: parseFloat(o.offeredPrice),
          counterPrice,
          citizenNote,
          item: o.collectionRequest.ewasteItems[0] || null,
          city: o.collectionRequest.city,
          updatedAt: o.updatedAt,
        };
      });

    return {
      count: negotiations.length,
      negotiations,
    };
  },

  /**
   * Get active pickups assigned to collector
   */
  async getCollectorActivePickups(actor) {
    if (!actor || actor.role !== ROLES.INFORMAL_COLLECTOR) {
      throw AppError.forbidden('Only collectors can access active pickups');
    }
    const profile = await prisma.collectorProfile.findUnique({
      where: { userId: actor.id },
    });
    if (!profile) throw AppError.notFound('Collector profile not found');

    const activeRequests = await prisma.collectionRequest.findMany({
      where: {
        collectorId: profile.id,
        status: { in: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED] },
      },
      include: {
        ewasteItems: {
          select: { category: true, condition: true, estimatedWeightKg: true, imageUrl: true },
        },
      },
      orderBy: { preferredDate: 'asc' },
    });

    return {
      count: activeRequests.length,
      pickups: activeRequests.map((r) => ({
        requestId: r.id,
        shortId: r.id.substring(0, 8),
        status: r.status,
        address: [r.landmark ? `Near ${r.landmark}` : null, r.city, r.state].filter(Boolean).join(', '),
        preferredDate: r.preferredDate,
        itemsCount: r.ewasteItems.length,
        items: r.ewasteItems,
      })),
    };
  },

  /**
   * Get collector dashboard metrics
   */
  async getCollectorMetrics(actor) {
    if (!actor || actor.role !== ROLES.INFORMAL_COLLECTOR) {
      throw AppError.forbidden('Only collectors can access collector metrics');
    }
    const ecoMatchService = require('../../matching/EcoMatchService');
    return await ecoMatchService.getCollectorDashboardMetrics(actor.id);
  },

  /**
   * Get full lifecycle trace and timeline using EcoTraceService
   */
  async getLifecycleTrace(actor, { requestId, itemId, language = 'en' } = {}) {
    const ecoTraceService = require('../../traceability/EcoTraceService');
    return await ecoTraceService.getLifecycleTrace(actor, { requestId, itemId, language });
  },

  /**
   * Alias for getLifecycleTrace
   */
  async getTraceabilityTimeline(actor, params = {}) {
    return await this.getLifecycleTrace(actor, params);
  },

  /**
   * Get proactive attention summary of pending actions ("What needs my attention?")
   */
  async getAttentionSummary(actor, { language = 'en' } = {}) {
    const ecoSaathiIntelligenceService = require('../../proactive/EcoSaathiIntelligenceService');
    return await ecoSaathiIntelligenceService.getAttentionSummary(actor, language);
  },
};

module.exports = readTools;
