/**
 * EcoSetu Mobile Analytics Service
 * SIH 26229 Historical Analytics & Dataset Insights
 *
 * Requirements:
 * - Read-only dataset-driven analytics
 * - Offline-first with AsyncStorage caching and 24h staleness detection
 * - RBAC: Admin global, Collector personal, Recycler operational
 * - Zero fabricated metrics, zero artificial AI/ML forecasting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import { networkService } from './networkService';

const CACHE_PREFIX = '@ecosetu_analytics_';
const STALENESS_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedAnalyticsResult<T> {
  data: T | null;
  isCached: boolean;
  isStale: boolean;
  cachedAt: string | null;
  ageHours?: number;
}

class MobileAnalyticsService {
  private async _fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<CachedAnalyticsResult<T>> {
    const isOnline = networkService.isConnected();

    if (isOnline) {
      try {
        const response: any = await apiClient.request(endpoint, { method: 'GET' });
        const data: T = response?.data || response;

        if (data) {
          const cachedAt = new Date().toISOString();
          await AsyncStorage.setItem(
            `${CACHE_PREFIX}${cacheKey}`,
            JSON.stringify({ data, cachedAt })
          );
          return {
            data,
            isCached: false,
            isStale: false,
            cachedAt,
          };
        }
      } catch (err: any) {
        console.warn(`[AnalyticsService] Failed to fetch live ${endpoint}:`, err?.message || err);
      }
    }

    // Fallback to cached payload
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cachedTime = new Date(parsed.cachedAt).getTime();
        const ageMs = Date.now() - cachedTime;
        const isStale = ageMs > STALENESS_THRESHOLD_MS;
        return {
          data: parsed.data as T,
          isCached: true,
          isStale,
          cachedAt: parsed.cachedAt,
          ageHours: Math.round(ageMs / (1000 * 60 * 60)),
        };
      }
    } catch (cacheErr: any) {
      console.warn('[AnalyticsService] Cache read error:', cacheErr);
    }

    return {
      data: null,
      isCached: false,
      isStale: false,
      cachedAt: null,
    };
  }

  // ==========================================
  // ADMIN GLOBAL ENDPOINTS
  // ==========================================

  async getAdminOverview(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/overview${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_overview_${q || 'default'}`);
  }

  async getHistoricalPrices(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/prices${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_prices_${q || 'default'}`);
  }

  async getMaterialActivity(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/materials${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_materials_${q || 'default'}`);
  }

  async getTransactionActivity(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/transactions${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_transactions_${q || 'default'}`);
  }

  async getRecyclerActivity(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/recyclers${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_recyclers_${q || 'default'}`);
  }

  async getTraceabilityLifecycle(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/traceability${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_traceability_${q || 'default'}`);
  }

  async getDatasetQuality(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/admin/analytics/data-quality${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `admin_data_quality_${q || 'default'}`);
  }

  // ==========================================
  // COLLECTOR PERSONAL ENDPOINT
  // ==========================================

  async getCollectorPersonalAnalytics(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/collectors/analytics${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `collector_personal_${q || 'default'}`);
  }

  // ==========================================
  // RECYCLER OPERATIONAL ENDPOINT
  // ==========================================

  async getRecyclerOperationalAnalytics(query: Record<string, string> = {}) {
    const q = new URLSearchParams(query).toString();
    const endpoint = `/recyclers/analytics${q ? `?${q}` : ''}`;
    return this._fetchWithCache<any>(endpoint, `recycler_operational_${q || 'default'}`);
  }
}

export const analyticsService = new MobileAnalyticsService();
export default analyticsService;
