/**
 * EcoSetu Mobile Quote Service
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10
 */

import apiClient from './apiClient';
import offlineStore from './offlineStore';
import networkService from './networkService';

export interface RecyclerQuote {
  id: string;
  referenceNumber: string;
  materialLotId: string;
  recyclerId: string;
  category: string;
  subcategory?: string | null;
  quotedUnitPrice: number;
  unit: string;
  currency: string;
  quotedQuantity?: number | null;
  quotedTotal?: number | null;
  status: 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  validFrom: string;
  validUntil: string;
  notes?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  isExpired?: boolean;
  createdAt: string;
  recycler?: {
    id: string;
    facilityName: string;
    authorizationStatus: string;
    city?: string | null;
    state?: string | null;
    pickupAvailable?: string;
    user?: {
      isVerified: boolean;
    };
  };
}

export interface LotQuotesResponse {
  lotId: string;
  lotReference: string;
  lotStatus: string;
  category: string;
  subcategory?: string | null;
  weightKg?: number | null;
  benchmarkEstimate?: {
    status: string;
    marketRangeLow: number;
    marketRangeHigh: number;
    estimatedLow: number;
    estimatedHigh: number;
    estimatedMidpoint: number;
    unit: string;
    currency: string;
    disclaimer: string;
  } | null;
  quotes: RecyclerQuote[];
  totalQuotes: number;
  isFromCache?: boolean;
  cachedAt?: string | null;
  isStale?: boolean;
}

export interface CreateQuotePayload {
  materialLotId: string;
  quotedUnitPrice: number;
  unit?: string;
  currency?: string;
  quotedQuantity?: number;
  validUntil: string;
  notes?: string;
}

class MobileQuoteService {
  /**
   * Get all quotes for a material lot (with offline caching)
   */
  async getQuotesForLot(lotId: string): Promise<LotQuotesResponse> {
    const isOnline = networkService.isOnline();

    if (isOnline) {
      try {
        const response = await apiClient.get(`/material-lots/${lotId}/quotes`);
        if (response.data && response.data.success) {
          const result = response.data.data;
          await offlineStore.cacheLotQuotes(lotId, result);
          return {
            ...result,
            isFromCache: false,
          };
        }
      } catch (err) {
        console.warn(`[MobileQuoteService] Online fetch failed, falling back to cache:`, err);
      }
    }

    // Offline or fallback to cache
    const cached = await offlineStore.getCachedLotQuotes(lotId);
    if (cached.data) {
      return {
        ...(cached.data as LotQuotesResponse),
        isFromCache: true,
        cachedAt: cached.cachedAt,
        isStale: cached.isStale,
      };
    }

    if (!isOnline) {
      throw new Error('No offline cached quotes available for this lot. Connect to internet to fetch quotes.');
    }

    throw new Error('Failed to load quotes for this material lot');
  }

  /**
   * Get single quote details
   */
  async getQuoteById(quoteId: string): Promise<RecyclerQuote> {
    const response = await apiClient.get(`/quotes/${quoteId}`);
    return response.data.data;
  }

  /**
   * Recycler creates a quote (Online-only)
   */
  async createQuote(payload: CreateQuotePayload): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Internet connection required to issue a formal commercial quote.');
    }

    const response = await apiClient.post('/quotes', payload);
    return response.data.data;
  }

  /**
   * Collector accepts quote (Strictly Online-only)
   */
  async acceptQuote(quoteId: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to accept quote. Quote acceptance requires online verification.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/accept`);
    return response.data.data;
  }

  /**
   * Collector rejects quote (Strictly Online-only)
   */
  async rejectQuote(quoteId: string, reason?: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to reject quote.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/reject`, { reason });
    return response.data.data;
  }

  /**
   * Recycler cancels quote
   */
  async cancelQuote(quoteId: string, reason?: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to cancel quote.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/cancel`, { reason });
    return response.data.data;
  }

  /**
   * Generate vernacular spoken explanation for accessible TTS
   */
  generateQuoteSpeechText(quote: RecyclerQuote, locale: string = 'en'): string {
    const recycler = quote.recycler?.facilityName || 'Recycler';
    const rate = quote.quotedUnitPrice;
    const total = quote.quotedTotal || (rate * (quote.quotedQuantity || 1));
    const unit = quote.unit === 'PER_KG' ? 'kg' : quote.unit.toLowerCase();

    switch (locale) {
      case 'hi':
        return `${recycler} ने ₹${rate} प्रति ${unit} का भाव दिया है। कुल अनुमानित राशि ₹${total} है। कोटेशन स्थिति ${quote.status} है।`;
      case 'mr':
        return `${recycler} यांनी ₹${rate} प्रति ${unit} दर दिला आहे. एकूण अंदाजे रक्कम ₹${total} आहे. कोटेशन स्थिती ${quote.status} आहे.`;
      case 'or':
        return `${recycler} ₹${rate} ପ୍ରତି ${unit} ଦର ଦେଇଛନ୍ତି। ମୋଟ ଆନୁମାନିକ ରାଶି ₹${total} ଅଟେ। କୋଟେସନ୍ ସ୍ଥିତି ${quote.status} ଅଟେ।`;
      default:
        return `${recycler} offered ₹${rate} per ${unit}. Total estimated amount is ₹${total}. Quote status is ${quote.status}.`;
    }
  }
}

export const quoteService = new MobileQuoteService();
export default quoteService;
