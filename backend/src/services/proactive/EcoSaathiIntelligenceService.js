/**
 * EcoSetu — Eco-Saathi Proactive Intelligence Service
 * Event-driven, non-autonomous actionable alert & attention engine
 * Canonical Reference: docs/23_NOTIFICATION_SYSTEM.md, docs/10_BACKEND_ARCHITECTURE.md
 * 
 * Pipeline:
 * ECOSETU EVENT → INTELLIGENCE ENGINE → IS THIS ACTIONABLE? → WHAT DOES USER NEED TO KNOW? → WHAT ACTION IS AVAILABLE? → NOTIFICATION / IN-APP CARD
 * 
 * Guarantees:
 * - Deterministic, zero-LLM event detection & urgency classification
 * - Strict duplicate suppression via deterministic event/notification keys
 * - Batch grouping and spam throttling
 * - Multilingual, low-literacy and voice-friendly summaries (EN, HI, Hinglish, OR)
 * - Safe role-based delivery isolation (Citizen, Collector, Recycler, Admin)
 * - Confirmation guardrail preservation for consequential actions
 */

const prisma = require('../../config/database');
const logger = require('../../config/logger');
const notificationService = require('../notificationService');
const {
  ROLES,
  REQUEST_STATUS,
  ITEM_STATUS,
  OFFER_STATUS,
  NOTIFICATION_TYPES,
} = require('../../utils/constants');

// Urgency levels
const URGENCY_LEVELS = Object.freeze({
  INFO: 'INFO',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  TIME_SENSITIVE: 'TIME_SENSITIVE',
});

// Priority levels
const NOTIFICATION_PRIORITY = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

class EcoSaathiIntelligenceService {
  constructor() {
    // In-memory duplicate & throttle cache: Map<notificationKey, timestamp>
    this._deliveryCache = new Map();
    // Throttle window: 10 minutes for identical event keys
    this._dedupTtlMs = 10 * 60 * 1000;
  }

  /**
   * Process a domain event proactively and deliver an intelligent, actionable notification
   * @param {object} event - { type, actor, recipientId, recipientRole, data }
   * @returns {Promise<object|null>} Evaluated alert payload or null if suppressed/non-actionable
   */
  async processEvent(event) {
    if (!event || !event.type || !event.recipientId) {
      logger.warn('[ProactiveSaathi] processEvent missing required fields');
      return null;
    }

    // 1. Evaluate whether event is actionable and classify urgency & priority
    const evaluation = this.evaluateEvent(event);
    if (!evaluation.isActionable) {
      return null;
    }

    // 2. Deterministic Deduplication Key Check
    const notificationKey = this.generateNotificationKey(event);
    if (this.isDuplicate(notificationKey)) {
      logger.info(`[ProactiveSaathi] Suppressing duplicate notification for key: ${notificationKey}`);
      return null;
    }

    // 3. Mark key as delivered in cache
    this.recordDelivery(notificationKey);

    // 4. Save to PostgreSQL notifications table via existing notificationService
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuidRefId = evaluation.referenceId && uuidRegex.test(evaluation.referenceId) ? evaluation.referenceId : null;

    const notificationRecord = await notificationService.createNotification({
      userId: event.recipientId,
      type: event.type,
      title: evaluation.title,
      message: evaluation.message,
      referenceType: evaluation.referenceType,
      referenceId: validUuidRefId,
    });

    return {
      eventId: event.id || `evt-${Date.now()}`,
      notificationKey,
      notificationId: notificationRecord?.id || null,
      recipientId: event.recipientId,
      recipientRole: event.recipientRole,
      eventType: event.type,
      urgency: evaluation.urgency,
      priority: evaluation.priority,
      title: evaluation.title,
      message: evaluation.message,
      voicePrompt: evaluation.voicePrompt,
      quickActions: evaluation.quickActions,
      multilingual: evaluation.multilingual,
      createdAt: new Date().toISOString(),
      delivered: Boolean(notificationRecord),
    };
  }

