/**
 * EcoSetu — Eco-Saathi AI Orchestration Client Service
 * Connects the mobile frontend to the backend Eco-Saathi Orchestrator (/api/v1/eco-saathi)
 */

import { apiClient } from './apiClient';

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
    try {
      const activeContext = options.context || options.conversationContext || {};
      const response = await apiClient.post('/eco-saathi/message', {
        message: options.message,
        language: options.language || 'en',
        context: activeContext,
        conversationContext: activeContext,
      });

      if (response && response.data) {
        return response.data;
      }
      return response as any;
    } catch (error: any) {
      console.warn('[EcoSaathiService] sendMessage error:', error?.message || error);
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
