// EcoSetu Context Builder
// Securely constructs minimal, privacy-safe conversation context for Eco-Saathi
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/13_SECURITY_PRIVACY.md

const prisma = require('../../config/database');
const { ROLES, REQUEST_STATUS } = require('../../utils/constants');
const { interpretRequestState } = require('./requestStateIntelligence');

class ContextBuilder {
  /**
   * Build authorized context for current request
   * @param {object} actor - Authenticated user { id, role, name, email }
   * @param {object} [clientContext] - Client-reported route/screen/language/entityId
   * @returns {Promise<object>}
   */
  async build(actor, clientContext = {}) {
    if (!actor || !actor.id) {
      return {
        user: { role: 'GUEST', name: 'User' },
        activeRequest: null,
        language: clientContext.language || 'en',
      };
    }

    const context = {
      user: {
        id: actor.id,
        role: actor.role,
        name: actor.name,
      },
      language: clientContext.language || 'en',
      currentScreen: clientContext.currentScreen || clientContext.currentPage || null,
      currentRoute: clientContext.currentRoute || null,
      activeRequest: null,
      currentOffers: [],
      currentTraceability: null,
      recentConversation: clientContext.recentConversation || [],
    };

    try {
      const explicitRequestId = clientContext.requestId || clientContext.activeRequestId || clientContext.entityId;

      if (actor.role === ROLES.CITIZEN) {
        let activeReq = null;

        // 1. If client specifies an explicit requestId, securely verify ownership
        if (explicitRequestId) {
          activeReq = await prisma.collectionRequest.findFirst({
            where: {
              id: explicitRequestId,
              citizenId: actor.id,
            },
            include: {
              ewasteItems: true,
              pickupOffers: {
                include: {
                  collector: {
                    select: {
                      id: true,
                      serviceArea: true,
                      city: true,
                      serviceAreaLat: true,
                      serviceAreaLng: true,
                      user: { select: { name: true, phone: true } },
                    },
                  },
                },
                orderBy: { offeredPrice: 'desc' },
              },
              collector: {
                select: {
                  id: true,
                  serviceArea: true,
                  city: true,
                  user: { select: { name: true, phone: true } },
                },
              },
            },
          });
        }

        // 2. Fallback to latest active collection request if not specified or not matching
        if (!activeReq) {
          activeReq = await prisma.collectionRequest.findFirst({
            where: {
              citizenId: actor.id,
              status: {
                in: [
                  REQUEST_STATUS.DRAFT,
                  REQUEST_STATUS.SUBMITTED,
                  REQUEST_STATUS.ACCEPTED,
                  REQUEST_STATUS.PICKUP_SCHEDULED,
                  REQUEST_STATUS.PICKED_UP,
                ],
              },
            },
            orderBy: { createdAt: 'desc' },
            include: {
              ewasteItems: true,
              pickupOffers: {
                include: {
                  collector: {
                    select: {
                      id: true,
                      serviceArea: true,
                      city: true,
                      serviceAreaLat: true,
                      serviceAreaLng: true,
                      user: { select: { name: true, phone: true } },
                    },
                  },
                },
                orderBy: { offeredPrice: 'desc' },
              },
              collector: {
                select: {
                  id: true,
                  serviceArea: true,
                  city: true,
                  user: { select: { name: true, phone: true } },
                },
              },
            },
          });
        }

        if (activeReq) {
          const stateIntel = interpretRequestState(activeReq, context.language);

          context.activeRequest = {
            id: activeReq.id,
            shortId: activeReq.id.substring(0, 8),
            status: activeReq.status,
            pickupAddress: activeReq.pickupAddress,
            pickupLat: activeReq.pickupLat,
            pickupLng: activeReq.pickupLng,
            scheduledDate: activeReq.scheduledDate,
            items: activeReq.ewasteItems.map((item) => ({
              id: item.id,
              category: item.category,
              condition: item.condition,
              weightKg: item.estimatedWeightKg ? parseFloat(item.estimatedWeightKg) : null,
            })),
            stateIntel,
            offersCount: activeReq.pickupOffers.length,
            assignedCollector: activeReq.collector?.user?.name || null,
          };

          context.currentOffers = activeReq.pickupOffers.map((o) => ({
            id: o.id,
            collectorId: o.collectorId,
            collectorName: o.collector?.user?.name || 'Verified Collector',
            price: parseFloat(o.offeredPrice),
            formattedPrice: `₹${parseFloat(o.offeredPrice).toLocaleString('en-IN')}`,
            status: o.status,
            proposedDate: o.proposedDate,
            notes: o.notes,
            collectorLat: o.collector?.serviceAreaLat,
            collectorLng: o.collector?.serviceAreaLng,
          }));
        }
      } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
        const profile = await prisma.collectorProfile.findUnique({
          where: { userId: actor.id },
          select: { id: true, totalPickups: true, city: true, isAvailable: true },
        });

        if (profile) {
          const pendingPickupsCount = await prisma.collectionRequest.count({
            where: { collectorId: profile.id, status: REQUEST_STATUS.ACCEPTED },
          });

          const pendingOffers = await prisma.pickupOffer.findMany({
            where: { collectorId: profile.id, status: 'PENDING' },
            select: { id: true, notes: true, offeredPrice: true },
          });

          const pendingNegotiationsCount = pendingOffers.filter(
            (o) => o.notes && o.notes.includes('[Citizen Counter')
          ).length;

          context.collectorSummary = {
            id: profile.id,
            totalPickups: profile.totalPickups,
            city: profile.city,
            isAvailable: profile.isAvailable,
            pendingPickups: pendingPickupsCount,
            activeOffers: pendingOffers.length,
            pendingNegotiations: pendingNegotiationsCount,
          };
        }
      }
    } catch (err) {
      console.warn('[ContextBuilder] Error assembling context:', err?.message);
    }

