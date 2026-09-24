/**
 * EcoSetu Mobile Pickup Batch Service
 * Canonical Reference: Marketplace Phase 5 - Advanced Logistics & Multi-Lot Consolidation
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage.js';
import networkService from './networkService';

export type BatchStatus =
  | 'PLANNED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'ARRIVED'
  | 'COLLECTING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PickupBatchLot {
  id: string;
  batchId: string;
  materialLotId: string;
  addedAt: string;
  status: string;
  materialLot?: {
    id: string;
    referenceNumber: string;
    category: string;
    subcategory?: string | null;
    approximateTotalWeightKg?: number | null;
    status: string;
    collectionArea?: string | null;
    collectionAddress?: string | null;
    acceptedQuote?: {
      id: string;
      referenceNumber: string;
      quotedUnitPrice: number;
      unit: string;
      quotedTotal?: number | null;
      recycler?: {
        id: string;
        facilityName: string;
        city?: string | null;
      };
    } | null;
    collector?: {
      id: string;
      city?: string | null;
      state?: string | null;
      user?: {
        name: string;
        phone?: string | null;
      };
    } | null;
  };
  handover?: {
    id: string;
    referenceNumber: string;
    status: string;
    handoverWeightKg?: number | null;
    declaredWeightKg?: number | null;
  } | null;
  transaction?: {
    id: string;
    referenceNumber: string;
    finalSaleValue: number;
    paymentStatus: string;
    paymentMethod: string;
  } | null;
}

export interface ConsolidatedSummary {
  totalLotsCount: number;
  completedLotsCount: number;
  totalEstimatedWeightKg: number;
  totalVerifiedWeightKg: number;
  totalFinalPayableAmount: number;
  isFullySettled: boolean;
}

export interface PickupBatch {
  id: string;
  referenceNumber: string;
  status: BatchStatus;
  scheduledDate?: string | null;
  scheduledTimeWindow?: string | null;
  pickupAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  lotsCount: number;
  totalEstimatedWeightKg: number;
  collector?: {
    id: string;
    city?: string | null;
    state?: string | null;
    user?: {
      name: string;
      phone?: string | null;
    };
  } | null;
  recycler?: {
    id: string;
    facilityName: string;
    city?: string | null;
    state?: string | null;
    user?: {
      name: string;
      phone?: string | null;
    };
  } | null;
  lots: PickupBatchLot[];
  consolidatedSummary: ConsolidatedSummary;
}

export interface CreateBatchPayload {
  materialLotIds: string[];
  scheduledDate?: string;
  scheduledTimeWindow?: string;
  pickupAddress?: string;
  notes?: string;
}

export interface UpdateBatchStatusPayload {
  status: BatchStatus;
  notes?: string;
  reason?: string;
}

class PickupBatchService {
  /**
   * List pickup batches with offline caching support
   */
  async getBatches(params?: { status?: string; page?: number; limit?: number }): Promise<{
    batches: PickupBatch[];
    pagination?: any;
    fromCache?: boolean;
  }> {
    const isConnected = networkService.isConnected();
    const cacheKey = `pickup_batches_${params?.status || 'all'}`;

    if (!isConnected) {
      const cached = await storage.getItem(cacheKey);
      if (cached) {
        return { batches: typeof cached === 'string' ? JSON.parse(cached) : cached, fromCache: true };
      }
      return { batches: [], fromCache: true };
    }

    try {
      const response = await apiClient.get('/api/v1/pickup-batches', { params });
      if (response?.data?.success) {
        const batches = response.data.data.batches || [];
        await storage.setItem(cacheKey, JSON.stringify(batches));
        return {
          batches,
          pagination: response.data.data.pagination,
          fromCache: false,
        };
      }
      throw new Error(response?.data?.message || 'Failed to fetch pickup batches');
    } catch (err: any) {
      const cached = await storage.getItem(cacheKey);
      if (cached) {
        return { batches: typeof cached === 'string' ? JSON.parse(cached) : cached, fromCache: true };
      }
      throw err;
    }
  }

  /**
   * Get single batch detail
   */
  async getBatchById(id: string): Promise<PickupBatch> {
    const isConnected = networkService.isConnected();
    const cacheKey = `pickup_batch_${id}`;

    if (!isConnected) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
      throw new Error('Offline: Detailed batch unavailable without connection');
    }

    const response = await apiClient.get(`/api/v1/pickup-batches/${id}`);
    if (response?.data?.success) {
      const batch = response.data.data.batch;
      await storage.setItem(cacheKey, JSON.stringify(batch));
      return batch;
    }
    throw new Error(response?.data?.message || 'Failed to retrieve pickup batch details');
  }

  /**
   * Create a new pickup batch
   */
  async createBatch(payload: CreateBatchPayload): Promise<PickupBatch> {
    const response = await apiClient.post('/api/v1/pickup-batches', payload);
    if (response?.data?.success) {
      return response.data.data.batch;
    }
    throw new Error(response?.data?.message || 'Failed to create pickup batch');
  }

  /**
   * Update pickup batch status
   */
  async updateBatchStatus(id: string, payload: UpdateBatchStatusPayload): Promise<PickupBatch> {
    const response = await apiClient.patch(`/api/v1/pickup-batches/${id}/status`, payload);
    if (response?.data?.success) {
      return response.data.data.batch;
    }
    throw new Error(response?.data?.message || 'Failed to update pickup batch status');
  }

  /**
   * Add lots to an existing active batch
   */
  async addLotsToBatch(id: string, materialLotIds: string[]): Promise<PickupBatch> {
    const response = await apiClient.post(`/api/v1/pickup-batches/${id}/lots`, { materialLotIds });
    if (response?.data?.success) {
      return response.data.data.batch;
    }
    throw new Error(response?.data?.message || 'Failed to add lots to pickup batch');
  }

  /**
   * Remove a lot from an active batch
   */
  async removeLotFromBatch(id: string, lotId: string): Promise<PickupBatch> {
    const response = await apiClient.delete(`/api/v1/pickup-batches/${id}/lots/${lotId}`);
    if (response?.data?.success) {
      return response.data.data.batch;
    }
    throw new Error(response?.data?.message || 'Failed to remove lot from batch');
  }

  /**
   * Get eligible lots for consolidation
   */
  async getEligibleLots(collectorId?: string): Promise<any[]> {
    const response = await apiClient.get('/api/v1/pickup-batches/eligible-lots', {
      params: collectorId ? { collectorId } : undefined,
    });
    if (response?.data?.success) {
      return response.data.data.lots || [];
    }
    throw new Error(response?.data?.message || 'Failed to fetch eligible lots for batching');
  }
}

export default new PickupBatchService();
