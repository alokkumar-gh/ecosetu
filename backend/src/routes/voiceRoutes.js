/**
 * voiceRoutes.js
 * Routing for ECOSETU Vernacular & Voice Engine endpoints
 */

const express = require('express');
const voiceController = require('../controllers/voiceController');

const router = express.Router();

// 1. Text to Speech
router.post('/tts', (req, res, next) => voiceController.tts(req, res, next));

// 2. Automatic Speech Recognition
router.post('/asr', (req, res, next) => voiceController.asr(req, res, next));

// 3. Status / Diagnostics
router.get('/status', (req, res, next) => voiceController.status(req, res, next));

module.exports = router;
