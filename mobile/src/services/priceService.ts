/**
 * EcoSetu Mobile Price Service
 * Manages Price Discovery Board, Location-Aware Rates, and Value Estimation.
 *
 * Requirements:
 * - SIH-PRICE-001: Price Board showing buying rates per material category and location
 * - SIH-PRICE-002: Offline Price Board with cached prices and 24h staleness detection
 * - SIH-PRICE-003 & SIH-PRICE-004: Instant rule-based value estimation with range
 * - SIH-PRICE-005: Recycler offered rates prepared in architecture
 * - SIH-PRICE-006: Accessible Voice/TTS price readout
 * - SIH-PRICE-007: Units of measurement (PER_KG, PER_UNIT, PER_LOT)
 * - SIH-PRICE-008: Cache freshness metadata
 * - SIH-PRICE-009: Strict Anti-Fabrication rule: NEVER fabricate or fake market prices
 * - SIH-VAL-001 to SIH-VAL-005: Deterministic valuation, methodology disclosure, explicit disclaimers
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Modules 3 & 6
 */

import { apiClient } from './apiClient';
import { networkService } from './networkService';
import { offlineStore } from './offlineStore';

export interface PriceRecord {
  id: string;
  category: string;
  subcategory: string | null;
  buyingPrice: number;
  quotedPrice: number | null;
  marketRangeLow: number | null;
  marketRangeHigh: number | null;
  unit: string;
  currency: string;
  location: string;
  source: string;
  status: string;
  effectiveDate: string;
  expiryDate: string | null;
  lastUpdatedAt: string;
}

export interface PriceBoardData {
  location: string;
  prices: PriceRecord[];
  count: number;
  lastUpdatedAt: string;
  isCached?: boolean;
  isStale?: boolean;
  ageHours?: number;
}

export interface ValuationResult {
  category: string;
  subcategory?: string | null;
  weightKg: number;
  location: string;
  estimatedValue: number | null;
  estimatedLow: number | null;
  estimatedHigh: number | null;
  unit: string;
  currency: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  methodology: string;
  confidence: 'VERIFIED_MARKET_DATA' | 'RECYCLER_OFFER' | 'LIMITED_DATA' | 'NO_DATA';
  disclaimer: string;
  formattedEstimate: string;
  applicablePricesCount: number;
}

export interface PriceHistoryRecord {
  id: string;
  category: string;
  subcategory: string | null;
  location: string;
  buyingPrice: number;
  quotedPrice: number | null;
  unit: string;
  currency: string;
  source: string;
  status: string;
  sourceReference: string | null;
  effectiveDate: string;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricePeriodTrend {
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  observationCount: number;
}

export interface PriceHistoryTrends {
  period: 'WEEKLY' | 'MONTHLY';
  periods: PricePeriodTrend[];
  latestPeriodAverage: number | null;
  previousPeriodAverage: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  trendDirection: 'UP' | 'DOWN' | 'STABLE' | 'INSUFFICIENT_DATA';
  hasSufficientData: boolean;
  totalObservations: number;
  methodology: string;
  disclaimer: string;
}

export interface PriceHistoryResponse {
  records: PriceHistoryRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  trends: PriceHistoryTrends;
  isCached?: boolean;
  isStale?: boolean;
  cachedAt?: string | null;
  ageHours?: number;
}

class PriceService {
  /**
   * Fetch current prices for the collector price board.
   * Online: fetches from /prices, caches locally.
   * Offline: reads from offlineStore with 24h freshness check.
   */
  async getPriceBoard(params?: { category?: string; subcategory?: string; location?: string }): Promise<PriceBoardData> {
    const isOnline = networkService.isConnected();
    const queryLocation = params?.location || 'ALL';

    if (isOnline) {
      try {
        const query = new URLSearchParams();
        if (params?.category) query.append('category', params.category);
        if (params?.subcategory) query.append('subcategory', params.subcategory);
        if (params?.location) query.append('location', params.location);

        const endpoint = `/prices${query.toString() ? `?${query.toString()}` : ''}`;
        const response: any = await apiClient.request(endpoint, { method: 'GET' });
        const board: PriceBoardData = response?.data || response;

        if (board && Array.isArray(board.prices)) {
          // Cache board data locally with timestamp
          await offlineStore.cachePriceBoard(board);
          return {
            ...board,
            isCached: false,
            isStale: false,
          };
        }
      } catch (err: any) {
        console.warn('[PriceService] Online fetch failed, attempting offline cache:', err.message);
      }
    }

    // Offline / Network Error Fallback (SIH-PRICE-002)
    const cached: any = await offlineStore.getCachedPriceBoard();
    if (cached.data) {
      let filteredPrices: PriceRecord[] = cached.data.prices || [];
      if (params?.category) {
        filteredPrices = filteredPrices.filter((p: PriceRecord) => p.category === params.category);
      }
      if (params?.subcategory) {
        filteredPrices = filteredPrices.filter((p: PriceRecord) => p.subcategory === params.subcategory);
      }
      return {
        location: cached.data.location || queryLocation,
        prices: filteredPrices,
        count: filteredPrices.length,
        lastUpdatedAt: cached.cachedAt || cached.data.lastUpdatedAt || new Date().toISOString(),
        isCached: true,
        isStale: cached.isStale,
        ageHours: cached.ageHours,
      };
    }

    // No legitimate data available (SIH-PRICE-009: DO NOT FABRICATE)
    return {
      location: queryLocation,
      prices: [],
      count: 0,
      lastUpdatedAt: new Date().toISOString(),
      isCached: false,
      isStale: false,
    };
  }

