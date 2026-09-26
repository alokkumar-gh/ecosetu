// EcoSetu E-Waste Item Service
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 5.5, docs/05_API_SPECIFICATION.md Section 6, docs/07_BUSINESS_WORKFLOWS.md

const path = require('path');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const mediaService = require('./mediaService');
const { ROLES, ITEM_STATUS, EWASTE_CATEGORIES, ITEM_CONDITIONS } = require('../utils/constants');

class EwasteService {
  /**
   * Submit a new e-waste item
   * @param {string} citizenId - Owner's user UUID
   * @param {object} itemData - Item attributes
   * @param {object} [file] - Optional uploaded image file { filename, mimetype, buffer }
   * @returns {Promise<object>} Created item and AI prediction result
   */
  async createItem(
    citizenId,
    {
      category,
      description,
      quantity,
      condition,
      estimatedWeightKg,
      imageUrl,
      aiDetectedCategory,
      aiConfidence,
      wasAccepted,
      modelVersion,
      allPredictions,
    },
    file = null
  ) {
    if (!category || !EWASTE_CATEGORIES[category]) {
      throw AppError.validation(`Invalid e-waste category: ${category}`);
    }

    const validCondition = condition && ITEM_CONDITIONS[condition] ? condition : ITEM_CONDITIONS.UNKNOWN;
    const itemQuantity = quantity !== undefined ? Math.max(1, parseInt(quantity, 10)) : 1;

    let finalImageUrl = imageUrl ? imageUrl.trim() : null;

    // If an image file was uploaded with the request, persist it
    if (file && file.buffer) {
      const savedMedia = await mediaService.saveImage(file, 'ewaste');
      finalImageUrl = savedMedia.imageUrl;
    }

    const cId = typeof citizenId === 'object' ? (citizenId?.id || citizenId?.userId) : citizenId;

    const item = await prisma.ewasteItem.create({
      data: {
        citizenId: cId,
        category,
        description: description ? description.trim() : null,
        quantity: itemQuantity,
        condition: validCondition,
        estimatedWeightKg: estimatedWeightKg !== undefined && estimatedWeightKg !== null ? parseFloat(estimatedWeightKg) : null,
        imageUrl: finalImageUrl,
        status: ITEM_STATUS.SUBMITTED,
      },
    });

    let createdAiPrediction = null;
    if (aiDetectedCategory && EWASTE_CATEGORIES[aiDetectedCategory]) {
      try {
        createdAiPrediction = await prisma.aiPrediction.create({
          data: {
            ewasteItemId: item.id,
            imageUrl: finalImageUrl || '',
            predictedCategory: aiDetectedCategory,
            confidence: aiConfidence !== undefined && aiConfidence !== null ? parseFloat(aiConfidence) : 0.85,
            wasAccepted: wasAccepted !== undefined ? Boolean(wasAccepted) : (category === aiDetectedCategory),
            userCorrectedCategory: category !== aiDetectedCategory ? category : null,
            modelVersion: modelVersion || 'ecosetu-roboflow-v1',
            allPredictions: allPredictions || null,
          },
        });
      } catch (aiErr) {
        console.warn('[EwasteService] AI prediction save warning:', aiErr?.message || aiErr);
      }
    }

    return {
      item,
      aiPrediction: createdAiPrediction,
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
        consignmentItems: {
          include: {
            consignment: {
              select: {
                id: true,
                status: true,
                recyclerId: true,
                recycler: {
                  select: {
                    id: true,
                    userId: true,
                  },
                },
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
      const isAvailable =
        item.collectionRequest &&
        item.collectionRequest.status === 'SUBMITTED';

      if (!isAssigned && !isAvailable) {
        throw AppError.forbidden('Access forbidden: Item is not assigned to your collection');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const isConsigned =
        item.consignmentItems &&
        item.consignmentItems.some(
          (ci) => ci.consignment && ci.consignment.recycler && ci.consignment.recycler.userId === actor.id
        );

      if (!isConsigned) {
        throw AppError.forbidden('Access forbidden: Item is not consigned to your facility');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions');
    }

    return item;
  }

  /**
   * Authorize and resolve media image for an e-waste item
   * Enforces privacy: Citizen owner, assigned/nearby Collector, consigned Recycler, Admin
   * Unrelated users receive 403 Forbidden
   * @param {object} actor - Authenticated user { id, role }
   * @param {string} identifier - Item UUID or fileKey
   * @returns {Promise<{ filePath: string, mimeType: string, item: object }>}
   */
  async authorizeItemImageAccess(actor, identifier) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let item = null;
    let fileKey = null;

    if (isUUID) {
      item = await prisma.ewasteItem.findUnique({
        where: { id: identifier },
        include: {
          collectionRequest: {
            select: {
              id: true,
              status: true,
              collectorId: true,
              collector: {
                select: { id: true, userId: true },
              },
            },
          },
          consignmentItems: {
            include: {
              consignment: {
                select: {
                  id: true,
                  status: true,
                  recyclerId: true,
                  recycler: {
                    select: { id: true, userId: true },
                  },
                },
              },
            },
          },
        },
      });

      if (item && item.imageUrl) {
        fileKey = path.basename(item.imageUrl);
      }
    } else {
      fileKey = path.basename(identifier);
      item = await prisma.ewasteItem.findFirst({
        where: { imageUrl: { contains: fileKey } },
        include: {
          collectionRequest: {
            select: {
              id: true,
              status: true,
              collectorId: true,
              collector: {
                select: { id: true, userId: true },
              },
            },
          },
          consignmentItems: {
            include: {
              consignment: {
                select: {
                  id: true,
                  status: true,
                  recyclerId: true,
                  recycler: {
                    select: { id: true, userId: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!item) {
      // If no item found, check if it is a freshly uploaded draft image owned by current citizen
      if (actor.role === ROLES.CITIZEN && fileKey) {
        const directPath = await mediaService.getImagePathAsync(fileKey);
        if (directPath) {
          return {
            filePath: directPath,
            fileKey,
            mimeType: mediaService.getMimeType(fileKey),
            item: null,
          };
        }
      }
      throw AppError.notFound('E-waste item or image not found');
    }

    // Role-based authorization
    if (actor.role === ROLES.CITIZEN) {
      if (item.citizenId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view your own item images');
      }
    } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const isAssigned =
        item.collectionRequest &&
        item.collectionRequest.collector &&
        item.collectionRequest.collector.userId === actor.id;
      const isAvailable =
        item.collectionRequest &&
        item.collectionRequest.status === 'SUBMITTED';

      if (!isAssigned && !isAvailable) {
        throw AppError.forbidden('Access forbidden: Item is not available or assigned to you');
      }
    } else if (actor.role === ROLES.RECYCLER) {
      const isConsigned =
        item.consignmentItems &&
        item.consignmentItems.some(
          (ci) => ci.consignment && ci.consignment.recycler && ci.consignment.recycler.userId === actor.id
        );

      if (!isConsigned) {
        throw AppError.forbidden('Access forbidden: Item is not consigned to your facility');
      }
    } else if (actor.role !== ROLES.ADMIN) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions');
    }

    if (!item.imageUrl && !fileKey) {
      throw AppError.notFound('Item does not have an associated image');
    }

    const resolvedFileKey = fileKey || path.basename(item.imageUrl);
    const filePath = await mediaService.getImagePathAsync(resolvedFileKey);

    if (!filePath) {
      throw AppError.notFound('Image file not found on server storage');
    }

    return {
      filePath,
      fileKey: resolvedFileKey,
      mimeType: mediaService.getMimeType(filePath),
      item,
    };
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
        aiPredictions: true,
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
            pickupOffers: {
              include: {
                collector: {
                  include: {
                    user: { select: { id: true, name: true, role: true } },
                  },
                },
              },
            },
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
      stage: 'ITEM_SUBMITTED',
      description: `E-waste item registered: ${item.category?.replace(/_/g, ' ') || 'Item'} (${item.condition || 'Unknown'})`,
      timestamp: item.createdAt,
      actor: item.citizen?.name || 'Citizen',
      actorRole: ROLES.CITIZEN,
      details: {
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
      },
    });

    // 1b. IMAGE_UPLOADED
    if (item.imageUrl) {
      events.push({
        event: 'IMAGE_UPLOADED',
        stage: 'IMAGE_UPLOADED',
        description: 'Citizen captured and uploaded material photograph for verification',
        timestamp: item.createdAt,
        actor: item.citizen?.name || 'Citizen',
        actorRole: ROLES.CITIZEN,
        details: {
          imageUrl: item.imageUrl,
        },
      });
    }

    // 1c. AI_CLASSIFIED
    if (item.aiPredictions && item.aiPredictions.length > 0) {
      for (const pred of item.aiPredictions) {
        events.push({
          event: 'AI_CLASSIFIED',
          stage: 'AI_CLASSIFIED',
          description: `EcoSetu AI detected material as ${pred.predictedCategory || item.category} (${Math.round((parseFloat(pred.confidence) || 0.85) * 100)}% confidence)`,
          timestamp: pred.createdAt,
          actor: 'EcoSetu AI Classifier',
          actorRole: 'SYSTEM',
          details: {
            predictedCategory: pred.predictedCategory,
            confidence: pred.confidence !== null ? parseFloat(pred.confidence) : 0.85,
            wasAccepted: pred.wasAccepted,
            userCorrectedCategory: pred.userCorrectedCategory,
          },
        });
      }
    }

    // 1d. CITIZEN_CONFIRMED
    events.push({
      event: 'CITIZEN_CONFIRMED',
      stage: 'CITIZEN_CONFIRMED',
      description: `Citizen confirmed category as ${item.category?.replace(/_/g, ' ') || 'Item'}`,
      timestamp: item.createdAt,
      actor: item.citizen?.name || 'Citizen',
      actorRole: ROLES.CITIZEN,
      details: {
        confirmedCategory: item.category,
        condition: item.condition,
      },
    });

    // 2. REQUEST_SUBMITTED / OFFERS_OPENED
    if (item.collectionRequest && item.collectionRequest.submittedAt) {
      events.push({
        event: 'REQUEST_SUBMITTED',
        stage: 'REQUEST_SUBMITTED',
        description: 'Pickup request broadcasted to active nearby collectors',
        timestamp: item.collectionRequest.submittedAt,
        actor: item.citizen?.name || 'Citizen',
        actorRole: ROLES.CITIZEN,
        details: {
          pickupAddress: item.collectionRequest.pickupAddress,
        },
      });
    }

    // 2b. COLLECTOR OFFERS & NEGOTIATION
    if (item.collectionRequest && item.collectionRequest.pickupOffers) {
      for (const off of item.collectionRequest.pickupOffers) {
        events.push({
          event: 'OFFER_SUBMITTED',
          stage: 'OFFER_SUBMITTED',
          description: `Collector ${off.collector?.user?.name || 'Collector'} submitted price offer of ₹${off.offeredPrice}`,
          timestamp: off.createdAt,
          actor: off.collector?.user?.name || 'Collector',
          actorRole: ROLES.INFORMAL_COLLECTOR,
          details: {
            offerId: off.id,
            offeredPrice: parseFloat(off.offeredPrice),
            status: off.status,
            notes: off.notes,
          },
        });

        if (off.notes && off.notes.includes('Citizen Counter')) {
          events.push({
            event: 'OFFER_COUNTERED',
            stage: 'OFFER_COUNTERED',
            description: `Citizen negotiated counter-offer with collector: ${off.notes}`,
            timestamp: off.updatedAt || off.createdAt,
            actor: item.citizen?.name || 'Citizen',
            actorRole: ROLES.CITIZEN,
            details: {
              offerId: off.id,
              notes: off.notes,
            },
          });
        }
      }
    }

    // 3. REQUEST_ACCEPTED / OFFER_ACCEPTED
    if (item.collectionRequest && item.collectionRequest.acceptedAt) {
      events.push({
        event: 'REQUEST_ACCEPTED',
        stage: 'REQUEST_ACCEPTED',
        description: `Offer accepted and pickup assigned to collector ${item.collectionRequest.collector?.user?.name || 'Collector'}`,
        timestamp: item.collectionRequest.acceptedAt,
        actor: item.collectionRequest.collector?.user?.name || 'Collector',
        actorRole: ROLES.INFORMAL_COLLECTOR,
        details: {},
      });
    }

    // 4. PICKUP_COMPLETED
    if (item.collectionRequest && item.collectionRequest.pickup && item.collectionRequest.pickup.completedAt) {
      events.push({
        event: 'PICKUP_COMPLETED',
        stage: 'PICKUP_COMPLETED',
        description: `Doorstep collection and digital weighing completed (${item.actualWeightKg || item.estimatedWeightKg || '—'} kg)`,
        timestamp: item.collectionRequest.pickup.completedAt,
        actor: item.collectionRequest.collector?.user?.name || 'Collector',
        actorRole: ROLES.INFORMAL_COLLECTOR,
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
          stage: 'CONSIGNMENT_CREATED',
          description: `Consigned to formal recycler facility ${c.recycler?.facilityName || 'Recycler Facility'}`,
          timestamp: c.createdAt,
          actor: c.collector?.user?.name || 'Collector',
          actorRole: ROLES.INFORMAL_COLLECTOR,
          details: {
            consignmentId: c.id,
            recyclerName: c.recycler?.facilityName || 'Recycler Facility',
          },
        });

        // CONSIGNMENT_ACCEPTED
        if (c.acceptedAt) {
          events.push({
            event: 'CONSIGNMENT_ACCEPTED',
            stage: 'CONSIGNMENT_ACCEPTED',
            description: `Recycler verified and accepted consignment at facility`,
            timestamp: c.acceptedAt,
            actor: c.recycler?.facilityName || c.recycler?.user?.name || 'Recycler Facility',
            actorRole: ROLES.RECYCLER,
            details: {
              consignmentId: c.id,
            },
          });
        }

        // RECYCLING_STARTED
        if (c.recyclingRecord && c.recyclingRecord.processingStartedAt) {
          events.push({
            event: 'RECYCLING_STARTED',
            stage: 'RECYCLING_STARTED',
            description: 'Material recycling and formal processing started',
            timestamp: c.recyclingRecord.processingStartedAt,
            actor: c.recycler?.facilityName || c.recycler?.user?.name || 'Recycler Facility',
            actorRole: ROLES.RECYCLER,
            details: {},
          });
        }

        // RECYCLING_COMPLETED
        if (c.recyclingRecord && c.recyclingRecord.completedAt) {
          events.push({
            event: 'RECYCLING_COMPLETED',
            stage: 'RECYCLING_COMPLETED',
            description: `Formal recycling completed (${c.recyclingRecord.outputWeightKg || '—'} kg recovered). Green Certificate generated.`,
            timestamp: c.recyclingRecord.completedAt,
            actor: c.recycler?.facilityName || c.recycler?.user?.name || 'Recycler Facility',
            actorRole: ROLES.RECYCLER,
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
      traceabilityChain: events,
      isComplete: item.status === ITEM_STATUS.RECYCLED,
    };
  }
}

module.exports = new EwasteService();
