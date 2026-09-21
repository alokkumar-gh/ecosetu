/**
 * EcoSetu Mobile Collector Earnings Service
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 8: Collector Earnings Ledger + Pending Dues
 */

import apiClient from './apiClient';
import { storage } from '../utils/storage';
import networkService from './networkService';

export interface EarningsSummary {
  totalRecordedSales: string;
  totalPaid: string;
  totalPending: string;
  totalPartiallyPaid: string;
  transactionCount: number;
  paidTransactionCount: number;
  pendingTransactionCount: number;
  partialTransactionCount: number;
  period: string;
  generatedAt: string;
  isCached?: boolean;
}

export interface PendingDueItem {
  id: string;
  referenceNumber: string;
  category: string;
  subcategory?: string | null;
  quantity: number;
  unit: string;
  finalSaleValue: string;
  amountPaid: string;
  amountDue: string;
  paymentStatus: string;
  transactionDate: string;
  handoverReference?: string | null;
  recycler: {
    id: string;
    businessName: string;
    facilityName: string;
  };
}

export interface PendingDuesResponse {
  pendingDues: PendingDueItem[];
  totalPendingAmount: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  generatedAt: string;
  isCached?: boolean;
}

export interface MonthlyEarningsItem {
  month: string;
  recordedSales: string;
  amountPaid: string;
  amountPending: string;
  transactionCount: number;
}

export interface MonthlyEarningsResponse {
  monthly: MonthlyEarningsItem[];
  generatedAt: string;
  isCached?: boolean;
}

export interface EarningsFilters {
  period?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';
  startDate?: string;
  endDate?: string;
  category?: string;
  subcategory?: string;
  paymentStatus?: string;
  recyclerId?: string;
  page?: number;
  limit?: number;
}

const CACHE_KEY_SUMMARY = '@ecosetu_cache_earnings_summary';
const CACHE_KEY_PENDING_DUES = '@ecosetu_cache_pending_dues';
const CACHE_KEY_MONTHLY = '@ecosetu_cache_monthly_earnings';

class EarningsService {
  /**
   * Fetch Earnings Summary with offline cache fallback
   */
  async getEarningsSummary(filters: EarningsFilters = {}): Promise<EarningsSummary> {
    const isOnline = await networkService.isOnline();

    if (!isOnline) {
      const cached = (await storage.getItem(CACHE_KEY_SUMMARY)) as EarningsSummary | null;
      if (cached) {
        return { ...cached, isCached: true };
      }
      return {
        totalRecordedSales: '0.00',
        totalPaid: '0.00',
        totalPending: '0.00',
        totalPartiallyPaid: '0.00',
        transactionCount: 0,
        paidTransactionCount: 0,
        pendingTransactionCount: 0,
        partialTransactionCount: 0,
        period: filters.period || 'ALL_TIME',
        generatedAt: new Date().toISOString(),
        isCached: true,
      };
    }

    try {
      const response = await apiClient.get('/earnings/summary', { params: filters });
      const summary = response.data.data.summary;
      await storage.setItem(CACHE_KEY_SUMMARY, summary);
      return summary;
    } catch (error) {
      const cached = (await storage.getItem(CACHE_KEY_SUMMARY)) as EarningsSummary | null;
      if (cached) {
        return { ...cached, isCached: true };
      }
      throw error;
    }
  }

  /**
   * Fetch Transactions contributing to Earnings Ledger
   */
  async getEarningsTransactions(filters: EarningsFilters = {}): Promise<any> {
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      return {
        transactions: [],
        total: 0,
        page: 1,
        limit: filters.limit || 20,
        totalPages: 0,
        isCached: true,
      };
    }

