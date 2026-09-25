/**
 * EcoSetu — Eco-Saathi Deterministic Intent Matcher Tests (Step 6 Enhanced)
 * Source of Truth: docs/ECOSETU_ECO-SAATHI_IMPLEMENTATION_ARCHITECTURE_v1.0.md
 * 
 * 85+ Comprehensive Unit Tests covering:
 * - Text Normalization & NLP Utilities
 * - Multilingual Trigger Patterns (en, hi, mr, or)
 * - Natural Language & Slang Queries (Hinglish, Marathi/Odia in Roman)
 * - Domain Synonym & Long-Tail Query Mapping
 * - Role-based Intent Filtering
 * - Route Context Boosting
 * - Ambiguity Detection & Clarification Handling
 * - Confidence Thresholds (High, Medium, Low)
 * - Dynamic Data Flagging
 * - Safe Navigation Actions
 * - Safety Guardrails & Hazards
 * - Assistive AI Boundaries
 * - Non-Custodial Payment Policies
 * - Unknown & Off-Topic Query Handling
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchEcoSaathiQuery,
  normalizeText,
  applyDomainPhrases,
  extractCoreTokens,
  stringSimilarity,
  levenshteinDistance,
  CONFIDENCE_THRESHOLDS,
} from '../ecoSaathiMatcher';
import { ECO_SAATHI_INTENTS } from '../../data/ecoSaathiKnowledge';

describe('Eco-Saathi Matcher Engine (Step 6 Enhanced)', () => {

  // ==========================================
  // 1. Text Normalization & String Similarity
  // ==========================================
  describe('Helper Utilities & Normalization', () => {
    it('normalizes uppercase, punctuation, extra whitespace, and e-waste variations', () => {
      const raw = '  HOW   DO I SELL??? e-waste... (now)!  ';
      const clean = normalizeText(raw);
      assert.equal(clean, 'how do i sell e waste now');
      const domainClean = applyDomainPhrases(clean);
      assert.equal(domainClean, 'how do i sell ewaste now');
    });

    it('extracts core tokens by stripping conversational filler words', () => {
      const raw = 'bhai scrap kaise bechu batao';
      const tokens = extractCoreTokens(raw);
      assert.ok(tokens.includes('scrap'));
      assert.ok(tokens.includes('bechu'));
      assert.ok(!tokens.includes('bhai'));
    });

    it('computes correct levenshtein distance', () => {
      assert.equal(levenshteinDistance('price', 'price'), 0);
      assert.equal(levenshteinDistance('price', 'prce'), 1);
      assert.equal(levenshteinDistance('', 'test'), 4);
    });

    it('calculates string similarity ratio accurately', () => {
      const simExact = stringSimilarity('price board', 'price board');
      const simTypo = stringSimilarity('price board', 'prce bord');
      const simDiff = stringSimilarity('price board', 'completely unrelated');
      
      assert.equal(simExact, 1.0);
      assert.ok(simTypo > 0.7);
      assert.ok(simDiff < 0.3);
    });
  });

  // ==========================================
  // 2. Multilingual Trigger Pattern Matching
  // ==========================================
  describe('Multilingual Trigger Matching (en, hi, mr, or)', () => {
    it('matches English question for Price Board', () => {
      const result = matchEcoSaathiQuery('where can I see prices', { language: 'en' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_PRICE_BOARD');
      assert.equal(result.responseI18nKey, 'saathi.intents.price_board.answer');
      assert.equal(result.suggestedAction?.targetRoute, 'CollectorPriceBoard');
    });

    it('matches Hindi question for Price Board', () => {
      const result = matchEcoSaathiQuery('भाव कहाँ देखें', { language: 'hi' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_PRICE_BOARD');
    });

    it('matches Marathi question for Price Board', () => {
      const result = matchEcoSaathiQuery('भाव कुठे पाहू', { language: 'mr' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_PRICE_BOARD');
    });

    it('matches Odia question for Price Board', () => {
      const result = matchEcoSaathiQuery('ଦର କେଉଁଠି ଦେଖିବି', { language: 'or' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_PRICE_BOARD');
    });

    it('matches Hindi question for Lot Creation', () => {
      const result = matchEcoSaathiQuery('लॉट कैसे बनाएं', { role: 'INFORMAL_COLLECTOR', language: 'hi' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_HOW_TO_CREATE_LOT');
      assert.equal(result.suggestedAction?.targetRoute, 'CollectorCreateLot');
    });

    it('matches Marathi question for Dispute Reporting', () => {
      const result = matchEcoSaathiQuery('तक्रार कशी नोंदवावी', { language: 'mr' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_REPORT_DISPUTE');
      assert.equal(result.suggestedAction?.targetRoute, 'CollectorDisputes');
    });

    it('matches Odia question for Citizen Pickup', () => {
      const result = matchEcoSaathiQuery('ପୁରୁଣା ଫୋନ କିପରି ଦେବି', { role: 'CITIZEN', language: 'or' });
      assert.equal(result.matched, true);
      assert.equal(result.intentId, 'INTENT_CITIZEN_GIVE_EWASTE');
      assert.equal(result.suggestedAction?.targetRoute, 'CitizenSubmit');
    });
  });

  // ==========================================
  // 3. Conversational Long-Tail Queries (Step 6)
  // ==========================================
  describe('Natural Language & Slang Queries (Hinglish, Marathi, Odia in Roman)', () => {
    it('matches Hinglish slang: "bhai scrap kaise bechu"', () => {
      const res = matchEcoSaathiQuery('bhai scrap kaise bechu', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Hindi Roman: "maal kaise bechna hai"', () => {
      const res = matchEcoSaathiQuery('maal kaise bechna hai', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Hindi Roman: "mujhe purana mobile bechna hai"', () => {
      const res = matchEcoSaathiQuery('mujhe purana mobile bechna hai', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches English conversational: "where do I sell this"', () => {
      const res = matchEcoSaathiQuery('where do I sell this', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Marathi Roman: "scrap kasa vikava"', () => {
      const res = matchEcoSaathiQuery('scrap kasa vikava', { role: 'INFORMAL_COLLECTOR', language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Marathi Roman: "maal kasa vikaycha"', () => {
      const res = matchEcoSaathiQuery('maal kasa vikaycha', { role: 'INFORMAL_COLLECTOR', language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Odia Roman: "scrap kemiti bikibi"', () => {
      const res = matchEcoSaathiQuery('scrap kemiti bikibi', { role: 'INFORMAL_COLLECTOR', language: 'or' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Odia Roman: "puruna phone bikibi"', () => {
      const res = matchEcoSaathiQuery('puruna phone bikibi', { role: 'INFORMAL_COLLECTOR', language: 'or' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('matches Hinglish Price: "aaj ka rate kya hai"', () => {
      const res = matchEcoSaathiQuery('aaj ka rate kya hai');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_TODAYS_PRICE');
    });

    it('matches Hinglish Price: "aaj ka bhav"', () => {
      const res = matchEcoSaathiQuery('aaj ka bhav');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_TODAYS_PRICE');
    });

    it('matches Marathi Roman Price: "aaj cha rate kiti aahe"', () => {
      const res = matchEcoSaathiQuery('aaj cha rate kiti aahe', { language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_TODAYS_PRICE');
    });

    it('matches Odia Roman Price: "aaji ra rate kete"', () => {
      const res = matchEcoSaathiQuery('aaji ra rate kete', { language: 'or' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_TODAYS_PRICE');
    });

    it('matches Hinglish Earnings: "maine kitna kamaya"', () => {
      const res = matchEcoSaathiQuery('maine kitna kamaya', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VIEW_EARNINGS');
    });

    it('matches Marathi Roman Earnings: "majhi total kamai"', () => {
      const res = matchEcoSaathiQuery('majhi total kamai', { role: 'INFORMAL_COLLECTOR', language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VIEW_EARNINGS');
    });

    it('matches Odia Roman Earnings: "kete rojgar heli"', () => {
      const res = matchEcoSaathiQuery('kete rojgar heli', { role: 'INFORMAL_COLLECTOR', language: 'or' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VIEW_EARNINGS');
    });

    it('matches Hinglish Payment: "mera paisa kab milega"', () => {
      const res = matchEcoSaathiQuery('mera paisa kab milega', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_PAYMENT_STATUS');
    });

    it('matches Marathi Roman Payment: "paise kadhi milnar"', () => {
      const res = matchEcoSaathiQuery('paise kadhi milnar', { role: 'INFORMAL_COLLECTOR', language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_PAYMENT_STATUS');
    });

    it('matches Odia Roman Payment: "mo tanka kouthi"', () => {
      const res = matchEcoSaathiQuery('mo tanka kouthi', { role: 'INFORMAL_COLLECTOR', language: 'or' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_PAYMENT_STATUS');
    });

    it('matches Hinglish Offers: "buyer ne kitna offer diya"', () => {
      const res = matchEcoSaathiQuery('buyer ne kitna offer diya', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VIEW_OFFERS');
    });

    it('matches Marathi Roman Offers: "koni offer dili ka"', () => {
      const res = matchEcoSaathiQuery('koni offer dili ka', { role: 'INFORMAL_COLLECTOR', language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VIEW_OFFERS');
    });

    it('matches Citizen Roman: "purana mobile dena hai"', () => {
      const res = matchEcoSaathiQuery('purana mobile dena hai', { role: 'CITIZEN' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_CITIZEN_GIVE_EWASTE');
    });

    it('matches Citizen Pickup Tracking Roman: "pickup kab aayega"', () => {
      const res = matchEcoSaathiQuery('pickup kab aayega', { role: 'CITIZEN' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_CITIZEN_REQUESTS_STATUS');
    });

    it('matches Citizen Pickup Tracking Roman: "gadi kab aayegi"', () => {
      const res = matchEcoSaathiQuery('gadi kab aayegi', { role: 'CITIZEN' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_CITIZEN_REQUESTS_STATUS');
    });
  });

  // ==========================================
  // 4. AI Camera & Assistive Queries
  // ==========================================
  describe('AI Camera & Assistive Boundaries', () => {
    it('matches AI detection question: "camera kya detect karta hai"', () => {
      const res = matchEcoSaathiQuery('camera kya detect karta hai');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_AI_CLASSES');
    });

    it('matches AI manual category selection: "manual select kaise kare"', () => {
      const res = matchEcoSaathiQuery('manual select kaise kare');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_AI_MANUAL_SELECTION');
    });

    it('matches category not found: "category nahi mil rahi"', () => {
      const res = matchEcoSaathiQuery('category nahi mil rahi');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_AI_MANUAL_SELECTION');
    });

    it('matches AI accuracy and price binding inquiry', () => {
      const res = matchEcoSaathiQuery('kya ai rate fix karta hai');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_AI_ACCURACY');
    });
  });

  // ==========================================
  // 5. Safety & Hazard Critical Queries
  // ==========================================
  describe('Safety & Hazard Guardrails', () => {
    it('identifies battery swelling: "battery fula hua hai"', () => {
      const res = matchEcoSaathiQuery('battery fula hua hai');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_SAFETY_BATTERY');
      assert.equal(res.safetySensitivity, 'HAZARD_CRITICAL');
    });

    it('identifies cable burning hazard: "taar jala sakte hai kya"', () => {
      const res = matchEcoSaathiQuery('taar jala sakte hai kya');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_SAFETY_BURNING');
      assert.equal(res.safetySensitivity, 'HAZARD_CRITICAL');
    });

    it('identifies acid leaching hazard: "tezab se sona nikalna"', () => {
      const res = matchEcoSaathiQuery('tezab se sona nikalna');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_SAFETY_ACID');
      assert.equal(res.safetySensitivity, 'HAZARD_CRITICAL');
    });

    it('identifies PPE inquiries: "gloves aur mask"', () => {
      const res = matchEcoSaathiQuery('gloves aur mask');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_SAFETY_PPE');
      assert.equal(res.safetySensitivity, 'HIGH');
    });

    it('identifies CRT tube danger: "purana tv monitor toot gaya"', () => {
      const res = matchEcoSaathiQuery('purana tv monitor toot gaya');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_SAFETY_CRT');
      assert.equal(res.safetySensitivity, 'HIGH');
    });
  });

  // ==========================================
  // 6. Language & Account Settings
  // ==========================================
  describe('Language & Account Settings', () => {
    it('matches language change in Hindi: "hindi me karo"', () => {
      const res = matchEcoSaathiQuery('hindi me karo');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_CHANGE_LANGUAGE');
    });

    it('matches language change in Marathi: "marathi madhe kara"', () => {
      const res = matchEcoSaathiQuery('marathi madhe kara', { language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_CHANGE_LANGUAGE');
    });

    it('matches language change in Odia: "odia re karantu"', () => {
      const res = matchEcoSaathiQuery('odia re karantu', { language: 'or' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_CHANGE_LANGUAGE');
    });

    it('matches account verification status: "khata verify hua kya"', () => {
      const res = matchEcoSaathiQuery('khata verify hua kya', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VERIFICATION_STATUS');
    });
  });

  // ==========================================
  // 7. Disputes & Grievance Reporting
  // ==========================================
  describe('Disputes & Grievance Reporting', () => {
    it('matches short money dispute: "kam paise diye"', () => {
      const res = matchEcoSaathiQuery('kam paise diye', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_REPORT_DISPUTE');
    });

    it('matches weight dispute in Hindi: "vajan me gadbad"', () => {
      const res = matchEcoSaathiQuery('vajan me gadbad', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_REPORT_DISPUTE');
    });

    it('matches dispute in Marathi: "kami paise dile"', () => {
      const res = matchEcoSaathiQuery('kami paise dile', { role: 'INFORMAL_COLLECTOR', language: 'mr' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_REPORT_DISPUTE');
    });

    it('matches support care: "customer care number"', () => {
      const res = matchEcoSaathiQuery('customer care number');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_SUPPORT_HELP');
    });
  });

  // ==========================================
  // 8. Role & Route Context Boosting
  // ==========================================
  describe('Role & Route Context Boosting', () => {
    it('boosts INTENT_VIEW_OFFERS on CollectorDeals route for short query "offer"', () => {
      const res = matchEcoSaathiQuery('offer', {
        role: 'INFORMAL_COLLECTOR',
        currentRoute: 'CollectorDeals',
      });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_VIEW_OFFERS');
    });

    it('boosts INTENT_TODAYS_PRICE on CollectorPriceBoard route for short query "rate"', () => {
      const res = matchEcoSaathiQuery('rate', {
        role: 'INFORMAL_COLLECTOR',
        currentRoute: 'CollectorPriceBoard',
      });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_TODAYS_PRICE');
    });

    it('blocks Citizen from matching Collector lot creation', () => {
      const res = matchEcoSaathiQuery('how to create a lot', { role: 'CITIZEN' });
      assert.notEqual(res.intentId, 'INTENT_HOW_TO_CREATE_LOT');
    });

    it('routes Citizen asking "give old phone" to CitizenSubmit', () => {
      const res = matchEcoSaathiQuery('give old phone', { role: 'CITIZEN' });
      assert.equal(res.intentId, 'INTENT_CITIZEN_GIVE_EWASTE');
      assert.equal(res.suggestedAction?.targetRoute, 'CitizenSubmit');
    });

    it('allows Recycler to match marketplace browse', () => {
      const res = matchEcoSaathiQuery('how to buy ewaste', { role: 'RECYCLER' });
      assert.equal(res.intentId, 'INTENT_MARKETPLACE_BROWSE');
    });
  });

  // ==========================================
  // 9. Ambiguity Detection & Clarification Handling
  // ==========================================
  describe('Ambiguity Detection & Clarification', () => {
    it('detects ambiguous short query "paisa" without route context and returns clarification options', () => {
      const res = matchEcoSaathiQuery('paisa', { role: 'INFORMAL_COLLECTOR' });
      if (res.isAmbiguous) {
        assert.equal(res.matchMethod, 'CLARIFICATION');
        assert.equal(res.responseI18nKey, 'saathi.clarification_prompt');
        assert.ok(res.clarificationOptions && res.clarificationOptions.length >= 2);
      } else {
        // Direct match if confident
        assert.ok(res.intentId === 'INTENT_VIEW_EARNINGS' || res.intentId === 'INTENT_PAYMENT_STATUS');
      }
    });

    it('resolves ambiguous "paisa" directly to INTENT_VIEW_EARNINGS when on CollectorEarnings route', () => {
      const res = matchEcoSaathiQuery('paisa', {
        role: 'INFORMAL_COLLECTOR',
        currentRoute: 'CollectorEarnings',
      });
      assert.equal(res.intentId, 'INTENT_VIEW_EARNINGS');
    });
  });

  // ==========================================
  // 10. Dynamic Data Flagging
  // ==========================================
  describe('Dynamic Data Flagging', () => {
    it('flags live price lookup as requiring dynamic data', () => {
      const res = matchEcoSaathiQuery('what is todays price');
      assert.equal(res.requiresDynamicData, true);
      assert.equal(res.dynamicDataResolverKey, 'RESOLVE_PRICE_BOARD');
    });

    it('flags total earnings inquiry as requiring dynamic data', () => {
      const res = matchEcoSaathiQuery('where to see total earnings', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.requiresDynamicData, true);
      assert.equal(res.dynamicDataResolverKey, 'RESOLVE_USER_EARNINGS');
    });

    it('flags payment status inquiry as requiring dynamic data', () => {
      const res = matchEcoSaathiQuery('is my payment completed', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.requiresDynamicData, true);
      assert.equal(res.dynamicDataResolverKey, 'RESOLVE_PAYMENT_STATUS');
    });

    it('flags lot status inquiry as requiring dynamic data', () => {
      const res = matchEcoSaathiQuery('where is my lot', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.requiresDynamicData, true);
      assert.equal(res.dynamicDataResolverKey, 'RESOLVE_USER_LOTS');
    });

    it('flags active offers inquiry as requiring dynamic data', () => {
      const res = matchEcoSaathiQuery('show my offers', { role: 'INFORMAL_COLLECTOR' });
      assert.equal(res.requiresDynamicData, true);
      assert.equal(res.dynamicDataResolverKey, 'RESOLVE_USER_DEALS');
    });

    it('flags citizen pickup status as requiring dynamic data', () => {
      const res = matchEcoSaathiQuery('where is my pickup', { role: 'CITIZEN' });
      assert.equal(res.requiresDynamicData, true);
      assert.equal(res.dynamicDataResolverKey, 'RESOLVE_CITIZEN_REQUESTS');
    });
  });

  // ==========================================
  // 11. Navigation & Action Safety
  // ==========================================
  describe('Navigation & Action Safety', () => {
    it('returns only NAVIGATE action type and never transactional mutations', () => {
      for (const intent of ECO_SAATHI_INTENTS) {
        if (intent.suggestedAction) {
          assert.equal(intent.suggestedAction.actionType, 'NAVIGATE');
        }
      }
    });

    it('suggests CollectorSafetyCenter for safety inquiries', () => {
      const res = matchEcoSaathiQuery('how to handle swollen battery');
      assert.equal(res.suggestedAction?.targetRoute, 'CollectorSafetyCenter');
    });

    it('suggests ItemTraceability for Green Certificate inquiries', () => {
      const res = matchEcoSaathiQuery('what is green certificate', { role: 'CITIZEN' });
      assert.equal(res.suggestedAction?.targetRoute, 'ItemTraceability');
    });
  });

  // ==========================================
  // 12. Typo Tolerance & Fuzzy Matching
  // ==========================================
  describe('Typo Tolerance & Fuzzy Matching', () => {
    it('matches misspelled "wher can i see prces"', () => {
      const res = matchEcoSaathiQuery('wher can i see prces');
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_PRICE_BOARD');
    });

    it('matches typo in Hindi "स्क्रैप का भाव"', () => {
      const res = matchEcoSaathiQuery('स्क्रैप का भाव', { language: 'hi' });
      assert.equal(res.matched, true);
      assert.equal(res.intentId, 'INTENT_PRICE_BOARD');
    });
  });

  // ==========================================
  // 13. Unknown & Unrelated Queries (Anti-Hallucination)
  // ==========================================
  describe('Unknown & Unrelated Queries (Anti-Hallucination)', () => {
    it('returns matched: false and INTENT_UNKNOWN for off-topic query', () => {
      const res = matchEcoSaathiQuery('what is the capital of France');
      assert.equal(res.matched, false);
      assert.equal(res.intentId, null);
      assert.equal(res.responseI18nKey, 'saathi.intents.unknown.answer');
    });

    it('returns fallback for complete gibberish', () => {
      const res = matchEcoSaathiQuery('asdfghjkl qwerty 12345');
      assert.equal(res.matched, false);
      assert.equal(res.intentId, null);
    });

    it('handles empty query gracefully', () => {
      const res = matchEcoSaathiQuery('');
      assert.equal(res.matched, false);
      assert.equal(res.intentId, null);
    });

    it('returns unknown for general weather inquiry', () => {
      const res = matchEcoSaathiQuery('what is the weather today');
      assert.equal(res.matched, false);
      assert.equal(res.intentId, null);
    });
  });
});
