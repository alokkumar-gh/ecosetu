/**
 * EcoSetu — Eco-Saathi Dynamic Data Resolver Service
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * CRITICAL RULE: Eco-Saathi must NEVER fabricate account-specific information.
 * Dynamic answers come ONLY from:
 * - existing authenticated app state
 * - existing backend APIs
 * - verified current application data
 * 
 * If data cannot be retrieved or verified:
 * Eco-Saathi returns UNAVAILABLE, UNAUTHORIZED, OFFLINE, or ERROR without guessing.
 */

import { EcoSaathiDynamicResult, EcoSaathiDynamicContext, SaathiSuggestedAction } from '../types/ecoSaathi';
import { SupportedLanguage } from '../i18n/config';
import earningsService from './earningsService';
import { priceService } from './priceService';
import { materialLotService } from './materialLotService';
import { quoteService } from './quoteService';
import transactionService from './transactionService';
import { requestService } from './requestService';
import disputeService from './disputeService';
import { networkService } from './networkService';

/**
 * Localized static messages for system states
 */
const SYSTEM_MESSAGES: Record<SupportedLanguage, {
  unauthorized: string;
  offline: string;
  unavailable: string;
  error: string;
  notImplemented: string;
}> = {
  en: {
    unauthorized: 'Please sign in to your EcoSetu account to view your live account details and records.',
    offline: "You're offline. I can still answer general EcoSetu questions, but live account information needs an internet connection.",
    unavailable: 'This verified account information is currently unavailable from the server. Please try again later.',
    error: 'Unable to retrieve your verified live data right now. Please check your connection and try again.',
    notImplemented: 'This dynamic inquiry is not supported yet. You can still ask general knowledge and safety questions.',
  },
  hi: {
    unauthorized: 'अपने लाइव खाते का विवरण और रिकॉर्ड देखने के लिए कृपया अपने इकोसेतु खाते में लॉगिन करें।',
    offline: 'आप ऑफ़लाइन हैं। मैं सामान्य इकोसेतु प्रश्नों का उत्तर दे सकता हूँ, लेकिन लाइव खाते की जानकारी के लिए इंटरनेट कनेक्शन की आवश्यकता है।',
    unavailable: 'यह सत्यापित खाता जानकारी वर्तमान में सर्वर से उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।',
    error: 'इस समय आपका सत्यापित लाइव डेटा प्राप्त करने में असमर्थ। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।',
    notImplemented: 'यह लाइव पूछताछ अभी समर्थित नहीं है। आप सामान्य जानकारी और सुरक्षा प्रश्न पूछ सकते हैं।',
  },
  mr: {
    unauthorized: 'तुमचे थेट खाते तपशील आणि रेकॉर्ड पाहण्यासाठी कृपया तुमच्या इकोसेतू खात्यात लॉगिन करा.',
    offline: 'तुम्ही ऑफलाइन आहात. मी सामान्य इकोसेतू प्रश्नांची उत्तरे देऊ शकतो, परंतु थेट खात्याच्या माहितीसाठी इंटरनेट कनेक्शन आवश्यक आहे.',
    unavailable: 'ही पडताळलेली खाते माहिती सध्या सर्व्हरवरून उपलब्ध नाही. कृपया नंतर पुन्हा प्रयत्न करा.',
    error: 'सध्या तुमचा पडताळलेला थेट डेटा मिळवण्यात अक्षम. कृपया तुमचे कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
    notImplemented: 'ही थेट चौकशी अद्याप समर्थित नाही. तुम्ही सामान्य माहिती आणि सुरक्षा प्रश्न विचारू शकता.',
  },
  or: {
    unauthorized: 'ଆପଣଙ୍କର ଲାଇଭ୍ ଖାତା ବିବରଣୀ ଏବଂ ରେକର୍ଡ ଦେଖିବା ପାଇଁ ଦୟାକରି ଆପଣଙ୍କର ଇକୋସେତୁ ଖାତାରେ ଲଗ୍ ଇନ୍ କରନ୍ତୁ।',
    offline: 'ଆପଣ ଅଫଲାଇନ୍ ଅଛନ୍ତି। ମୁଁ ସାଧାରଣ ଇକୋସେତୁ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେଇପାରିବି, କିନ୍ତୁ ଲାଇଭ୍ ଖାତା ସୂଚନା ପାଇଁ ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଆବଶ୍ୟକ।',
    unavailable: 'ଏହି ଯାଞ୍ଚ ହୋଇଥିବା ଖାତା ସୂଚନା ବର୍ତ୍ତମାନ ସର୍ଭରରୁ ଉପଲବ୍ଧ ନାହିଁ। ଦୟାକରି ପରେ ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।',
    error: 'ଏହି ସମୟରେ ଆପଣଙ୍କର ଯାଞ୍ଚ ହୋଇଥିବା ଲାଇଭ୍ ତଥ୍ୟ ପାଇବାରେ ଅସମର୍ଥ। ଦୟାକରି ଆପଣଙ୍କର ସଂଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    notImplemented: 'ଏହି ଲାଇଭ୍ ଅନୁସନ୍ଧାନ ଏପର୍ଯ୍ୟନ୍ତ ସମର୍ଥିତ ନୁହେଁ। ଆପଣ ସାଧାରଣ ଜ୍ଞାନ ଏବଂ ସୁରକ୍ଷା ପ୍ରଶ୍ନ ପଚାରିପାରିବେ।',
  },
};

