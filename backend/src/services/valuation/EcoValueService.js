/**
 * EcoSetu — Eco-Value Engine
 * Deterministic e-waste valuation service grounded in legitimate market price datasets.
 * Canonical Reference: docs/06_PRICE_DISCOVERY_ENGINE.md, docs/25_SIH_26229_REQUIREMENTS.md
 * 
 * STRICT RULE: Never lets LLM decide or fabricate pricing.
 * Computes deterministic ranges based on category baseline benchmarks, weight, and condition multipliers.
 */

const priceService = require('../priceService');
const { EWASTE_CATEGORIES, ITEM_CONDITIONS } = require('../../utils/constants');
const { PRICING_CATALOG } = require('../ecoSaathi/priceExplainer');

// Standard typical default weight (kg) per unit when weight is unmeasured by citizen
const TYPICAL_UNIT_WEIGHT_KG = {
  LAPTOP: 2.2,
  MOBILE_PHONE: 0.2,
  DESKTOP: 7.5,
  TABLET: 0.5,
  MONITOR: 4.0,
  PRINTER: 6.0,
  BATTERY: 0.4,
  CIRCUIT_BOARD: 0.3,
  CABLE_CHARGER: 0.25,
  KEYBOARD_MOUSE: 0.6,
  OTHER: 1.0,
};

// Condition multiplier bands (reflecting reuse vs repair vs component vs raw scrap recovery)
const CONDITION_MULTIPLIERS = {
  WORKING: { low: 1.0, high: 1.3, label: 'Working (high reuse value)' },
  TESTED_WORKING: { low: 1.1, high: 1.35, label: 'Tested working (premium reuse)' },
  PARTIALLY_WORKING: { low: 0.75, high: 0.95, label: 'Partially working (repair potential)' },
  REPAIRABLE: { low: 0.70, high: 0.90, label: 'Repairable (component reuse)' },
  NOT_WORKING: { low: 0.55, high: 0.75, label: 'Non-functional (extractable parts)' },
  DAMAGED: { low: 0.40, high: 0.65, label: 'Damaged (scrap metal/plastic recovery)' },
  UNKNOWN: { low: 0.70, high: 1.0, label: 'Standard unverified baseline' },
};

