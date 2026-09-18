// EcoSetu E-Waste Item Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.5, docs/05_API_SPECIFICATION.md Section 6, docs/07_BUSINESS_WORKFLOWS.md

const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const { ROLES, ITEM_STATUS, EWASTE_CATEGORIES, ITEM_CONDITIONS } = require('../utils/constants');

class EwasteService {
  /**
   * Submit a new e-waste item
   * @param {string} citizenId - Owner's user UUID
   * @param {object} itemData - Item attributes
   * @returns {Promise<object>} Created item and AI prediction result
   */
  async createItem(citizenId, { category, description, quantity, condition, estimatedWeightKg, imageUrl }) {
    if (!category || !EWASTE_CATEGORIES[category]) {
      throw AppError.validation(`Invalid e-waste category: ${category}`);
    }

    const validCondition = condition && ITEM_CONDITIONS[condition] ? condition : ITEM_CONDITIONS.UNKNOWN;
    const itemQuantity = quantity !== undefined ? Math.max(1, parseInt(quantity, 10)) : 1;

    const item = await prisma.ewasteItem.create({
      data: {
        citizenId,
        category,
        description: description ? description.trim() : null,
        quantity: itemQuantity,
        condition: validCondition,
        estimatedWeightKg: estimatedWeightKg !== undefined && estimatedWeightKg !== null ? parseFloat(estimatedWeightKg) : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        status: ITEM_STATUS.SUBMITTED,
      },
    });

    // In accordance with docs/05_API_SPECIFICATION.md:
    // aiPrediction is null if requestAiPrediction is false or AI service is unavailable (deferred microservice)
    return {
      item,
      aiPrediction: null,
    };
  }

