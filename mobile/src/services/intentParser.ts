/**
 * intentParser.ts
 * Deterministic, on-device Intent Parser for ECOSETU Informal Collector Voice Commands.
 *
 * Operational Model:
 * - Pure rule-based parsing (zero LLM/cloud dependency, zero external API costs).
 * - Multi-language support: English (en), Hindi (hi), Marathi (mr), Odia (or).
 * - Categorizes into NAVIGATION, READ, and WORKFLOW.
 * - Enforces explicit confirmation for state-changing operations.
 * - Normalizes speech transcripts (punctuation, whitespace, casing).
 */

export type CollectorIntentCategory = 'NAVIGATION' | 'READ' | 'WORKFLOW' | 'UNKNOWN';

export type CollectorIntent =
  // Navigation
  | 'NAVIGATE_DASHBOARD'
  | 'NAVIGATE_REQUESTS'
  | 'NAVIGATE_PICKUPS'
  | 'NAVIGATE_CONSIGNMENTS'
  | 'NAVIGATE_RECYCLERS'
  | 'NAVIGATE_PROFILE'
  // Read / Audio Guidance
  | 'READ_AVAILABLE_REQUESTS'
  | 'READ_MY_PICKUPS'
  | 'READ_MY_CONSIGNMENTS'
  | 'READ_NEARBY_RECYCLERS'
  | 'READ_COLLECTOR_STATS'
  // Workflow Actions
  | 'WORKFLOW_ACCEPT_REQUEST'
  | 'WORKFLOW_START_PICKUP'
  | 'WORKFLOW_COMPLETE_PICKUP'
  | 'WORKFLOW_DELIVER_CONSIGNMENT'
  | 'WORKFLOW_OPEN_REQUEST'
  | 'WORKFLOW_OPEN_PICKUP'
  | 'WORKFLOW_OPEN_CONSIGNMENT'
  // Fallback
  | 'UNKNOWN';

export interface IntentResult {
  intent: CollectorIntent;
  confidence: number;
  category: CollectorIntentCategory;
  rawTranscript: string;
  normalizedText: string;
  requiresConfirmation: boolean;
  targetEntity?: 'REQUEST' | 'PICKUP' | 'CONSIGNMENT' | 'RECYCLER' | null;
  parameters?: Record<string, any>;
}

/**
 * Normalizes speech recognition transcripts for deterministic parsing
 */
