/**
 * EcoSetu — Eco-Saathi Deterministic Intent Matcher (Step 6 Enhanced)
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * Free-First, offline-first, deterministic NLP engine with:
 * 1. Multi-lingual query normalization & tokenization
 * 2. Controlled domain synonym expansion (EcoSetu specific)
 * 3. Multi-factor scoring (Exact, Substring, Fuzzy, Keyword, Synonym)
 * 4. Role & Route context boosting
 * 5. Ambiguity detection and structured clarification quick replies
 * 6. Explicit confidence thresholds (High: >=0.80, Med: 0.60-0.79, Low: <0.60)
 */

import { SupportedLanguage, DEFAULT_LANGUAGE } from '../i18n/config';
import { SaathiIntent, SaathiMatcherContext, SaathiMatchResult, SaathiClarificationOption } from '../types/ecoSaathi';
import { ECO_SAATHI_INTENTS, FALLBACK_UNKNOWN_INTENT } from '../data/ecoSaathiKnowledge';

/**
 * Domain-specific phrase substitutions for query expansion
 */
const DOMAIN_PHRASES: Array<[RegExp, string]> = [
  [/\be[\s\-_]?waste\b/gi, 'ewaste'],
  [/\bsmart[\s\-_]?phone\b/gi, 'mobile'],
  [/\bcell[\s\-_]?phone\b/gi, 'mobile'],
  [/\bsmart[\s\-_]?watch\b/gi, 'watch'],
  [/\bcircuit[\s\-_]?board\b/gi, 'pcb'],
  [/\bmother[\s\-_]?board\b/gi, 'pcb'],
  [/\bprice[\s\-_]?board\b/gi, 'priceboard'],
  [/\bscrap[\s\-_]?rate\b/gi, 'scraprate'],
  [/\bscrap[\s\-_]?price\b/gi, 'scraprate'],
  [/\bcustomer[\s\-_]?care\b/gi, 'customercare'],
  [/\bhelpline[\s\-_]?number\b/gi, 'helpline'],
];

/**
 * Common conversational filler words to ignore in token overlap scoring
 */
const FILLER_WORDS = new Set([
  'bhai', 'bhaiya', 'plz', 'please', 'tell', 'me', 'karo', 'karna', 'hai', 'kya',
  'kaha', 'kidhar', 'kaise', 'kese', 'kemiti', 'kasa', 'kashi', 'kiti', 'kete',
  'batao', 'bataiye', 'dekho', 'dikhao', 'dakhva', 'dekhantu', 'sanga', 'kuha',
  'mujhe', 'mera', 'meri', 'mere', 'humko', 'majha', 'majhe', 'majhi', 'mote',
  'mora', 'aamara', 'app', 'ecosetu', 'sir', 'madam', 'can', 'you', 'i', 'want',
  'to', 'know', 'the', 'a', 'an', 'in', 'of', 'for', 'on', 'is', 'are', 'what', 'how'
]);

