/**
 * voiceController.js
 * Controller handling ECOSETU Vernacular & Voice Engine endpoints (/api/v1/voice, /api/v1/language, /api/v1/ocr)
 *
 * Provides authenticated/safe endpoints for BHASHINI ASR, TTS, ALD (Audio Language Detection), TLD, OCR, and Translation.
 * Never leaks BHASHINI API keys or credentials to the client.
 */

const { bhashiniService, SUPPORTED_LANGUAGES } = require('../services/bhashini');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

class VoiceController {
  /**
   * POST /api/v1/voice/transcribe (or /api/v1/voice/asr)
   * Transcribes voice audio into text in Indian regional languages using BHASHINI ASR.
   * Supports automatic language detection if language='auto' or not specified.
   */
  async transcribe(req, res, next) {
    try {
      const { audio, audioBase64, language, audioFormat, samplingRate } = req.body;
      const audioData = audioBase64 || audio;

      if (!audioData) {
        throw AppError.badRequest('Audio recording data (base64) is required', 'VOICE_EMPTY_AUDIO');
      }

      // 10MB sanity file-size limit on base64 string
      if (typeof audioData === 'string' && audioData.length > 15 * 1024 * 1024) {
        throw AppError.badRequest('Audio file size exceeds limit (maximum 10MB)', 'VOICE_AUDIO_TOO_LARGE');
      }

      const result = await bhashiniService.speechToText({
        audioBase64: audioData,
        language: language || 'auto',
        audioFormat: audioFormat || 'wav',
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
   * Alias for transcribe for backward compatibility
   */
  async asr(req, res, next) {
    return this.transcribe(req, res, next);
  }

  /**
   * POST /api/v1/voice/synthesize (or /api/v1/voice/tts)
   * Converts regional text into spoken audio using BHASHINI TTS.
   */
  async synthesize(req, res, next) {
    try {
      const { text, language, gender, audioFormat, samplingRate, bypassCache } = req.body;

      if (!text || !String(text).trim()) {
        throw AppError.badRequest('Text is required for speech synthesis', 'VOICE_EMPTY_TEXT');
      }

      const result = await bhashiniService.textToSpeech({
        text,
        language: language || 'or',
        gender: gender || 'female',
        audioFormat: audioFormat || 'wav',
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
   * Alias for synthesize for backward compatibility
   */
  async tts(req, res, next) {
    return this.synthesize(req, res, next);
  }

  /**
   * POST /api/v1/voice/detect-audio-language
   * Detects the spoken language from an audio recording.
   */
  async detectAudioLanguage(req, res, next) {
    try {
      const { audio, audioBase64, audioFormat, samplingRate } = req.body;
      const audioData = audioBase64 || audio;

      if (!audioData) {
        throw AppError.badRequest('Audio data (base64) is required for audio language detection', 'VOICE_EMPTY_AUDIO');
      }

      const result = await bhashiniService.detectAudioLanguage(audioData, {
        audioFormat: audioFormat || 'wav',
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
   * Identifies the language of text or audio input.
   */
  async detectLanguage(req, res, next) {
    try {
      const { text, audio, audioBase64 } = req.body;
      const audioData = audioBase64 || audio;

      if (audioData) {
        const result = await bhashiniService.detectAudioLanguage(audioData);
        return res.status(200).json({
          success: true,
          data: result,
        });
      }

      if (!text || !String(text).trim()) {
        throw AppError.badRequest('Text or audio is required for language detection', 'VOICE_EMPTY_INPUT');
      }

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
   * POST /api/v1/voice/process
   * Unified end-to-end voice pipeline:
   * Microphone Audio -> BHASHINI ALD -> BHASHINI ASR -> Optional BHASHINI TTS -> Spoken Voice Reply
   */
  async processVoice(req, res, next) {
    try {
      const {
        audio,
        audioBase64,
        language,
        audioFormat,
        samplingRate,
        generateAudioResponse,
        responseText,
      } = req.body;

      const audioData = audioBase64 || audio;
      if (!audioData) {
        throw AppError.badRequest('Audio recording data is required for voice processing', 'VOICE_EMPTY_AUDIO');
      }

      const result = await bhashiniService.processVoicePipeline({
        audioBase64: audioData,
        language: language || 'auto',
        audioFormat: audioFormat || 'wav',
        samplingRate,
        generateAudioResponse: Boolean(generateAudioResponse),
        responseText: responseText || '',
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
   * GET /api/v1/voice/languages
   * Returns list of supported Indian regional languages.
   */
  async getLanguages(req, res, next) {
    try {
      const languages = bhashiniService.getSupportedLanguages();
      return res.status(200).json({
        success: true,
        data: {
          default: 'auto',
          languages,
        },
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
        language: language || 'or',
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
        sourceLanguage: sourceLanguage || 'en',
        targetLanguage: targetLanguage || 'or',
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