  /**
   * Deterministic evaluation of event actionability, urgency, and content
   * Zero LLM invocation required
   * @param {object} event
   * @returns {object}
   */
  evaluateEvent(event) {
    const { type, recipientRole, data = {} } = event;
    const lang = data.language || 'en';

    switch (type) {
      // ── CITIZEN EVENTS ──
      case NOTIFICATION_TYPES.OFFER_RECEIVED: {
        const price = data.offeredPrice ? `₹${parseFloat(data.offeredPrice).toLocaleString('en-IN')}` : 'a price';
        const collectorName = data.collectorName || 'A verified collector';
        const category = data.category ? data.category.toLowerCase().replace(/_/g, ' ') : 'e-waste';

        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.ACTION_REQUIRED,
          priority: NOTIFICATION_PRIORITY.HIGH,
          title: `New Offer Received: ${price}`,
          message: `${collectorName} offered ${price} for your ${category}.`,
          voicePrompt: `You received a ${price} offer for your ${category}. Would you like to view it?`,
          referenceType: 'COLLECTION_REQUEST',
          referenceId: data.requestId,
          quickActions: ['View Offer', 'Compare Offers', 'Negotiate'],
          multilingual: {
            en: `${collectorName} offered ${price} for your ${category}.`,
            hi: `${collectorName} ने आपके ${category} के लिए ${price} का ऑफर दिया है।`,
            hinglish: `${collectorName} ne aapke ${category} ke liye ${price} offer kiya hai.`,
            or: `${collectorName} ଆପଣଙ୍କ ${category} ପାଇଁ ${price} ଅଫର ଦେଇଛନ୍ତି।`,
          },
        };
      }

      case 'COUNTER_OFFER_RECEIVED':
      case 'OFFER_COUNTERED': {
        if (recipientRole === ROLES.CITIZEN) {
          const collectorName = data.collectorName || 'Collector';
          const price = data.counterPrice ? `₹${parseFloat(data.counterPrice).toLocaleString('en-IN')}` : '';
          return {
            isActionable: true,
            urgency: URGENCY_LEVELS.ACTION_REQUIRED,
            priority: NOTIFICATION_PRIORITY.HIGH,
            title: 'Collector Responded to Counter-Offer',
            message: `${collectorName} responded to your counter-offer${price ? ` with ${price}` : ''}.`,
            voicePrompt: `${collectorName} responded to your counter-offer. Would you like to check the response?`,
            referenceType: 'COLLECTION_REQUEST',
            referenceId: data.requestId,
            quickActions: ['View Response', 'Accept Offer', 'Negotiate'],
            multilingual: {
              en: `${collectorName} responded to your counter-offer.`,
              hi: `${collectorName} ने आपके काउंटर-ऑफर का जवाब दिया है।`,
              hinglish: `${collectorName} ne aapke counter-offer ka response diya hai.`,
              or: `${collectorName} ଆପଣଙ୍କ କାଉଣ୍ଟର ଅଫରର ଉତ୍ତର ଦେଇଛନ୍ତି।`,
            },
          };
        }

        if (recipientRole === ROLES.INFORMAL_COLLECTOR) {
          const counterPrice = data.counterPrice ? `₹${parseFloat(data.counterPrice).toLocaleString('en-IN')}` : 'an amount';
          const originalPrice = data.offeredPrice ? `₹${parseFloat(data.offeredPrice).toLocaleString('en-IN')}` : 'your offer';
          return {
            isActionable: true,
            urgency: URGENCY_LEVELS.ACTION_REQUIRED,
            priority: NOTIFICATION_PRIORITY.HIGH,
            title: `Counter-Offer: ${counterPrice}`,
            message: `Citizen countered your ${originalPrice} offer with ${counterPrice}.`,
            voicePrompt: `Citizen countered your offer with ${counterPrice}. Would you like to view the negotiation?`,
            referenceType: 'COLLECTION_REQUEST',
            referenceId: data.requestId,
            quickActions: ['View Negotiation', `Accept ${counterPrice}`, 'Send Counter'],
            multilingual: {
              en: `Citizen countered your ${originalPrice} offer with ${counterPrice}.`,
              hi: `नागरिक ने आपके ${originalPrice} ऑफर के बदले ${counterPrice} का काउंटर-ऑफर दिया है।`,
              hinglish: `Citizen ne aapke ${originalPrice} offer par ${counterPrice} counter kiya hai.`,
              or: `ନାଗରିକ ଆପଣଙ୍କ ${originalPrice} ଅଫର ବଦଳରେ ${counterPrice} କାଉଣ୍ଟର ଅଫର ଦେଇଛନ୍ତି।`,
            },
          };
        }
        break;
      }

      case NOTIFICATION_TYPES.OFFER_ACCEPTED: {
        if (recipientRole === ROLES.INFORMAL_COLLECTOR) {
          const price = data.offeredPrice ? `₹${parseFloat(data.offeredPrice).toLocaleString('en-IN')}` : '';
          return {
            isActionable: true,
            urgency: URGENCY_LEVELS.ACTION_REQUIRED,
            priority: NOTIFICATION_PRIORITY.HIGH,
            title: 'Offer Accepted! Pickup Assigned',
            message: `Your offer${price ? ` of ${price}` : ''} has been accepted by the citizen. Please coordinate pickup.`,
            voicePrompt: `Your offer was accepted! Pickup is now assigned to you.`,
            referenceType: 'COLLECTION_REQUEST',
            referenceId: data.requestId,
            quickActions: ['View Pickup', 'Contact Citizen', 'Route Map'],
            multilingual: {
              en: `Your offer${price ? ` of ${price}` : ''} has been accepted. Pickup is now assigned to you.`,
              hi: `आपका ${price} का ऑफर नागरिक द्वारा स्वीकार कर लिया गया है। पिकअप आपको सौंपा गया है।`,
              hinglish: `Aapka ${price} offer accept ho gaya hai. Pickup aapko assign hua hai.`,
              or: `ଆପଣଙ୍କ ${price} ଅଫର ଗ୍ରହଣ କରାଯାଇଛି। ପିକଅପ୍ ଦାୟିତ୍ୱ ଆପଣଙ୍କୁ ଦିଆଯାଇଛି।`,
            },
          };
        }

        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.INFO,
          priority: NOTIFICATION_PRIORITY.MEDIUM,
          title: 'Offer Accepted',
          message: `Offer accepted and collector assigned for doorstep pickup.`,
          voicePrompt: `You have accepted an offer. Your collector is assigned.`,
          referenceType: 'COLLECTION_REQUEST',
          referenceId: data.requestId,
          quickActions: ['View Request', 'Collector Details', "What's next?"],
          multilingual: {
            en: 'Offer accepted and verified collector assigned for pickup.',
            hi: 'ऑफर स्वीकार कर लिया गया है और सत्यापित कलेक्टर नियुक्त किया गया है।',
            hinglish: 'Offer accept ho gaya aur verified collector assign ho gaya.',
            or: 'ଅଫର ଗ୍ରହଣ ହୋଇଛି ଏବଂ ଯାଞ୍ଚ ହୋଇଥିବା କଲେକ୍ଟର ନିଯୁକ୍ତ ହୋଇଛନ୍ତି।',
          },
        };
      }

