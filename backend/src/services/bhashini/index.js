/**
 * index.js
 * Centralized ECOSETU Vernacular & Voice Engine powered by BHASHINI (MeitY).
 *
 * Exposes clean service abstractions for:
 * - Audio Language Detection (ALD)
 * - Automatic Speech Recognition (ASR)
 * - Text-to-Speech (TTS)
 * - Text Language Detection (TLD)
 * - Neural Machine Translation (NMT)
 * - Optical Character Recognition (OCR)
 * - End-to-End Voice Pipeline processing
 *
 * Security:
 * - Zero client-side key exposure.
 * - Centralized transient processing.
 */

const { bhashiniClient } = require('./bhashiniClient');
const { detectAudioLanguage } = require('./audioLanguageDetection');
const { speechToText } = require('./speechToText');
const { textToSpeech, ttsMemoryCache, getTtsCacheKey } = require('./textToSpeech');
const { detectTextLanguage } = require('./languageDetection');
const { translateText } = require('./translation');
const { extractTextFromImage } = require('./ocr');
const { SUPPORTED_LANGUAGES, normalizeLanguage, getLanguageInfo } = require('./languages');
const environment = require('../../config/environment');

class BhashiniService {
  constructor() {
    this.client = bhashiniClient;
    this.ttsMemoryCache = ttsMemoryCache;
    this.cacheTtlMs = 24 * 60 * 60 * 1000;
  }

  isConfigured() {
    return this.client.isConfigured();
  }

  getApiKey() {
    return this.client.getApiKey();
  }

  getUserId() {
    return this.client.getUserId();
  }

  getUdyatKey() {
    return this.client.getUdyatKey();
  }

  normalizeLanguage(lang) {
    return normalizeLanguage(lang);
  }

  _getTtsCacheKey(text, lang, gender, format) {
    return getTtsCacheKey(text, lang, gender, format);
  }

  /**
   * Unified Language Detection for Audio or Text
   */
  async detectLanguage(input, options = {}) {
    if (typeof input === 'object' && input !== null) {
      if (input.audio || input.audioBase64) {
        return detectAudioLanguage(input.audioBase64 || input.audio, options);
      }
      if (input.text) {
        return detectTextLanguage({ text: input.text });
      }
    }
    if (typeof input === 'string') {
      // If it looks like base64 audio
      if (input.length > 500 && /^[A-Za-z0-9+/=]+$/.test(input.slice(0, 100))) {
        return detectAudioLanguage(input, options);
      }
      return detectTextLanguage({ text: input });
    }
    return detectAudioLanguage(input, options);
  }

  async detectAudioLanguage(audioBase64, options = {}) {
    return detectAudioLanguage(audioBase64, options);
  }

  async detectTextLanguage(params) {
    return detectTextLanguage(params);
  }

  /**
   * Automatic Speech Recognition (Audio -> Regional Transcript)
   */
  async transcribe(audioBase64, language = 'auto', options = {}) {
    return speechToText({
      audioBase64,
      language,
      ...options,
    });
  }

  async speechToText(params) {
    return speechToText(params);
  }

  /**
   * Text-to-Speech (Text -> Regional Vernacular Audio)
   */
  async synthesize(text, language = 'or', options = {}) {
    return textToSpeech({
      text,
      language,
      ...options,
    });
  }

  async textToSpeech(params) {
    return textToSpeech(params);
  }

  /**
   * Neural Machine Translation
   */
  async translate(text, sourceLanguage = 'en', targetLanguage = 'or') {
    return translateText({
      text,
      sourceLanguage,
      targetLanguage,
    });
  }

  async translateText(params) {
    return translateText(params);
  }

  /**
   * Optical Character Recognition
   */
  async extractTextFromImage(params) {
    return extractTextFromImage(params);
  }

  /**
   * End-to-End Voice Pipeline
   * Audio -> Language Detection -> ASR -> (Optional Intent/Response) -> TTS -> Response Audio
   *
   * @param {Object} params
   * @param {string} params.audioBase64 - Base64 audio input
   * @param {string} [params.language='auto'] - Language code or 'auto'
   * @param {boolean} [params.generateAudioResponse=false] - Whether to synthesize response text to TTS audio
   * @param {string} [params.responseText=''] - Response text to synthesize if provided
   */
  async processVoicePipeline({
    audioBase64,
    language = 'auto',
    audioFormat = 'wav',
    samplingRate = null,
    generateAudioResponse = false,
    responseText = '',
  }) {
    // 1. Transcribe audio with ASR (which triggers ALD if language is 'auto')
    const asrResult = await this.speechToText({
      audioBase64,
      language,
      audioFormat,
      samplingRate,
    });

    const activeLanguage = asrResult.language.code;
    let ttsResult = null;

    // 2. If response text was supplied or audio response requested, synthesize via BHASHINI TTS
    if (generateAudioResponse && responseText && responseText.trim()) {
      try {
        ttsResult = await this.textToSpeech({
          text: responseText,
          language: activeLanguage,
          audioFormat: 'wav',
        });
      } catch (ttsErr) {
        // Log TTS failure gracefully without failing the entire transcript
        logger.warn('[VoicePipeline] TTS synthesis failure in pipeline', { error: ttsErr.message });
      }
    }

    return {
      success: true,
      language: asrResult.language,
      transcript: asrResult.transcript,
      originalTranscript: asrResult.originalTranscript,
      confidence: asrResult.confidence,
      asrLatencyMs: asrResult.latencyMs,
      audioResponse: ttsResult ? ttsResult.audioBase64 : null,
      ttsLatencyMs: ttsResult ? ttsResult.latencyMs : null,
    };
  }

  /**
   * List of supported Indian languages
   */
  getSupportedLanguages() {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Health & Capability Diagnostics
   */
  getStatus() {
    return {
      service: 'ECOSETU Vernacular & Voice Engine (BHASHINI)',
      status: this.isConfigured() ? 'READY' : 'UNCONFIGURED_CREDENTIALS',
      configured: this.isConfigured(),
      hasUserId: Boolean(this.getUserId()),
      hasUdyatKey: Boolean(this.getUdyatKey()),
      endpoint: this.client.inferenceEndpoint,
      supportedLanguages: Object.keys(SUPPORTED_LANGUAGES).filter((k) => k !== 'auto'),
      capabilities: {
        tts: true,
        asr: true,
        audioLanguageDetection: true,
        tld: true,
        ocr: true,
        translation: true,
      },
      cachedTtsEntries: this.ttsMemoryCache.size,
      version: '2.0.0-bhashini',
    };
  }
}

const bhashini = new BhashiniService();

module.exports = {
  BhashiniService,
  bhashini,
  bhashiniService: bhashini,
  EcosetuVernacularEngine: bhashini,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getLanguageInfo,
};