  /**
   * List e-waste items for current authenticated citizen
   * @param {string} citizenId - Citizen user UUID
   * @param {object} query - Filtering and pagination parameters
   * @returns {Promise<object>} Items and pagination metadata
   */
  async listItems(citizenId, { status, category, page = 1, limit = 20 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      citizenId,
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.ewasteItem.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ewasteItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get specific e-waste item by ID with role-based access checks
   * @param {object} actor - Authenticated user context (id, role)
   * @param {string} itemId - Item UUID
   * @returns {Promise<object>} Item details
   */
  async getItemById(actor, itemId) {
    const item = await prisma.ewasteItem.findUnique({
      where: { id: itemId },
      include: {
        collectionRequest: {
          select: {
            id: true,
            status: true,
            collectorId: true,
            collector: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw AppError.notFound('E-waste item not found');
    }

    // Role-based resource ownership validation
    if (actor.role === ROLES.CITIZEN) {
      if (item.citizenId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view your own e-waste items');
      }
    } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const isAssigned =
        item.collectionRequest &&
        item.collectionRequest.collector &&
        item.collectionRequest.collector.userId === actor.id;

      if (!isAssigned) {
        throw AppError.forbidden('Access forbidden: Item is not assigned to your collection');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      throw AppError.forbidden('Access forbidden: Item is not consigned to your facility');
    }

    return item;
  }

  /**
   * Get full lifecycle traceability chain for an e-waste item
   * @param {object} actor - Authenticated user context (id, role)
   * @param {string} itemId - Item UUID
   * @returns {Promise<object>} Traceability chain and completion status
   */
  async getItemTraceability(actor, itemId) {
    const item = await prisma.ewasteItem.findUnique({
      where: { id: itemId },
      include: {
        citizen: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        collectionRequest: {
          include: {
            collector: {
              include: {
                user: {
                  select: { id: true, name: true, role: true },
                },
              },
            },
            pickup: true,
          },
        },
        consignmentItems: {
          include: {
            consignment: {
              include: {
                collector: {
                  include: {
                    user: {
                      select: { id: true, name: true, role: true },
                    },
                  },
                },
                recycler: {
                  include: {
                    user: {
                      select: { id: true, name: true, role: true },
                    },
                  },
                },
                recyclingRecord: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw AppError.notFound('E-waste item not found');
    }

    // Role-based authorization per docs/06_ROLES_AND_PERMISSIONS.md line 75 and docs/05_API_SPECIFICATION.md line 477
    if (actor.role === ROLES.CITIZEN) {
      if (item.citizenId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view traceability for your own items');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions to view item traceability');
    }

    // Construct the traceability chain per docs/21_TRACEABILITY_AND_AUDIT.md Section 3 & 4.2
    const events = [];

    // 1. ITEM_SUBMITTED
    events.push({
      event: 'ITEM_SUBMITTED',
      timestamp: item.createdAt,
      actor: {
        name: item.citizen?.name || 'Citizen',
        role: ROLES.CITIZEN,
      },
      details: {
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
      },
    });

    // 2. REQUEST_SUBMITTED
    if (item.collectionRequest && item.collectionRequest.submittedAt) {
      events.push({
        event: 'REQUEST_SUBMITTED',
        timestamp: item.collectionRequest.submittedAt,
        actor: {
          name: item.citizen?.name || 'Citizen',
          role: ROLES.CITIZEN,
        },
        details: {
          pickupAddress: item.collectionRequest.pickupAddress,
        },
      });
    }

    // 3. REQUEST_ACCEPTED
    if (item.collectionRequest && item.collectionRequest.acceptedAt) {
      events.push({
        event: 'REQUEST_ACCEPTED',
        timestamp: item.collectionRequest.acceptedAt,
        actor: {
          name: item.collectionRequest.collector?.user?.name || 'Collector',
          role: ROLES.INFORMAL_COLLECTOR,
        },
        details: {},
      });
    }

    // 4. PICKUP_COMPLETED
    if (item.collectionRequest && item.collectionRequest.pickup && item.collectionRequest.pickup.completedAt) {
      events.push({
        event: 'PICKUP_COMPLETED',
        timestamp: item.collectionRequest.pickup.completedAt,
        actor: {
          name: item.collectionRequest.collector?.user?.name || 'Collector',
          role: ROLES.INFORMAL_COLLECTOR,
        },
        details: {
          actualWeightKg: item.actualWeightKg !== null ? parseFloat(item.actualWeightKg) : null,
        },
      });
    }

    // 5. CONSIGNMENT events
    if (item.consignmentItems && item.consignmentItems.length > 0) {
      const sortedCIs = [...item.consignmentItems].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      for (const ci of sortedCIs) {
        const c = ci.consignment;
        if (!c) continue;

        // CONSIGNMENT_CREATED
        events.push({
          event: 'CONSIGNMENT_CREATED',
          timestamp: c.createdAt,
          actor: {
            name: c.collector?.user?.name || 'Collector',
            role: ROLES.INFORMAL_COLLECTOR,
          },
          details: {
            consignmentId: c.id,
            recyclerName: c.recycler?.facilityName || 'Recycler Facility',
          },
        });

        // CONSIGNMENT_ACCEPTED
        if (c.acceptedAt) {
          events.push({
            event: 'CONSIGNMENT_ACCEPTED',
            timestamp: c.acceptedAt,
            actor: {
              name: c.recycler?.facilityName || c.recycler?.user?.name || 'Recycler Facility',
              role: ROLES.RECYCLER,
            },
            details: {
              consignmentId: c.id,
            },
          });
        }

        // RECYCLING_STARTED
        if (c.recyclingRecord && c.recyclingRecord.processingStartedAt) {
          events.push({
            event: 'RECYCLING_STARTED',
            timestamp: c.recyclingRecord.processingStartedAt,
            actor: {
              name: c.recycler?.facilityName || c.recycler?.user?.name || 'Recycler Facility',
              role: ROLES.RECYCLER,
            },
            details: {},
          });
        }

        // RECYCLING_COMPLETED
        if (c.recyclingRecord && c.recyclingRecord.completedAt) {
          events.push({
            event: 'RECYCLING_COMPLETED',
            timestamp: c.recyclingRecord.completedAt,
            actor: {
              name: c.recycler?.facilityName || c.recycler?.user?.name || 'Recycler Facility',
              role: ROLES.RECYCLER,
            },
            details: {
              outputDescription: c.recyclingRecord.outputDescription,
              outputWeightKg:
                c.recyclingRecord.outputWeightKg !== null
                  ? parseFloat(c.recyclingRecord.outputWeightKg)
                  : null,
            },
          });
        }
      }
    }

    return {
      item: {
        id: item.id,
        category: item.category,
        description: item.description,
        status: item.status,
        quantity: item.quantity,
        createdAt: item.createdAt,
      },
      events,
      isComplete: item.status === ITEM_STATUS.RECYCLED,
    };
  }
}

module.exports = new EwasteService();
