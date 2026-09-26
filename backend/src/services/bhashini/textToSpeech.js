/**
 * textToSpeech.js
 * BHASHINI Text-to-Speech (TTS) Service with in-memory caching.
 *
 * Converts regional Indian text into spoken audio.
 */

const crypto = require('crypto');
const { bhashiniClient } = require('./bhashiniClient');
const { normalizeLanguage, getLanguageInfo } = require('./languages');
const environment = require('../../config/environment');
const logger = require('../../config/logger');
const AppError = require('../../utils/AppError');

// In-memory audio cache: cacheKey -> { audioBase64, audioFormat, timestamp, language }
const ttsMemoryCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 500;

/**
 * Computes deterministic cache key for TTS requests.
 */
function getTtsCacheKey(text, lang, gender = 'female', audioFormat = 'wav') {
  const normalizedText = String(text).trim().toLowerCase();
  const hash = crypto
    .createHash('sha256')
    .update(`${normalizedText}:${lang}:${gender}:${audioFormat}`)
    .digest('hex');
  return `${lang}_${hash.slice(0, 16)}`;
}

/**
 * Converts text into spoken audio in the requested Indian language using BHASHINI TTS.
 *
 * @param {Object} params
 * @param {string} params.text - The text string to synthesize
 * @param {string} [params.language='or'] - Language code ('or', 'hi', 'bn', 'mr', 'te', 'ta', 'en', etc.)
 * @param {string} [params.gender='female'] - 'female' | 'male'
 * @param {string} [params.audioFormat='wav'] - 'wav' | 'mp3'
 * @param {number} [params.samplingRate=null]
 * @param {boolean} [params.bypassCache=false]
 * @returns {Promise<{ success: boolean, audioBase64: string, audioFormat: string, language: string, isCached: boolean, latencyMs: number }>}
 */
async function textToSpeech({
  text,
  language = 'or',
  gender = 'female',
  audioFormat = 'wav',
  samplingRate = null,
  bypassCache = false,
}) {
  if (!text || !String(text).trim()) {
    throw AppError.badRequest('Text is required for Text-to-Speech synthesis', 'TTS_EMPTY_TEXT');
  }

  const cleanText = String(text).trim();
  const normLang = normalizeLanguage(language);
  const cacheKey = getTtsCacheKey(cleanText, normLang, gender, audioFormat);

  // 1. Check in-memory cache
  if (!bypassCache) {
    const cached = ttsMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        success: true,
        audioBase64: cached.audioBase64,
        audioFormat: cached.audioFormat || audioFormat,
        language: normLang,
        isCached: true,
        latencyMs: 1,
      };
    }
  }

  // 2. Prepare pipeline task
  const ttsTask = {
    taskType: 'tts',
    config: {
      language: {
        sourceLanguage: normLang,
      },
      gender: gender || 'female',
    },
  };

  if (samplingRate) {
    ttsTask.config.samplingRate = samplingRate;
  }

  if (environment.bhashiniTtsServiceId) {
    ttsTask.config.serviceId = environment.bhashiniTtsServiceId;
  }

  // Sanitize punctuation for Indic TTS models
  let sanitizedText = cleanText;
  if (['mr', 'hi', 'or', 'bn', 'gu', 'pa', 'as'].includes(normLang)) {
    sanitizedText = sanitizedText
      .replace(/\.\s*/g, ' ')
      .replace(/[-_]/g, ' ')
      .replace(/[?।!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (normLang === 'mr') {
    sanitizedText = sanitizedText.replace(/झ्/g, 'ज्');
  }

  const inputData = {
    input: [
      {
        source: sanitizedText || cleanText,
      },
    ],
  };

  const { data, latencyMs } = await bhashiniClient.callPipeline([ttsTask], inputData, {
    timeoutMs: 25000,
  });

  let audioBase64 = '';
  const taskResp = data?.pipelineResponse?.[0] || data?.output?.[0] || data;

  if (taskResp?.audio?.[0]?.audioContent) {
    audioBase64 = taskResp.audio[0].audioContent;
  } else if (taskResp?.audioContent) {
    audioBase64 = taskResp.audioContent;
  } else if (data?.pipelineResponse?.[0]?.output?.[0]?.audioContent) {
    audioBase64 = data.pipelineResponse[0].output[0].audioContent;
  }

  if (!audioBase64) {
    logger.warn('[TextToSpeech] Empty audio received from BHASHINI TTS', { data });
    throw AppError.badRequest('No audio data received from BHASHINI TTS service', 'TTS_EMPTY_RESPONSE');
  }

  // Cache insertion (LRU simple evict)
  if (ttsMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = ttsMemoryCache.keys().next().value;
    if (firstKey) ttsMemoryCache.delete(firstKey);
  }

  ttsMemoryCache.set(cacheKey, {
    audioBase64,
    audioFormat,
    timestamp: Date.now(),
    language: normLang,
  });

  return {
    success: true,
    audioBase64,
    audioFormat,
    language: normLang,
    isCached: false,
    latencyMs,
  };
}

module.exports = {
  textToSpeech,
  getTtsCacheKey,
  ttsMemoryCache,
};
