/**
 * EcoSetu — Eco-Saathi AI Orchestration Client Service
 * Connects the mobile frontend to the backend Eco-Saathi Orchestrator (/api/v1/eco-saathi)
 */

import { apiClient } from './apiClient.js';
import { storage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export interface EcoSaathiAction {
  type: string;
  requestId?: string;
  offerId?: string;
  amount?: number;
  reason?: string;
  itemData?: Record<string, any>;
  params?: Record<string, any>;
}

export interface EcoSaathiResponse {
  success: boolean;
  message: string;
  answer?: string;
  cleanSpeechText?: string;
  responseType?: string;
  type?: string;
  intent: string;
  action: EcoSaathiAction | null;
  requiresConfirmation: boolean;
  data: Record<string, any> | null;
  conversationId?: string;
  provider?: string;
  latencyMs?: number;
}

export interface SendMessageOptions {
  message: string;
  language?: string;
  context?: {
    requestId?: string;
    offerId?: string;
    category?: string;
    currentPage?: string;
    currentRoute?: string;
  };
  conversationContext?: {
    requestId?: string;
    offerId?: string;
    category?: string;
    currentPage?: string;
    currentRoute?: string;
  };
}

class EcoSaathiService {
  /**
   * Send user natural language query to the backend Eco-Saathi Orchestrator
   */
  async sendMessage(options: SendMessageOptions): Promise<EcoSaathiResponse> {
    const activeContext = options.context || options.conversationContext || {};
    const baseUrl = apiClient.getBaseUrl();
    const endpoint = '/eco-saathi/message';
    const cleanEndpoint = baseUrl.endsWith('/api/v1') && endpoint.startsWith('/api/v1/') ? endpoint.substring('/api/v1'.length) : endpoint;
    const resolvedUrl = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${baseUrl}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;

    const hasAuthToken = Boolean(await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN).catch(() => null));

    console.log(`[ECOSAATHI_MOBILE] URL: ${resolvedUrl}`);
    console.log(`[ECOSAATHI_MOBILE] message: ${options.message}`);
    console.log(`[ECOSAATHI_MOBILE] auth present: ${hasAuthToken}`);

    try {
      const response = await apiClient.post('/eco-saathi/message', {
        message: options.message,
        language: options.language || 'en',
        context: activeContext,
        conversationContext: activeContext,
      });

      const rawPayload = response;
      const dataPayload = (response && typeof response === 'object' && response.data) ? response.data : response;

      const provider = dataPayload?.provider || response?.provider || 'unknown';
      const responseType = dataPayload?.responseType || dataPayload?.type || response?.responseType || response?.type || 'TEXT';
      const answer = dataPayload?.message || dataPayload?.answer || dataPayload?.cleanSpeechText || response?.message || '';

      console.log(`[ECOSAATHI_MOBILE] HTTP status: 200`);
      console.log(`[ECOSAATHI_MOBILE] raw response: ${JSON.stringify(rawPayload)}`);
      console.log(`[ECOSAATHI_MOBILE] provider: ${provider}`);
      console.log(`[ECOSAATHI_MOBILE] response type: ${responseType}`);
      console.log(`[ECOSAATHI_MOBILE] answer: ${answer}`);

      return {
        success: true,
        message: answer,
        intent: dataPayload?.intent || response?.intent || 'GENERAL_KNOWLEDGE',
        action: dataPayload?.action || response?.action || null,
        requiresConfirmation: Boolean(dataPayload?.requiresConfirmation || response?.requiresConfirmation),
        data: dataPayload?.data !== undefined ? dataPayload.data : dataPayload,
        provider,
        latencyMs: dataPayload?.latencyMs || response?.latencyMs,
      };
    } catch (error: any) {
      const httpStatus = error?.status || error?.statusCode || (error?.name === 'AppError' ? error.status : 'NETWORK_ERROR');
      console.warn(`[ECOSAATHI_MOBILE] HTTP status: ${httpStatus}`);
      console.warn(`[ECOSAATHI_MOBILE] request error: ${error?.message || error}`);
      throw error;
    }
  }

  /**
   * Execute an explicit confirmed write action via the Orchestrator
   */
  async confirmAction(action: EcoSaathiAction, confirmed: boolean = true): Promise<EcoSaathiResponse> {
    try {
      const response = await apiClient.post('/eco-saathi/confirm-action', {
        action,
        confirmed,
      });

      if (response && response.data) {
        return response.data;
      }
      return response as any;
    } catch (error: any) {
      console.warn('[EcoSaathiService] confirmAction error:', error?.message || error);
      throw error;
    }
  }

  /**
   * Fetch active context snapshot for current session
   */
  async getContext(): Promise<any> {
    try {
      const response = await apiClient.get('/eco-saathi/context');
      return response?.data || response;
    } catch (error: any) {
      console.warn('[EcoSaathiService] getContext error:', error?.message || error);
      return null;
    }
  }
}

export const ecoSaathiService = new EcoSaathiService();
export default ecoSaathiService;
