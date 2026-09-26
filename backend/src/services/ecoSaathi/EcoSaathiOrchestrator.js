/**
 * EcoSetu — Eco-Saathi Context-Aware AI Orchestrator
 * Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md, docs/07_BUSINESS_WORKFLOWS.md
 * 
 * Orchestrates:
 * 1. Context extraction & authorization verification
 * 2. Intent detection & entity extraction
 * 3. State intelligence & "What next?" reasoning
 * 4. Factual offer comparison & price explanations
 * 5. Write confirmation guardrail enforcement
 * 6. Quick action chip generation
 * 7. Traceable structured response generation
 */

const aiService = require('../ai/AIService');
const intentDetector = require('./intentDetector');
const contextBuilder = require('./contextBuilder');
const toolRegistry = require('./tools/toolRegistry');
const { interpretRequestState } = require('./requestStateIntelligence');
const offerAnalyzer = require('./offerAnalyzer');
const priceExplainer = require('./priceExplainer');
const PRICING_CATALOG = priceExplainer.PRICING_CATALOG;
const auditService = require('../auditService');
const ecoVisionService = require('../vision/EcoVisionService');
const ecoValueService = require('../valuation/EcoValueService');
const ecoMatchService = require('../matching/EcoMatchService');
const logger = require('../../config/logger');
const { ROLES } = require('../../utils/constants');
const { sanitizeAssistantResponse, cleanTextForTTS } = require('../../utils/responseSanitizer');

class EcoSaathiOrchestrator {
  /**
   * Process incoming user message with full context awareness
   * @param {object} actor - Authenticated user { id, role, name, email }
   * @param {string} message - User natural language query
   * @param {object} [clientContext] - { language, currentScreen, currentRoute, requestId, recentConversation }
   * @returns {Promise<object>} Structured Eco-Saathi response
   */
  async processQuery(...args) {
    return this.processMessage(...args);
  }

