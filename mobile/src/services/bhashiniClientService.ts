/**
 * bhashiniClientService.ts
 * Mobile Vernacular Client communicating strictly with the ECOSETU Backend Engine.
 * 
 * Architecture & Security:
 * - NEVER contacts BHASHINI directly from mobile.
 * - Zero API keys stored or hardcoded on device.
 * - Communicates with backend endpoints (/voice/transcribe, /voice/synthesize, /voice/detect-audio-language, /language/detect, /ocr, /language/translate).
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
  success: boolean;
  language: {
    code: string;
    name: string;
    nativeName: string;
  };
  transcript: string;
  originalTranscript: string;
  confidence: number | null;
  latencyMs: number;
}

export interface ALDResponse {
  success: boolean;
  language: string;
  languageName: string;
  nativeName: string;
  confidence: number | null;
  isFallback?: boolean;
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

export interface SupportedLanguageItem {
  code: string;
  name: string;
  nativeName: string;
  isAuto?: boolean;
  script?: string;
}

export interface VoiceProcessResponse {
  success: boolean;
  language: {
    code: string;
    name: string;
    nativeName: string;
  };
  transcript: string;
  originalTranscript: string;
  confidence: number | null;
  asrLatencyMs: number;
  audioResponse: string | null;
  ttsLatencyMs: number | null;
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
    audioLanguageDetection?: boolean;
    tld: boolean;
    ocr: boolean;
    translation: boolean;
  };
  cachedTtsEntries: number;
  version: string;
}

class BhashiniClientService {
  /**
   * Request Text-to-Speech audio from ECOSETU Backend using BHASHINI TTS
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
      const response = await apiClient.post('/voice/synthesize', {
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
   * Alias for textToSpeech
   */
  async synthesize(
    text: string,
    language: string = 'or',
    options?: {
      gender?: 'female' | 'male';
      audioFormat?: 'wav' | 'mp3';
      samplingRate?: number;
      bypassCache?: boolean;
    }
  ): Promise<TTSResponse | null> {
    return this.textToSpeech(text, language, options);
  }

  /**
   * Request Automatic Speech Recognition from ECOSETU Backend using BHASHINI ASR
   */
  async speechToText(
    audioBase64: string,
    language: string = 'auto',
    options: {
      audioFormat?: 'wav' | 'mp3' | 'aac' | 'webm' | 'm4a';
      samplingRate?: number;
    } = {}
  ): Promise<ASRResponse | null> {
    if (!audioBase64 || !audioBase64.trim()) return null;
    if (!networkService.isConnected()) {
      return null;
    }

    try {
      const response = await apiClient.post('/voice/transcribe', {
        audioBase64: audioBase64.trim(),
        language: language || 'auto',
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
   * Alias for speechToText
   */
  async transcribe(
    audioBase64: string,
    language: string = 'auto',
    options?: {
      audioFormat?: 'wav' | 'mp3' | 'aac' | 'webm' | 'm4a';
      samplingRate?: number;
    }
  ): Promise<ASRResponse | null> {
    return this.speechToText(audioBase64, language, options);
  }

  /**
   * Detect language directly from audio recording using BHASHINI Audio Language Detection
   */
  async detectAudioLanguage(
    audioBase64: string,
    options: {
      audioFormat?: 'wav' | 'mp3' | 'aac' | 'webm' | 'm4a';
      samplingRate?: number;
    } = {}
  ): Promise<ALDResponse | null> {
    if (!audioBase64 || !audioBase64.trim()) return null;

    try {
      const response = await apiClient.post('/voice/detect-audio-language', {
        audioBase64: audioBase64.trim(),
        audioFormat: options.audioFormat || 'wav',
        samplingRate: options.samplingRate,
      }, { timeoutMs: 12000 });

      if (response && response.success && response.data) {
        return response.data as ALDResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] Audio Language detection error:', err);
      return null;
    }
  }

  /**
   * End-to-End Voice Processing Pipeline
   */
  async processVoice(
    audioBase64: string,
    language: string = 'auto',
    options: {
      generateAudioResponse?: boolean;
      responseText?: string;
      audioFormat?: 'wav' | 'mp3' | 'aac' | 'webm' | 'm4a';
    } = {}
  ): Promise<VoiceProcessResponse | null> {
    if (!audioBase64 || !audioBase64.trim()) return null;

    try {
      const response = await apiClient.post('/voice/process', {
        audioBase64: audioBase64.trim(),
        language: language || 'auto',
        generateAudioResponse: options.generateAudioResponse,
        responseText: options.responseText,
        audioFormat: options.audioFormat || 'wav',
      }, { timeoutMs: 30000 });

      if (response && response.success && response.data) {
        return response.data as VoiceProcessResponse;
      }
      return null;
    } catch (err) {
      console.warn('[BhashiniClient] Voice process error:', err);
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
   * Retrieve list of supported Indian languages
   */
  async getSupportedLanguages(): Promise<SupportedLanguageItem[]> {
    try {
      const response = await apiClient.get('/voice/languages', { timeoutMs: 8000 });
      if (response && response.success && response.data?.languages) {
        return response.data.languages as SupportedLanguageItem[];
      }
      return [];
    } catch {
      return [];
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
