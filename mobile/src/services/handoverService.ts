/**
 * EcoSetu Mobile Handover Service
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)
 */

import apiClient from './apiClient';
import offlineStore from './offlineStore';
import networkService from './networkService';

export interface HandoverPhotoItem {
  id: string;
  photoUrl: string;
  storagePath?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  caption?: string | null;
  capturedAt?: string | null;
}

export interface HandoverRecord {
  id: string;
  referenceNumber: string;
  materialLotId: string;
  quoteId: string;
  collectorId: string;
  recyclerId: string;
  status: 'PENDING_COLLECTOR' | 'COLLECTOR_CONFIRMED' | 'RECYCLER_CONFIRMED' | 'CONFIRMED' | 'CANCELLED';
  declaredWeightKg?: number | null;
  handoverWeightKg?: number | null;
  handoverTimestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyMeters?: number | null;
  locationAvailable: boolean;
  collectorConfirmedAt?: string | null;
  recyclerConfirmedAt?: string | null;
  finalConfirmedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  materialLot?: {
    id: string;
    referenceNumber: string;
    category: string;
    subcategory?: string | null;
    approximateTotalWeightKg?: number | null;
  };
  quote?: {
    id: string;
    referenceNumber: string;
    quotedUnitPrice: number;
    unit: string;
    currency: string;
    quotedTotal?: number | null;
  };
  collector?: {
    id: string;
    city?: string | null;
    state?: string | null;
    user?: {
      id: string;
      name: string;
    };
  };
  recycler?: {
    id: string;
    facilityName: string;
    authorizationStatus: string;
    city?: string | null;
    state?: string | null;
    user?: {
      id: string;
      name: string;
    };
  };
  photos: HandoverPhotoItem[];
}

export interface HandoverReceipt {
  title: string;
  referenceNumber: string;
  lotReference: string;
  category: string;
  subcategory?: string | null;
  declaredWeightKg?: number | null;
  confirmedWeightKg?: number | null;
  weightVarianceKg?: number | null;
  weightVariancePercent?: number | null;
  quotedUnitPrice: number;
  unit: string;
  quotedTotal?: number | null;
  currency: string;
  collector: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  };
  recycler: {
    id: string;
    facilityName: string;
    authorizationStatus: string;
    city?: string | null;
    state?: string | null;
  };
  handoverTimestamp: string;
  location: {
    status: 'GPS_CAPTURED' | 'GPS_UNAVAILABLE';
    latitude?: number | null;
    longitude?: number | null;
    accuracyMeters?: number | null;
  };
  confirmations: {
    collector: {
      confirmed: boolean;
      timestamp?: string | null;
    };
    recycler: {
      confirmed: boolean;
      timestamp?: string | null;
    };
    finalConfirmedAt?: string | null;
  };
  status: string;
  photos: Array<{
    id: string;
    photoUrl: string;
    caption?: string | null;
    capturedAt?: string | null;
  }>;
  notes?: string | null;
  complianceDisclaimer: string;
  traceabilityBasis: string;
  isFromCache?: boolean;
  cachedAt?: string | null;
  isStale?: boolean;
}

export interface CreateHandoverPayload {
  materialLotId: string;
  quoteId: string;
  handoverWeightKg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyMeters?: number | null;
  locationAvailable?: boolean;
  notes?: string;
  photos?: Array<string | { photoUrl: string; caption?: string; storagePath?: string }>;
}

export interface CollectorConfirmPayload {
  handoverWeightKg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyMeters?: number | null;
  notes?: string;
  photos?: Array<string | { photoUrl: string; caption?: string; storagePath?: string }>;
}

export interface RecyclerConfirmPayload {
  handoverWeightKg?: number | null;
  notes?: string;
}

class MobileHandoverService {
  /**
   * Initiate digital handover (Strictly Online-only)
   */
  async createHandover(payload: CreateHandoverPayload): Promise<HandoverRecord> {
    if (!networkService.isOnline()) {
      throw new Error('Internet connection required to initiate a verifiable digital handover.');
    }

    const response = await apiClient.post('/handovers', payload);
    return response.data.data;
  }

