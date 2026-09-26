/**
 * EcoSetu Mobile API Client
 * Centralized HTTP client with automatic token injection, timeout handling,
 * 401 token refresh mutex, and standardized AppError mapping.
 * Source of Truth: docs/05_API_SPECIFICATION.md, docs/09_FRONTEND_ARCHITECTURE.md Section 6.1
 */

import { storage } from '../utils/storage.js';
import { STORAGE_KEYS, API_CONFIG } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';

class ApiClient {
  constructor() {
    this._baseUrl = API_CONFIG.DEFAULT_BASE_URL;
    this._refreshPromise = null;
    this._onAuthExpiredListeners = new Set();
    this._inFlightRequests = new Map();
    this._cache = new Map();
  }

  /**
   * Clear cache for specific endpoint or all cached responses
   * @param {string} [prefix]
   */
  clearCache(prefix = null) {
    if (!prefix) {
      this._cache.clear();
      return;
    }
    for (const key of this._cache.keys()) {
      if (key.includes(prefix)) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Configure base URL (e.g. for emulator, physical device, or local test server)
   * @param {string} url
   */
  setBaseUrl(url) {
    if (url && typeof url === 'string') {
      this._baseUrl = url.replace(/\/+$/, '');
    }
  }

  /**
   * Get current base URL
   * @returns {string}
   */
  getBaseUrl() {
    return this._baseUrl;
  }

  /**
   * Switch client to live production Render backend
   */
  useProductionBackend() {
    this.setBaseUrl(API_CONFIG.PRODUCTION_BASE_URL);
  }

  /**
   * Switch client to local development backend
   */
  useLocalBackend() {
    this.setBaseUrl(API_CONFIG.LOCAL_DEV_BASE_URL);
  }

  /**
   * Register callback for session expiration (401 with failed refresh)
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  onAuthExpired(listener) {
    this._onAuthExpiredListeners.add(listener);
    return () => this._onAuthExpiredListeners.delete(listener);
  }

  _notifyAuthExpired() {
    for (const listener of this._onAuthExpiredListeners) {
      try {
        listener();
      } catch (err) {
        console.error('[ApiClient] Auth expired listener error:', err);
      }
    }
  }

  /**
   * Low-level fetch wrapper with timeout and AbortController
   * @private
   */
  async _fetchWithTimeout(url, options = {}, timeoutMs = API_CONFIG.DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw AppError.timeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      throw AppError.networkError('Network connection failed', error);
    }
  }

  /**
   * Attempt token refresh when 401 received
   * @private
   */
  async _handleTokenRefresh() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        const storedRefreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!storedRefreshToken) {
          throw AppError.authError('No refresh token available');
        }

