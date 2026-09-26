/**
 * bhashiniClientService.ts
 * Mobile Vernacular Client communicating strictly with the ECOSETU Backend Engine.
 * 
 * Security:
 * - NEVER contacts BHASHINI directly from mobile
 * - Zero API keys stored or hardcoded on device
 * - Communicates with backend endpoints (/voice/tts, /voice/asr, /language/detect, /ocr, /language/translate)
 */

import { apiClient } from './apiClient';
import { networkService } from './networkService';

export interface TTSResponse {
  audioBase64: string;
  audioFormat: string;
  language: string;
  isCached: boolean;
  latencyMs: number;
}

export interface ASRResponse {
  text: string;
  language: string;
  confidence: number | null;
  latencyMs: number;
}

export interface TLDResponse {
  language: string;
  confidence: number | null;
  isHeuristic?: boolean;
  isFallback?: boolean;
  latencyMs: number;
}

export interface OCRResponse {
  extractedText: string;
  language: string;
  latencyMs: number;
}

export interface TranslateResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  latencyMs: number;
}

export interface EngineStatusResponse {
  service: string;
  status: string;
  configured: boolean;
  hasUserId: boolean;
  endpoint: string;
  supportedLanguages: string[];
  capabilities: {
    tts: boolean;
    asr: boolean;
    tld: boolean;
    ocr: boolean;
    translation: boolean;
  };
  cachedTtsEntries: number;
  version: string;
}

class BhashiniClientService {
  /**
   * Request Text-to-Speech audio from ECOSETU Backend
   */
  async textToSpeech(
    text: string,
    language: string = 'or',
    options: {
      gender?: 'female' | 'male';
      audioFormat?: 'wav' | 'mp3';
      samplingRate?: number;
      bypassCache?: boolean;
    } = {}
  ): Promise<TTSResponse | null> {
    if (!text || !text.trim()) return null;
    if (!networkService.isConnected()) {
      return null;
    }

    try {
      const response = await apiClient.post('/voice/tts', {
        text: text.trim(),
        language,
        gender: options.gender || 'female',
        audioFormat: options.audioFormat || 'wav',
        samplingRate: options.samplingRate,
        bypassCache: options.bypassCache || false,
      }, { timeoutMs: 20000 });

      if (response && response.success && response.data) {
        return response.data as TTSResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] TTS request error:', err);
      return null;
    }
  }

  /**
   * Request Automatic Speech Recognition from ECOSETU Backend
   */
  async speechToText(
    audioBase64: string,
    language: string = 'or',
    options: {
      audioFormat?: 'wav' | 'mp3' | 'aac';
      samplingRate?: number;
    } = {}
  ): Promise<ASRResponse | null> {
    if (!audioBase64 || !audioBase64.trim()) return null;
    if (!networkService.isConnected()) {
      return null;
    }

    try {
      const response = await apiClient.post('/voice/asr', {
        audioBase64: audioBase64.trim(),
        language,
        audioFormat: options.audioFormat || 'wav',
        samplingRate: options.samplingRate,
      }, { timeoutMs: 25000 });

      if (response && response.success && response.data) {
        return response.data as ASRResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] ASR request error:', err);
      return null;
    }
  }

  /**
   * Request Text Language Detection from ECOSETU Backend
   */
  async detectLanguage(text: string): Promise<TLDResponse | null> {
    if (!text || !text.trim()) return null;

    try {
      const response = await apiClient.post('/language/detect', {
        text: text.trim(),
      }, { timeoutMs: 10000 });

      if (response && response.success && response.data) {
        return response.data as TLDResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] Language detection error:', err);
      return null;
    }
  }

  /**
   * Request OCR text extraction from an image
   */
  async extractText(
    imageBase64: string,
    language: string = 'or'
  ): Promise<OCRResponse | null> {
    if (!imageBase64 || !imageBase64.trim()) return null;
    if (!networkService.isConnected()) {
      return null;
    }

    try {
      const response = await apiClient.post('/ocr', {
        imageBase64: imageBase64.trim(),
        language,
      }, { timeoutMs: 35000 });

      if (response && response.success && response.data) {
        return response.data as OCRResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] OCR extraction error:', err);
      return null;
    }
  }

  /**
   * Request Translation between Indian languages & English
   */
  async translate(
    text: string,
    sourceLanguage: string = 'en',
    targetLanguage: string = 'or'
  ): Promise<TranslateResponse | null> {
    if (!text || !text.trim()) return null;

    try {
      const response = await apiClient.post('/language/translate', {
        text: text.trim(),
        sourceLanguage,
        targetLanguage,
      }, { timeoutMs: 15000 });

      if (response && response.success && response.data) {
        return response.data as TranslateResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] Translation error:', err);
      return null;
    }
  }

  /**
   * Check backend Vernacular Engine health status
   */
  async getStatus(): Promise<EngineStatusResponse | null> {
    try {
      const response = await apiClient.get('/voice/status', { timeoutMs: 8000 });
      if (response && response.success && response.data) {
        return response.data as EngineStatusResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] Engine status check error:', err);
      return null;
    }
  }
}

export const bhashiniClientService = new BhashiniClientService();
export default bhashiniClientService;