  /**
   * Calculate instant rule-based valuation (SIH-PRICE-003, SIH-VAL-001)
   * Online: calls /prices/estimate
   * Offline: computes rule-based estimate from valid cached price records
   */
  async getValuationEstimate(params: {
    category: string;
    subcategory?: string;
    weightKg: number;
    location?: string;
  }): Promise<ValuationResult> {
    const { category, subcategory, weightKg, location = 'ALL' } = params;

    if (!weightKg || weightKg <= 0) {
      return {
        category,
        subcategory: subcategory || null,
        weightKg: 0,
        location,
        estimatedValue: null,
        estimatedLow: null,
        estimatedHigh: null,
        unit: 'INR',
        currency: 'INR',
        status: 'UNAVAILABLE',
        methodology: 'RULE_BASED_MULTIPLICATION',
        confidence: 'NO_DATA',
        disclaimer: 'This is an estimate, not a guaranteed sale price.',
        formattedEstimate: 'Estimate unavailable',
        applicablePricesCount: 0,
      };
    }

    const isOnline = networkService.isConnected();
    if (isOnline) {
      try {
        const query = new URLSearchParams();
        query.append('category', category);
        if (subcategory) query.append('subcategory', subcategory);
        query.append('weight', String(weightKg));
        if (location) query.append('location', location);

        const response: any = await apiClient.request(`/prices/estimate?${query.toString()}`, { method: 'GET' });
        const estimate = response?.data || response;
        if (estimate && estimate.status) {
          return estimate;
        }
      } catch (err: any) {
        console.warn('[PriceService] Online estimate failed, attempting local calculation:', err.message);
      }
    }

    // Offline rule-based calculation from legitimate cached records
    const cached: any = await offlineStore.getCachedPriceBoard();
    if (cached.data && Array.isArray(cached.data.prices)) {
      const records = cached.data.prices.filter((p: PriceRecord) => {
        const catMatch = p.category === category;
        const subMatch = !subcategory || !p.subcategory || p.subcategory === subcategory;
        return catMatch && subMatch && p.status === 'ACTIVE';
      });

      if (records.length > 0) {
        const prices = records.map((r: PriceRecord) => r.buyingPrice);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const estimatedLow = Math.round(weightKg * minPrice * 100) / 100;
        const estimatedHigh = Math.round(weightKg * maxPrice * 100) / 100;
        const estimatedValue = Math.round(((estimatedLow + estimatedHigh) / 2) * 100) / 100;

        const formatted =
          estimatedLow === estimatedHigh
            ? `₹${estimatedLow}`
            : `₹${estimatedLow} – ₹${estimatedHigh}`;

        return {
          category,
          subcategory: subcategory || null,
          weightKg,
          location,
          estimatedValue,
          estimatedLow,
          estimatedHigh,
          unit: 'INR',
          currency: 'INR',
          status: 'AVAILABLE',
          methodology: 'RULE_BASED_MULTIPLICATION_FROM_OFFLINE_CACHE',
          confidence: cached.isStale ? 'LIMITED_DATA' : 'VERIFIED_MARKET_DATA',
          disclaimer: 'This is an estimate based on cached market price data, not a guaranteed sale price.',
          formattedEstimate: formatted,
          applicablePricesCount: records.length,
        };
      }
    }

    // No data available (SIH-PRICE-009: DO NOT FABRICATE)
    return {
      category,
      subcategory: subcategory || null,
      weightKg,
      location,
      estimatedValue: null,
      estimatedLow: null,
      estimatedHigh: null,
      unit: 'INR',
      currency: 'INR',
      status: 'UNAVAILABLE',
      methodology: 'RULE_BASED_MULTIPLICATION',
      confidence: 'NO_DATA',
      disclaimer: 'This is an estimate, not a guaranteed sale price.',
      formattedEstimate: 'Estimate unavailable',
      applicablePricesCount: 0,
    };
  }

