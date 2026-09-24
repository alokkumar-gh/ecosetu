/**
 * recyclerDirectoryService.ts
 * Mobile Service for Recycler Directory & Collector Discovery Experience
 * Canonical Reference: SIH 26229 Prompt 10, docs/25_SIH_26229_REQUIREMENTS.md Section 7
 */

import { apiClient } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecyclerRateDetail {
  id: string;
  category: string;
  subcategory?: string | null;
  rate: number;
  unit: string;
  currency: string;
  pickupAvailable: string;
  serviceArea?: string | null;
  source: string;
  sourceReference?: string | null;
  status: string;
  effectiveDate: string;
  expiryDate?: string | null;
}

export interface RecyclerDirectoryItem {
  id: string;
  facilityName: string;
  facilityAddress: string;
  facilityLat: number | null;
  facilityLng: number | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  acceptedCategories: string[];
  totalConsignments: number;
  pickupAvailable: 'AVAILABLE' | 'NOT_AVAILABLE' | 'UNKNOWN';
  serviceArea: string | null;
  serviceRadiusKm: number | null;
  authorizationStatus: 'AUTHORIZED' | 'PROVISIONAL' | 'PENDING' | 'PENDING_REVIEW' | 'REJECTED' | 'SUSPENDED' | 'EXPIRED' | 'INACTIVE' | 'REVOKED' | string;
  authorizationNumber?: string | null;
  issuingAuthority?: string | null;
  authorizationValidFrom?: string | null;
  authorizationValidTill?: string | null;
  operationalPhone?: string | null;
  operationalEmail?: string | null;
  acceptedSubcategories?: string[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  distanceKm: number | null;
  hasActiveRates: boolean;
  activeRatesCount: number;
  activeRates?: RecyclerRateDetail[];
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface RecyclerDetail extends RecyclerDirectoryItem {
  licenseNumber?: string | null;
  authorizationNumber?: string | null;
  issuingAuthority?: string | null;
  authorizationValidFrom?: string | null;
  authorizationValidTill?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verificationNotes?: string | null;
  offeredRates: RecyclerRateDetail[];
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

export interface DirectoryFilters {
  category?: string | null;
  authorizationStatus?: string | null;
  pickupAvailable?: string | null;
  hasRates?: boolean | null;
  search?: string | null;
  lat?: number | null;
  lng?: number | null;
  page?: number;
  limit?: number;
}

export interface DirectoryResult {
  recyclers: RecyclerDirectoryItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  isOfflineCached?: boolean;
  cachedAt?: string | null;
  isStale?: boolean;
  ageHours?: number;
}

export interface DetailResult {
  recycler: RecyclerDetail;
  isOfflineCached?: boolean;
  cachedAt?: string | null;
  isStale?: boolean;
  ageHours?: number;
}

const CACHE_KEY_DIRECTORY = '@ecosetu_cache_recycler_directory';
const CACHE_KEY_DETAIL_PREFIX = '@ecosetu_cache_recycler_detail_';
const STALE_THRESHOLD_HOURS = 24;

class RecyclerDirectoryService {
  /**
   * Fetch recyclers directory with query filters
   * Supports offline cache fallback with 24h staleness flag
   */
  async getDirectory(filters: DirectoryFilters = {}): Promise<DirectoryResult> {
    try {
      const params: Record<string, string> = {};
      if (filters.category) params.category = filters.category;
      if (filters.authorizationStatus) params.authorizationStatus = filters.authorizationStatus;
      if (filters.pickupAvailable) params.pickupAvailable = filters.pickupAvailable;
      if (filters.hasRates != null) params.hasRates = String(filters.hasRates);
      if (filters.search) params.search = filters.search.trim();
      if (filters.lat != null) params.lat = String(filters.lat);
      if (filters.lng != null) params.lng = String(filters.lng);
      if (filters.page) params.page = String(filters.page);
      if (filters.limit) params.limit = String(filters.limit);

      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/recyclers?${queryString}` : '/recyclers';

      const response: any = await apiClient.get(endpoint);
      const data = response.data?.data || response.data || {};
      const recyclers = data.recyclers || [];
      const pagination = data.pagination;

      // Cache fresh full directory if no restrictive filters were applied
      if (!filters.category && !filters.search && !filters.authorizationStatus) {
        await this.cacheDirectory(recyclers);
      }

      return {
        recyclers,
        pagination,
        isOfflineCached: false,
        isStale: false,
      };
    } catch (err: any) {
      console.warn('[RecyclerDirectoryService] Network request failed, loading offline cache:', err.message);
      const cached = await this.getCachedDirectory();
      if (cached && cached.recyclers) {
        let filtered = [...cached.recyclers];

        if (filters.category) {
          filtered = filtered.filter((r) =>
            Array.isArray(r.acceptedCategories) && r.acceptedCategories.includes(filters.category!)
          );
        }

        if (filters.authorizationStatus) {
          filtered = filtered.filter((r) => r.authorizationStatus === filters.authorizationStatus);
        }

        if (filters.pickupAvailable) {
          filtered = filtered.filter((r) => r.pickupAvailable === filters.pickupAvailable);
        }

        if (filters.hasRates) {
          filtered = filtered.filter((r) => r.hasActiveRates === true);
        }

        if (filters.search) {
          const s = filters.search.toLowerCase();
          filtered = filtered.filter((r) =>
            (r.facilityName && r.facilityName.toLowerCase().includes(s)) ||
            (r.city && r.city.toLowerCase().includes(s)) ||
            (r.state && r.state.toLowerCase().includes(s)) ||
            (r.serviceArea && r.serviceArea.toLowerCase().includes(s))
          );
        }

        return {
          recyclers: filtered,
          pagination: {
            total: filtered.length,
            page: 1,
            limit: filtered.length,
            totalPages: 1,
          },
          isOfflineCached: true,
          cachedAt: cached.cachedAt,
          isStale: cached.isStale,
          ageHours: cached.ageHours,
        };
      }
      throw err;
    }
  }

  /**
   * Fetch single recycler facility detail
   * Passes optional lotId for server-side contact privacy access authorization (SIH-RECY-006)
   */
  async getRecyclerDetail(
    id: string,
    coords?: { lat?: number; lng?: number },
    lotId?: string
  ): Promise<DetailResult> {
    try {
      const params: Record<string, string> = {};
      if (coords?.lat != null) params.lat = String(coords.lat);
      if (coords?.lng != null) params.lng = String(coords.lng);
      if (lotId) params.lotId = lotId;

      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/recyclers/${id}?${queryString}` : `/recyclers/${id}`;

      const response: any = await apiClient.get(endpoint);
      const data = response.data?.data || response.data || {};
      const recycler = data.recycler;

      if (recycler) {
        await this.cacheDetail(id, recycler);
      }

      return {
        recycler,
        isOfflineCached: false,
        isStale: false,
      };
    } catch (err: any) {
      console.warn('[RecyclerDirectoryService] Detail network failed, checking cache:', err.message);
      const cached = await this.getCachedDetail(id);
      if (cached && cached.recycler) {
        return cached;
      }
      throw err;
    }
  }

  // ── Cache helpers ──────────────────────────────────────────────────────────

  private async cacheDirectory(recyclers: RecyclerDirectoryItem[]): Promise<void> {
    try {
      const payload = {
        recyclers,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHE_KEY_DIRECTORY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[RecyclerDirectoryService] Error caching directory:', err);
    }
  }

  private async getCachedDirectory(): Promise<{
    recyclers: RecyclerDirectoryItem[];
    cachedAt: string;
    isStale: boolean;
    ageHours: number;
  } | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY_DIRECTORY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const cachedAt = parsed.cachedAt || new Date().toISOString();
      const ageHours = (Date.now() - new Date(cachedAt).getTime()) / (1000 * 60 * 60);
      return {
        recyclers: parsed.recyclers || [],
        cachedAt,
        isStale: ageHours > STALE_THRESHOLD_HOURS,
        ageHours: Math.round(ageHours * 10) / 10,
      };
    } catch {
      return null;
    }
  }

  private async cacheDetail(id: string, recycler: RecyclerDetail): Promise<void> {
    try {
      const payload = {
        recycler,
        cachedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`${CACHE_KEY_DETAIL_PREFIX}${id}`, JSON.stringify(payload));
    } catch (err) {
      console.warn('[RecyclerDirectoryService] Error caching detail:', err);
    }
  }

  private async getCachedDetail(id: string): Promise<DetailResult | null> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_KEY_DETAIL_PREFIX}${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const cachedAt = parsed.cachedAt || new Date().toISOString();
      const ageHours = (Date.now() - new Date(cachedAt).getTime()) / (1000 * 60 * 60);
      return {
        recycler: parsed.recycler,
        isOfflineCached: true,
        cachedAt,
        isStale: ageHours > STALE_THRESHOLD_HOURS,
        ageHours: Math.round(ageHours * 10) / 10,
      };
    } catch {
      return null;
    }
  }

