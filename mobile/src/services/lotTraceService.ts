/**
 * lotTraceService.ts
 * Mobile Service for Journey B Material Lot End-to-End Traceability
 * Canonical Reference: SIH 26229 Prompt 11, docs/25_SIH_26229_REQUIREMENTS.md Section 15
 */

import { apiClient } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TraceLot {
  id: string;
  referenceNumber: string;
  status: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  approximateTotalWeightKg?: number | null;
  condition?: string;
  sourceType?: string;
  createdAt: string;
  collectionTimestamp?: string;
  collector: {
    id: string;
    name: string;
    phone?: string | null;
  };
}

export interface TraceCollection {
  collectedAt: string;
  locationRecorded: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  displayText: string;
}

export interface TraceMaterialItem {
  id: string;
  referenceId?: string | null;
  category: string;
  subcategory?: string | null;
  approximateWeightKg?: number | null;
  condition: string;
  sourceType: string;
  createdAt: string;
}

export interface TracePhoto {
  id: string;
  photoUrl: string;
  caption?: string | null;
  createdAt: string;
}

export interface TracePrice {
  status: 'AVAILABLE' | 'NOT_AVAILABLE';
  marketRangeLow?: number | null;
  marketRangeHigh?: number | null;
  estimatedMidpoint?: number | null;
  unit: string;
  currency: string;
  source?: string | null;
  sourceReference?: string | null;
  effectiveDate?: string | null;
  displayText: string;
}

export interface TraceQuote {
  id: string;
  referenceNumber: string;
  recyclerId: string;
  recyclerName: string;
  quotedUnitPrice?: number | null;
  unit: string;
  quotedQuantity?: number | null;
  quotedTotal?: number | null;
  currency: string;
  status: string;
  isAccepted: boolean;
  createdAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  validUntil?: string | null;
}

export interface TraceRecycler {
  status: 'SELECTED' | 'NOT_SELECTED';
  id?: string | null;
  facilityName?: string | null;
  authorizationStatus?: string | null;
  serviceArea?: string | null;
  city?: string | null;
  state?: string | null;
  acceptedCategories: string[];
  contact?: {
    phone?: string | null;
    email?: string | null;
  } | null;
  message?: string | null;
}

export interface TraceHandover {
  status: string;
  id?: string | null;
  referenceNumber?: string | null;
  declaredWeightKg?: number | null;
  handoverWeightKg?: number | null;
  collectorConfirmedAt?: string | null;
  recyclerConfirmedAt?: string | null;
  finalConfirmedAt?: string | null;
  handoverTimestamp?: string | null;
  location: {
    locationAvailable: boolean;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    displayText: string;
  };
  photos: TracePhoto[];
  receiptAvailable: boolean;
  receiptReferenceNumber?: string | null;
  message?: string | null;
}

export interface TraceTransaction {
  status: string;
  id?: string | null;
  referenceNumber?: string | null;
  quotedTotal?: number | null;
  finalSaleValue?: number | null;
  amountPaid?: number | null;
  amountDue?: number | null;
  paymentMethod?: string | null;
  paymentStatus: string;
  transactionStatus?: string | null;
  transactionDate?: string | null;
  disclaimer?: string | null;
  message?: string | null;
}

export interface TracePayment {
  status: string;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: string | null;
  displayText: string;
}

export interface TraceRecycling {
  status: string;
  message: string;
  receivedAt?: string | null;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  processingNotes?: string | null;
  outputDescription?: string | null;
  outputWeightKg?: number | null;
  certificateUrl?: string | null;
}

export interface TraceFinalStatus {
  stage: string;
  statusLabel: string;
  isComplete: boolean;
}

export interface TraceTimelineEvent {
  id: string;
  stage: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'ACTION_REQUIRED';
  timestamp?: string | null;
  actorRole?: string | null;
  icon: string;
}

export interface TraceAuditEvent {
  id: string;
  action: string;
  timestamp: string;
  actorRole?: string | null;
  entityType: string;
  summary: string;
}

