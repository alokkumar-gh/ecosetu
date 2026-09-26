/**
 * voiceRoutes.js
 * Routing for ECOSETU Vernacular & Voice Engine endpoints powered by BHASHINI
 */

const express = require('express');
const voiceController = require('../controllers/voiceController');

const router = express.Router();

// 1. Automatic Speech Recognition (Audio -> Text)
router.post('/transcribe', (req, res, next) => voiceController.transcribe(req, res, next));
router.post('/asr', (req, res, next) => voiceController.asr(req, res, next));

// 2. Text to Speech (Text -> Audio)
router.post('/synthesize', (req, res, next) => voiceController.synthesize(req, res, next));
router.post('/tts', (req, res, next) => voiceController.tts(req, res, next));

// 3. Audio Language Detection (ALD)
router.post('/detect-audio-language', (req, res, next) => voiceController.detectAudioLanguage(req, res, next));
router.post('/detect-language', (req, res, next) => voiceController.detectLanguage(req, res, next));

// 4. End-to-End Voice Processing Pipeline
router.post('/process', (req, res, next) => voiceController.processVoice(req, res, next));

// 5. Supported Languages Metadata
router.get('/languages', (req, res, next) => voiceController.getLanguages(req, res, next));

// 6. Engine Status & Diagnostics
router.get('/status', (req, res, next) => voiceController.status(req, res, next));

module.exports = router;