/**
 * Controlled domain synonym dictionary mapping keywords to core concepts
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // SELLING concepts
  sell: [
    'sell', 'selling', 'sold', 'bech', 'bechna', 'bechni', 'bechu', 'becho', 'bechne',
    'vika', 'vikane', 'vikayche', 'vikave', 'bikri', 'bikiba', 'bikrikariba',
    'बेचना', 'बेचें', 'बेचू', 'विकावे', 'विकायचे', 'ବିକ୍ରି'
  ],
  // PRICE concepts
  price: [
    'price', 'prices', 'rate', 'rates', 'pricing', 'bhav', 'bhaav', 'daam', 'kimat',
    'kimmat', 'cost', 'mulya', 'dara', 'rete', 'scraprate', 'priceboard',
    'भाव', 'दाम', 'दर', 'रेट', 'ଦର', 'ମୂଲ୍ୟ'
  ],
  // EARNINGS concepts
  earnings: [
    'earnings', 'income', 'revenue', 'earned', 'kamai', 'aamdani', 'utpanna',
    'kamavle', 'rojgar', 'aay', 'कमाई', 'आमदनी', 'उत्पन्न', 'ରୋଜଗାର', 'ଆୟ'
  ],
  // PAYMENT concepts
  payment: [
    'payment', 'paid', 'paisa', 'paise', 'money', 'settlement', 'bhugtan', 'chukta',
    'transfer', 'upi', 'cash', 'पैसा', 'भुगतान', 'पेमेंट', 'ଟଙ୍କା', 'ପେମେଣ୍ଟ'
  ],
  // OFFERS & DEALS concepts
  offer: [
    'offer', 'offers', 'bid', 'bids', 'quote', 'quotes', 'deal', 'deals',
    'negotiation', 'counter', 'boli', 'sauda', 'quotation', 'बोली', 'ऑफर', 'सौदा', 'ଡିଲ୍', 'ଅଫର'
  ],
  // LOTS concepts
  lot: [
    'lot', 'lots', 'listing', 'listings', 'maal', 'stock', 'material', 'inventory',
    'dabba', 'kabaad', 'लॉट', 'माल', 'कबाड़', 'ଲଟ୍', 'ମାଲ୍'
  ],
  // CITIZEN PICKUP concepts
  pickup: [
    'pickup', 'submit', 'collection', 'doorstep', 'booking', 'dispose',
    'पिकअप', 'जमा', 'ପିକଅପ୍', 'ଜମା'
  ],
  // AI & CAMERA concepts
  ai: [
    'ai', 'camera', 'scan', 'scanning', 'detect', 'detection', 'recognize', 'identify',
    'कैमरा', 'पहचान', 'कॅमेरा', 'ओळख', 'କ୍ୟାମେରା', 'ଚିହ୍ନଟ'
  ],
  // SAFETY concepts
  safety: [
    'safety', 'hazard', 'danger', 'battery', 'swollen', 'fire', 'burn', 'burning',
    'wire', 'acid', 'gold', 'pcb', 'ppe', 'gloves', 'mask', 'crt', 'toxic',
    'खतरा', 'सुरक्षा', 'जलाना', 'तेजाब', 'धोका', 'सुरक्षा', 'ବିପଦ', 'ସୁରକ୍ଷା'
  ],
  // DISPUTES & ISSUES concepts
  dispute: [
    'dispute', 'complaint', 'mismatch', 'cheated', 'shortage', 'issue', 'ticket',
    'शिकायत', 'विवाद', 'गड़बड़ी', 'तक्रार', 'ଅଭିଯୋଗ', 'ବିବାଦ'
  ],
  // LANGUAGE concepts
  language: [
    'language', 'bhasha', 'bhasa', 'hindi', 'marathi', 'odia', 'english', 'switch',
    'भाषा', 'मराठी', 'हिंदी', 'उड़िया', 'ଭାଷା', 'ଓଡ଼ିଆ'
  ],
  // VERIFICATION concepts
  verification: [
    'verification', 'verify', 'verified', 'kyc', 'approval', 'pending',
    'सत्यापन', 'सत्यापित', 'पडताळणी', 'ଯାଞ୍ଚ'
  ],
  // SUPPORT concepts
  support: [
    'support', 'help', 'customercare', 'helpline', 'care', 'contact', 'grievance',
    'मदद', 'सहायक', 'सपोर्ट', 'मदत', 'ସାହାଯ୍ୟ', 'ସପୋର୍ଟ'
  ],
};

/**
 * Route-to-Intent primary context affinity map
 */
const ROUTE_PRIMARY_INTENTS: Record<string, string> = {
  CollectorEarnings: 'INTENT_VIEW_EARNINGS',
  CollectorTransactions: 'INTENT_PAYMENT_STATUS',
  CollectorPriceBoard: 'INTENT_TODAYS_PRICE',
  CollectorDeals: 'INTENT_VIEW_OFFERS',
  CollectorLots: 'INTENT_MY_LOTS_STATUS',
  CollectorCreateLot: 'INTENT_HOW_TO_CREATE_LOT',
  CollectorSafetyCenter: 'INTENT_SAFETY_BATTERY',
  CollectorDisputes: 'INTENT_REPORT_DISPUTE',
  CollectorProfile: 'INTENT_VERIFICATION_STATUS',
  CitizenRequests: 'INTENT_CITIZEN_REQUESTS_STATUS',
  CitizenSubmit: 'INTENT_CITIZEN_GIVE_EWASTE',
  RecyclerMarket: 'INTENT_MARKETPLACE_BROWSE',
};