export function normalizeTranscript(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\.\,\?\!\;\:\"\'\-\_\/\\।]/g, ' ')
    .replace(/\bpick\s+up\b/g, 'pickup')
    .replace(/\bcompleted\b/g, 'complete')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rule definitions mapping intent to multilingual phrase patterns
 */
interface IntentRule {
  intent: CollectorIntent;
  category: CollectorIntentCategory;
  requiresConfirmation: boolean;
  targetEntity?: 'REQUEST' | 'PICKUP' | 'CONSIGNMENT' | 'RECYCLER' | null;
  patterns: {
    en: string[];
    hi: string[];
    mr: string[];
    or: string[];
  };
}

const INTENT_RULES: IntentRule[] = [
  // ─── 1. Navigation Intents ──────────────────────────────────────────────────
  {
    intent: 'NAVIGATE_DASHBOARD',
    category: 'NAVIGATION',
    requiresConfirmation: false,
    patterns: {
      en: ['dashboard', 'home', 'open dashboard', 'go to dashboard', 'show dashboard', 'go home'],
      hi: ['डैशबोर्ड', 'डैशबोर्ड खोलो', 'होम खोलो', 'होम', 'डैशबोर्ड दिखाओ', 'मुख्यपृष्ठ'],
      mr: ['डॅशबोर्ड', 'डॅशबोर्ड उघडा', 'मुख्यपृष्ठ', 'होम उघडा', 'डॅशबोर्ड दाखवा'],
      or: ['ଡ୍ୟାସବୋର୍ଡ', 'ଡ୍ୟାସବୋର୍ଡ ଖୋଲ', 'ମୁଖ୍ୟପୃଷ୍ଠା', 'ହୋମ ଖୋଲ', 'ଡ୍ୟାସବୋର୍ଡ ଦେଖାଅ'],
    },
  },
  {
    intent: 'NAVIGATE_REQUESTS',
    category: 'NAVIGATION',
    requiresConfirmation: false,
    patterns: {
      en: ['requests', 'browse', 'open requests', 'browse requests', 'available requests', 'show requests', 'show available requests'],
      hi: ['अनुरोध', 'अनुरोध खोलो', 'अनुरोध दिखाओ', 'उपलब्ध अनुरोध', 'ब्राउज़ खोलो', 'उपलब्ध अनुरोध दिखाओ'],
      mr: ['विनंत्या', 'विनंत्या उघडा', 'विनंत्या दाखवा', 'उपलब्ध विनंत्या', 'ब्राउझ'],
      or: ['ଅନୁରୋଧ', 'ଅନୁରୋଧ ଖୋଲ', 'ଅନୁରୋଧ ଦେଖାଅ', 'ଉପଲବ୍ଧ ଅନୁରୋଧ', 'ବ୍ରାଉଜ'],
    },
  },
  {
    intent: 'NAVIGATE_PICKUPS',
    category: 'NAVIGATION',
    requiresConfirmation: false,
    patterns: {
      en: ['pickups', 'my pickups', 'open pickups', 'show pickups', 'manage pickups', 'show my pickups', 'view pickups'],
      hi: ['पिकअप', 'पिकअप खोलो', 'मेरे पिकअप', 'पिकअप दिखाओ', 'मेरे पिकअप दिखाओ'],
      mr: ['पिकअप', 'पिकअप उघडा', 'माझे पिकअप', 'पिकअप दाखवा'],
      or: ['ପିକଅପ', 'ପିକଅପ ଖୋଲ', 'ମୋ ପିକଅପ', 'ପିକଅପ ଦେଖାଅ'],
    },
  },
  {
    intent: 'NAVIGATE_CONSIGNMENTS',
    category: 'NAVIGATION',
    requiresConfirmation: false,
    patterns: {
      en: ['consignments', 'open consignments', 'my consignments', 'show consignments', 'view consignments'],
      hi: ['कंसाइनमेंट', 'कंसाइनमेंट खोलो', 'मेरे कंसाइनमेंट', 'कंसाइनमेंट दिखाओ'],
      mr: ['कंसाइनमेंट', 'कंसाइनमेंट उघडा', 'माझे कंसाइनमेंट', 'कंसाइनमेंट दाखवा'],
      or: ['କନସାଇନମେଣ୍ଟ', 'କନସାଇନମେଣ୍ଟ ଖୋଲ', 'ମୋ କନସାଇନମେଣ୍ଟ', 'କନସାଇନମେଣ୍ଟ ଦେଖାଅ'],
    },
  },
  {
    intent: 'NAVIGATE_RECYCLERS',
    category: 'NAVIGATION',
    requiresConfirmation: false,
    patterns: {
      en: ['recyclers', 'open recyclers', 'recycler directory', 'facilities', 'show recyclers', 'nearby recyclers'],
      hi: ['रीसाइक्लर', 'रीसाइक्लर खोलो', 'रीसाइक्लर निर्देशिका', 'सुविधाएं', 'रीसाइक्लर दिखाओ'],
      mr: ['पुनर्वापरकर्ते', 'पुनर्वापरकर्ते उघडा', 'पुनर्वापर निर्देशिका', 'पुनर्वापर केंद्र'],
      or: ['ପୁନଃଚକ୍ରଣକାରୀ', 'ପୁନଃଚକ୍ରଣକାରୀ ଖୋଲ', 'ପୁନଃଚକ୍ରଣକାରୀ ତାଲିକା'],
    },
  },
  {
    intent: 'NAVIGATE_PROFILE',
    category: 'NAVIGATION',
    requiresConfirmation: false,
    patterns: {
      en: ['profile', 'open profile', 'my profile', 'settings', 'collector profile'],
      hi: ['प्रोफ़ाइल', 'प्रोफ़ाइल खोलो', 'मेरी प्रोफ़ाइल'],
      mr: ['प्रोफाइल', 'प्रोफाइल उघडा', 'माझी प्रोफाइल'],
      or: ['ପ୍ରୋଫାଇଲ', 'ପ୍ରୋଫାଇଲ ଖୋଲ', 'ମୋ ପ୍ରୋଫାଇଲ'],
    },
  },

  // ─── 2. Read / Audio Guidance Intents ────────────────────────────────────────
  {
    intent: 'READ_AVAILABLE_REQUESTS',
    category: 'READ',
    requiresConfirmation: false,
    targetEntity: 'REQUEST',
    patterns: {
      en: ['read available requests', 'read requests', 'speak requests', 'what requests are available', 'read my requests'],
      hi: ['उपलब्ध अनुरोध पढ़ो', 'अनुरोध पढ़ो', 'अनुरोध सुनाओ', 'उपलब्ध अनुरोध बताओ'],
      mr: ['उपलब्ध विनंत्या वाचा', 'विनंत्या वाचा', 'विनंत्या सांगा'],
      or: ['ଉପଲବ୍ଧ ଅନୁରୋଧ ପଢ', 'ଅନୁରୋଧ ପଢ', 'ଅନୁରୋଧ କୁହ'],
    },
  },
  {
    intent: 'READ_MY_PICKUPS',
    category: 'READ',
    requiresConfirmation: false,
    targetEntity: 'PICKUP',
    patterns: {
      en: ['read my pickups', 'read pickups', 'speak pickups', 'what pickups do i have', 'read pickup list'],
      hi: ['मेरे पिकअप पढ़ो', 'पिकअप पढ़ो', 'पिकअप सुनाओ', 'पिकअप बताओ'],
      mr: ['माझे पिकअप वाचा', 'पिकअप वाचा', 'पिकअप सांगा'],
      or: ['ମୋ ପିକଅପ ପଢ', 'ପିକଅପ ପଢ', 'ପିକଅପ କୁହ'],
    },
  },
  {
    intent: 'READ_MY_CONSIGNMENTS',
    category: 'READ',
    requiresConfirmation: false,
    targetEntity: 'CONSIGNMENT',
    patterns: {
      en: ['read my consignments', 'read consignments', 'speak consignments', 'what consignments do i have'],
      hi: ['मेरे कंसाइनमेंट पढ़ो', 'कंसाइनमेंट पढ़ो', 'कंसाइनमेंट सुनाओ'],
      mr: ['माझे कंसाइनमेंट वाचा', 'कंसाइनमेंट वाचा'],
      or: ['ମୋ କନସାଇନମେଣ୍ଟ ପଢ', 'କନସାଇନମେଣ୍ଟ ପଢ'],
    },
  },
  {
    intent: 'READ_NEARBY_RECYCLERS',
    category: 'READ',
    requiresConfirmation: false,
    targetEntity: 'RECYCLER',
    patterns: {
      en: ['read nearby recyclers', 'read recyclers', 'speak recyclers', 'what recyclers are nearby'],
      hi: ['रीसाइक्लर पढ़ो', 'आसपास के रीसाइक्लर पढ़ो', 'रीसाइक्लर सुनाओ'],
      mr: ['पुनर्वापरकर्ते वाचा', 'जवळचे पुनर्वापरकर्ते वाचा'],
      or: ['ପୁନଃଚକ୍ରଣକାରୀ ପଢ', 'ପାଖ ପୁନଃଚକ୍ରଣକାରୀ ପଢ'],
    },
  },
  {
    intent: 'READ_COLLECTOR_STATS',
    category: 'READ',
    requiresConfirmation: false,
    patterns: {
      en: ['read my stats', 'read stats', 'read collector stats', 'read my performance', 'how much did i collect'],
      hi: ['मेरे आंकड़े पढ़ो', 'आंकड़े पढ़ो', 'मेरी गतिविधि पढ़ो', 'कितना संग्रह किया'],
      mr: ['माझी कामगिरी वाचा', 'कामगिरी वाचा', 'आकडेवारी वाचा'],
      or: ['ମୋ ପରିସଂଖ୍ୟାନ ପଢ', 'ପରିସଂଖ୍ୟାନ ପଢ', 'କାର୍ଯ୍ୟକଳାପ ପଢ'],
    },
  },

  // ─── 3. Workflow Actions (State-Changing & Context-Gated) ───────────────────
  {
    intent: 'WORKFLOW_ACCEPT_REQUEST',
    category: 'WORKFLOW',
    requiresConfirmation: true,
    targetEntity: 'REQUEST',
    patterns: {
      en: ['accept request', 'accept this request', 'accept selected request', 'accept the request', 'accept'],
      hi: ['अनुरोध स्वीकार करो', 'यह अनुरोध स्वीकार करो', 'अनुरोध स्वीकार करें', 'स्वीकार करो', 'रिक्वेस्ट एक्सेप्ट करो', 'एक्सेप्ट करो'],
      mr: ['विनंती स्वीकारा', 'ही विनंती स्वीकारा', 'स्वीकारा'],
      or: ['ଅନୁରୋଧ ଗ୍ରହଣ କର', 'ଏହି ଅନୁରୋଧ ଗ୍ରହଣ କର', 'ଗ୍ରହଣ କର'],
    },
  },
  {
    intent: 'WORKFLOW_START_PICKUP',
    category: 'WORKFLOW',
    requiresConfirmation: true,
    targetEntity: 'PICKUP',
    patterns: {
      en: ['start pickup', 'start this pickup', 'start selected pickup', 'begin pickup', 'start this pick up'],
      hi: ['पिकअप शुरू करो', 'पिकअप प्रारंभ करो', 'यह पिकअप शुरू करो', 'शुरू करो', 'pickup shuru karo', 'पिकअप स्टार्ट करो'],
      mr: ['पिकअप सुरू करा', 'हा पिकअप सुरू करा', 'सुरू करा'],
      or: ['ପିକଅପ ଆରମ୍ଭ କର', 'ଏହି ପିକଅପ ଆରମ୍ଭ କର', 'ଆରମ୍ଭ କର'],
    },
  },
  {
    intent: 'WORKFLOW_COMPLETE_PICKUP',
    category: 'WORKFLOW',
    requiresConfirmation: true,
    targetEntity: 'PICKUP',
    patterns: {
      en: [
        'complete pickup',
        'complete this pickup',
        'finish pickup',
        'complete selected pickup',
        'mark this pickup completed',
        'mark this pickup complete',
        'finish this pickup now',
        'finish this pickup',
        'complete pickup now',
        'mark pickup completed',
        'mark pickup complete',
        'mark this pick up completed',
        'mark this pick up complete',
        'done pickup',
      ],
      hi: [
        'पिकअप पूरा करो',
        'पिकअप समाप्त करो',
        'यह पिकअप पूरा करो',
        'पूरा करो',
        'pickup complete karo',
        'ye pickup complete karo',
        'pickup khatam karo',
        'पिकअप खत्म करो',
        'पिकअप कम्पलीट करो',
      ],
      mr: ['पिकअप पूर्ण करा', 'हा पिकअप पूर्ण करा', 'पूर्ण करा', 'पिकअप संपवा'],
      or: ['ପିକଅପ ସମ୍ପୂର୍ଣ୍ଣ କର', 'ଏହି ପିକଅପ ସମ୍ପୂର୍ଣ୍ଣ କର', 'ସମ୍ପୂର୍ଣ୍ଣ କର', 'ପିକଅପ ଶେଷ କର'],
    },
  },
  {
    intent: 'WORKFLOW_DELIVER_CONSIGNMENT',
    category: 'WORKFLOW',
    requiresConfirmation: true,
    targetEntity: 'CONSIGNMENT',
    patterns: {
      en: ['deliver consignment', 'deliver this consignment', 'drop off consignment', 'mark consignment delivered'],
      hi: ['कंसाइनमेंट डिलीवर करो', 'कंसाइनमेंट जमा करो', 'कंसाइनमेंट पहुंचाओ'],
      mr: ['कंसाइनमेंट वितरित करा', 'कंसाइनमेंट जमा करा'],
      or: ['କନସାଇନମେଣ୍ଟ ପ୍ରଦାନ କର', 'କନସାଇନମେଣ୍ଟ ଜମା କର'],
    },
  },
  {
    intent: 'WORKFLOW_OPEN_REQUEST',
    category: 'WORKFLOW',
    requiresConfirmation: false,
    targetEntity: 'REQUEST',
    patterns: {
      en: ['open selected request', 'open request details', 'view request', 'open this request'],
      hi: ['अनुरोध विवरण खोलो', 'यह अनुरोध खोलो'],
      mr: ['विनंती तपशील उघडा', 'ही विनंती उघडा'],
      or: ['ଅନୁରୋଧ ବିବରଣୀ ଖୋଲ', 'ଏହି ଅନୁରୋଧ ଖୋଲ'],
    },
  },
  {
    intent: 'WORKFLOW_OPEN_PICKUP',
    category: 'WORKFLOW',
    requiresConfirmation: false,
    targetEntity: 'PICKUP',
    patterns: {
      en: ['open selected pickup', 'open pickup details', 'view pickup', 'open this pickup'],
      hi: ['पिकअप विवरण खोलो', 'यह पिकअप खोलो'],
      mr: ['पिकअप तपशील उघडा', 'हा पिकअप उघडा'],
      or: ['ପିକଅପ ବିବରଣୀ ଖୋଲ', 'ଏହି ପିକଅପ ଖୋଲ'],
    },
  },
  {
    intent: 'WORKFLOW_OPEN_CONSIGNMENT',
    category: 'WORKFLOW',
    requiresConfirmation: false,
    targetEntity: 'CONSIGNMENT',
    patterns: {
      en: ['open selected consignment', 'open consignment details', 'view consignment', 'open this consignment'],
      hi: ['कंसाइनमेंट विवरण खोलो', 'यह कंसाइनमेंट खोलो'],
      mr: ['कंसाइनमेंट तपशील उघडा'],
      or: ['କନସାଇନମେଣ୍ଟ ବିବରଣୀ ଖୋଲ'],
    },
  },
];

/**
 * Deterministically parses a normalized transcript into a recognized CollectorIntent
 */
export function parseIntent(transcript: string, activeLanguage: string = 'en'): IntentResult {
  const normalized = normalizeTranscript(transcript);

  if (!normalized) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      category: 'UNKNOWN',
      rawTranscript: transcript,
      normalizedText: normalized,
      requiresConfirmation: false,
      targetEntity: null,
    };
  }

  const langKey = (['hi', 'mr', 'or'].includes(activeLanguage.toLowerCase())
    ? activeLanguage.toLowerCase()
    : 'en') as 'en' | 'hi' | 'mr' | 'or';

  // 1. Exact or Prefix Pattern Match
  for (const rule of INTENT_RULES) {
    const activePatterns = rule.patterns[langKey] || [];
    const otherPatterns = (Object.entries(rule.patterns) as [string, string[]][])
      .filter(([k]) => k !== langKey)
      .flatMap(([_, list]) => list);
    const allPatterns = [...activePatterns, ...otherPatterns];

    for (const pattern of allPatterns) {
      const normPattern = normalizeTranscript(pattern);
      if (normalized === normPattern) {
        return {
          intent: rule.intent,
          confidence: 1.0,
          category: rule.category,
          rawTranscript: transcript,
          normalizedText: normalized,
          requiresConfirmation: rule.requiresConfirmation,
          targetEntity: rule.targetEntity || null,
        };
      }
    }
  }

  // 2. Substring / Keyword Match (e.g. "please open pickups")
  let bestMatch: IntentRule | null = null;
  let maxPatternLen = 0;

  for (const rule of INTENT_RULES) {
    const activePatterns = rule.patterns[langKey] || [];
    const otherPatterns = (Object.entries(rule.patterns) as [string, string[]][])
      .filter(([k]) => k !== langKey)
      .flatMap(([_, list]) => list);
    const allPatterns = [...activePatterns, ...otherPatterns];

    for (const pattern of allPatterns) {
      const normPattern = normalizeTranscript(pattern);
      if (normPattern.length > 2 && normalized.includes(normPattern)) {
        if (normPattern.length > maxPatternLen) {
          maxPatternLen = normPattern.length;
          bestMatch = rule;
        }
      }
    }
  }

  if (bestMatch) {
    return {
      intent: bestMatch.intent,
      confidence: 0.85,
      category: bestMatch.category,
      rawTranscript: transcript,
      normalizedText: normalized,
      requiresConfirmation: bestMatch.requiresConfirmation,
      targetEntity: bestMatch.targetEntity || null,
    };
  }

  return {
    intent: 'UNKNOWN',
    confidence: 0,
    category: 'UNKNOWN',
    rawTranscript: transcript,
    normalizedText: normalized,
    requiresConfirmation: false,
    targetEntity: null,
  };
}
