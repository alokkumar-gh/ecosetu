/**
 * EcoSetu Mobile Payment Service
 * Canonical Reference: SIH 26229 - Settlement Architecture: Cash Confirmation & Razorpay Rails
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage';
import networkService from './networkService';

export type PaymentMethodType =
  | 'CASH'
  | 'RAZORPAY_UPI'
  | 'RAZORPAY_CARD'
  | 'RAZORPAY_NETBANKING'
  | 'UPI_RECORDED'
  | 'BANK_TRANSFER_RECORDED'
  | 'OTHER';

export type CashConfirmationStatus =
  | 'PENDING'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'CANCELLED';

export interface CashPaymentConfirmation {
  id: string;
  transactionId: string;
  payerUserId: string;
  payerRole: string;
  receiverUserId: string;
  receiverRole: string;
  expectedAmount: number;
  confirmedAmount?: number | null;
  payerConfirmedAt?: string | null;
  receiverConfirmedAt?: string | null;
  status: CashConfirmationStatus;
  discrepancyAmount?: number | null;
  disputeId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  payerUser?: { id: string; name: string; phone?: string | null };
  receiverUser?: { id: string; name: string; phone?: string | null };
}

export interface RazorpayOrderInfo {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  transactionId: string;
  referenceNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
}

export interface VerifyRazorpayPayload {
  transactionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface PaymentVerificationResult {
  transaction: any;
  payment: any;
  bill: any;
}

const CACHE_PREFIX_CASH_CONFIRM = '@ecosetu_cache_cash_conf_';

class PaymentService {
  /**
   * Initiate cash confirmation workflow
   */
  async initiateCashConfirmation(transactionId: string, notes?: string): Promise<CashPaymentConfirmation> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error('Cash confirmation requires internet connectivity to record with server authority.');
    }

    const response = await apiClient.post('/payments/cash/initiate', { transactionId, notes });
    const confirmation = response.data.data.confirmation;
    await storage.setItem(`${CACHE_PREFIX_CASH_CONFIRM}${transactionId}`, confirmation);
    return confirmation;
  }

  /**
   * Confirm cash payment (Payer: cash paid, Receiver: cash received)
   */
  async confirmCashPayment(
    transactionId: string,
    confirmedAmount: number,
    notes?: string
  ): Promise<{ confirmation: CashPaymentConfirmation; transaction?: any; bill?: any }> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error('Cash confirmation submission requires internet connectivity to ensure two-party validation.');
    }

    const response = await apiClient.post('/payments/cash/confirm', {
      transactionId,
      confirmedAmount,
      notes,
    });

    const result = response.data.data;
    if (result.confirmation) {
      await storage.setItem(`${CACHE_PREFIX_CASH_CONFIRM}${transactionId}`, result.confirmation);
    }
    return result;
  }

  /**
   * Get cash confirmation status for a transaction (Supports offline cache fallback)
   */
  async getCashConfirmation(transactionId: string): Promise<CashPaymentConfirmation | null> {
    const cacheKey = `${CACHE_PREFIX_CASH_CONFIRM}${transactionId}`;
    const isOnline = await networkService.isOnline();

    if (!isOnline) {
      const cached = await storage.getItem(cacheKey);
      return cached ? (cached as CashPaymentConfirmation) : null;
    }

    try {
      const response = await apiClient.get(`/payments/cash/${transactionId}`);
      const confirmation = response.data.data.confirmation;
      if (confirmation) {
        await storage.setItem(cacheKey, confirmation);
      }
      return confirmation;
    } catch (error: any) {
      const cached = await storage.getItem(cacheKey);
      if (cached) return cached as CashPaymentConfirmation;
      if (error?.statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * Create Razorpay order on server (Authoritative amount derived from TransactionRecord)
   */
  async createRazorpayOrder(transactionId: string): Promise<RazorpayOrderInfo> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error('Razorpay Checkout requires an active internet connection.');
    }

    const response = await apiClient.post('/payments/razorpay/order', { transactionId });
    return response.data.data;
  }

  /**
   * Verify Razorpay payment on server using HMAC-SHA256 signature
   */
  async verifyRazorpayPayment(payload: VerifyRazorpayPayload): Promise<PaymentVerificationResult> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error('Server-side payment verification requires active internet connectivity.');
    }

    const response = await apiClient.post('/payments/razorpay/verify', payload);
    return response.data.data;
  }

  /**
   * Reconcile payment status against payment rails
   */
  async reconcilePayment(transactionId: string): Promise<any> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      throw new Error('Payment reconciliation requires internet connectivity.');
    }

    const response = await apiClient.post(`/payments/reconcile/${transactionId}`);
    return response.data.data;
  }
}

export default new PaymentService();