class EcoValueService {
  /**
   * Calculate deterministic grounded value range for an e-waste item
   * @param {object} params
   * @param {string} params.category - Canonical category (e.g. 'LAPTOP', 'MOBILE_PHONE')
   * @param {string} [params.condition='UNKNOWN'] - Condition enum
   * @param {number} [params.weightKg] - Actual or estimated weight
   * @param {string} [params.location] - City or location filter
   * @param {string} [params.language='en']
   * @returns {Promise<object>} Standardized valuation contract
   */
  async calculateValue({ category, condition = 'UNKNOWN', weightKg = null, location = 'ALL', language = 'en' }) {
    const normCat = String(category || '').toUpperCase().replace(/[\s\-]/g, '_');
    
    if (!EWASTE_CATEGORIES[normCat]) {
      return {
        isEstimateAvailable: false,
        status: 'UNSUPPORTED_CATEGORY',
        category: normCat,
        message: 'Unsupported e-waste category. Valuation cannot be computed.',
        estimatedRange: null,
      };
    }

    const normCondition = ITEM_CONDITIONS[condition] ? condition : 'UNKNOWN';
    const conditionMeta = CONDITION_MULTIPLIERS[normCondition] || CONDITION_MULTIPLIERS.UNKNOWN;
    
    // Resolve weight: use user-specified weight or typical standard category weight
    const resolvedWeight = (weightKg && !isNaN(parseFloat(weightKg)) && parseFloat(weightKg) > 0)
      ? parseFloat(weightKg)
      : (TYPICAL_UNIT_WEIGHT_KG[normCat] || 1.0);

    let priceRange = null;
    let dataSource = 'BENCHMARK_CATALOG';

    // 1. First attempt to fetch live verified price records from database
    try {
      const liveEstimate = await priceService.calculateEstimate({
        category: normCat,
        weightKg: resolvedWeight,
        location,
      });

      if (liveEstimate && liveEstimate.isEstimateAvailable && liveEstimate.applicableRateLow) {
        priceRange = {
          lowPerKg: liveEstimate.applicableRateLow,
          highPerKg: liveEstimate.applicableRateHigh,
        };
        dataSource = 'VERIFIED_DATABASE_RECORDS';
      }
    } catch {
      // Fall through to canonical pricing catalog benchmark
    }

    // 2. Fallback to canonical catalog benchmark
    if (!priceRange) {
      const benchmark = PRICING_CATALOG[normCat];
      if (benchmark) {
        priceRange = {
          lowPerKg: benchmark.minRate,
          highPerKg: benchmark.maxRate,
        };
      }
    }

    if (!priceRange) {
      return {
        isEstimateAvailable: false,
        status: 'INSUFFICIENT_DATA',
        category: normCat,
        condition: normCondition,
        message: 'Insufficient pricing data to estimate value for this category.',
        estimatedRange: null,
      };
    }

    // 3. Compute deterministic valuation with condition adjustment
    const rawMin = resolvedWeight * priceRange.lowPerKg * conditionMeta.low;
    const rawMax = resolvedWeight * priceRange.highPerKg * conditionMeta.high;

    // Round to nearest multiple of 10 for clean user presentation
    const min = Math.max(10, Math.round(rawMin / 10) * 10);
    const max = Math.max(min + 10, Math.round(rawMax / 10) * 10);
    const midpoint = Math.round((min + max) / 2);

    const formattedRange = `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`;

    let explanation = '';
    if (language === 'hi') {
      explanation = `${normCat} (${normCondition}) का अनुमानित मूल्य ₹${min} से ₹${max} है। यह श्रेणी के बेसलाइन मूल्य और स्थिति (${conditionMeta.label}) पर आधारित है।`;
    } else if (language === 'or') {
      explanation = `${normCat} (${normCondition}) ର ଆନୁମାନିକ ମୂଲ୍ୟ ₹${min} ରୁ ₹${max} ଅଟେ।`;
    } else {
      explanation = `Estimated value range for ${normCat} (${normCondition}) is ${formattedRange}. Based on standard weight (${resolvedWeight} kg) and ${conditionMeta.label}.`;
    }

    return {
      isEstimateAvailable: true,
      status: 'AVAILABLE',
      category: normCat,
      condition: normCondition,
      conditionMultiplier: {
        low: conditionMeta.low,
        high: conditionMeta.high,
        label: conditionMeta.label,
      },
      weightKg: resolvedWeight,
      isWeightEstimated: !weightKg,
      estimatedRange: {
        min,
        max,
        midpoint,
        formattedRange,
      },
      currency: 'INR',
      basis: [
        'category benchmark',
        'condition multiplier',
        'weight basis',
        `Category benchmark rate: ₹${priceRange.lowPerKg}–₹${priceRange.highPerKg}/kg`,
        `Condition multiplier: ${conditionMeta.label}`,
        `Weight basis: ${resolvedWeight} kg`,
      ],
      dataSource,
      confidence: normCondition === 'WORKING' ? 0.88 : normCondition === 'DAMAGED' ? 0.82 : 0.75,
      explanation,
      disclaimer: 'This is a market-grounded estimate, not a guaranteed offer. Verified collectors set their own bids based on on-site inspection.',
      dataTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Natural-language grounded price explanation
   * @param {object} params
   * @param {string} params.category
   * @param {string} [params.condition='WORKING']
   * @param {number} [params.weightKg]
   * @param {string} [params.language='en']
   */
  explainValuation({ category, condition = 'WORKING', weightKg = null, language = 'en' }) {
    const normCat = String(category || 'LAPTOP').toUpperCase().replace(/[\s\-]/g, '_');
    const normCondition = ITEM_CONDITIONS[condition] ? condition : 'WORKING';
    const conditionMeta = CONDITION_MULTIPLIERS[normCondition] || CONDITION_MULTIPLIERS.WORKING;
    const resolvedWeight = (weightKg && !isNaN(parseFloat(weightKg))) ? parseFloat(weightKg) : (TYPICAL_UNIT_WEIGHT_KG[normCat] || 1.0);
    const benchmark = PRICING_CATALOG[normCat] || PRICING_CATALOG.LAPTOP;

    const rawMin = resolvedWeight * benchmark.minRate * conditionMeta.low;
    const rawMax = resolvedWeight * benchmark.maxRate * conditionMeta.high;
    const min = Math.max(10, Math.round(rawMin / 10) * 10);
    const max = Math.max(min + 10, Math.round(rawMax / 10) * 10);

    let message = '';
    if (language === 'hi') {
      message = `यह अनुमान ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')} चयनित श्रेणी (${normCat}) और स्थिति (${conditionMeta.label}) पर आधारित है। कलेक्टरों के वास्तविक ऑफर भिन्न हो सकते हैं क्योंकि कलेक्टर अपने स्वयं के भौतिक मूल्यांकन, लॉजिस्टिक्स लागत और रीसाइक्लिंग रिकवरी मूल्य को ध्यान में रखते हैं।`;
    } else {
      message = `The estimate of ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')} is based on the selected ${normCat} category and ${conditionMeta.label} condition. Collector offers may differ because collectors use their own physical assessment, logistics costs, recovery value, and market conditions.`;
    }

    return {
      category: normCat,
      condition: normCondition,
      estimatedRange: { min, max, formattedRange: `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}` },
      message,
      factors: [
        'Category scrap benchmark rate',
        'Declared hardware condition',
        'Standard unit weight',
        'Collector transport & handling margins',
      ],
    };
  }
}

module.exports = new EcoValueService();
