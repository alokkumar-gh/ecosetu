/**
 * EcoSetu — Intent Detector
 * Maps natural language queries (English, Hindi, Hinglish, Odia) to structured domain intents.
 * Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md
 */

const INTENT_DEFINITIONS = {
  WHAT_NEXT: {
    patterns: [
      /\b(what('s| is)?\s+next)\b/i,
      /\b(what happens next)\b/i,
      /\b(next step|aage kya hoga|kya karna hai|ab kya kare|ab aage|what to do next)\b/i,
      /\b(ଆଗକୁ କଣ ହେବ|କଣ କରିବି)\b/i,
    ],
  },
  OFFER_COMPARISON: {
    patterns: [
      /\b(which|kaun\s*sa|koutha|who)\b.*\b(offer|collector|bid|quote)\b.*\b(best|better|highest|most|jyada|zyada|bada|closest|pass|paas|near|cheapest|kam)\b/i,
      /\b(which\s*(one)?\s*(is|gave me)?\s*(the)?\s*(highest|most|best|closest|nearest))\b/i,
      /\b(compare\s*(all|the)?\s*offers?)\b/i,
      /\b(what about the (first|second|third|1st|2nd|3rd|other|another) (one|collector|offer))\b/i,
      /\b(dusra wala|doosra collector|second offer|pehla offer)\b/i,
      /\b(kaun sa sabse zyada hai|sabse zyada offer|sabse bada offer)\b/i,
    ],
  },
  PRICE_EXPLANATION: {
    patterns: [
      /\b(why\s*(is)?\s*(the)?\s*(price|rate|offer|amount)\s*(so)?\s*(low|high|less|different))\b/i,
      /\b(why this price|why is this offer lower|explain price|itna kam kyu|rate itna kam|daam kam kyu)\b/i,
      /\b(ଦର କାହିଁକି କମ|କାହିଁକି ଏତେ କମ)\b/i,
    ],
  },
  TRACEABILITY_EXPLANATION: {
    patterns: [
      /\b(trace|traceability|tracking|journey|kaha tak pahucha|kaha gaya|where is my (ewaste|e-waste|laptop|mobile|phone|item)|kahan gaya|green certificate)\b/i,
      /\b(mera e-?waste (kaha|kahan) hai|mera ewaste abhi kaha hai|what happened to my (laptop|phone|mobile|item)|who collected my (laptop|phone|mobile|item))\b/i,
      /\b(what happened after pickup|is my (ewaste|e-waste|laptop|item) recycled|show (my )?(complete )?journey|item kis stage (pe|par) hai|abhi mera item kis stage)\b/i,
      /\b(pickup kab hua|recycled hua kya|complete journey dikhao)\b/i,
      /\b(mo e-?waste ebe keun stage|mo ewaste kouthi achi|mo item kouthi achi)\b/i,
      /(କେଉଁଠି ପହଞ୍ଚିଲା|ଟ୍ରେସ୍ କରନ୍ତୁ|ମୋ ଇ-?ବର୍ଜ୍ୟବସ୍ତୁ କେଉଁଠି|କେଉଁ ସ୍ତରରେ ଅଛି|ପୁନଃଚକ୍ରଣ ହୋଇଛି କି|ମୋ ଇ-ବର୍ଜ୍ୟବସ୍ତୁ)/i,
    ],
  },
  ACCEPT_OFFER: {
    patterns: [
      /\b(accept|manzoor|swikar|le lo|fix karo|ok karo)\b.*\b(offer|deal|price|₹|\d+)/i,
      /\b(accept\s+(the\s+)?(offer|\d+|₹\d+))/i,
    ],
  },
  NEGOTIATION: {
    patterns: [
      /\b(counter|negotiate|bargain|ask (for|him)|bol(o|iye)?|offer)\b.*\b(\d+|₹\d+|zyada|jyada|kam)/i,
      /\b(can i (ask|counter|get)\s*(\d+|₹\d+))/i,
      /\b(\d+\s*(rupees|rs|rupaye|me\s*dega|kar do|kar sakta))/i,
    ],
  },
  PICKUP_STATUS: {
    patterns: [
      /\b(where is my pickup|pickup status|pickup kab (aayega|hoga)|kab tak aayega|status kya hai|gadi kab aayegi)\b/i,
      /\b(track my request|pickup tracking|pickup kaha tak pahucha)\b/i,
      /\b(ମୋ ପିକଅପ୍ କେବେ ଆସିବ|ପିକଅପ୍ ସ୍ଥିତି)\b/i,
    ],
  },
  VIEW_OFFERS: {
    patterns: [
      /\b(show( me)? (the )?offers|view offers|offers received|kitna offer (diya|mila)|kisi ne offer kiya|check offers)\b/i,
      /\b(ଅଫର ଦେଖାନ୍ତୁ|କେତେ ଅଫର ମିଳିଛି)\b/i,
    ],
  },
  CREATE_PICKUP: {
    patterns: [
      /\b(create pickup|book pickup|schedule pickup|new pickup|ewaste bechna hai|scrap bechna hai|submit ewaste)\b/i,
      /\b(pura(na)? (mobile|phone|laptop|tv) (bechna|dena) hai)\b/i,
      /\b(ପିକଅପ୍ ବୁକ୍ କରନ୍ତୁ|ପୁରୁଣା ସାମଗ୍ରୀ ବିକ୍ରି)\b/i,
    ],
  },
  E_WASTE_CATEGORY: {
    patterns: [
      /\b(what category|which category|is this ewaste|can i recycle|recycle this|dustbin|garbage|kachre me fenk|feink sakte hai)\b/i,
      /\b(what should i do with an old|throw electronics in normal garbage)\b/i,
      /\b(battery safe|swollen battery|hazardous ewaste)\b/i,
    ],
  },
  E_WASTE_PRICING: {
    patterns: [
      /\b(price of|rate of|bhav kya hai|rate kya hai|today rate|price board|kitna milega|rate card)\b/i,
      /\b(ଦର କେତେ|ମୂଲ୍ୟ କେତେ)\b/i,
    ],
  },
  CANCEL_REQUEST: {
    patterns: [
      /\b(cancel( my)? (pickup|request)|radd karo|request cancel)\b/i,
    ],
  },
  USER_PROFILE: {
    patterns: [
      /\b(my profile|my account|my details|mera account|mera profile)\b/i,
    ],
  },
  COLLECTOR_HELP: {
    patterns: [
      /\b(collector dashboard|my earnings|kamai kitni hui|lot create)\b/i,
    ],
  },
  VIEW_MATCHING_REQUESTS: {
    patterns: [
      /\b(what new requests|show (.* )?requests|requests near me|within my service area|new ewaste requests|matching requests|nearby requests)\b/i,
      /\b(which (one|request) is closest|nearest request|closest pickup|naya request dikhao|paas wale request|mere area ke request)\b/i,
      /\b(ନୂଆ ଅନୁରୋଧ|ପାଖରେ ଥିବା ଅନୁରୋଧ|ମୋ ଅଞ୍ଚଳର ଅନୁରୋଧ)\b/i,
    ],
  },
  COLLECTOR_OFFER_GUIDANCE: {
    patterns: [
      /\b(how much should i offer|what should i offer|kitna offer karu|rate kitna offer|offer kitna du|suggest offer|offer guidance)\b/i,
      /\b(କେତେ ଅଫର ଦେବି|ଅଫର ମୂଲ୍ୟ କେତେ ହେବା ଉଚିତ)\b/i,
    ],
  },
  COLLECTOR_NEGOTIATIONS: {
    patterns: [
      /\b(what negotiations are pending|pending negotiations|counter offers? (pending|received)|did the citizen respond|citizen counter)\b/i,
      /\b(kitne negotiation bache hai|counter offer aaya kya|negotiation status)\b/i,
      /\b(କେତେ କାଉଣ୍ଟର ଅଫର ଅଛି|ବୁଝାମଣା ସ୍ଥିତି)\b/i,
    ],
  },
  COLLECTOR_ACTIVE_PICKUPS: {
    patterns: [
      /\b(show( my)? active pickups?|today('s)? (scheduled )?pickups?|my pickups|assigned to me|pickup list|scheduled pickups)\b/i,
      /\b(mere active pickups|aaj ke pickup|schedule pickup dikhao)\b/i,
      /\b(ମୋର ସକ୍ରିୟ ପିକଅପ୍|ଆଜିର ପିକଅପ୍)\b/i,
    ],
  },
  IDENTIFY_EWASTE: {
    patterns: [
      /\b(what('s| is)?\s+this|ye kya hai|ye kaun sa item hai|ye kya cheez hai|identify this|kya ye (laptop|phone|mobile|desktop) hai)\b/i,
      /\b(is this a (laptop|phone|mobile|desktop|computer|tablet|tv|monitor|battery|cable|charger))\b/i,
      /\b(କଣ ଏହା|ଏହା କଣ|କଣ ଏହା ଲାପଟପ୍)\b/i,
    ],
  },
  CONFIRM_CATEGORY: {
    patterns: [
      /\b(confirm( the)? category|category sahi hai|haan yahi hai|sahi hai|yes( it is)? (a )?(laptop|phone|mobile|desktop)|confirm( it)?)\b/i,
      /\b(correct category|haan laptop hai|haan mobile hai|thik hai category)\b/i,
      /\b(ହଁ ଲାପଟପ୍|ଶ୍ରେଣୀ ନିଶ୍ଚିତ କରନ୍ତୁ|ହଁ ଏହା ସଠିକ୍)\b/i,
    ],
  },
  CHANGE_CATEGORY: {
    patterns: [
      /\b(ye (laptop|phone|mobile|desktop|tv) nahi hai|not a (laptop|phone|desktop)|actually (this is|it's) a|change category to|galat category|galat pehchana)\b/i,
      /\b(nahi ye .* hai|it is (a )?(desktop|laptop|mobile|phone|tablet|charger|battery))\b/i,
      /\b(ଏହା ଲାପଟପ୍ ନୁହେଁ|ଶ୍ରେଣୀ ପରିବର୍ତ୍ତନ କରନ୍ତୁ)\b/i,
    ],
  },
  E_WASTE_CONDITION: {
    patterns: [
      /\b(condition is|it is (working|damaged|broken|dead|not working|used|scrap)|working condition|damaged condition|kharab hai|chal raha hai|tuta hua hai)\b/i,
      /\b(screen tuti|chal nahi raha|dead condition|fully working|brand new|good condition)\b/i,
      /\b(କାର୍ଯ୍ୟକ୍ଷମ ଅଟେ|ଭଙ୍ଗା ଅଛି|ନଷ୍ଟ ହୋଇଯାଇଛି)\b/i,
    ],
  },
  ESTIMATE_VALUE: {
    patterns: [
      /\b(iska price kitna (hoga|ho sakta hai|hai)|what is the estimated value|estimate value|calculate value|value kitna hai|kitna milega iska)\b/i,
      /\b(how much is this worth|estimated price range|approximate value|valuation kitna)\b/i,
      /\b(କେତେ ମୂଲ୍ୟ ମିଳିବ|ଆନୁମାନିକ ଦର କେତେ)\b/i,
    ],
  },
  EXPLAIN_VALUE: {
    patterns: [
      /\b(why is (the|my)? (estimated )?value (so )?(low|high|different|₹\d+|700|1100))\b/i,
      /\b(why ₹?\d+\s*[-–to]\s*₹?\d+|explain (the )?(estimate|valuation|value range)|value itna kam kyu|itna kam price kyu)\b/i,
      /\b(ମୂଲ୍ୟ ଏତେ କମ କାହିଁକି|ଆକଳନ ବୁଝାନ୍ତୁ)\b/i,
    ],
  },
  GENERAL_HELP: {
    patterns: [
      /\b(help|kaise use kare|what is ecosetu|how does ecosetu work|kya hai ecosetu)\b/i,
    ],
  },
  ATTENTION_SUMMARY: {
    patterns: [
      /\b(what do i need to do|anything pending|what needs (my )?attention|show (what needs )?(my )?attention|show (my )?tasks|actionable items?)\b/i,
      /\b(kya pending hai|kya bacha hai|kya karna hai abhi|mera pending kaam|kya dhyan dena hai|pending alert)\b/i,
      /\b(mo pain kana pending achi|kana baki achi|mo dhyana deba darkar)\b/i,
      /(ମୋ ପାଇଁ କଣ ବାକି ଅଛି|କଣ ପେଣ୍ଡିଂ ଅଛି|ମୋ ଧ୍ୟାନ ଆବଶ୍ୟକ)/i,
    ],
  },
};

class IntentDetector {
  /**
   * Detect intent from user query and optional context
   * @param {string} query - User natural language query
   * @param {object} [context] - Context with current screen and active state
   * @returns {object} { intent: string, confidence: number, extractedEntities: object }
   */
  detect(query, context = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { intent: 'UNKNOWN', confidence: 0.0, extractedEntities: {} };
    }

    const trimmed = query.trim();

    // 1. Check regex pattern definitions
    for (const [intentName, def] of Object.entries(INTENT_DEFINITIONS)) {
      for (const pattern of def.patterns) {
        if (pattern.test(trimmed)) {
          const entities = this._extractEntities(trimmed);
          return {
            intent: intentName,
            confidence: 0.95,
            extractedEntities: entities,
          };
        }
      }
    }

    // 2. Context-based boost: if on specific screens and asking short queries
    if (context.currentScreen) {
      const lower = trimmed.toLowerCase();
      if (lower === 'next' || lower === 'kya kare' || lower === 'ab kya') {
        return { intent: 'WHAT_NEXT', confidence: 0.9, extractedEntities: {} };
      }
      if (context.currentScreen.includes('Offer') && (lower.includes('compare') || lower.includes('best'))) {
        return { intent: 'OFFER_COMPARISON', confidence: 0.9, extractedEntities: {} };
      }
    }

    // 3. Fallback to UNKNOWN
    return {
      intent: 'UNKNOWN',
      confidence: 0.2,
      extractedEntities: this._extractEntities(trimmed),
    };
  }

  _extractEntities(query) {
    const entities = {};
    
    // Extract monetary amounts (₹1000, 1050, 900rs, etc.)
    const amountMatch = query.match(/(?:₹|rs\.?|inr)?\s*(\d{3,6})\b/i);
    if (amountMatch) {
      entities.amount = parseInt(amountMatch[1], 10);
    }

    // Extract categories (checking for overrides like "not a laptop, desktop" or "change to desktop")
    const overrideMatch = query.match(/(?:not a|nahi ye|change (?:category )?to|actually (?:this is |it's )?a?)\s*(laptop|desktop|mobile|phone|tablet|pcb|circuit[ _]board|battery|monitor|printer|cable|charger|tv|television)/i);
    if (overrideMatch) {
      const cat = overrideMatch[1].toUpperCase();
      entities.category = cat === 'PHONE' ? 'MOBILE_PHONE' : cat;
    } else {
      const catMatch = query.match(/\b(laptop|mobile|phone|desktop|pcb|circuit[ _]board|battery|tablet|monitor|printer|cable|charger|tv|television)\b/i);
      if (catMatch) {
        const cat = catMatch[1].toUpperCase();
        entities.category = cat === 'PHONE' ? 'MOBILE_PHONE' : cat;
      }
    }

    // Extract conditions
    const condMatch = query.match(/\b(working|tested_working|damaged|not[ _]working|dead|broken|repairable|partially[ _]working|used|scrap|kharab|tuta|chal raha)\b/i);
    if (condMatch) {
      const raw = condMatch[1].toLowerCase();
      if (raw === 'working' || raw === 'chal raha') entities.condition = 'WORKING';
      else if (raw === 'tested_working') entities.condition = 'TESTED_WORKING';
      else if (raw === 'damaged' || raw === 'kharab' || raw === 'tuta' || raw === 'broken') entities.condition = 'DAMAGED';
      else if (raw === 'not_working' || raw === 'not working' || raw === 'dead') entities.condition = 'NOT_WORKING';
      else if (raw === 'repairable') entities.condition = 'REPAIRABLE';
      else if (raw === 'partially_working') entities.condition = 'PARTIALLY_WORKING';
      else if (raw === 'used') entities.condition = 'USED';
      else if (raw === 'scrap') entities.condition = 'SCRAP';
    }

    // Extract ordinals
    const ordinalMatch = query.match(/\b(first|1st|second|2nd|third|3rd|pehla|dusra|teesra)\b/i);
    if (ordinalMatch) {
      entities.ordinal = ordinalMatch[1].toLowerCase();
    }

    return entities;
  }
}

module.exports = new IntentDetector();