/**
 * Text normalization: lowercase and strip punctuation
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[?!.,;:()[\]{}"'\\/`~@#$%^&*_\-+=<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Apply domain phrases on normalized text
 */
export function applyDomainPhrases(text: string): string {
  let res = text;
  for (const [pattern, replacement] of DOMAIN_PHRASES) {
    res = res.replace(pattern, replacement);
  }
  return res;
}

/**
 * Extract meaningful concept tokens (stripping conversational filler)
 */
export function extractCoreTokens(text: string): string[] {
  const norm = applyDomainPhrases(normalizeText(text));
  const tokens = norm.split(' ').filter(Boolean);
  const core = tokens.filter((t) => !FILLER_WORDS.has(t));
  return core.length > 0 ? core : tokens;
}

/**
 * Levenshtein distance for fuzzy typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalized string similarity ratio between 0.0 and 1.0
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Check if a token matches any synonym in a concept bucket
 */
function tokenMatchesConcept(token: string, concept: string): boolean {
  const list = SYNONYM_MAP[concept];
  if (!list) return false;
  return list.some((syn) => syn === token || stringSimilarity(token, syn) > 0.85);
}

/**
 * Confidence Threshold Constants
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,
  MEDIUM: 0.60,
  LOW: 0.40,
  AMBIGUITY_DELTA: 0.08,
};

interface ScoredCandidate {
  intent: SaathiIntent;
  score: number;
  pattern: string;
  method: 'EXACT' | 'KEYWORD' | 'SYNONYM' | 'FUZZY';
}

/**
 * Main matcher function
 */