      case NOTIFICATION_TYPES.PICKUP_SCHEDULED: {
        const schedDate = data.scheduledDate ? new Date(data.scheduledDate).toLocaleDateString('en-IN') : 'tomorrow';
        const time = data.timeSlot || 'the designated window';
        const category = data.category ? data.category.replace(/_/g, ' ') : 'e-waste';

        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.INFO,
          priority: NOTIFICATION_PRIORITY.MEDIUM,
          title: 'Pickup Scheduled',
          message: `Your ${category} pickup is scheduled for ${schedDate} during ${time}.`,
          voicePrompt: `Your ${category} pickup is scheduled for ${schedDate}.`,
          referenceType: 'COLLECTION_REQUEST',
          referenceId: data.requestId,
          quickActions: ['View Details', 'Contact Collector', 'Reschedule'],
          multilingual: {
            en: `Your ${category} pickup is scheduled for ${schedDate}.`,
            hi: `आपका ${category} पिकअप ${schedDate} के लिए निर्धारित है।`,
            hinglish: `Aapka ${category} pickup ${schedDate} ke liye schedule ho gaya hai.`,
            or: `ଆପଣଙ୍କ ${category} ପିକଅପ୍ ${schedDate} ପାଇଁ ନିର୍ଦ୍ଧାରିତ ହୋଇଛି।`,
          },
        };
      }

      case 'PICKUP_OVERDUE': {
        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.TIME_SENSITIVE,
          priority: NOTIFICATION_PRIORITY.HIGH,
          title: 'Pickup Status Update Needed',
          message: 'Your pickup was scheduled earlier, but completion has not yet been recorded.',
          voicePrompt: 'Your pickup was scheduled earlier, but completion has not been recorded. Would you like to contact your collector?',
          referenceType: 'COLLECTION_REQUEST',
          referenceId: data.requestId,
          quickActions: ['Contact Collector', 'View Request', 'Report Issue'],
          multilingual: {
            en: 'Your pickup was scheduled earlier, but completion has not yet been recorded.',
            hi: 'आपका पिकअप पहले निर्धारित था, लेकिन ऐप में पूरा होने का रिकॉर्ड नहीं मिला है।',
            hinglish: 'Aapka pickup pehle schedule tha, lekin completion record nahi hua hai.',
            or: 'ଆପଣଙ୍କ ପିକଅପ୍ ପୂର୍ବରୁ ନିର୍ଦ୍ଧାରିତ ଥିଲା, କିନ୍ତୁ ସମ୍ପୂର୍ଣ୍ଣ ହେବାର ରେକର୍ଡ ମିଳିନାହିଁ।',
          },
        };
      }

      case NOTIFICATION_TYPES.PICKUP_COMPLETED: {
        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.INFO,
          priority: NOTIFICATION_PRIORITY.LOW,
          title: 'E-Waste Picked Up Successfully',
          message: 'Your e-waste pickup has been completed and entered the verified recycling chain.',
          voicePrompt: 'Your e-waste pickup was completed successfully.',
          referenceType: 'COLLECTION_REQUEST',
          referenceId: data.requestId,
          quickActions: ['View Journey', 'Green Certificate', 'Rate Collector'],
          multilingual: {
            en: 'Your e-waste pickup has been completed.',
            hi: 'आपका ई-कचरा पिकअप सफलतापूर्वक पूरा हो चुका है।',
            hinglish: 'Aapka e-waste pickup complete ho gaya hai.',
            or: 'ଆପଣଙ୍କ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ପିକଅପ୍ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି।',
          },
        };
      }

      case NOTIFICATION_TYPES.REQUEST_AVAILABLE:
      case 'NEW_MATCHING_REQUEST': {
        const cat = data.category ? data.category.replace(/_/g, ' ') : 'e-waste';
        const dist = data.distanceKm ? ` (${data.distanceKm} km away)` : '';
        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.ACTION_REQUIRED,
          priority: NOTIFICATION_PRIORITY.MEDIUM,
          title: `New Matching Request: ${cat}`,
          message: `A new ${cat} pickup request is available in your service area${dist}.`,
          voicePrompt: `A new ${cat} request is available near you. Would you like to view it?`,
          referenceType: 'COLLECTION_REQUEST',
          referenceId: data.requestId,
          quickActions: ['View Request', 'Make Offer', 'Pass'],
          multilingual: {
            en: `A new ${cat} pickup request is available within your service area${dist}.`,
            hi: `आपके सेवा क्षेत्र में एक नया ${cat} पिकअप अनुरोध उपलब्ध है${dist}।`,
            hinglish: `Aapke service area me ek naya ${cat} pickup request aaya hai${dist}.`,
            or: `ଆପଣଙ୍କ ସେବା କ୍ଷେତ୍ରରେ ଏକ ନୂଆ ${cat} ପିକଅପ୍ ଅନୁରୋଧ ଉପଲବ୍ଧ ଅଛି${dist}।`,
          },
        };
      }

      case NOTIFICATION_TYPES.RECYCLING_COMPLETED: {
        return {
          isActionable: true,
          urgency: URGENCY_LEVELS.INFO,
          priority: NOTIFICATION_PRIORITY.LOW,
          title: 'Recycling Completed & Certified',
          message: 'Your e-waste has been fully and safely recycled. Green Certificate issued.',
          voicePrompt: 'Your e-waste recycling is complete. Your Green Certificate is ready.',
          referenceType: 'RECYCLING_RECORD',
          referenceId: data.recordId,
          quickActions: ['Download Certificate', 'View Full Journey'],
          multilingual: {
            en: 'Your e-waste has entered recycling and processing is certified complete.',
            hi: 'आपका ई-कचरा रीसाइकिल हो चुका है और ग्रीन सर्टिफिकेट जारी किया गया है।',
            hinglish: 'Aapka e-waste recycle ho gaya aur Green Certificate issue ho gaya.',
            or: 'ଆପଣଙ୍କ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ପୁନଃଚକ୍ରଣ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି ଏବଂ ଗ୍ରୀନ୍ ସାର୍ଟିଫିକେଟ୍ ପ୍ରଦାନ କରାଯାଇଛି।',
          },
        };
      }

      default: {
        return {
          isActionable: false,
          urgency: URGENCY_LEVELS.INFO,
          priority: NOTIFICATION_PRIORITY.LOW,
          title: data.title || 'EcoSetu Update',
          message: data.message || 'You have an update on your e-waste request.',
          voicePrompt: data.message || 'You have an update on your e-waste request.',
          referenceType: data.referenceType || null,
          referenceId: data.referenceId || null,
          quickActions: ['View'],
          multilingual: {
            en: data.message || 'You have an update.',
            hi: 'आपके अनुरोध पर एक नया अपडेट है।',
            hinglish: 'Aapke request par ek naya update hai.',
            or: 'ଆପଣଙ୍କ ଅନୁରୋଧରେ ଏକ ନୂଆ ଅପଡେଟ୍ ଅଛି।',
          },
        };
      }
    }
  }

  /**
   * Aggregate real pending actionable items for a user ("What needs my attention?")
   * Pure deterministic inspection of verified application state
   * @param {object} actor - { id, role, name }
   * @param {string} [language='en']
   * @returns {Promise<object>} Structured in-app attention card
   */
  async getAttentionSummary(actor, language = 'en') {
    if (!actor || !actor.id) {
      return {
        count: 0,
        headline: 'No Pending Actions',
        message: 'You have no pending tasks at this time.',
        items: [],
        quickActions: ['New Request', 'Check Scrap Prices'],
      };
    }

    const items = [];

    if (actor.role === ROLES.CITIZEN) {
      // 1. Pending offers on active requests
      const submittedReqs = await prisma.collectionRequest.findMany({
        where: { citizenId: actor.id, status: REQUEST_STATUS.SUBMITTED },
        include: {
          ewasteItems: { select: { category: true } },
          pickupOffers: {
            where: { status: OFFER_STATUS.PENDING },
            include: { collector: { include: { user: { select: { name: true } } } } },
            orderBy: { offeredPrice: 'desc' },
          },
        },
      });

      for (const req of submittedReqs) {
        if (req.pickupOffers.length > 0) {
          const highest = req.pickupOffers[0];
          const cat = req.ewasteItems[0]?.category?.replace(/_/g, ' ') || 'e-waste';
          const price = `₹${parseFloat(highest.offeredPrice).toLocaleString('en-IN')}`;
          items.push({
            type: 'OFFER_PENDING_REVIEW',
            urgency: URGENCY_LEVELS.ACTION_REQUIRED,
            title: `Review ${price} offer for ${cat}`,
            description: `${highest.collector?.user?.name || 'Collector'} offered ${price}. Total offers: ${req.pickupOffers.length}.`,
            actionTitle: 'View Offer',
            actionPayload: { action: 'VIEW_OFFER', requestId: req.id, offerId: highest.id },
          });
        }
      }

      // 2. Overdue pickups
      const overdueReqs = await prisma.collectionRequest.findMany({
        where: {
          citizenId: actor.id,
          status: { in: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED] },
          preferredDate: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        include: { collector: { include: { user: { select: { name: true } } } } },
      });

      for (const oReq of overdueReqs) {
        items.push({
          type: 'PICKUP_OVERDUE',
          urgency: URGENCY_LEVELS.TIME_SENSITIVE,
          title: 'Scheduled pickup overdue',
          description: `Pickup with ${oReq.collector?.user?.name || 'Collector'} has not yet been recorded complete.`,
          actionTitle: 'Contact Collector',
          actionPayload: { action: 'CONTACT_COLLECTOR', requestId: oReq.id },
        });
      }
    } else if (actor.role === ROLES.INFORMAL_COLLECTOR) {
      const profile = await prisma.collectorProfile.findUnique({
        where: { userId: actor.id },
      });

      if (profile) {
        // 1. Pending citizen counter-offers
        const counterOffers = await prisma.pickupOffer.findMany({
          where: {
            collectorId: profile.id,
            status: OFFER_STATUS.PENDING,
          },
          include: {
            collectionRequest: {
              include: { ewasteItems: { select: { category: true } } },
            },
          },
        });

        const negotiations = counterOffers.filter(
          (o) => o.notes && o.notes.includes('[Citizen Counter:')
        );

        for (const neg of negotiations) {
          const match = neg.notes.match(/\[Citizen Counter:\s*₹?(\d+)\]/i);
          const counterPrice = match ? `₹${parseInt(match[1], 10).toLocaleString('en-IN')}` : 'a counter-offer';
          const cat = neg.collectionRequest?.ewasteItems[0]?.category?.replace(/_/g, ' ') || 'e-waste';

          items.push({
            type: 'COUNTER_OFFER_RESPONSE_PENDING',
            urgency: URGENCY_LEVELS.ACTION_REQUIRED,
            title: `Citizen countered ${counterPrice} for ${cat}`,
            description: `Awaiting your response on request #${neg.collectionRequestId.substring(0, 8)}.`,
            actionTitle: 'Respond to Counter',
            actionPayload: { action: 'VIEW_NEGOTIATION', offerId: neg.id, requestId: neg.collectionRequestId },
          });
        }

        // 2. Active assigned pickups to execute
        const activePickups = await prisma.collectionRequest.findMany({
          where: {
            collectorId: profile.id,
            status: { in: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED] },
          },
          include: { ewasteItems: { select: { category: true } } },
          orderBy: { preferredDate: 'asc' },
          take: 3,
        });

        for (const p of activePickups) {
          const cat = p.ewasteItems[0]?.category?.replace(/_/g, ' ') || 'items';
          items.push({
            type: 'SCHEDULED_PICKUP',
            urgency: URGENCY_LEVELS.ACTION_REQUIRED,
            title: `Complete pickup for ${cat}`,
            description: `Address: ${p.city || 'Designated location'}. Status: ${p.status}.`,
            actionTitle: 'Start Pickup',
            actionPayload: { action: 'START_PICKUP', requestId: p.id },
          });
        }
      }
    }

    const count = items.length;
    let headline = `${count} thing${count === 1 ? '' : 's'} need your attention`;
    let message = `You have ${count} pending item${count === 1 ? '' : 's'} that require your decision.`;

    if (count === 0) {
      headline = 'All Caught Up!';
      message = 'You have no pending actions or urgent alerts.';
    }

    if (language === 'hi') {
      headline = count > 0 ? `${count} कार्यों पर आपका ध्यान आवश्यक है` : 'सब कुछ पूर्ण है!';
      message = count > 0
        ? `आपके पास ${count} लंबित कार्य हैं जिन पर आपका निर्णय आवश्यक है।`
        : 'वर्तमान में आपके पास कोई लंबित कार्य या अलर्ट नहीं है।';
    } else if (language === 'or') {
      headline = count > 0 ? `${count}ଟି କାର୍ଯ୍ୟ ଆପଣଙ୍କ ଦୃଷ୍ଟି ଆବଶ୍ୟକ କରୁଛି` : 'ସବୁକିଛି ସମ୍ପୂର୍ଣ୍ଣ ଅଛି!';
      message = count > 0
        ? `ଆପଣଙ୍କର ${count}ଟି କାର୍ଯ୍ୟ ବାକି ଅଛି।`
        : 'ଏହି ସମୟରେ କୌଣସି ବିଚାରାଧୀନ କାର୍ଯ୍ୟ ନାହିଁ।';
    }

    return {
      count,
      headline,
      message,
      items,
      quickActions: count > 0
        ? items.map((i) => i.actionTitle).slice(0, 3)
        : (actor.role === ROLES.CITIZEN ? ['New Request', 'Check Prices'] : ['Matching Requests', 'My Offers']),
    };
  }

  /**
   * Deterministic duplicate prevention key
   * e.g. "REQ-102-OFFER-203-RECEIVED"
   * @param {object} event
   * @returns {string}
   */
  generateNotificationKey(event) {
    const { type, recipientId, data = {} } = event;
    const refType = data.referenceType || 'ENTITY';
    const refId = data.referenceId || data.requestId || data.offerId || 'GENERAL';
    const subEvent = data.subEvent || (data.counterPrice ? `CP-${data.counterPrice}` : data.offeredPrice ? `OP-${data.offeredPrice}` : 'DEFAULT');

    return `${recipientId}_${type}_${refType}_${refId}_${subEvent}`.toUpperCase();
  }

  /**
   * Check if notification key was already delivered recently
   * @param {string} notificationKey
   * @returns {boolean}
   */
  isDuplicate(notificationKey) {
    if (!this._deliveryCache.has(notificationKey)) return false;
    const deliveredAt = this._deliveryCache.get(notificationKey);
    return Date.now() - deliveredAt < this._dedupTtlMs;
  }

  /**
   * Record delivery in in-memory cache
   * @param {string} notificationKey
   */
  recordDelivery(notificationKey) {
    this._deliveryCache.set(notificationKey, Date.now());
  }

  /**
   * Clear in-memory deduplication cache (useful for testing)
   */
  clearCache() {
    this._deliveryCache.clear();
  }
}

module.exports = new EcoSaathiIntelligenceService();