/**
 * Main dynamic resolver entry point
 */
export async function resolveEcoSaathiDynamicIntent(
  intentId: string,
  resolverKey: string | undefined,
  context: EcoSaathiDynamicContext
): Promise<EcoSaathiDynamicResult> {
  const lang: SupportedLanguage = context.language || 'en';
  const sysMsg = SYSTEM_MESSAGES[lang] || SYSTEM_MESSAGES.en;

  if (!resolverKey) {
    return {
      intentId,
      status: 'NOT_IMPLEMENTED',
      message: sysMsg.notImplemented,
      timestamp: Date.now(),
    };
  }

  // 1. Price discovery does not require strict personal authentication
  if (resolverKey === 'RESOLVE_PRICE_BOARD') {
    return resolvePriceBoard(intentId, lang);
  }

  // 2. All other resolvers require authenticated user session
  if (!context.isAuthenticated || !context.user) {
    return {
      intentId,
      status: 'UNAUTHORIZED',
      message: sysMsg.unauthorized,
      action: {
        actionType: 'NAVIGATE',
        targetRoute: 'Login',
        actionLabelI18nKey: 'auth.signIn',
      },
      timestamp: Date.now(),
    };
  }

  // 3. Dispatch to dedicated verified resolvers
  try {
    switch (resolverKey) {
      case 'RESOLVE_USER_EARNINGS':
        return await resolveUserEarnings(intentId, context, lang);

      case 'RESOLVE_USER_LOTS':
        return await resolveUserLots(intentId, context, lang);

      case 'RESOLVE_USER_DEALS':
        return await resolveUserDeals(intentId, context, lang);

      case 'RESOLVE_PAYMENT_STATUS':
        return await resolvePaymentStatus(intentId, context, lang);

      case 'RESOLVE_CITIZEN_REQUESTS':
        return await resolveCitizenRequests(intentId, context, lang);

      case 'RESOLVE_VERIFICATION_STATUS':
        return resolveVerificationStatus(intentId, context, lang);

      case 'RESOLVE_USER_DISPUTES':
        return await resolveUserDisputes(intentId, context, lang);

      default:
        return {
          intentId,
          status: 'NOT_IMPLEMENTED',
          message: sysMsg.notImplemented,
          timestamp: Date.now(),
        };
    }
  } catch (err: any) {
    // Check if network error
    if (err?.isNetworkError || !networkService.isConnected()) {
      return {
        intentId,
        status: 'OFFLINE',
        message: sysMsg.offline,
        timestamp: Date.now(),
      };
    }

    if (err?.status === 401 || err?.status === 403 || err?.response?.status === 401 || err?.response?.status === 403) {
      return {
        intentId,
        status: 'UNAUTHORIZED',
        message: sysMsg.unauthorized,
        timestamp: Date.now(),
      };
    }

    return {
      intentId,
      status: 'ERROR',
      message: sysMsg.error,
      timestamp: Date.now(),
    };
  }
}

/**
 * 1. Price Board Resolver (Distinguishes benchmark reference prices from negotiated final prices)
 */
