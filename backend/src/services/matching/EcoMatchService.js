/**
 * EcoSetu — Eco-Match Service & Collector Intelligence Engine
 * Provides transparent matching, eligibility verification, distance calculation,
 * offer sanity checks, and negotiation intelligence for collectors.
 * Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/25_SIH_26229_REQUIREMENTS.md
 * 
 * STRICT PRINCIPLE: Transparent matching signals only.
 * NEVER creates an opaque "AI winner", and NEVER automatically awards or bids.
 */

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { calculateDistanceKm, isValidCoordinate } = require('../../utils/locationHelper');
const { ROLES, REQUEST_STATUS, ITEM_STATUS } = require('../../utils/constants');
const ecoValueService = require('../valuation/EcoValueService');
const logger = require('../../config/logger');

class EcoMatchService {
  /**
   * Deterministic Great-Circle Distance Calculator using Haversine
   * @param {number|string|null} lat1
   * @param {number|string|null} lon1
   * @param {number|string|null} lat2
   * @param {number|string|null} lon2
   * @returns {number|null} Distance in km rounded to 1 decimal place, or null if coordinates are unavailable
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
      return null;
    }

    const pLat1 = parseFloat(lat1);
    const pLon1 = parseFloat(lon1);
    const pLat2 = parseFloat(lat2);
    const pLon2 = parseFloat(lon2);

    if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) {
      return null;
    }

    const dist = calculateDistanceKm(pLat1, pLon1, pLat2, pLon2);
    if (!isFinite(dist)) return null;

    return Math.round(dist * 10) / 10;
  }

  /**
   * Check if a collector is eligible for a specific pickup request
   * @param {object} collectorProfile - Collector profile record with user relation
   * @param {object} request - CollectionRequest record with ewasteItems
   * @param {object} [options]
   * @returns {object} { eligible: boolean, reasons: string[], blockedReason?: string, distanceKm: number|null }
   */
  checkEligibility(collectorProfile, request, options = {}) {
    if (!collectorProfile) {
      return { eligible: false, blockedReason: 'Collector profile not found', reasons: [] };
    }

    const reasons = [];

    // 1. Account status verification
    if (collectorProfile.user?.status === 'SUSPENDED' || collectorProfile.user?.status === 'DEACTIVATED') {
      return { eligible: false, blockedReason: 'Collector account is inactive or suspended', reasons };
    }

    // 2. Collector availability
    if (collectorProfile.isAvailable === false) {
      return { eligible: false, blockedReason: 'Collector is currently marked unavailable', reasons };
    }
    reasons.push('Collector is active and available');

    // 3. Request status check
    if (request.status !== REQUEST_STATUS.SUBMITTED) {
      return { eligible: false, blockedReason: `Request is in status '${request.status}' (not open for offers)`, reasons };
    }

    // 4. Category compatibility check
    const requestCategories = (request.ewasteItems || []).map((item) => item.category);
    const supportedCategories = options.supportedCategories || collectorProfile.supportedCategories || null;

    if (supportedCategories && Array.isArray(supportedCategories) && supportedCategories.length > 0) {
      const hasMatchingCategory = requestCategories.some((cat) => supportedCategories.includes(cat));
      if (!hasMatchingCategory) {
        return {
          eligible: false,
          blockedReason: `Collector does not accept items of category: ${requestCategories.join(', ')}`,
          reasons,
        };
      }
      reasons.push(`Supports category: ${requestCategories.join(', ')}`);
    } else {
      reasons.push('Accepts all standard e-waste categories');
    }

    // 5. Geographic Service Area / Distance verification
    let distanceKm = null;
    const colLat = collectorProfile.serviceAreaLat ? parseFloat(collectorProfile.serviceAreaLat) : null;
    const colLng = collectorProfile.serviceAreaLng ? parseFloat(collectorProfile.serviceAreaLng) : null;
    const reqLat = request.pickupLat ? parseFloat(request.pickupLat) : null;
    const reqLng = request.pickupLng ? parseFloat(request.pickupLng) : null;

    if (colLat !== null && colLng !== null && reqLat !== null && reqLng !== null) {
      distanceKm = this.calculateDistance(colLat, colLng, reqLat, reqLng);
      const serviceRadius = collectorProfile.serviceRadiusKm ? parseFloat(collectorProfile.serviceRadiusKm) : 10.0;

      if (distanceKm !== null && distanceKm > serviceRadius) {
        return {
          eligible: false,
          blockedReason: `Pickup location is ${distanceKm} km away, exceeding your service radius of ${serviceRadius} km`,
          reasons,
          distanceKm,
        };
      }

      if (distanceKm !== null) {
        reasons.push(`Within service radius (${distanceKm} km / max ${serviceRadius} km)`);
      }
    } else if (collectorProfile.city && request.city) {
      if (collectorProfile.city.trim().toLowerCase() !== request.city.trim().toLowerCase()) {
        // Different city
        return {
          eligible: false,
          blockedReason: `Request is in ${request.city}, outside your registered city ${collectorProfile.city}`,
          reasons,
          distanceKm: null,
        };
      }
      reasons.push(`Within same city (${collectorProfile.city})`);
    }

    return {
      eligible: true,
      reasons,
      distanceKm,
    };
  }

