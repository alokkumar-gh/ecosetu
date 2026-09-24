/**
 * EcoSetu Mobile Bill & Receipt Service
 * Canonical Reference: SIH 26229 - Settlement Architecture: TransactionBill Model
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage';
import networkService from './networkService';

export interface TransactionBill {
  id: string;
  billNumber: string;
  transactionId: string;
  materialLotId: string;
  quoteId: string;
  handoverId: string;
  buyerUserId: string;
  sellerUserId: string;
  buyerRole: string;
  sellerRole: string;
  materialCategory: string;
  materialSubcategory?: string | null;
  quantity: number;
  unit: string;
  agreedRate: number;
  subtotal: number;
  adjustments: number;
  adjustmentReason?: string | null;
  finalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  providerReference?: string | null;
  verificationHash: string;
  qrVerificationUrl?: string | null;
  transactionDate: string;
  generatedAt: string;
  createdAt: string;
  buyer?: {
    id: string;
    name: string;
    phone?: string | null;
    role: string;
  };
  seller?: {
    id: string;
    name: string;
    phone?: string | null;
    role: string;
  };
  transaction?: {
    id: string;
    referenceNumber: string;
    transactionDate: string;
    finalSaleValue: number;
    amountPaid: number;
  };
  materialLot?: {
    id: string;
    referenceNumber: string;
    category: string;
    subcategory?: string | null;
  };
  quote?: {
    id: string;
    referenceNumber?: string;
    quotedUnitPrice: number;
    quotedTotal: number;
  };
  handover?: {
    id: string;
    referenceNumber: string;
    declaredWeightKg?: number | null;
    handoverWeightKg?: number | null;
  };
}

export interface ListBillsQuery {
  page?: number;
  limit?: number;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListBillsResponse {
  bills: TransactionBill[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const CACHE_KEY_BILLS_LIST = '@ecosetu_cache_bills_list';
const CACHE_PREFIX_BILL = '@ecosetu_cache_bill_';
const CACHE_PREFIX_TXN_BILL = '@ecosetu_cache_txn_bill_';

class BillService {
  /**
   * Fetch bills list (Supports offline cached read)
   */
  async listBills(params?: ListBillsQuery): Promise<ListBillsResponse> {
    const isOnline = await networkService.isOnline();

    if (!isOnline) {
      const cached = await storage.getItem(CACHE_KEY_BILLS_LIST);
      if (cached) {
        return cached as ListBillsResponse;
      }
      return { bills: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } };
    }

    try {
      const response = await apiClient.get('/bills', { params });
      const payload = response?.data?.data || response?.data || response;
      const data: ListBillsResponse = {
        bills: payload?.bills || (Array.isArray(payload) ? payload : []),
        pagination: payload?.pagination || { total: payload?.bills?.length || 0, page: 1, limit: 20, pages: 1 },
      };
      if (params?.page === 1 || !params?.page) {
        await storage.setItem(CACHE_KEY_BILLS_LIST, data);
      }
      return data;
    } catch (error) {
      const cached = await storage.getItem(CACHE_KEY_BILLS_LIST);
      if (cached) return cached as ListBillsResponse;
      throw error;
    }
  }

  /**
   * Fetch bill by ID
   */
  async getBillById(id: string): Promise<TransactionBill> {
    const isOnline = await networkService.isOnline();
    const cacheKey = `${CACHE_PREFIX_BILL}${id}`;

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as TransactionBill;
      throw new Error('Offline: Bill details not available in local cache.');
    }

    try {
      const response = await apiClient.get(`/bills/${id}`);
      const payload = response?.data?.data || response?.data || response;
      const bill = payload?.bill || payload;
      await storage.setItem(cacheKey, bill);
      return bill;
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as TransactionBill;
      throw error;
    }
  }

  /**
   * Fetch bill for a transaction ID
   */
  async getBillByTransactionId(transactionId: string): Promise<TransactionBill | null> {
    const isOnline = await networkService.isOnline();
    const cacheKey = `${CACHE_PREFIX_TXN_BILL}${transactionId}`;

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      return cached ? (cached as TransactionBill) : null;
    }

    try {
      const response = await apiClient.get(`/bills/transaction/${transactionId}`);
      const payload = response?.data?.data || response?.data || response;
      const bill = payload?.bill || payload;
      if (bill) {
        await storage.setItem(cacheKey, bill);
        await storage.setItem(`${CACHE_PREFIX_BILL}${bill.id}`, bill);
      }
      return bill;
    } catch (error: any) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as TransactionBill;
      if (error?.statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * Generate canonical bill for transaction (Server-authoritative, idempotent)
   */
  async generateBill(transactionId: string): Promise<TransactionBill> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error('Bill generation requires an active server connection.');
    }

    const response = await apiClient.post('/bills/generate', { transactionId });
    const payload = response?.data?.data || response?.data || response;
    const bill = payload?.bill || payload;
    await storage.setItem(`${CACHE_PREFIX_BILL}${bill.id}`, bill);
    await storage.setItem(`${CACHE_PREFIX_TXN_BILL}${transactionId}`, bill);
    return bill;
  }
}

export default new BillService();