  async processMessage(arg1, arg2, arg3) {
    let actor = null;
    let message = '';
    let clientContext = {};

    if (typeof arg1 === 'string' && arg2 && (arg2.id || arg2.role)) {
      // Signature: (messageString, actor, clientContext)
      message = arg1;
      actor = arg2;
      clientContext = arg3 || {};
    } else if (arg1 && arg1.id && typeof arg2 === 'string') {
      // Signature: (actor, messageString, clientContext)
      actor = arg1;
      message = arg2;
      clientContext = arg3 || {};
    } else if (arg1 && arg1.id && typeof arg2 === 'object' && arg2 !== null) {
      // Signature: (actor, { message, language, ... })
      actor = arg1;
      message = arg2.message || '';
      clientContext = { ...arg2, ...(arg3 || {}) };
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      // Signature: ({ actor, message, language, ... })
      actor = arg1.actor || { role: 'GUEST' };
      message = arg1.message || '';
      clientContext = arg1;
    }

    const startTime = Date.now();
    logger.info(`[EcoSaathi] Received query from user ${actor?.id} (${actor?.role}): "${message}"`);

    // 1. Build authorized context
    const context = await contextBuilder.build(actor, clientContext);

    // 2. Detect intent
    const { intent, confidence, extractedEntities } = intentDetector.detect(message, context);
    logger.info(`[EcoSaathi] Detected intent: ${intent} (confidence: ${confidence})`);

    let responseType = 'TEXT';
    let responseMessage = '';
    let responseData = null;
    let requiresConfirmation = false;
    let action = null;
    let quickActions = [];

    try {
      // 3. Handle domain intents deterministically with state intelligence where applicable
      switch (intent) {
        case 'WHAT_NEXT': {
          responseType = 'STATUS_CARD';
          if (context.activeRequest) {
            const intel = context.activeRequest.stateIntel || interpretRequestState(context.activeRequest, context.language);
            responseMessage = `${intel.explanation}\n\n• Currently: ${intel.current}\n• Next Step: ${intel.next}`;
            responseData = {
              requestId: context.activeRequest.id,
              shortId: context.activeRequest.shortId,
              status: context.activeRequest.status,
              past: intel.past,
              current: intel.current,
              next: intel.next,
              citizenActions: intel.citizenActions,
            };
            quickActions = intel.quickActions;
          } else {
            responseMessage = context.language === 'hi'
              ? 'आपके पास कोई सक्रिय पिकअप अनुरोध नहीं है। आप अपने पुराने ई-कचरे का पिकअप अनुरोध बना सकते हैं।'
              : 'You do not have an active pickup request. You can create a new pickup request for your e-waste items.';
            quickActions = ['Create pickup request', 'Check scrap prices'];
          }
          break;
        }

        case 'OFFER_COMPARISON': {
          responseType = 'OFFER_COMPARISON';
          const offers = context.currentOffers || [];
          const analysis = offerAnalyzer.analyze(offers, context.activeRequest, context.language);
          
          // Check if user is asking about a specific ordinal follow-up (e.g. "what about the second one?")
          const followUp = offerAnalyzer.resolveFollowUp(offers, message);
          if (followUp) {
            responseMessage = context.language === 'hi'
              ? `${followUp.collectorName} ने ${followUp.formattedPrice} का ऑफर दिया है।`
              : `${followUp.collectorName} offered ${followUp.formattedPrice}${followUp.distanceKm ? ` (${followUp.distanceKm} km away)` : ''}.`;
            responseData = {
              ...analysis,
              selectedOffer: followUp,
            };
            quickActions = [`Accept ${followUp.formattedPrice}`, 'Counter-offer', 'View all offers'];
          } else {
            responseMessage = analysis.message;
            responseData = {
              count: analysis.count,
              offers: analysis.offers,
              highestOffer: analysis.highestOffer,
              closestOffer: analysis.closestOffer,
            };
            quickActions = analysis.quickActions;
          }
          break;
        }

        case 'PRICE_EXPLANATION': {
          responseType = 'PRICE_EXPLANATION';
          const item = context.activeRequest?.items?.[0] || null;
          const highestOffer = context.currentOffers?.[0]?.price || null;

          const explanation = priceExplainer.explain({
            category: extractedEntities.category || item?.category || 'LAPTOP',
            condition: item?.condition || 'DAMAGED',
            weightKg: item?.weightKg || 1,
            offeredPrice: highestOffer,
            language: context.language,
          });

          responseMessage = explanation.message;
          responseData = explanation;
          quickActions = explanation.quickActions;
          break;
        }

        case 'PICKUP_STATUS': {
          responseType = 'STATUS_CARD';
          const result = await toolRegistry.executeTool('getPickupRequestStatus', {
            requestId: context.activeRequest?.id,
          }, actor);

          if (result.success) {
            responseMessage = result.data.statusSummary || `${result.data.explanation} ${result.data.nextStep}`.trim() || 'Your pickup request is currently active.';
            responseData = result.data;
            quickActions = ["What's next?", 'View offers', 'Traceability'];
          } else {
            responseMessage = result.message || 'Your pickup request is being processed.';
          }
          break;
        }

        case 'VIEW_OFFERS': {
          responseType = 'OFFER_COMPARISON';
          const result = await toolRegistry.executeTool('getReceivedOffers', {
            requestId: context.activeRequest?.id,
          }, actor);

          if (result.success) {
            responseMessage = result.data.summary || 'Here are the offers received for your request.';
            responseData = result.data;
            quickActions = ['Compare offers', 'Negotiate', 'Accept highest'];
          } else {
            responseMessage = result.message || 'No offers found for your pickup request.';
          }
          break;
        }

        case 'ACCEPT_OFFER': {
          responseType = 'CONFIRMATION';
          const targetOffer = context.currentOffers?.[0] || null;
          const targetAmount = extractedEntities.amount || targetOffer?.price || 0;
          const offerId = targetOffer?.id || 'pending-offer-id';
          const collectorName = targetOffer?.collectorName || 'Collector';

          requiresConfirmation = true;
          action = {
            type: 'ACCEPT_OFFER',
            offerId,
            amount: targetAmount,
            collectorName,
          };

          responseMessage = context.language === 'hi'
            ? `मुझे ${collectorName} का ₹${targetAmount.toLocaleString('en-IN')} का ऑफर मिला है। क्या आप इसे स्वीकार करना चाहते हैं?`
            : `I found the ₹${targetAmount.toLocaleString('en-IN')} offer from ${collectorName}. Would you like me to accept this offer?`;
          quickActions = ['Confirm & Accept', 'Cancel'];
          break;
        }

        case 'NEGOTIATION': {
          responseType = 'CONFIRMATION';
          const targetOffer = context.currentOffers?.[0] || null;
          const counterAmount = extractedEntities.amount || 1100;
          const offerId = targetOffer?.id || 'active-offer-id';
          const collectorName = targetOffer?.collectorName || 'Collector';

          requiresConfirmation = true;
          action = {
            type: 'SEND_COUNTER_OFFER',
            offerId,
            counterPrice: counterAmount,
            counterAmount,
            collectorName,
          };

          responseMessage = context.language === 'hi'
            ? `${collectorName} ने वर्तमान में ₹${targetOffer?.price || 950} का ऑफर दिया है। आप ₹${counterAmount.toLocaleString('en-IN')} का काउंटर-ऑफर भेजना चाहते हैं। क्या मैं यह भेज दूं?`
            : `${collectorName} currently offered ₹${targetOffer?.price || 950}. You want to counter with ₹${counterAmount.toLocaleString('en-IN')}. Would you like to send this counter-offer?`;
          quickActions = [`Send ₹${counterAmount}`, 'Cancel'];
          break;
        }

        case 'TRACEABILITY_EXPLANATION': {
          responseType = 'TRACEABILITY';
          const traceResult = await toolRegistry.executeTool('getLifecycleTrace', {
            requestId: context.activeRequest?.id,
            language: context.language,
          }, actor);

          if (traceResult.success && traceResult.data && traceResult.data.currentState !== 'NO_ACTIVE_REQUEST') {
            const trace = traceResult.data;
            responseMessage = trace.explanation || (context.language === 'hi'
              ? `अनुरोध #${trace.shortRequestId || context.activeRequest?.shortId} की ट्रैकिंग सक्रिय है। वर्तमान स्थिति: ${trace.currentState}।`
              : `Traceability chain for request #${trace.shortRequestId || context.activeRequest?.shortId} is live. Current state: ${trace.currentState}.`);
            responseData = trace;
            quickActions = trace.quickActions || ['View timeline', 'Green Certificate', "What's next?"];
          } else if (context.activeRequest) {
            responseMessage = context.language === 'hi'
              ? `अनुरोध #${context.activeRequest.shortId} की ट्रैकिंग सक्रिय है। सामग्री की स्थिति: ${context.activeRequest.status}।`
              : `Traceability chain for request #${context.activeRequest.shortId} is live. Current state: ${context.activeRequest.status}.`;
            responseData = {
              requestId: context.activeRequest.id,
              status: context.activeRequest.status,
            };
            quickActions = ['View timeline', 'Green Certificate', "What's next?"];
          } else {
            responseMessage = context.language === 'hi'
              ? 'वर्तमान में कोई सक्रिय अनुरोध नहीं मिला है।'
              : 'No active request found to trace.';
            quickActions = ['Create pickup request', 'Check scrap prices'];
          }
          break;
        }

        case 'E_WASTE_CATEGORY': {
          responseType = 'TEXT';
          responseMessage = context.language === 'hi'
            ? 'ECOSETU पर आप मोबाइल फोन, लैपटॉप, पीसी/डेस्कटॉप, टैबलेट, मॉनिटर, प्रिंटर, बैटरी, केबल और सर्किट बोर्ड सुरक्षित रूप से रिसाइकिल कर सकते हैं। इलेक्ट्रॉनिक्स को सामान्य कूड़ेदान में कभी न फेंकें क्योंकि इनमें लेड और मर्करी जैसे हानिकारक तत्व होते हैं।'
            : 'ECOSETU accepts mobile phones, laptops, desktops, tablets, monitors, printers, batteries, cables, and circuit boards. Never dispose of electronics in household garbage as they contain hazardous substances like lead and mercury.';
          quickActions = ['Book pickup', 'Check scrap prices'];
          break;
        }

        case 'IDENTIFY_EWASTE': {
          responseType = 'VISION_ANALYSIS';
          if (clientContext.imageBuffer || clientContext.imageBase64) {
            const buf = clientContext.imageBuffer || Buffer.from(clientContext.imageBase64, 'base64');
            const analysis = await ecoVisionService.analyzeImage(buf, { mimetype: clientContext.mimetype });
            responseData = analysis;

            if (!analysis.success) {
              responseMessage = context.language === 'hi'
                ? 'हम अभी इस छवि का विश्लेषण नहीं कर सके। आप श्रेणी मैन्युअल रूप से चुन सकते हैं।'
                : "We couldn't analyze this image right now. You can select the category manually.";
              quickActions = ['Laptop', 'Mobile Phone', 'Desktop', 'Other'];
            } else if (analysis.analysis.isLowConfidence) {
              responseMessage = context.language === 'hi'
                ? 'इको-साथी विश्वास के साथ इस आइटम की पहचान नहीं कर सका। कृपया श्रेणी मैन्युअल रूप से चुनें।'
                : "Eco-Saathi couldn't confidently identify this item. Please select its category manually.";
              quickActions = ['Laptop', 'Mobile Phone', 'Desktop', 'Other'];
            } else if (analysis.analysis.isMultiObject) {
              const itemsList = analysis.analysis.detectedObjects
                .map((obj, idx) => `${idx + 1}. ${obj.category} — ${Math.round(obj.confidence * 100)}%`)
                .join('\n');
              responseMessage = context.language === 'hi'
                ? `पहचाने गए आइटम:\n${itemsList}\n\nआप कौन सा आइटम जमा करना चाहते हैं?`
                : `Detected items:\n${itemsList}\n\nWhich item would you like to submit?`;
              quickActions = analysis.analysis.detectedObjects.map((o) => `Select ${o.category}`);
            } else {
              const confPct = Math.round((analysis.analysis.confidence || 0) * 100);
              responseMessage = context.language === 'hi'
                ? `पहचाना गया: ${analysis.analysis.category}\nविश्वास: ${confPct}%\n\nक्या यह सही है?`
                : `Detected: ${analysis.analysis.category}\nConfidence: ${confPct}%\n\nIs this correct?`;
              quickActions = [`Confirm ${analysis.analysis.category}`, 'Choose manually'];
            }
          } else {
            const detectedCat = extractedEntities.category || 'e-waste item';
            responseMessage = context.language === 'hi'
              ? `कृपया आइटम की छवि अपलोड करें या पुष्टि करें कि क्या यह ${detectedCat} है।`
              : `Please upload or capture an image of the item, or confirm if this is a ${detectedCat}.`;
            quickActions = ['Upload Image', 'Confirm Category', 'Choose Manually'];
          }
          break;
        }

        case 'CONFIRM_CATEGORY': {
          responseType = 'CONFIRM_CATEGORY';
          const cat = extractedEntities.category || context.activeRequest?.items?.[0]?.category || 'LAPTOP';
          responseMessage = context.language === 'hi'
            ? `श्रेणी की पुष्टि ${cat} के रूप में की गई। आप इसकी स्थिति का वर्णन कैसे करेंगे?`
            : `Category confirmed as ${cat}. How would you describe its condition?`;
          responseData = {
            confirmedCategory: cat,
            classificationSource: 'AI_CONFIRMED',
          };
          quickActions = ['Working', 'Used', 'Damaged', 'Not working'];
          break;
        }

        case 'CHANGE_CATEGORY': {
          responseType = 'CHANGE_CATEGORY';
          const cat = extractedEntities.category || 'DESKTOP';
          responseMessage = context.language === 'hi'
            ? `श्रेणी को बदलकर ${cat} कर दिया गया है। आप इसकी स्थिति का वर्णन कैसे करेंगे?`
            : `Category updated to ${cat}. How would you describe its condition?`;
          responseData = {
            confirmedCategory: cat,
            classificationSource: 'USER_CORRECTED',
          };
          quickActions = ['Working', 'Used', 'Damaged', 'Not working'];
          break;
        }

        case 'E_WASTE_CONDITION': {
          responseType = 'VALUATION_ESTIMATE';
          const cond = extractedEntities.condition || 'WORKING';
          const cat = extractedEntities.category || context.activeRequest?.items?.[0]?.category || 'LAPTOP';
          const valuation = await ecoValueService.calculateValue({
            category: cat,
            condition: cond,
            language: context.language,
          });

          responseData = valuation;
          if (valuation.isEstimateAvailable && valuation.estimatedRange) {
            responseMessage = context.language === 'hi'
              ? `स्थिति '${cond}' दर्ज की गई। ${cat} के लिए अनुमानित मूल्य सीमा ₹${valuation.estimatedRange.min.toLocaleString('en-IN')} – ₹${valuation.estimatedRange.max.toLocaleString('en-IN')} है।`
              : `Condition recorded as '${cond}'. Estimated value range for ${cat}: ₹${valuation.estimatedRange.min.toLocaleString('en-IN')} – ₹${valuation.estimatedRange.max.toLocaleString('en-IN')}.`;
            quickActions = ['Submit Pickup Request', 'Why this value?', 'Change Category'];
          } else {
            responseMessage = context.language === 'hi'
              ? `स्थिति '${cond}' दर्ज की गई। हमने आइटम की पहचान कर ली है, लेकिन वर्तमान में मूल्य का अनुमान लगाने के लिए हमारे पास पर्याप्त मूल्य निर्धारण डेटा नहीं है।`
              : `Condition recorded as '${cond}'. We identified the item, but we don't currently have enough pricing data to estimate its value.`;
            quickActions = ['Submit Pickup Request', 'Change Category'];
          }
          break;
        }

        case 'ESTIMATE_VALUE': {
          responseType = 'VALUATION_ESTIMATE';
          const cat = extractedEntities.category || context.activeRequest?.items?.[0]?.category || 'LAPTOP';
          const cond = extractedEntities.condition || context.activeRequest?.items?.[0]?.condition || 'UNKNOWN';
          const valuation = await ecoValueService.calculateValue({
            category: cat,
            condition: cond,
            weightKg: context.activeRequest?.items?.[0]?.weightKg || null,
            language: context.language,
          });

          responseData = valuation;
          if (valuation.isEstimateAvailable && valuation.estimatedRange) {
            responseMessage = context.language === 'hi'
              ? `${cat} (${cond}) का अनुमानित मूल्य ₹${valuation.estimatedRange.min.toLocaleString('en-IN')} – ₹${valuation.estimatedRange.max.toLocaleString('en-IN')} है।`
              : `Estimated value range for ${cat} (${cond}): ₹${valuation.estimatedRange.min.toLocaleString('en-IN')} – ₹${valuation.estimatedRange.max.toLocaleString('en-IN')}.`;
            quickActions = ['Why this value?', 'Submit Pickup Request', 'Price Board'];
          } else {
            responseMessage = context.language === 'hi'
              ? `वर्तमान में ${cat} के लिए हमारे पास पर्याप्त मूल्य निर्धारण डेटा नहीं है।`
              : `We don't currently have enough pricing data to estimate the value for ${cat}.`;
            quickActions = ['Submit Pickup Request', 'Price Board'];
          }
          break;
        }

        case 'EXPLAIN_VALUE': {
          responseType = 'PRICE_EXPLANATION';
          const cat = extractedEntities.category || context.activeRequest?.items?.[0]?.category || 'LAPTOP';
          const cond = extractedEntities.condition || context.activeRequest?.items?.[0]?.condition || 'WORKING';
          const explanation = ecoValueService.explainValuation({
            category: cat,
            condition: cond,
            language: context.language,
          });

          responseMessage = explanation.message;
          responseData = explanation;
          quickActions = ['Submit Pickup Request', 'Price Board', "What's next?"];
          break;
        }

        case 'VIEW_MATCHING_REQUESTS': {
          responseType = 'COLLECTOR_FEED';
          if (actor.role !== ROLES.INFORMAL_COLLECTOR && actor.role !== ROLES.ADMIN) {
            responseMessage = 'This feed is exclusively available for verified collectors.';
            break;
          }

          const catFilter = extractedEntities.category || null;
          const isClosestQuery = /closest|nearest|paas|pass/i.test(message);
          const sortBy = isClosestQuery ? 'distance' : 'distance';

          const matching = await ecoMatchService.getEligibleRequests(actor.id, {
            filterCategory: catFilter,
            sortBy,
            limit: 5,
          });

          responseData = matching;
          if (matching.requests.length === 0) {
            responseMessage = context.language === 'hi'
              ? 'वर्तमान में आपके सेवा क्षेत्र में कोई नया पात्र अनुरोध उपलब्ध नहीं है।'
              : 'There are currently no new matching collection requests in your service area.';
            quickActions = ['Refresh Feed', 'Active Pickups', 'Price Board'];
          } else if (isClosestQuery && matching.requests[0]?.distanceKm !== null) {
            const top = matching.requests[0];
            responseMessage = context.language === 'hi'
              ? `अनुरोध #${top.shortId} (${top.item.category}) वर्तमान में ${top.distanceKm} किमी की दूरी पर सबसे नजदीक है।`
              : `Request #${top.shortId} (${top.item.category}) is currently closest at ${top.distanceKm} km away.`;
            quickActions = [`Make offer for #${top.shortId}`, 'View All Requests', 'Active Pickups'];
          } else {
            const count = matching.pagination.total;
            const topItem = matching.requests[0];
            const valStr = topItem.valuation?.estimatedRange ? ` (Est. ₹${topItem.valuation.estimatedRange.min}–₹${topItem.valuation.estimatedRange.max})` : '';
            responseMessage = context.language === 'hi'
              ? `आपके लिए ${count} पात्र अनुरोध उपलब्ध हैं। निकटतम: #${topItem.shortId} - ${topItem.item.category}${valStr}, दूरी: ${topItem.distanceKm ? `${topItem.distanceKm} km` : 'शहरी क्षेत्र'}।`
              : `Found ${count} eligible request(s) for you. Top: #${topItem.shortId} — ${topItem.item.category}${valStr}${topItem.distanceKm ? ` at ${topItem.distanceKm} km` : ''}.`;
            quickActions = ['Make Offer', 'Filter Laptops', 'Pending Offers', 'Active Pickups'];
          }
          break;
        }

        case 'COLLECTOR_OFFER_GUIDANCE': {
          responseType = 'OFFER_GUIDANCE';
          const cat = extractedEntities.category || context.activeRequest?.items?.[0]?.category || 'LAPTOP';
          const cond = extractedEntities.condition || context.activeRequest?.items?.[0]?.condition || 'WORKING';
          const weightKg = context.activeRequest?.items?.[0]?.weightKg || null;

          const valuation = await ecoValueService.calculateValue({
            category: cat,
            condition: cond,
            weightKg,
            language: context.language,
          });

          responseData = valuation;
          if (valuation.isEstimateAvailable && valuation.estimatedRange) {
            const rangeStr = `₹${valuation.estimatedRange.min.toLocaleString('en-IN')}–₹${valuation.estimatedRange.max.toLocaleString('en-IN')}`;
            responseMessage = context.language === 'hi'
              ? `${cat} (${cond}) के लिए वर्तमान प्लेटफॉर्म अनुमान ${rangeStr} है। आप अपने स्वयं के भौतिक मूल्यांकन, पिकअप लागत और रीसाइक्लिंग रिकवरी मूल्य के आधार पर अपना ऑफर चुन सकते हैं।`
              : `The current platform estimate for ${cat} (${cond}) is ${rangeStr}. You can choose your offer based on your own physical assessment, pickup costs, and expected recovery value.`;
            quickActions = ['Make Offer', 'Check Prices', 'Back to Feed'];
          } else {
            responseMessage = context.language === 'hi'
              ? `इस आइटम के लिए कोई मानक अनुमान उपलब्ध नहीं है। आप अपने स्क्रैप मूल्यांकन के आधार पर ऑफर दर्ज कर सकते हैं।`
              : `No standard benchmark estimate is available for this item. You can enter an offer based on your direct evaluation.`;
            quickActions = ['Make Offer', 'Price Board'];
          }
          break;
        }

        case 'COLLECTOR_NEGOTIATIONS': {
          responseType = 'NEGOTIATION_LIST';
          if (actor.role !== ROLES.INFORMAL_COLLECTOR && actor.role !== ROLES.ADMIN) {
            responseMessage = 'Negotiation management is only accessible to collectors.';
            break;
          }

          const negs = await toolRegistry.executeTool('getCollectorNegotiations', {}, actor);
          responseData = negs.data || null;

          if (negs.success && negs.data.count > 0) {
            const first = negs.data.negotiations[0];
            responseMessage = context.language === 'hi'
              ? `आपके पास ${negs.data.count} लंबित बातचीत है। नागरिक ने #${first.requestId.substring(0, 8)} के लिए ₹${first.counterPrice} का काउंटर-ऑफर दिया है।`
              : `You have ${negs.data.count} pending negotiation(s). Citizen countered with ₹${first.counterPrice} for request #${first.requestId.substring(0, 8)}.`;
            quickActions = [`Accept ₹${first.counterPrice}`, 'Send Counter', 'View All Requests'];
          } else {
            responseMessage = context.language === 'hi'
              ? 'वर्तमान में कोई लंबित काउंटर-ऑफर या बातचीत नहीं है।'
              : 'You have no pending negotiations or counter-offers at this time.';
            quickActions = ['New Requests', 'Active Pickups', 'My Offers'];
          }
          break;
        }

        case 'COLLECTOR_ACTIVE_PICKUPS': {
          responseType = 'PICKUP_LIST';
          if (actor.role !== ROLES.INFORMAL_COLLECTOR && actor.role !== ROLES.ADMIN) {
            responseMessage = 'Active pickups listing is available only to collectors.';
            break;
          }

          const pickupsRes = await toolRegistry.executeTool('getCollectorActivePickups', {}, actor);
          responseData = pickupsRes.data || null;

          if (pickupsRes.success && pickupsRes.data.count > 0) {
            responseMessage = context.language === 'hi'
              ? `आपके पास ${pickupsRes.data.count} सक्रिय पिकअप असाइन हैं।`
              : `You have ${pickupsRes.data.count} active scheduled pickup(s).`;
            quickActions = ['View Pickups', 'New Requests', 'Price Board'];
          } else {
            responseMessage = context.language === 'hi'
              ? 'वर्तमान में कोई सक्रिय पिकअप निर्धारित नहीं है। नए अनुरोधों की जांच करें।'
              : 'You have no active scheduled pickups right now. Check matching requests to place new offers.';
            quickActions = ['New Requests', 'Pending Offers', 'Price Board'];
          }
          break;
        }

        case 'COLLECTOR_HELP': {
          responseType = 'STATUS_CARD';
          const metrics = await toolRegistry.executeTool('getCollectorMetrics', {}, actor);
          responseData = metrics.data || null;
          responseMessage = metrics.data?.summaryMessage || 'Collector dashboard is active. You can review matching requests, active pickups, and negotiations.';
          quickActions = ['New Requests', 'Active Pickups', 'Pending Offers'];
          break;
        }

        case 'E_WASTE_PRICING': {
          responseType = 'TEXT';
          const cat = extractedEntities.category || 'LAPTOP';
          const bench = PRICING_CATALOG[cat] || PRICING_CATALOG.LAPTOP;
          responseMessage = context.language === 'hi'
            ? `${bench.categoryName} की वर्तमान बेसलाइन दर ₹${bench.baseRatePerKg}/kg (अनुमानित सीमा ₹${bench.minRate} - ₹${bench.maxRate}/kg) है।`
            : `Current baseline market price for ${bench.categoryName} is ₹${bench.baseRatePerKg}/kg (typical range: ₹${bench.minRate} - ₹${bench.maxRate}/kg).`;
          responseData = bench;
          quickActions = ['View Price Board', 'Create pickup'];
          break;
        }

        case 'ATTENTION_SUMMARY': {
          responseType = 'ATTENTION_CARD';
          const summaryRes = await toolRegistry.executeTool('getAttentionSummary', {
            language: context.language,
          }, actor);

          if (summaryRes.success && summaryRes.data) {
            responseData = summaryRes.data;
            responseMessage = `${summaryRes.data.headline}: ${summaryRes.data.message}`;
            quickActions = summaryRes.data.quickActions || ["What's next?", 'Help'];
          } else {
            responseMessage = context.language === 'hi'
              ? 'वर्तमान में कोई लंबित कार्य नहीं है।'
              : 'You have no pending tasks requiring attention.';
            quickActions = ['Create pickup', 'Check Prices'];
          }
          break;
        }

        default: {
          // Fallback to AI Service Provider for open-ended conversational reasoning
          const systemPrompt = contextBuilder.toSystemPrompt(context);
          const aiResult = await aiService.generate({
            prompt: message,
            systemInstruction: systemPrompt,
          });

          responseMessage = aiResult.text;
          quickActions = context.activeRequest ? ["What's next?", 'View offers', 'Help'] : ['Create pickup', 'Prices', 'Help'];
          break;
        }
      }
    } catch (err) {
      logger.error(`[EcoSaathi] Processing error: ${err.message}`);
      responseMessage = 'Eco-Saathi is temporarily unable to retrieve this data. You can continue using ECOSETU normally.';
      responseType = 'ERROR';
    }

    const latencyMs = Date.now() - startTime;
    logger.info(`[EcoSaathi] Processed query in ${latencyMs}ms with intent ${intent}`);

    const cleanUIMessage = sanitizeAssistantResponse(responseMessage);
    const cleanSpeech = cleanTextForTTS(responseMessage);

    return {
      type: responseType,
      responseType,
      message: cleanUIMessage,
      cleanSpeechText: cleanSpeech,
      intent,
      action,
      requiresConfirmation,
      data: responseData,
      quickActions,
      context: {
        currentScreen: context.currentScreen,
        activeRequestId: context.activeRequest?.id || null,
      },
      latencyMs,
    };
  }

