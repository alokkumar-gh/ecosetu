/**
 * voiceController.js
 * Controller handling ECOSETU Vernacular & Voice Engine endpoints (/api/v1/voice, /api/v1/language, /api/v1/ocr)
 * 
 * Provides authenticated/safe endpoints for TTS, ASR, TLD, OCR, and Translation.
 * Never leaks BHASHINI API keys or credentials to the client.
 */

const { bhashiniService } = require('../services/bhashiniService');
const logger = require('../config/logger');

class VoiceController {
  /**
   * POST /api/v1/voice/tts
   * Converts text into spoken audio in requested vernacular language
   */
  async tts(req, res, next) {
    try {
      const { text, language, gender, audioFormat, samplingRate, bypassCache } = req.body;
      const result = await bhashiniService.textToSpeech({
        text,
        language,
        gender,
        audioFormat,
        samplingRate,
        bypassCache,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/voice/asr
   * Transcribes voice audio into text
   */
  async asr(req, res, next) {
    try {
      const { audio, audioBase64, language, audioFormat, samplingRate } = req.body;
      const audioData = audioBase64 || audio;

      const result = await bhashiniService.speechToText({
        audioBase64: audioData,
        language,
        audioFormat,
        samplingRate,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/language/detect
   * Identifies the language of text input
   */
  async detectLanguage(req, res, next) {
    try {
      const { text } = req.body;
      const result = await bhashiniService.detectTextLanguage({ text });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/ocr
   * Extracts text from document or photo
   */
  async ocr(req, res, next) {
    try {
      const { image, imageBase64, language } = req.body;
      const imgData = imageBase64 || image;

      const result = await bhashiniService.extractTextFromImage({
        imageBase64: imgData,
        language,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/language/translate
   * Translates text between Indian languages and English
   */
  async translate(req, res, next) {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      const result = await bhashiniService.translateText({
        text,
        sourceLanguage,
        targetLanguage,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/voice/status
   * Safe status and capability diagnostics
   */
  async status(req, res, next) {
    try {
      const status = bhashiniService.getStatus();
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VoiceController();
