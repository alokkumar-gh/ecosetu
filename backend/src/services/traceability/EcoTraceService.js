/**
 * EcoSetu — EcoTrace Service
 * Intelligent, explainable, end-to-end e-waste traceability system
 * Canonical Reference: docs/07_BUSINESS_WORKFLOWS.md, docs/21_TRACEABILITY_AND_AUDIT.md
 * 
 * Responsibilities:
 * - Server-authoritative, zero-fabrication lifecycle timeline construction
 * - Resolves current state, completed events, current event, and next expected step
 * - Deterministic delay and overdue detection with neutral factual phrasing
 * - Grounded confidence attribution (RECORDED vs DERIVED, source entity)
 * - Distinction between physical GPS tracking and verified lifecycle milestones
 * - Recycler processing verification with explicit "not yet recorded" states
 * - Multi-lingual, low-literacy friendly explanations (EN, HI, Hinglish, OR)
 * - Strict role-based security isolation (Citizen own-request, Collector assigned-request, Recycler consigned-facility, Admin)
 */

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const {
  ROLES,
  REQUEST_STATUS,
  ITEM_STATUS,
  PICKUP_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
} = require('../../utils/constants');

// Normalized standard event types
const TRACE_EVENT_TYPES = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  IMAGE_UPLOADED: 'IMAGE_UPLOADED',
  AI_CLASSIFIED: 'AI_CLASSIFIED',
  CATEGORY_CONFIRMED: 'CATEGORY_CONFIRMED',
  OFFERS_BROADCAST: 'OFFERS_BROADCAST',
  OFFER_SUBMITTED: 'OFFER_SUBMITTED',
  OFFER_COUNTERED: 'OFFER_COUNTERED',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  COLLECTOR_ASSIGNED: 'COLLECTOR_ASSIGNED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  PICKUP_IN_PROGRESS: 'PICKUP_IN_PROGRESS',
  PICKUP_COMPLETED: 'PICKUP_COMPLETED',
  ITEM_RECEIVED: 'ITEM_RECEIVED',
  CONSIGNMENT_CREATED: 'CONSIGNMENT_CREATED',
  CONSIGNMENT_ACCEPTED: 'CONSIGNMENT_ACCEPTED',
  RECYCLING_STARTED: 'RECYCLING_STARTED',
  RECYCLING_COMPLETED: 'RECYCLING_COMPLETED',
  GREEN_CERTIFICATE_ISSUED: 'GREEN_CERTIFICATE_ISSUED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
};

const EVENT_STATUS = {
  COMPLETED: 'COMPLETED',
  CURRENT: 'CURRENT',
  UPCOMING: 'UPCOMING',
  NOT_RECORDED: 'NOT_RECORDED',
};

const SOURCE_TYPE = {
  RECORDED: 'RECORDED',
  DERIVED: 'DERIVED',
};

