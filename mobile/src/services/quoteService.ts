/**
 * EcoSetu Mobile Quote Service
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10
 */

import apiClient from './apiClient';
import offlineStore from './offlineStore';
import networkService from './networkService';

export interface NegotiationEvent {
  id: string;
  actor: 'Collector' | 'Recycler' | 'Citizen' | 'Admin' | 'System';
  actorName: string;
  actionType: 'INITIAL_OFFER' | 'COLLECTOR_COUNTER' | 'RECYCLER_REVISION' | 'CITIZEN_REVISION' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  rate?: number | null;
  unit?: string | null;
  quantity?: number | null;
  total?: number | null;
  timestamp: string;
  notes?: string | null;
  status?: string;
}

export interface RecyclerQuote {
  id: string;
  referenceNumber: string;
  materialLotId: string;
  recyclerId?: string | null;
  buyerUserId?: string | null;
  buyerRole?: string | null;
  isConsumerOffer?: boolean;
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
  negotiationTimeline?: NegotiationEvent[];
  buyerUser?: {
    id: string;
    name: string;
    phone?: string | null;
  };
  materialLot?: {
    id: string;
    referenceNumber: string;
    category: string;
    subcategory?: string | null;
    approximateTotalWeightKg?: number | null;
    status: string;
    condition?: string;
    description?: string | null;
    askingPrice?: number | null;
    photos?: Array<{ id: string; photoUrl: string }>;
    collector?: {
      id: string;
      city?: string | null;
      serviceArea?: string | null;
      state?: string | null;
      user?: {
        id: string;
        name: string;
      };
    };
  };
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
        const result = response?.data || response;
        if (result) {
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
    return response?.data?.data || response?.data || response;
  }