async function resolvePriceBoard(intentId: string, lang: SupportedLanguage): Promise<EcoSaathiDynamicResult> {
  const isOnline = networkService.isConnected();
  try {
    const data = await priceService.getPriceBoard();
    const prices = data?.prices || [];
    const location = data?.location || 'Regional Market';
    const isCached = Boolean(data?.isCached);

    if (prices.length === 0) {
      const emptyMessages: Record<SupportedLanguage, string> = {
        en: `No current market prices are listed for ${location} right now. Please check back later or open the Price Board.`,
        hi: `${location} के लिए अभी कोई बाजार मूल्य सूचीबद्ध नहीं है। कृपया बाद में जांचें या प्राइस बोर्ड खोलें।`,
        mr: `${location} साठी सध्या कोणतेही बाजार भाव सूचीबद्ध नाहीत. कृपया नंतर तपासा किंवा प्राईस बोर्ड उघडा.`,
        or: `${location} ପାଇଁ ବର୍ତ୍ତମାନ କୌଣସି ବଜାର ଦର ତାଲିକାଭୁକ୍ତ ହୋଇନାହିଁ। ଦୟାକରି ପରେ ଯାଞ୍ଚ କରନ୍ତୁ କିମ୍ବା ପ୍ରାଇସ୍ ବୋର୍ଡ ଖୋଲନ୍ତୁ।`,
      };
      return {
        intentId,
        status: 'UNAVAILABLE',
        message: emptyMessages[lang] || emptyMessages.en,
        action: {
          actionType: 'NAVIGATE',
          targetRoute: 'CollectorPriceBoard',
          actionLabelI18nKey: 'saathi.actions.open_price_board',
        },
        timestamp: Date.now(),
        isCached,
      };
    }

    // Pick top 4 benchmark rates safely
    const topRates = prices.slice(0, 4).map((p) => `• ${p.category}: ₹${p.buyingPrice}/${p.unit || 'kg'}`).join('\n');

    const formattedMessages: Record<SupportedLanguage, string> = {
      en: `📈 **Current Benchmark Buying Rates (${location})**:\n${topRates}\n\n⚠️ *These are reference benchmark prices. Final transaction prices are negotiated directly between collector and recycler.*`,
      hi: `📈 **वर्तमान बेंचमार्क खरीद दरें (${location})**:\n${topRates}\n\n⚠️ *ये केवल संदर्भ बेंचमार्क दरें हैं। अंतिम लेनदेन मूल्य कलेक्टर और रीसायकलर के बीच सीधे बातचीत से तय होता है।*`,
      mr: `📈 **चालू बेंचमार्क खरेदी दर (${location})**:\n${topRates}\n\n⚠️ *हे केवळ संदर्भ बेंचमार्क दर आहेत. अंतिम व्यवहार किंमत कलेक्टर आणि रीसायकलर यांच्यात थेट ठरते.*`,
      or: `📈 **ବର୍ତ୍ତମାନର ବେଞ୍ଚମାର୍କ କ୍ରୟ ଦର (${location})**:\n${topRates}\n\n⚠️ *ଏହା କେବଳ ରେଫରେନ୍ସ ବେଞ୍ଚମାର୍କ ଦର। ଚୂଡ଼ାନ୍ତ କାରବାର ମୂଲ୍ୟ କଲେକ୍ଟର ଏବଂ ରିସାଇକ୍ଲରଙ୍କ ମଧ୍ୟରେ ସିଧାସଳଖ ନିର୍ଦ୍ଧାରଣ ହୁଏ।*`,
    };

    let msg = formattedMessages[lang] || formattedMessages.en;
    if (isCached) {
      const cacheNote: Record<SupportedLanguage, string> = {
        en: '\n\n⏱️ *Last synchronized information*',
        hi: '\n\n⏱️ *पिछली सिंक्रनाइज़ की गई जानकारी*',
        mr: '\n\n⏱️ *शेवटची समक्रमित माहिती*',
        or: '\n\n⏱️ *ପୂର୍ବରୁ ସିଙ୍କ ହୋଇଥିବା ତଥ୍ୟ*',
      };
      msg += cacheNote[lang] || cacheNote.en;
    }

    return {
      intentId,
      status: 'SUCCESS',
      message: msg,
      action: {
        actionType: 'NAVIGATE',
        targetRoute: 'CollectorPriceBoard',
        actionLabelI18nKey: 'saathi.actions.open_price_board',
      },
      data: { location, count: prices.length },
      timestamp: Date.now(),
      isCached,
    };
  } catch (err) {
    if (!isOnline) {
      return {
        intentId,
        status: 'OFFLINE',
        message: SYSTEM_MESSAGES[lang].offline,
        timestamp: Date.now(),
      };
    }
    return {
      intentId,
      status: 'UNAVAILABLE',
      message: SYSTEM_MESSAGES[lang].unavailable,
      timestamp: Date.now(),
    };
  }
}

