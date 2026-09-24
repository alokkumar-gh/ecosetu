/**
 * EcoSetu Mobile Material Lot Service
 * Handles online API operations and offline draft persistence/queueing.
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4
 */

import { apiClient } from './apiClient';
import { networkService } from './networkService';
import { offlineStore } from './offlineStore';
import { offlineQueue } from './offlineQueue';
import { QUEUE_ACTION_TYPES, MATERIAL_LOT_STATUS } from '../utils/constants';

export interface CreateLotPayload {
  category: string;
  subcategory?: string;
  description?: string;
  approximateTotalWeightKg?: number;
  approximateWeightKg?: number;
  condition?: string;
  sourceType?: string;
  status?: string;
  listingPurpose?: 'RECYCLING' | 'REUSE' | 'REPAIR_REUSE';
  askingPrice?: number | null;
  priceUnit?: string | null;
  collectionLat?: number | null;
  collectionLng?: number | null;
  collectionAccuracy?: number | null;
  collectionTimestamp?: string | null;
  photos?: Array<{ photoUrl: string; capturedAt?: string; fileSize?: number; mimeType?: string } | string>;
  itemIds?: string[];
  clientReferenceId?: string;
}

export interface MaterialLotItem {
  id: string;
  referenceNumber: string;
  clientReferenceId?: string;
  collectorId: string;
  status: string;
  listingPurpose?: 'RECYCLING' | 'REUSE' | 'REPAIR_REUSE';
  askingPrice?: number | null;
  priceUnit?: string | null;
  category: string;
  subcategory?: string;
  description?: string;
  approximateTotalWeightKg?: number;
  condition?: string;
  sourceType?: string;
  collectionLat?: number | null;
  collectionLng?: number | null;
  collectionAccuracy?: number | null;
  collectionLatitude?: number | null;
  collectionLongitude?: number | null;
  locationAccuracyMeters?: number | null;
  collectionTimestamp?: string | null;
  createdAt: string;
  updatedAt: string;
  collector?: {
    id: string;
    city?: string | null;
    serviceArea?: string | null;
    state?: string | null;
    user?: {
      id: string;
      name: string;
      phone?: string | null;
    };
  };
  photos?: Array<{
    id: string;
    photoUrl: string;
    capturedAt?: string;
  }>;
  items?: Array<{
    id: string;
    materialItem: {
      id: string;
      referenceId: string;
      category: string;
      approximateWeightKg?: number;
    };
  }>;
  isOfflineDraft?: boolean;
  pendingSync?: boolean;
}

class MaterialLotService {
  /**
   * Create a material lot (draft or submitted)
   */
  async createLot(payload: CreateLotPayload): Promise<MaterialLotItem> {
    const isOnline = networkService.isConnected();
    const clientRefId = payload.clientReferenceId || `client_lot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullPayload = { ...payload, clientReferenceId: clientRefId };

    if (isOnline) {
      try {
        const response: any = await apiClient.request('/material-lots', {
          method: 'POST',
          body: fullPayload,
        });
        const serverLot = response.data?.lot || response.lot || response.data;
        if (serverLot) {
          await offlineStore.saveLotDraft(serverLot);
          return serverLot;
        }
      } catch (err: any) {
        // If network error during call, fallback to offline draft
        if (!networkService.isConnected() || err.isRetryable) {
          console.warn('[MaterialLotService] Falling back to offline draft:', err.message);
        } else {
          throw err;
        }
      }
    }

    // Offline draft creation
    const tempLotId = `temp_lot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tempRefNumber = `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-LOCAL`;

    const localDraft: MaterialLotItem = {
      id: tempLotId,
      referenceNumber: tempRefNumber,
      clientReferenceId: clientRefId,
      collectorId: 'local_collector',
      status: payload.status || MATERIAL_LOT_STATUS.DRAFT,
      category: payload.category,
      subcategory: payload.subcategory,
      description: payload.description,
      approximateTotalWeightKg: payload.approximateTotalWeightKg || payload.approximateWeightKg,
      condition: payload.condition || 'UNKNOWN',
      sourceType: payload.sourceType || 'HOUSEHOLD',
      collectionLat: payload.collectionLat,
      collectionLng: payload.collectionLng,
      collectionAccuracy: payload.collectionAccuracy,
      collectionTimestamp: payload.collectionTimestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      photos: (payload.photos || []).map((p, idx) => ({
        id: `temp_photo_${idx}`,
        photoUrl: typeof p === 'string' ? p : p.photoUrl,
        capturedAt: new Date().toISOString(),
      })),
      isOfflineDraft: true,
      pendingSync: payload.status === MATERIAL_LOT_STATUS.OPEN,
    };

    await offlineStore.saveLotDraft(localDraft);

    // If user requested to submit as OPEN, queue sync action for when online
    if (payload.status === MATERIAL_LOT_STATUS.OPEN) {
      await offlineQueue.enqueue({
        type: QUEUE_ACTION_TYPES.CREATE_MATERIAL_LOT,
        endpoint: '/material-lots',
        method: 'POST',
        payload: fullPayload,
        localId: tempLotId,
      });
    }

    return localDraft;
  }