  /**
   * Recycler creates a quote (Online-only)
   */
  async createQuote(payload: CreateQuotePayload): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Internet connection required to issue a formal commercial quote.');
    }

    const response = await apiClient.post('/quotes', payload);
    return response?.data?.data || response?.data || response;
  }

  /**
   * Citizen submits a purchase offer for a reuse lot
   */
  async submitCitizenOffer(payload: {
    materialLotId: string;
    offeredPrice: number;
    notes?: string;
    validDays?: number;
  }): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to the internet to submit a purchase offer.');
    }

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + (payload.validDays || 7));

    const body = {
      materialLotId: payload.materialLotId,
      quotedUnitPrice: payload.offeredPrice,
      unit: 'PER_LOT',
      quotedQuantity: 1,
      validUntil: validUntilDate.toISOString(),
      notes: payload.notes || 'Citizen purchase offer for circular reuse.',
    };

    const response = await apiClient.post('/quotes', body);
    return response?.data?.data || response?.data || response;
  }

  /**
   * Get all purchase offers / deals submitted by authenticated Citizen
   */
  async getCitizenQuotes(params?: { status?: string }): Promise<RecyclerQuote[]> {
    const response = await apiClient.get('/quotes/citizen', { params });
    const payload = response?.data !== undefined ? response.data : response;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.quotes)) return payload.quotes;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  /**
   * Collector accepts quote (Strictly Online-only)
   */
  async acceptQuote(quoteId: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to accept quote. Quote acceptance requires online verification.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/accept`);
    return response?.data?.data || response?.data || response;
  }

  /**
   * Collector rejects quote (Strictly Online-only)
   */
  async rejectQuote(quoteId: string, reason?: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to reject quote.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/reject`, { reason });
    return response?.data?.data || response?.data || response;
  }

  /**
   * Recycler cancels quote
   */
  async cancelQuote(quoteId: string, reason?: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to cancel quote.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/cancel`, { reason });
    return response?.data?.data || response?.data || response;
  }

  /**
   * Counter-offer or revise quote (Collector or Recycler)
   */
  async counterQuote(quoteId: string, counterUnitPrice: number, notes?: string): Promise<RecyclerQuote> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to submit counter-offer.');
    }

    const response = await apiClient.post(`/quotes/${quoteId}/counter`, {
      counterUnitPrice,
      notes,
    });
    return response?.data?.data || response?.data || response;
  }

  /**
   * Parse negotiation timeline from quote notes and status
   */
  parseNegotiationTimeline(quote: RecyclerQuote): NegotiationEvent[] {
    if (quote.negotiationTimeline && quote.negotiationTimeline.length > 0) {
      return quote.negotiationTimeline;
    }

    const events: NegotiationEvent[] = [];
    const unit = quote.unit === 'PER_KG' ? 'kg' : (quote.unit || 'kg');

    let initialEventAdded = false;
    if (quote.notes) {
      const lines = quote.notes.split('\n');
      lines.forEach((line, index) => {
        const match = line.match(/^\[(Collector|Recycler|Admin)\s+(?:Offer|Counter)\s+@\s+₹([\d.]+)\/([a-zA-Z_]+)(?::\s*([^()]*?))?\s*(?:\(([^)]+)\))?\]$/);
        if (match) {
          const actor = match[1] as any;
          const rate = parseFloat(match[2]);
          const matchedUnit = match[3] === 'PER_KG' ? 'kg' : match[3];
          const noteText = match[4] ? match[4].trim() : null;
          const timeStr = match[5] ? match[5].trim() : quote.createdAt;

          const isInitial = index === 0 && (line.includes('Offer') || actor === 'Recycler');
          if (isInitial && !initialEventAdded) {
            initialEventAdded = true;
            events.push({
              id: `${quote.id}-initial`,
              actor: 'Recycler',
              actorName: quote.recycler?.facilityName || 'Recycler',
              actionType: 'INITIAL_OFFER',
              rate,
              unit: matchedUnit,
              quantity: quote.quotedQuantity || null,
              total: quote.quotedQuantity ? Math.round(rate * quote.quotedQuantity * 100) / 100 : null,
              timestamp: timeStr,
              notes: noteText,
              status: quote.status,
            });
          } else {
            events.push({
              id: `${quote.id}-counter-${index}`,
              actor,
              actorName: actor === 'Collector' ? 'Collector' : (quote.recycler?.facilityName || 'Recycler'),
              actionType: actor === 'Collector' ? 'COLLECTOR_COUNTER' : 'RECYCLER_REVISION',
              rate,
              unit: matchedUnit,
              quantity: quote.quotedQuantity || null,
              total: quote.quotedQuantity ? Math.round(rate * quote.quotedQuantity * 100) / 100 : null,
              timestamp: timeStr,
              notes: noteText,
              status: 'SENT',
            });
          }
        }
      });
    }

    if (!initialEventAdded) {
      events.unshift({
        id: `${quote.id}-initial`,
        actor: 'Recycler',
        actorName: quote.recycler?.facilityName || 'Recycler',
        actionType: 'INITIAL_OFFER',
        rate: quote.quotedUnitPrice,
        unit,
        quantity: quote.quotedQuantity || null,
        total: quote.quotedTotal || (quote.quotedUnitPrice * (quote.quotedQuantity || 1)),
        timestamp: quote.createdAt,
        notes: quote.notes ? quote.notes.split('\n')[0] : null,
        status: quote.status,
      });
    }

    if (quote.status === 'ACCEPTED') {
      events.push({
        id: `${quote.id}-accepted`,
        actor: 'Collector',
        actorName: 'Collector',
        actionType: 'ACCEPTED',
        rate: quote.quotedUnitPrice,
        unit,
        total: quote.quotedTotal || null,
        timestamp: quote.acceptedAt || quote.createdAt,
        status: 'ACCEPTED',
      });
    } else if (quote.status === 'REJECTED') {
      events.push({
        id: `${quote.id}-rejected`,
        actor: 'Collector',
        actorName: 'Collector',
        actionType: 'REJECTED',
        notes: quote.rejectionReason,
        timestamp: quote.rejectedAt || quote.createdAt,
        status: 'REJECTED',
      });
    } else if (quote.status === 'CANCELLED') {
      events.push({
        id: `${quote.id}-cancelled`,
        actor: 'System',
        actorName: 'Platform',
        actionType: 'CANCELLED',
        notes: quote.cancellationReason === 'COMPETING_QUOTE_ACCEPTED' ? 'Another competing quote was accepted' : quote.cancellationReason,
        timestamp: quote.createdAt,
        status: 'CANCELLED',
      });
    }

    return events;
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