/**
 * 2. Collector Earnings Resolver
 */
async function resolveUserEarnings(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): Promise<EcoSaathiDynamicResult> {
  const summary = await earningsService.getEarningsSummary();
  const isCached = Boolean(summary.isCached);

  const sales = summary.totalRecordedSales || '0.00';
  const paid = summary.totalPaid || '0.00';
  const pending = summary.totalPending || '0.00';
  const pendingCount = summary.pendingTransactionCount || 0;

  const messages: Record<SupportedLanguage, string> = {
    en: `📊 **Verified Earnings Summary**:\n• Total Recorded Sales: ₹${sales}\n• Total Amount Paid: ₹${paid}\n• Pending Dues: ₹${pending} (${pendingCount} pending transaction${pendingCount === 1 ? '' : 's'})\n\n(Note: Payments are settled directly between parties. EcoSetu does not hold custody of funds.)`,
    hi: `📊 **सत्यापित कमाई का विवरण**:\n• कुल दर्ज बिक्री: ₹${sales}\n• कुल प्राप्त राशि: ₹${paid}\n• बकाया राशि: ₹${pending} (${pendingCount} पेंडिंग लेनदेन)\n\n(नोट: भुगतान सीधे पक्षों के बीच तय होता है। इकोसेतु फंड नहीं रोकता है।)`,
    mr: `📊 **पडताळणी केलेली कमाई सारांश**:\n• एकूण नोंदवलेली विक्री: ₹${sales}\n• एकूण मिळालेली रक्कम: ₹${paid}\n• प्रलंबित रक्कम: ₹${pending} (${pendingCount} प्रलंबित व्यवहार)\n\n(टीप: देयके थेट पक्षांमध्ये निकाली काढली जातात. इकोसेतू निधी अडवत नाही.)`,
    or: `📊 **ଯାଞ୍ଚ ହୋଇଥିବା ରୋଜଗାର ସାରାଂଶ**:\n• ମୋଟ ରେକର୍ଡ ହୋଇଥିବା ବିକ୍ରି: ₹${sales}\n• ମୋଟ ପାଇଥିବା ଟଙ୍କା: ₹${paid}\n• ବକେୟା ଟଙ୍କା: ₹${pending} (${pendingCount} ଟି ପେଣ୍ଡିଂ କାରବାର)\n\n(ସୂଚନା: ଦେୟ ସିଧାସଳଖ ଉଭୟ ପକ୍ଷଙ୍କ ମଧ୍ୟରେ ସମାଧାନ ହୁଏ। ଇକୋସେତୁ ଟଙ୍କା ରଖେ ନାହିଁ।)`,
  };

  let msg = messages[lang] || messages.en;
  if (isCached) {
    const cacheNote: Record<SupportedLanguage, string> = {
      en: '\n\n⏱️ *Last synchronized information*',
      hi: '\n\n⏱️ *पिछली सिंक्रनाइज़ की गई जानकारी*',
      mr: '\n\n⏱️ *शेवटची समक्रमित माहिती*',
      or: '\n\n⏱️ *ପୂର୍ବରୁ ସିଙ୍କ ହୋଇଥିବା ତଥ୍ୟ*',
    };
    msg += cacheNote[lang] || cacheNote.en;
  }

  return {
    intentId,
    status: 'SUCCESS',
    message: msg,
    action: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorEarnings',
      actionLabelI18nKey: 'saathi.actions.open_earnings',
    },
    data: {
      totalRecordedSales: sales,
      totalPaid: paid,
      totalPending: pending,
      pendingTransactionCount: pendingCount,
    },
    timestamp: Date.now(),
    isCached,
  };
}

/**
 * 3. Collector Lots Status Resolver
 */