  /**
   * Collector confirms material handover (Strictly Online-only)
   */
  async collectorConfirm(handoverId: string, payload: CollectorConfirmPayload = {}): Promise<HandoverRecord> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to confirm handover. Handover confirmation requires online verification.');
    }

    const response = await apiClient.post(`/handovers/${handoverId}/collector-confirm`, payload);
    return response.data.data;
  }

  /**
   * Recycler confirms receipt (Strictly Online-only)
   */
  async recyclerConfirm(handoverId: string, payload: RecyclerConfirmPayload = {}): Promise<HandoverRecord> {
    if (!networkService.isOnline()) {
      throw new Error('Connect to internet to confirm receipt. Recycler confirmation requires online verification.');
    }

    const response = await apiClient.post(`/handovers/${handoverId}/recycler-confirm`, payload);
    return response.data.data;
  }

  /**
   * Get single handover record details
   */
  async getHandoverById(handoverId: string): Promise<HandoverRecord> {
    const response = await apiClient.get(`/handovers/${handoverId}`);
    return response.data.data;
  }

  /**
   * Get verifiable digital handover receipt (with offline cache fallback)
   */
  async getHandoverReceipt(handoverId: string): Promise<HandoverReceipt> {
    const isOnline = networkService.isOnline();

    if (isOnline) {
      try {
        const response = await apiClient.get(`/handovers/${handoverId}/receipt`);
        if (response.data && response.data.status === 'success') {
          const result = response.data.data;
          await offlineStore.cacheHandover(handoverId, result);
          return {
            ...result,
            isFromCache: false,
          };
        }
      } catch (err) {
        console.warn('[MobileHandoverService] Online receipt fetch failed, falling back to cache:', err);
      }
    }

    // Offline cache fallback
    const cached = await offlineStore.getCachedHandover(handoverId);
    if (cached.data) {
      return {
        ...(cached.data as HandoverReceipt),
        isFromCache: true,
        cachedAt: cached.cachedAt,
        isStale: cached.isStale,
      };
    }

    if (!isOnline) {
      throw new Error('No offline cached receipt found for this handover. Connect to internet to view receipt.');
    }

    throw new Error('Failed to load handover receipt');
  }

  /**
   * Get handovers for a material lot (with offline cache fallback)
   */
  async getHandoversForLot(lotId: string): Promise<HandoverRecord[]> {
    const isOnline = networkService.isOnline();

    if (isOnline) {
      try {
        const response = await apiClient.get(`/material-lots/${lotId}/handovers`);
        if (response.data && response.data.status === 'success') {
          const results = response.data.data;
          await offlineStore.cacheLotHandovers(lotId, results);
          return results;
        }
      } catch (err) {
        console.warn('[MobileHandoverService] Online lot handovers fetch failed, falling back to cache:', err);
      }
    }

    const cached = await offlineStore.getCachedLotHandovers(lotId);
    if (cached.data) {
      return cached.data as HandoverRecord[];
    }

    return [];
  }

  /**
   * Generate vernacular spoken explanation for accessible TTS
   */
  generateHandoverSpeechText(receipt: HandoverReceipt, locale: string = 'en'): string {
    const ref = receipt.referenceNumber;
    const material = receipt.category;
    const weight = receipt.confirmedWeightKg || receipt.declaredWeightKg || 0;
    const recycler = receipt.recycler?.facilityName || 'Recycler';
    const status = receipt.status;

    switch (locale) {
      case 'hi':
        return `डिजिटल हैंडओवर संदर्भ ${ref}। सामग्री ${material}, वजन ${weight} किलोग्राम। रीसाइक्लर ${recycler}। वर्तमान स्थिति ${status} है। ध्यान दें, यह रिकॉर्ड सामग्री हस्तांतरण की पुष्टि करता है, भुगतान की नहीं।`;
      case 'mr':
        return `डिजिटल हँडओव्हर संदर्भ ${ref}. साहित्य ${material}, वजन ${weight} किलो. रिसायकलर ${recycler}. सद्य स्थिती ${status} आहे. लक्षात ठेवा, ही नोंद साहित्य हस्तांतरणाची पुष्टी करते, देयकाची नाही.`;
      case 'or':
        return `ଡିଜିଟାଲ୍ ହସ୍ତାନ୍ତର ରେଫରେନ୍ସ ${ref}। ସାମଗ୍ରୀ ${material}, ଓଜନ ${weight} କିଲୋଗ୍ରାମ। ରିସାଇକ୍ଲର ${recycler}। ବର୍ତ୍ତମାନର ସ୍ଥିତି ${status} ଅଟେ। ମନେରଖନ୍ତୁ, ଏହି ରେକର୍ଡ ସାମଗ୍ରୀ ହସ୍ତାନ୍ତର ନିଶ୍ଚିତ କରେ, ପେମେଣ୍ଟ ନୁହେଁ।`;
      default:
        return `Digital Handover reference ${ref}. Material ${material}, weight ${weight} kg. Recycler ${recycler}. Current status is ${status}. Note: this record confirms material handover, not payment.`;
    }
  }
}

export const handoverService = new MobileHandoverService();
export default handoverService;