    return context;
  }

  /**
   * Format context into a concise system instruction prompt
   * @param {object} context
   * @returns {string}
   */
  toSystemPrompt(context) {
    const role = context.user?.role || 'GUEST';
    const name = context.user?.name || 'User';
    const screen = context.currentScreen ? `Viewing Screen: ${context.currentScreen}` : '';

    let reqSummary = 'No active request.';
    if (context.activeRequest) {
      const itemNames = context.activeRequest.items.map((i) => `${i.category} (${i.condition})`).join(', ');
      reqSummary = `Active Request: #${context.activeRequest.shortId} | Status: ${context.activeRequest.status} | Items: [${itemNames}] | Offers: ${context.activeRequest.offersCount}`;
    }

    let offersSummary = '';
    if (context.currentOffers && context.currentOffers.length > 0) {
      offersSummary = `Offers: ` + context.currentOffers.map((o) => `${o.collectorName} (${o.formattedPrice}, ${o.status})`).join(' | ');
    }

    return `You are Eco-Saathi, the intelligent assistant of ECOSETU.
You help citizens, collectors, and recyclers interact with the ECOSETU e-waste ecosystem.

User Context:
- User: ${name} (Role: ${role})
- Language: ${context.language || 'English'}
- ${screen}
- ${reqSummary}
- ${offersSummary}

Core Guidelines:
1. Authoritative Data: You must use provided application data as the sole source of truth.
2. Zero Fabrication: Never invent prices, offers, pickup status, collector information, traceability events, recycling events, user information, or database records.
3. Unavailable Information: If required information is not available in the context, clearly say that it is unavailable.
4. Human Confirmation: Do not perform write actions (accepting offers, dispatching pickups) without the existing ECOSETU confirmation flow.
5. Communication Style: Keep responses concise, conversational, and easy to understand.
6. Multilingual: Adapt smoothly to the user's language: English, Hindi, Hinglish, or Odia.
7. TTS Compatibility: Do not unnecessarily use Markdown formatting (like bold asterisks or heading hashes) because responses may be spoken aloud by TTS.`;
  }
}

module.exports = new ContextBuilder();