async function resolveUserLots(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): Promise<EcoSaathiDynamicResult> {
  const result = await materialLotService.listLots({ limit: 10 });
  const lots = result.lots || [];
  const total = result.total || lots.length;

  const activeLots = lots.filter(
    (l) => l.status === 'OPEN' || l.status === 'LISTED' || l.status === 'DRAFT' || l.status === 'NEGOTIATING'
  );
  const activeCount = activeLots.length;
  const latestLot = lots[0];

  let latestDetail = '';
  if (latestLot) {
    const weight = latestLot.approximateTotalWeightKg || 0;
    latestDetail = `\n• Latest Lot: ${latestLot.category || 'E-Waste'} (${weight}kg, Status: ${latestLot.status})`;
  }

  const messages: Record<SupportedLanguage, string> = {
    en: `📦 **Your Material Lots**:\n• Active / Open Lots: ${activeCount}\n• Total Recorded: ${total}${latestDetail}\n\nTap below to manage your lots or create new listings.`,
    hi: `📦 **आपके मटेरियल लॉट**:\n• सक्रिय/ओपन लॉट: ${activeCount}\n• कुल दर्ज लॉट: ${total}${latestDetail}\n\nअपने लॉट देखने या नया लॉट बनाने के लिए नीचे टैप करें।`,
    mr: `📦 **तुमचे मटेरियल लॉट्स**:\n• सक्रिय/ओपन लॉट्स: ${activeCount}\n• एकूण नोंदवलेले लॉट्स: ${total}${latestDetail}\n\nतुमचे लॉट्स व्यवस्थापित करण्यासाठी खाली टॅप करा.`,
    or: `📦 **ଆପଣଙ୍କର ମାଲ୍ ଲଟ୍**:\n• ସକ୍ରିୟ/ଓପନ୍ ଲଟ୍: ${activeCount}\n• ମୋଟ ରେକର୍ଡ ହୋଇଥିବା: ${total}${latestDetail}\n\nଆପଣଙ୍କର ଲଟ୍ ପରିଚାଳନା କରିବାକୁ ତଳେ ଟ୍ୟାପ୍ କରନ୍ତୁ।`,
  };

  return {
    intentId,
    status: 'SUCCESS',
    message: messages[lang] || messages.en,
    action: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorLots',
      actionLabelI18nKey: 'saathi.actions.view_my_lots',
    },
    data: {
      activeCount,
      total,
      latestLotId: latestLot?.id,
    },
    timestamp: Date.now(),
  };
}

/**
 * 4. User Deals & Offers Resolver
 */
async function resolveUserDeals(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): Promise<EcoSaathiDynamicResult> {
  const role = context.user?.role;
  let offersCount = 0;
  let latestOfferText = '';

  if (role === 'CITIZEN') {
    const citizenQuotes = await quoteService.getCitizenQuotes();
    offersCount = citizenQuotes.length;
    if (citizenQuotes.length > 0) {
      const latest = citizenQuotes[0];
      latestOfferText = `\n• Latest Purchase Offer: ₹${latest.quotedUnitPrice} (${latest.status})`;
    }
  } else {
    // Collector / Recycler lots
    const lotRes = await materialLotService.listLots({ limit: 5 });
    const lots = lotRes.lots || [];
    offersCount = lots.filter((l) => l.status === 'NEGOTIATING' || l.status === 'OPEN').length;
    if (lots.length > 0) {
      latestOfferText = `\n• Active Listings in Market: ${offersCount}`;
    }
  }

  const messages: Record<SupportedLanguage, string> = {
    en: `🤝 **Your Active Deals & Offers**:\n• Total Active Negotiations: ${offersCount}${latestOfferText}\n\nReview incoming bids or revise quotes in the Deals section.`,
    hi: `🤝 **आपके सक्रिय सौदे और ऑफर**:\n• कुल सक्रिय बातचीत: ${offersCount}${latestOfferText}\n\nआने वाले ऑफर देखने या संशोधित करने के लिए नीचे टैप करें।`,
    mr: `🤝 **तुमचे सक्रिय सौदे आणि ऑफर्स**:\n• एकूण चालू वाटाघाटी: ${offersCount}${latestOfferText}\n\nनवीन ऑफर्स पाहण्यासाठी खाली टॅप करा.`,
    or: `🤝 **ଆପଣଙ୍କର ସକ୍ରିୟ ଡିଲ୍ ଏବଂ ଅଫର**:\n• ମୋଟ ସକ୍ରିୟ କଥାବାର୍ତ୍ତା: ${offersCount}${latestOfferText}\n\nଆସିଥିବା ଅଫର ଦେଖିବା ପାଇଁ ତଳେ ଟ୍ୟାପ୍ କରନ୍ତୁ।`,
  };

  const targetRoute = role === 'CITIZEN' ? 'CitizenConsumerMarket' : 'CollectorDeals';

  return {
    intentId,
    status: 'SUCCESS',
    message: messages[lang] || messages.en,
    action: {
      actionType: 'NAVIGATE',
      targetRoute,
      actionLabelI18nKey: 'saathi.actions.open_deals',
    },
    data: { offersCount },
    timestamp: Date.now(),
  };
}