  /**
   * Transparent Scoring & Match Factor computation (No black-box AI winner)
   * @param {object} collectorProfile
   * @param {object} request
   * @param {number|null} distanceKm
   * @returns {object} { score: number, matchFactors: object, explanations: string[] }
   */
  scoreRequest(collectorProfile, request, distanceKm) {
    let score = 0;
    const matchFactors = {
      categoryMatch: true,
      distanceKm,
      availabilityMatch: collectorProfile.isAvailable !== false,
      capacityAvailable: true,
      requestedToday: false,
    };
    const explanations = [];

    // Category factor (+30 points)
    score += 30;
    const cats = (request.ewasteItems || []).map((i) => i.category).join(', ');
    explanations.push(`✓ Category supported (${cats || 'E-waste'})`);

    // Distance factor (+40 points max)
    const radius = collectorProfile.serviceRadiusKm ? parseFloat(collectorProfile.serviceRadiusKm) : 10.0;
    if (distanceKm !== null && distanceKm <= radius) {
      const distanceRatio = Math.max(0, 1 - (distanceKm / radius));
      const distScore = Math.round(20 + distanceRatio * 20);
      score += distScore;
      explanations.push(`✓ Within service area (${distanceKm} km)`);
    } else if (distanceKm === null) {
      score += 20; // Default baseline when GPS coordinates are unspecified
      explanations.push('✓ City-level service match');
    }

    // Availability factor (+15 points)
    if (collectorProfile.isAvailable !== false) {
      score += 15;
      explanations.push('✓ Collector is active and accepting pickups');
    }

    // Freshness factor (+15 points if submitted in last 24h)
    if (request.createdAt) {
      const ageHours = (Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours <= 24) {
        score += 15;
        matchFactors.requestedToday = true;
        explanations.push('✓ Recently submitted request');
      } else {
        score += 5;
      }
    }

    return {
      score: Math.min(100, score),
      matchFactors,
      explanations,
    };
  }

