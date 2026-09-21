/**
 * EcoSetu Mobile Transaction Service
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 7: Payment Recording + Transaction Dataset
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage';
import networkService from './networkService';

export interface TransactionRecord {
  id: string;
  referenceNumber: string;
  materialLotId: string;
  quoteId: string;
  handoverId: string;
  collectorId: string;
  recyclerId: string;
  collectorProfileId?: string;
  recyclerProfileId?: string;
  category: string;
  subcategory?: string | null;
  quantity: number;
  unit: string;
  quotedUnitPrice: number;
  quotedTotal: number;
  finalUnitPrice: number;
  finalSaleValue: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  transactionType: 'MATERIAL_SALE';
  paymentMethod: 'CASH' | 'UPI_RECORDED' | 'BANK_TRANSFER_RECORDED' | 'OTHER';
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'FAILED' | 'NOT_APPLICABLE';
  transactionStatus: 'DRAFT' | 'RECORDED' | 'CANCELLED';
  transactionDate: string;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyMeters?: number | null;
  notes?: string | null;
  disclaimer?: string | null;
  differenceFromQuote?: number;
  variancePercent?: number;
  isPriceAdjusted?: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
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
    referenceNumber?: string;
    quotedUnitPrice: number;
    quotedTotal: number;
    unit: string;
    currency: string;
  };
  handover?: {
    id: string;
    referenceNumber: string;
    declaredWeightKg?: number | null;
    handoverWeightKg?: number | null;
    status: string;
  };
  collector?: {
    id: string;
    user?: {
      id: string;
      name: string;
      phone?: string | null;
    };
  };
  recycler?: {
    id: string;
    facilityName: string;
    user?: {
      id: string;
      name: string;
      phone?: string | null;
    };
  };
}

export interface CreateTransactionPayload {
  handoverId: string;
  finalSaleValue: number;
  finalUnitPrice?: number;
  paymentMethod: 'CASH' | 'UPI_RECORDED' | 'BANK_TRANSFER_RECORDED' | 'OTHER';
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'FAILED' | 'NOT_APPLICABLE';
  amountPaid?: number;
  notes?: string;
}

export interface UpdatePaymentStatusPayload {
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'FAILED' | 'NOT_APPLICABLE';
  amountPaid?: number;
  paymentMethod?: 'CASH' | 'UPI_RECORDED' | 'BANK_TRANSFER_RECORDED' | 'OTHER';
  notes?: string;
}

export interface CancelTransactionPayload {
  reason: string;
}

const CACHE_KEY_TRANSACTIONS_LIST = '@ecosetu_cache_transactions_list';
const CACHE_PREFIX_TRANSACTION = '@ecosetu_cache_txn_';
const CACHE_PREFIX_HANDOVER_TXN = '@ecosetu_cache_txn_hdo_';

class TransactionService {
  /**
   * Create / Record a new Economic Transaction (Online-only)
   */
  async createTransaction(payload: CreateTransactionPayload): Promise<TransactionRecord> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error(
        'Transaction recording requires an active internet connection. Please reconnect and try again.'
      );
    }

    const response = await apiClient.post('/transactions', payload);
    const transaction = response.data.data.transaction;

    // Cache locally for offline access
    await storage.setItem(`${CACHE_PREFIX_TRANSACTION}${transaction.id}`, transaction);
    await storage.setItem(`${CACHE_PREFIX_HANDOVER_TXN}${payload.handoverId}`, transaction);

    return transaction;
  }

  /**
   * Get Transaction details by ID (Supports offline cached read)
   */
  async getTransactionById(id: string): Promise<TransactionRecord> {
    const isOnline = await networkService.isOnline();
    const cacheKey = `${CACHE_PREFIX_TRANSACTION}${id}`;

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as TransactionRecord;
      throw new Error('Offline: Transaction record not available in local cache.');
    }

    try {
      const response = await apiClient.get(`/transactions/${id}`);
      const transaction = response.data.data.transaction;
      await storage.setItem(cacheKey, transaction);
      return transaction;
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as TransactionRecord;
      throw error;
    }
  }

  /**
   * Get Transaction for a specific Handover
   */
  async getTransactionByHandoverId(handoverId: string): Promise<TransactionRecord | null> {
    const isOnline = await networkService.isOnline();
    const cacheKey = `${CACHE_PREFIX_HANDOVER_TXN}${handoverId}`;

    if (!isOnline) {
      return (await storage.getItem(cacheKey)) as TransactionRecord | null;
    }

    try {
      const response = await apiClient.get(`/transactions/handover/${handoverId}`);
      const transaction = response.data.data.transaction;
      if (transaction) {
        await storage.setItem(cacheKey, transaction);
        await storage.setItem(`${CACHE_PREFIX_TRANSACTION}${transaction.id}`, transaction);
      }
      return transaction;
    } catch (error) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as TransactionRecord;
      throw error;
    }
  }

  /**
   * List Transactions with pagination
   */
  async getTransactions(query: any = {}): Promise<{
    transactions: TransactionRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    isOffline?: boolean;
  }> {
    const isOnline = await networkService.isOnline();

    if (!isOnline) {
      const cached = await storage.getItem(CACHE_KEY_TRANSACTIONS_LIST);

      if (cached) {
        return { ...(cached as any), isOffline: true };
      }
      return { transactions: [], total: 0, page: 1, limit: 20, totalPages: 0, isOffline: true };
    }

    try {
      const response = await apiClient.get('/transactions', { params: query });
      const data = response.data.data;
      await storage.setItem(CACHE_KEY_TRANSACTIONS_LIST, data);
      return { ...data, isOffline: false };
    } catch (error) {
      const cached = await storage.getItem(CACHE_KEY_TRANSACTIONS_LIST);
      if (cached) {
        return { ...(cached as any), isOffline: true };
      }
      throw error;
    }
  }

  /**
   * Update Payment Status
   */
  async updatePaymentStatus(
    id: string,
    payload: UpdatePaymentStatusPayload
  ): Promise<TransactionRecord> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error(
        'Updating payment status requires an active internet connection. Offline updates are blocked.'
      );
    }

    const response = await apiClient.patch(`/transactions/${id}/payment-status`, payload);
    const transaction = response.data.data.transaction;

    await storage.setItem(`${CACHE_PREFIX_TRANSACTION}${transaction.id}`, transaction);
    return transaction;
  }

  /**
   * Cancel Transaction
   */
  async cancelTransaction(
    id: string,
    payload: CancelTransactionPayload
  ): Promise<TransactionRecord> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error(
        'Cancelling a transaction requires an active internet connection.'
      );
    }

    const response = await apiClient.post(`/transactions/${id}/cancel`, payload);
    const transaction = response.data.data.transaction;

    await storage.setItem(`${CACHE_PREFIX_TRANSACTION}${transaction.id}`, transaction);
    return transaction;
  }

  /**
   * Generate multilingual speech summary for low-literacy / audio users
   */
  generateTransactionSpeechText(
    tx: TransactionRecord,
    language: string = 'en'
  ): string {
    const ref = tx.referenceNumber || 'Transaction';
    const amount = Number(tx.finalSaleValue) || 0;
    const status = tx.paymentStatus || 'PENDING';
    const method = tx.paymentMethod || 'CASH';
    const recycler = tx.recycler?.facilityName || 'Recycler';

    if (language === 'hi') {
      const statusHi =
        status === 'PAID'
          ? 'भुगतान पूर्ण'
          : status === 'PARTIALLY_PAID'
          ? 'आंशिक भुगतान'
          : 'लंबित';
      const methodHi = method === 'CASH' ? 'नकद' : 'यूपीआई या बैंक';
      return `लेन-देन संदर्भ ${ref}। कुल मूल्य ₹${amount}, ${methodHi} द्वारा। स्थिति: ${statusHi}। क्रेता: ${recycler}। ध्यान दें: यह केवल रिकॉर्ड है, पैसे का लेन-देन ऐप द्वारा नहीं किया गया है।`;
    }

    if (language === 'mr') {
      const statusMr =
        status === 'PAID'
          ? 'पूर्ण भरले'
          : status === 'PARTIALLY_PAID'
          ? 'अंशतः भरले'
          : 'प्रलंबित';
      const methodMr = method === 'CASH' ? 'रोख' : 'यूपीआय किंवा बँक';
      return `व्यवहार संदर्भ ${ref}। एकूण रक्कम ₹${amount}, ${methodMr} द्वारे। स्थिती: ${statusMr}। खरेदीदार: ${recycler}। टीप: ही केवळ नोंद आहे, पैशांचे हस्तांतरण अॅपद्वारे केलेले नाही.`;
    }

    if (language === 'or') {
      const statusOr =
        status === 'PAID'
          ? 'ପରିଶୋଧିତ'
          : status === 'PARTIALLY_PAID'
          ? 'ଆଂଶିକ ପରିଶୋଧିତ'
          : 'ବାକି';
      const methodOr = method === 'CASH' ? 'ନଗଦ' : 'ୟୁପିଆଇ କିମ୍ବା ବ୍ୟାଙ୍କ';
      return `କାରବାର ରେଫରେନ୍ସ ${ref}। ମୋଟ ମୂଲ୍ୟ ₹${amount}, ${methodOr} ଦ୍ୱାରା। ସ୍ଥିତି: ${statusOr}। କ୍ରେତା: ${recycler}। ସୂଚନା: ଏହା କେବଳ ରେକର୍ଡ, ଟଙ୍କା ସ୍ଥାନାନ୍ତର ହୋଇନାହିଁ।`;
    }

    // Default English
    return `Transaction reference ${ref}. Final sale value ${amount} rupees via ${method}. Payment status: ${status}. Buyer: ${recycler}. Note: Recording only; ECOSETU does not transfer money.`;
  }
}

export default new TransactionService();