/**
 * 5. Payment & Settlement Status Resolver
 */
async function resolvePaymentStatus(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): Promise<EcoSaathiDynamicResult> {
  const summary = await earningsService.getEarningsSummary();
  const paidCount = summary.paidTransactionCount || 0;
  const pendingCount = summary.pendingTransactionCount || 0;
  const pendingAmount = summary.totalPending || '0.00';

  const messages: Record<SupportedLanguage, string> = {
    en: `💳 **Payment Settlement Status**:\n• Settled / Paid Transactions: ${paidCount}\n• Pending Settlements: ${pendingCount} (₹${pendingAmount})\n\n(Remember: Complete digital handover verification for end-to-end traceability before settlement.)`,
    hi: `💳 **भुगतान निपटान स्थिति**:\n• पूरे हुए भुगतान: ${paidCount}\n• पेंडिंग निपटान: ${pendingCount} (₹${pendingAmount})\n\n(याद रखें: निपटान से पहले डिजिटल हैंडओवर सत्यापन पूरा करें।)`,
    mr: `💳 **पेमेंट स्थिती**:\n• पूर्ण झालेले पेमेंट: ${paidCount}\n• प्रलंबित पेमेंट: ${pendingCount} (₹${pendingAmount})\n\n(लक्षात ठेवा: पेमेंटपूर्वी डिजिटल हँडओव्हर पडताळणी पूर्ण करा.)`,
    or: `💳 **ପେମେଣ୍ଟ ସ୍ଥିତି**:\n• ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଥିବା ପେମେଣ୍ଟ: ${paidCount}\n• ପେଣ୍ଡିଂ ପେମେଣ୍ଟ: ${pendingCount} (₹${pendingAmount})\n\n(ମନେରଖନ୍ତୁ: ପେମେଣ୍ଟ ପୂର୍ବରୁ ଡିଜିଟାଲ୍ ହ୍ୟାଣ୍ଡଓଭର ଯାଞ୍ଚ ନିଶ୍ଚିତ କରନ୍ତୁ।)`,
  };

  return {
    intentId,
    status: 'SUCCESS',
    message: messages[lang] || messages.en,
    action: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorTransactions',
      actionLabelI18nKey: 'saathi.actions.view_transactions',
    },
    data: { paidCount, pendingCount, pendingAmount },
    timestamp: Date.now(),
  };
}

/**
 * 6. Citizen Requests Status Resolver
 */
async function resolveCitizenRequests(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): Promise<EcoSaathiDynamicResult> {
  const requests = await requestService.getRequests();
  const reqList = Array.isArray(requests) ? requests : [];
  const total = reqList.length;

  const active = reqList.filter((r: any) => r.status === 'SUBMITTED' || r.status === 'ASSIGNED' || r.status === 'DRAFT');
  const completed = reqList.filter((r: any) => r.status === 'COMPLETED');

  let latestInfo = '';
  if (reqList.length > 0) {
    const latest: any = reqList[0];
    latestInfo = `\n• Latest Pickup: ${latest.status || 'SUBMITTED'}`;
  }

  const messages: Record<SupportedLanguage, string> = {
    en: `🚚 **Your E-Waste Pickup Requests**:\n• Total Requests: ${total}\n• In Progress / Submitted: ${active.length}\n• Completed Pickups: ${completed.length}${latestInfo}`,
    hi: `🚚 **आपके ई-कचरा पिकअप अनुरोध**:\n• कुल अनुरोध: ${total}\n• सक्रिय / सबमिट किए गए: ${active.length}\n• पूरे हुए पिकअप: ${completed.length}${latestInfo}`,
    mr: `🚚 **तुमच्या ई-कचरा पिकअप विनंत्या**:\n• एकूण विनंत्या: ${total}\n• चालू / सबमिट केलेल्या: ${active.length}\n• पूर्ण झालेले पिकअप: ${completed.length}${latestInfo}`,
    or: `🚚 **ଆପଣଙ୍କର ଇ-ବର୍ଜ୍ୟ ପିକଅପ୍ ଅନୁରୋଧ**:\n• ମୋଟ ଅନୁରୋଧ: ${total}\n• ଚାଲୁଥିବା / ଦାଖଲ ହୋଇଥିବା: ${active.length}\n• ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଥିବା ପିକଅପ୍: ${completed.length}${latestInfo}`,
  };

  return {
    intentId,
    status: 'SUCCESS',
    message: messages[lang] || messages.en,
    action: {
      actionType: 'NAVIGATE',
      targetRoute: 'CitizenRequests',
      actionLabelI18nKey: 'saathi.actions.view_requests',
    },
    data: { total, activeCount: active.length, completedCount: completed.length },
    timestamp: Date.now(),
  };
}