    const response = await apiClient.get('/earnings/transactions', { params: filters });
    return response.data.data;
  }

  /**
   * Fetch Dedicated Pending Dues (Outstanding transactions)
   */
  async getPendingDues(filters: EarningsFilters = {}): Promise<PendingDuesResponse> {
    const isOnline = await networkService.isOnline();

    if (!isOnline) {
      const cached = (await storage.getItem(CACHE_KEY_PENDING_DUES)) as PendingDuesResponse | null;
      if (cached) {
        return { ...cached, isCached: true };
      }
      return {
        pendingDues: [],
        totalPendingAmount: '0.00',
        total: 0,
        page: 1,
        limit: filters.limit || 50,
        totalPages: 0,
        generatedAt: new Date().toISOString(),
        isCached: true,
      };
    }

    try {
      const response = await apiClient.get('/earnings/pending-dues', { params: filters });
      const result = response.data.data;
      await storage.setItem(CACHE_KEY_PENDING_DUES, result);
      return result;
    } catch (error) {
      const cached = (await storage.getItem(CACHE_KEY_PENDING_DUES)) as PendingDuesResponse | null;
      if (cached) {
        return { ...cached, isCached: true };
      }
      throw error;
    }
  }

  /**
   * Fetch Monthly Earnings Breakdown
   */
  async getMonthlyEarnings(filters: EarningsFilters = {}): Promise<MonthlyEarningsResponse> {
    const isOnline = await networkService.isOnline();

    if (!isOnline) {
      const cached = (await storage.getItem(CACHE_KEY_MONTHLY)) as MonthlyEarningsResponse | null;
      if (cached) {
        return { ...cached, isCached: true };
      }
      return {
        monthly: [],
        generatedAt: new Date().toISOString(),
        isCached: true,
      };
    }

    try {
      const response = await apiClient.get('/earnings/monthly', { params: filters });
      const result = response.data.data;
      await storage.setItem(CACHE_KEY_MONTHLY, result);
      return result;
    } catch (error) {
      const cached = (await storage.getItem(CACHE_KEY_MONTHLY)) as MonthlyEarningsResponse | null;
      if (cached) {
        return { ...cached, isCached: true };
      }
      throw error;
    }
  }

  /**
   * Indian number-to-words helper for mobile speech synthesis
   */
  numberToIndianWords(num: number, language: string = 'en'): string {
    num = Math.round(Number(num));
    if (isNaN(num) || num <= 0) {
      return language === 'hi' ? 'शून्य' : language === 'mr' ? 'शून्य' : language === 'or' ? 'ଶୂନ' : 'zero';
    }

    const enOnes = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const enTens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const hiOnes = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस'];
    const mrOnes = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ', 'दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस', 'वीस', 'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'सव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकोणतीस', 'तीस'];
    const orOnes = ['', 'ଏକ', 'ଦୁଇ', 'ତିନି', 'ଚାରି', 'ପାଞ୍ଚ', 'ଛଅ', 'ସାତ', 'ଆଠ', 'ନଅ', 'ଦଶ', 'ଏଗାର', 'ବାର', 'ତେର', 'ଚଉଦ', 'ପନ୍ଦର', 'ଷୋହଳ', 'ସତର', 'ଅଠର', 'ଉଣାଇଶ', 'କୋଡ଼ିଏ', 'ଏକୋଇଶ', 'ବାଇଶ', 'ତେଇଶ', 'ଚବିଶ', 'ପଚିଶ', 'ଛବିଶ', 'ସତାଇଶ', 'ଅଠାଇଶ', 'ଅଣତିରିଶ', 'ତିରିଶ'];

    if (language === 'en') {
      const parts: string[] = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      const getUnderHundred = (n: number) => {
        if (n < 20) return enOnes[n];
        const t = Math.floor(n / 10);
        const o = n % 10;
        return `${enTens[t]}${o ? ' ' + enOnes[o] : ''}`;
      };

      if (crores > 0) parts.push(`${getUnderHundred(crores)} crore`);
      if (lakhs > 0) parts.push(`${getUnderHundred(lakhs)} lakh`);
      if (thousands > 0) parts.push(`${getUnderHundred(thousands)} thousand`);
      if (hundreds > 0) parts.push(`${enOnes[hundreds]} hundred`);
      if (num > 0) parts.push(getUnderHundred(num));

      return parts.join(' ').trim();
    }

    if (language === 'hi') {
      const parts: string[] = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      if (crores > 0) parts.push(`${hiOnes[crores] || crores} करोड़`);
      if (lakhs > 0) parts.push(`${hiOnes[lakhs] || lakhs} लाख`);
      if (thousands > 0) parts.push(`${hiOnes[thousands] || thousands} हजार`);
      if (hundreds > 0) parts.push(`${hiOnes[hundreds] || hundreds} सौ`);
      if (num > 0) parts.push(`${hiOnes[num] || num}`);

      return parts.join(' ').trim();
    }

    if (language === 'mr') {
      const parts: string[] = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      if (crores > 0) parts.push(`${mrOnes[crores] || crores} कोटी`);
      if (lakhs > 0) parts.push(`${mrOnes[lakhs] || lakhs} लाख`);
      if (thousands > 0) parts.push(`${mrOnes[thousands] || thousands} हजार`);
      if (hundreds > 0) parts.push(`${mrOnes[hundreds] || hundreds} शे`);
      if (num > 0) parts.push(`${mrOnes[num] || num}`);

      return parts.join(' ').trim();
    }

    if (language === 'or') {
      const parts: string[] = [];
      const crores = Math.floor(num / 10000000);
      num %= 10000000;
      const lakhs = Math.floor(num / 100000);
      num %= 100000;
      const thousands = Math.floor(num / 1000);
      num %= 1000;
      const hundreds = Math.floor(num / 100);
      num %= 100;

      if (crores > 0) parts.push(`${orOnes[crores] || crores} କୋଟି`);
      if (lakhs > 0) parts.push(`${orOnes[lakhs] || lakhs} ଲକ୍ଷ`);
      if (thousands > 0) parts.push(`${orOnes[thousands] || thousands} ହଜାର`);
      if (hundreds > 0) parts.push(`${orOnes[hundreds] || hundreds} ଶହ`);
      if (num > 0) parts.push(`${orOnes[num] || num}`);

      return parts.join(' ').trim();
    }

    return String(num);
  }

  /**
   * Multilingual TTS generator for low-literacy users
   */
  generateEarningsSpeechText(summary: EarningsSummary, language: string = 'en'): string {
    const salesNum = Math.round(Number(summary.totalRecordedSales) || 0);
    const paidNum = Math.round(Number(summary.totalPaid) || 0);
    const pendingNum = Math.round(Number(summary.totalPending) || 0);

    const salesWords = this.numberToIndianWords(salesNum, language);
    const paidWords = this.numberToIndianWords(paidNum, language);
    const pendingWords = this.numberToIndianWords(pendingNum, language);

    if (language === 'hi') {
      return `आपकी दर्ज बिक्री ${salesWords} रुपये है। आपको ${paidWords} रुपये प्राप्त हुए हैं। ${pendingWords} रुपये बाकी हैं।`;
    }

    if (language === 'mr') {
      return `तुमची नोंदणीकृत विक्री ${salesWords} रुपये आहे. तुम्हाला ${paidWords} रुपये मिळाले आहेत. ${pendingWords} रुपये बाकी आहेत.`;
    }

    if (language === 'or') {
      return `ଆପଣଙ୍କର ରେକର୍ଡ ହୋଇଥିବା ବିକ୍ରି ${salesWords} ଟଙ୍କା ଅଟେ। ଆପଣ ${paidWords} ଟଙ୍କା ପାଇଛନ୍ତି। ${pendingWords} ଟଙ୍କା ବାକି ଅଛି।`;
    }

    // Default English
    return `Your recorded sales are ${salesWords} rupees. You have received ${paidWords} rupees. ${pendingWords} rupees are pending.`;
  }
}

export default new EarningsService();