  /**
   * List material lots (collector's lots)
   */
  async listLots(query: { status?: string; category?: string; page?: number; limit?: number } = {}): Promise<{
    lots: MaterialLotItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const isOnline = networkService.isConnected();
    const cachedLots: MaterialLotItem[] = (await offlineStore.getCachedLots()) as unknown as MaterialLotItem[];

    if (isOnline) {
      try {
        const queryParams = new URLSearchParams();
        if (query.status) queryParams.append('status', query.status);
        if (query.category) queryParams.append('category', query.category);
        if (query.page) queryParams.append('page', String(query.page));
        if (query.limit) queryParams.append('limit', String(query.limit));

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const response: any = await apiClient.request(`/material-lots${queryString}`, {
          method: 'GET',
        });

        const serverLots: MaterialLotItem[] = response.data?.lots || response.lots || [];

        // Cache server lots
        await offlineStore.cacheLots(serverLots);

        // Merge any unsynced offline drafts
        const pendingDrafts = cachedLots.filter((l) => l.isOfflineDraft);
        const mergedLots = [...pendingDrafts, ...serverLots];

        return {
          lots: mergedLots,
          total: response.data?.total || mergedLots.length,
          page: response.data?.page || 1,
          totalPages: response.data?.totalPages || 1,
        };
      } catch (err) {
        console.warn('[MaterialLotService] listLots error, returning cached lots:', err);
      }
    }

    // Offline filter
    let filtered = cachedLots;
    if (query.status) {
      filtered = filtered.filter((l) => l.status === query.status);
    }
    if (query.category) {
      filtered = filtered.filter((l) => l.category === query.category);
    }

    return {
      lots: filtered,
      total: filtered.length,
      page: 1,
      totalPages: 1,
    };
  }

  /**
   * Discover available reusable items for Citizen Consumer Marketplace
   */
  async getConsumerMarketplaceLots(query: {
    category?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
    forceRefresh?: boolean;
  } = {}): Promise<{ lots: MaterialLotItem[]; total: number; page: number; totalPages: number }> {
    const isOnline = networkService.isConnected();
    const page = query.page || 1;
    const limit = query.limit || 20;

    if (isOnline) {
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('page', String(page));
        queryParams.append('limit', String(limit));
        if (query.category) queryParams.append('category', query.category);
        if (query.condition) queryParams.append('condition', query.condition);
        if (query.minPrice !== undefined && query.minPrice !== null) queryParams.append('minPrice', String(query.minPrice));
        if (query.maxPrice !== undefined && query.maxPrice !== null) queryParams.append('maxPrice', String(query.maxPrice));
        if (query.search) queryParams.append('search', query.search);
        if (query.sortBy) queryParams.append('sortBy', query.sortBy);

        const response: any = await apiClient.get(`/material-lots?${queryParams.toString()}`, {
          cacheTtlMs: query.forceRefresh ? 0 : 30000,
          forceRefresh: Boolean(query.forceRefresh),
        });

        const data = response.data || response;
        return {
          lots: data.lots || [],
          total: data.total || 0,
          page: data.page || page,
          totalPages: data.totalPages || 1,
        };
      } catch (err: any) {
        console.warn('[MaterialLotService] getConsumerMarketplaceLots online failed:', err.message);
      }
    }

