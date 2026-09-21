/**
 * recyclerMatchingService.js
 * Deterministic Economic Matching Engine
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 9 (SIH-MATCH-001..006)
 */

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const priceService = require('./priceService');
const {
  ROLES,
  USER_STATUS,
  RECYCLER_AUTHORIZATION_STATUS,
  RECYCLER_RATE_STATUS,
  PICKUP_AVAILABILITY,
} = require('../utils/constants');

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

class RecyclerMatchingService {
  /**
   * Get deterministic economic matches for a collector's Material Lot
   * @param {string} lotId - Material Lot UUID
   * @param {object} actor - Authenticated user { id, role }
   * @returns {Promise<object>} Structured matching payload
   */
  async getMatchesForLot(lotId, actor) {
    // 1. Fetch Material Lot
    const lot = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: {
        collector: {
          select: {
            id: true,
            userId: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!lot) {
      throw AppError.notFound('Material Lot not found');
    }

    // 2. Ownership verification: If INFORMAL_COLLECTOR, ensure lot belongs to them
    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      if (lot.collector.userId !== actor.id) {
        throw AppError.forbidden('Cannot match a material lot belonging to another collector');
      }
    }

    // 3. Compute baseline rule-based value estimate for context
    let marketEstimate = null;
    try {
      if (lot.approximateTotalWeightKg) {
        marketEstimate = await priceService.calculateEstimate({
          category: lot.category,
          weightKg: parseFloat(lot.approximateTotalWeightKg.toString()),
          location: lot.collector.city || 'ALL',
        });
      }
    } catch (err) {
      // Non-blocking: continue without market estimate if unavailable
    }


    // 4. Query all candidate recycler profiles
    const recyclers = await prisma.recyclerProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        offeredRates: {
          where: {
            category: lot.category,
          },
          orderBy: {
            rate: 'desc',
          },
        },
      },
    });

    const now = new Date();
    const lotLat = lot.collectionLat ? parseFloat(lot.collectionLat.toString()) : null;
    const lotLng = lot.collectionLng ? parseFloat(lot.collectionLng.toString()) : null;

    // 5. Evaluate deterministic match criteria for each recycler
    const matchResults = recyclers.map((recycler) => {
      const matchReasons = [];
      let matchStatus = 'NOT_ELIGIBLE';

      // --- Dimension 1: Authorization & Verification ---
      const isUserActive = recycler.user && recycler.user.status === USER_STATUS.ACTIVE;
      const isFacilityActive = recycler.isActive !== false;
      const isDateExpired = Boolean(recycler.authorizationValidTill && new Date(recycler.authorizationValidTill) < now);
      const isAuthorized = recycler.authorizationStatus === RECYCLER_AUTHORIZATION_STATUS.AUTHORIZED && !isDateExpired;
      const isProvisional = recycler.authorizationStatus === RECYCLER_AUTHORIZATION_STATUS.PROVISIONAL && !isDateExpired;
      const isAuthEligible = (isAuthorized || isProvisional) && isFacilityActive && isUserActive;

      if (!isFacilityActive) {
        matchReasons.push('✗ Recycler facility is currently INACTIVE');
      } else if (isDateExpired || recycler.authorizationStatus === RECYCLER_AUTHORIZATION_STATUS.EXPIRED) {
        matchReasons.push('✗ Recycler authorization is EXPIRED or validity passed');
      } else if (recycler.authorizationStatus === RECYCLER_AUTHORIZATION_STATUS.PENDING) {
        matchReasons.push('✗ Recycler not verified (authorization is PENDING administrative review)');
      } else if (recycler.authorizationStatus === RECYCLER_AUTHORIZATION_STATUS.SUSPENDED) {
        matchReasons.push('✗ Recycler authorization is SUSPENDED');
      } else if (recycler.authorizationStatus === RECYCLER_AUTHORIZATION_STATUS.REJECTED) {
        matchReasons.push('✗ Recycler authorization was REJECTED');
      } else if (isAuthorized) {
        matchReasons.push('✓ Authorized recycler (Active CPCB/SPCB registration)');
      } else if (isProvisional) {
        matchReasons.push('⚠️ Provisional recycler (State permit / provisional review)');
      } else {
        matchReasons.push('✗ Recycler not verified or authorization not active');
      }

      // --- Dimension 2: Material Category Acceptance ---
      const acceptsViaCategoryList = Array.isArray(recycler.acceptedCategories) &&
        recycler.acceptedCategories.includes(lot.category);
      const acceptsViaRate = recycler.offeredRates && recycler.offeredRates.length > 0;
      const materialAccepted = acceptsViaCategoryList || acceptsViaRate;

      if (materialAccepted) {
        matchReasons.push(`✓ Accepts ${lot.category.replace(/_/g, ' ')}`);
      } else {
        matchReasons.push(`✗ Does not accept ${lot.category.replace(/_/g, ' ')}`);
      }

      // --- Dimension 3: Active Offered Rate ---
      const activeRateRecord = recycler.offeredRates.find((r) => {
        const isStatusActive = r.status === RECYCLER_RATE_STATUS.ACTIVE;
        const isEffective = new Date(r.effectiveDate) <= now;
        const notExpired = !r.expiryDate || new Date(r.expiryDate) >= now;
        return isStatusActive && isEffective && notExpired;
      });

      let offeredRate = null;
      if (activeRateRecord) {
        offeredRate = {
          id: activeRateRecord.id,
          amount: parseFloat(activeRateRecord.rate.toString()),
          unit: activeRateRecord.unit,
          currency: activeRateRecord.currency,
          effectiveDate: activeRateRecord.effectiveDate,
          expiryDate: activeRateRecord.expiryDate,
          status: activeRateRecord.status,
          sourceReference: activeRateRecord.sourceReference,
          pickupAvailable: activeRateRecord.pickupAvailable,
        };
        matchReasons.push(`✓ Active rate: ₹${offeredRate.amount} / ${offeredRate.unit.replace('PER_', '').toLowerCase()}`);
      } else {
        matchReasons.push('⚠ Current offered rate unavailable');
      }

      // --- Dimension 4: Geographic Proximity & Service Area ---
      const facLat = recycler.facilityLat ? parseFloat(recycler.facilityLat.toString()) : null;
      const facLng = recycler.facilityLng ? parseFloat(recycler.facilityLng.toString()) : null;
      const distanceKm = calculateHaversineDistanceKm(lotLat, lotLng, facLat, facLng);
      const serviceRadius = recycler.serviceRadiusKm ? parseFloat(recycler.serviceRadiusKm.toString()) : 25;

      let withinServiceArea = false;
      if (distanceKm !== null) {
        if (distanceKm <= serviceRadius) {
          withinServiceArea = true;
          matchReasons.push(`✓ Within service radius (${distanceKm} km away)`);
        } else {
          matchReasons.push(`⚠ Outside primary radius (${distanceKm} km away, max ${serviceRadius} km)`);
        }
      } else if (recycler.city && lot.collector.city &&
        recycler.city.toLowerCase() === lot.collector.city.toLowerCase()) {
        withinServiceArea = true;
        matchReasons.push(`✓ Serves collector city (${recycler.city})`);
      } else if (recycler.serviceArea) {
        withinServiceArea = true;
        matchReasons.push(`✓ Listed service area: ${recycler.serviceArea}`);
      } else {
        matchReasons.push('⚠ Service area coverage unconfirmed');
      }

      // --- Dimension 5: Pickup Availability ---
      const effectivePickup = (activeRateRecord && activeRateRecord.pickupAvailable !== PICKUP_AVAILABILITY.UNKNOWN)
        ? activeRateRecord.pickupAvailable
        : recycler.pickupAvailable;

      if (effectivePickup === PICKUP_AVAILABILITY.AVAILABLE) {
        matchReasons.push('✓ Recycler pickup available');
      } else if (effectivePickup === PICKUP_AVAILABILITY.NOT_AVAILABLE) {
        matchReasons.push('ℹ Facility drop-off / self-delivery required');
      } else {
        matchReasons.push('⚠ Pickup availability unknown');
      }

      // --- Status Synthesis (Deterministic) ---
      if (!isAuthEligible || !materialAccepted) {
        matchStatus = 'NOT_ELIGIBLE';
      } else if (isProvisional) {
        // Provisional facilities are eligible for partial match comparison, but never official MATCHED
        matchStatus = 'PARTIAL_MATCH';
      } else if (activeRateRecord && withinServiceArea) {
        matchStatus = 'MATCHED';
      } else {
        matchStatus = 'PARTIAL_MATCH';
      }

      return {
        recyclerId: recycler.id,
        facilityName: recycler.facilityName,
        facilityAddress: recycler.facilityAddress,
        city: recycler.city,
        state: recycler.state,
        authorizationStatus: recycler.authorizationStatus,
        materialAccepted,
        offeredRate,
        pickupAvailability: effectivePickup,
        serviceArea: recycler.serviceArea || recycler.city || 'Standard Area',
        distanceKm,
        matchStatus,
        matchReasons,
      };
    });

    // 6. Sort deterministically:
    // MATCHED first, then PARTIAL_MATCH, then NOT_ELIGIBLE
    // Within status: offered rate descending (highest rate first)
    const statusOrder = { MATCHED: 0, PARTIAL_MATCH: 1, NOT_ELIGIBLE: 2 };
    matchResults.sort((a, b) => {
      if (statusOrder[a.matchStatus] !== statusOrder[b.matchStatus]) {
        return statusOrder[a.matchStatus] - statusOrder[b.matchStatus];
      }
      const rateA = a.offeredRate ? a.offeredRate.amount : 0;
      const rateB = b.offeredRate ? b.offeredRate.amount : 0;
      return rateB - rateA;
    });

    return {
      lot: {
        id: lot.id,
        referenceNumber: lot.referenceNumber,
        category: lot.category,
        subcategory: lot.subcategory,
        approximateTotalWeightKg: lot.approximateTotalWeightKg ? parseFloat(lot.approximateTotalWeightKg.toString()) : null,
        condition: lot.condition,
        sourceType: lot.sourceType,
      },
      marketEstimate,
      matches: matchResults,
      disclaimer: 'Deterministic rule-based economic matching. Recycler offers represent published buying rates and do not constitute a guaranteed contract until formal quotation and handover.',
    };
  }
}

module.exports = new RecyclerMatchingService();