  /**
   * Accessible TTS speech readout generator (SIH-PRICE-006)
   * Builds localized speech strings for low-literacy users.
   */
  generateSpeechText(
    categoryLabel: string,
    priceRecord: PriceRecord | null,
    locale: string = 'en'
  ): string {
    const lang = locale.toLowerCase().split('-')[0];

    if (!priceRecord) {
      switch (lang) {
        case 'hi':
          return `${categoryLabel}। वर्तमान में कोई सत्यापित मूल्य डेटा उपलब्ध नहीं है।`;
        case 'mr':
          return `${categoryLabel}। सध्या कोणताही पडताळलेला किंमत डेटा उपलब्ध नाही।`;
        case 'or':
          return `${categoryLabel}। ବର୍ତ୍ତମାନ କୌଣସି ଯାଞ୍ଚ ହୋଇଥିବା ମୂଲ୍ୟ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।`;
        case 'en':
        default:
          return `${categoryLabel}. No verified price data available currently.`;
      }
    }

    const unitStr = priceRecord.unit === 'PER_KG' ? 'kilogram' : priceRecord.unit === 'PER_UNIT' ? 'unit' : 'lot';
    const hasRange =
      priceRecord.marketRangeLow !== null &&
      priceRecord.marketRangeHigh !== null &&
      priceRecord.marketRangeLow !== priceRecord.marketRangeHigh;

    switch (lang) {
      case 'hi':
        if (hasRange) {
          return `${categoryLabel}। मूल्य सीमा: ${priceRecord.marketRangeLow} से ${priceRecord.marketRangeHigh} रुपये प्रति किलो।`;
        }
        return `${categoryLabel}। वर्तमान खरीद मूल्य: ${priceRecord.buyingPrice} रुपये प्रति किलो।`;

      case 'mr':
        if (hasRange) {
          return `${categoryLabel}। किंमत श्रेणी: ${priceRecord.marketRangeLow} ते ${priceRecord.marketRangeHigh} रुपये प्रति किलो।`;
        }
        return `${categoryLabel}। चालू खरेदी किंमत: ${priceRecord.buyingPrice} रुपये प्रति किलो।`;

      case 'or':
        if (hasRange) {
          return `${categoryLabel}। ମୂଲ୍ୟ ସୀମା: ${priceRecord.marketRangeLow} ରୁ ${priceRecord.marketRangeHigh} ଟଙ୍କା ପ୍ରତି କିଲୋଗ୍ରାମ।`;
        }
        return `${categoryLabel}। ବର୍ତ୍ତମାନର କ୍ରୟ ମୂଲ୍ୟ: ${priceRecord.buyingPrice} ଟଙ୍କା ପ୍ରତି କିଲୋଗ୍ରାମ।`;

      case 'en':
      default:
        if (hasRange) {
          return `${categoryLabel}. Price range: ${priceRecord.marketRangeLow} to ${priceRecord.marketRangeHigh} rupees per ${unitStr}.`;
        }
        return `${categoryLabel}. Current buying price: ${priceRecord.buyingPrice} rupees per ${unitStr}.`;
    }
  }