export interface LotTraceData {
  lot: TraceLot;
  materials: TraceMaterialItem[];
  photos: TracePhoto[];
  collection: TraceCollection;
  price: TracePrice;
  quotes: TraceQuote[];
  acceptedQuote?: TraceQuote | null;
  recycler: TraceRecycler;
  handover: TraceHandover;
  transaction: TraceTransaction;
  payment: TracePayment;
  recycling: TraceRecycling;
  finalStatus: TraceFinalStatus;
  timeline: TraceTimelineEvent[];
  audit: TraceAuditEvent[];
  isOfflineCached?: boolean;
  cachedAt?: string;
  isStale?: boolean;
}

const CACHE_PREFIX = '@ecosetu_cache_lot_trace_';
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export const lotTraceService = {
  /**
   * Fetch full lifecycle trace for a material lot with offline caching
   */
  async fetchLotTrace(lotId: string): Promise<LotTraceData> {
    const cacheKey = `${CACHE_PREFIX}${lotId}`;

    try {
      const response = await (apiClient as any).get(
        `/api/v1/material-lots/${lotId}/trace`
      );
      const traceData = response.data?.trace || response.data;

      // Cache fresh result
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: traceData,
            cachedAt: new Date().toISOString(),
          })
        );
      } catch (cacheErr) {
        console.warn('Failed to cache lot trace:', cacheErr);
      }

      return {
        ...traceData,
        isOfflineCached: false,
      };
    } catch (networkErr) {
      // Fallback to offline cache
      try {
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          const { data, cachedAt } = JSON.parse(cachedRaw);
          const cachedTime = new Date(cachedAt).getTime();
          const isStale = Date.now() - cachedTime > STALE_THRESHOLD_MS;

          return {
            ...data,
            isOfflineCached: true,
            cachedAt,
            isStale,
          };
        }
      } catch (readErr) {
        console.warn('Failed to read cached lot trace:', readErr);
      }

      throw networkErr;
    }
  },

  /**
   * Generate factual, vernacular text-to-speech description
   * Supports English, Hindi, Marathi, and Odia.
   * STRICT ANTI-FABRICATION: ONLY recites events that actually occurred.
   */
  generateLotTraceSpeechText(trace: LotTraceData, lang = 'en'): string {
    const lotRef = trace.lot.referenceNumber || 'Lot';
    const category = trace.lot.category || 'Material';
    const weight = trace.lot.approximateTotalWeightKg
      ? `${trace.lot.approximateTotalWeightKg} kg`
      : '';

    // Quote segment
    let quoteSegment = '';
    if (trace.acceptedQuote) {
      quoteSegment = `Quote accepted from ${trace.acceptedQuote.recyclerName} for ₹${trace.acceptedQuote.quotedTotal}.`;
    } else if (trace.quotes.length > 0) {
      quoteSegment = `${trace.quotes.length} quotes received. Awaiting acceptance.`;
    }

    // Handover segment
    let handoverSegment = '';
    if (trace.handover.status === 'CONFIRMED') {
      handoverSegment = `Handover confirmed. Reference number ${trace.handover.referenceNumber}.`;
    } else if (trace.handover.status !== 'NOT_INITIATED') {
      handoverSegment = `Handover initiated. Status: ${trace.handover.status}.`;
    }

    // Payment / Sale segment
    let paymentSegment = '';
    if (trace.transaction.status === 'RECORDED') {
      if (trace.payment.status === 'PAID') {
        paymentSegment = `Sale recorded. Fully paid ₹${trace.payment.amountPaid}.`;
      } else {
        paymentSegment = `Sale recorded. Payment pending ₹${trace.payment.amountDue}.`;
      }
    }

    // Recycling segment
    let recyclingSegment = '';
    if (trace.recycling.status === 'COMPLETED') {
      recyclingSegment = 'Recycling completed with certificate.';
    } else if (trace.recycling.status !== 'NOT_RECORDED') {
      recyclingSegment = `Recycling status: ${trace.recycling.status}.`;
    }

    if (lang === 'hi') {
      let hiText = `सामग्री लॉट ${lotRef}। श्रेणी: ${category}। ${weight ? `अनुमानित वजन: ${weight}।` : ''}`;
      if (trace.acceptedQuote) {
        hiText += ` ${trace.acceptedQuote.recyclerName} से ₹${trace.acceptedQuote.quotedTotal} का कोटेशन स्वीकृत हुआ।`;
      } else if (trace.quotes.length > 0) {
        hiText += ` ${trace.quotes.length} कोटेशन प्राप्त हुए हैं।`;
      }
      if (trace.handover.status === 'CONFIRMED') {
        hiText += ` डिजिटल हैंडओवर पुष्टि हो चुकी है।`;
      }
      if (trace.transaction.status === 'RECORDED') {
        if (trace.payment.status === 'PAID') {
          hiText += ` बिक्री दर्ज हुई। ₹${trace.payment.amountPaid} का पूरा भुगतान प्राप्त हुआ।`;
        } else {
          hiText += ` बिक्री दर्ज हुई। ₹${trace.payment.amountDue} का भुगतान बाकी है।`;
        }
      }
      if (trace.recycling.status === 'COMPLETED') {
        hiText += ` रीसाइक्लिंग पूर्ण हो चुकी है।`;
      }
      return hiText;
    }

    if (lang === 'mr') {
      let mrText = `मटेरिअल लॉट ${lotRef}। वर्ग: ${category}। ${weight ? `अंदाजे वजन: ${weight}।` : ''}`;
      if (trace.acceptedQuote) {
        mrText += ` ${trace.acceptedQuote.recyclerName} कडून ₹${trace.acceptedQuote.quotedTotal} चे कोटेशन मंजूर झाले।`;
      }
      if (trace.handover.status === 'CONFIRMED') {
        mrText += ` डिजिटल हस्तांतरण निश्चित झाले।`;
      }
      if (trace.transaction.status === 'RECORDED') {
        if (trace.payment.status === 'PAID') {
          mrText += ` विक्री नोंदवली। ₹${trace.payment.amountPaid} चे पूर्ण पैसे मिळाले।`;
        } else {
          mrText += ` विक्री नोंदवली। ₹${trace.payment.amountDue} बाकी आहे।`;
        }
      }
      return mrText;
    }

    if (lang === 'or') {
      let orText = `ମାଲ ଲଟ୍ ${lotRef}। ବର୍ଗ: ${category}। ${weight ? `ଆନୁମାନିକ ଓଜନ: ${weight}।` : ''}`;
      if (trace.acceptedQuote) {
        orText += ` ${trace.acceptedQuote.recyclerName} ଙ୍କ ଠାରୁ ₹${trace.acceptedQuote.quotedTotal} ର କୋଟେସନ ଗ୍ରହଣ କରାଯାଇଛି।`;
      }
      if (trace.handover.status === 'CONFIRMED') {
        orText += ` ହସ୍ତାନ୍ତର ନିଶ୍ଚିତ ହୋଇଛି।`;
      }
      if (trace.transaction.status === 'RECORDED') {
        if (trace.payment.status === 'PAID') {
          orText += ` ବିକ୍ରୟ ରେକର୍ଡ ହୋଇଛି। ସମ୍ପୂର୍ଣ୍ଣ ଟଙ୍କା ₹${trace.payment.amountPaid} ମିଳିଛି।`;
        } else {
          orText += ` ବିକ୍ରୟ ରେକର୍ଡ ହୋଇଛି। ବାକି ଟଙ୍କା ₹${trace.payment.amountDue} ଅଛି।`;
        }
      }
      return orText;
    }

    // Default English
    const parts = [
      `Material Lot ${lotRef}. Category: ${category}.${weight ? ` Weight: ${weight}.` : ''}`,
      quoteSegment,
      handoverSegment,
      paymentSegment,
      recyclingSegment,
    ].filter(Boolean);

    return parts.join(' ');
  },
};
