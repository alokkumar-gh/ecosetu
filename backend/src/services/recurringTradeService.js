// EcoSetu Recurring Trade & Relationship Service
// Canonical Reference: SIH Problem Statement 26229 - Marketplace Phase 6: Demand Discovery & Recurring Trade

const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const { ROLES, TRANSACTION_STATUS, PAYMENT_STATUS } = require('../utils/constants');

class RecurringTradeService {
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
   * Calculate factual trading relationship between two authorized market participants
   * @param {object|string} actor
   * @param {string} targetPartyId - User ID or Profile ID of counterparty
   */
  async getTradingRelationship(actor, targetPartyId) {
    const user = await this.resolveActor(actor);

    if (!targetPartyId) {
      throw AppError.badRequest('Target party ID is required');
    }

    let collectorProfileId = null;
    let recyclerProfileId = null;

    if (user.role === ROLES.INFORMAL_COLLECTOR) {
      const collector = await prisma.collectorProfile.findUnique({ where: { userId: user.id } });
      if (!collector) throw AppError.forbidden('Collector profile not found');
      collectorProfileId = collector.id;

      // targetPartyId can be recycler userId or recyclerProfile id
      const recycler = await prisma.recyclerProfile.findFirst({
        where: {
          OR: [{ id: targetPartyId }, { userId: targetPartyId }],
        },
      });
      if (recycler) recyclerProfileId = recycler.id;
    } else if (user.role === ROLES.RECYCLER) {
      const recycler = await prisma.recyclerProfile.findUnique({ where: { userId: user.id } });
      if (!recycler) throw AppError.forbidden('Recycler profile not found');
      recyclerProfileId = recycler.id;

      // targetPartyId can be collector userId or collectorProfile id
      const collector = await prisma.collectorProfile.findFirst({
        where: {
          OR: [{ id: targetPartyId }, { userId: targetPartyId }],
        },
      });
      if (collector) collectorProfileId = collector.id;
    } else if (user.role === ROLES.ADMIN) {
      // Admin query
      const c = await prisma.collectorProfile.findFirst({
        where: { OR: [{ id: targetPartyId }, { userId: targetPartyId }] },
      });
      if (c) collectorProfileId = c.id;
    }

    if (!collectorProfileId || !recyclerProfileId) {
      return {
        hasPreviousTrade: false,
        completedTransactionsCount: 0,
        totalWeightKg: 0,
        totalValueINR: 0,
        categoriesTraded: [],
        lastTransactionDate: null,
        relationshipEstablishedDate: null,
      };
    }

    const completedTxns = await prisma.transactionRecord.findMany({
      where: {
        collectorId: collectorProfileId,
        recyclerId: recyclerProfileId,
        transactionStatus: TRANSACTION_STATUS.RECORDED,
      },
      include: {
        materialLot: {
          select: {
            category: true,
          },
        },
        handover: {
          select: {
            handoverWeightKg: true,
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    if (completedTxns.length === 0) {
      return {
        hasPreviousTrade: false,
        completedTransactionsCount: 0,
        totalWeightKg: 0,
        totalValueINR: 0,
        categoriesTraded: [],
        lastTransactionDate: null,
        relationshipEstablishedDate: null,
      };
    }

    let totalWeight = 0;
    let totalValue = 0;
    const categoriesSet = new Set();

    for (const txn of completedTxns) {
      if (txn.finalSaleValue) {
        totalValue += Number(txn.finalSaleValue);
      }
      if (txn.handover?.handoverWeightKg) {
        totalWeight += Number(txn.handover.handoverWeightKg);
      } else if (txn.quantity) {
        totalWeight += Number(txn.quantity);
      }
      if (txn.materialLot?.category) {
        categoriesSet.add(txn.materialLot.category);
      } else if (txn.category) {
        categoriesSet.add(txn.category);
      }
    }

    return {
      hasPreviousTrade: true,
      completedTransactionsCount: completedTxns.length,
      totalWeightKg: Number(totalWeight.toFixed(2)),
      totalValueINR: Number(totalValue.toFixed(2)),
      categoriesTraded: Array.from(categoriesSet),
      lastTransactionDate: completedTxns[0].transactionDate,
      relationshipEstablishedDate: completedTxns[completedTxns.length - 1].transactionDate,
    };
  }

  /**
   * "Sell Again" template generator for Collectors
   * Prefills clean descriptive data for a new MaterialLot without copying previous transactional entities.
   * @param {object|string} actor
   * @param {string} sourceLotId
   */
  async getSellAgainTemplate(actor, sourceLotId) {
    const user = await this.resolveActor(actor);
    if (user.role !== ROLES.INFORMAL_COLLECTOR && user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Only informal collectors can use the Sell Again feature');
    }

    const collector = await prisma.collectorProfile.findUnique({ where: { userId: user.id } });
    if (!collector && user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Collector profile not found');
    }

    const sourceLot = await prisma.materialLot.findUnique({
      where: { id: sourceLotId },
    });

    if (!sourceLot) {
      throw AppError.notFound('Source material lot not found');
    }

    if (user.role !== ROLES.ADMIN && sourceLot.collectorId !== collector.id) {
      throw AppError.forbidden('You can only create a Sell Again template from your own previous material lots');
    }

    // Return clean template for new lot creation
    return {
      category: sourceLot.category,
      subcategory: sourceLot.subcategory || null,
      description: sourceLot.description || null,
      condition: sourceLot.condition,
      sourceType: sourceLot.sourceType,
      approximateTotalWeightKg: sourceLot.approximateTotalWeightKg ? Number(sourceLot.approximateTotalWeightKg) : null,
      sourceLotReference: sourceLot.referenceNumber,
    };
  }

  /**
   * "Source Again" template generator for Recyclers
   * Prefills clean descriptive data for a new SourcingRequest without modifying previous requests.
   * @param {object|string} actor
   * @param {string} sourceRequestId
   */
  async getSourceAgainTemplate(actor, sourceRequestId) {
    const user = await this.resolveActor(actor);
    if (user.role !== ROLES.RECYCLER && user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Only recyclers can use the Source Again feature');
    }

    const recycler = await prisma.recyclerProfile.findUnique({ where: { userId: user.id } });
    if (!recycler && user.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Recycler profile not found');
    }

    const sourceReq = await prisma.sourcingRequest.findUnique({
      where: { id: sourceRequestId },
    });

    if (!sourceReq) {
      throw AppError.notFound('Source sourcing request not found');
    }

    if (user.role !== ROLES.ADMIN && sourceReq.recyclerId !== recycler.id) {
      throw AppError.forbidden('You can only create a Source Again template from your own previous sourcing requests');
    }

    // Return clean template for new sourcing request creation
    return {
      materialCategory: sourceReq.materialCategory,
      materialSubcategory: sourceReq.materialSubcategory || null,
      condition: sourceReq.condition,
      minimumWeightKg: Number(sourceReq.minimumWeightKg),
      targetWeightKg: sourceReq.targetWeightKg ? Number(sourceReq.targetWeightKg) : null,
      maximumWeightKg: sourceReq.maximumWeightKg ? Number(sourceReq.maximumWeightKg) : null,
      pickupRequired: sourceReq.pickupRequired,
      pickupArea: sourceReq.pickupArea || null,
      offeredRatePerKg: sourceReq.offeredRatePerKg ? Number(sourceReq.offeredRatePerKg) : null,
      rateUnit: sourceReq.rateUnit,
      notes: sourceReq.notes || null,
      sourceRequestReference: sourceReq.referenceNumber,
    };
  }
}

module.exports = new RecurringTradeService();
