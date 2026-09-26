/**
 * audioLanguageDetection.js
 * BHASHINI Audio Language Detection Service.
 *
 * Automatically detects the spoken Indian language from raw/encoded audio.
 */

const { bhashiniClient } = require('./bhashiniClient');
const { normalizeLanguage, getLanguageInfo } = require('./languages');
const logger = require('../../config/logger');
const AppError = require('../../utils/AppError');

/**
 * Detects the spoken language from audio using BHASHINI Audio Language Detection.
 *
 * @param {string} audioBase64 - Base64 encoded audio recording
 * @param {Object} [options]
 * @param {string} [options.audioFormat='wav'] - 'wav' | 'mp3' | 'aac' | 'webm'
 * @param {number} [options.samplingRate=16000]
 * @param {string} [options.fallbackLanguage='hi'] - Fallback if detection cannot determine language
 * @returns {Promise<{ success: boolean, language: string, languageName: string, nativeName: string, confidence: number | null, isFallback?: boolean, latencyMs: number }>}
 */
async function detectAudioLanguage(audioBase64, options = {}) {
  if (!audioBase64 || !String(audioBase64).trim()) {
    throw AppError.badRequest('Audio data is required for Audio Language Detection', 'ALD_EMPTY_AUDIO');
  }

  const cleanAudio = String(audioBase64).replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '').trim();
  const audioFormat = options.audioFormat || 'wav';
  const fallbackLanguage = options.fallbackLanguage ? normalizeLanguage(options.fallbackLanguage) : 'hi';

  const aldTask = {
    taskType: 'audio-lang-detection',
    config: {
      audioFormat: audioFormat === 'webm' ? 'wav' : audioFormat,
    },
  };

  if (options.samplingRate) {
    aldTask.config.samplingRate = options.samplingRate;
  }

  const inputData = {
    audio: [
      {
        audioContent: cleanAudio,
      },
    ],
  };

  try {
    const { data, latencyMs } = await bhashiniClient.callPipeline([aldTask], inputData, {
      timeoutMs: options.timeoutMs || 12000,
    });

    const taskResp = data?.pipelineResponse?.[0] || data?.output?.[0] || data;
    let rawLang = '';
    let confidence = null;

    if (Array.isArray(taskResp?.output?.[0]?.langPrediction) && taskResp.output[0].langPrediction.length > 0) {
      const pred = taskResp.output[0].langPrediction[0];
      rawLang = pred.langCode || pred.language || '';
      confidence = typeof pred.langScore === 'number' ? pred.langScore : pred.score || null;
    } else if (taskResp?.output?.[0]?.langPrediction?.langCode) {
      rawLang = taskResp.output[0].langPrediction.langCode;
      confidence = taskResp.output[0].langPrediction.langScore || null;
    } else if (taskResp?.output?.[0]?.source) {
      rawLang = taskResp.output[0].source;
      confidence = taskResp.output[0].score || null;
    } else if (typeof taskResp?.language === 'string') {
      rawLang = taskResp.language;
    }

    const normLang = normalizeLanguage(rawLang || fallbackLanguage);
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
    logger.warn('[AudioLanguageDetection] BHASHINI Audio Lang Detection request fallback', {
      error: err.message,
    });

    // If BHASHINI ALD pipeline is unavailable/unconfigured, provide graceful fallback language info
    const langInfo = getLanguageInfo(fallbackLanguage);
    return {
      success: true,
      language: fallbackLanguage,
      languageName: langInfo.name,
      nativeName: langInfo.nativeName,
      confidence: 0.5,
      isFallback: true,
      latencyMs: 1,
    };
  }
}

module.exports = {
  detectAudioLanguage,
};
