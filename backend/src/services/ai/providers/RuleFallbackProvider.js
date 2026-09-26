// EcoSetu Rule & Keyword Fallback AI Provider
// Zero-external-dependency fallback ensuring Eco-Saathi availability under any network / offline / missing key condition

const AIProvider = require('../AIProvider');

class RuleFallbackProvider extends AIProvider {
  constructor() {
    super('rule-fallback');
  }

  isConfigured() {
    return true;
  }

  async generate({ prompt = '', systemPrompt = '', messages = [], tools = [] }) {
    const startTime = Date.now();
    const query = prompt.toLowerCase().trim();

    const toolCalls = [];
    let text = '';

    // ── 1. Intent Detection via Semantic Patterns (English, Hindi, Hinglish, Odia) ──

    // Pickup Status / Tracking
    const isPickupStatus = /pickup|status|kahan|kab aayega|track|kouthi|kemiti|state|where is/i.test(query);

    // Offers / Bidding / Negotiation
    const isOffers = /offer|boli|daam|rate|buyer|kabadiwala|counter|kitna diya|kete tanka|price/i.test(query);

    // E-waste Pricing
    const isPricing = /price|bhav|rate|kitne me|kete re|pricing|rate chart/i.test(query) && !isOffers;

    // Profile / User info
    const isProfile = /profile|mera account|khata|my name|who am i|mo account/i.test(query);

    // Category / Material inquiry
    const isCategory = /pcb|mobile|laptop|battery|cable|wire|crt|tv|screen|ewaste|material|scrap/i.test(query);

    // ── 2. Match Tools if provided ──
    const toolNames = new Set(tools.map((t) => t.name));

    if (isPickupStatus && toolNames.has('getPickupRequests')) {
      toolCalls.push({
        name: 'getPickupRequests',
        arguments: { limit: 5 },
      });
      text = 'Checking your latest pickup requests and current status.';
    } else if (isOffers && toolNames.has('getReceivedOffers')) {
      toolCalls.push({
        name: 'getReceivedOffers',
        arguments: {},
      });
      text = 'Fetching the latest price offers submitted by collectors for your e-waste.';
    } else if (isPricing && toolNames.has('getCategoryPricing')) {
      let category = 'CIRCUIT_BOARD';
      if (/mobile|phone/i.test(query)) category = 'MOBILE_PHONE';
      else if (/laptop/i.test(query)) category = 'LAPTOP';
      else if (/battery/i.test(query)) category = 'BATTERY';
      else if (/cable|wire|charger/i.test(query)) category = 'CABLE_CHARGER';

      toolCalls.push({
        name: 'getCategoryPricing',
        arguments: { category },
      });
      text = `Checking standard reference market prices for ${category.replace(/_/g, ' ')}.`;
    } else if (isProfile && toolNames.has('getUserProfile')) {
      toolCalls.push({
        name: 'getUserProfile',
        arguments: {},
      });
      text = 'Retrieving your EcoSetu user profile.';
    } else if (isCategory) {
      text = 'EcoSetu handles all major e-waste categories including PCBs, mobile phones, laptops, batteries, and cables. You can capture a photo in the Submit tab to classify and get price estimates.';
    } else {
      text = 'Hello! I am Eco-Saathi, your EcoSetu assistant. I can help you check pickup status, compare collector offers, check e-waste reference rates, or guide you through responsible recycling.';
    }

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
      rawResponse: { type: 'rule_fallback', matched: toolCalls.length > 0 },
      latencyMs: Date.now() - startTime,
    };
  }
}

module.exports = RuleFallbackProvider;