  /**
   * Deterministic Multilingual TTS Speech Generator
   * STRICT ANTI-FABRICATION RULE: Only states facts that actually exist in the record.
   */
  generateRecyclerSpeechText(recycler: RecyclerDetail | RecyclerDirectoryItem, language: string = 'en'): string {
    const facilityName = recycler.facilityName || 'Recycling facility';
    const authStatus = recycler.authorizationStatus;
    const categories = (recycler.acceptedCategories || [])
      .map((c) => c.replace(/_/g, ' ').toLowerCase())
      .slice(0, 4);

    const pickup = recycler.pickupAvailable;

    if (language === 'hi') {
      let authText = 'प्राधिकरण स्थिति अज्ञात है।';
      if (authStatus === 'AUTHORIZED') authText = 'यह एक अधिकृत रीसाइक्लर है।';
      else if (authStatus === 'PROVISIONAL') authText = 'यह अस्थायी रूप से अधिकृत रीसाइक्लर है।';
      else if (authStatus === 'EXPIRED') authText = 'इसकी प्राधिकरण स्थिति समाप्त हो चुकी है।';

      let catText = categories.length > 0
        ? `यह ${categories.join(', ')} स्वीकार करता है।`
        : 'स्वीकृत सामग्री की जानकारी अनुपलब्ध है।';

      let pickupText = 'पिकअप की जानकारी उपलब्ध नहीं है।';
      if (pickup === 'AVAILABLE') pickupText = 'पिकअप सेवा उपलब्ध है।';
      else if (pickup === 'NOT_AVAILABLE') pickupText = 'पिकअप उपलब्ध नहीं है, ड्रॉप-ऑफ आवश्यक है।';

      return `${facilityName}। ${authText} ${catText} ${pickupText}`;
    }

    if (language === 'mr') {
      let authText = 'प्राधिकरण स्थिती माहित नाही.';
      if (authStatus === 'AUTHORIZED') authText = 'हे एक अधिकृत रीसायकल केंद्र आहे.';
      else if (authStatus === 'PROVISIONAL') authText = 'हे तात्पुरते अधिकृत रीसायकल केंद्र आहे.';
      else if (authStatus === 'EXPIRED') authText = 'याचे प्राधिकरण संपले आहे.';

      let catText = categories.length > 0
        ? `हे ${categories.join(', ')} स्वीकारते.`
        : 'स्वीकृत मालाची माहिती उपलब्ध नाही.';

      let pickupText = 'पिकअपची माहिती उपलब्ध नाही.';
      if (pickup === 'AVAILABLE') pickupText = 'पिकअप उपलब्ध आहे.';
      else if (pickup === 'NOT_AVAILABLE') pickupText = 'पिकअप उपलब्ध नाही, स्वतः जमा करणे आवश्यक आहे.';

      return `${facilityName}. ${authText} ${catText} ${pickupText}`;
    }

    if (language === 'or') {
      let authText = 'ପ୍ରାଧିକରଣ ସ୍ଥିତି ଅଜ୍ଞାତ ଅଟେ।';
      if (authStatus === 'AUTHORIZED') authText = 'ଏହା ଏକ ଅଧିକୃତ ରିସାଇକ୍ଲର ଅଟେ।';
      else if (authStatus === 'PROVISIONAL') authText = 'ଏହା ଏକ ଅସ୍ଥାୟୀ ଭାବେ ଅଧିକୃତ ରିସାଇକ୍ଲର ଅଟେ।';
      else if (authStatus === 'EXPIRED') authText = 'ଏହାର ପ୍ରାଧିକରଣ ସମାପ୍ତ ହୋଇସାରିଛି।';

      let catText = categories.length > 0
        ? `ଏହା ${categories.join(', ')} ଗ୍ରହଣ କରେ।`
        : 'ଗ୍ରହଣୀୟ ସାମଗ୍ରୀର ସୂଚନା ଉପଲବ୍ଧ ନାହିଁ।';

      let pickupText = 'ପିକଅପ୍ ସୂଚନା ଉପଲବ୍ଧ ନାହିଁ।';
      if (pickup === 'AVAILABLE') pickupText = 'ପିକଅପ୍ ସୁବିଧା ଉପଲବ୍ଧ ଅଛି।';
      else if (pickup === 'NOT_AVAILABLE') pickupText = 'ପିକଅପ୍ ଉପଲବ୍ଧ ନାହିଁ, ନିଜେ ଦେବାକୁ ପଡିବ।';

      return `${facilityName}। ${authText} ${catText} ${pickupText}`;
    }

    // Default: English
    let authText = 'Authorization information unavailable.';
    if (authStatus === 'AUTHORIZED') authText = 'It is an authorized recycler with active registration.';
    else if (authStatus === 'PROVISIONAL') authText = 'It has provisional authorization.';
    else if (authStatus === 'PENDING_REVIEW') authText = 'Authorization is pending review.';
    else if (authStatus === 'EXPIRED') authText = 'Authorization is expired or inactive.';

    let catText = categories.length > 0
      ? `It accepts ${categories.join(', ')}.`
      : 'Accepted materials information unavailable.';

    let pickupText = 'Pickup availability unknown.';
    if (pickup === 'AVAILABLE') pickupText = 'Pickup is available.';
    else if (pickup === 'NOT_AVAILABLE') pickupText = 'Pickup is not available, facility drop-off required.';

    return `${facilityName}. ${authText} ${catText} ${pickupText}`;
  }
}

export const recyclerDirectoryService = new RecyclerDirectoryService();
