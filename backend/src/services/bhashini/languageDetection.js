/**
 * languageDetection.js
 * BHASHINI Text Language Detection (TLD) Service with Unicode heuristic fallback.
 */

const { bhashiniClient } = require('./bhashiniClient');
const { normalizeLanguage, getLanguageInfo } = require('./languages');
const logger = require('../../config/logger');
const AppError = require('../../utils/AppError');

/**
 * Identifies the language of text input using BHASHINI Text Language Detection.
 * Falls back to fast local Unicode script heuristics when offline or during transient errors.
 *
 * @param {Object} params
 * @param {string} params.text - The text to analyze
 * @returns {Promise<{ success: boolean, language: string, languageName: string, nativeName: string, confidence: number | null, isHeuristic?: boolean, isFallback?: boolean, latencyMs: number }>}
 */
async function detectTextLanguage({ text }) {
  if (!text || !String(text).trim()) {
    throw AppError.badRequest('Text is required for text language detection', 'TLD_EMPTY_TEXT');
  }

  const cleanText = String(text).trim();

  const tldTask = {
    taskType: 'txt-lang-detection',
    config: {},
  };

  const inputData = {
    input: [
      {
        source: cleanText,
      },
    ],
  };

  try {
    const { data, latencyMs } = await bhashiniClient.callPipeline([tldTask], inputData, {
      timeoutMs: 8000,
    });

    const taskResp = data?.pipelineResponse?.[0] || data?.output?.[0] || data;
    let detectedLang = 'en';
    let confidence = null;

    if (Array.isArray(taskResp?.output?.[0]?.langPrediction) && taskResp.output[0].langPrediction.length > 0) {
      detectedLang = taskResp.output[0].langPrediction[0].langCode || 'en';
      confidence = taskResp.output[0].langPrediction[0].langScore || null;
    } else if (taskResp?.output?.[0]?.langPrediction?.langCode) {
      detectedLang = taskResp.output[0].langPrediction.langCode;
      confidence = taskResp.output[0].langPrediction.langScore || null;
    } else if (typeof taskResp?.output?.[0]?.langPrediction === 'string') {
      detectedLang = taskResp.output[0].langPrediction;
      confidence = taskResp.output[0].score || null;
    } else if (taskResp?.output?.[0]?.source) {
      detectedLang = taskResp.output[0].source;
    }

    const normLang = normalizeLanguage(detectedLang);
    const langInfo = getLanguageInfo(normLang);

    return {
      success: true,
      language: normLang,
      languageName: langInfo.name,
      nativeName: langInfo.nativeName,
      confidence,
      latencyMs,
    };
  } catch (err) {
    logger.warn('[LanguageDetection] Text language detection pipeline fallback to script heuristic', {
      error: err.message,
    });

    // Heuristic Fallback based on Unicode blocks
    // 1. Odia Unicode block: \u0B00-\u0B7F
    if (/[\u0B00-\u0B7F]/.test(cleanText)) {
      const info = getLanguageInfo('or');
      return { success: true, language: 'or', languageName: info.name, nativeName: info.nativeName, confidence: 0.99, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 2. Bengali / Assamese: \u0980-\u09FF
    if (/[\u0980-\u09FF]/.test(cleanText)) {
      const info = getLanguageInfo('bn');
      return { success: true, language: 'bn', languageName: info.name, nativeName: info.nativeName, confidence: 0.95, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 3. Telugu: \u0C00-\u0C7F
    if (/[\u0C00-\u0C7F]/.test(cleanText)) {
      const info = getLanguageInfo('te');
      return { success: true, language: 'te', languageName: info.name, nativeName: info.nativeName, confidence: 0.98, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 4. Tamil: \u0B80-\u0BFF
    if (/[\u0B80-\u0BFF]/.test(cleanText)) {
      const info = getLanguageInfo('ta');
      return { success: true, language: 'ta', languageName: info.name, nativeName: info.nativeName, confidence: 0.98, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 5. Kannada: \u0C80-\u0CFF
    if (/[\u0C80-\u0CFF]/.test(cleanText)) {
      const info = getLanguageInfo('kn');
      return { success: true, language: 'kn', languageName: info.name, nativeName: info.nativeName, confidence: 0.98, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 6. Malayalam: \u0D00-\u0D7F
    if (/[\u0D00-\u0D7F]/.test(cleanText)) {
      const info = getLanguageInfo('ml');
      return { success: true, language: 'ml', languageName: info.name, nativeName: info.nativeName, confidence: 0.98, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 7. Gujarati: \u0A80-\u0AFF
    if (/[\u0A80-\u0AFF]/.test(cleanText)) {
      const info = getLanguageInfo('gu');
      return { success: true, language: 'gu', languageName: info.name, nativeName: info.nativeName, confidence: 0.98, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 8. Gurmukhi (Punjabi): \u0A00-\u0A7F
    if (/[\u0A00-\u0A7F]/.test(cleanText)) {
      const info = getLanguageInfo('pa');
      return { success: true, language: 'pa', languageName: info.name, nativeName: info.nativeName, confidence: 0.98, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 9. Marathi distinctive markers
    if (/(?:[\u0933]|आहे|आहेत|नाही|माझ्याकडे|झाले|करायचे|करावे|करणे|पुढील|मिळेल|होते|तुम्ही|आपले|आमचे|पाहिजे|केले|कसा|कशी|कसे)/i.test(cleanText)) {
      const info = getLanguageInfo('mr');
      return { success: true, language: 'mr', languageName: info.name, nativeName: info.nativeName, confidence: 0.95, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }
    // 10. Devanagari (Hindi)
    if (/[\u0900-\u097F]/.test(cleanText)) {
      const info = getLanguageInfo('hi');
      return { success: true, language: 'hi', languageName: info.name, nativeName: info.nativeName, confidence: 0.90, isHeuristic: true, isFallback: true, latencyMs: 1 };
    }

    const info = getLanguageInfo('en');
    return {
      success: true,
      language: 'en',
      languageName: info.name,
      nativeName: info.nativeName,
      confidence: 0.5,
      isFallback: true,
      latencyMs: 1,
    };
  }
}

module.exports = {
  detectTextLanguage,
};