export function matchEcoSaathiQuery(
  rawQuery: string,
  context?: SaathiMatcherContext
): SaathiMatchResult {
  const query = normalizeText(rawQuery);
  const domainQuery = applyDomainPhrases(query);
  const language: SupportedLanguage = context?.language || DEFAULT_LANGUAGE;
  const userRole = context?.role;
  const currentRoute = context?.currentRoute;

  // Empty query handling
  if (!query) {
    return {
      intentId: null,
      matched: false,
      confidence: 0,
      responseI18nKey: FALLBACK_UNKNOWN_INTENT.responseI18nKey,
      requiresDynamicData: false,
      quickReplies: FALLBACK_UNKNOWN_INTENT.quickReplies,
      safetySensitivity: 'STANDARD',
      matchMethod: 'FALLBACK',
    };
  }

  // Filter intents by applicable role
  const eligibleIntents = ECO_SAATHI_INTENTS.filter((intent) => {
    if (!userRole) return true;
    return intent.applicableRoles.includes('ALL') || intent.applicableRoles.includes(userRole);
  });

  const coreTokens = extractCoreTokens(query);
  const scoredCandidates: ScoredCandidate[] = [];

  for (const intent of eligibleIntents) {
    let intentBestScore = 0;
    let matchedPattern = '';
    let matchMethod: 'EXACT' | 'KEYWORD' | 'SYNONYM' | 'FUZZY' = 'FUZZY';

    // 1. Exact & Substring Trigger Pattern Matching (Primary Language)
    const primaryPatterns = intent.triggerPatterns[language] || [];
    for (const pattern of primaryPatterns) {
      const normPattern = normalizeText(pattern);
      if (query === normPattern || domainQuery === normPattern) {
        intentBestScore = 1.0;
        matchedPattern = normPattern;
        matchMethod = 'EXACT';
        break;
      }

      // Substring check
      if ((query.includes(normPattern) || domainQuery.includes(normPattern)) && normPattern.length > 5) {
        const score = 0.92 + (normPattern.length / Math.max(query.length, 1)) * 0.06;
        if (score > intentBestScore) {
          intentBestScore = score;
          matchedPattern = normPattern;
          matchMethod = 'EXACT';
        }
      }

      // Fuzzy check against trigger phrases
      const sim = Math.max(stringSimilarity(query, normPattern), stringSimilarity(domainQuery, normPattern));
      if (sim > 0.83 && sim > intentBestScore) {
        intentBestScore = sim;
        matchedPattern = normPattern;
        matchMethod = 'FUZZY';
      }
    }

    // Check other languages triggers if primary did not match strongly
    if (intentBestScore < 0.95) {
      const allLangs: SupportedLanguage[] = ['en', 'hi', 'mr', 'or'];
      for (const lang of allLangs) {
        if (lang === language) continue;
        for (const pattern of intent.triggerPatterns[lang] || []) {
          const normPattern = normalizeText(pattern);
          if (query === normPattern || domainQuery === normPattern) {
            if (0.95 > intentBestScore) {
              intentBestScore = 0.95;
              matchedPattern = normPattern;
              matchMethod = 'EXACT';
            }
            break;
          }
          if ((query.includes(normPattern) || domainQuery.includes(normPattern)) && normPattern.length > 5) {
            const score = 0.90;
            if (score > intentBestScore) {
              intentBestScore = score;
              matchedPattern = normPattern;
              matchMethod = 'EXACT';
            }
          }
        }
      }
    }

const GENERIC_MODIFIERS = new Set([
  'today', 'aaj', 'aaji', 'status', 'check', 'view', 'see', 'show', 'new', 'old', 'purana', 'nava', 'dakhva', 'sanga'
]);

    // 2. Keyword & Core Token Overlap
    const allKeywords = Array.from(
      new Set([
        ...(intent.keywords[language] || []),
        ...(intent.keywords.en || []),
        ...(intent.keywords.hi || []),
        ...(intent.keywords.mr || []),
        ...(intent.keywords.or || []),
      ].map(normalizeText))
    ).filter(Boolean);

    const matchedKeywordList: string[] = [];
    for (const kw of allKeywords) {
      if (coreTokens.some((token) => token === kw || stringSimilarity(token, kw) > 0.85)) {
        matchedKeywordList.push(kw);
      }
    }
    const keywordMatches = matchedKeywordList.length;
    const isOnlyGenericModifier = keywordMatches === 1 && GENERIC_MODIFIERS.has(matchedKeywordList[0]);

    if (keywordMatches > 0 && allKeywords.length > 0 && !isOnlyGenericModifier) {
      const coreCoverage = keywordMatches / Math.max(coreTokens.length, 1);
      // Guard against accidental matches on single generic words in general questions
      if (coreCoverage >= 0.5 || keywordMatches >= 2) {
        const keywordScore = 0.60 + coreCoverage * 0.25;
        if (keywordScore > intentBestScore) {
          intentBestScore = Math.min(0.92, keywordScore);
          matchedPattern = allKeywords.slice(0, 3).join(', ');
          matchMethod = 'KEYWORD';
        }
      }
    }

    // 3. Synonym Concept Mapping
    let synonymHits = 0;
    for (const token of coreTokens) {
      if (intent.id === 'INTENT_HOW_TO_CREATE_LOT' && (tokenMatchesConcept(token, 'sell') || tokenMatchesConcept(token, 'lot'))) {
        synonymHits += 2;
      }
      if (intent.id === 'INTENT_TODAYS_PRICE' && tokenMatchesConcept(token, 'price')) {
        synonymHits += 2;
      }
      if (intent.id === 'INTENT_VIEW_EARNINGS' && (tokenMatchesConcept(token, 'earnings') || (tokenMatchesConcept(token, 'payment') && !coreTokens.some(t => t === 'status')))) {
        synonymHits += 2;
      }
      if (intent.id === 'INTENT_PAYMENT_STATUS' && tokenMatchesConcept(token, 'payment')) {
        synonymHits += 2;
      }
      if (intent.id === 'INTENT_VIEW_OFFERS' && tokenMatchesConcept(token, 'offer')) {
        synonymHits += 2;
      }
      if (intent.id === 'INTENT_CITIZEN_GIVE_EWASTE' && (tokenMatchesConcept(token, 'pickup') || token === 'give')) {
        synonymHits += 2;
      }
      if (intent.id === 'INTENT_CITIZEN_REQUESTS_STATUS' && (tokenMatchesConcept(token, 'pickup') && (token === 'status' || token === 'kab' || token === 'where'))) {
        synonymHits += 2;
      }
      if (intent.category === 'SAFETY' && tokenMatchesConcept(token, 'safety')) {
        synonymHits += 2;
      }
    }

    if (synonymHits > 0) {
      const synonymScore = 0.65 + Math.min(0.25, (synonymHits / (coreTokens.length * 2)) * 0.25);
      if (synonymScore > intentBestScore) {
        intentBestScore = Math.min(0.90, synonymScore);
        matchMethod = 'SYNONYM';
        matchedPattern = 'synonym_concept_match';
      }
    }

    // 4. Route Context Boosting
    if (currentRoute && ROUTE_PRIMARY_INTENTS[currentRoute] === intent.id) {
      intentBestScore += 0.15;
    }

    // 5. Role Affinity Adjustment
    if (userRole && intent.applicableRoles.includes(userRole)) {
      intentBestScore += 0.02;
    }

    if (intentBestScore >= CONFIDENCE_THRESHOLDS.LOW) {
      scoredCandidates.push({
        intent,
        score: Math.min(1.0, intentBestScore),
        pattern: matchedPattern,
        method: matchMethod,
      });
    }
  }

  // Sort candidates by descending score
  scoredCandidates.sort((a, b) => b.score - a.score);

  if (scoredCandidates.length === 0) {
    return {
      intentId: null,
      matched: false,
      confidence: 0,
      responseI18nKey: FALLBACK_UNKNOWN_INTENT.responseI18nKey,
      requiresDynamicData: false,
      quickReplies: FALLBACK_UNKNOWN_INTENT.quickReplies,
      safetySensitivity: 'STANDARD',
      matchMethod: 'FALLBACK',
    };
  }

  const top = scoredCandidates[0];

  // Check Ambiguity: if top 2 candidates have close scores (difference <= 0.08) and medium confidence without a decisive route match
  if (
    scoredCandidates.length >= 2 &&
    top.score >= CONFIDENCE_THRESHOLDS.MEDIUM &&
    top.score < 0.92 &&
    top.score - scoredCandidates[1].score <= CONFIDENCE_THRESHOLDS.AMBIGUITY_DELTA &&
    top.intent.id !== scoredCandidates[1].intent.id &&
    (!currentRoute || !ROUTE_PRIMARY_INTENTS[currentRoute])
  ) {
    const second = scoredCandidates[1];
    const clarificationOptions: SaathiClarificationOption[] = [
      {
        intentId: top.intent.id,
        labelI18nKey: top.intent.responseI18nKey,
        query: top.intent.triggerPatterns[language]?.[0] || top.intent.triggerPatterns.en[0],
      },
      {
        intentId: second.intent.id,
        labelI18nKey: second.intent.responseI18nKey,
        query: second.intent.triggerPatterns[language]?.[0] || second.intent.triggerPatterns.en[0],
      },
    ];

    return {
      intentId: top.intent.id,
      matched: true,
      confidence: Number(top.score.toFixed(3)),
      category: top.intent.category,
      responseI18nKey: 'saathi.clarification_prompt',
      requiresDynamicData: false,
      quickReplies: [top.intent.id, second.intent.id],
      safetySensitivity: 'STANDARD',
      matchMethod: 'CLARIFICATION',
      isAmbiguous: true,
      clarificationOptions,
    };
  }

  // Accept top candidate if >= MEDIUM threshold (0.60)
  if (top.score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return buildResult(top.intent, Number(top.score.toFixed(3)), top.pattern, top.method);
  }

  // Fallback to unknown
  return {
    intentId: null,
    matched: false,
    confidence: Number(top.score.toFixed(3)),
    responseI18nKey: FALLBACK_UNKNOWN_INTENT.responseI18nKey,
    requiresDynamicData: false,
    quickReplies: FALLBACK_UNKNOWN_INTENT.quickReplies,
    safetySensitivity: 'STANDARD',
    matchMethod: 'FALLBACK',
  };
}

function buildResult(
  intent: SaathiIntent,
  confidence: number,
  pattern: string,
  method: 'EXACT' | 'KEYWORD' | 'SYNONYM' | 'FUZZY' | 'CLARIFICATION' | 'FALLBACK'
): SaathiMatchResult {
  return {
    intentId: intent.id,
    matched: true,
    confidence,
    category: intent.category,
    responseI18nKey: intent.responseI18nKey,
    suggestedAction: intent.suggestedAction,
    requiresDynamicData: intent.requiresDynamicData,
    dynamicDataResolverKey: intent.dynamicDataResolverKey,
    quickReplies: intent.quickReplies,
    safetySensitivity: intent.safetySensitivity,
    matchedPattern: pattern,
    matchMethod: method,
  };
}
