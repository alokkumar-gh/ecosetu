/**
 * EcoSetu Mobile Sourcing & Recurring Trade Service
 * Canonical Reference: Marketplace Phase 6 - Demand Discovery, Sourcing Requests & Recurring Trade
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage.js';
import networkService from './networkService';

export type SourcingRequestStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAUSED'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'CANCELLED';

export type SourcingResponseStatus =
  | 'PENDING'
  | 'REVIEWED'
  | 'QUOTE_REQUESTED'
  | 'DECLINED'
  | 'CANCELLED';

export interface SourcingRequest {
  id: string;
  referenceNumber: string;
  recyclerId: string;
  materialCategory: string;
  materialSubcategory?: string | null;
  conditionTemplate?: string | null;
  minimumWeightKg: number;
  targetWeightKg?: number | null;
  maximumWeightKg?: number | null;
  offeredRatePerKg?: number | null;
  hasOfferedPrice: boolean;
  displayOfferedRate?: string;
  rateUnit?: string;
  priceValidityUntil?: string | null;
  pickupRequired: boolean;
  serviceArea?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  requestedByDate?: string | null;
  notes?: string | null;
  status: SourcingRequestStatus;
  createdAt: string;
  updatedAt: string;
  responsesCount?: number;
  recycler?: {
    id: string;
    facilityName: string;
    authorizationStatus?: string;
    city?: string | null;
    state?: string | null;
    rating?: number | null;
  } | null;
  responses?: SourcingResponse[];
}

export interface SourcingResponse {
  id: string;
  referenceNumber: string;
  sourcingRequestId: string;
  collectorId: string;
  availableWeightKg: number;
  condition?: string | null;
  pickupArea?: string | null;
  availableDate?: string | null;
  notes?: string | null;
  status: SourcingResponseStatus;
  createdAt: string;
  updatedAt: string;
  collector?: {
    id: string;
    city?: string | null;
    state?: string | null;
    user?: {
      name: string;
      phone?: string | null;
    };
  } | null;
  sourcingRequest?: {
    id: string;
    referenceNumber: string;
    materialCategory: string;
    materialSubcategory?: string | null;
    status: SourcingRequestStatus;
  } | null;
}

export interface TradingRelationship {
  hasPreviousTrade: boolean;
  completedTransactionsCount: number;
  totalWeightKg: number;
  totalValueINR: number;
  categoriesTraded: string[];
  lastTransactionDate?: string | null;
  relationshipEstablishedDate?: string | null;
}

export interface SellAgainTemplate {
  category: string;
  subcategory?: string | null;
  condition?: string | null;
  preferredPickupArea?: string | null;
  sourceLotReference?: string | null;
}

export interface SourceAgainTemplate {
  materialCategory: string;
  materialSubcategory?: string | null;
  conditionTemplate?: string | null;
  minimumWeightKg: number;
  targetWeightKg?: number | null;
  maximumWeightKg?: number | null;
  offeredRatePerKg?: number | null;
  pickupRequired: boolean;
  serviceArea?: string | null;
  sourceRequestReference?: string | null;
}

export interface CreateSourcingRequestPayload {
  materialCategory: string;
  materialSubcategory?: string;
  conditionTemplate?: string;
  minimumWeightKg: number;
  targetWeightKg?: number;
  maximumWeightKg?: number;
  offeredRatePerKg?: number;
  pickupRequired?: boolean;
  serviceArea?: string;
  city?: string;
  state?: string;
  pincode?: string;
  requestedByDate?: string;
  notes?: string;
  status?: SourcingRequestStatus;
}

export interface RespondToRequestPayload {
  availableWeightKg: number;
  condition?: string;
  pickupArea?: string;
  availableDate?: string;
  notes?: string;
}

class SourcingService {
  /**
   * Get demand feed / sourcing requests list with offline caching
   */
  async getRequests(params?: {
    category?: string;
    status?: string;
    city?: string;
    pickupRequired?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    requests: SourcingRequest[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const isOnline = networkService.isConnected();
    const cacheKey = `@ecosetu:sourcing_requests:${JSON.stringify(params || {})}`;

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      if (cached) {
        return cached;
      }
      return { requests: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }

    try {
      const response = await apiClient.get('/sourcing-requests', { params });
      if (response.data?.success && response.data?.data) {
        await storage.setItem(cacheKey, response.data.data);
        return response.data.data;
      }
      return { requests: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  /**
   * Get single sourcing request details by ID
   */
  async getRequestById(id: string): Promise<SourcingRequest> {
    const cacheKey = `@ecosetu:sourcing_request:${id}`;
    const isOnline = networkService.isConnected();

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await apiClient.get(`/sourcing-requests/${id}`);
      if (response.data?.success && response.data?.data) {
        await storage.setItem(cacheKey, response.data.data);
        return response.data.data;
      }
      throw new Error('Sourcing request not found');
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Create / publish a new Sourcing Request (Recycler only)
   */
  async createRequest(payload: CreateSourcingRequestPayload): Promise<SourcingRequest> {
    const response = await apiClient.post('/sourcing-requests', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to create sourcing request');
  }

  /**
   * Update sourcing request status (OPEN, PAUSED, CANCELLED, FULFILLED)
   */
  async updateRequestStatus(
    id: string,
    status: SourcingRequestStatus,
    reason?: string
  ): Promise<SourcingRequest> {
    const response = await apiClient.patch(`/sourcing-requests/${id}`, { status, reason });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update request status');
  }

  /**
   * Collector responds to a Sourcing Request
   */
  async respondToRequest(
    requestId: string,
    payload: RespondToRequestPayload
  ): Promise<SourcingResponse> {
    const response = await apiClient.post(`/sourcing-requests/${requestId}/respond`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to respond to sourcing request');
  }

  /**
   * Collector updates an existing response
   */
  async updateResponse(
    responseId: string,
    payload: Partial<RespondToRequestPayload>
  ): Promise<SourcingResponse> {
    const response = await apiClient.patch(`/sourcing-responses/${responseId}`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update response');
  }

  /**
   * Recycler gets all responses for a sourcing request
   */
  async getResponsesForRequest(requestId: string): Promise<SourcingResponse[]> {
    const response = await apiClient.get(`/sourcing-requests/${requestId}/responses`);
    if (response.data?.success && response.data?.data) {
      return response.data.data.responses || [];
    }
    return [];
  }

  /**
   * Get factual repeat trading relationship between two counterparties
   */
  async getTradingRelationship(counterpartyUserId: string): Promise<TradingRelationship> {
    const response = await apiClient.get(`/recurring-trade/relationship/${counterpartyUserId}`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return {
      hasPreviousTrade: false,
      completedTransactionsCount: 0,
      totalWeightKg: 0,
      totalValueINR: 0,
      categoriesTraded: [],
    };
  }

  /**
   * Get Sell Again template from completed lot
   */
  async getSellAgainTemplate(lotId: string): Promise<SellAgainTemplate> {
    const response = await apiClient.get(`/recurring-trade/sell-again-template/${lotId}`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to generate sell-again template');
  }

  /**
   * Get Source Again template from previous request
   */
  async getSourceAgainTemplate(requestId: string): Promise<SourceAgainTemplate> {
    const response = await apiClient.get(`/recurring-trade/source-again-template/${requestId}`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to generate source-again template');
  }
}

export default new SourcingService();