        const refreshUrl = `${this._baseUrl}/auth/refresh`;
        const response = await this._fetchWithTimeout(
          refreshUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          },
          API_CONFIG.DEFAULT_TIMEOUT_MS
        );

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw AppError.authError('Session refresh failed', 'SESSION_EXPIRED', response.status);
        }

        const newAccessToken = data.data?.accessToken;
        const newRefreshToken = data.data?.refreshToken;

        if (!newAccessToken) {
          throw AppError.authError('Invalid token refresh response');
        }

        // Persist refreshed credentials
        await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
        if (newRefreshToken) {
          await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        return newAccessToken;
      } catch (error) {
        // Purge tokens on refresh failure
        await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await storage.removeItem(STORAGE_KEYS.USER_PROFILE);
        this._notifyAuthExpired();
        throw error;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  /**
   * Attempt candidate fallback base URLs if primary endpoint returns 404 or network fails
   * @private
   */
  async _tryFallbackBases(endpoint, options) {
    const candidateBases = [
      API_CONFIG.LOCAL_DEV_BASE_URL,
      API_CONFIG.LAN_DEV_BASE_URL,
      API_CONFIG.FALLBACK_BASE_URL,
    ].filter((base) => Boolean(base) && base !== this._baseUrl);

    for (const base of candidateBases) {
      try {
        const fallbackUrl = `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const res = await this.request(fallbackUrl, {
          ...options,
          _fallbackAttempted: true,
        });
        if (res) {
          console.log(`[ApiClient] Successfully connected via fallback: ${base}`);
          this.setBaseUrl(base);
          return res;
        }
      } catch (err) {
        // Continue to next candidate
      }
    }
    return null;
  }

  /**
   * Core request method
   * @param {string} endpoint - API endpoint (e.g. '/ewaste-items' or full URL)
   * @param {Object} [options]
   * @param {string} [options.method='GET']
   * @param {any} [options.body]
   * @param {Object} [options.headers]
   * @param {number} [options.timeoutMs]
   * @param {boolean} [options.skipAuth=false]
   * @param {boolean} [options._isRetry=false]
   * @param {boolean} [options._fallbackAttempted=false]
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeoutMs = API_CONFIG.DEFAULT_TIMEOUT_MS,
      skipAuth = false,
      _isRetry = false,
      _fallbackAttempted = false,
      cacheTtlMs = 0,
      forceRefresh = false,
      params = null,
    } = options;

    let targetEndpoint = endpoint;
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        targetEndpoint += (targetEndpoint.includes('?') ? '&' : '?') + queryStr;
      }
    }

    let cleanEndpoint = targetEndpoint;
    if (this._baseUrl.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1/')) {
      cleanEndpoint = cleanEndpoint.substring('/api/v1'.length);
    }

    const fullUrl = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${this._baseUrl}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
    const isGet = method.toUpperCase() === 'GET';
    const cacheKey = `${method}:${fullUrl}`;

    // 1. Check TTL cache for GET requests
    if (isGet && !forceRefresh && cacheTtlMs > 0) {
      const cached = this._cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }

    // 2. Single-flight deduplication for concurrent identical GET requests
    if (isGet && !_isRetry && this._inFlightRequests.has(cacheKey)) {
      return this._inFlightRequests.get(cacheKey);
    }

    const executeRequest = async () => {
      const requestHeaders = {
        Accept: 'application/json',
        ...headers,
      };

      // Attach Bearer token if not explicitly skipped
      if (!skipAuth && !requestHeaders.Authorization) {
        const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          requestHeaders.Authorization = `Bearer ${token}`;
        }
      }

      const fetchOptions = {
        method,
        headers: requestHeaders,
      };

      // Serialize body unless already FormData or string
      if (body !== null && body !== undefined) {
        if ((typeof FormData !== 'undefined' && body instanceof FormData) || (body && Array.isArray(body._parts))) {
          fetchOptions.body = body;
          delete requestHeaders['Content-Type'];
          delete requestHeaders['content-type'];
        } else if (typeof body === 'string') {
          fetchOptions.body = body;
          if (!requestHeaders['Content-Type']) {
            requestHeaders['Content-Type'] = 'application/json';
          }
        } else {
          fetchOptions.body = JSON.stringify(body);
          if (!requestHeaders['Content-Type']) {
            requestHeaders['Content-Type'] = 'application/json';
          }
        }
      }

      let response;
      try {
        response = await this._fetchWithTimeout(fullUrl, fetchOptions, timeoutMs);
      } catch (error) {
        if (!endpoint.startsWith('http') && !_fallbackAttempted) {
          const fallbackRes = await this._tryFallbackBases(endpoint, options);
          if (fallbackRes) return fallbackRes;
        }
        throw error;
      }

      // Parse response
      let responseData = null;
      const contentType = response.headers?.get ? response.headers.get('content-type') : '';
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = { text };
        }
      }

      // If 404 on undeployed endpoint on current baseUrl, try fallback candidates
      if (response.status === 404 && !endpoint.startsWith('http') && !_fallbackAttempted) {
        const fallbackRes = await this._tryFallbackBases(endpoint, options);
        if (fallbackRes) return fallbackRes;
      }

      // Handle 401 Unauthorized (Token Expiration)
      if (response.status === 401 && !_isRetry && !skipAuth) {
        try {
          const newAccessToken = await this._handleTokenRefresh();
          if (newAccessToken) {
            return this.request(endpoint, {
              ...options,
              _isRetry: true,
              headers: {
                ...headers,
                Authorization: `Bearer ${newAccessToken}`,
              },
            });
          }
        } catch (refreshErr) {
          throw AppError.fromResponse(responseData, 401);
        }
      }

      // Handle non-2xx HTTP errors
      if (!response.ok) {
        throw AppError.fromResponse(responseData, response.status);
      }

      // Cache successful GET response if TTL requested
      if (isGet && cacheTtlMs > 0) {
        this._cache.set(cacheKey, {
          data: responseData,
          expiresAt: Date.now() + cacheTtlMs,
        });
      }

      // Invalidate cache on mutations
      if (!isGet) {
        this.clearCache(endpoint.split('?')[0]);
      }

      return responseData;
    };

    if (isGet && !_isRetry) {
      const promise = executeRequest().finally(() => {
        this._inFlightRequests.delete(cacheKey);
      });
      this._inFlightRequests.set(cacheKey, promise);
      return promise;
    }

    return executeRequest();
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      timeoutMs: options.timeoutMs || API_CONFIG.UPLOAD_TIMEOUT_MS,
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