  /**
   * Fetch historical prices and deterministic trends (SIH-PRICE-010..014)
   * Online: fetches from /prices/history, caches in offlineStore.
   * Offline: falls back to cached historical data with 24h freshness check.
   */
  async getHistoricalPrices(params: {
    category?: string;
    subcategory?: string;
    location?: string;
    unit?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    period?: 'WEEKLY' | 'MONTHLY';
    page?: number;
    limit?: number;
  }): Promise<PriceHistoryResponse> {
    const cacheKey = `${params.category || 'ALL'}_${params.location || 'ALL'}_${params.period || 'MONTHLY'}`;
    const isOnline = networkService.isConnected();

    if (isOnline) {
      try {
        const query = new URLSearchParams();
        if (params.category) query.append('category', params.category);
        if (params.subcategory) query.append('subcategory', params.subcategory);
        if (params.location) query.append('location', params.location);
        if (params.unit) query.append('unit', params.unit);
        if (params.source) query.append('source', params.source);
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);
        if (params.period) query.append('period', params.period);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));

        const response: any = await apiClient.request(`/prices/history?${query.toString()}`, {
          method: 'GET',
        });
        const historyData: PriceHistoryResponse = response?.data || response;

        if (historyData && Array.isArray(historyData.records)) {
          await offlineStore.cachePriceHistory(cacheKey, historyData);
          return {
            ...historyData,
            isCached: false,
            isStale: false,
          };
        }
      } catch (err: any) {
        console.warn('[PriceService] Online history fetch failed, falling back to cache:', err.message);
      }
    }

    // Offline / fallback cache check (SIH-PRICE-010, SIH-PRICE-014)
    const cached: any = await offlineStore.getCachedPriceHistory(cacheKey);
    if (cached.data) {
      return {
        ...cached.data,
        isCached: true,
        isStale: cached.isStale,
        cachedAt: cached.cachedAt,
        ageHours: cached.ageHours,
      };
    }

    // Explicit empty response without fabricating prices (SIH-PRICE-009, SIH-PRICE-011)
    return {
      records: [],
      total: 0,
      page: 1,
      limit: params.limit || 20,
      totalPages: 0,
      trends: {
        period: params.period || 'MONTHLY',
        periods: [],
        latestPeriodAverage: null,
        previousPeriodAverage: null,
        absoluteChange: null,
        percentageChange: null,
        trendDirection: 'INSUFFICIENT_DATA',
        hasSufficientData: false,
        totalObservations: 0,
        methodology: 'HISTORICAL TREND: deterministic aggregation of observed buying prices.',
        disclaimer: 'This represents past observed market rates. Historical trends do not guarantee future sale prices.',
      },
      isCached: false,
      isStale: false,
    };
  }

  /**
   * Accessible TTS speech generator for price trends (SIH-PRICE-014)
   * Strictly speaks actual historical values and discloses non-prediction disclaimer.
   */
  generateHistorySpeechText(
    categoryLabel: string,
    historyData: PriceHistoryResponse | null,
    locale: string = 'en'
  ): string {
    const lang = locale.toLowerCase().split('-')[0];

    if (!historyData || !historyData.trends || !historyData.trends.hasSufficientData || historyData.trends.latestPeriodAverage === null) {
      switch (lang) {
        case 'hi':
          return `${categoryLabel}। ट्रेंड गणना के लिए पर्याप्त ऐतिहासिक डेटा उपलब्ध नहीं है। यह कोई मूल्य भविष्यवाणी नहीं है।`;
        case 'mr':
          return `${categoryLabel}। ट्रेंड मोजण्यासाठी पुरेसा ऐतिहासिक डेटा उपलब्ध नाही. हा कोणताही किमतीचा अंदाज नाही.`;
        case 'or':
          return `${categoryLabel}। ଧାରା ଗଣନା ପାଇଁ ପର୍ଯ୍ୟାପ୍ତ ଐତିହାସିକ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ। ଏହା କୌଣସି ମୂଲ୍ୟ ପୂର୍ବାନୁମାନ ନୁହେଁ।`;
        case 'en':
        default:
          return `${categoryLabel}. Not enough historical data to calculate trends. This is not a price forecast.`;
      }
    }

    const { latestPeriodAverage, absoluteChange, percentageChange, trendDirection } = historyData.trends;

    switch (lang) {
      case 'hi': {
        const dirText = trendDirection === 'UP' ? 'बढ़ा है' : trendDirection === 'DOWN' ? 'घटा है' : 'स्थिर है';
        const changeText = absoluteChange !== null && Math.abs(absoluteChange) > 0
          ? `पिछली अवधि से ${Math.abs(absoluteChange)} रुपये (${Math.abs(percentageChange || 0)} प्रतिशत) ${dirText}`
          : 'मूल्य स्थिर रहा है';
        return `${categoryLabel}। नवीनतम ऐतिहासिक औसत मूल्य: ${latestPeriodAverage} रुपये प्रति किलो। ${changeText}। यह ऐतिहासिक डेटा है, कोई मूल्य गारंटी नहीं।`;
      }
      case 'mr': {
        const dirText = trendDirection === 'UP' ? 'वाढले आहे' : trendDirection === 'DOWN' ? 'कमी झाले आहे' : 'स्थिर आहे';
        const changeText = absoluteChange !== null && Math.abs(absoluteChange) > 0
          ? `मागील कालावधीपेक्षा ${Math.abs(absoluteChange)} रुपये (${Math.abs(percentageChange || 0)} टक्के) ${dirText}`
          : 'किंमत स्थिर राहिली आहे';
        return `${categoryLabel}। नवीनतम ऐतिहासिक सरासरी किंमत: ${latestPeriodAverage} रुपये प्रति किलो। ${changeText}। हा ऐतिहासिक डेटा आहे, भविष्यातील हमी नाही.`;
      }
      case 'or': {
        const dirText = trendDirection === 'UP' ? 'ବୃଦ୍ଧି ପାଇଛି' : trendDirection === 'DOWN' ? 'ହ୍ରାସ ପାଇଛି' : 'ସ୍ଥିର ରହିଛି';
        const changeText = absoluteChange !== null && Math.abs(absoluteChange) > 0
          ? `ପୂର୍ବ ଅବଧି ତୁଳନାରେ ${Math.abs(absoluteChange)} ଟଙ୍କା (${Math.abs(percentageChange || 0)} ପ୍ରତିଶତ) ${dirText}`
          : 'ମୂଲ୍ୟ ସ୍ଥିର ରହିଛି';
        return `${categoryLabel}। ନୂତନ ଐତିହାସିକ ହାରାହାରି ମୂଲ୍ୟ: ${latestPeriodAverage} ଟଙ୍କା ପ୍ରତି କିଲୋଗ୍ରାମ। ${changeText}। ଏହା ଐତିହାସିକ ତଥ୍ୟ, କୌଣସି ମୂଲ୍ୟ ଗ୍ୟାରେଣ୍ଟି ନୁହେଁ।`;
      }
      case 'en':
      default: {
        const dirText = trendDirection === 'UP' ? 'up' : trendDirection === 'DOWN' ? 'down' : 'stable at';
        const changeText = absoluteChange !== null && Math.abs(absoluteChange) > 0
          ? `${dirText} ${Math.abs(absoluteChange)} rupees (${Math.abs(percentageChange || 0)}%) from previous period`
          : 'unchanged from previous period';
        return `${categoryLabel}. Historical average price is ${latestPeriodAverage} rupees per kg, ${changeText}. This is historical trend data, not a price forecast.`;
      }
    }
  }
}

export const priceService = new PriceService();
export default priceService;