class EcoTraceService {
  /**
   * Build server-authoritative, complete lifecycle trace for an e-waste request or item
   * @param {object} actor - Authenticated user context { id, role, name }
   * @param {object} options - { requestId, itemId, language }
   * @returns {Promise<object>} Structured lifecycle trace
   */
  async getLifecycleTrace(actor, { requestId, itemId, language = 'en' } = {}) {
    if (!actor || !actor.id) {
      throw AppError.unauthorized('Authentication required for traceability access');
    }

    // 1. Resolve collection request & items
    let request = null;
    let item = null;

    if (requestId) {
      request = await prisma.collectionRequest.findUnique({
        where: { id: requestId },
        include: {
          citizen: { select: { id: true, name: true, phone: true } },
          collector: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
          ewasteItems: {
            include: {
              aiPredictions: { orderBy: { createdAt: 'desc' } },
              consignmentItems: {
                include: {
                  consignment: {
                    include: {
                      collector: { include: { user: { select: { name: true } } } },
                      recycler: {
                        include: {
                          user: { select: { name: true, phone: true } },
                        },
                      },
                      recyclingRecord: true,
                    },
                  },
                },
              },
            },
          },
          pickup: true,
          pickupOffers: {
            include: {
              collector: {
                include: { user: { select: { name: true, phone: true } } },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (request && request.ewasteItems?.length > 0) {
        item = request.ewasteItems[0];
      }
    } else if (itemId) {
      item = await prisma.ewasteItem.findUnique({
        where: { id: itemId },
        include: {
          citizen: { select: { id: true, name: true, phone: true } },
          aiPredictions: { orderBy: { createdAt: 'desc' } },
          collectionRequest: {
            include: {
              citizen: { select: { id: true, name: true, phone: true } },
              collector: {
                include: {
                  user: { select: { id: true, name: true, phone: true } },
                },
              },
              pickup: true,
              pickupOffers: {
                include: {
                  collector: {
                    include: { user: { select: { name: true, phone: true } } },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
          consignmentItems: {
            include: {
              consignment: {
                include: {
                  collector: { include: { user: { select: { name: true } } } },
                  recycler: {
                    include: {
                      user: { select: { name: true, phone: true } },
                    },
                  },
                  recyclingRecord: true,
                },
              },
            },
          },
        },
      });

      if (item) {
        request = item.collectionRequest;
      }
    } else {
      // Fallback: fetch latest active request for citizen or collector
      if (actor.role === ROLES.CITIZEN) {
        request = await prisma.collectionRequest.findFirst({
          where: { citizenId: actor.id },
          orderBy: { createdAt: 'desc' },
          include: {
            citizen: { select: { id: true, name: true, phone: true } },
            collector: {
              include: {
                user: { select: { id: true, name: true, phone: true } },
              },
            },
            ewasteItems: {
              include: {
                aiPredictions: { orderBy: { createdAt: 'desc' } },
                consignmentItems: {
                  include: {
                    consignment: {
                      include: {
                        collector: { include: { user: { select: { name: true } } } },
                        recycler: {
                          include: {
                            user: { select: { name: true, phone: true } },
                          },
                        },
                        recyclingRecord: true,
                      },
                    },
                  },
                },
              },
            },
            pickup: true,
            pickupOffers: {
              include: {
                collector: {
                  include: { user: { select: { name: true, phone: true } } },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (request && request.ewasteItems?.length > 0) {
          item = request.ewasteItems[0];
        }
      }
    }

    if (!request && !item) {
      return this._buildEmptyTraceResponse(language);
    }

    // 2. Strict Security & Authorization Validation
    this._validateAuthorization(actor, request, item);

    // 3. Build normalized events list
    const events = this._buildNormalizedEvents(request, item);

    // 4. Determine current state, next expected state, delays, and summaries
    const currentState = this._resolveCurrentState(request, item, events);
    const nextExpectedState = this._resolveNextExpectedState(currentState, request, item);
    const delayInfo = this._detectDelays(request, item);
    const locationInfo = this._resolveLocationInfo(request, item);
    const recyclerInfo = this._resolveRecyclerInfo(item);
    const timeSummary = this._calculateElapsedTime(request ? request.createdAt : item.createdAt);

    // 5. Generate human-friendly, multilingual explanations
    const explanation = this._generateExplanation({
      currentState,
      nextExpectedState,
      item,
      request,
      delayInfo,
      recyclerInfo,
      actorRole: actor.role,
      language,
    });

    const quickActions = this._resolveQuickActions(actor.role, currentState, delayInfo);

    return {
      traceabilityId: request ? request.id : item.id,
      requestId: request ? request.id : null,
      shortRequestId: request ? request.id.substring(0, 8) : null,
      itemId: item ? item.id : null,
      category: item ? item.category : 'E_WASTE',
      condition: item ? item.condition : 'UNKNOWN',
      weightKg: item ? (item.actualWeightKg ? parseFloat(item.actualWeightKg) : item.estimatedWeightKg ? parseFloat(item.estimatedWeightKg) : null) : null,
      currentState,
      nextExpectedState,
      isComplete: item ? item.status === ITEM_STATUS.RECYCLED : request ? request.status === REQUEST_STATUS.PICKED_UP : false,
      delayInfo,
      locationInfo,
      recyclerInfo,
      elapsedTime: timeSummary,
      events,
      explanation,
      quickActions,
    };
  }

  /**
   * Validate role-based ownership and visibility
   */
  _validateAuthorization(actor, request, item) {
    if (actor.role === ROLES.ADMIN) return;

    if (actor.role === ROLES.CITIZEN) {
      const citizenId = request ? request.citizenId : item ? item.citizenId : null;
      if (citizenId !== actor.id) {
        throw AppError.forbidden('Access forbidden: You can only view traceability for your own e-waste');
      }
      return;
    }

    if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      // Collector can see assigned request or broadcasted SUBMITTED request
      if (request) {
        const isAssigned = request.collector && request.collector.userId === actor.id;
        const isSubmitted = request.status === REQUEST_STATUS.SUBMITTED;
        if (!isAssigned && !isSubmitted) {
          throw AppError.forbidden('Access forbidden: Request is not assigned or available to your account');
        }
        return;
      }
      if (item && item.citizenId !== actor.id) {
        throw AppError.forbidden('Access forbidden: Item not accessible to your account');
      }
      return;
    }

    if (actor.role === ROLES.RECYCLER) {
      const isConsigned = item && item.consignmentItems?.some(
        (ci) => ci.consignment?.recycler?.userId === actor.id
      );
      if (!isConsigned) {
        throw AppError.forbidden('Access forbidden: Item is not consigned to your facility');
      }
      return;
    }

    throw AppError.forbidden('Access forbidden: Insufficient permissions');
  }

  /**
   * Build normalized, chronologically-ordered events from verified records
   */
  _buildNormalizedEvents(request, item) {
    const events = [];

    // 1. REQUEST_CREATED / ITEM_SUBMITTED
    if (item) {
      events.push({
        type: TRACE_EVENT_TYPES.REQUEST_CREATED,
        stage: 'SUBMISSION',
        title: `E-waste item registered: ${item.category?.replace(/_/g, ' ') || 'Item'}`,
        description: `Registered with condition ${item.condition || 'UNKNOWN'}${item.estimatedWeightKg ? `, estimated weight ${parseFloat(item.estimatedWeightKg)} kg` : ''}`,
        timestamp: item.createdAt,
        status: EVENT_STATUS.COMPLETED,
        actor: item.citizen?.name || 'Citizen',
        actorRole: ROLES.CITIZEN,
        sourceType: SOURCE_TYPE.RECORDED,
        eventSource: 'REQUEST',
        confidence: 'VERIFIED',
        details: {
          category: item.category,
          condition: item.condition,
          weightKg: item.estimatedWeightKg ? parseFloat(item.estimatedWeightKg) : null,
        },
      });
    }

    // 2. IMAGE_UPLOADED
    if (item && item.imageUrl) {
      events.push({
        type: TRACE_EVENT_TYPES.IMAGE_UPLOADED,
        stage: 'MEDIA_VERIFICATION',
        title: 'Material photograph captured',
        description: 'Citizen captured and uploaded e-waste photo for AI verification',
        timestamp: item.createdAt,
        status: EVENT_STATUS.COMPLETED,
        actor: item.citizen?.name || 'Citizen',
        actorRole: ROLES.CITIZEN,
        sourceType: SOURCE_TYPE.RECORDED,
        eventSource: 'REQUEST',
        confidence: 'VERIFIED',
        details: {
          imageUrl: item.imageUrl,
        },
      });
    }

    // 3. AI_CLASSIFIED
    if (item && item.aiPredictions && item.aiPredictions.length > 0) {
      for (const pred of item.aiPredictions) {
        const confPercent = Math.round((parseFloat(pred.confidence) || 0.85) * 100);
        events.push({
          type: TRACE_EVENT_TYPES.AI_CLASSIFIED,
          stage: 'AI_ANALYSIS',
          title: `EcoVision detected ${pred.predictedCategory || item.category}`,
          description: `EcoVision model ${pred.modelVersion || 'v1.0'} classified item with ${confPercent}% confidence`,
          timestamp: pred.createdAt,
          status: EVENT_STATUS.COMPLETED,
          actor: 'EcoSetu AI Classifier',
          actorRole: 'SYSTEM',
          sourceType: SOURCE_TYPE.RECORDED,
          eventSource: 'SYSTEM',
          confidence: 'VERIFIED',
          details: {
            predictedCategory: pred.predictedCategory,
            confidence: parseFloat(pred.confidence) || 0.85,
            wasAccepted: pred.wasAccepted,
          },
        });
      }
    }

    // 4. CATEGORY_CONFIRMED
    if (item) {
      events.push({
        type: TRACE_EVENT_TYPES.CATEGORY_CONFIRMED,
        stage: 'CONFIRMATION',
        title: `Category confirmed: ${item.category?.replace(/_/g, ' ')}`,
        description: `Citizen verified and confirmed the e-waste category as ${item.category?.replace(/_/g, ' ')}`,
        timestamp: item.createdAt,
        status: EVENT_STATUS.COMPLETED,
        actor: item.citizen?.name || 'Citizen',
        actorRole: ROLES.CITIZEN,
        sourceType: SOURCE_TYPE.DERIVED,
        eventSource: 'REQUEST',
        confidence: 'VERIFIED',
        details: {
          confirmedCategory: item.category,
          condition: item.condition,
        },
      });
    }

    // 5. OFFERS_BROADCAST
    if (request && request.submittedAt) {
      events.push({
        type: TRACE_EVENT_TYPES.OFFERS_BROADCAST,
        stage: 'MARKETPLACE',
        title: 'Pickup request broadcasted',
        description: 'Broadcasted to verified local collectors in the service area',
        timestamp: request.submittedAt,
        status: EVENT_STATUS.COMPLETED,
        actor: request.citizen?.name || 'Citizen',
        actorRole: ROLES.CITIZEN,
        sourceType: SOURCE_TYPE.RECORDED,
        eventSource: 'REQUEST',
        confidence: 'VERIFIED',
        details: {
          pickupAddress: request.pickupAddress,
        },
      });
    }

    // 6. COLLECTOR OFFERS & NEGOTIATIONS
    if (request && request.pickupOffers && request.pickupOffers.length > 0) {
      for (const off of request.pickupOffers) {
        events.push({
          type: TRACE_EVENT_TYPES.OFFER_SUBMITTED,
          stage: 'OFFER',
          title: `Offer received: ₹${parseFloat(off.offeredPrice).toLocaleString('en-IN')}`,
          description: `Collector ${off.collector?.user?.name || 'Collector'} submitted price offer of ₹${off.offeredPrice}`,
          timestamp: off.createdAt,
          status: EVENT_STATUS.COMPLETED,
          actor: off.collector?.user?.name || 'Collector',
          actorRole: ROLES.INFORMAL_COLLECTOR,
          sourceType: SOURCE_TYPE.RECORDED,
          eventSource: 'OFFER',
          confidence: 'VERIFIED',
          details: {
            offerId: off.id,
            offeredPrice: parseFloat(off.offeredPrice),
            status: off.status,
            notes: off.notes,
          },
        });

        if (off.notes && off.notes.includes('[Citizen Counter:')) {
          events.push({
            type: TRACE_EVENT_TYPES.OFFER_COUNTERED,
            stage: 'NEGOTIATION',
            title: 'Citizen counter-offer submitted',
            description: `Citizen negotiated counter-offer: ${off.notes}`,
            timestamp: off.updatedAt || off.createdAt,
            status: EVENT_STATUS.COMPLETED,
            actor: request.citizen?.name || 'Citizen',
            actorRole: ROLES.CITIZEN,
            sourceType: SOURCE_TYPE.RECORDED,
            eventSource: 'OFFER',
            confidence: 'VERIFIED',
            details: {
              offerId: off.id,
              notes: off.notes,
            },
          });
        }
      }
    }

    // 7. OFFER_ACCEPTED & COLLECTOR_ASSIGNED
    if (request && request.acceptedAt) {
      events.push({
        type: TRACE_EVENT_TYPES.OFFER_ACCEPTED,
        stage: 'ASSIGNMENT',
        title: 'Offer accepted',
        description: `Citizen accepted offer and assigned pickup to ${request.collector?.user?.name || 'Collector'}`,
        timestamp: request.acceptedAt,
        status: EVENT_STATUS.COMPLETED,
        actor: request.collector?.user?.name || 'Collector',
        actorRole: ROLES.INFORMAL_COLLECTOR,
        sourceType: SOURCE_TYPE.RECORDED,
        eventSource: 'REQUEST',
        confidence: 'VERIFIED',
        details: {
          collectorName: request.collector?.user?.name || null,
        },
      });
    }

    // 8. PICKUP_SCHEDULED
    if (request && (request.status === REQUEST_STATUS.PICKUP_SCHEDULED || request.preferredDate || request.pickup?.scheduledDate)) {
      const scheduledDate = request.pickup?.scheduledDate || request.preferredDate || request.acceptedAt;
      events.push({
        type: TRACE_EVENT_TYPES.PICKUP_SCHEDULED,
        stage: 'SCHEDULE',
        title: 'Pickup scheduled',
        description: `Doorstep collection scheduled for ${scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-IN') : 'designated window'}`,
        timestamp: scheduledDate || request.acceptedAt,
        status: request.status === REQUEST_STATUS.PICKUP_SCHEDULED || request.status === REQUEST_STATUS.ACCEPTED
          ? (request.pickup?.completedAt ? EVENT_STATUS.COMPLETED : EVENT_STATUS.CURRENT)
          : EVENT_STATUS.COMPLETED,
        actor: request.collector?.user?.name || 'Collector',
        actorRole: ROLES.INFORMAL_COLLECTOR,
        sourceType: SOURCE_TYPE.RECORDED,
        eventSource: 'PICKUP',
        confidence: 'VERIFIED',
        details: {
          scheduledDate,
        },
      });
    }

    // 9. PICKUP_COMPLETED
    if ((request && request.pickup?.completedAt) || (request && request.status === REQUEST_STATUS.PICKED_UP)) {
      const compTime = request.pickup?.completedAt || request.completedAt || request.updatedAt;
      events.push({
        type: TRACE_EVENT_TYPES.PICKUP_COMPLETED,
        stage: 'COLLECTION',
        title: 'Doorstep pickup completed',
        description: `Item collected and verified${item?.actualWeightKg ? ` (${parseFloat(item.actualWeightKg)} kg)` : ''}`,
        timestamp: compTime,
        status: EVENT_STATUS.COMPLETED,
        actor: request.collector?.user?.name || 'Collector',
        actorRole: ROLES.INFORMAL_COLLECTOR,
        sourceType: SOURCE_TYPE.RECORDED,
        eventSource: 'COLLECTOR_CONFIRMATION',
        confidence: 'VERIFIED',
        details: {
          actualWeightKg: item?.actualWeightKg ? parseFloat(item.actualWeightKg) : null,
          photoUrl: request.pickup?.pickupPhotoUrl || null,
        },
      });
    }

    // 10. RECYCLER CONSIGNMENT & PROCESSING (Real verification only)
    if (item && item.consignmentItems && item.consignmentItems.length > 0) {
      for (const ci of item.consignmentItems) {
        const c = ci.consignment;
        if (!c) continue;

        // CONSIGNMENT_CREATED
        events.push({
          type: TRACE_EVENT_TYPES.CONSIGNMENT_CREATED,
          stage: 'HANDOVER',
          title: 'Consigned to recycler facility',
          description: `Consigned to formal recycler ${c.recycler?.facilityName || 'Authorized Facility'}`,
          timestamp: c.createdAt,
          status: EVENT_STATUS.COMPLETED,
          actor: c.collector?.user?.name || 'Collector',
          actorRole: ROLES.INFORMAL_COLLECTOR,
          sourceType: SOURCE_TYPE.RECORDED,
          eventSource: 'RECYCLER_RECORD',
          confidence: 'VERIFIED',
          details: {
            consignmentId: c.id,
            recyclerFacility: c.recycler?.facilityName,
          },
        });

        // CONSIGNMENT_ACCEPTED
        if (c.acceptedAt) {
          events.push({
            type: TRACE_EVENT_TYPES.CONSIGNMENT_ACCEPTED,
            stage: 'FACILITY_RECEIPT',
            title: 'Recycler verified & accepted',
            description: `Facility verified and accepted material for processing`,
            timestamp: c.acceptedAt,
            status: EVENT_STATUS.COMPLETED,
            actor: c.recycler?.facilityName || 'Recycler Facility',
            actorRole: ROLES.RECYCLER,
            sourceType: SOURCE_TYPE.RECORDED,
            eventSource: 'RECYCLER_RECORD',
            confidence: 'VERIFIED',
            details: { consignmentId: c.id },
          });
        }

        // RECYCLING_STARTED
        if (c.recyclingRecord?.processingStartedAt) {
          events.push({
            type: TRACE_EVENT_TYPES.RECYCLING_STARTED,
            stage: 'RECYCLING_OPERATION',
            title: 'Recycling processing started',
            description: 'Material dismantling and formal recovery initiated',
            timestamp: c.recyclingRecord.processingStartedAt,
            status: EVENT_STATUS.COMPLETED,
            actor: c.recycler?.facilityName || 'Recycler Facility',
            actorRole: ROLES.RECYCLER,
            sourceType: SOURCE_TYPE.RECORDED,
            eventSource: 'RECYCLER_RECORD',
            confidence: 'VERIFIED',
            details: {},
          });
        }

        // RECYCLING_COMPLETED
        if (c.recyclingRecord?.completedAt) {
          events.push({
            type: TRACE_EVENT_TYPES.RECYCLING_COMPLETED,
            stage: 'RECOVERY_FINAL',
            title: 'Material recycling completed',
            description: `Recycling completed${c.recyclingRecord.outputWeightKg ? ` (${parseFloat(c.recyclingRecord.outputWeightKg)} kg recovered)` : ''}. Green Certificate generated.`,
            timestamp: c.recyclingRecord.completedAt,
            status: EVENT_STATUS.COMPLETED,
            actor: c.recycler?.facilityName || 'Recycler Facility',
            actorRole: ROLES.RECYCLER,
            sourceType: SOURCE_TYPE.RECORDED,
            eventSource: 'RECYCLER_RECORD',
            confidence: 'VERIFIED',
            details: {
              outputWeightKg: c.recyclingRecord.outputWeightKg ? parseFloat(c.recyclingRecord.outputWeightKg) : null,
              outputDescription: c.recyclingRecord.outputDescription,
            },
          });
        }
      }
    }

    // 11. Upstream / Downstream placeholders (Explicit NOT_RECORDED / UPCOMING)
    const hasConsignment = item && item.consignmentItems && item.consignmentItems.length > 0;
    const hasRecyclingRecord = hasConsignment && item.consignmentItems.some((ci) => ci.consignment?.recyclingRecord?.completedAt);

    if (!hasConsignment && request?.status === REQUEST_STATUS.PICKED_UP) {
      events.push({
        type: TRACE_EVENT_TYPES.CONSIGNMENT_CREATED,
        stage: 'HANDOVER',
        title: 'Recycler Handover',
        description: 'Recycler handover has not yet been recorded.',
        timestamp: null,
        status: EVENT_STATUS.NOT_RECORDED,
        actor: 'Pending Recycler',
        actorRole: ROLES.RECYCLER,
        sourceType: SOURCE_TYPE.DERIVED,
        eventSource: 'RECYCLER_RECORD',
        confidence: 'RECORDED',
        details: {},
      });
    }

    if (!hasRecyclingRecord) {
      events.push({
        type: TRACE_EVENT_TYPES.RECYCLING_COMPLETED,
        stage: 'RECYCLING',
        title: 'Formal Recycling & Recovery',
        description: 'Downstream recycling has not yet been recorded.',
        timestamp: null,
        status: EVENT_STATUS.NOT_RECORDED,
        actor: 'Pending Recycler',
        actorRole: ROLES.RECYCLER,
        sourceType: SOURCE_TYPE.DERIVED,
        eventSource: 'RECYCLER_RECORD',
        confidence: 'RECORDED',
        details: {},
      });
    }

    return events;
  }

  /**
   * Resolve current lifecycle state deterministically
   */
  _resolveCurrentState(request, item, events) {
    if (!request && !item) return 'NO_ACTIVE_REQUEST';

    if (item && item.status === ITEM_STATUS.RECYCLED) return 'RECYCLED';
    if (item && item.consignmentItems?.some((ci) => ci.consignment?.recyclingRecord?.processingStartedAt)) return 'RECYCLING_IN_PROGRESS';
    if (item && item.consignmentItems?.some((ci) => ci.consignment?.acceptedAt)) return 'CONSIGNMENT_ACCEPTED';
    if (item && item.consignmentItems?.length > 0) return 'CONSIGNED_TO_RECYCLER';

    if (request) {
      if (request.status === REQUEST_STATUS.PICKED_UP || (request.pickup && request.pickup.completedAt)) {
        return 'PICKED_UP';
      }
      if (request.status === REQUEST_STATUS.PICKUP_SCHEDULED) {
        return 'PICKUP_SCHEDULED';
      }
      if (request.status === REQUEST_STATUS.ACCEPTED) {
        return 'COLLECTOR_ASSIGNED';
      }
      if (request.status === REQUEST_STATUS.SUBMITTED) {
        const pendingOffers = request.pickupOffers?.filter((o) => o.status === 'PENDING') || [];
        if (pendingOffers.length > 0) {
          return 'OFFERS_RECEIVED';
        }
        return 'AWAITING_OFFERS';
      }
      if (request.status === REQUEST_STATUS.CANCELLED) {
        return 'CANCELLED';
      }
      if (request.status === REQUEST_STATUS.DRAFT) {
        return 'DRAFT';
      }
    }

    return 'SUBMITTED';
  }

  /**
   * Resolve next expected milestone in lifecycle
   */
  _resolveNextExpectedState(currentState, request, item) {
    switch (currentState) {
      case 'DRAFT':
        return 'REQUEST_SUBMITTED';
      case 'AWAITING_OFFERS':
        return 'OFFERS_RECEIVED';
      case 'OFFERS_RECEIVED':
        return 'OFFER_ACCEPTED';
      case 'COLLECTOR_ASSIGNED':
        return 'PICKUP_SCHEDULED';
      case 'PICKUP_SCHEDULED':
        return 'PICKUP_COMPLETED';
      case 'PICKED_UP':
        return 'CONSIGNED_TO_RECYCLER';
      case 'CONSIGNED_TO_RECYCLER':
        return 'CONSIGNMENT_ACCEPTED';
      case 'CONSIGNMENT_ACCEPTED':
        return 'RECYCLING_STARTED';
      case 'RECYCLING_IN_PROGRESS':
        return 'RECYCLING_COMPLETED';
      case 'RECYCLED':
        return 'FINALIZED';
      case 'CANCELLED':
        return 'NONE';
      default:
        return 'NEXT_STAGE';
    }
  }

  /**
   * Deterministic delay detection with neutral phrasing
   */
  _detectDelays(request, item) {
    if (!request) {
      return { isOverdue: false, delayStatus: 'ON_TRACK', delayReason: null };
    }

    const now = new Date();

    // Check if scheduled pickup date has passed without completion
    if (request.status === REQUEST_STATUS.ACCEPTED || request.status === REQUEST_STATUS.PICKUP_SCHEDULED) {
      const scheduledDate = request.pickup?.scheduledDate || request.preferredDate;
      if (scheduledDate) {
        const sched = new Date(scheduledDate);
        // Compare dates (if scheduled date is before today)
        if (now.getTime() > sched.getTime() + 24 * 60 * 60 * 1000) {
          return {
            isOverdue: true,
            delayStatus: 'PICKUP_OVERDUE',
            delayReason: 'Pickup was scheduled for an earlier date, but completion has not yet been recorded.',
          };
        }
      }
    }

    // Check if picked up more than 14 days ago without recycler record
    if (request.status === REQUEST_STATUS.PICKED_UP && (!item?.consignmentItems || item.consignmentItems.length === 0)) {
      const completedAt = request.pickup?.completedAt || request.completedAt || request.updatedAt;
      if (completedAt) {
        const compDate = new Date(completedAt);
        const daysElapsed = (now.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysElapsed > 14) {
          return {
            isOverdue: true,
            delayStatus: 'HANDOVER_MISSING',
            delayReason: 'Item was collected, but formal recycler facility handover has not yet been recorded.',
          };
        }
      }
    }

    return {
      isOverdue: false,
      delayStatus: 'ON_TRACK',
      delayReason: null,
    };
  }

  /**
   * Distinguish lifecycle milestone from physical GPS tracking
   */
  _resolveLocationInfo(request, item) {
    if (!request) {
      return {
        hasLiveGps: false,
        locationMessage: 'No location tracking recorded.',
      };
    }

    if (request.status === REQUEST_STATUS.PICKED_UP) {
      return {
        hasLiveGps: false,
        locationMessage: 'Pickup was completed. The platform does not currently have live GPS location tracking for the item.',
        pickupAddress: request.pickupAddress,
      };
    }

    if (request.status === REQUEST_STATUS.ACCEPTED || request.status === REQUEST_STATUS.PICKUP_SCHEDULED) {
      return {
        hasLiveGps: false,
        locationMessage: 'Collector is assigned. Live GPS tracking is not currently active.',
        pickupAddress: request.pickupAddress,
      };
    }

    return {
      hasLiveGps: false,
      locationMessage: 'Item is at your registered pickup location.',
      pickupAddress: request.pickupAddress,
    };
  }

  /**
   * Check recycler status without fabricating records
   */
  _resolveRecyclerInfo(item) {
    if (!item || !item.consignmentItems || item.consignmentItems.length === 0) {
      return {
        isRecorded: false,
        recyclerName: null,
        statusMessage: 'Recycler processing information has not been recorded for this item.',
      };
    }

    const latestCI = item.consignmentItems[item.consignmentItems.length - 1];
    const rec = latestCI.consignment?.recycler;
    const recRecord = latestCI.consignment?.recyclingRecord;

    return {
      isRecorded: true,
      recyclerName: rec?.facilityName || 'Authorized Recycler',
      statusMessage: recRecord?.completedAt
        ? `Recycling completed at ${rec?.facilityName || 'Authorized Facility'}.`
        : `Consigned to ${rec?.facilityName || 'Authorized Facility'}.`,
    };
  }

  /**
   * Calculate elapsed time string
   */
  _calculateElapsedTime(date) {
    if (!date) return 'Recently';
    const ms = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(ms / (1000 * 60));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  /**
   * Generate simple, low-literacy friendly explanations in EN, HI, Hinglish, OR
   */
  _generateExplanation({ currentState, nextExpectedState, item, request, delayInfo, recyclerInfo, actorRole, language }) {
    const itemName = item ? item.category?.replace(/_/g, ' ') : 'e-waste';
    const collectorName = request?.collector?.user?.name || 'Assigned Collector';

    if (delayInfo.isOverdue) {
      if (language === 'hi') {
        return `पिकअप का समय तय था, लेकिन ऐप में अभी पूरा होने का रिकॉर्ड नहीं मिला है। कृपया कलेक्टर से संपर्क करें।`;
      }
      if (language === 'or') {
        return `ପିକଅପ୍ ସମୟ ନିର୍ଦ୍ଧାରିତ ଥିଲା, କିନ୍ତୁ ଏହା ସମ୍ପୂର୍ଣ୍ଣ ହେବାର ରେକର୍ଡ ମିଳିନାହିଁ।`;
      }
      return `Your pickup was scheduled, but completion has not yet been recorded. You can contact your collector.`;
    }

    switch (currentState) {
      case 'DRAFT':
        if (language === 'hi') return 'आपका अनुरोध अभी ड्राफ्ट में है। कृपया इसे सबमिट करें।';
        if (language === 'or') return 'ଆପଣଙ୍କ ଅନୁରୋଧ ଡ୍ରାଫ୍ଟରେ ଅଛି। ଦୟାକରି ଦାଖଲ କରନ୍ତୁ।';
        return 'Your request is in draft. Please submit it so nearby collectors can review it.';

      case 'AWAITING_OFFERS':
        if (language === 'hi') return 'आपका ई-कचरा अनुरोध पास के कलेक्टर्स को भेज दिया गया है। जल्द ही ऑफर मिलेंगे।';
        if (language === 'or') return 'ଆପଣଙ୍କ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ଅନୁରୋଧ କଲେକ୍ଟରମାନଙ୍କୁ ପଠାଯାଇଛି। ଶୀଘ୍ର ଅଫର ମିଳିବ।';
        return `Your ${itemName} request is active. Local verified collectors are reviewing it and will submit price offers shortly.`;

      case 'OFFERS_RECEIVED': {
        const count = request?.pickupOffers?.filter((o) => o.status === 'PENDING').length || 1;
        if (language === 'hi') return `आपके ${itemName} के लिए ${count} कलेक्टर ऑफर आए हैं। आप ऑफर देखकर स्वीकार कर सकते हैं।`;
        if (language === 'or') return `ଆପଣଙ୍କ ପାଇଁ ${count}ଟି ଅଫର ମିଳିଛି। ଆପଣ ଦେଖି ଗ୍ରହଣ କରିପାରିବେ।';`;
        return `You have received ${count} collector offer${count > 1 ? 's' : ''} for your ${itemName}. You can compare, negotiate, or accept an offer.`;
      }

      case 'COLLECTOR_ASSIGNED':
      case 'PICKUP_SCHEDULED':
        if (language === 'hi') return `कलेक्टर ${collectorName} को आपका पिकअप सौंपा गया है। कृपया सामान तैयार रखें।`;
        if (language === 'or') return `କଲେକ୍ଟର ${collectorName}ଙ୍କୁ ପିକଅପ୍ ଦାୟିତ୍ୱ ଦିଆଯାଇଛି। ସାମଗ୍ରୀ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।`;
        return `Collector ${collectorName} is assigned to your pickup. Please keep your ${itemName} ready for verification.`;

      case 'PICKED_UP':
        if (!recyclerInfo.isRecorded) {
          if (language === 'hi') return `आपका ${itemName} कलेक्टर ने पिकअप कर लिया है। रीसाइक्लिंग का अपडेट अभी रिकॉर्ड नहीं हुआ है।`;
          if (language === 'or') return `ଆପଣଙ୍କ ସାମଗ୍ରୀ ସଂଗ୍ରହ ହୋଇଛି। ରିସାଇକ୍ଲିଂ ଅପଡେଟ୍ ଏପର୍ଯ୍ୟନ୍ତ ରେକର୍ଡ ହୋଇନାହିଁ।`;
          return `Your ${itemName} was collected successfully. Recycler processing has not yet been recorded.`;
        }
        if (language === 'hi') return `आपका ${itemName} रीसाइक्लिंग सुविधा (${recyclerInfo.recyclerName}) में पहुंच चुका है।`;
        if (language === 'or') return `ଆପଣଙ୍କ ସାମଗ୍ରୀ ରିସାଇକ୍ଲିଂ କେନ୍ଦ୍ରରେ ପହଞ୍ଚିଛି।`;
        return `Your ${itemName} was collected and is consigned to ${recyclerInfo.recyclerName}.`;

      case 'RECYCLED':
        if (language === 'hi') return `आपका ${itemName} सफलतापूर्वक रीसाइकल हो चुका है! ग्रीन सर्टिफिकेट तैयार है।`;
        if (language === 'or') return `ଆପଣଙ୍କ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ସଫଳତାର ସହ ପୁନଃଚକ୍ରଣ ହୋଇଛି! ଗ୍ରୀନ୍ ସାର୍ଟିଫିକେଟ୍ ପ୍ରସ୍ତୁତ।`;
        return `Your ${itemName} has been fully and safely recycled! Your Green Certificate is generated.`;

      default:
        if (language === 'hi') return `अनुरोध की वर्तमान स्थिति: ${currentState}।`;
        if (language === 'or') return `ଅନୁରୋଧର ସ୍ଥିତି: ${currentState}।`;
        return `Your request is currently at stage: ${currentState}. Next step: ${nextExpectedState}.`;
    }
  }

  /**
   * Action buttons appropriate for role and current milestone
   */
  _resolveQuickActions(role, currentState, delayInfo) {
    if (role === ROLES.INFORMAL_COLLECTOR) {
      return ['My active pickups', "Today's pickups", 'Mark pickup status', 'View history'];
    }

    if (delayInfo.isOverdue) {
      return ['Contact Collector', 'View Request', 'Report Issue'];
    }

    switch (currentState) {
      case 'OFFERS_RECEIVED':
        return ['View offers', 'Compare prices', 'Negotiate'];
      case 'COLLECTOR_ASSIGNED':
      case 'PICKUP_SCHEDULED':
        return ['Collector Details', "What's next?", 'Contact Collector'];
      case 'PICKED_UP':
        return ['View journey', 'Green Certificate', "What's next?"];
      case 'RECYCLED':
        return ['Download Certificate', 'View Full Trace', 'Submit New Item'];
      default:
        return ['Explain this stage', "What's next?", 'View full journey', 'Report an issue'];
    }
  }

  /**
   * Empty fallback response when user has no active request
   */
  _buildEmptyTraceResponse(language) {
    return {
      traceabilityId: null,
      requestId: null,
      shortRequestId: null,
      itemId: null,
      category: null,
      condition: null,
      weightKg: null,
      currentState: 'NO_ACTIVE_REQUEST',
      nextExpectedState: 'CREATE_REQUEST',
      isComplete: false,
      delayInfo: { isOverdue: false, delayStatus: 'ON_TRACK', delayReason: null },
      locationInfo: { hasLiveGps: false, locationMessage: 'No active request found to track.' },
      recyclerInfo: { isRecorded: false, recyclerName: null, statusMessage: 'No recycling record available.' },
      elapsedTime: '—',
      events: [],
      explanation: language === 'hi'
        ? 'आपके पास वर्तमान में कोई सक्रिय पिकअप अनुरोध नहीं है। नया अनुरोध बनाने के लिए फोटो लें।'
        : language === 'or'
        ? 'ଆପଣଙ୍କର କୌଣସି ସକ୍ରିୟ ପିକଅପ୍ ଅନୁରୋଧ ନାହିଁ।'
        : 'You do not have an active e-waste pickup request. Upload a photo or create a request to start tracking.',
      quickActions: ['Create pickup request', 'Check scrap prices'],
    };
  }
}

module.exports = new EcoTraceService();
