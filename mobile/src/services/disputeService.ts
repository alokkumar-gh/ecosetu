/**
 * EcoSetu Mobile Dispute Resolution & Return Service
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage.js';
import networkService from './networkService';

export type DisputeType =
  | 'WEIGHT_MISMATCH'
  | 'MATERIAL_MISMATCH'
  | 'CONDITION_MISMATCH'
  | 'PARTIAL_ACCEPTANCE'
  | 'HANDOVER_REJECTION'
  | 'HANDOVER_DISPUTE'
  | 'PAYMENT_DISPUTE'
  | 'CANCELLATION_REQUEST'
  | 'RETURN_REQUEST'
  | 'OTHER';

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_RESOLVED'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RETURN_PENDING'
  | 'RETURNED';

export type DisputeResolutionType =
  | 'WEIGHT_CORRECTION'
  | 'PRICE_ADJUSTMENT'
  | 'PARTIAL_ACCEPTANCE'
  | 'RETURN_ACCEPTED'
  | 'DEAL_CANCELLED'
  | 'REJECTED_NO_ACTION'
  | 'MUTUAL_AGREEMENT';

export interface MarketplaceDisputeEvent {
  id: string;
  disputeId: string;
  actorUserId: string;
  actorRole: string;
  eventType: string;
  previousStatus?: DisputeStatus | null;
  newStatus?: DisputeStatus | null;
  note?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface MarketplaceDispute {
  id: string;
  disputeReference: string;
  materialLotId: string;
  quoteId?: string | null;
  handoverId?: string | null;
  transactionId?: string | null;
  pickupBatchId?: string | null;
  openedByUserId: string;
  openedByRole: string;
  disputeType: DisputeType;
  description: string;
  evidenceUrls: string[];
  disputedEstimatedWeightKg?: number | null;
  disputedFinalWeightKg?: number | null;
  disputedQuantityKg?: number | null;
  disputedAmount?: number | null;
  resolvedWeightKg?: number | null;
  resolvedAmount?: number | null;
  status: DisputeStatus;
  resolutionType?: DisputeResolutionType | null;
  resolutionNotes?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  materialLot?: {
    id: string;
    referenceNumber: string;
    category: string;
    condition: string;
    approximateTotalWeightKg?: number | null;
  } | null;
  quote?: {
    id: string;
    referenceNumber: string;
    quotedUnitPrice: number;
    quotedTotal: number;
  } | null;
  handover?: {
    id: string;
    referenceNumber: string;
    handoverWeightKg?: number | null;
    status: string;
  } | null;
  transaction?: {
    id: string;
    referenceNumber: string;
    finalSaleValue: number;
    amountPaid: number;
    amountDue: number;
    paymentStatus: string;
  } | null;
  openedByUser?: {
    id: string;
    name: string;
    role: string;
  } | null;
  counterparty?: {
    id: string;
    name: string;
    role: string;
    phone?: string | null;
  } | null;
  events?: MarketplaceDisputeEvent[];
}

export interface OpenDisputePayload {
  materialLotId: string;
  quoteId?: string | null;
  handoverId?: string | null;
  transactionId?: string | null;
  pickupBatchId?: string | null;
  disputeType: DisputeType;
  description: string;
  evidenceUrls?: string[];
  disputedEstimatedWeightKg?: number | null;
  disputedFinalWeightKg?: number | null;
  disputedQuantityKg?: number | null;
  disputedAmount?: number | null;
}

export interface RespondDisputePayload {
  note: string;
  proposedWeightKg?: number | null;
  proposedAmount?: number | null;
  proposedAction?: string | null;
  acceptedQuantityKg?: number | null;
  rejectedQuantityKg?: number | null;
  evidenceUrls?: string[];
}

export interface ResolveDisputePayload {
  resolutionType: DisputeResolutionType;
  resolutionNotes: string;
  resolvedWeightKg?: number | null;
  resolvedAmount?: number | null;
  acceptedQuantityKg?: number | null;
  rejectedQuantityKg?: number | null;
}

export interface CancelDisputePayload {
  reason: string;
}

export interface InitiateReturnPayload {
  returnTrackingNotes?: string | null;
  quantityKg?: number | null;
}

export interface CompleteReturnPayload {
  completionNotes?: string | null;
}

class DisputeService {
  /**
   * List disputes with offline caching
   */
  async getDisputes(params?: {
    status?: DisputeStatus;
    disputeType?: DisputeType;
    materialLotId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    disputes: MarketplaceDispute[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const isOnline = networkService.isConnected();
    const cacheKey = `@ecosetu:disputes:${JSON.stringify(params || {})}`;

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached;
      return { disputes: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }

    try {
      const response = await apiClient.get('/disputes', { params });
      if (response.data?.success && response.data?.data) {
        await storage.setItem(cacheKey, response.data.data);
        return response.data.data;
      }
      return { disputes: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Get dispute details by ID with offline caching
   */
  async getDisputeById(id: string): Promise<MarketplaceDispute> {
    const cacheKey = `@ecosetu:dispute:${id}`;
    const isOnline = networkService.isConnected();

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await apiClient.get(`/disputes/${id}`);
      if (response.data?.success && response.data?.data) {
        await storage.setItem(cacheKey, response.data.data);
        return response.data.data;
      }
      throw new Error('Dispute not found');
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached;
      throw error;
    }
  }

  /**
   * Open a new dispute (Server authoritative)
   */
  async openDispute(payload: OpenDisputePayload): Promise<MarketplaceDispute> {
    const response = await apiClient.post('/disputes', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to open dispute');
  }

  /**
   * Counterparty responds to a dispute
   */
  async respondToDispute(id: string, payload: RespondDisputePayload): Promise<MarketplaceDispute> {
    const response = await apiClient.post(`/disputes/${id}/respond`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to respond to dispute');
  }

  /**
   * Resolve a dispute (Server calculates weights & finances)
   */
  async resolveDispute(id: string, payload: ResolveDisputePayload): Promise<MarketplaceDispute> {
    const response = await apiClient.post(`/disputes/${id}/resolve`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to resolve dispute');
  }

  /**
   * Cancel a dispute or deal
   */
  async cancelDispute(id: string, payload: CancelDisputePayload): Promise<MarketplaceDispute> {
    const response = await apiClient.post(`/disputes/${id}/cancel`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to cancel dispute');
  }

  /**
   * Initiate physical return
   */
  async initiateReturn(id: string, payload: InitiateReturnPayload): Promise<MarketplaceDispute> {
    const response = await apiClient.post(`/disputes/${id}/return`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to initiate return');
  }

  /**
   * Complete physical return
   */
  async completeReturn(id: string, payload: CompleteReturnPayload): Promise<MarketplaceDispute> {
    const response = await apiClient.post(`/disputes/${id}/return/complete`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to complete return');
  }
}

export default new DisputeService();