/**
 * 7. Verification Status Resolver
 */
function resolveVerificationStatus(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): EcoSaathiDynamicResult {
  const user = context.user;
  const isVerified = user?.isVerified || user?.status === 'ACTIVE' || user?.status === 'VERIFIED';
  const rawStatus = user?.status || (isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION');

  const statusLabels: Record<SupportedLanguage, Record<string, string>> = {
    en: {
      VERIFIED: '✅ Verified Account',
      ACTIVE: '✅ Active & Verified',
      PENDING_VERIFICATION: '⏳ Pending Admin Verification',
      PENDING: '⏳ Pending Verification',
      SUSPENDED: '⚠️ Account Suspended',
    },
    hi: {
      VERIFIED: '✅ सत्यापित खाता',
      ACTIVE: '✅ सक्रिय और सत्यापित',
      PENDING_VERIFICATION: '⏳ एडमिन सत्यापन लंबित',
      PENDING: '⏳ सत्यापन लंबित',
      SUSPENDED: '⚠️ खाता निलंबित',
    },
    mr: {
      VERIFIED: '✅ पडताळणी झालेले खाते',
      ACTIVE: '✅ सक्रिय आणि पडताळणी झालेले',
      PENDING_VERIFICATION: '⏳ ॲडमिन पडताळणी प्रलंबित',
      PENDING: '⏳ पडताळणी प्रलंबित',
      SUSPENDED: '⚠️ खाते निलंबित',
    },
    or: {
      VERIFIED: '✅ ଯାଞ୍ଚ ହୋଇଥିବା ଖାତା',
      ACTIVE: '✅ ସକ୍ରିୟ ଏବଂ ଯାଞ୍ଚ ହୋଇଛି',
      PENDING_VERIFICATION: '⏳ ଆଡମିନ୍ ଯାଞ୍ଚ ପେଣ୍ଡିଂ',
      PENDING: '⏳ ଯାଞ୍ଚ ପେଣ୍ଡିଂ',
      SUSPENDED: '⚠️ ଖାତା ସ୍ଥଗିତ',
    },
  };

  const statusText =
    (statusLabels[lang] && statusLabels[lang][rawStatus]) ||
    (statusLabels.en && statusLabels.en[rawStatus]) ||
    rawStatus;

  const name = user?.name || 'User';
  const role = user?.role || 'User';

  const messages: Record<SupportedLanguage, string> = {
    en: `🛡️ **Account Verification Status**:\n• Status: ${statusText}\n• Registered Role: ${role}\n• User: ${name}\n\n${isVerified ? 'Your account is authorized to trade, list lots, and process digital handovers.' : 'Your account is under standard verification. Full permissions activate upon approval.'}`,
    hi: `🛡️ **खाता सत्यापन स्थिति**:\n• स्थिति: ${statusText}\n• भूमिका: ${role}\n• नाम: ${name}\n\n${isVerified ? 'आपका खाता व्यापार करने, लॉट सूचीबद्ध करने और डिजिटल हैंडओवर करने के लिए अधिकृत है।' : 'आपका खाता सत्यापन प्रक्रिया में है। अनुमोदन के बाद पूर्ण अनुमतियाँ सक्रिय हो जाएँगी।'}`,
    mr: `🛡️ **खाते पडताळणी स्थिती**:\n• स्थिती: ${statusText}\n• भूमिका: ${role}\n• नाव: ${name}\n\n${isVerified ? 'तुमचे खाते व्यापार करण्यासाठी, लॉट सूचीबद्ध करण्यासाठी आणि डिजिटल हँडओव्हर करण्यासाठी अधिकृत आहे.' : 'तुमचे खाते पडताळणी प्रक्रियेत आहे. मंजुरीनंतर संपूर्ण परवानग्या सक्रिय होतील.'}`,
    or: `🛡️ **ଖାତା ଯାଞ୍ଚ ସ୍ଥିତି**:\n• ସ୍ଥିତି: ${statusText}\n• ଭୂମିକା: ${role}\n• ନାମ: ${name}\n\n${isVerified ? 'ଆପଣଙ୍କର ଖାତା ବ୍ୟବସାୟ କରିବା, ଲଟ୍ ତାଲିକାଭୁକ୍ତ କରିବା ଏବଂ ଡିଜିଟାଲ୍ ହ୍ୟାଣ୍ଡଓଭର କରିବା ପାଇଁ ଅନୁମୋଦିତ।' : 'ଆପଣଙ୍କର ଖାତା ଯାଞ୍ଚ ପ୍ରକ୍ରିୟାରେ ଅଛି। ମଞ୍ଜୁରୀ ପରେ ସମସ୍ତ ଅନୁମତି ସକ୍ରିୟ ହେବ।'}`,
  };

  return {
    intentId,
    status: 'SUCCESS',
    message: messages[lang] || messages.en,
    action: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorProfile',
      actionLabelI18nKey: 'saathi.actions.open_profile',
    },
    data: {
      isVerified,
      status: rawStatus,
      role,
    },
    timestamp: Date.now(),
  };
}

