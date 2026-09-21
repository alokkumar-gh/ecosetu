/**
 * recyclerMatchingService.ts
 * Mobile service for Economic Recycler Matching
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 9 (SIH-MATCH-001..006)
 */

import { apiClient } from './apiClient';
import { offlineStore } from './offlineStore';

export interface RecyclerOfferedRateItem {
  id: string;
  amount: number;
  unit: string;
  currency: string;
  effectiveDate: string;
  expiryDate: string | null;
  status: string;
  sourceReference: string | null;
  pickupAvailable?: string;
}

export interface RecyclerMatchItem {
  recyclerId: string;
  facilityName: string;
  facilityAddress: string;
  city: string | null;
  state: string | null;
  authorizationStatus: string;
  materialAccepted: boolean;
  offeredRate: RecyclerOfferedRateItem | null;
  pickupAvailability: 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN';
  serviceArea: string;
  distanceKm: number | null;
  matchStatus: 'MATCHED' | 'PARTIAL_MATCH' | 'NOT_ELIGIBLE';
  matchReasons: string[];
}

export interface LotMatchResponse {
  lot: {
    id: string;
    referenceNumber: string;
    category: string;
    subcategory?: string | null;
    approximateTotalWeightKg?: number | null;
    condition?: string;
    sourceType?: string;
  };
  marketEstimate?: {
    estimatedLow: number;
    estimatedHigh: number;
    estimatedMidpoint: number;
    marketRangeLow: number;
    marketRangeHigh: number;
    currency: string;
    unit: string;
    status: string;
  } | null;
  matches: RecyclerMatchItem[];
  disclaimer: string;
  isOfflineCached?: boolean;
  cachedAt?: string | null;
  isStale?: boolean;
  ageHours?: number;
}

class RecyclerMatchingService {
  /**
   * Fetch economic matches for a collector's Material Lot
   * Uses offline caching with 24h staleness check
   */
  async getMatchesForLot(lotId: string): Promise<LotMatchResponse> {
    try {
      const res: any = await apiClient.get(`/material-lots/${lotId}/matches`);
      const payload = res.data?.data || res.data;

      // Cache the fresh response locally
      await offlineStore.cacheLotMatches(lotId, payload);

      return {
        ...payload,
        isOfflineCached: false,
        isStale: false,
      };
    } catch (err: any) {
      console.warn('[RecyclerMatchingService] Network request failed, checking cache:', err.message);

      // Fallback to local cache
      const cached = await offlineStore.getCachedLotMatches(lotId);
      if (cached && cached.data) {
        const cachedData = cached.data as LotMatchResponse;
        return {
          ...cachedData,
          isOfflineCached: true,
          cachedAt: cached.cachedAt,
          isStale: cached.isStale,
          ageHours: cached.ageHours,
        };
      }

      throw err;
    }
  }

  /**
   * Generate accessible text for TTS audio playback of a match
   */
  generateMatchSpeechText(match: RecyclerMatchItem, category: string, lang: string = 'en'): string {
    const rateText = match.offeredRate
      ? `${match.offeredRate.amount} rupees per kilogram`
      : 'Offer rate currently unavailable';

    const pickupText = match.pickupAvailability === 'AVAILABLE'
      ? 'Pickup is available'
      : match.pickupAvailability === 'NOT_AVAILABLE'
      ? 'Drop-off required'
      : 'Pickup availability is unknown';

    const distanceText = match.distanceKm !== null
      ? `${match.distanceKm} kilometers away`
      : 'Distance unknown';

    if (lang === 'hi') {
      const hiRate = match.offeredRate
        ? `${match.offeredRate.amount} रुपये प्रति किलो`
        : 'प्रस्तावित दर उपलब्ध नहीं है';
      const hiPickup = match.pickupAvailability === 'AVAILABLE'
        ? 'पिकअप उपलब्ध है'
        : match.pickupAvailability === 'NOT_AVAILABLE'
        ? 'स्वयं डिलीवरी आवश्यक'
        : 'पिकअप स्थिति अज्ञात';
      return `${match.facilityName}। ${hiRate}। ${hiPickup}। दूरी लगभग ${distanceText}।`;
    }

    if (lang === 'mr') {
      const mrRate = match.offeredRate
        ? `${match.offeredRate.amount} रुपये प्रति किलो`
        : 'ऑफर दर उपलब्ध नाही';
      const mrPickup = match.pickupAvailability === 'AVAILABLE'
        ? 'पिकअप उपलब्ध आहे'
        : 'पिकअप उपलब्ध नाही';
      return `${match.facilityName}। ${mrRate}। ${mrPickup}।`;
    }

    if (lang === 'or') {
      const orRate = match.offeredRate
        ? `${match.offeredRate.amount} ଟଙ୍କା ପ୍ରତି କିଲୋ`
        : 'ମୂଲ୍ୟ ଉପଲବ୍ଧ ନାହିଁ';
      return `${match.facilityName}। ${orRate}।`;
    }

    return `${match.facilityName}. Offered rate: ${rateText}. ${pickupText}. Location: ${distanceText}.`;
  }
}

export const recyclerMatchingService = new RecyclerMatchingService();
export default recyclerMatchingService;
