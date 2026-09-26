/**
 * EcoSetu — Request State Intelligence Layer
 * Canonical Reference: docs/07_BUSINESS_WORKFLOWS.md, docs/04_DATABASE_SCHEMA.md
 * 
 * Provides deterministic, factual interpretation of pickup request states:
 * - What the state means
 * - What has already happened
 * - What is happening right now
 * - What normally happens next
 * - Permitted citizen actions
 * - Permitted collector actions
 */

const { REQUEST_STATUS, ITEM_STATUS } = require('../../utils/constants');

const STATE_INTERPRETATIONS = {
  [REQUEST_STATUS.DRAFT]: {
    meaning: 'The pickup request is drafted but has not yet been submitted to the collector network.',
    past: 'Item details and images were uploaded.',
    current: 'Awaiting citizen review and final submission.',
    next: 'Request will be broadcast to eligible verified collectors nearby.',
    citizenActions: ['Review item details', 'Select pickup address & time window', 'Submit request'],
    collectorActions: ['None (request not yet visible to collectors)'],
    explanationEn: 'Your pickup request is currently in draft. Please submit it so nearby collectors can review your items and send price offers.',
    explanationHi: 'आपका पिकअप अनुरोध अभी ड्राफ्ट में है। कृपया इसे सबमिट करें ताकि नजदीकी कलेक्टर्स आपके सामान को देखकर ऑफर भेज सकें।',
    explanationOr: 'ଆପଣଙ୍କର ପିକଅପ୍ ଅନୁରୋଧ ଡ୍ରାଫ୍ଟରେ ଅଛି। ଦୟାକରି ଏହାକୁ ଦାଖଲ କରନ୍ତୁ ଯାହାଦ୍ୱାରା କଲେକ୍ଟରମାନେ ଅଫର ଦେଇପାରିବେ।',
    quickActions: ['Submit request', 'Edit pickup address', 'Add more items'],
  },

  [REQUEST_STATUS.SUBMITTED]: {
    meaning: 'The pickup request is actively broadcast to eligible verified collectors in your area.',
    past: 'Citizen confirmed item category/condition and submitted the request.',
    current: 'Nearby collectors are reviewing your e-waste photos and preparing price offers.',
    next: 'Collectors will submit price offers. You can compare, negotiate, or accept an offer.',
    citizenActions: ['Wait for incoming offers', 'View received offers', 'Cancel request if needed'],
    collectorActions: ['Inspect item lot details & photos', 'Submit price offer', 'Propose pickup schedule'],
    explanationEn: 'Your pickup request has been broadcast to verified local collectors. As soon as they review your items, you will receive price offers.',
    explanationHi: 'आपका पिकअप अनुरोध पास के सत्यापित कलेक्टर्स को भेजा गया है। जैसे ही वे समीक्षा करेंगे, आपको मूल्य ऑफर प्राप्त होंगे।',
    explanationOr: 'ଆପଣଙ୍କ ପିକଅପ୍ ଅନୁରୋଧ ଯାଞ୍ଚ ହୋଇଥିବା କଲେକ୍ଟରମାନଙ୍କୁ ପଠାଯାଇଛି। ସେମାନେ ଶୀଘ୍ର ମୂଲ୍ୟ ଅଫର ପଠାଇବେ।',
    quickActions: ["What's next?", 'View offers', 'Cancel request'],
  },

  [REQUEST_STATUS.ACCEPTED]: {
    meaning: 'An offer has been accepted and a verified collector is assigned to this pickup.',
    past: 'Citizen reviewed collector offers and accepted the best quote.',
    current: 'Collector is preparing their collection route and will arrive at your address.',
    next: 'Collector will verify items on-site, weigh them, and complete the digital handover.',
    citizenActions: ['Keep e-waste items ready', 'View assigned collector details', 'Contact collector if needed'],
    collectorActions: ['Navigate to pickup address', 'Verify and weigh e-waste', 'Complete digital handover via QR/OTP'],
    explanationEn: 'You have accepted an offer! A verified collector is assigned and scheduled for pickup. Please keep the e-waste ready for inspection and handover.',
    explanationHi: 'आपने ऑफर स्वीकार कर लिया है! एक सत्यापित कलेक्टर को पिकअप के लिए नियुक्त किया गया है। कृपया अपना ई-कचरा तैयार रखें।',
    explanationOr: 'ଆପଣ ଅଫର ଗ୍ରହଣ କରିଛନ୍ତି! ଜଣେ କଲେକ୍ଟରଙ୍କୁ ପିକଅପ୍ ଦାୟିତ୍ୱ ଦିଆଯାଇଛି। ଦୟାକରି ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।',
    quickActions: ['View collector info', 'Prepare handover', 'Track collector'],
  },

  [REQUEST_STATUS.PICKUP_SCHEDULED]: {
    meaning: 'Pickup date and time window have been confirmed between citizen and collector.',
    past: 'Offer accepted and schedule coordinated.',
    current: 'Collector is scheduled to visit your location during the designated time slot.',
    next: 'Collector arrives, scans/verifies items, and generates digital receipt/Green Certificate entry.',
    citizenActions: ['Be available during the scheduled slot', 'Verify collector credentials on arrival'],
    collectorActions: ['Arrive on time', 'Perform on-site weight and condition check', 'Initiate payment settlement'],
    explanationEn: 'Your pickup is officially scheduled. The collector will arrive during your designated time window.',
    explanationHi: 'आपका पिकअप निर्धारित समय पर तय है। कलेक्टर आपके चुने हुए समय पर पहुंचेगा।',
    explanationOr: 'ଆପଣଙ୍କ ପିକଅପ୍ ସମୟ ନିର୍ଦ୍ଧାରିତ ହୋଇଛି। କଲେକ୍ଟର ନିର୍ଦ୍ଦିଷ୍ଟ ସମୟରେ ଆସିବେ।',
    quickActions: ['View scheduled time', 'Call collector', 'Reschedule'],
  },

  [REQUEST_STATUS.PICKED_UP]: {
    meaning: 'E-waste items have been successfully collected and entered the traceable recycling chain.',
    past: 'Collector arrived, verified items, completed handover, and settled payment.',
    current: 'Items are securely in transit to the aggregation hub / verified recycler.',
    next: 'Consignment grouping, dismantling, and issuance of Green Certificate.',
    citizenActions: ['Download Green Certificate / Receipt', 'View live traceability journey', 'Rate collector'],
    collectorActions: ['Transport items to facility', 'Consolidate into material lots for recyclers'],
    explanationEn: 'Your e-waste has been picked up successfully and has entered ECOSETU\'s verified recycling chain. You can view the complete traceability timeline.',
    explanationHi: 'आपका ई-कचरा सफलतापूर्वक उठा लिया गया है और सत्यापित रीसाइक्लिंग श्रृंखला में शामिल हो गया है। आप इसकी पूरी ट्रैकिंग देख सकते हैं।',
    explanationOr: 'ଆପଣଙ୍କର ଇ-ବର୍ଜ୍ୟବସ୍ତୁ ସଫଳତାର ସହିତ ସଂଗ୍ରହ ହୋଇଛି ଏବଂ ପୁନଃଚକ୍ରଣ ପ୍ରକ୍ରିୟାରେ ପ୍ରବେଶ କରିଛି। ଆପଣ ଟ୍ରେସେବିଲିଟି ଯାଞ୍ଚ କରିପାରିବେ।',
    quickActions: ['Show traceability', 'Green Certificate', 'Rate collector'],
  },

  [REQUEST_STATUS.CANCELLED]: {
    meaning: 'This pickup request was cancelled and is no longer active.',
    past: 'Request was closed by citizen or expired without acceptance.',
    current: 'Request is inactive; items have been released back to your inventory.',
    next: 'You can create a new pickup request anytime with the same or updated items.',
    citizenActions: ['Create a new pickup request', 'View cancellation details'],
    collectorActions: ['None'],
    explanationEn: 'This pickup request is cancelled. You can create a fresh pickup request whenever you are ready.',
    explanationHi: 'यह पिकअप अनुरोध रद्द कर दिया गया है। आप जब चाहें नया पिकअप अनुरोध बना सकते हैं।',
    explanationOr: 'ଏହି ପିକଅପ୍ ଅନୁରୋଧ ବାତିଲ ହୋଇଛି। ଆପଣ ଯେକୌଣସି ସମୟରେ ନୂଆ ଅନୁରୋଧ କରିପାରିବେ।',
    quickActions: ['Create new pickup', 'View items'],
  },
};