    return {
      lots: [],
      total: 0,
      page,
      totalPages: 1,
    };
  }

  /**
   * Get single lot details by ID
   */
  async getLotById(lotId: string): Promise<MaterialLotItem> {
    const isOnline = networkService.isConnected();

    if (isOnline) {
      try {
        const response: any = await apiClient.request(`/material-lots/${lotId}`, {
          method: 'GET',
        });
        const serverLot = response.data?.lot || response.lot || response.data;
        if (serverLot) {
          await offlineStore.saveLotDraft(serverLot);
          return serverLot;
        }
      } catch (err) {
        console.warn('[MaterialLotService] getLotById network error, searching cache:', err);
      }
    }

    const cachedLots: MaterialLotItem[] = (await offlineStore.getCachedLots()) as unknown as MaterialLotItem[];
    const found = cachedLots.find((l) => l.id === lotId);
    if (found) {
      return found;
    }

    throw new Error('Material lot not found locally or remotely');
  }

  /**
   * Update material lot (draft update or submit OPEN)
   */
  async updateLot(lotId: string, payload: Partial<CreateLotPayload>): Promise<MaterialLotItem> {
    const isOnline = networkService.isConnected();

    if (isOnline) {
      const response: any = await apiClient.request(`/material-lots/${lotId}`, {
        method: 'PATCH',
        body: payload,
      });
      const serverLot = response.data?.lot || response.lot || response.data;
      if (serverLot) {
        await offlineStore.saveLotDraft(serverLot);
        return serverLot;
      }
    }

    // Offline update
    const cachedLots: MaterialLotItem[] = (await offlineStore.getCachedLots()) as unknown as MaterialLotItem[];
    const existing = cachedLots.find((l) => l.id === lotId);
    if (existing) {
      const updatedPhotos = payload.photos
        ? payload.photos.map((p, idx) => ({
            id: `temp_photo_${idx}`,
            photoUrl: typeof p === 'string' ? p : p.photoUrl,
            capturedAt: new Date().toISOString(),
          }))
        : existing.photos;

      const updated: MaterialLotItem = {
        ...existing,
        ...payload,
        photos: updatedPhotos,
        status: payload.status || existing.status,
        updatedAt: new Date().toISOString(),
        pendingSync: payload.status === MATERIAL_LOT_STATUS.OPEN,
      };
      await offlineStore.saveLotDraft(updated);

      if (payload.status === MATERIAL_LOT_STATUS.OPEN) {
        await offlineQueue.enqueue({
          type: QUEUE_ACTION_TYPES.CREATE_MATERIAL_LOT,
          endpoint: `/material-lots/${lotId}`,
          method: 'PATCH',
          payload,
          localId: lotId,
        });
      }

      return updated;
    }

    throw new Error('Lot not found in local store to update');
  }

  /**
   * Get marketplace overview metrics for Collector or Recycler (Phase 3)
   */
  async getMarketplaceOverview(): Promise<CollectorMarketplaceOverview | RecyclerMarketplaceOverview> {
    const isOnline = networkService.isConnected();
    if (isOnline) {
      try {
        const response: any = await apiClient.request('/material-lots/marketplace/overview', {
          method: 'GET',
        });
        const data = response.data || response;
        if (data) {
          return data;
        }
      } catch (err: any) {
        console.warn('[MaterialLotService] Failed to fetch marketplace overview online:', err.message);
      }
    }

    // Default offline fallback
    return {
      role: 'INFORMAL_COLLECTOR',
      metrics: {
        activeListings: 0,
        offersReceived: 0,
        activeNegotiations: 0,
        acceptedDeals: 0,
        completedSales: 0,
      },
      recentListings: [],
    };
  }

  /**
   * Get factual market statistics for a material category
   */
  async getMarketStats(category: string, subcategory?: string): Promise<MaterialMarketStats> {
    const isOnline = networkService.isConnected();
    if (isOnline) {
      try {
        let url = `/material-lots/marketplace/market-stats?category=${encodeURIComponent(category)}`;
        if (subcategory) url += `&subcategory=${encodeURIComponent(subcategory)}`;
        const response: any = await apiClient.request(url, {
          method: 'GET',
        });
        return response.data || response;
      } catch (err: any) {
        console.warn('[MaterialLotService] Failed to fetch market stats online:', err.message);
      }
    }

    return {
      category,
      subcategory: subcategory || null,
      availableLotsCount: 0,
      activeBuyerOffersCount: 0,
      recentCompletedSalesCount: 0,
      activeRecyclerRatesCount: 0,
      verifiedPriceStandard: null,
      latestTransactionRate: null,
    };
  }
}

export interface CollectorMarketplaceOverview {
  role: 'INFORMAL_COLLECTOR';
  metrics: {
    activeListings: number;
    offersReceived: number;
    activeNegotiations: number;
    acceptedDeals: number;
    completedSales: number;
  };
  recentListings: Array<{
    id: string;
    referenceNumber: string;
    category: string;
    subcategory?: string | null;
    weightKg?: number | null;
    status: string;
    offerCount: number;
    latestOffer?: {
      rate: number;
      unit: string;
      timestamp: string;
    } | null;
    updatedAt: string;
    createdAt: string;
  }>;
}

export interface RecyclerMarketplaceOverview {
  role: 'RECYCLER';
  metrics: {
    availableLots: number;
    nearbyLots: number;
    newToday: number;
    myActiveOffers: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
}

export interface MaterialMarketStats {
  category: string;
  subcategory?: string | null;
  availableLotsCount: number;
  activeBuyerOffersCount: number;
  recentCompletedSalesCount: number;
  activeRecyclerRatesCount: number;
  verifiedPriceStandard?: {
    buyingPrice: number;
    unit: string;
    sourceLabel: string;
    effectiveDate: string;
  } | null;
  latestTransactionRate?: {
    rate: number;
    unit: string;
    timestamp: string;
  } | null;
}

export const materialLotService = new MaterialLotService();
export default materialLotService;