  /**
   * Helper to sanitize assistant text for UI presentation
   * @param {string} text
   * @returns {string}
   */
  sanitizeAssistantResponse(text) {
    return sanitizeAssistantResponse(text);
  }

  /**
   * Helper to sanitize text for TTS speech consumption
   * @param {string} text
   * @returns {string}
   */
  cleanTextForTTS(text) {
    return cleanTextForTTS(text);
  }

  /**
   * Execute an explicit confirmed write action
   * @param {object} actor - Authenticated user
   * @param {object} action - { type, offerId, requestId, amount, counterAmount }
   * @param {boolean} confirmed - Explicit confirmation flag
   * @returns {Promise<object>}
   */
  async executeConfirmedAction(actor, action, confirmed) {
    if (!confirmed) {
      return {
        success: true,
        type: 'TEXT',
        message: 'Action cancelled.',
        action: null,
        requiresConfirmation: false,
      };
    }

    if (!action || !action.type) {
      return {
        success: false,
        type: 'ERROR',
        message: 'Invalid action payload.',
        requiresConfirmation: false,
      };
    }

    logger.info(`[EcoSaathi] Executing confirmed action ${action.type} for user ${actor.id}`);

    try {
      if (action.type === 'ACCEPT_OFFER') {
        const result = await toolRegistry.executeTool('acceptOffer', {
          offerId: action.offerId,
        }, actor);

        return {
          success: result.success,
          type: 'STATUS_CARD',
          message: result.success
            ? 'Offer accepted successfully! Your pickup has been confirmed and scheduled with the collector.'
            : result.message,
          data: result.data || null,
          requiresConfirmation: false,
        };
      }

      if (action.type === 'COUNTER_OFFER' || action.type === 'SEND_COUNTER_OFFER') {
        const counterVal = action.counterPrice !== undefined ? action.counterPrice : action.counterAmount;
        const result = await toolRegistry.executeTool('sendCounterOffer', {
          offerId: action.offerId,
          counterPrice: counterVal,
          counterAmount: counterVal,
          notes: `Counter-offer of ₹${counterVal} sent via Eco-Saathi assistant`,
        }, actor);

        return {
          success: result.success,
          type: 'STATUS_CARD',
          message: result.success
            ? `Counter-offer of ₹${action.counterAmount} sent to the collector successfully!`
            : result.message,
          data: result.data || null,
          requiresConfirmation: false,
        };
      }

      return {
        success: false,
        type: 'ERROR',
        message: `Unknown action type: ${action.type}`,
        requiresConfirmation: false,
      };
    } catch (err) {
      logger.error(`[EcoSaathi] Confirmed action execution error: ${err.message}`);
      return {
        success: false,
        type: 'ERROR',
        message: 'Could not complete the requested action. Please try again.',
        requiresConfirmation: false,
      };
    }
  }
}

module.exports = new EcoSaathiOrchestrator();