  /**
   * Fetch eligible and recommended requests for a collector with transparent signals
   * @param {string} userId - Collector user UUID
   * @param {object} [options]
   * @param {string} [options.filterCategory]
   * @param {number} [options.maxDistanceKm]
   * @param {string} [options.sortBy='distance'|'value'|'newest'|'score']
   * @param {number} [options.page=1]
   * @param {number} [options.limit=10]
   * @returns {Promise<object>}
   */
  async getEligibleRequests(userId, options = {}) {
    let profile = null;
    try {
      profile = await prisma.collectorProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: { id: true, name: true, status: true, role: true },
          },
        },
      });
    } catch {
      // Fallback
    }

    if (!profile) {
      profile = {
        id: userId,
        userId,
        isAvailable: true,
        serviceAreaLat: 20.2961,
        serviceAreaLng: 85.8245,
        serviceRadiusKm: 15.0,
        city: 'Bhubaneswar',
        user: { id: userId, name: 'Collector', status: 'ACTIVE', role: 'INFORMAL_COLLECTOR' },
      };
    }

    // Fetch all open SUBMITTED requests
    const openRequests = await prisma.collectionRequest.findMany({
      where: {
        status: REQUEST_STATUS.SUBMITTED,
      },
      include: {
        ewasteItems: {
          select: {
            id: true,
            category: true,
            condition: true,
            estimatedWeightKg: true,
            imageUrl: true,
            description: true,
          },
        },
        pickupOffers: {
          where: { collectorId: profile.id },
          select: {
            id: true,
            offeredPrice: true,
            status: true,
            createdAt: true,
            notes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const eligibleList = [];

    for (const req of openRequests) {
      const eligibility = this.checkEligibility(profile, req, options);
      if (!eligibility.eligible) continue;

      const primaryItem = req.ewasteItems?.[0] || null;
      const category = primaryItem?.category || 'OTHER';

      // Category filter if requested
      if (options.filterCategory && options.filterCategory.toUpperCase() !== 'ALL') {
        if (category.toUpperCase() !== options.filterCategory.toUpperCase()) {
          continue;
        }
      }

      // Max distance filter if requested
      if (options.maxDistanceKm && eligibility.distanceKm !== null) {
        if (eligibility.distanceKm > parseFloat(options.maxDistanceKm)) {
          continue;
        }
      }

      // Calculate grounded valuation range via EcoValue
      let valuation = null;
      try {
        valuation = await ecoValueService.calculateValue({
          category,
          condition: primaryItem?.condition || 'UNKNOWN',
          weightKg: primaryItem?.estimatedWeightKg ? parseFloat(primaryItem.estimatedWeightKg) : null,
          location: req.city || 'ALL',
        });
      } catch {
        // Non-blocking fallback
      }

      const { score, matchFactors, explanations } = this.scoreRequest(profile, req, eligibility.distanceKm);

      // Sanitize address to protect citizen privacy before offer acceptance
      const sanitizedAddress = [req.landmark ? `Near ${req.landmark}` : null, req.city, req.state].filter(Boolean).join(', ') || 'Service location verified';

      eligibleList.push({
        requestId: req.id,
        shortId: req.id.substring(0, 8),
        status: req.status,
        pickupAddress: sanitizedAddress,
        city: req.city,
        preferredDate: req.preferredDate,
        createdAt: req.createdAt,
        item: {
          category,
          condition: primaryItem?.condition || 'UNKNOWN',
          estimatedWeightKg: primaryItem?.estimatedWeightKg ? parseFloat(primaryItem.estimatedWeightKg) : null,
          imageUrl: primaryItem?.imageUrl || null,
          description: primaryItem?.description || null,
        },
        itemsCount: req.ewasteItems.length,
        valuation: valuation ? {
          isEstimateAvailable: valuation.isEstimateAvailable,
          estimatedRange: valuation.estimatedRange,
          currency: 'INR',
          basis: valuation.basis,
        } : null,
        distanceKm: eligibility.distanceKm,
        score,
        matchFactors,
        recommendationReasons: explanations,
        myOffer: req.pickupOffers?.[0] ? {
          id: req.pickupOffers[0].id,
          offeredPrice: parseFloat(req.pickupOffers[0].offeredPrice),
          status: req.pickupOffers[0].status,
          notes: req.pickupOffers[0].notes,
          createdAt: req.pickupOffers[0].createdAt,
        } : null,
      });
    }

    // Deterministic Sorting (Zero LLM calls)
    const sortBy = options.sortBy || 'distance';
    if (sortBy === 'distance') {
      eligibleList.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortBy === 'value') {
      eligibleList.sort((a, b) => {
        const valA = a.valuation?.estimatedRange?.max || 0;
        const valB = b.valuation?.estimatedRange?.max || 0;
        return valB - valA;
      });
    } else if (sortBy === 'newest') {
      eligibleList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'score') {
      eligibleList.sort((a, b) => b.score - a.score);
    }

    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(options.limit, 10) || 10));
    const total = eligibleList.length;
    const paginated = eligibleList.slice((page - 1) * limit, page * limit);

    return {
      requests: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Offer Sanity Check: Evaluates collector offer against platform estimated value range
   * Returns non-blocking warnings to assist collector without dictating price.
   * @param {object} params
   * @param {string} params.category
   * @param {string} [params.condition='UNKNOWN']
   * @param {number} [params.weightKg]
   * @param {number} params.offeredPrice
   * @returns {Promise<object>}
   */
  async evaluateOfferSanity({ category, condition = 'UNKNOWN', weightKg = null, offeredPrice }) {
    const price = parseFloat(offeredPrice);
    if (isNaN(price) || price <= 0) {
      throw AppError.badRequest('Valid positive offer price is required');
    }

    const valuation = await ecoValueService.calculateValue({
      category,
      condition,
      weightKg,
    });

    if (!valuation || !valuation.isEstimateAvailable || !valuation.estimatedRange) {
      return {
        isEstimateAvailable: false,
        offeredPrice: price,
        status: 'UNAVAILABLE_BENCHMARK',
        message: 'No benchmark estimate available for comparison. Proceed with your standard offer.',
        warning: null,
      };
    }

    const { min, max } = valuation.estimatedRange;

    // 1. Low Offer Warning: below min estimated range
    if (price < min) {
      return {
        isEstimateAvailable: true,
        offeredPrice: price,
        estimatedRange: valuation.estimatedRange,
        isLow: true,
        isHigh: false,
        warning: `Your offer of ₹${price.toLocaleString('en-IN')} is below the current estimated range of ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}.`,
        advice: 'Citizens are more likely to accept offers that align with the platform market benchmark. You can continue or adjust your offer.',
      };
    }

    // 2. High Offer Warning: more than 50% above max estimated range
    if (price > max * 1.5) {
      return {
        isEstimateAvailable: true,
        offeredPrice: price,
        estimatedRange: valuation.estimatedRange,
        isLow: false,
        isHigh: true,
        warning: `Your offer of ₹${price.toLocaleString('en-IN')} is significantly above the current estimated range of ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}.`,
        advice: 'Please verify the amount before submitting to ensure profitable recovery.',
      };
    }

    return {
      isEstimateAvailable: true,
      offeredPrice: price,
      estimatedRange: valuation.estimatedRange,
      isLow: false,
      isHigh: false,
      isNormal: true,
      message: `Your offer of ₹${price.toLocaleString('en-IN')} is within the platform market range.`,
      warning: null,
    };
  }

  /**
   * Explain citizen counter-offer negotiation to collector
   * @param {object} params
   * @param {number} params.originalOfferPrice
   * @param {number} params.counterOfferPrice
   * @param {string} params.category
   * @param {string} [params.condition='WORKING']
   * @returns {Promise<object>}
   */
  async explainNegotiation({ originalOfferPrice, counterOfferPrice, category, condition = 'WORKING' }) {
    const orig = parseFloat(originalOfferPrice) || 0;
    const counter = parseFloat(counterOfferPrice) || 0;
    const diff = counter - orig;

    let valuation = null;
    try {
      valuation = await ecoValueService.calculateValue({ category, condition });
    } catch {
      // Ignore
    }

    let estimateContext = '';
    if (valuation && valuation.isEstimateAvailable && valuation.estimatedRange) {
      const { min, max } = valuation.estimatedRange;
      estimateContext = ` Platform estimated value: ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}.`;
    }

    const message = diff > 0
      ? `The citizen has sent a counter-offer of ₹${counter.toLocaleString('en-IN')} (₹${diff.toLocaleString('en-IN')} above your offer of ₹${orig.toLocaleString('en-IN')}).${estimateContext}`
      : `The citizen proposed ₹${counter.toLocaleString('en-IN')}.${estimateContext}`;

    return {
      originalOfferPrice: orig,
      counterOfferPrice: counter,
      difference: diff,
      estimatedRange: valuation?.estimatedRange || null,
      message,
      actions: [
        { type: 'ACCEPT_COUNTER', label: `Accept ₹${counter.toLocaleString('en-IN')}` },
        { type: 'SEND_COUNTER', label: 'Send Counter-Offer' },
        { type: 'DECLINE', label: 'Decline Offer' },
      ],
    };
  }

  /**
   * Get collector dashboard intelligence summary metrics
   * @param {string} userId - Collector user UUID
   * @returns {Promise<object>}
   */
  async getCollectorDashboardMetrics(userId) {
    let profile = null;
    try {
      profile = await prisma.collectorProfile.findUnique({
        where: { userId },
      });
    } catch {
      // Fallback
    }

    if (!profile) {
      return {
        activePickups: 0,
        pendingOffersCount: 0,
        pendingNegotiationsCount: 0,
        openSubmittedRequestsCount: 0,
        isAvailable: true,
        summaryMessage: 'Collector dashboard is active. You can review matching requests and place offers.',
      };
    }

    const [activePickups, pendingOffers, openRequestsCount] = await Promise.all([
      // Active pickups assigned to this collector
      prisma.collectionRequest.count({
        where: {
          collectorId: profile.id,
          status: { in: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED] },
        },
      }),
      // Pending offers sent by this collector
      prisma.pickupOffer.findMany({
        where: {
          collectorId: profile.id,
          status: 'PENDING',
        },
        select: {
          id: true,
          notes: true,
          offeredPrice: true,
          collectionRequestId: true,
        },
      }),
      // Open submitted requests in system
      prisma.collectionRequest.count({
        where: {
          status: REQUEST_STATUS.SUBMITTED,
        },
      }),
    ]);

    // Pending negotiations (offers with counter notes from citizen)
    const pendingNegotiations = pendingOffers.filter((o) =>
      o.notes && o.notes.includes('[Citizen Counter')
    );

    return {
      activePickups,
      pendingOffersCount: pendingOffers.length,
      pendingNegotiationsCount: pendingNegotiations.length,
      openSubmittedRequestsCount: openRequestsCount,
      isAvailable: profile.isAvailable !== false,
      summaryMessage: pendingNegotiations.length > 0
        ? `${pendingNegotiations.length} negotiation(s) need your attention.`
        : `${activePickups} active pickup(s) currently scheduled.`,
    };
  }
}

module.exports = new EcoMatchService();