/**
 * Interpret request state dynamically based on active offers and parameters
 * @param {object} request - Collection request record with items and offers
 * @param {string} [language='en'] - Preferred language
 * @returns {object} Structured interpretation
 */
function interpretRequestState(request, language = 'en') {
  if (!request) {
    return {
      status: 'UNKNOWN',
      headline: 'No Active Request Found',
      explanation: 'You do not have an active pickup request selected.',
      whatNext: 'You can create a new pickup request for your e-waste items anytime.',
      quickActions: ['Create pickup request', 'Check scrap prices'],
    };
  }

  const rawStatus = request.status || REQUEST_STATUS.SUBMITTED;
  const base = STATE_INTERPRETATIONS[rawStatus] || STATE_INTERPRETATIONS[REQUEST_STATUS.SUBMITTED];
  const offers = request.pickupOffers || [];
  const pendingOffers = offers.filter((o) => o.status === 'PENDING');

  let customCurrent = base.current;
  let customNext = base.next;
  let customExplanation = language === 'hi' ? base.explanationHi : language === 'or' ? base.explanationOr : base.explanationEn;
  let customQuickActions = [...base.quickActions];

  // Refine for SUBMITTED state when offers actually exist
  if (rawStatus === REQUEST_STATUS.SUBMITTED) {
    if (pendingOffers.length > 0) {
      customCurrent = `You have received ${pendingOffers.length} offer${pendingOffers.length > 1 ? 's' : ''} from verified collectors.`;
      customNext = 'You can compare the offers, negotiate for a better rate, or accept the best offer.';
      if (language === 'hi') {
        customExplanation = `आपके पिकअप के लिए ${pendingOffers.length} कलेक्टर ऑफर प्राप्त हुए हैं। आप उनकी तुलना कर सकते हैं या किसी ऑफर को स्वीकार/नेगोशिएट कर सकते हैं।`;
      } else if (language === 'or') {
        customExplanation = `ଆପଣଙ୍କ ପିକଅପ୍ ପାଇଁ ${pendingOffers.length}ଟି ଅଫର ମିଳିଛି। ଆପଣ ତୁଳନା କରିପାରିବେ କିମ୍ବା ଗ୍ରହଣ କରିପାରିବେ।`;
      } else {
        customExplanation = `Your request has received ${pendingOffers.length} collector offer${pendingOffers.length > 1 ? 's' : ''}. You can compare them, negotiate, or accept an offer.`;
      }
      customQuickActions = ['Compare offers', 'Negotiate', "What's next?"];
    } else {
      customCurrent = 'Request is broadcasted to nearby collectors. Waiting for initial price bids.';
      customNext = 'Collectors will review the lot details and submit bids shortly.';
    }
  }

  return {
    status: rawStatus,
    meaning: base.meaning,
    past: base.past,
    current: customCurrent,
    next: customNext,
    explanation: customExplanation,
    citizenActions: base.citizenActions,
    collectorActions: base.collectorActions,
    quickActions: customQuickActions,
    offersSummary: {
      total: offers.length,
      pending: pendingOffers.length,
      highestPrice: offers.length > 0 ? Math.max(...offers.map((o) => parseFloat(o.offeredPrice) || 0)) : 0,
    },
  };
}

module.exports = {
  STATE_INTERPRETATIONS,
  interpretRequestState,
};
