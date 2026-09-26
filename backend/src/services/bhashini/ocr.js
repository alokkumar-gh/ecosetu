/**
 * ocr.js
 * BHASHINI Optical Character Recognition (OCR) Service.
 */

const { bhashiniClient } = require('./bhashiniClient');
const { normalizeLanguage } = require('./languages');
const environment = require('../../config/environment');
const AppError = require('../../utils/AppError');

/**
 * Extracts text from an image using BHASHINI OCR pipeline.
 *
 * @param {Object} params
 * @param {string} params.imageBase64 - Base64 encoded image
 * @param {string} [params.language='or'] - Language hint
 * @returns {Promise<{ success: boolean, extractedText: string, language: string, latencyMs: number }>}
 */
async function extractTextFromImage({ imageBase64, language = 'or' }) {
  if (!imageBase64 || !String(imageBase64).trim()) {
    throw AppError.badRequest('Image content (base64) is required for OCR', 'OCR_EMPTY_IMAGE');
  }

  const normLang = normalizeLanguage(language);
  const cleanBase64 = String(imageBase64).replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '').trim();

  const ocrTask = {
    taskType: 'ocr',
    config: {
      language: {
        sourceLanguage: normLang,
      },
    },
  };

  if (environment.bhashiniOcrServiceId) {
    ocrTask.config.serviceId = environment.bhashiniOcrServiceId;
  }

  const inputData = {
    image: [
      {
        imageContent: cleanBase64,
      },
    ],
  };

  const { data, latencyMs } = await bhashiniClient.callPipeline([ocrTask], inputData, {
    timeoutMs: 35000,
  });

  let extractedText = '';
  const taskResp = data?.pipelineResponse?.[0] || data?.output?.[0] || data;

  if (taskResp?.output?.[0]?.source) {
    extractedText = taskResp.output[0].source;
  } else if (taskResp?.source) {
    extractedText = taskResp.source;
  }

  return {
    success: true,
    extractedText: extractedText ? extractedText.trim() : '',
    language: normLang,
    latencyMs,
  };
}

module.exports = {
  extractTextFromImage,
};