/**
 * 8. User Disputes Resolver
 */
async function resolveUserDisputes(
  intentId: string,
  context: EcoSaathiDynamicContext,
  lang: SupportedLanguage
): Promise<EcoSaathiDynamicResult> {
  const res: any = await disputeService.getDisputes({ limit: 5 });
  const disputes: any[] = res?.data?.disputes || res?.disputes || (Array.isArray(res) ? res : []);
  const total = disputes.length;

  const openTickets = disputes.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW');
  const openCount = openTickets.length;

  let latestInfo = '';
  if (disputes.length > 0) {
    const latest = disputes[0];
    latestInfo = `\n• Latest Ticket: #${latest.disputeReference || latest.id?.slice(0, 8)} (${latest.status})`;
  }

  const messages: Record<SupportedLanguage, string> = {
    en: `⚖️ **Support & Dispute Tickets**:\n• Active/Open Tickets: ${openCount}\n• Total Recorded: ${total}${latestInfo}\n\nOur grievance desk investigates all weight and payment discrepancies.`,
    hi: `⚖️ **सहायता और विवाद टिकट**:\n• सक्रिय/ओपन शिकायतें: ${openCount}\n• कुल दर्ज: ${total}${latestInfo}\n\nहमारा सहायता केंद्र वजन और भुगतान संबंधी सभी विसंगतियों की जांच करता है।`,
    mr: `⚖️ **तक्रारी आणि सपोर्ट टिकिटे**:\n• चालू तक्रारी: ${openCount}\n• एकूण नोंदवलेल्या: ${total}${latestDetail(disputes)}\n\nआमचा तक्रार निवारण कक्ष वजन आणि देयकातील सर्व तफावतींची तपासणी करतो.`,
    or: `⚖️ **ସହାୟତା ଏବଂ ବିବାଦ ଟିକେଟ୍**:\n• ସକ୍ରିୟ/ଖୋଲା ଅଭିଯୋଗ: ${openCount}\n• ମୋଟ ରେକର୍ଡ ହୋଇଥିବା: ${total}${latestInfo}\n\nଆମର ସହାୟତା ଡେସ୍କ ଓଜନ ଏବଂ ପେମେଣ୍ଟ ତାରତମ୍ୟର ତଦନ୍ତ କରେ।`,
  };

  function latestDetail(items: any[]) {
    return items.length > 0 ? `\n• Latest: #${items[0].disputeReference || items[0].id?.slice(0, 8)} (${items[0].status})` : '';
  }

  return {
    intentId,
    status: 'SUCCESS',
    message: messages[lang] || messages.en,
    action: {
      actionType: 'NAVIGATE',
      targetRoute: 'CollectorDisputes',
      actionLabelI18nKey: 'saathi.actions.open_disputes',
    },
    data: { openCount, total },
    timestamp: Date.now(),
  };
}
