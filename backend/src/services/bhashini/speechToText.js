/**
 * speechToText.js
 * BHASHINI Automatic Speech Recognition (ASR) Service.
 *
 * Converts spoken Indian regional language audio into text without unnecessary English translation.
 */

const { bhashiniClient } = require('./bhashiniClient');
const { detectAudioLanguage } = require('./audioLanguageDetection');
const { normalizeLanguage, getLanguageInfo } = require('./languages');
const environment = require('../../config/environment');
const logger = require('../../config/logger');
const AppError = require('../../utils/AppError');

/**
 * Transcribes audio into text using BHASHINI ASR pipeline.
 *
 * @param {Object} params
 * @param {string} params.audioBase64 - Base64 encoded audio
 * @param {string} [params.language='auto'] - Language code ('auto', 'or', 'hi', 'bn', 'te', 'ta', 'mr', 'en', etc.)
 * @param {string} [params.audioFormat='wav'] - 'wav' | 'mp3' | 'aac' | 'webm'
 * @param {number} [params.samplingRate=null]
 * @returns {Promise<{ success: boolean, language: { code: string, name: string, nativeName: string }, transcript: string, originalTranscript: string, confidence: number | null, latencyMs: number }>}
 */
async function speechToText({
  audioBase64,
  language = 'auto',
  audioFormat = 'wav',
  samplingRate = null,
}) {
  if (!audioBase64 || !String(audioBase64).trim()) {
    throw AppError.badRequest('Audio data is required for speech recognition', 'ASR_EMPTY_AUDIO');
  }

  const cleanBase64 = String(audioBase64).replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '').trim();
  let targetLang = normalizeLanguage(language);

  let detectedLanguageInfo = null;
  // 1. Audio Language Detection if 'auto' is selected
  if (targetLang === 'auto') {
    try {
      const aldRes = await detectAudioLanguage(cleanBase64, { audioFormat, samplingRate });
      targetLang = aldRes.language;
      detectedLanguageInfo = aldRes;
    } catch (err) {
      logger.warn('[SpeechToText] Automatic language detection failed, defaulting to Hindi/English', {
        error: err.message,
      });
      targetLang = 'hi';
    }
  }

  const langInfo = getLanguageInfo(targetLang);

  // Normalize format strictly to 'wav' as required by BHASHINI Dhruva ASR models
  const normalizedAudioFormat = 'wav';

  const asrTask = {
    taskType: 'asr',
    config: {
      language: {
        sourceLanguage: targetLang,
      },
      audioFormat: normalizedAudioFormat,
    },
  };

  if (samplingRate) {
    asrTask.config.samplingRate = samplingRate;
  }

  if (environment.bhashiniAsrServiceId) {
    asrTask.config.serviceId = environment.bhashiniAsrServiceId;
  }

  const rawBytesLength = Math.floor((cleanBase64.length * 3) / 4);
  const approxDurationSec = (rawBytesLength / 32000).toFixed(2);

  logger.info('[VOICE DEBUG] ASR Request Dispatched', {
    language: targetLang,
    audioFormat: normalizedAudioFormat,
    samplingRate: samplingRate || 16000,
    channels: 1,
    audioSizeKb: (rawBytesLength / 1024).toFixed(1),
    approxDurationSec: `${approxDurationSec}s`,
  });

  const inputData = {
    audio: [
      {
        audioContent: cleanBase64,
      },
    ],
  };

  const { data, latencyMs } = await bhashiniClient.callPipeline([asrTask], inputData, {
    timeoutMs: 25000,
  });

  let recognizedText = '';
  let confidence = null;

  const taskResp = data?.pipelineResponse?.[0] || data?.output?.[0] || data;
  if (taskResp?.output?.[0]?.source) {
    recognizedText = taskResp.output[0].source;
    confidence = typeof taskResp.output[0].score === 'number' ? taskResp.output[0].score : null;
  } else if (taskResp?.source) {
    recognizedText = taskResp.source;
  } else if (data?.pipelineResponse?.[0]?.payload?.[0]?.source) {
    recognizedText = data.pipelineResponse[0].payload[0].source;
  }

  const cleanTranscript = recognizedText ? String(recognizedText).trim() : '';

  return {
    success: true,
    language: {
      code: targetLang,
      name: langInfo.name,
      nativeName: langInfo.nativeName,
    },
    transcript: cleanTranscript,
    originalTranscript: cleanTranscript,
    confidence,
    latencyMs,
  };
}

module.exports = {
  speechToText,
};
