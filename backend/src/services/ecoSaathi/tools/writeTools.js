// EcoSetu Eco-Saathi Controlled WRITE Tools
// Consequential actions requiring strict authorization and explicit confirmation
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/06_ROLES_AND_PERMISSIONS.md

const prisma = require('../../../config/database');
const AppError = require('../../../utils/AppError');
const { ROLES } = require('../../../utils/constants');
const requestService = require('../../requestService');
const ewasteService = require('../../ewasteService');
const auditService = require('../../auditService');

const writeTools = {
  /**
   * Create a new pickup request for an e-waste item
   */
  async createPickupRequest(actor, payload = {}) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');
    if (actor.role !== ROLES.CITIZEN) throw AppError.forbidden('Only citizens can create pickup requests');

    const { category, condition, estimatedWeightKg, pickupAddress, preferredDate, notes } = payload;

    if (!category) throw AppError.badRequest('Category is required');
    if (!pickupAddress) throw AppError.badRequest('Pickup address is required');

    // 1. Create item
    const createdItem = await ewasteService.createItem(actor.id, {
      category: category.toUpperCase(),
      condition: condition ? condition.toUpperCase() : 'UNKNOWN',
      estimatedWeightKg: parseFloat(estimatedWeightKg) || 1.0,
      description: notes || 'Submitted via Eco-Saathi assistant',
      confirmedCategory: category.toUpperCase(),
    });

    // 2. Create collection request with autoSubmit
    const request = await requestService.createRequest(actor.id, {
      pickupAddress: pickupAddress.trim(),
      pickupLat: payload.pickupLat || 20.2961,
      pickupLng: payload.pickupLng || 85.8245,
      preferredDate: preferredDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      itemIds: [createdItem.item.id],
      notes: notes || 'Created via Eco-Saathi',
      autoSubmit: true,
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'ECO_SAATHI_CREATE_PICKUP',
      entityType: 'collection_requests',
      entityId: request.id,
      details: { requestId: request.id, itemId: createdItem.item.id },
    });

    return {
      success: true,
      requestId: request.id,
      status: request.status,
      message: `Pickup request created successfully for ${category}. Nearby collectors have been notified.`,
    };
  },

  /**
   * Citizen counter-offers on an existing collector offer
   */
  async sendCounterOffer(actor, { requestId, offerId, counterPrice, counterAmount, notes }) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');
    if (actor.role !== ROLES.CITIZEN) throw AppError.forbidden('Only citizens can submit counter-offers');

    if (!offerId) throw AppError.badRequest('offerId is required');
    const priceNum = parseFloat(counterPrice !== undefined ? counterPrice : counterAmount);
    if (isNaN(priceNum) || priceNum <= 0) throw AppError.badRequest('Valid counter price is required');

    // Find request if not provided
    let resolvedReqId = requestId;
    if (!resolvedReqId) {
      const offer = await prisma.pickupOffer.findUnique({
        where: { id: offerId },
        select: { collectionRequestId: true },
      });
      if (!offer) throw AppError.notFound('Offer not found');
      resolvedReqId = offer.collectionRequestId;
    }

    const updated = await requestService.counterOffer(actor.id, resolvedReqId, offerId, {
      counterPrice: priceNum,
      notes: notes || 'Counter offer via Eco-Saathi',
    });

    await auditService.logAction({
      actorId: actor.id,
      action: 'ECO_SAATHI_COUNTER_OFFER',
      entityType: 'collection_requests',
      entityId: resolvedReqId,
      details: { requestId: resolvedReqId, offerId, counterPrice: priceNum },
    });

    return {
      success: true,
      offerId,
      counterPrice: priceNum,
      message: `Your counter-offer of ₹${priceNum} has been registered and sent to the collector.`,
    };
  },

  /**
   * Citizen accepts a collector offer
   */
  async acceptOffer(actor, { requestId, offerId }) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');
    if (actor.role !== ROLES.CITIZEN) throw AppError.forbidden('Only citizens can accept offers');

    if (!offerId) throw AppError.badRequest('offerId is required');

    let resolvedReqId = requestId;
    if (!resolvedReqId) {
      const offer = await prisma.pickupOffer.findUnique({
        where: { id: offerId },
        select: { collectionRequestId: true },
      });
      if (!offer) throw AppError.notFound('Offer not found');
      resolvedReqId = offer.collectionRequestId;
    }

    const result = await requestService.acceptOffer(actor.id, resolvedReqId, offerId);

    await auditService.logAction({
      actorId: actor.id,
      action: 'ECO_SAATHI_ACCEPT_OFFER',
      entityType: 'collection_requests',
      entityId: resolvedReqId,
      details: { requestId: resolvedReqId, offerId },
    });

    return {
      success: true,
      requestId: resolvedReqId,
      status: result.request.status,
      collectorAssigned: Boolean(result.request.collectorId),
      message: 'Offer accepted successfully. The collector has been assigned and will schedule your pickup.',
    };
  },

  /**
   * Citizen cancels a pickup request
   */
  async cancelPickupRequest(actor, { requestId, reason }) {
    if (!actor || !actor.id) throw AppError.unauthorized('Authentication required');
    if (actor.role !== ROLES.CITIZEN) throw AppError.forbidden('Only citizens can cancel their pickup requests');
    if (!requestId) throw AppError.badRequest('requestId is required');

    const updated = await requestService.cancelRequest(requestId, reason || 'Cancelled via Eco-Saathi assistant');

    await auditService.logAction({
      actorId: actor.id,
      action: 'ECO_SAATHI_CANCEL_PICKUP',
      entityType: 'collection_requests',
      entityId: requestId,
      details: { requestId, reason },
    });

    return {
      success: true,
      requestId,
      status: updated.status,
      message: 'Collection request has been cancelled.',
    };
  },
};

module.exports = writeTools;
