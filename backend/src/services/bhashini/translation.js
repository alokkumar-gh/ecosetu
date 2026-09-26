/**
 * translation.js
 * BHASHINI Neural Machine Translation (NMT) Service.
 */

const { bhashiniClient } = require('./bhashiniClient');
const { normalizeLanguage } = require('./languages');
const environment = require('../../config/environment');

/**
 * Translates text between Indian languages and English.
 *
 * @param {Object} params
 * @param {string} params.text - Input text to translate
 * @param {string} [params.sourceLanguage='en']
 * @param {string} [params.targetLanguage='or']
 * @returns {Promise<{ success: boolean, translatedText: string, sourceLanguage: string, targetLanguage: string, latencyMs: number }>}
 */
async function translateText({ text, sourceLanguage = 'en', targetLanguage = 'or' }) {
  if (!text || !String(text).trim()) {
    return {
      success: true,
      translatedText: '',
      sourceLanguage: normalizeLanguage(sourceLanguage),
      targetLanguage: normalizeLanguage(targetLanguage),
      latencyMs: 0,
    };
  }

  const cleanText = String(text).trim();
  const srcLang = normalizeLanguage(sourceLanguage);
  const tgtLang = normalizeLanguage(targetLanguage);

  if (srcLang === tgtLang) {
    return {
      success: true,
      translatedText: cleanText,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      latencyMs: 0,
    };
  }

  const nmtTask = {
    taskType: 'translation',
    config: {
      language: {
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      },
    },
  };

  if (environment.bhashiniNmtServiceId) {
    nmtTask.config.serviceId = environment.bhashiniNmtServiceId;
  }

  const inputData = {
    input: [
      {
        source: cleanText,
      },
    ],
  };

  const { data, latencyMs } = await bhashiniClient.callPipeline([nmtTask], inputData, {
    timeoutMs: 20000,
  });

  let translatedText = '';
  const taskResp = data?.pipelineResponse?.[0] || data?.output?.[0] || data;

  if (taskResp?.output?.[0]?.target) {
    translatedText = taskResp.output[0].target;
  } else if (taskResp?.target) {
    translatedText = taskResp.target;
  }

  return {
    success: true,
    translatedText: translatedText ? translatedText.trim() : cleanText,
    sourceLanguage: srcLang,
    targetLanguage: tgtLang,
    latencyMs,
  };
}

module.exports = {
  translateText,
};
